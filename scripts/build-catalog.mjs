/**
 * XHUB Catalog Builder — builds a 50,000+ video catalog from Redtube API.
 * Fast metadata-only collection (no page scraping). Run in background.
 * Output: public/catalog.json { vkey: {title, durationSec, views, thumb, ...} }
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CATALOG_FILE = path.join(ROOT, 'public', 'catalog.json');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36';
const API = 'https://api.redtube.com/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const load = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; } };

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
  const catalog = load(CATALOG_FILE);
  console.log(`starting catalog: ${Object.keys(catalog).length} videos`);

  let added = 0;
  for (const term of TERMS) {
    for (const ordering of ['mostviewed', 'rating']) {
      for (let page = 1; page <= 8; page++) {
        const videos = await fetchTermPage(term, page, ordering);
        if (!videos.length) break;
        for (const item of videos) {
          const v = item.video || {};
          const id = String(v.video_id || '').replace(/\D/g, '');
          if (!id || catalog[id]) continue;
          const dur = parseDur(v.duration);
          if (dur < 600) continue; // 10min+ only
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
          added++;
        }
        await sleep(300);
        if (Object.keys(catalog).length >= 55000) break;
      }
      if (Object.keys(catalog).length >= 55000) break;
    }
    if (Object.keys(catalog).length >= 55000) break;
    console.log(`term "${term}" done, catalog: ${Object.keys(catalog).length} (+${added})`);
    if (added % 500 === 0) {
      fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog));
    }
  }

  fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog));
  console.log(`DONE: ${Object.keys(catalog).length} videos in catalog`);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
