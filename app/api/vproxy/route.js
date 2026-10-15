import { NextResponse } from 'next/server';

/**
 * GET /api/vproxy?vkey=<video_id>&q=<quality>
 *
 * Video proxy: Redtube's CDN rejects requests unless the Referer is redtube.com,
 * so browsers can't play the direct URLs. This route fetches the CDN stream
 * server-side with the correct Referer and pipes it to the player.
 * Supports Range requests (seeking).
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

/**
 * Some Redtube CDN hosts (ev-ph.rdtcdn.com) IGNORE Range and answer 200 with
 * the full body. The old emulatePartial downloaded from byte 0 to skip to the
 * requested offset — for a seek to the middle of a 500MB video that's 250MB
 * of wasted download and a massive stall. REMOVED 2026-10-15: just pass the
 * 200 through. The browser gets the full video and seeks locally — one
 * download, no waste, no stall.
 */
function passThroughFull(upstreamBody, contentType, contentLength) {
  const headers = new Headers();
  if (contentType) headers.set('Content-Type', contentType);
  if (contentLength) headers.set('Content-Length', contentLength);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'private, max-age=60');
  return new NextResponse(upstreamBody, { status: 200, headers });
}

/**
 * Fetch the stream map, optionally bypassing the Next.js fetch cache.
 * Used for token-refresh retry when the CDN rejects with 403/410.
 */
async function fetchMap(noCache) {
  const mapRes = await fetch(MAP_URL, noCache ? { cache: 'no-store' } : { next: { revalidate: 600 } });
  if (!mapRes.ok) return null;
  return mapRes.json();
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = (searchParams.get('vkey') || '').replace(/\D/g, '');
    const q = (searchParams.get('q') || '720').replace(/\D/g, '') || '720';
    if (!id) return new NextResponse('vkey required', { status: 400 });

    const map = await fetchMap(false);
    if (!map) return new NextResponse('stream map unavailable', { status: 502 });
    const entry = map[id];
    if (!entry?.qualities?.length) {
      return new NextResponse('no streams yet', { status: 404 });
    }

    const stream =
      entry.qualities.find(s => s.quality === q) || entry.qualities[0];
    let target = stream?.url;
    if (!target || !hostAllowed(target)) {
      return new NextResponse('invalid stream url', { status: 502 });
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

    // Token expired (CDN signs URLs with ~2h validity). Re-fetch the map
    // bypassing cache — the batch cycle refreshes tokens every 10 min —
    // and retry once with the fresh URL. Transparent to the player.
    if (upstream.status === 403 || upstream.status === 410) {
      const freshMap = await fetchMap(true);
      const freshEntry = freshMap?.[id];
      const freshStream = freshEntry?.qualities?.find(s => s.quality === q) || freshEntry?.qualities?.[0];
      if (freshStream?.url && hostAllowed(freshStream.url) && freshStream.url !== target) {
        target = freshStream.url;
        upstream = await fetch(target, { headers });
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
    // (some ev-ph.rdtcdn.com URLs do this). Pass it through directly —
    // the browser gets the full video and seeks locally. No wasteful
    // download-and-skip.
    return passThroughFull(
      upstream.body,
      upstream.headers.get('content-type'),
      upstream.headers.get('content-length')
    );
  } catch (e) {
    return new NextResponse('proxy error: ' + e.message, { status: 500 });
  }
}
