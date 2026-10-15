import { NextResponse } from 'next/server';
import { sget, sset, slist, sdel } from '@/lib/store.js';

const PREFIX = 'xhub:uploads:';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** GET /api/uploads[?uid=...] — list uploads, newest first. */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');
    const entries = await slist(PREFIX + '*');
    let uploads = entries
      .map(e => e.value)
      .filter(Boolean)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (uid) uploads = uploads.filter(u => u.uid === uid);
    return NextResponse.json({ uploads });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to list uploads' }, { status: 500 });
  }
}

/**
 * POST /api/uploads
 *  { action: 'create', title, videoUrl, thumbnailUrl?, description?, category?, tags?, uploader?, uid }
 *  { action: 'view', id }        — increments view count
 *  { action: 'delete', id, uid } — removes an upload owned by uid
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'create';

    if (action === 'view') {
      if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
      const key = PREFIX + body.id;
      const up = await sget(key);
      if (!up) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      up.views = (Number(up.views) || 0) + 1;
      await sset(key, up);
      return NextResponse.json({ views: up.views });
    }

    if (action === 'delete') {
      if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
      const key = PREFIX + body.id;
      const up = await sget(key);
      if (!up) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (body.uid && up.uid && up.uid !== body.uid) {
        return NextResponse.json({ error: 'Not your upload' }, { status: 403 });
      }
      await sdel(key);
      return NextResponse.json({ ok: true });
    }

    // create
    const title = String(body.title || '').trim();
    const videoUrl = String(body.videoUrl || '').trim();
    if (!title || !videoUrl) {
      return NextResponse.json({ error: 'title and videoUrl are required' }, { status: 400 });
    }
    if (!/^https?:\/\//i.test(videoUrl)) {
      return NextResponse.json({ error: 'videoUrl must be an http(s) URL' }, { status: 400 });
    }
    const id = genId();
    const upload = {
      id,
      title: title.slice(0, 160),
      description: String(body.description || '').slice(0, 2000),
      videoUrl,
      thumbnailUrl: String(body.thumbnailUrl || '').trim().slice(0, 1000),
      category: String(body.category || '').trim().slice(0, 80),
      tags: String(body.tags || '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .slice(0, 20),
      uploader: String(body.uploader || 'Uploader').trim().slice(0, 60) || 'Uploader',
      uid: String(body.uid || 'anon').slice(0, 60),
      views: 0,
      createdAt: Date.now(),
    };
    await sset(PREFIX + id, upload);
    return NextResponse.json({ upload });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save upload' }, { status: 500 });
  }
}
