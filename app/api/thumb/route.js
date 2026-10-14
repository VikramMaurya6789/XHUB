import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * XHUB thumbnail proxy — GET /api/thumb?vkey=<video_id>
 *
 * Implements A1 Thumbnail Pipeline:
 * 1. Looks up the video ID in the resolved thumbs map (local public/thumbs.json or raw GitHub main).
 * 2. Fetches the verified pix-cdn77 / rdtcdn image with Referer: https://www.redtube.com/
 * 3. Streams back image bytes with Cache-Control: public, max-age=31536000, immutable
 * 4. Returns 404 JSON only when the id is absent from the map.
 */

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const GITHUB_THUMBS_URL =
  'https://raw.githubusercontent.com/VikramMaurya6789/XHUB/main/public/thumbs.json';

// In-memory cache for ultra-fast hits in warm serverless instances
let memoryThumbsMap = null;
let lastFetchTime = 0;

async function getThumbsMap() {
  const now = Date.now();
  // Return memory map if fetched within last 5 minutes
  if (memoryThumbsMap && now - lastFetchTime < 5 * 60 * 1000) {
    return memoryThumbsMap;
  }

  // 1. Try local filesystem (fastest in local dev & bundled deployments)
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

// Fallback resolver for local development or IDs not yet in the map
async function resolveDirectFallback(id) {
  const mirrors = [
    `https://www.redtube.net/${id}`,
    `https://www.redtube.com/${id}`,
  ];
  for (const pageUrl of mirrors) {
    try {
      const pageRes = await fetch(pageUrl, {
        headers: {
          'User-Agent': UA,
          'Accept': 'text/html,application/xhtml+xml',
          'Referer': 'https://www.google.com/',
        },
        redirect: 'follow',
      });
      if (!pageRes.ok) continue;
      const html = await pageRes.text();
      const m1 = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      if (m1 && m1[1] && m1[1].startsWith('http')) return m1[1].replace(/&amp;/g, '&');
      const m2 = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
      if (m2 && m2[1] && m2[1].startsWith('http')) return m2[1].replace(/&amp;/g, '&');
      const m3 = html.match(/"thumbnailUrl"\s*:\s*"([^"]+)"/i);
      if (m3 && m3[1]) return m3[1].replace(/\\\//g, '/').replace(/&amp;/g, '&');
    } catch {}
  }
  return null;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get('vkey') || '';
    const id = raw.replace(/[^\d]/g, '');

    if (!id) {
      return NextResponse.json({ error: 'vkey required' }, { status: 400 });
    }

    const map = await getThumbsMap();
    let entry = map[id];
    let imgUrl = typeof entry === 'string' ? entry : entry?.url;

    // If not in map, try direct resolve fallback
    if (!imgUrl) {
      imgUrl = await resolveDirectFallback(id);
    }

    if (!imgUrl) {
      return NextResponse.json(
        { error: 'thumbnail not found', vkey: id },
        { status: 404 }
      );
    }

    const imgRes = await fetch(imgUrl, {
      headers: {
        'User-Agent': UA,
        'Referer': 'https://www.redtube.com/',
        'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8',
      },
    });

    if (!imgRes.ok || !imgRes.body) {
      return NextResponse.json(
        { error: 'thumbnail upstream fetch failed', status: imgRes.status },
        { status: 502 }
      );
    }

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
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
