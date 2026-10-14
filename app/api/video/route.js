import { NextResponse } from 'next/server';
import { getVideoInfo, getVideoInfoByUrl } from '../../../lib/videos.js';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || searchParams.get('vkey');
    const url = searchParams.get('url');

    if (!id && !url) {
      return NextResponse.json({ error: 'id or url parameter is required' }, { status: 400 });
    }

    let info;
    if (id) {
      info = await getVideoInfo(id);
    } else {
      info = await getVideoInfoByUrl(url);
    }

    return NextResponse.json(info);
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Failed to fetch video' }, { status: 500 });
  }
}
