import { NextResponse } from 'next/server';
import { sget, sset } from '@/lib/store.js';

const UID_MAX = 128;
const ID_MAX = 160;

function key(uid) {
  return `follows:${uid}`;
}

async function load(uid) {
  const data = await sget(key(uid));
  return data && typeof data === 'object' ? data : {};
}

function listOf(map) {
  return Object.values(map)
    .filter(c => c && c.id)
    .sort((a, b) => (b.since || 0) - (a.since || 0));
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = String(searchParams.get('uid') || '').trim().slice(0, UID_MAX);
    if (!uid) return NextResponse.json({ ok: true, creators: [] });
    return NextResponse.json({ ok: true, creators: listOf(await load(uid)) });
  } catch {
    return NextResponse.json({ ok: true, creators: [] });
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const uid = String(body.uid || '').trim().slice(0, UID_MAX);
    const creatorId = String(body.creatorId || '').trim().slice(0, ID_MAX);
    const name = String(body.name || creatorId || '').trim().slice(0, ID_MAX);
    const action = body.action === 'unfollow' ? 'unfollow' : body.action === 'follow' ? 'follow' : null;
    if (!uid || !creatorId || !action) {
      return NextResponse.json(
        { ok: false, error: 'uid, creatorId and action (follow|unfollow) are required' },
        { status: 400 }
      );
    }

    const map = await load(uid);
    let following;
    if (action === 'follow') {
      map[creatorId] = { id: creatorId, name, since: Date.now() };
      following = true;
    } else {
      delete map[creatorId];
      following = false;
    }
    await sset(key(uid), map);
    return NextResponse.json({ ok: true, following, creators: listOf(map) });
  } catch {
    return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 500 });
  }
}
