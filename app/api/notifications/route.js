import { NextResponse } from 'next/server';

const LIMIT = 40;

// NOTE: lib/videos.js is under active parallel development, so this route
// fetches the catalog itself rather than depending on its internals.
const CATALOG_URL =
  'https://raw.githubusercontent.com/VikramMaurya6789/XHUB/main/public/catalog.json';

let catalogCache = null;
let catalogCacheAt = 0;
async function getCatalog() {
  const now = Date.now();
  if (catalogCache && now - catalogCacheAt < 10 * 60 * 1000) return catalogCache;
  try {
    const res = await fetch(CATALOG_URL, { next: { revalidate: 600 } });
    catalogCache = res.ok ? await res.json() : {};
    catalogCacheAt = now;
  } catch {
    catalogCache = catalogCache || {};
  }
  return catalogCache;
}

/**
 * GET /api/notifications?uid=&since=<epoch ms>
 *
 * Returns catalog videos added after `since` (newest first, capped).
 * The client passes its local `xhub_notif_seen` timestamp as `since` and,
 * after viewing the dropdown, advances it — so the bell badge only counts
 * genuinely new uploads.
 *
 * NOTE: the catalog currently carries no uploader field, so notifications
 * are scoped to "newest site-wide uploads" rather than per-creator ones.
 * Once catalog entries include uploader names, this route can filter by the
 * user's followed creators (pass ?creators=a,b) without changing the client.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const since = Number(searchParams.get('since') || 0) || 0;

    const catalog = await getCatalog();
    const items = [];
    for (const [id, c] of Object.entries(catalog || {})) {
      if (!c || typeof c !== 'object') continue;
      const added = Date.parse(String(c.added || '').replace(' ', 'T')) || 0;
      if (added > since) {
        items.push({
          vkey: String(id),
          title: c.title || 'Untitled',
          thumb: `/api/thumb?vkey=${encodeURIComponent(String(id))}`,
          duration: c.duration || '',
          durationSec: c.durationSec || 0,
          views: c.views || 0,
          added: c.added || '',
          addedMs: added,
        });
      }
    }
    items.sort((a, b) => b.addedMs - a.addedMs);

    return NextResponse.json({
      ok: true,
      since,
      count: items.length > LIMIT ? LIMIT : items.length,
      total: items.length,
      items: items.slice(0, LIMIT),
    });
  } catch {
    return NextResponse.json({ ok: true, since: 0, count: 0, total: 0, items: [] });
  }
}
