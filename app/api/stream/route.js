import { NextResponse } from 'next/server';
import { getStreams } from '@/lib/xhamster.js';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const vkey = searchParams.get('vkey') || searchParams.get('id');
    if (!vkey) {
      return NextResponse.json({ error: 'vkey required' }, { status: 400 });
    }

    const streamData = await getStreams(vkey);

    return NextResponse.json(streamData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e.message, qualities: [] },
      { status: 500 }
    );
  }
}
