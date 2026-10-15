#!/usr/bin/env node
// XHUB refresh cycle — processes a fixed batch of videos then EXITS.
// Replaces the persistent refresh-loop.mjs which had a heap OOM leak.
// Run via cron every 5 min: node scripts/refresh-cycle.mjs [batchSize]
// Each run is a fresh process, so memory cannot accumulate across runs.
import { execFile, execSync } from 'child_process';
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
const CONC = 24;
const BATCH = parseInt(process.argv[2] || '800', 10);
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
    return true;
  } catch (e) { log('git pull failed:', e.message); return false; }
}
function writeFiles(streams, thumbs) {
  const hd = {};
  for (const [id, e] of Object.entries(streams))
    if (e.qualities?.some(q => /1080/.test(q.quality))) hd[id] = 1;
  fs.writeFileSync(STREAMS_FILE, JSON.stringify(streams));
  fs.writeFileSync(THUMBS_FILE, JSON.stringify(thumbs));
  fs.writeFileSync(HD1080_FILE, JSON.stringify(hd));
}
function push(msg) {
  const files = ['public/streams.json', 'public/thumbs.json', 'public/hd1080.json', ...shardFiles()];
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
    if (v?.date) catalogOrder.push([id, v.date]);
  }
  catalogOrder.sort((a, b) => (b[1] < a[1] ? -1 : b[1] > a[1] ? 1 : 0));
  const inStreams = new Set(Object.keys(streams));
  const pending = catalogOrder.filter(([id]) => !inStreams.has(id)).map(([id]) => id);
  const stale = Object.keys(streams)
    .filter(id => now - (streams[id]?.ts || 0) > STREAM_REFRESH_MIN * 60 * 1000)
    .sort((a, b) => (streams[a]?.ts || 0) - (streams[b]?.ts || 0));

  const batch = [...pending, ...stale].slice(0, BATCH);
  log(`batch: ${batch.length} videos (${pending.length} pending, ${stale.length} stale available)`);

  let done = 0, okS = 0, okT = 0;
  let qi = 0;
  await Promise.all(Array.from({ length: CONC }, async () => {
    while (qi < batch.length) {
      const id = batch[qi++];
      done++;
      try {
        const se = streams[id];
        const te = thumbs[id];
        const needS = !se?.qualities?.length || (now - (se.ts || 0) > STREAM_REFRESH_MIN * 60 * 1000);
        const needT = !te?.url || (now - (te.ts || 0) > THUMB_REFRESH_H * 3600 * 1000);
        if (needS || needT) {
          const { thumb, qualities } = await resolveBoth(id);
          if (qualities?.length) { streams[id] = { qualities, ts: Date.now() }; okS++; }
          if (thumb) { thumbs[id] = { url: thumb, ts: Date.now() }; okT++; }
        }
      } catch {}
      if (done % 100 === 0) log(`progress ${done}/${batch.length}`);
    }
  }));

  writeFiles(streams, thumbs);
  push(`refresh cycle: ${okS} streams, ${okT} thumbs (${Object.keys(streams).length} total)`);
  log(`done in ${Math.round((Date.now() - t0) / 1000)}s: ${okS} streams, ${okT} thumbs`);
}

main().catch(e => { log('FATAL:', e.message); process.exit(1); });
