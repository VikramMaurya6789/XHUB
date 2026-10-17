import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { POPULAR_CATEGORIES } from '@/lib/videos';

/**
 * GET /api/suggest?q=...
 * Lightweight title autocomplete over the local catalog (public/catalog.json).
 * Returns up to 8 { vkey, title } matches. Prefix matches rank first.
 */

// Module-level cache: built once per server instance, refreshed every 30 min.
let indexCache = null;
let indexAt = 0;

async function getTitleIndex() {
  const now = Date.now();
  if (indexCache && now - indexAt < 30 * 60 * 1000) return indexCache;
  try {
    const file = path.join(process.cwd(), 'public', 'catalog.json');
    const raw = await readFile(file, 'utf8');
    const catalog = JSON.parse(raw);
    indexCache = Object.entries(catalog)
      .map(([v, c]) => ({ v: String(v), t: String(c?.title || '') }))
      .filter(e => e.t.length > 0);
    indexAt = now;
  } catch (e) {
    indexCache = indexCache || [];
  }
  return indexCache;
}

export async function GET(req) {
  try {
    const q = (new URL(req.url).searchParams.get('q') || '').trim().toLowerCase();
    if (q.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }
    const index = await getTitleIndex();
    const words = q.split(/\s+/).filter(Boolean);
    const prefix = [];
    const contains = [];

    for (const e of index) {
      const tl = e.t.toLowerCase();
      if (tl.startsWith(q)) {
        prefix.push(e);
      } else if (words.every(w => tl.includes(w))) {
        contains.push(e);
      }
      if (prefix.length + contains.length >= 40) break;
    }

    const matchingCategories = POPULAR_CATEGORIES
      .filter(c => c.name.toLowerCase().includes(q) || c.slug.includes(q))
      .map(c => ({ vkey: c.slug, title: c.name }));

    const top = [...matchingCategories, ...prefix, ...contains].slice(0, 8);
    return NextResponse.json({
      suggestions: top.map(e => ({ vkey: e.vkey || e.v, title: e.title || e.t })),
    });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
