/**
 * XHUB media sync — resolves thumbnails AND direct stream URLs.
 *
 * Why this runs on the builder VM (not Vercel):
 *  - Redtube serves full video pages (with og:image + /media/mp4 tokens) to
 *    this VM, but serves Vercel's IPs a stripped 39KB bot-wall page.
 *  - /media/mp4 tokens are reusable across IPs; the resulting mp4 URLs work
 *    without Referer and are valid ~2h.
 *
 * Output (committed to the repo):
 *  - public/thumbs.json  { vkey: { url, ts } }
 *  - public/streams.json { vkey: { qualities: [{quality, url}], ts } }
 * Vercel routes /api/thumb and /api/stream read these maps; /api/stream
 * responses are short-cached, /api/thumb bytes are edge-cached 1yr.
 *
 * Usage: node scripts/sync-media.mjs [--push]
 *   --push  also pushes changed maps to GitHub via gh.py
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const THUMBS_FILE = path.join(ROOT, 'public', 'thumbs.json');
const STREAMS_FILE = path.join(ROOT, 'public', 'streams.json');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const API = 'https://api.redtube.com/';
const PUSH = process.argv.includes('--push');
const GH = '/home/hatch/workspace/skills/github/bin/gh.py';
const REPO = 'VikramMaurya6789/XHUB';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const load = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; } };

function extractOgImage(html) {
  const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  return m ? m[1].replace(/&amp;/g, '&') : null;
}

function extractMp4Token(html) {
  // Page embeds it with escaped slashes: \/media\/mp4?s=<token>
  const m = html.match(/(?:\\?\/)media(?:\\?\/)mp4\?s=([A-Za-z0-9+/=_-]+)/);
  return m ? '/media/mp4?s=' + m[1] : null;
}

async function fetchPage(id) {
  // Try curl first (most reliable TLS fingerprint), then node fetch.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const html = execSync(
        `curl -sL --max-time 25 -A "${UA}" -H "Referer: https://www.google.com/" "https://www.redtube.com/${id}"`,
        { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 30000 }
      );
      if (html && html.length > 100000) return html;
    } catch {}
    try {
      const res = await fetch(`https://www.redtube.com/${id}`, {
        headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9', 'Referer': 'https://www.google.com/' },
        redirect: 'follow', signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        const html = await res.text();
        if (html.length > 100000) return html;
      }
    } catch {}
    await sleep(2000 * (attempt + 1));
  }
  return null;
}

async function resolveThumb(id) {
  const html = await fetchPage(id);
  return html ? extractOgImage(html) : null;
}

async function resolveStreams(id) {
  const html = await fetchPage(id);
  if (!html) return null;
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
    const qualities = list
      .filter(q => q.videoUrl && q.quality)
      .map(q => ({ quality: String(q.quality), url: q.videoUrl.replace(/\\/g, '') }));
    return qualities.length ? qualities : null;
  } catch { return null; }
}

async function feedIds() {
  const ids = new Set();
  const targets = [
    { search: 'hot', ordering: 'mostviewed', page: 1 }, { search: 'hot', ordering: 'mostviewed', page: 2 },
    { ordering: 'newest', page: 1 },
    { search: 'popular', ordering: 'rating', page: 1 },
    { search: 'best', ordering: 'rating', page: 1 },
    { category: 'indian', ordering: 'mostviewed', page: 1 }, { category: 'indian', ordering: 'mostviewed', page: 2 },
    { search: 'short vertical', ordering: 'mostviewed', page: 1 },
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
    } catch (e) { console.error('feed fail', e.message); }
    await sleep(400);
  }
  return [...ids];
}

async function main() {
  const thumbs = load(THUMBS_FILE);
  const streams = load(STREAMS_FILE);
  const now = Date.now();
  const ids = await feedIds();
  console.log(`feed videos: ${ids.length}`);

  let tNew = 0, sNew = 0, tFail = 0, sFail = 0;
  for (const id of ids) {
    // thumbs (refresh >40min old; pix-cdn77 validto ~1h)
    const te = thumbs[id];
    if (!te?.url || now - (te.ts || 0) > 40 * 60 * 1000) {
      const url = await resolveThumb(id);
      if (url) { thumbs[id] = { url, ts: now }; tNew++; }
      else tFail++;
      await sleep(500);
    }
    // streams (refresh >90min old; mp4 validto ~2h)
    const se = streams[id];
    if (!se?.qualities || now - (se.ts || 0) > 90 * 60 * 1000) {
      const qualities = await resolveStreams(id);
      if (qualities) { streams[id] = { qualities, ts: now }; sNew++; }
      else sFail++;
      await sleep(500);
    }
  }
  // prune week-old entries
  for (const [map, name] of [[thumbs, 'thumbs'], [streams, 'streams']]) {
    for (const id of Object.keys(map)) {
      if (now - (map[id].ts || 0) > 7 * 24 * 3600 * 1000) delete map[id];
    }
  }

  fs.writeFileSync(THUMBS_FILE, JSON.stringify(thumbs));
  fs.writeFileSync(STREAMS_FILE, JSON.stringify(streams));
  console.log(`thumbs: +${tNew} fail:${tFail} total:${Object.keys(thumbs).length}`);
  console.log(`streams: +${sNew} fail:${sFail} total:${Object.keys(streams).length}`);

  if (PUSH) {
    const st = execSync('git status --porcelain public/thumbs.json public/streams.json', { cwd: ROOT, encoding: 'utf8' }).trim();
    if (!st) { console.log('no changes to push'); return; }
    const out = execSync(
      `python3 ${GH} push --repo ${REPO} --message "media sync: thumbs+streams (${Object.keys(streams).length} streams)" --dir ${ROOT} --auto`,
      { encoding: 'utf8', timeout: 120000 }
    );
    console.log(out.trim());
  }
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
