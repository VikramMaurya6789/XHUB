/**
 * XHUB shard stream resolver — parallel helper for the refresh loop.
 *
 * Usage: node scripts/resolve-shard.mjs <shardIndex>
 *
 * Reads video IDs from scripts/shard-<i>.txt, resolves their stream URLs
 * (same method as refresh-loop.mjs), and writes results incrementally to
 * public/streams-shard-<i>.json. The refresh loop merges these files into
 * public/streams.json on every pass and pushes them to GitHub.
 *
 * This script NEVER touches streams.json and NEVER git-pushes — the loop owns those.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const CONC = 10;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const load = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; } };

const shard = process.argv[2];
if (shard === undefined) { console.error('usage: node scripts/resolve-shard.mjs <shardIndex>'); process.exit(1); }
const IDS_FILE = path.join(__dirname, `shard-${shard}.txt`);
const OUT_FILE = path.join(ROOT, 'public', `streams-shard-${shard}.json`);
const STREAMS_FILE = path.join(ROOT, 'public', 'streams.json');

function extractMp4Token(html) {
  const m = html.match(/(?:\\?\/)media(?:\\?\/)mp4\?s=([A-Za-z0-9+/=_-]+)/);
  return m ? '/media/mp4?s=' + m[1] : null;
}
async function fetchPage(id) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { stdout: html } = await execFileAsync(
        'curl',
        ['-sL', '--max-time', '25', '-A', UA, '-H', 'Referer: https://www.google.com/', `https://www.redtube.com/${id}`],
        { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 30000 }
      );
      if (html && html.length > 100000) return html;
    } catch {}
    await sleep(1500 * (attempt + 1));
  }
  return null;
}
async function resolveStreams(id, html) {
  const tokenPath = extractMp4Token(html);
  if (!tokenPath) return null;
  try {
    const res = await fetch(`https://www.redtube.com${tokenPath}`, {
      headers: { 'User-Agent': UA, 'Referer': `https://www.redtube.com/${id}`, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const list = await res.json();
    if (!Array.isArray(list) || !list.length) return null;
    const q = list.filter(x => x.videoUrl && x.quality)
      .map(x => ({ quality: String(x.quality), url: x.videoUrl.replace(/\\/g, '') }));
    return q.length ? q : null;
  } catch { return null; }
}

async function main() {
  const ids = fs.readFileSync(IDS_FILE, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
  // Skip IDs the main loop already resolved (fresh in streams.json).
  const streams = load(STREAMS_FILE);
  const now = Date.now();
  const pending = ids.filter(id => {
    const e = streams[id];
    return !(e?.qualities?.length && now - (e.ts || 0) < 100 * 60 * 1000);
  });
  console.log(`shard ${shard}: ${ids.length} ids, ${pending.length} pending`);

  let out = load(OUT_FILE);
  let done = 0, ok = 0, fail = 0;
  const save = () => {
    try { fs.writeFileSync(OUT_FILE, JSON.stringify(out)); } catch {}
  };
  const queue = [...pending];
  await Promise.all(Array.from({ length: CONC }, async () => {
    while (queue.length) {
      const id = queue.shift();
      done++;
      try {
        const html = await fetchPage(id);
        const qualities = html ? await resolveStreams(id, html) : null;
        if (qualities) { out[id] = { qualities, ts: Date.now() }; ok++; }
        else fail++;
      } catch { fail++; }
      if (done % 25 === 0) { save(); console.log(`shard ${shard}: ${done}/${pending.length} ok:${ok} fail:${fail}`); }
    }
  }));
  save();
  console.log(`shard ${shard} DONE: ${done} processed, ok:${ok} fail:${fail}, total in file: ${Object.keys(out).length}`);
}

main().catch(e => { console.error('shard FATAL:', e.message); process.exit(1); });
