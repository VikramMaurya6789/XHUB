import { NextResponse } from 'next/server';
import { sget, sset } from '@/lib/store.js';

const PREFIX = 'xhub:party:';

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

/** GET /api/party?code=XXXXXX — fetch room state. */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const code = String(searchParams.get('code') || '').toUpperCase().trim();
    if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });
    const room = await sget(PREFIX + code);
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    return NextResponse.json({ room });
  } catch {
    return NextResponse.json({ error: 'Failed to load room' }, { status: 500 });
  }
}

/**
 * POST /api/party
 *  { vkey, uid }              — create room for a video, returns { code, room }
 *  { code, t, playing, uid }  — host pushes playback state
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const uid = String(body.uid || 'anon').slice(0, 60);

    // Create
    if (body.vkey && !body.code) {
      const vkey = String(body.vkey).trim();
      if (!vkey) return NextResponse.json({ error: 'vkey required' }, { status: 400 });
      let code = genCode();
      // Extremely unlikely collision guard
      if (await sget(PREFIX + code)) code = genCode();
      const room = {
        code,
        vkey,
        t: 0,
        playing: false,
        hostUid: uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await sset(PREFIX + code, room);
      return NextResponse.json({ code, room });
    }

    // Update (host only)
    const code = String(body.code || '').toUpperCase().trim();
    if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });
    const room = await sget(PREFIX + code);
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    if (room.hostUid && room.hostUid !== uid) {
      return NextResponse.json({ error: 'Only the host updates this room', room });
    }
    room.t = Math.max(0, Number(body.t) || 0);
    room.playing = Boolean(body.playing);
    room.updatedAt = Date.now();
    await sset(PREFIX + code, room);
    return NextResponse.json({ room });
  } catch {
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
  }
}
