import { NextResponse } from 'next/server';
import { sget, sset } from '@/lib/store.js';

const PREFIX = 'xhub:collab:';

function genCode() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let c = '';
  for (let i = 0; i < 8; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

/** GET /api/collab-playlists?code=xxxxxxxx — fetch playlist. */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const code = String(searchParams.get('code') || '').toLowerCase().trim();
    if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });
    const pl = await sget(PREFIX + code);
    if (!pl) return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    return NextResponse.json({ playlist: pl });
  } catch {
    return NextResponse.json({ error: 'Failed to load playlist' }, { status: 500 });
  }
}

/**
 * POST /api/collab-playlists
 *  { action: 'create', name }              — creates playlist, returns { code, playlist }
 *  { action: 'add', code, vkey, title? }   — adds a video (dedupes by vkey)
 *  { action: 'remove', code, vkey }        — removes a video
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'create';

    if (action === 'create') {
      const name = String(body.name || '').trim().slice(0, 80) || 'Untitled playlist';
      const code = genCode();
      const playlist = { code, name, items: [], createdAt: Date.now(), updatedAt: Date.now() };
      await sset(PREFIX + code, playlist);
      return NextResponse.json({ code, playlist });
    }

    const code = String(body.code || '').toLowerCase().trim();
    if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });
    const pl = await sget(PREFIX + code);
    if (!pl) return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });

    if (action === 'add') {
      const vkey = String(body.vkey || '').trim();
      if (!vkey) return NextResponse.json({ error: 'vkey required' }, { status: 400 });
      if (!pl.items.some(i => i.vkey === vkey)) {
        pl.items.push({
          vkey,
          title: String(body.title || vkey).slice(0, 160),
          addedAt: Date.now(),
        });
        pl.updatedAt = Date.now();
        await sset(PREFIX + code, pl);
      }
      return NextResponse.json({ playlist: pl });
    }

    if (action === 'remove') {
      const vkey = String(body.vkey || '').trim();
      pl.items = pl.items.filter(i => i.vkey !== vkey);
      pl.updatedAt = Date.now();
      await sset(PREFIX + code, pl);
      return NextResponse.json({ playlist: pl });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Failed to update playlist' }, { status: 500 });
  }
}
