/**
 * Sharded catalog builder — collects video metadata for a subset of terms.
 * Usage: node scripts/build-catalog-shard.mjs <shard> <totalShards>
 * Each shard writes to its own file, merged by the coordinator.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36';
const API = 'https://api.redtube.com/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const SHARD = parseInt(process.argv[2] || '0', 10);
const TOTAL = parseInt(process.argv[3] || '4', 10);
const OUT = path.join(ROOT, 'public', `catalog-shard-${SHARD}.json`);

const TERMS = [
  'amateur', 'milf', 'teen', 'anal', 'blowjob', 'hardcore', 'lesbian', 'threesome',
  'big tits', 'big ass', 'brunette', 'blonde', 'pov', 'massage', 'casting',
  'indian', 'desi', 'asian', 'latina', 'ebony', 'japanese', 'arab',
  'stepmom', 'stepsister', 'stepbrother', 'homemade', 'wife', 'cheating',
  '4k', 'hd', 'public', 'outdoor', 'office', 'hotel',
  'cumshot', 'creampie', 'squirt', 'deepthroat',
  'bbw', 'mature', 'interracial', 'solo', 'toys', 'lingerie',
  'college', 'teacher', 'nurse', 'secretary', 'neighbor',
  'double penetration', 'gangbang', 'orgy', 'swinger',
  'redhead', 'tattoo', 'piercing', 'shaved', 'hairy',
  'doggystyle', 'cowgirl', 'missionary', '69',
  'indian bhabhi', 'desi bhabhi', 'tamil', 'telugu', 'punjabi', 'mallu',
  'hindi audio', 'indian wife', 'indian teen', 'desi teen',
];

const load = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; } };

function parseDur(s) {
  if (!s) return 0;
  const p = String(s).split(':').map(x => parseInt(x, 10) || 0);
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  if (p.length === 2) return p[0] * 60 + p[1];
  return p[0] || 0;
}

async function fetchTermPage(term, page, ordering = 'mostviewed') {
  try {
    const params = new URLSearchParams({
      data: 'redtube.Videos.searchVideos', output: 'json',
      search: term, page: String(page), thumbsize: 'all', ordering,
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
  const myTerms = TERMS.filter((_, i) => i % TOTAL === SHARD);
  let catalog = load(OUT);
  console.log(`shard ${SHARD}/${TOTAL}: ${myTerms.length} terms, starting with ${Object.keys(catalog).length} videos`);

  for (const term of myTerms) {
    for (const ordering of ['mostviewed', 'rating']) {
      for (let page = 1; page <= 8; page++) {
        const videos = await fetchTermPage(term, page, ordering);
        if (!videos.length) break;
        for (const item of videos) {
          const v = item.video || {};
          const id = String(v.video_id || '').replace(/\D/g, '');
          if (!id || catalog[id]) continue;
          const dur = parseDur(v.duration);
          if (dur < 600) continue;
          catalog[id] = {
            title: v.title || 'Video',
            durationSec: dur,
            duration: v.duration || '',
            views: parseInt(v.views, 10) || 0,
            rating: Math.round(parseFloat(v.rating) || 0),
            thumb: v.thumb || '',
            url: v.url || '',
            added: v.added || '',
            term,
          };
        }
        fs.writeFileSync(OUT, JSON.stringify(catalog));
        await sleep(300);
      }
    }
    console.log(`shard ${SHARD}: term "${term}" done, total: ${Object.keys(catalog).length}`);
  }

  fs.writeFileSync(OUT, JSON.stringify(catalog));
  console.log(`shard ${SHARD} DONE: ${Object.keys(catalog).length} videos`);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
