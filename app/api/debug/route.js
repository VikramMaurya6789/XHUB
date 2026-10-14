import { NextResponse } from 'next/server';
import { getFeed } from '@/lib/videos';

/**
 * Debug endpoint — verifies the live data path (Redtube API -> transform).
 */
export async function GET() {
  try {
    const t0 = Date.now();
    const videos = await getFeed('hot', 1);
    const ms = Date.now() - t0;
    const v = videos[0];
    return NextResponse.json(
      {
        ok: true,
        status: 'ok',
        ms,
        count: videos.length,
        sample: v
          ? {
              vkey: v.vkey,
              title: v.title,
              thumb: v.thumb,
              embed: v.embed_url,
            }
          : null,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 200 });
  }
}
