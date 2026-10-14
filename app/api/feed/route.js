import { NextResponse } from 'next/server';
import { getFeed } from '../../../lib/videos.js';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const section = searchParams.get('section') || 'hot';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const videos = await getFeed(section, page);
    return NextResponse.json({ videos, section, page });
  } catch (e) {
    return NextResponse.json({ error: e.message, stack: e.stack?.slice(0, 500), videos: [] }, { status: 500 });
  }
}
