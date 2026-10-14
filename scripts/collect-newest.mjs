/**
 * Collect NEWEST videos from Redtube API (ordering=newest) for recent uploads.
 * Usage: node scripts/collect-newest.mjs <termsFile> <outFile>
 * Stores publish_date in `added` field so feeds can sort by recency.
 */
import fs from 'fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36';
const API = 'https://api.redtube.com/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const termsFile = process.argv[2];
const outFile = process.argv[3];
const terms = fs.readFileSync(termsFile, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);

function parseDur(s) {
  if (!s) return 0;
  const p = String(s).split(':').map(x => parseInt(x, 10) || 0);
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  if (p.length === 2) return p[0] * 60 + p[1];
  return p[0] || 0;
}

async function fetchPage(term, page) {
  try {
    const params = new URLSearchParams({
      data: 'redtube.Videos.searchVideos', output: 'json',
      search: term, page: String(page), thumbsize: 'all', ordering: 'newest',
    });
    const res = await fetch(`${API}?${params}`, {
      headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.videos || [];
  } catch { return []; }
}

async function main() {
  let out = {};
  let added = 0;
  for (const term of terms) {
    for (let page = 1; page <= 8; page++) {
      const videos = await fetchPage(term, page);
      if (!videos.length) break;
      for (const item of videos) {
        const v = item.video || {};
        const id = String(v.video_id || '').replace(/\D/g, '');
        if (!id || out[id]) continue;
        const dur = parseDur(v.duration);
        if (dur < 600) continue;
        // Only keep 2025+ uploads
        const pd = v.publish_date || '';
        const year = parseInt(pd.slice(0, 4), 10);
        if (pd && year < 2025) continue;
        out[id] = {
          title: v.title || 'Video',
          durationSec: dur,
          duration: v.duration || '',
          views: parseInt(v.views, 10) || 0,
          rating: Math.round(parseFloat(v.rating) || 0),
          thumb: v.thumb || '',
          url: v.url || '',
          added: pd,
          term,
          newest: true,
        };
        added++;
      }
      await sleep(250);
    }
    fs.writeFileSync(outFile, JSON.stringify(out));
    console.log(`term "${term}" done, collected: ${added}`);
  }
  fs.writeFileSync(outFile, JSON.stringify(out));
  console.log(`DONE: ${added} newest videos saved to ${outFile}`);
}

main();
