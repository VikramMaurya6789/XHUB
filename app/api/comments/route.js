import { NextResponse } from 'next/server';
import { sget, spush } from '@/lib/store.js';

const MAX_PER_VIDEO = 200;
const NAME_MAX = 40;
const TEXT_MAX = 500;

// Basic profanity list — offending words are masked, never echoed raw.
const BANNED = [
  'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'cunt',
  'motherfucker', 'whore', 'slut',
];

function mask(text) {
  let t = String(text || '').trim();
  for (const w of BANNED) {
    t = t.replace(new RegExp(`\\b${w}\\b`, 'gi'), '***');
  }
  return t;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const vkey = String(searchParams.get('vkey') || '').trim();
    if (!vkey) return NextResponse.json({ ok: true, comments: [] });
    const comments = await sget(`comments:${vkey}`);
    return NextResponse.json({
      ok: true,
      comments: Array.isArray(comments) ? comments : [],
    });
  } catch {
    return NextResponse.json({ ok: true, comments: [] });
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const vkey = String(body.vkey || '').trim().slice(0, 64);
    const name = mask(body.name || '').slice(0, NAME_MAX) || 'Guest';
    const text = mask(body.text || '').slice(0, TEXT_MAX);
    if (!vkey || !text) {
      return NextResponse.json(
        { ok: false, error: 'vkey and text are required' },
        { status: 400 }
      );
    }
    const comment = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      text,
      time: new Date().toISOString(),
    };
    const comments = await spush(`comments:${vkey}`, comment, MAX_PER_VIDEO);
    return NextResponse.json({ ok: true, comment, count: comments.length });
  } catch {
    return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 500 });
  }
}
