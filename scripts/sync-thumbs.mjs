/**
 * XHUB Thumbnail Sync Engine (A1)
 *
 * Resolves working 1280x720 og:image thumbnails from Redtube page HTML.
 * Matches exact feeds fetched by getFeed() on the live site.
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

async function fetchVideoIdsFromFeed({ search = '', category = '', ordering = '', page = 1 } = {}) {
  const params = new URLSearchParams({
    data: 'redtube.Videos.searchVideos',
    output: 'json',
    thumbsize: 'all',
    page: String(page),
  });
  if (search) params.set('search', search);
  if (category) params.set('category', category);
  if (ordering) params.set('ordering', ordering);

  try {
    const res = await fetch(`${REDTUBE_API}?${params.toString()}`, {
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
    console.error(`Failed to fetch feed:`, e.message);
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
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      const img = extractOgImage(html);
      if (img) return img;
    } catch (e) {
      // try next mirror
    }
  }

  // Fallback to Redtube official API if page scrape fails
  try {
    const apiRes = await fetch(`https://api.redtube.com/?data=redtube.Videos.getVideoById&output=json&video_id=${id}&thumbsize=all`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(5000),
    });
    if (apiRes.ok) {
      const data = await apiRes.json();
      const v = data?.video;
      if (v) {
        if (Array.isArray(v.thumbs) && v.thumbs.length > 0) {
          const big = v.thumbs.find(t => t.size === 'big');
          const med2 = v.thumbs.find(t => t.size === 'medium2');
          const med1 = v.thumbs.find(t => t.size === 'medium1');
          const s = (big || med2 || med1 || v.thumbs[0])?.src;
          if (s) return s;
        }
        if (v.default_thumb && v.default_thumb.startsWith('http')) {
          return v.default_thumb;
        }
      }
    }
  } catch {}

  return null;
}

async function main() {
  console.log('--- Starting XHUB Thumbnail Sync ---');

  const publicDir = path.dirname(THUMBS_FILE);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

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

  // Exact target feeds matching getFeed() on the live site
  const feedTargets = [
    // Hot feed (matching getFeed('hot'))
    { search: 'hot', ordering: 'mostviewed', pages: [1, 2] },
    // Trending feed (matching getFeed('trending'))
    { search: 'popular', ordering: 'rating', pages: [1, 2] },
    // Best feed (matching getFeed('best'))
    { search: 'best', ordering: 'rating', pages: [1, 2] },
    // New feed (matching getFeed('new'))
    { ordering: 'newest', pages: [1, 2] },
    // Indian section (matching getFeed('indian'))
    { category: 'indian', ordering: 'mostviewed', pages: [1, 2, 3] },
    // Shorts
    { search: 'short vertical', ordering: 'mostviewed', pages: [1] },
    // Core categories
    { category: 'Amateur', ordering: 'mostviewed', pages: [1] },
    { category: 'MILF', ordering: 'mostviewed', pages: [1] },
    { category: 'Blowjob', ordering: 'mostviewed', pages: [1] },
    { category: 'Anal', ordering: 'mostviewed', pages: [1] },
    { category: 'Asian', ordering: 'mostviewed', pages: [1] },
  ];

  const allIds = new Set();
  for (const target of feedTargets) {
    for (const page of target.pages) {
      const ids = await fetchVideoIdsFromFeed({ ...target, page });
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
      if (resolved % 15 === 0) {
        fs.writeFileSync(THUMBS_FILE, JSON.stringify(map, null, 2), 'utf8');
      }
    } else {
      failed++;
      console.log(`✗ Could not resolve [${id}]`);
    }

    await new Promise(r => setTimeout(r, 80));
  }

  fs.writeFileSync(THUMBS_FILE, JSON.stringify(map, null, 2), 'utf8');
  console.log(`=== Finished: ${resolved} resolved, ${skipped} skipped, ${failed} failed. Total mapped: ${Object.keys(map).length} ===`);
}

main().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
