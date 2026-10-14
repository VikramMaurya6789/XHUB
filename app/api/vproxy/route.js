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

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = (searchParams.get('vkey') || '').replace(/\D/g, '');
    const q = (searchParams.get('q') || '720').replace(/\D/g, '') || '720';
    if (!id) return new NextResponse('vkey required', { status: 400 });

    const mapRes = await fetch(MAP_URL, { next: { revalidate: 600 } });
    if (!mapRes.ok) return new NextResponse('stream map unavailable', { status: 502 });
    const map = await mapRes.json();
    const entry = map[id];
    if (!entry?.qualities?.length) {
      return new NextResponse('no streams yet', { status: 404 });
    }

    const stream =
      entry.qualities.find(s => s.quality === q) || entry.qualities[0];
    const target = stream?.url;
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

    const upstream = await fetch(target, { headers });
    if (!upstream.ok && upstream.status !== 206) {
      return new NextResponse('upstream error', { status: 502 });
    }

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
  } catch (e) {
    return new NextResponse('proxy error: ' + e.message, { status: 500 });
  }
}
