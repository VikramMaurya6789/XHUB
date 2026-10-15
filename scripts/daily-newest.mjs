/**
 * Daily newest-video collector: fetches ordering=newest for all terms,
 * merges into catalog.json (with publish dates), refreshes streams for
 * newly added videos, and pushes to GitHub.
 *
 * Usage: node scripts/daily-newest.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36';
const API = 'https://api.redtube.com/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

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
  const catalogPath = path.join(ROOT, 'public', 'catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const before = Object.keys(catalog).length;
  const newVkeys = [];

  for (const term of TERMS) {
    for (let page = 1; page <= 4; page++) {
      const videos = await fetchPage(term, page);
      if (!videos.length) break;
      for (const item of videos) {
        const v = item.video || {};
        const id = String(v.video_id || '').replace(/\D/g, '');
        if (!id) continue;
        const dur = parseDur(v.duration);
        if (dur < 600) continue;
        const pd = v.publish_date || '';
        const year = parseInt(pd.slice(0, 4), 10);
        if (pd && year < 2025) continue;
        if (!catalog[id]) {
          catalog[id] = {
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
          newVkeys.push(id);
        } else if (pd && !catalog[id].added) {
          catalog[id].added = pd;
        }
      }
      await sleep(200);
    }
  }

  fs.writeFileSync(catalogPath, JSON.stringify(catalog));
  console.log(`Catalog: ${before} -> ${Object.keys(catalog).length} (+${newVkeys.length} new)`);

  // Refresh streams for the newly added videos (so they play immediately)
  if (newVkeys.length) {
    const batchFile = '/tmp/daily-newest-vkeys.txt';
    fs.writeFileSync(batchFile, newVkeys.join('\n'));
    const outFile = '/tmp/daily-newest-streams.json';
    console.log(`Refreshing streams for ${newVkeys.length} new videos...`);
    execSync(`node ${path.join(__dirname, 'refresh-batch-safe.mjs')} ${batchFile} ${outFile}`, {
      cwd: ROOT, stdio: 'inherit', timeout: 30 * 60 * 1000,
    });
    const newStreams = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    const streamsPath = path.join(ROOT, 'public', 'streams.json');
    const streams = JSON.parse(fs.readFileSync(streamsPath, 'utf8'));
    let addedStreams = 0;
    for (const [vk, data] of Object.entries(newStreams)) {
      streams[vk] = data;
      addedStreams++;
    }
    fs.writeFileSync(streamsPath, JSON.stringify(streams));
    console.log(`Streams refreshed: +${addedStreams}`);
  }

  // Push to GitHub (gh.py needs PYTHONPATH: its hard-coded sys.path no longer exists)
  console.log('Pushing to GitHub...');
  execSync(
    `PYTHONPATH=/opt/muse/skills/custom-connector-setup/bin python3 /home/hatch/workspace/skills/github/bin/gh.py push --repo VikramMaurya6789/XHUB --message "Daily newest videos" --dir ${ROOT} --auto`,
    { cwd: ROOT, stdio: 'inherit', timeout: 10 * 60 * 1000 }
  );
  console.log('DONE: daily newest collection complete');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
