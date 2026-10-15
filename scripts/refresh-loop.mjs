/**
 * XHUB continuous stream/thumbnail refresher (runs forever under nohup).
 *
 * Why this exists: /api/stream 404s any streams.json entry older than 100 min
 * ("streams refreshing"), and the signed mp4 URLs themselves expire ~2h after
 * signing. The old 30-min cron (sync-media.mjs) only refreshed ~430 feed
 * videos per run, so 4,300+ entries went permanently stale -> every watch
 * page stuck on "Resolving HD stream…" forever. This loop cycles through ALL
 * streams.json entries oldest-first (+ newest catalog videos), keeping
 * everything fresh, and pushes to GitHub every few minutes.
 *
 * Single writer: holds scripts/.refresh-loop.lock (PID). The 30-min cron is
 * now just a watchdog that restarts this loop if dead — it must NOT run
 * sync-media.mjs concurrently (it would clobber unpushed work via reset --hard).
 *
 * Usage: node scripts/refresh-loop.mjs   (run under nohup; logs to logs/refresh-loop.log)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, execFile } from 'child_process';
import { promisify } from 'util';
const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STREAMS_FILE = path.join(ROOT, 'public', 'streams.json');
const THUMBS_FILE = path.join(ROOT, 'public', 'thumbs.json');
const HD1080_FILE = path.join(ROOT, 'public', 'hd1080.json');
const CATALOG_FILE = path.join(ROOT, 'public', 'catalog.json');
const LOCK_FILE = path.join(__dirname, '.refresh-loop.lock');
const LOG_FILE = path.join(ROOT, 'logs', 'refresh-loop.log');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const API = 'https://api.redtube.com/';
const REPO = 'VikramMaurya6789/XHUB';
const GH = '/home/hatch/workspace/custom-connectors/custom.legacy-github/bin/gh.py';
const CONC = 24;
const STREAM_REFRESH_MIN = 60;   // refresh streams older than this (route rejects >100)
const THUMB_REFRESH_MIN = 40;
const PUSH_EVERY_MS = 5 * 60 * 1000;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const load = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; } };
function log(...a) {
  const line = `[${new Date().toISOString()}] ${a.join(' ')}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

// ---- single-instance lock ----
try {
  const oldPid = fs.readFileSync(LOCK_FILE, 'utf8').trim();
  if (oldPid) {
    try { process.kill(parseInt(oldPid, 10), 0); log(`another loop alive (pid ${oldPid}), exiting`); process.exit(0); }
    catch { /* stale lock */ }
  }
} catch {}
fs.writeFileSync(LOCK_FILE, String(process.pid));
process.on('exit', () => { try { fs.unlinkSync(LOCK_FILE); } catch {} });
process.on('SIGTERM', () => process.exit(0));
// Never die silently: log the reason (OOM/native abort still bypasses this,
// but JS-level failures get recorded).
process.on('uncaughtException', e => { try { log('UNCAUGHT:', e && e.stack || e); } catch {} process.exit(1); });
process.on('unhandledRejection', e => { try { log('UNHANDLED REJECTION:', e && e.stack || e); } catch {} });

function extractOgImage(html) {
  const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  return m ? m[1].replace(/&amp;/g, '&') : null;
}
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
async function resolveStreamsFromHtml(id, html) {
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
// Single page fetch serves both thumb + streams (page fetch is the expensive part).
async function resolveBoth(id) {
  const html = await fetchPage(id);
  if (!html) return {};
  const thumb = extractOgImage(html);
  const qualities = await resolveStreamsFromHtml(id, html);
  return { thumb, qualities };
}

async function feedIds() {
  const ids = new Set();
  const targets = [
    { search: 'hot', ordering: 'mostviewed', page: 1 }, { search: 'hot', ordering: 'mostviewed', page: 2 },
    { ordering: 'newest', page: 1 }, { ordering: 'newest', page: 2 },
    { search: 'best', ordering: 'rating', page: 1 },
    { category: 'indian', ordering: 'mostviewed', page: 1 },
  ];
  for (const t of targets) {
    try {
      const p = new URLSearchParams({ data: 'redtube.Videos.searchVideos', output: 'json', thumbsize: 'all', page: String(t.page || 1) });
      if (t.search) p.set('search', t.search);
      if (t.category) p.set('category', t.category);
      if (t.ordering) p.set('ordering', t.ordering);
      const res = await fetch(`${API}?${p}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(25000) });
      const data = await res.json();
      for (const it of data.videos || []) {
        const id = String(it.video?.video_id || it.video?.id || '').replace(/\D/g, '');
        if (id) ids.add(id);
      }
    } catch (e) { log('feed fail', e.message); }
    await sleep(300);
  }
  return [...ids];
}

function gitPull() {
  try {
    execSync('git fetch -q origin && git reset -q --hard origin/main', { cwd: ROOT, timeout: 60000 });
    return true;
  } catch (e) { log('git pull failed:', e.message); return false; }
}
function writeFiles(streams, thumbs, hd1080) {
  fs.writeFileSync(STREAMS_FILE, JSON.stringify(streams));
  fs.writeFileSync(THUMBS_FILE, JSON.stringify(thumbs));
  const hd = { ...hd1080 };
  for (const [id, e] of Object.entries(streams))
    if (e.qualities?.some(q => q.quality === '1080')) hd[id] = 1;
  fs.writeFileSync(HD1080_FILE, JSON.stringify(hd));
  return hd;
}
function push(msg, maps) {
  const tryPush = () => {
    const st = execSync('git status --porcelain public/streams.json public/thumbs.json public/hd1080.json', { cwd: ROOT, encoding: 'utf8' }).trim();
    if (!st) return 'clean';
    const out = execSync(
      `PYTHONPATH=/opt/muse/skills/custom-connector-setup/bin python3 ${GH} push --repo ${REPO} --message "${msg}" --dir ${ROOT} --auto public/streams.json public/thumbs.json public/hd1080.json`,
      { encoding: 'utf8', timeout: 180000 }
    );
    return out.trim().split('\n').pop();
  };
  try {
    const r = tryPush();
    if (r === 'clean') return false;
    log('push ok:', r);
    return true;
  } catch (e) {
    // Possibly a non-fast-forward (e.g. the hourly 1080p verifier pushed
    // mid-pass). Re-pull, re-merge hd1080 (never shrink), rewrite, retry once.
    log('push failed, re-pulling and retrying:', e.message.split('\n')[0]);
    try {
      gitPull();
      if (maps) {
        const freshHd = load(HD1080_FILE);
        for (const [id, v] of Object.entries(maps.hd1080 || {})) freshHd[id] = v;
        maps.hd1080 = freshHd;
        writeFiles(maps.streams, maps.thumbs, freshHd);
      }
      const r2 = tryPush();
      if (r2 === 'clean') return false;
      log('push ok (retry):', r2);
      return true;
    } catch (e2) { log('push FAILED twice:', e2.message.split('\n')[0]); return false; }
  }
}

async function pass() {
  gitPull();
  const now = Date.now();
  const streams = load(STREAMS_FILE);
  const thumbs = load(THUMBS_FILE);
  const hd1080 = load(HD1080_FILE);
  const catalog = load(CATALOG_FILE);

  // Newest catalog videos missing from streams (cap 300) — heals discovery gap.
  let addedNew = 0;
  try {
    const newest = Object.entries(catalog)
      .filter(([, v]) => v && v.added)
      .sort((a, b) => (b[1].added > a[1].added ? 1 : -1))
      .map(([k]) => String(k).replace(/\D/g, ''))
      .filter(id => id && !streams[id])
      .slice(0, 300);
    for (const id of newest) { streams[id] = { qualities: [], ts: 0 }; addedNew++; }
  } catch (e) { log('catalog newest fail', e.message); }

  const feed = await feedIds();
  for (const id of feed) if (!streams[id]) streams[id] = { qualities: [], ts: 0 };

  // Order: newest catalog videos present in streams first (most-clicked),
  // then everything else oldest-ts-first for even coverage.
  let catalogOrder = [];
  try {
    catalogOrder = Object.entries(catalog)
      .filter(([, v]) => v && v.added)
      .sort((a, b) => (b[1].added > a[1].added ? 1 : -1))
      .map(([k]) => String(k).replace(/\D/g, ''));
  } catch {}
  const inStreams = new Set(Object.keys(streams));
  const catalogSet = new Set(catalogOrder);
  const ordered = [
    ...catalogOrder.filter(id => inStreams.has(id)),
    ...Object.keys(streams)
      .filter(id => !catalogSet.has(id))
      .sort((a, b) => (streams[a]?.ts || 0) - (streams[b]?.ts || 0)),
  ];
  // de-dupe preserving first occurrence
  const seen = new Set();
  const ids = ordered.filter(id => (seen.has(id) ? false : (seen.add(id), true)));

  const maps = { streams, thumbs, hd1080 };
  let sNew = 0, sFail = 0, tNew = 0, tFail = 0, done = 0;
  let lastPush = Date.now();
  const maybePush = () => {
    if (Date.now() - lastPush > PUSH_EVERY_MS) {
      maps.hd1080 = writeFiles(streams, thumbs, maps.hd1080);
      push(`refresh loop: streams+thumbs (${Object.keys(streams).length} streams)`, maps);
      lastPush = Date.now();
    }
  };

  const queue = [...ids];
  await Promise.all(Array.from({ length: CONC }, async () => {
    while (queue.length) {
      const id = queue.shift();
      done++;
      try {
        const se = streams[id];
        const te = thumbs[id];
        const needS = !se?.qualities?.length || now - (se.ts || 0) > STREAM_REFRESH_MIN * 60 * 1000;
        const needT = !te?.url || now - (te.ts || 0) > THUMB_REFRESH_MIN * 60 * 1000;
        if (needS || needT) {
          const { thumb, qualities } = await resolveBoth(id);
          if (needS) {
            if (qualities) { streams[id] = { qualities, ts: Date.now() }; sNew++; }
            else sFail++;
          }
          if (needT) {
            if (thumb) { thumbs[id] = { url: thumb, ts: Date.now() }; tNew++; }
            else tFail++;
          }
        }
      } catch (e) { sFail++; }
      if (done % 50 === 0) maybePush();
    }
  }));

  // prune week-old entries
  for (const map of [thumbs, streams])
    for (const id of Object.keys(map))
      if (now - (map[id].ts || 0) > 7 * 24 * 3600 * 1000) delete map[id];

  maps.hd1080 = writeFiles(streams, thumbs, maps.hd1080);
  push(`refresh loop: streams+thumbs (${Object.keys(streams).length} streams)`, maps);
  log(`pass done: ids=${ids.length} streams +${sNew} fail:${sFail} | thumbs +${tNew} fail:${tFail} | newIds:${addedNew} | streamsTotal:${Object.keys(streams).length} hd1080:${Object.keys(maps.hd1080).length}`);
}

log(`refresh loop starting (pid ${process.pid})`);
for (;;) {
  try { await pass(); }
  catch (e) { log('pass FATAL:', e.message); }
  await sleep(30000);
}
