/**
 * Backfill publish dates for catalog videos missing them.
 * Usage: node scripts/backfill-dates.mjs <vkeysFile> <outFile>
 * Uses redtube.Videos.getVideoById with concurrency 4.
 */
import fs from 'fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36';
const API = 'https://api.redtube.com/';
const CONC = 4;

const vkeys = fs.readFileSync(process.argv[2], 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const outFile = process.argv[3];

async function fetchDate(vk) {
  try {
    const params = new URLSearchParams({
      data: 'redtube.Videos.getVideoById', output: 'json',
      video_id: vk, thumbsize: 'none',
    });
    const res = await fetch(`${API}?${params}`, {
      headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const v = data.video || {};
    return v.publish_date || null;
  } catch { return null; }
}

async function main() {
  const out = {};
  let done = 0, ok = 0;
  let idx = 0;

  async function worker() {
    while (idx < vkeys.length) {
      const i = idx++;
      const vk = vkeys[i];
      const pd = await fetchDate(vk);
      if (pd) { out[vk] = pd; ok++; }
      done++;
      if (done % 100 === 0) console.log(`Progress: ${done}/${vkeys.length} (ok: ${ok})`);
    }
  }

  await Promise.all(Array.from({ length: CONC }, worker));
  fs.writeFileSync(outFile, JSON.stringify(out));
  console.log(`DONE: ${ok}/${vkeys.length} dates saved to ${outFile}`);
}

main();
