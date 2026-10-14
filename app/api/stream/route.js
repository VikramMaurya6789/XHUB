import { NextResponse } from 'next/server';

/**
 * GET /api/stream?vkey=<video_id>
 *
 * Returns direct mp4 stream URLs per quality for XHUB's own custom player.
 * The map (public/streams.json) is produced by scripts/sync-media.mjs on the
 * builder VM — Vercel's IPs can't resolve Redtube pages themselves.
 * Stream URLs are signed with ~2h validity; the map refreshes every ~25 min.
 */
const MAP_URL =
  'https://raw.githubusercontent.com/VikramMaurya6789/XHUB/main/public/streams.json';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = (searchParams.get('vkey') || '').replace(/\D/g, '');
    if (!id) return NextResponse.json({ error: 'vkey required' }, { status: 400 });

    const res = await fetch(MAP_URL, { next: { revalidate: 600 } });
    if (!res.ok) return NextResponse.json({ error: 'stream map unavailable', vkey: id, qualities: [] }, { status: 502 });
    const map = await res.json();
    const entry = map[id];
    if (!entry?.qualities?.length) {
      return NextResponse.json({ vkey: id, qualities: [], error: 'no streams yet', retry: true }, { status: 404 });
    }

    // Reject stale streams (URLs valid ~2h; cron refreshes every 30min).
    // If stale, tell client to retry — the sync will refresh it.
    const ageMin = (Date.now() - (entry.ts || 0)) / 60000;
    if (ageMin > 100) {
      return NextResponse.json({ vkey: id, qualities: [], error: 'streams refreshing', retry: true }, { status: 404 });
    }

    // Default: 720p if available, else highest below it, else first.
    const order = ['1080', '720', '480', '240'];
    const sorted = [...entry.qualities].sort(
      (a, b) => order.indexOf(a.quality) - order.indexOf(b.quality)
    );
    const def =
      sorted.find(q => q.quality === '720') ||
      sorted.find(q => order.indexOf(q.quality) > order.indexOf('720')) ||
      sorted[0];

    return NextResponse.json(
      { vkey: id, qualities: sorted, defaultQuality: def.quality, resolvedAt: entry.ts },
      { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' } }
    );
  } catch (e) {
    return NextResponse.json({ error: e.message, qualities: [] }, { status: 500 });
  }
}
