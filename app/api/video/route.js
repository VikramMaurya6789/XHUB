import { NextResponse } from 'next/server';
import { getVideoInfoByUrl, BASE } from '../../../lib/xhamster.js';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const vkey = searchParams.get('vkey');
    const url = searchParams.get('url');
    if (!vkey && !url) {
      return NextResponse.json({ error: 'vkey or url required' }, { status: 400 });
    }
    // If only vkey given, we need the full URL - try to construct via search
    // For now, require url param
    const videoUrl = url || `${BASE}/videos/x-${vkey}`;
    const info = await getVideoInfoByUrl(videoUrl);
    return NextResponse.json({ vkey, ...info });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
