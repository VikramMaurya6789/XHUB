/**
 * XHUB Thumbnail Sync Engine (A1)
 *
 * Runs locally or as a cron job to resolve working thumbnails from Redtube page HTML.
 * Redtube's API returns dead CDN links (410 Gone), but the page og:image works when
 * fetched with a Referer header.
 *
 * Fetches hot, new, trending, and indian video feeds (pages 1-2), resolves og:image,
 * prunes entries older than 7 days, skips entries resolved < 40 mins ago, and writes
 * public/thumbs.json.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const THUMBS_FILE = path.join(ROOT_DIR, 'public', 'thumbs.json');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const REDTUBE_API = 'https://api.redtube.com/';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const FORTY_MINS_MS = 40 * 60 * 1000;

function extractOgImage(html) {
  if (!html) return null;
  // 1. og:image property
  const m1 = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (m1 && m1[1] && m1[1].startsWith('http')) return m1[1].replace(/&amp;/g, '&');

  const m2 = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (m2 && m2[1] && m2[1].startsWith('http')) return m2[1].replace(/&amp;/g, '&');

  // 2. JSON-LD thumbnailUrl
  const m3 = html.match(/"thumbnailUrl"\s*:\s*"([^"]+)"/i);
  if (m3 && m3[1]) return m3[1].replace(/\\\//g, '/').replace(/&amp;/g, '&');

  // 3. rdtcdn poster / image pattern
  const m4 = html.match(/https?:\/\/[a-z0-9.-]*rdtcdn\.com\/[^"'\\\s]+\.(?:jpg|jpeg|png|webp)/i);
  if (m4 && m4[0]) return m4[0].replace(/&amp;/g, '&');

  return null;
}

async function fetchVideoIdsFromFeed(category = '', page = 1) {
  const url = `${REDTUBE_API}?data=redtube.Videos.searchVideos&output=json&thumbsize=all&page=${page}${category ? `&category=${encodeURIComponent(category)}` : ''}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const videos = data?.videos || [];
    return videos
      .map(item => item?.video?.video_id || item?.video?.id)
      .filter(Boolean)
      .map(String);
  } catch (e) {
    console.error(`Failed to fetch feed category=${category} page=${page}:`, e.message);
    return [];
  }
}

async function resolveVideoThumb(id) {
  const mirrors = [
    `https://www.redtube.net/${id}`,
    `https://www.redtube.com/${id}`,
  ];

  for (const pageUrl of mirrors) {
    try {
      const res = await fetch(pageUrl, {
        headers: {
          'User-Agent': UA,
          'Accept': 'text/html,application/xhtml+xml',
          'Referer': 'https://www.google.com/',
        },
        redirect: 'follow',
      });
      if (!res.ok) continue;
      const html = await res.text();
      const img = extractOgImage(html);
      if (img) return img;
    } catch (e) {
      // try next mirror
    }
  }
  return null;
}

async function main() {
  console.log('--- Starting XHUB Thumbnail Sync ---');

  // Ensure public directory exists
  const publicDir = path.dirname(THUMBS_FILE);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Load existing thumbs.json
  let map = {};
  if (fs.existsSync(THUMBS_FILE)) {
    try {
      map = JSON.parse(fs.readFileSync(THUMBS_FILE, 'utf8'));
    } catch {
      map = {};
    }
  }

  const now = Date.now();

  // Prune entries older than 7 days
  let pruned = 0;
  for (const [id, item] of Object.entries(map)) {
    const ts = typeof item === 'object' && item?.ts ? item.ts : 0;
    if (now - ts > SEVEN_DAYS_MS) {
      delete map[id];
      pruned++;
    }
  }
  if (pruned > 0) {
    console.log(`Pruned ${pruned} stale entries (> 7 days old)`);
  }

  // Collect video IDs from feeds (hot, new, trending, indian - pages 1 and 2)
  const feedCategories = [
    { cat: '', pages: [1, 2] },             // hot / featured
    { cat: 'Amateur', pages: [1, 2] },       // trending / amateur
    { cat: 'indian', pages: [1, 2] },        // indian section
    { cat: 'Blowjob', pages: [1] },
    { cat: 'MILF', pages: [1] },
    { cat: 'Teen', pages: [1] },
    { cat: 'Asian', pages: [1] },
    { cat: 'Hardcore', pages: [1] },
  ];

  const allIds = new Set();
  for (const { cat, pages } of feedCategories) {
    for (const page of pages) {
      const ids = await fetchVideoIdsFromFeed(cat, page);
      ids.forEach(id => allIds.add(id));
    }
  }

  console.log(`Found ${allIds.size} unique video IDs across target feeds`);

  let resolved = 0;
  let skipped = 0;
  let failed = 0;

  for (const id of allIds) {
    const existing = map[id];
    const ts = typeof existing === 'object' && existing?.ts ? existing.ts : 0;

    // Skip re-resolving URLs younger than 40 mins
    if (existing && existing.url && (now - ts < FORTY_MINS_MS)) {
      skipped++;
      continue;
    }

    const imgUrl = await resolveVideoThumb(id);
    if (imgUrl) {
      map[id] = { url: imgUrl, ts: now };
      resolved++;
      console.log(`✓ Resolved [${id}] -> ${imgUrl.slice(0, 60)}...`);
    } else {
      failed++;
      console.log(`✗ Could not resolve [${id}]`);
    }

    // Gentle pacing to avoid burst rate limits
    await new Promise(r => setTimeout(r, 100));
  }

  fs.writeFileSync(THUMBS_FILE, JSON.stringify(map, null, 2), 'utf8');
  console.log(`=== Finished: ${resolved} resolved, ${skipped} skipped, ${failed} failed. Total mapped: ${Object.keys(map).length} ===`);
}

main().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
