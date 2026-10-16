import { NextResponse } from 'next/server';

/**
 * GET /api/vproxy?vkey=<video_id>&q=<quality>
 *
 * Video proxy: Redtube's CDN rejects requests unless the Referer is redtube.com,
 * so browsers can't play the direct URLs. This route fetches the CDN stream
 * server-side with the correct Referer and pipes it to the player.
 * Supports Range requests (seeking) and auto-recovers on expired tokens.
 */

const MAP_URL =
  'https://raw.githubusercontent.com/VikramMaurya6789/XHUB/main/public/streams.json';
const CDN_REFERER = 'https://www.redtube.com/';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// Allow only Redtube CDN hosts (never proxy arbitrary URLs).
const ALLOWED_HOSTS = ['rdtcdn.com', 'redtube.com', 'redtube.net'];

function hostAllowed(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return ALLOWED_HOSTS.some(d => h === d || h.endsWith('.' + d));
  } catch {
    return false;
  }
}

function passThroughFull(upstreamBody, contentType, contentLength) {
  const headers = new Headers();
  if (contentType) headers.set('Content-Type', contentType);
  if (contentLength) headers.set('Content-Length', contentLength);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'private, max-age=60');
  return new NextResponse(upstreamBody, { status: 200, headers });
}

async function fetchMap(noCache) {
  try {
    const mapRes = await fetch(MAP_URL, noCache ? { cache: 'no-store' } : { next: { revalidate: 600 } });
    if (!mapRes.ok) return null;
    return mapRes.json();
  } catch {
    return null;
  }
}

async function scrapeDynamicStream(id, q) {
  const mirrors = ['https://www.redtube.net', 'https://www.redtube.com'];
  for (const mirror of mirrors) {
    try {
      const pageRes = await fetch(`${mirror}/${id}`, {
        headers: {
          'User-Agent': UA,
          'Referer': 'https://www.google.com/',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(5000),
      });
      if (!pageRes.ok) continue;
      const html = await pageRes.text();
      const m = html.match(/(?:\\?\/)media(?:\\?\/)mp4\?s=([A-Za-z0-9+/=_-]+)/i);
      if (m) {
        const tokenPath = '/media/mp4?s=' + m[1];
        const streamRes = await fetch(`${mirror}${tokenPath}`, {
          headers: {
            'User-Agent': UA,
            'Referer': `${mirror}/${id}`,
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        });
        if (streamRes.ok) {
          const list = await streamRes.json();
          if (Array.isArray(list) && list.length) {
            const match = list.find(s => String(s.quality) === String(q)) || list[0];
            const u = match?.videoUrl ? String(match.videoUrl).replace(/\\/g, '') : null;
            if (u && hostAllowed(u)) return u;
          }
        }
      }
    } catch {}
  }
  return null;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = (searchParams.get('vkey') || '').replace(/\D/g, '');
    const q = (searchParams.get('q') || '720').replace(/\D/g, '') || '720';
    if (!id) return new NextResponse('vkey required', { status: 400 });

    const map = await fetchMap(false);
    const entry = map?.[id];

    let target = null;
    if (entry?.qualities?.length) {
      const stream = entry.qualities.find(s => s.quality === q) || entry.qualities[0];
      target = stream?.url;
    }

    // If not in map or invalid, scrape dynamically
    if (!target || !hostAllowed(target)) {
      target = await scrapeDynamicStream(id, q);
    }

    if (!target || !hostAllowed(target)) {
      return new NextResponse('no streams yet', { status: 404 });
    }

    // Forward Range header for seeking.
    const headers = {
      'User-Agent': UA,
      Referer: CDN_REFERER,
      Accept: '*/*',
    };
    const range = req.headers.get('range');
    if (range) headers['Range'] = range;

    let upstream = await fetch(target, { headers });

    // Token expired (CDN signs URLs with ~2h validity).
    // Try re-fetching fresh map, or scrape dynamically.
    // 472 = custom expired-token response from RDT CDN.
    if (upstream.status === 403 || upstream.status === 410 || upstream.status === 472) {
      const freshTarget = await scrapeDynamicStream(id, q);
      if (freshTarget && freshTarget !== target) {
        target = freshTarget;
        upstream = await fetch(target, { headers });
      } else {
        const freshMap = await fetchMap(true);
        const freshEntry = freshMap?.[id];
        const freshStream = freshEntry?.qualities?.find(s => s.quality === q) || freshEntry?.qualities?.[0];
        if (freshStream?.url && hostAllowed(freshStream.url) && freshStream.url !== target) {
          target = freshStream.url;
          upstream = await fetch(target, { headers });
        }
      }
    }

    if (!upstream.ok && upstream.status !== 206) {
      return new NextResponse('upstream error', { status: 502 });
    }

    // Upstream honored the Range (or none was requested): pass through.
    if (upstream.status === 206 || !range) {
      const outHeaders = new Headers();
      const ct = upstream.headers.get('content-type');
      if (ct) outHeaders.set('Content-Type', ct);
      const cl = upstream.headers.get('content-length');
      if (cl) outHeaders.set('Content-Length', cl);
      const cr = upstream.headers.get('content-range');
      if (cr) outHeaders.set('Content-Range', cr);
      outHeaders.set('Accept-Ranges', 'bytes');
      outHeaders.set('Cache-Control', 'private, max-age=60');

      return new NextResponse(upstream.body, {
        status: upstream.status,
        headers: outHeaders,
      });
    }

    // Upstream IGNORED our Range and answered 200 with the full body
    return passThroughFull(
      upstream.body,
      upstream.headers.get('content-type'),
      upstream.headers.get('content-length')
    );
  } catch (e) {
    return new NextResponse('proxy error: ' + e.message, { status: 500 });
  }
}
