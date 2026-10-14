import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * XHUB thumbnail proxy — GET /api/thumb?vkey=<video_id>&src=<raw_thumb_url>
 *
 * Implements A1 Thumbnail Pipeline with 100% Reliability:
 * 1. Checks if video ID is in the resolved high-res map (public/thumbs.json or raw GitHub main).
 * 2. If absent or expired, falls back to the original thumbnail URL (src) fetched with
 *    Referer: https://www.redtube.com/ (bypasses ISP blocks of rdtcdn.com in India).
 * 3. Fallback to direct page scrape if src is missing.
 * 4. Streams back binary image bytes with Cache-Control: public, max-age=31536000, immutable.
 */

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const GITHUB_THUMBS_URL =
  'https://raw.githubusercontent.com/VikramMaurya6789/XHUB/main/public/thumbs.json';

// In-memory cache for fast hits in warm serverless instances
let memoryThumbsMap = null;
let lastFetchTime = 0;

async function getThumbsMap() {
  const now = Date.now();
  if (memoryThumbsMap && now - lastFetchTime < 5 * 60 * 1000) {
    return memoryThumbsMap;
  }

  // 1. Try local filesystem
  try {
    const localPath = path.join(process.cwd(), 'public', 'thumbs.json');
    if (fs.existsSync(localPath)) {
      const content = fs.readFileSync(localPath, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        memoryThumbsMap = parsed;
        lastFetchTime = now;
        return memoryThumbsMap;
      }
    }
  } catch (e) {
    // Continue to GitHub raw fallback
  }

  // 2. Fetch from raw GitHub repository with ISR revalidation
  try {
    const res = await fetch(GITHUB_THUMBS_URL, {
      next: { revalidate: 1200 },
      headers: { 'User-Agent': UA },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        memoryThumbsMap = data;
        lastFetchTime = now;
        return memoryThumbsMap;
      }
    }
  } catch (e) {
    console.error('Failed to fetch remote thumbs.json:', e.message);
  }

  return memoryThumbsMap || {};
}

// Fallback direct page scraper
const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="100%" height="100%">
  <rect width="640" height="360" fill="#111111"/>
  <rect x="15" y="15" width="610" height="330" rx="10" fill="#1c1c1c" stroke="#2a2a2a" stroke-width="2"/>
  <circle cx="320" cy="170" r="42" fill="#ff6b00" opacity="0.9"/>
  <polygon points="312,154 338,170 312,186" fill="#ffffff"/>
  <text x="320" y="250" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="800" fill="#ff6b00" text-anchor="middle" letter-spacing="2">XHUB</text>
</svg>`;

// Fallback direct page scraper and official API
async function resolveDirectFallback(id) {
  // 1. Try redtube.net mirror HTML
  try {
    const pageRes = await fetch(`https://www.redtube.net/${id}`, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml',
        'Referer': 'https://www.google.com/',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(4000),
    });
    if (pageRes.ok) {
      const html = await pageRes.text();
      const m1 = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      if (m1 && m1[1] && m1[1].startsWith('http')) return m1[1].replace(/&amp;/g, '&');
      const m2 = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
      if (m2 && m2[1] && m2[1].startsWith('http')) return m2[1].replace(/&amp;/g, '&');
      const m3 = html.match(/"thumbnailUrl"\s*:\s*"([^"]+)"/i);
      if (m3 && m3[1]) return m3[1].replace(/\\\//g, '/').replace(/&amp;/g, '&');
    }
  } catch {}

  // 2. Try official Redtube API
  try {
    const apiRes = await fetch(
      `https://api.redtube.com/?data=redtube.Videos.getVideoById&output=json&video_id=${id}&thumbsize=all`,
      {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (apiRes.ok) {
      const data = await apiRes.json();
      const v = data?.video;
      if (v) {
        if (Array.isArray(v.thumbs) && v.thumbs.length > 0) {
          const big = v.thumbs.find(t => t.size === 'big');
          const med2 = v.thumbs.find(t => t.size === 'medium2');
          const med1 = v.thumbs.find(t => t.size === 'medium1');
          const s = (big || med2 || med1 || v.thumbs[0])?.src;
          if (s) return s;
        }
        if (v.default_thumb && v.default_thumb.startsWith('http')) {
          return v.default_thumb;
        }
      }
    }
  } catch {}

  return null;
}

async function fetchImageBytes(url) {
  return fetch(url, {
    headers: {
      'User-Agent': UA,
      'Referer': 'https://www.redtube.com/',
      'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(6000),
  });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get('vkey') || '';
    const id = raw.replace(/[^\d]/g, '');
    const fallbackSrc = searchParams.get('src') || searchParams.get('url') || '';

    if (!id && !fallbackSrc) {
      return new NextResponse(FALLBACK_SVG, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Step 1: Look up in high-res thumbs.json map
    let imgUrl = null;
    if (id) {
      const map = await getThumbsMap();
      const entry = map[id];
      imgUrl = typeof entry === 'string' ? entry : entry?.url;
    }

    // Step 2: Try fetching mapped image URL
    if (imgUrl) {
      try {
        const imgRes = await fetchImageBytes(imgUrl);
        if (imgRes.ok && imgRes.body) {
          const buf = await imgRes.arrayBuffer();
          const ct = imgRes.headers.get('content-type') || 'image/jpeg';
          return new NextResponse(buf, {
            status: 200,
            headers: {
              'Content-Type': ct,
              'Cache-Control': 'public, max-age=31536000, immutable',
              'Content-Length': String(buf.byteLength),
            },
          });
        }
      } catch (e) {
        // Fall through to fallbackSrc
      }
    }

    // Step 3: If not in map or map fetch failed, use fallbackSrc with Referer
    if (fallbackSrc && fallbackSrc.startsWith('http')) {
      try {
        const imgRes = await fetchImageBytes(fallbackSrc);
        if (imgRes.ok && imgRes.body) {
          const buf = await imgRes.arrayBuffer();
          const ct = imgRes.headers.get('content-type') || 'image/jpeg';
          // Cache in memory for subsequent requests
          if (id && memoryThumbsMap) {
            memoryThumbsMap[id] = { url: fallbackSrc, ts: Date.now() };
          }
          return new NextResponse(buf, {
            status: 200,
            headers: {
              'Content-Type': ct,
              'Cache-Control': 'public, max-age=31536000, immutable',
              'Content-Length': String(buf.byteLength),
            },
          });
        }
      } catch (e) {
        // Fall through to direct scraper
      }
    }

    // Step 4: Direct page scrape / API fallback
    if (id) {
      const scrapedUrl = await resolveDirectFallback(id);
      if (scrapedUrl) {
        try {
          const imgRes = await fetchImageBytes(scrapedUrl);
          if (imgRes.ok && imgRes.body) {
            const buf = await imgRes.arrayBuffer();
            const ct = imgRes.headers.get('content-type') || 'image/jpeg';
            // Cache in memory
            if (memoryThumbsMap) {
              memoryThumbsMap[id] = { url: scrapedUrl, ts: Date.now() };
            }
            return new NextResponse(buf, {
              status: 200,
              headers: {
                'Content-Type': ct,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Content-Length': String(buf.byteLength),
              },
            });
          }
        } catch {}
      }
    }

    // Step 5: Fallback SVG ensures image never breaks in the browser
    return new NextResponse(FALLBACK_SVG, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    return new NextResponse(FALLBACK_SVG, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
      },
    });
  }
}
