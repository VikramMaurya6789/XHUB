/** One-off: refresh streams for the CURRENT site feed's newest videos.
 * The 30-min sync was refreshing stale-API-search videos, not the newest
 * catalog videos users actually click. This targets the live /api/feed vkeys.
 */
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
const execFileAsync = promisify(execFile);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const STREAMS_FILE = '/home/hatch/workspace/xhub-sync/public/streams.json';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function extractMp4Token(html) {
  const m = html.match(/media\\\/mp4\?s=([A-Za-z0-9+/=_-]+)/);
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
    await sleep(2000 * (attempt + 1));
  }
  return null;
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

const ids = process.argv[2].split(' ');
const streams = JSON.parse(fs.readFileSync(STREAMS_FILE, 'utf8'));
const now = Date.now();
let ok = 0, fail = 0;
const CONC = 8;
const queue = [...ids];
await Promise.all(Array.from({ length: CONC }, async () => {
  while (queue.length) {
    const id = queue.shift();
    try {
      const q = await resolveStreams(id);
      if (q) { streams[id] = { qualities: q, ts: now }; ok++; }
      else { fail++; }
    } catch { fail++; }
    process.stdout.write(`\r${ok + fail}/${ids.length} ok:${ok} fail:${fail}`);
  }
}));
console.log('');
fs.writeFileSync(STREAMS_FILE, JSON.stringify(streams));
console.log(`done. streams total: ${Object.keys(streams).length}`);
