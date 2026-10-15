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
 * Parse "bytes=start-end" / "bytes=start-" against a known total.
 * Returns {start, end} or null if unparseable/out of range.
 */
function parseRange(rangeHeader, total) {
  const m = /^bytes=(\d+)-(\d*)$/.exec((rangeHeader || '').trim());
  if (!m || !total) return null;
  const start = parseInt(m[1], 10);
  let end = m[2] ? parseInt(m[2], 10) : total - 1;
  if (isNaN(start) || start < 0 || start >= total) return null;
  if (isNaN(end) || end >= total) end = total - 1;
  if (end < start) return null;
  return { start, end };
}

/**
 * Some Redtube CDN hosts (ev-ph.rdtcdn.com) IGNORE Range and answer 200 with
 * the full body. The browser's media element asked for a slice and stalls when
 * it gets 200 instead of 206 — seeking then kills playback entirely.
 * Emulate 206 server-side: skip upstream bytes until `start`, then serve only
 * [start, end] with a proper Content-Range.
 */
function emulatePartial(upstreamBody, start, end, contentType, total) {
  const length = end - start + 1;
  const reader = upstreamBody.getReader();
  let pos = 0; // upstream bytes consumed
  let sent = 0; // bytes sent to client
  const stream = new ReadableStream({
    async pull(controller) {
      try {
        while (sent < length) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunkStart = pos;
          pos += value.length;
          const s = Math.max(chunkStart, start);
          const e = Math.min(pos, end + 1);
          if (e > s) {
            controller.enqueue(value.subarray(s - chunkStart, e - chunkStart));
            sent += e - s;
          }
        }
      } catch (err) {
        controller.error(err);
        return;
      }
      controller.close();
      try {
        await reader.cancel();
      } catch {}
    },
    cancel() {
      try {
        reader.cancel();
      } catch {}
    },
  });
  const headers = new Headers();
  if (contentType) headers.set('Content-Type', contentType);
  headers.set('Content-Length', String(length));
  headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'private, max-age=60');
  return new NextResponse(stream, { status: 206, headers });
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
    // (ev-ph.rdtcdn.com does this). Emulate 206 so seeking keeps working.
    const total = parseInt(upstream.headers.get('content-length') || '0', 10);
    const r = parseRange(range, total);
    if (r && upstream.body) {
      return emulatePartial(
        upstream.body,
        r.start,
        r.end,
        upstream.headers.get('content-type'),
        total
      );
    }

    // Can't emulate (unknown size / unparseable range): pass the 200 through.
    const outHeaders = new Headers();
    const ct = upstream.headers.get('content-type');
    if (ct) outHeaders.set('Content-Type', ct);
    const cl = upstream.headers.get('content-length');
    if (cl) outHeaders.set('Content-Length', cl);
    outHeaders.set('Accept-Ranges', 'bytes');
    outHeaders.set('Cache-Control', 'private, max-age=60');
    return new NextResponse(upstream.body, { status: 200, headers: outHeaders });
  } catch (e) {
    return new NextResponse('proxy error: ' + e.message, { status: 500 });
  }
}
