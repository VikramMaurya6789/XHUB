#!/usr/bin/env node
// XHUB refresh cycle — processes a fixed batch of videos then EXITS.
// Replaces the persistent refresh-loop.mjs which had a heap OOM leak.
// Run via cron every 5 min: node scripts/refresh-cycle.mjs [batchSize]
// Each run is a fresh process, so memory cannot accumulate across runs.
import { execFile, execSync, spawnSync } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execFileAsync = promisify(execFile);
const ROOT = '/home/hatch/workspace/xhub-sync';
const STREAMS_FILE = path.join(ROOT, 'public/streams.json');
const THUMBS_FILE = path.join(ROOT, 'public/thumbs.json');
const HD1080_FILE = path.join(ROOT, 'public/hd1080.json');
const CATALOG_FILE = path.join(ROOT, 'public/catalog.json');
const LOG_FILE = path.join(ROOT, 'logs/refresh-cycle.log');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const REPO = 'VikramMaurya6789/XHUB';
const GH = '/home/hatch/workspace/custom-connectors/custom.legacy-github/bin/gh.py';
// Pending-fix patch kept OUTSIDE the repo so `git reset --hard` in gitPull()
// can't wipe it; re-applied automatically until the fix lands on origin/main.
const FIX_PATCH = '/home/hatch/workspace/.xhub-refresh-fix.patch';
const CONC = 32;
// Throughput note (diagnosed 2026-10-15): 25,591 catalog entries must each be
// refreshed at least every ~120 min (api/stream freshness cutoff), i.e. the
// fleet must sustain >=213 videos/min. One run at CONC=32 does ~3.2/s, so the
// writer cron (800/batch) plus two shard workers (1400/batch each, every 10 min)
// together deliver ~295/min with headroom. DO NOT lower these without
// re-checking the stale fraction (batch=800 alone covered only ~26% of demand
// and left 79% of the catalog unplayable).
const BATCH = parseInt(process.argv[2] || '800', 10);
// Heap guard (2026-10-15 ~20:40 IST): at CONC=32 the allocation rate overwhelms
// V8 GC under the default ~2GB heap — the writer batch (2600) FATAL-OOMed at
// ~2200 videos. Re-exec once with a 4GB heap for large batches only: shard
// workers (batch<=2000) fit under the default cap, and three concurrent 4GB
// heaps would risk this box's 7.9GB RAM. The cron's literal command keeps
// working unchanged.
if (BATCH > 2000 && !process.env.XHUB_HEAP_OK) {
  const r = spawnSync(process.execPath,
    ['--max-old-space-size=4096',
     ...process.execArgv.filter(a => !a.startsWith('--max-old-space-size')),
     process.argv[1], ...process.argv.slice(2)],
    { stdio: 'inherit', env: { ...process.env, XHUB_HEAP_OK: '1' } });
  process.exit(typeof r.status === 'number' ? r.status : 1);
}
// Worker mode: node scripts/refresh-cycle.mjs <batch> <shard> <shards>
// A worker refreshes only ids with (numeric id % shards) === shard, writes them
// to public/refresh-part-<shard>.json and pushes ONLY that file. The writer cron
// (no shard args) merges all part files into streams.json (max-ts-wins) and pushes
// the full map. Workers never touch streams.json, so parallel pushes can't clobber.
const SHARD = process.argv[3] !== undefined ? parseInt(process.argv[3], 10) : -1;
const SHARDS = process.argv[4] !== undefined ? parseInt(process.argv[4], 10) : 1;
const WORKER_MODE = SHARD >= 0;
const PART_FILE = WORKER_MODE ? path.join(ROOT, `public/refresh-part-${SHARD}.json`) : null;
const shardOf = id => { const n = parseInt(id, 10); return Number.isFinite(n) ? ((n % SHARDS) + SHARDS) % SHARDS : 0 };
const STREAM_REFRESH_MIN = 60;
const THUMB_REFRESH_H = 72;

const sleep = ms => new Promise(r => setTimeout(r, ms));
function log(...a) {
  const line = `[${new Date().toISOString()}] ${a.join(' ')}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}
const load = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; } };
function shardFiles() {
  try {
    return fs.readdirSync(path.join(ROOT, 'public'))
      .filter(f => /^streams-shard-\d+\.json$/.test(f))
      .map(f => 'public/' + f);
  } catch { return []; }
}

async function fetchPage(id) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { stdout: html } = await execFileAsync(
        'curl',
        ['-sL', '--max-time', '20', '-A', UA, '-H', 'Referer: https://www.google.com/', `https://www.redtube.com/${id}`],
        { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, timeout: 25000 }
      );
      if (html && html.length > 100000) return html;
    } catch {}
    await sleep(1000 * (attempt + 1));
  }
  return null;
}
function extractOgImage(html) {
  const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  return m ? m[1].replace(/&amp;/g, '&') : null;
}
function extractMp4Token(html) {
  const m = html.match(/(?:\\?\/)media(?:\\?\/)mp4\?s=([A-Za-z0-9+/=_-]+)/);
  return m ? '/media/mp4?s=' + m[1] : null;
}
async function resolveStreamsFromHtml(id, html) {
  const tokenPath = extractMp4Token(html);
  if (!tokenPath) return null;
  try {
    const res = await fetch(`https://www.redtube.com${tokenPath}`, {
      headers: { 'User-Agent': UA, 'Referer': `https://www.redtube.com/${id}`, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const list = await res.json();
    if (!Array.isArray(list) || !list.length) return null;
    const q = list.filter(x => x.videoUrl && x.quality)
      .map(x => ({ quality: String(x.quality), url: String(x.videoUrl).replace(/\\/g, '') }));
    return q.length ? q : null;
  } catch { return null; }
}
async function resolveBoth(id) {
  const html = await fetchPage(id);
  if (!html) return {};
  const thumb = extractOgImage(html);
  const qualities = await resolveStreamsFromHtml(id, html);
  return { thumb, qualities };
}

function gitPull() {
  try {
    execSync('git fetch -q origin && git reset -q --hard origin/main', { cwd: ROOT, timeout: 60000 });
  } catch (e) { log('git pull failed:', e.message); }
  // The reset above wipes uncommitted fixes (e.g. this fleet's own code while it
  // hasn't landed on origin yet). Re-apply the pending patch if present — it
  // lives outside the repo so the reset can't touch it. No-op once pushed.
  try {
    execSync(`git apply --check "${FIX_PATCH}"`, { cwd: ROOT, timeout: 15000 });
    execSync(`git apply "${FIX_PATCH}"`, { cwd: ROOT, timeout: 15000 });
    log('re-applied pending refresh fix patch after reset');
  } catch {}
  return true;
}
function writeFiles(streams, thumbs) {
  const hd = {};
  for (const [id, e] of Object.entries(streams))
    if (e.qualities?.some(q => /1080/.test(q.quality))) hd[id] = 1;
  fs.writeFileSync(STREAMS_FILE, JSON.stringify(streams));
  fs.writeFileSync(THUMBS_FILE, JSON.stringify(thumbs));
  fs.writeFileSync(HD1080_FILE, JSON.stringify(hd));
}
function push(msg, onlyFiles) {
  const files = onlyFiles || ['public/streams.json', 'public/thumbs.json', 'public/hd1080.json', ...shardFiles()];
  try {
    const st = execSync(`git status --porcelain ${files.join(' ')}`, { cwd: ROOT, encoding: 'utf8' }).trim();
    if (!st) { log('push: clean'); return; }
    const out = execSync(
      `PYTHONPATH=/opt/muse/skills/custom-connector-setup/bin python3 ${GH} push --repo ${REPO} --message "${msg}" --dir ${ROOT} --auto ${files.join(' ')}`,
      { cwd: ROOT, encoding: 'utf8', timeout: 180000 }
    );
    log('push ok:', out.trim().split('\n').pop());
  } catch (e) { log('push FAILED:', e.message.split('\n')[0]); }
}
function partFiles() {
  try {
    return fs.readdirSync(path.join(ROOT, 'public'))
      .filter(f => /^refresh-part-\d+\.json$/.test(f))
      .map(f => 'public/' + f);
  } catch { return []; }
}

async function main() {
  const t0 = Date.now();
  gitPull();
  const now = Date.now();
  const streams = load(STREAMS_FILE);
  const thumbs = load(THUMBS_FILE);
  const catalog = load(CATALOG_FILE);

  let merged = 0;
  for (const f of shardFiles()) {
    const shard = load(path.join(ROOT, f));
    for (const [id, e] of Object.entries(shard)) {
      if (e?.qualities?.length && !streams[id]?.qualities?.length) { streams[id] = e; merged++; }
    }
  }
  if (merged) log(`merged ${merged} shard entries`);

  const catalogOrder = [];
  for (const [id, v] of Object.entries(catalog)) {
    const d = v?.added || v?.date || v?.publishDate || '';
    if (d) catalogOrder.push([id, d]);
  }
  catalogOrder.sort((a, b) => (b[1] < a[1] ? -1 : b[1] > a[1] ? 1 : 0));
  const inStreams = new Set(Object.keys(streams));
  const pending = catalogOrder.filter(([id]) => !inStreams.has(id)).map(([id]) => id);
  const stale = Object.keys(streams)
    .filter(id => now - (streams[id]?.ts || 0) > STREAM_REFRESH_MIN * 60 * 1000)
    .sort((a, b) => (streams[a]?.ts || 0) - (streams[b]?.ts || 0));

  const batch = [...pending, ...stale]
    .filter(id => !WORKER_MODE || shardOf(id) === SHARD)
    .slice(0, BATCH);
  log(`${WORKER_MODE ? `worker shard ${SHARD}/${SHARDS} ` : ''}batch: ${batch.length} videos (${pending.length} pending, ${stale.length} stale available)`);

  let done = 0, okS = 0, okT = 0;
  let qi = 0;
  const refreshed = new Set();
  await Promise.all(Array.from({ length: CONC }, async () => {
    while (qi < batch.length) {
      const id = batch[qi++];
      done++;
      try {
        const se = streams[id];
        const te = thumbs[id];
        const needS = !se?.qualities?.length || (now - (se.ts || 0) > STREAM_REFRESH_MIN * 60 * 1000);
        const needT = !WORKER_MODE && (!te?.url || (now - (te.ts || 0) > THUMB_REFRESH_H * 3600 * 1000));
        if (needS || needT) {
          const { thumb, qualities } = await resolveBoth(id);
          if (qualities?.length) { streams[id] = { qualities, ts: Date.now() }; okS++; refreshed.add(id); }
          if (thumb && !WORKER_MODE) { thumbs[id] = { url: thumb, ts: Date.now() }; okT++; }
        }
      } catch {}
      if (done % 100 === 0) log(`progress ${done}/${batch.length}`);
    }
  }));

  if (WORKER_MODE) {
    // Worker: persist only this run's refreshed entries to its part file and
    // push that file alone. The writer cron merges parts into streams.json.
    const part = load(PART_FILE);
    for (const id of refreshed) part[id] = streams[id];
    fs.writeFileSync(PART_FILE, JSON.stringify(part));
    const rel = path.relative(ROOT, PART_FILE);
    push(`refresh part-${SHARD}: ${okS} streams`, [rel]);
    log(`done in ${Math.round((Date.now() - t0) / 1000)}s: ${okS} streams (shard ${SHARD}/${SHARDS})`);
    return;
  }

  // Writer: fold all worker part files into streams.json (newest ts wins).
  let partMerged = 0;
  for (const pf of partFiles()) {
    const part = load(path.join(ROOT, pf));
    for (const [id, e] of Object.entries(part)) {
      if (e?.qualities?.length && (e.ts || 0) > (streams[id]?.ts || 0)) { streams[id] = e; partMerged++; }
    }
  }
  if (partMerged) log(`merged ${partMerged} worker part entries`);

  writeFiles(streams, thumbs);
  push(`refresh cycle: ${okS} streams, ${okT} thumbs (${Object.keys(streams).length} total)`);
  log(`done in ${Math.round((Date.now() - t0) / 1000)}s: ${okS} streams, ${okT} thumbs`);
}

main().catch(e => { log('FATAL:', e.message); process.exit(1); });
