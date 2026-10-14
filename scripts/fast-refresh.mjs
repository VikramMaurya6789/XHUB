#!/usr/bin/env node
// Fast parallel stream refresh for top videos only
import { execSync } from 'child_process';
import fs from 'fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const STREAMS_FILE = 'public/streams.json';
const CATALOG_URL = 'https://raw.githubusercontent.com/VikramMaurya6789/XHUB/main/public/catalog.json';

function load(f) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; }
}

async function fetchCatalog() {
  const res = await fetch(CATALOG_URL);
  return res.ok ? await res.json() : {};
}

function fetchPage(id) {
  try {
    const html = execSync(
      `curl -sL --max-time 20 -A "${UA}" "https://www.redtube.com/${id}"`,
      { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 25000 }
    );
    return html && html.length > 50000 ? html : null;
  } catch { return null; }
}

function extractToken(html) {
  const m = html.match(/"format":"mp4","videoUrl":"([^"]+)"/);
  if (!m) return null;
  return m[1].replace(/\\\//g, '/');
}

async function resolveStreams(id) {
  const html = fetchPage(id);
  if (!html) return null;
  const tokenPath = extractToken(html);
  if (!tokenPath) return null;
  try {
    const url = tokenPath.startsWith('http') ? tokenPath : `https://www.redtube.com${tokenPath}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Referer': `https://www.redtube.com/${id}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const list = await res.json();
    if (!Array.isArray(list) || !list.length) return null;
    const qualities = list
      .filter(q => q.videoUrl && q.quality)
      .map(q => ({ quality: String(q.quality), url: q.videoUrl.replace(/\\\\/g, '') }));
    return qualities.length ? qualities : null;
  } catch { return null; }
}

async function main() {
  const catalog = await fetchCatalog();
  const ids = Object.entries(catalog)
    .filter(([_, c]) => (c.durationSec || 0) >= 600)
    .sort((a, b) => (b[1].views || 0) - (a[1].views || 0))
    .slice(0, 100)
    .map(([id]) => id);

  console.log(`Refreshing ${ids.length} top videos...`);
  const streams = load(STREAMS_FILE);
  const now = Date.now();
  let done = 0, ok = 0;

  // Process 10 at a time
  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10);
    const results = await Promise.all(batch.map(async id => {
      const q = await resolveStreams(id);
      return { id, q };
    }));
    for (const { id, q } of results) {
      done++;
      if (q) { streams[id] = { qualities: q, ts: now }; ok++; }
    }
    console.log(`Progress: ${done}/${ids.length} (${ok} ok)`);
  }

  fs.writeFileSync(STREAMS_FILE, JSON.stringify(streams));
  console.log(`Done: ${ok}/${ids.length} streams refreshed, total ${Object.keys(streams).length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
