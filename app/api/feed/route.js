import { NextResponse } from 'next/server';
import { getFeed } from '@/lib/videos.js';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const section = searchParams.get('section') || 'hot';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const videos = await getFeed(section, page);

    return NextResponse.json(
      { videos, section, page },
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
