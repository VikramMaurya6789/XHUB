import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getThumbRawUrl } from '../../../lib/videos.js';

/**
 * XHUB thumbnail proxy — GET /api/thumb?vkey=<video_id>&src=<raw_thumb_url>
 *
 * Implements 100% Reliability for xHamster thumbnails:
 * 1. Checks if video ID is in the resolved high-res map (public/thumbs.json).
 * 2. If absent, falls back to the original thumbnail URL (src) fetched with
 *    Referer: https://xhamster.com/ (bypasses ISP blocks and CDN 403 Forbidden).
 * 3. Fallback to direct xHamster metadata lookup if src is missing.
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
    // remote fetch failed
  }

  return memoryThumbsMap || {};
}

// Fallback SVG ensures image never breaks in the browser
const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="100%" height="100%">
  <rect width="640" height="360" fill="#111111"/>
  <rect x="15" y="15" width="610" height="330" rx="10" fill="#1c1c1c" stroke="#2a2a2a" stroke-width="2"/>
  <circle cx="320" cy="170" r="42" fill="#ff6b00" opacity="0.9"/>
  <polygon points="312,154 338,170 312,186" fill="#ffffff"/>
  <text x="320" y="250" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="800" fill="#ff6b00" text-anchor="middle" letter-spacing="2">XHUB</text>
</svg>`;

function isCorruptThumb(url) {
  return !url || typeof url !== 'string' || !url.startsWith('http') || url.includes('/videos//original');
}

async function fetchImageBytes(url) {
  return fetch(url, {
    headers: {
      'User-Agent': UA,
      'Referer': 'https://xhamster.com/',
      'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(6000),
  });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const vkey = (searchParams.get('vkey') || searchParams.get('id') || '').trim();
    const fallbackSrc = searchParams.get('src') || searchParams.get('url') || '';

    if (!vkey && !fallbackSrc) {
      return new NextResponse(FALLBACK_SVG, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Step 1: Look up in high-res thumbs.json map if available
    let imgUrl = null;
    if (vkey) {
      const map = await getThumbsMap();
      const entry = map[vkey] || map[vkey.replace(/^xh/, '')];
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
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      } catch (e) {
        // Fall through to fallbackSrc
      }
    }

    // Step 3: If not in map or map fetch failed, use fallbackSrc with Referer
    if (fallbackSrc && !isCorruptThumb(fallbackSrc)) {
      try {
        const imgRes = await fetchImageBytes(fallbackSrc);
        if (imgRes.ok && imgRes.body) {
          const buf = await imgRes.arrayBuffer();
          const ct = imgRes.headers.get('content-type') || 'image/jpeg';
          if (vkey && memoryThumbsMap) {
            memoryThumbsMap[vkey] = { url: fallbackSrc, ts: Date.now() };
          }
          return new NextResponse(buf, {
            status: 200,
            headers: {
              'Content-Type': ct,
              'Cache-Control': 'public, max-age=31536000, immutable',
              'Content-Length': String(buf.byteLength),
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      } catch (e) {
        // Fall through to direct lookup
      }
    }

    // Step 4: Direct xHamster metadata lookup
    if (vkey) {
      const rawThumb = await getThumbRawUrl(vkey);
      if (rawThumb && !isCorruptThumb(rawThumb)) {
        try {
          const imgRes = await fetchImageBytes(rawThumb);
          if (imgRes.ok && imgRes.body) {
            const buf = await imgRes.arrayBuffer();
            const ct = imgRes.headers.get('content-type') || 'image/jpeg';
            if (memoryThumbsMap) {
              memoryThumbsMap[vkey] = { url: rawThumb, ts: Date.now() };
            }
            return new NextResponse(buf, {
              status: 200,
              headers: {
                'Content-Type': ct,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Content-Length': String(buf.byteLength),
                'Access-Control-Allow-Origin': '*',
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
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return new NextResponse(FALLBACK_SVG, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
