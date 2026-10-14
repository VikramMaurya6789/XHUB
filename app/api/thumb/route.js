import { NextResponse } from 'next/server';

/**
 * XHUB thumbnail proxy — GET /api/thumb?vkey=<video_id>
 *
 * Why this exists: the Redtube API's thumbnail CDN (ei-ph.rdtcdn.com) is dead
 * (HTTP 410 Gone for every thumb), so no card image loads. Redtube video pages
 * still serve a working og:image on pix-cdn77.rdtcdn.com, but it 403s without a
 * redtube.com Referer — browsers can't fake that, so we proxy server-side.
 * Bonus: bytes come from our own domain, which also survives ISP-level blocks
 * of rdtcdn in some regions. Responses are immutable + edge-cached for a year.
 */

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// vkey -> resolved og:image URL (thumbs are immutable, cache forever per instance)
const urlCache = new Map();
// vkey -> in-flight promise (avoid duplicate page fetches)
const inflight = new Map();

function extractCandidates(html) {
  const found = [];
  const push = u => {
    if (typeof u === 'string' && u.startsWith('http') && !found.includes(u) && found.length < 8) {
      found.push(u.replace(/&amp;/g, '&'));
    }
  };
  // 1. og:image (both attribute orders)
  const og =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (og) push(og[1]);
  // 2. JSON-LD thumbnailUrl
  const ld = html.match(/"thumbnailUrl"\s*:\s*"([^"]+)"/i);
  if (ld) push(ld[1].replace(/\\\//g, '/'));
  // 3. video poster attributes
  const posters = html.matchAll(/poster=["']([^"']+)["']/gi);
  for (const m of posters) push(m[1]);
  // 4. any rdtcdn image URL in the page
  const cdn = html.matchAll(/https?:\/\/[a-z0-9.-]*rdtcdn\.com\/[^"'\\\s]+\.(?:jpg|jpeg|png|webp)/gi);
  for (const m of cdn) push(m[0]);
  // 5. any pix-cdn image URL
  const pix = html.matchAll(/https?:\/\/pix-cdn[0-9]*\.rdtcdn\.com\/[^"'\\\s]+/gi);
  for (const m of pix) push(m[0]);
  return found;
}

async function resolveThumbUrl(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  if (inflight.has(id)) return inflight.get(id);

  const p = (async () => {
    // Try redtube.com, fall back to the redtube.net mirror (friendlier to
    // datacenter IPs and to Indian ISPs).
    const pageUrls = [
      `https://www.redtube.com/${id}`,
      `https://www.redtube.net/${id}`,
    ];
    for (const pageUrl of pageUrls) {
      try {
        const pageRes = await fetch(pageUrl, {
          headers: {
            'User-Agent': UA,
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.google.com/',
          },
          redirect: 'follow',
        });
        lastDiag.pageStatus = `${pageUrl}: ${pageRes.status}`;
        if (!pageRes.ok) continue;
        const html = await pageRes.text();
        const candidates = extractCandidates(html);
        lastDiag.candidates = candidates.map(c => c.slice(0, 90));
        const og = candidates[0] || null;
        if (og && og.startsWith('http')) {
          urlCache.set(id, og);
          return og;
        }
        lastDiag.note = `no usable image in HTML (len ${html.length})`;
      } catch (e) {
        lastDiag.pageStatus = `${pageUrl}: fetch error ${e.message}`;
      }
    }
    return null;
  })().finally(() => {
    inflight.delete(id);
  });

  inflight.set(id, p);
  return p;
}

// last resolution diagnostics (surfaced in error responses)
const lastDiag = { pageStatus: 'n/a', note: '' };

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get('vkey') || '';
    const id = raw.replace(/[^\d]/g, '');
    if (!id) {
      return NextResponse.json({ error: 'vkey required' }, { status: 400 });
    }

    const imgUrl = await resolveThumbUrl(id);
    if (!imgUrl) {
      return NextResponse.json(
        { error: 'thumbnail not found', diag: lastDiag },
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
      urlCache.delete(id); // stale — retry next time
      return NextResponse.json({ error: 'thumbnail fetch failed' }, { status: 502 });
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
