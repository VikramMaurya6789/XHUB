/**
 * XHUB 1080p verifier — checks catalog videos for 1080p and publishes them.
 * Runs continuously: picks unverified catalog videos, checks 1080p via page fetch,
 * resolves full streams for 1080p ones, updates streams.json + hd1080.json, pushes.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CATALOG_FILE = path.join(ROOT, 'public', 'catalog.json');
const STREAMS_FILE = path.join(ROOT, 'public', 'streams.json');
const HD1080_FILE = path.join(ROOT, 'public', 'hd1080.json');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36';
const CONCURRENCY = 8;
const BATCH = 200; // videos per run
const sleep = ms => new Promise(r => setTimeout(r, ms));
const load = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; } };

function curlPage(url) {
  try {
    return execSync(
      `curl -s --compressed --max-time 35 -A "${UA}" -e "https://www.redtube.com/" "${url}"`,
      { maxBuffer: 8 * 1024 * 1024, encoding: 'utf8', timeout: 40000 }
    );
  } catch { return ''; }
}

function extractMp4Token(html) {
  // Page embeds it with escaped slashes: \/media\/mp4?s=<token>
  const m = html.match(/(?:\\?\/)media(?:\\?\/)mp4\?s=([A-Za-z0-9+/=_-]+)/);
  return m ? '/media/mp4?s=' + m[1] : null;
}

function extractToken(html) {
  const m = html.match(/(?:\\?\/)media(?:\\?\/)mp4\?s=([A-Za-z0-9+/=_-]+)/);
  return m ? m[1] : null;
}

async function resolveStreams(id) {
  // Reuse sync-media's approach via curl fallback
  try {
    const pageUrl = `https://www.redtube.com/${id}`;
    const html = curlPage(pageUrl);
    if (!html || html.length < 50000) return null;
    const tokenPath = extractMp4Token(html);
    if (!tokenPath) return null;
    const mj = curlPage(`https://www.redtube.com${tokenPath}`);
    if (!mj) return null;
    const qualities = [];
    const re = /"quality"\s*:\s*"?(\d+)"?[^}]*?"videoUrl"\s*:\s*"([^"]+)"/g;
    let m;
    while ((m = re.exec(mj)) !== null) {
      qualities.push({ quality: m[1], url: m[2].replace(/\\\//g, '/') });
    }
    // fallback pattern
    if (!qualities.length) {
      const re2 = /"(1080|720|480|240)"\s*:\s*"([^"]+\.mp4[^"]*)"/g;
      while ((m = re2.exec(mj)) !== null) {
        qualities.push({ quality: m[1], url: m[2].replace(/\\\//g, '/') });
      }
    }
    return qualities.length ? qualities : null;
  } catch { return null; }
}

async function checkAndResolve(id, meta) {
  // Go straight to token + /media/mp4 JSON (page HTML doesn't contain quality info).
  const qualities = await resolveStreams(id);
  if (!qualities) return { id, ok: false };
  const has1080q = qualities.some(q => q.quality === '1080');
  return { id, ok: has1080q, qualities: has1080q ? qualities : null };
}

async function main() {
  const catalog = load(CATALOG_FILE);
  const streams = load(STREAMS_FILE);
  const hd1080 = load(HD1080_FILE);
  // Prioritize popular videos (higher views = more likely to have 1080p)
  const ids = Object.keys(catalog)
    .filter(id => !hd1080[id] && !streams[id])
    .sort((a, b) => (catalog[b].views || 0) - (catalog[a].views || 0));

  console.log(`catalog: ${Object.keys(catalog).length}, unverified: ${ids.length}, hd1080: ${Object.keys(hd1080).length}`);

  if (!ids.length) {
    console.log('nothing to verify');
    return;
  }

  const batch = ids.slice(0, BATCH);
  let verified = 0;
  let checked = 0;

  // Process in parallel chunks
  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    const chunk = batch.slice(i, i + CONCURRENCY);
    const results = await Promise.all(chunk.map(id => checkAndResolve(id, catalog[id])));

    for (const r of results) {
      checked++;
      if (r.ok && r.qualities) {
        streams[r.id] = { ts: Date.now(), qualities: r.qualities };
        if (r.qualities.some(q => q.quality === '1080')) {
          hd1080[r.id] = 1;
          verified++;
        }
      }
    }
    console.log(`progress: ${checked}/${batch.length}, verified 1080p: ${verified}`);
    // Save incrementally (don't lose progress on timeout)
    fs.writeFileSync(STREAMS_FILE, JSON.stringify(streams));
    fs.writeFileSync(HD1080_FILE, JSON.stringify(hd1080));
    await sleep(500);
  }

  console.log(`DONE: checked ${checked}, new 1080p: ${verified}, total hd1080: ${Object.keys(hd1080).length}`);

  // Push if we added new 1080p videos.
  // NOTE: gh.py builds the remote commit directly via the GitHub API from the
  // files' disk content — do NOT `git commit` first (a local commit makes
  // `git status` clean so `gh.py push --auto` silently skips, and the
  // refresh loop's `git reset --hard origin/main` would then wipe the local
  // commit). Push explicit file paths (no --auto) so unrelated working-tree
  // deletions can't 422 the tree call.
  if (verified > 0) {
    try {
      const out = execSync(
        `PYTHONPATH=/opt/muse/skills/custom-connector-setup/bin python3 /home/hatch/workspace/custom-connectors/custom.legacy-github/bin/gh.py push --repo VikramMaurya6789/XHUB --message "verify: +${verified} 1080p videos" --dir ${ROOT} public/streams.json public/hd1080.json`,
        { timeout: 120000, encoding: 'utf8' }
      );
      console.log('push result:', out.trim().split('\n').slice(-2).join(' | '));
    } catch (e) {
      console.log('push failed:', e.message.slice(0, 200));
    }
  }
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
