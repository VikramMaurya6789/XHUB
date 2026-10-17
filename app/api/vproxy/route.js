import { NextResponse } from 'next/server';
import { getStreams } from '../../../lib/videos.js';

/**
 * GET /api/vproxy?vkey=<video_id>&q=<quality>&url=<direct_url>
 *
 * Video / Stream proxy:
 * CDNs reject requests unless the Referer is xhamster.com.
 * This route fetches the CDN stream server-side with the correct Referer and pipes it to the player.
 * Supports Range requests (seeking) and direct HLS/MP4 pass-through.
 */

const CDN_REFERER = 'https://xhamster.com/';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const ALLOWED_HOSTS = ['xhcdn.com', 'xhpingcdn.com', 'xhamster.com', 'xhamster.desi', 'xhcdn.net', 'xhpingcdn.net', 'xhamster.gold'];

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
  headers.set('Cache-Control', 'private, max-age=120');
  headers.set('Access-Control-Allow-Origin', '*');
  return new NextResponse(upstreamBody, { status: 200, headers });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const vkey = searchParams.get('vkey') || searchParams.get('id');
    const q = (searchParams.get('q') || '720').replace(/\D/g, '') || '720';
    let target = searchParams.get('url');

    if (!target && vkey) {
      const streamData = await getStreams(vkey);
      if (streamData?.qualities?.length) {
        const match = streamData.qualities.find(s => s.quality === q) || streamData.qualities[0];
        target = match?.url;
      }
    }

    if (!target) {
      return new NextResponse('Stream URL or valid vkey required', { status: 404 });
    }

    if (!hostAllowed(target)) {
      return new NextResponse('Host not allowed', { status: 403 });
    }

    // Forward Range header for video seeking
    const headers = {
      'User-Agent': UA,
      Referer: CDN_REFERER,
      Accept: '*/*',
    };
    const range = req.headers.get('range');
    if (range) headers['Range'] = range;

    const upstream = await fetch(target, { headers });

    if (!upstream.ok && upstream.status !== 206) {
      return new NextResponse(`Upstream returned ${upstream.status}`, { status: upstream.status });
    }

    // If Range was honored or not requested
    if (upstream.status === 206 || !range) {
      const outHeaders = new Headers();
      const ct = upstream.headers.get('content-type');
      if (ct) outHeaders.set('Content-Type', ct);
      const cl = upstream.headers.get('content-length');
      if (cl) outHeaders.set('Content-Length', cl);
      const cr = upstream.headers.get('content-range');
      if (cr) outHeaders.set('Content-Range', cr);
      outHeaders.set('Accept-Ranges', 'bytes');
      outHeaders.set('Cache-Control', 'private, max-age=120');
      outHeaders.set('Access-Control-Allow-Origin', '*');

      return new NextResponse(upstream.body, {
        status: upstream.status,
        headers: outHeaders,
      });
    }

    return passThroughFull(
      upstream.body,
      upstream.headers.get('content-type'),
      upstream.headers.get('content-length')
    );
  } catch (e) {
    return new NextResponse('Proxy error: ' + (e.message || 'unknown'), { status: 500 });
  }
}
