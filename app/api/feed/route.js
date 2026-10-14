import { NextResponse } from 'next/server';
import { getFeed } from '../../../lib/xhamster.js';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const section = searchParams.get('section') || 'hot';
    const page = parseInt(searchParams.get('page') || '1');
    const videos = await getFeed(section, page);
    return NextResponse.json({ videos, section, page });
  } catch (e) {
    return NextResponse.json({ error: e.message, videos: [] }, { status: 500 });
  }
}
