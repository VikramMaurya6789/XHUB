import { NextResponse } from 'next/server';
import { searchVideos } from '@/lib/videos.js';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    const sort = searchParams.get('sort') || 'relevant';
    const dur = searchParams.get('dur') || 'all';
    const quality = searchParams.get('quality') || 'all';
    const page = parseInt(searchParams.get('page') || '1', 10);

    if (!q || !q.trim()) {
      return NextResponse.json({ error: 'Query required', videos: [] }, { status: 400 });
    }

    const videos = await searchVideos(q, { sort, dur, quality, page });

    return NextResponse.json(
      { videos, query: q, sort, dur, quality, page },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
        },
      }
    );
  } catch (e) {
    return NextResponse.json({ error: e.message, videos: [] }, { status: 500 });
  }
}
