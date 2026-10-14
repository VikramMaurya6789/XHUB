import { NextResponse } from 'next/server';
import { getVideoByVkey, getVideoInfoByUrl } from '../../../lib/videos.js';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const vkey = searchParams.get('vkey') || searchParams.get('id');
    const url = searchParams.get('url');

    if (!vkey && !url) {
      return NextResponse.json({ error: 'vkey or url parameter is required' }, { status: 400 });
    }

    let info;
    if (vkey) {
      info = await getVideoByVkey(vkey);
    } else {
      info = await getVideoInfoByUrl(url);
    }

    return NextResponse.json(info, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Failed to fetch video' }, { status: 500 });
  }
}
