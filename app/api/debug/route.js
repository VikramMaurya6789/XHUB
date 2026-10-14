import { NextResponse } from 'next/server';
import { getFeed } from '../../../lib/videos.js';

/**
 * Debug endpoint — verifies the live data path (Redtube API -> transform).
 * Previously imported a non-existent `fetchHtml` from lib/xhamster.js (500).
 */
export async function GET() {
  try {
    const t0 = Date.now();
    const videos = await getFeed('hot', 1);
    const ms = Date.now() - t0;
    const v = videos[0];
    return NextResponse.json({
      ok: true,
      ms,
      count: videos.length,
      sample: v
        ? {
            vkey: v.vkey,
            title: v.title,
            thumb: v.thumb,
            thumbOk: v.thumb.startsWith('/api/thumb'),
            embed: v.embed_url,
          }
        : null,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
