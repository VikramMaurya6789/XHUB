import { searchVideos } from '../../../lib/videos.js';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1', 10);
    if (!q || !q.trim()) return NextResponse.json({ error: 'Query required', videos: [] }, { status: 400 });
    const videos = await searchVideos(q, page);
    return NextResponse.json({ videos, query: q, page });
  } catch (e) {
    return NextResponse.json({ error: e.message, videos: [] }, { status: 500 });
  }
}
