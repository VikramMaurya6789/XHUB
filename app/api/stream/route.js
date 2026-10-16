import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/stream?vkey=<video_id>
 *
 * Returns direct mp4 stream URLs per quality for XHUB's custom player.
 * Checks:
 * 1. In-memory cache (<60 min)
 * 2. Local / Remote public/streams.json
 * 3. On-demand dynamic scraper fallback (bypasses stale tokens immediately)
 */
const MAP_URL =
  'https://raw.githubusercontent.com/VikramMaurya6789/XHUB/main/public/streams.json';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const memoryStreamCache = new Map();

async function scrapeDynamicStreams(id) {
  // 1. Try embed.redtube.net (fast, unblocked, direct flashvars)
  try {
    const embedUrl = `https://embed.redtube.net/?id=${id}`;
    const embedRes = await fetch(embedUrl, {
      headers: {
        'User-Agent': UA,
        'Referer': 'https://embed.redtube.net/',
      },
      signal: AbortSignal.timeout(4000),
    });
    if (embedRes.ok) {
      const html = await embedRes.text();
      const line = html.split('\n').find(l => l.includes('var flashvars_'));
      if (line) {
        const start = line.indexOf('{');
        const end = line.lastIndexOf('}');
        if (start !== -1 && end > start) {
          const fv = JSON.parse(line.substring(start, end + 1));
          const mp4Def = fv.mediaDefinitions?.find(d => d.format === 'mp4' && d.videoUrl);
          if (mp4Def) {
            const streamRes = await fetch(`https://embed.redtube.net${mp4Def.videoUrl}`, {
              headers: {
                'User-Agent': UA,
                'Referer': embedUrl,
                'Accept': 'application/json',
              },
              signal: AbortSignal.timeout(4000),
            });
            if (streamRes.ok) {
              const list = await streamRes.json();
              if (Array.isArray(list) && list.length) {
                const qualities = list
                  .filter(q => q.videoUrl && q.quality)
                  .map(q => ({
                    quality: String(q.quality),
                    url: String(q.videoUrl).replace(/\\/g, ''),
                  }))
                  .sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0));
                if (qualities.length) {
                  const resObj = { qualities, ts: Date.now() };
                  memoryStreamCache.set(id, resObj);
                  return resObj;
                }
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Embed stream scrape failed for', id, e.message);
  }

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
            const qualities = list
              .filter(q => q.videoUrl && q.quality)
              .map(q => ({
                quality: String(q.quality),
                url: String(q.videoUrl).replace(/\\/g, ''),
              }));
            if (qualities.length) {
              const resObj = { qualities, ts: Date.now() };
              memoryStreamCache.set(id, resObj);
              return resObj;
            }
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
    if (!id) return NextResponse.json({ error: 'vkey required' }, { status: 400 });

    const embedUrl = `https://embed.redtube.net/?id=${id}&autoplay=1`;

    // 1. Check in-memory fresh cache (<60 min)
    const mem = memoryStreamCache.get(id);
    if (mem && mem.qualities?.length && Date.now() - mem.ts < 60 * 60 * 1000) {
      return respondWithStreams(id, mem.qualities, mem.ts, false, embedUrl);
    }

    // 2. Try loading from map (local or remote)
    let entry = null;
    try {
      const localPath = path.join(process.cwd(), 'public', 'streams.json');
      if (fs.existsSync(localPath)) {
        const localMap = JSON.parse(fs.readFileSync(localPath, 'utf8'));
        entry = localMap[id];
      }
    } catch {}

    if (!entry) {
      try {
        const res = await fetch(MAP_URL, { next: { revalidate: 600 } });
        if (res.ok) {
          const map = await res.json();
          entry = map[id];
        }
      } catch {}
    }

    const ageMin = entry?.ts ? (Date.now() - entry.ts) / 60000 : Infinity;
    const isStale = ageMin > 90; // Tokens expire in ~120 min

    // 3. If missing or stale, try dynamic scrape
    if (!entry?.qualities?.length || isStale) {
      const fresh = await scrapeDynamicStreams(id);
      if (fresh?.qualities?.length) {
        return respondWithStreams(id, fresh.qualities, fresh.ts, false, embedUrl);
      }
    }

    // 4. Return cached entry if available
    if (entry?.qualities?.length) {
      return respondWithStreams(id, entry.qualities, entry.ts, isStale, embedUrl);
    }

    // 5. Fallback with embedUrl if no mp4 qualities available
    return NextResponse.json(
      { vkey: id, qualities: [], embedUrl, error: 'no streams yet', retry: true },
      { status: 404 }
    );
  } catch (e) {
    return NextResponse.json({ error: e.message, qualities: [] }, { status: 500 });
  }
}

function respondWithStreams(id, qualitiesList, ts, isStale, embedUrl) {
  const order = ['1080', '720', '480', '240'];
  const sorted = [...qualitiesList].sort(
    (a, b) => order.indexOf(a.quality) - order.indexOf(b.quality)
  );
  const def =
    sorted.find(q => q.quality === '720') ||
    sorted.find(q => order.indexOf(q.quality) > order.indexOf('720')) ||
    sorted[0];

  return NextResponse.json(
    {
      vkey: id,
      qualities: sorted,
      defaultQuality: def ? def.quality : '720',
      resolvedAt: ts,
      stale: isStale,
      retry: isStale,
      embedUrl,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  );
}
