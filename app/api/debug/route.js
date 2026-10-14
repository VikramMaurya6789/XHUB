import { NextResponse } from 'next/server';
import { fetchHtml } from '../../../lib/xhamster.js';

export async function GET() {
  try {
    const html = await fetchHtml('https://xhamster.com/');
    return NextResponse.json({
      htmlLength: html.length,
      hasVideos: html.includes('/videos/'),
      videoCount: (html.match(/\/videos\//g) || []).length,
      sample: html.slice(0, 500),
      title: (html.match(/<title>([^<]+)</) || [])[1] || 'no title',
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
