import { NextResponse } from 'next/server';
import { sget, sset } from '@/lib/store.js';

const UID_MAX = 128;
const VKEY_MAX = 64;

function key(vkey) {
  return `ratings:${vkey}`;
}

async function load(vkey) {
  const data = await sget(key(vkey));
  const likes = Array.isArray(data?.likes) ? data.likes : [];
  const dislikes = Array.isArray(data?.dislikes) ? data.dislikes : [];
  return { likes, dislikes };
}

function shape(likes, dislikes, uid) {
  return {
    ok: true,
    likes: likes.length,
    dislikes: dislikes.length,
    myRating: uid && likes.includes(uid) ? 'like' : uid && dislikes.includes(uid) ? 'dislike' : null,
  };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const vkey = String(searchParams.get('vkey') || '').trim().slice(0, VKEY_MAX);
    const uid = String(searchParams.get('uid') || '').trim().slice(0, UID_MAX);
    if (!vkey) return NextResponse.json({ ok: true, likes: 0, dislikes: 0, myRating: null });
    const { likes, dislikes } = await load(vkey);
    return NextResponse.json(shape(likes, dislikes, uid));
  } catch {
    return NextResponse.json({ ok: true, likes: 0, dislikes: 0, myRating: null });
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const vkey = String(body.vkey || '').trim().slice(0, VKEY_MAX);
    const uid = String(body.uid || '').trim().slice(0, UID_MAX);
    const type = body.type === 'dislike' ? 'dislike' : body.type === 'like' ? 'like' : null;
    if (!vkey || !uid || !type) {
      return NextResponse.json(
        { ok: false, error: 'vkey, uid and type (like|dislike) are required' },
        { status: 400 }
      );
    }

    const { likes, dislikes } = await load(vkey);
    const hasLike = likes.includes(uid);
    const hasDislike = dislikes.includes(uid);

    if (type === 'like') {
      if (hasLike) {
        // toggle off
        await sset(key(vkey), {
          likes: likes.filter(u => u !== uid),
          dislikes,
        });
      } else {
        await sset(key(vkey), {
          likes: [...likes, uid],
          dislikes: dislikes.filter(u => u !== uid),
        });
      }
    } else {
      if (hasDislike) {
        // toggle off
        await sset(key(vkey), {
          likes,
          dislikes: dislikes.filter(u => u !== uid),
        });
      } else {
        await sset(key(vkey), {
          likes: likes.filter(u => u !== uid),
          dislikes: [...dislikes, uid],
        });
      }
    }

    const next = await load(vkey);
    return NextResponse.json(shape(next.likes, next.dislikes, uid));
  } catch {
    return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 500 });
  }
}
