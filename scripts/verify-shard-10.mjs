/**
 * Shard verifier — verifies 1080p for a slice of the catalog.
 * Usage: node scripts/verify-shard.mjs <shard> <totalShards>
 * Writes: /tmp/verify-shard-<shard>.json { verified: {id: qualities}, checked: N }
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
const CONCURRENCY = 6;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const load = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; } };

const SHARD = parseInt(process.argv[2] || '0', 10);
const TOTAL = parseInt(process.argv[3] || '4', 10);
const OUT = `/tmp/verify-shard-10-${SHARD}.json`;

function curlPage(url) {
  try {
    return execSync(
      `curl -s --compressed --max-time 35 -A "${UA}" -e "https://www.redtube.com/" "${url}"`,
      { maxBuffer: 8 * 1024 * 1024, encoding: 'utf8', timeout: 40000 }
    );
  } catch { return ''; }
}

function extractMp4Token(html) {
  const m = html.match(/(?:\\?\/)media(?:\\?\/)mp4\?s=([A-Za-z0-9+/=_-]+)/);
  return m ? '/media/mp4?s=' + m[1] : null;
}

async function resolveStreams(id) {
  try {
    const html = curlPage(`https://www.redtube.com/${id}`);
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
    return qualities.length ? qualities : null;
  } catch { return null; }
}

async function main() {
  const catalog = load(CATALOG_FILE);
  const streams = load(STREAMS_FILE);
  const hd1080 = load(HD1080_FILE);

  const allIds = Object.keys(catalog)
    .filter(id => !hd1080[id] && !streams[id])
    .sort((a, b) => (catalog[b].views || 0) - (catalog[a].views || 0));

  // Shard by index
  const myIds = allIds.filter((_, i) => i % TOTAL === SHARD);
  console.log(`shard ${SHARD}/${TOTAL}: ${myIds.length} videos to check`);

  const verified = {};
  let checked = 0;

  for (let i = 0; i < myIds.length; i += CONCURRENCY) {
    const chunk = myIds.slice(i, i + CONCURRENCY);
    const results = await Promise.all(chunk.map(async id => {
      const q = await resolveStreams(id);
      if (!q) return null;
      if (!q.some(x => x.quality === '1080')) return null;
      return { id, q };
    }));
    for (const r of results) {
      checked++;
      if (r) verified[r.id] = r.q;
    }
    // Save progress incrementally
    fs.writeFileSync(OUT, JSON.stringify({ verified, checked, total: myIds.length }));
    if (checked % 48 === 0) console.log(`shard ${SHARD}: ${checked}/${myIds.length}, verified: ${Object.keys(verified).length}`);
    await sleep(400);
  }

  fs.writeFileSync(OUT, JSON.stringify({ verified, checked, total: myIds.length, done: true }));
  console.log(`shard ${SHARD} DONE: ${Object.keys(verified).length} verified out of ${checked}`);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
