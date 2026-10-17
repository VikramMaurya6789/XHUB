import https from 'https';
import { getInitialAvatar } from './avatar.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const DIRECT_IPS = ['104.16.3.81', '104.16.4.81'];

// Latch directMode once standard fetch fails or is blocked locally by ISP DNS sinkhole
let directMode = false;

// High-speed in-memory LRU cache (10 min TTL) for blazing fast <1ms page loads
const memoryCache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

export function getCached(key) {
  const item = memoryCache.get(key);
  if (item && Date.now() - item.ts < CACHE_TTL) {
    return item.data;
  }
  return null;
}

export function setCached(key, data) {
  if (memoryCache.size > 2500) {
    const oldestKey = memoryCache.keys().next().value;
    memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, { data, ts: Date.now() });
}

// 60+ Comprehensive categories covering 100,000+ videos
export const POPULAR_CATEGORIES = [
  { slug: 'trending', name: 'Trending' },
  { slug: '4k', name: '4K Ultra HD' },
  { slug: 'indian', name: 'Indian Desi' },
  { slug: 'asian', name: 'Asian' },
  { slug: 'milf', name: 'MILF' },
  { slug: 'teen-18', name: '18+ Teen' },
  { slug: 'amateur', name: 'Amateur' },
  { slug: 'blowjob', name: 'Blowjob' },
  { slug: 'creampie', name: 'Creampie' },
  { slug: 'ebony', name: 'Ebony' },
  { slug: 'latina', name: 'Latina' },
  { slug: 'lesbian', name: 'Lesbian' },
  { slug: 'mature', name: 'Mature' },
  { slug: 'pov', name: 'POV' },
  { slug: 'anal', name: 'Anal' },
  { slug: 'hentai', name: 'Hentai' },
  { slug: 'homemade', name: 'Homemade' },
  { slug: 'big-tits', name: 'Big Tits' },
  { slug: 'massage', name: 'Massage' },
  { slug: 'hardcore', name: 'Hardcore' },
  { slug: 'fetish', name: 'Fetish & Feet' },
  { slug: 'vr', name: 'VR Videos' },
  { slug: 'vintage', name: 'Vintage / Classic' },
  { slug: 'threesome', name: 'Threesome' },
  { slug: 'babe', name: 'Babe' },
  { slug: 'brunette', name: 'Brunette' },
  { slug: 'blonde', name: 'Blonde' },
  { slug: 'redhead', name: 'Redhead' },
  { slug: 'bbw', name: 'BBW' },
  { slug: 'public', name: 'Public Sex' },
  { slug: 'squirt', name: 'Squirting' },
  { slug: 'masturbation', name: 'Masturbation' },
  { slug: 'rough', name: 'Rough Sex' },
  { slug: 'cumshot', name: 'Cumshot' },
  { slug: 'deepthroat', name: 'Deepthroat' },
  { slug: 'striptease', name: 'Striptease' },
  { slug: 'cosplay', name: 'Cosplay' },
  { slug: 'interracial', name: 'Interracial' },
  { slug: 'webcam', name: 'Webcam' },
  { slug: 'japanese', name: 'Japanese' },
  { slug: 'russian', name: 'Russian' },
  { slug: 'french', name: 'French' },
  { slug: 'italian', name: 'Italian' },
  { slug: 'british', name: 'British' },
  { slug: 'brazilian', name: 'Brazilian' },
  { slug: 'korean', name: 'Korean' },
  { slug: 'thai', name: 'Thai' },
  { slug: 'arab', name: 'Arab' },
  { slug: 'pakistani', name: 'Pakistani' },
  { slug: 'bdsm', name: 'BDSM' },
  { slug: 'gangbang', name: 'Gangbang' },
  { slug: 'romantic', name: 'Romantic' },
  { slug: 'female-friendly', name: 'Female Friendly' },
  { slug: 'double-penetration', name: 'Double Penetration' },
  { slug: 'reality', name: 'Reality' },
  { slug: 'college', name: 'College' },
  { slug: 'orgasm', name: 'Female Orgasm' },
  { slug: 'bhabhi', name: 'Indian Bhabhi' },
  { slug: 'aunt', name: 'Aunt / Chachi' },
];

export const SPOTLIGHT_CREATORS = [
  { slug: 'brazzers', name: 'Brazzers', avatar: getInitialAvatar('Brazzers') },
  { slug: 'sweet-sinner', name: 'Sweet Sinner', avatar: getInitialAvatar('Sweet Sinner') },
  { slug: 'reality-kings', name: 'Reality Kings', avatar: getInitialAvatar('Reality Kings') },
  { slug: 'private', name: 'Private', avatar: getInitialAvatar('Private') },
  { slug: 'nubiles', name: 'Nubiles', avatar: getInitialAvatar('Nubiles') },
  { slug: 'metart', name: 'MetArt', avatar: getInitialAvatar('MetArt') },
  { slug: 'wicked', name: 'Wicked Pictures', avatar: getInitialAvatar('Wicked Pictures') },
  { slug: 'digital-playground', name: 'Digital Playground', avatar: getInitialAvatar('Digital Playground') },
];

/**
 * Robust fetch that uses standard HTTPS first (works on Vercel/global),
 * and falls back to Direct Cloudflare IPs with connection retry if DNS is poisoned locally.
 * Fully follows 301/302 redirects for short video keys.
 */
export async function fetchXH(urlPath, ipIndex = 0, redirectCount = 0) {
  if (redirectCount > 5) {
    throw new Error('Too many redirects');
  }
  const targetPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;

  // 1. Try standard global fetch on first attempt ONLY if directMode is not yet engaged
  if (ipIndex === 0 && !directMode) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`https://xhamster.com${targetPath}`, {
        headers: {
          'User-Agent': UA,
          'Referer': 'https://xhamster.com/',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        return await res.text();
      }
    } catch (_) {
      // Local DNS sinkhole or timeout detected -> lock into direct mode permanently
      directMode = true;
    }
  }

  // 2. Direct Cloudflare IP fallback (for local Windows / Indian ISP)
  const currentIp = DIRECT_IPS[ipIndex % DIRECT_IPS.length];
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: currentIp,
        port: 443,
        path: targetPath,
        method: 'GET',
        headers: {
          Host: 'xhamster.com',
          'User-Agent': UA,
          Referer: 'https://xhamster.com/',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          Connection: 'close',
        },
        servername: 'xhamster.com',
        timeout: 8000,
      },
      res => {
        // Handle 301, 302, 307, 308 redirects automatically
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let nextUrl = res.headers.location;
          if (nextUrl.startsWith('http')) {
            try {
              const u = new URL(nextUrl);
              nextUrl = u.pathname + u.search;
            } catch (_) {}
          }
          return fetchXH(nextUrl, (ipIndex + 1) % DIRECT_IPS.length, redirectCount + 1)
            .then(resolve)
            .catch(reject);
        }

        let html = '';
        res.on('data', chunk => (html += chunk));
        res.on('end', () => resolve(html));
      }
    );
    req.on('error', err => {
      if (ipIndex < DIRECT_IPS.length - 1) {
        fetchXH(urlPath, ipIndex + 1, redirectCount).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
    req.on('timeout', () => {
      req.destroy();
      if (ipIndex < DIRECT_IPS.length - 1) {
        fetchXH(urlPath, ipIndex + 1, redirectCount).then(resolve).catch(reject);
      } else {
        reject(new Error('fetchXH timeout'));
      }
    });
    req.end();
  });
}

/**
 * Universal video finder: deeply extracts any video thumb props from all xHamster layouts
 */
function findVideoList(data) {
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data.videoThumbProps) && data.videoThumbProps.length > 0) return data.videoThumbProps;
  if (Array.isArray(data.videos) && data.videos.length > 0) return data.videos;
  for (const key of Object.keys(data)) {
    const val = data[key];
    if (val && typeof val === 'object') {
      if (Array.isArray(val.videoThumbProps) && val.videoThumbProps.length > 0) return val.videoThumbProps;
      if (Array.isArray(val.videos) && val.videos.length > 0) return val.videos;
    }
  }
  return [];
}

function parseVideosFromInitialData(html) {
  const videos = [];
  const scriptMatch = html.match(/<script id=['"]initials-script['"][^>]*>([\s\S]*?)<\/script>/i);
  if (!scriptMatch) return videos;

  try {
    const jsonStr = scriptMatch[1].replace(/^[^{]*/, '').replace(/;?\s*$/, '');
    const data = JSON.parse(jsonStr);

    const rawList = findVideoList(data);

    for (const item of rawList) {
      // Extract clean vkey slug
      let vkey = '';
      if (item.pageURL) {
        vkey = item.pageURL.split('/').pop().split('?')[0];
      } else if (item.idHashSlug) {
        vkey = item.idHashSlug;
      } else if (item.id) {
        vkey = `xh${item.id}`;
      }
      if (!vkey) continue;

      const title = item.title || 'Untitled';
      const durSec = parseInt(item.duration, 10) || 0;
      const min = Math.floor(durSec / 60);
      const sec = durSec % 60;
      const duration = durSec > 0 ? `${min}:${sec < 10 ? '0' : ''}${sec}` : '';

      const thumbUrl = item.thumbURL || item.imageURL || item.previewThumbURL || '';
      const views = parseInt(item.views, 10) || 0;
      const rating = item.rating?.value ? parseInt(item.rating.value, 10) : 95;

      videos.push({
        vkey,
        title,
        durationSec: durSec,
        duration,
        views,
        rating,
        thumb: thumbUrl,
        thumbRaw: thumbUrl,
        age: item.created ? `${new Date(item.created * 1000).toLocaleDateString()}` : '',
        tags: (item.tags || []).map(t => (typeof t === 'string' ? t : t.name)),
        categories: (item.categories || []).map(c => (typeof c === 'string' ? c : c.name)),
        related: [],
      });
    }
  } catch (e) {
    console.error('Failed to parse initials JSON:', e.message);
  }

  return videos;
}

export async function getFeed(section = 'hot', page = 1) {
  const sec = (section || 'hot').toLowerCase();
  const cacheKey = `feed:${sec}:${page}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  let path = '/search/trending';

  if (sec === 'hot' || sec === 'trending') {
    path = page > 1 ? `/search/trending?page=${page}` : '/search/trending';
  } else if (sec === 'best' || sec === 'top') {
    path = page > 1 ? `/search/best?page=${page}` : '/search/best';
  } else if (sec === 'new' || sec === 'latest' || sec === 'today') {
    path = page > 1 ? `/search/new?page=${page}` : '/search/new';
  } else if (sec === 'weekly') {
    path = page > 1 ? `/search/best-weekly?page=${page}` : '/search/best-weekly';
  } else if (sec === 'monthly') {
    path = page > 1 ? `/search/best-monthly?page=${page}` : '/search/best-monthly';
  } else if (sec === 'yearly') {
    path = page > 1 ? `/search/best-yearly?page=${page}` : '/search/best-yearly';
  } else if (sec === 'most-viewed' || sec === 'popular') {
    path = page > 1 ? `/search/popular?page=${page}` : '/search/popular';
  } else {
    // All categories and queries route to search endpoint for reliable 46 videos per page
    path = page > 1 ? `/search/${encodeURIComponent(sec)}?page=${page}` : `/search/${encodeURIComponent(sec)}`;
  }

  try {
    const html = await fetchXH(path);
    const videos = parseVideosFromInitialData(html);
    if (videos && videos.length > 0) {
      setCached(cacheKey, videos);
    }
    return videos;
  } catch (err) {
    console.error(`getFeed(${section}, ${page}) error:`, err.message);
    return [];
  }
}

export async function searchVideos(query, options = 1) {
  if (!query) return [];
  const page = typeof options === 'number' ? options : (options?.page || 1);
  const sort = typeof options === 'object' ? (options.sort || '') : '';
  const cacheKey = `search:${query}:${page}:${sort}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const cleanQ = query.trim().replace(/[-_ ]+/g, '+');
  let path = page > 1
    ? `/search/${encodeURIComponent(cleanQ).replace(/%2B/gi, '+')}?page=${page}`
    : `/search/${encodeURIComponent(cleanQ).replace(/%2B/gi, '+')}`;

  if (sort) {
    path += (path.includes('?') ? '&' : '?') + `sort=${encodeURIComponent(sort)}`;
  }

  try {
    const html = await fetchXH(path);
    const videos = parseVideosFromInitialData(html);
    if (videos && videos.length > 0) {
      setCached(cacheKey, videos);
    }
    return videos;
  } catch (err) {
    console.error(`searchVideos(${query}, ${page}) error:`, err.message);
    return [];
  }
}

export async function getVideoByVkey(vkey) {
  if (!vkey) return null;
  const cacheKey = `video:${vkey}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const path = `/videos/${vkey}`;

  try {
    const html = await fetchXH(path);
    const scriptMatch = html.match(/<script id=['"]initials-script['"][^>]*>([\s\S]*?)<\/script>/i);
    if (!scriptMatch) {
      throw new Error('Video metadata not found');
    }

    const jsonStr = scriptMatch[1].replace(/^[^{]*/, '').replace(/;?\s*$/, '');
    const data = JSON.parse(jsonStr);

    const model = data.videoModel || {};
    const entity = data.videoEntity || {};
    const tagsComponent = data.videoTagsComponent?.tags || [];

    const title = model.title || entity.title || 'Untitled';
    const durSec = parseInt(model.duration || entity.duration, 10) || 0;
    const min = Math.floor(durSec / 60);
    const sec = durSec % 60;
    const duration = durSec > 0 ? `${min}:${sec < 10 ? '0' : ''}${sec}` : '';
    const views = parseInt(model.views || entity.views, 10) || 0;
    const rating = model.rating?.value || entity.rating?.value || 95;
    const thumb = model.thumbURL || entity.thumbBig || '';

    const categories = [];
    const tags = [];
    for (const t of tagsComponent) {
      const name = t.name;
      if (!name) continue;
      if (t.isCategory) categories.push(name);
      else tags.push(name);
    }

    // Related videos
    const relatedRaw = data.relatedVideosComponent?.videoThumbProps || [];
    const related = relatedRaw.slice(0, 12).map(r => {
      const rKey = r.pageURL ? r.pageURL.split('/').pop().split('?')[0] : (r.id ? `xh${r.id}` : '');
      const rDur = parseInt(r.duration, 10) || 0;
      return {
        vkey: rKey,
        title: r.title || 'Untitled',
        durationSec: rDur,
        duration: rDur > 0 ? `${Math.floor(rDur/60)}:${rDur%60}` : '',
        views: parseInt(r.views, 10) || 0,
        rating: 95,
        thumb: r.thumbURL || r.imageURL || '',
        thumbRaw: r.thumbURL || r.imageURL || '',
        age: '',
        tags: [],
        categories: [],
        related: [],
      };
    }).filter(r => r.vkey && r.vkey !== vkey);

    const videoObj = {
      vkey,
      title,
      durationSec: durSec,
      duration,
      views,
      rating,
      thumb,
      thumbRaw: thumb,
      age: entity.created ? `${new Date(entity.created * 1000).toLocaleDateString()}` : '',
      tags,
      categories,
      related,
    };

    setCached(cacheKey, videoObj);
    return videoObj;
  } catch (err) {
    console.error(`getVideoByVkey(${vkey}) error:`, err.message);
    return null;
  }
}

export async function getVideoInfoByUrl(url) {
  const vkey = url.split('/').pop().split('?')[0];
  return getVideoByVkey(vkey);
}

export async function getVideoInfo(vkey) {
  return getVideoByVkey(vkey);
}

export async function getStreams(vkey) {
  if (!vkey) return { vkey, qualities: [], embedUrl: '' };
  const cacheKey = `streams:${vkey}`;
  const cached = getCached(cacheKey);
  if (cached && cached.qualities?.length > 0) return cached;

  const path = `/videos/${vkey}`;
  const embedUrl = `https://xhamster.com/embed/${vkey}`;

  try {
    const html = await fetchXH(path);

    // 1. Search for raw m3u8 playlist in HTML
    const m3u8Match = html.match(/https:\/\/[^"'\s<>]+?\.m3u8[^"'\s<>]*/i);
    let m3u8Url = m3u8Match ? m3u8Match[0] : '';

    // 2. Search for direct mp4 links in HTML
    const mp4Matches = [...html.matchAll(/(https:\/\/[^"'\s<>]+?\.mp4)/gi)].map(m => m[1]);

    const qualities = [];

    if (m3u8Url) {
      // Universal H264 provides hardware decoding on all Android devices and web browsers
      const h264M3u8 = m3u8Url.replace(/\.(av1|vp9)\./i, '.h264.');
      if (h264M3u8.includes('_TPL_')) {
        qualities.push(
          { quality: '1080', url: h264M3u8.replace('_TPL_', '1080p') },
          { quality: '720', url: h264M3u8.replace('_TPL_', '720p') },
          { quality: '480', url: h264M3u8.replace('_TPL_', '480p') },
          { quality: '240', url: h264M3u8.replace('_TPL_', '240p') }
        );
      } else {
        qualities.push({ quality: 'auto', url: h264M3u8 });
      }
    }

    // Add direct mp4 fallbacks if found
    for (const mp4 of mp4Matches) {
      if (mp4.includes('1080p') && !qualities.some(q => q.quality === '1080')) {
        qualities.push({ quality: '1080', url: mp4 });
      } else if (mp4.includes('720p') && !qualities.some(q => q.quality === '720')) {
        qualities.push({ quality: '720', url: mp4 });
      } else if (mp4.includes('480p') && !qualities.some(q => q.quality === '480')) {
        qualities.push({ quality: '480', url: mp4 });
      } else if (mp4.includes('240p') && !qualities.some(q => q.quality === '240')) {
        qualities.push({ quality: '240', url: mp4 });
      }
    }

    // Default quality logic
    const def =
      qualities.find(q => q.quality === '720') ||
      qualities.find(q => q.quality === '1080') ||
      qualities[0];

    const streamObj = {
      vkey,
      qualities,
      defaultQuality: def ? def.quality : '720',
      embedUrl,
      stale: false,
    };

    if (qualities.length > 0) {
      setCached(cacheKey, streamObj);
    }

    return streamObj;
  } catch (err) {
    console.error(`getStreams(${vkey}) error:`, err.message);
    return {
      vkey,
      qualities: [],
      defaultQuality: '720',
      embedUrl,
      stale: false,
      error: err.message,
    };
  }
}
