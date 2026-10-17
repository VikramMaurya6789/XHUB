import https from 'https';
import { getInitialAvatar } from './avatar.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const DIRECT_IPS = ['104.16.3.81', '104.16.4.81', '104.16.0.81', '104.16.1.81', '104.16.2.81'];

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

  // 1. Try standard global fetch on first attempt
  if (ipIndex === 0) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
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
      // Fall through to direct IP connection
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

function parseVideosFromInitialData(html) {
  const videos = [];
  const scriptMatch = html.match(/<script id=['"]initials-script['"][^>]*>([\s\S]*?)<\/script>/i);
  if (!scriptMatch) return videos;

  try {
    const jsonStr = scriptMatch[1].replace(/^[^{]*/, '').replace(/;?\s*$/, '');
    const data = JSON.parse(jsonStr);

    const rawList =
      data.searchResult?.videoThumbProps ||
      data.searchResults?.videoThumbProps ||
      data.landing?.videoThumbProps ||
      data.trendingVideos?.videoThumbProps ||
      data.videoThumbPropsComponent?.videoThumbProps ||
      data.relatedVideosComponent?.videoThumbProps ||
      data.relatedVideosComponent?.videos ||
      data.searchPage?.videos ||
      data.videos ||
      [];

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
  let path = '/search/trending';
  const sec = (section || '').toLowerCase();

  if (sec === 'hot' || sec === 'trending') {
    path = page > 1 ? `/search/trending?page=${page}` : '/search/trending';
  } else if (sec === 'best') {
    path = page > 1 ? `/best/weekly?page=${page}` : '/best/weekly';
  } else if (sec === 'new') {
    path = page > 1 ? `/new?page=${page}` : '/new';
  } else if (sec === 'most-viewed' || sec === 'popular') {
    path = page > 1 ? `/most-viewed/weekly?page=${page}` : '/most-viewed/weekly';
  } else if (POPULAR_CATEGORIES.some(c => c.slug === sec || c === sec)) {
    path = page > 1 ? `/categories/${sec}?page=${page}` : `/categories/${sec}`;
  } else {
    path = page > 1 ? `/search/${encodeURIComponent(sec)}?page=${page}` : `/search/${encodeURIComponent(sec)}`;
  }

  try {
    const html = await fetchXH(path);
    return parseVideosFromInitialData(html);
  } catch (err) {
    console.error(`getFeed(${section}, ${page}) error:`, err.message);
    return [];
  }
}

export async function searchVideos(query, options = 1) {
  if (!query) return [];
  const page = typeof options === 'number' ? options : (options?.page || 1);
  const path = page > 1
    ? `/search/${encodeURIComponent(query)}?page=${page}`
    : `/search/${encodeURIComponent(query)}`;

  try {
    const html = await fetchXH(path);
    return parseVideosFromInitialData(html);
  } catch (err) {
    console.error(`searchVideos(${query}, ${page}) error:`, err.message);
    return [];
  }
}

export async function getVideoByVkey(vkey) {
  if (!vkey) return null;
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

    return {
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

    return {
      vkey,
      qualities,
      defaultQuality: def ? def.quality : '720',
      embedUrl,
      stale: false,
    };
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
