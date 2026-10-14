import { searchVideos } from '../../../lib/xhamster.js';
import { NextResponse } from 'next/server';
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    if (!q) return NextResponse.json({ error: 'q required', videos: [] }, { status: 400 });
    const videos = await searchVideos(q);
    return NextResponse.json({ videos });
  } catch (e) {
    return NextResponse.json({ error: e.message, videos: [] }, { status: 500 });
  }
}
