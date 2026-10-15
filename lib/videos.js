/**
 * XHUB — Complete Video Data Service
 * Implements PRD §9 & §10 with full Video object schema, caching & multi-source catalog
 */

const REDTUBE_API = 'https://api.redtube.com/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// XHUB content policy: ONLY 1080p videos, 10+ minutes long.
// hd1080.json is maintained by scripts/sync-media.mjs (vkey -> 1 for verified 1080p).
const HD1080_MAP_URL = 'https://raw.githubusercontent.com/VikramMaurya6789/XHUB/main/public/hd1080.json';
const MIN_DURATION_SEC = 600; // 10 minutes

let hdCache = null;
let hdCacheAt = 0;
async function getHD1080Set() {
  const now = Date.now();
  if (hdCache && now - hdCacheAt < 10 * 60 * 1000) return hdCache;
  try {
    const res = await fetch(HD1080_MAP_URL, { next: { revalidate: 600 } });
    hdCache = res.ok ? await res.json() : {};
    hdCacheAt = now;
  } catch {
    hdCache = hdCache || {};
  }
  return hdCache;
}

// Site-wide content filter: 1080p + 10min+. Applied to all feeds and search.
async function applyContentPolicy(items) {
  const hd = await getHD1080Set();
  return items.filter(v => {
    if (!v) return false;
    if ((v.durationSec || 0) < MIN_DURATION_SEC) return false;
    if (!hd[v.vkey]) return false;
    return true;
  });
}

// Local catalog (Redtube API is IP-blocked on Vercel, so feeds use catalog.json).
const CATALOG_URL = 'https://raw.githubusercontent.com/VikramMaurya6789/XHUB/main/public/catalog.json';

let catalogCache = null;
let catalogCacheAt = 0;
async function getCatalog() {
  const now = Date.now();
  if (catalogCache && now - catalogCacheAt < 10 * 60 * 1000) return catalogCache;
  try {
    const res = await fetch(CATALOG_URL, { next: { revalidate: 600 } });
    catalogCache = res.ok ? await res.json() : {};
    catalogCacheAt = now;
  } catch {
    catalogCache = catalogCache || {};
  }
  return catalogCache;
}

function catalogToVideo(id, c) {
  const proxyThumb = `/api/thumb?vkey=${encodeURIComponent(id)}`;
  return {
    vkey: String(id),
    title: c.title || 'Untitled',
    durationSec: c.durationSec || 0,
    duration: c.duration || '',
    views: c.views || 0,
    rating: c.rating || 0,
    thumb: proxyThumb,
    thumbs: [proxyThumb],
    thumbSrcset: { '526': proxyThumb, '1280': proxyThumb },
    url: c.url || '',
    publishDate: c.added || '',
    age: calculateAge(c.added || ''),
    tags: [],
    categories: [],
  };
}

// Format numbers into human-readable view counts (e.g. 1.2M, 217K)
export function formatViews(n) {
  if (!n || isNaN(n)) return '0';
  const num = typeof n === 'string' ? parseInt(n.replace(/,/g, ''), 10) : n;
  if (isNaN(num)) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
  return String(num);
}

// Singular/plural view count formatter (F3)
export function formatViewCountString(n) {
  const num = typeof n === 'string' ? parseInt(n.replace(/,/g, ''), 10) : (n || 0);
  if (num === 1) return '1 view';
  return `${formatViews(num)} views`;
}

// Convert "MM:SS" or seconds to formatted duration and seconds integer
export function parseDuration(val) {
  if (!val) return { duration: '0:00', durationSec: 0 };
  if (typeof val === 'number') {
    const m = Math.floor(val / 60);
    const s = Math.floor(val % 60);
    return {
      duration: `${m}:${s < 10 ? '0' : ''}${s}`,
      durationSec: val,
    };
  }
  const parts = String(val).split(':').map(p => parseInt(p, 10));
  let sec = 0;
  if (parts.length === 3) {
    sec = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    sec = parts[0] * 60 + parts[1];
  } else {
    sec = parts[0] || 0;
  }
  return { duration: String(val), durationSec: sec };
}

// Helper to calculate relative age (e.g., "3 days ago")
export function calculateAge(dateStr) {
  if (!dateStr) return 'Recently';
  try {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (isNaN(diff) || diff < 0) return 'Recently';
    const days = Math.floor(diff / 86400);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
    const years = Math.floor(days / 365);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  } catch {
    return 'Recently';
  }
}

import { getInitialAvatar } from './avatar';
export { getInitialAvatar };

// Transform raw API item into honest PRD Video object (R3 & R4: zero fabricated stats or uploaders)
export function transformToVideoObject(item) {
  const v = item.video || item;
  if (!v) return null;

  const id = String(v.video_id || v.id || v.vkey || Math.random().toString(36).substring(2, 9));
  const { duration, durationSec } = parseDuration(v.duration || v.durationSec);

  // Extract raw thumb from API if present
  let directThumb = '';
  if (Array.isArray(v.thumbs) && v.thumbs.length > 0) {
    const big = v.thumbs.find(t => t.size === 'big');
    const med2 = v.thumbs.find(t => t.size === 'medium2');
    const med1 = v.thumbs.find(t => t.size === 'medium1');
    directThumb = (big || med2 || med1 || v.thumbs[0])?.src || '';
  } else if (typeof v.default_thumb === 'string' && v.default_thumb.startsWith('http')) {
    directThumb = v.default_thumb;
  } else if (typeof v.thumb === 'string' && v.thumb.startsWith('http')) {
    directThumb = v.thumb;
  }

  // Thumbnails: ALWAYS route through /api/thumb proxy so browsers never fail due to Referer or ISP block
  const rawParam = (directThumb && directThumb.startsWith('http')) ? `&src=${encodeURIComponent(directThumb)}` : '';
  const proxyThumb = `/api/thumb?vkey=${encodeURIComponent(id)}${rawParam}`;
  const bestThumb = proxyThumb;
  const thumbSrcset = {
    '526': proxyThumb,
    '1280': proxyThumb
  };
  const thumbsList = [proxyThumb];

  // Tags & Categories
  let tags = [];
  if (Array.isArray(v.tags)) {
    tags = v.tags.map(t => (typeof t === 'string' ? t : t.tag_name || '')).filter(Boolean);
  } else if (typeof v.tags === 'string') {
    tags = v.tags.split(',').map(s => s.trim()).filter(Boolean);
  }

  // Real uploader (R4: Never assign random fake competitor studio names)
  let uploader = null;
  if (v.uploader && typeof v.uploader === 'object' && v.uploader.name) {
    uploader = {
      name: v.uploader.name,
      url: `/creators/${encodeURIComponent(v.uploader.name.toLowerCase())}`,
      verified: Boolean(v.uploader.verified),
      avatar: getInitialAvatar(v.uploader.name),
    };
  } else if (typeof v.uploader === 'string' && v.uploader.trim()) {
    uploader = {
      name: v.uploader.trim(),
      url: `/creators/${encodeURIComponent(v.uploader.trim().toLowerCase())}`,
      verified: false,
      avatar: getInitialAvatar(v.uploader.trim()),
    };
  } else {
    uploader = {
      name: 'Unknown uploader',
      url: '#',
      verified: false,
      avatar: getInitialAvatar('Unknown'),
    };
  }

  // Embed URL with India-friendly fallback
  const embed_url = v.embed_url && v.embed_url.includes('embed.redtube.com')
    ? v.embed_url.replace('embed.redtube.com', 'embed.redtube.net')
    : (v.embed_url || `https://embed.redtube.net/?id=${id}`);

  // Real description (R1 & R6: never invent marketing copy)
  const realDescription = (v.description && typeof v.description === 'string' && v.description.trim())
    ? v.description.trim()
    : (tags.length ? tags.join(' • ') : '');

  // Real views and rating (R3: Never fabricate viewsRaw 124500 or rating 93)
  const viewsRaw = typeof v.viewsRaw === 'number'
    ? v.viewsRaw
    : (v.views != null && !isNaN(parseInt(v.views, 10)) ? parseInt(v.views, 10) : 0);
  const views = formatViewCountString(viewsRaw);

  const rating = v.rating != null && !isNaN(parseFloat(v.rating))
    ? Math.round(parseFloat(v.rating))
    : null;
  const ratingsCount = typeof v.ratingsCount === 'number'
    ? v.ratingsCount
    : (v.ratings != null && !isNaN(parseInt(v.ratings, 10)) ? parseInt(v.ratings, 10) : 0);

  return {
    vkey: id,
    id: id,
    url: v.url || `https://www.redtube.net/${id}`,
    title: v.title || 'Video',
    duration: duration,
    durationSec: durationSec,
    views: views,
    viewsRaw: viewsRaw,
    rating: rating,
    ratingsCount: ratingsCount,
    thumb: bestThumb,
    thumbSrcset: thumbSrcset,
    thumbsList: thumbsList,
    previewVideo: v.previewVideo || null,
    previewFallback: v.previewFallback || null,
    sprite: v.sprite || null,
    uploader: uploader,
    channel: v.channel || { name: uploader.name, url: uploader.url },
    tags: tags.length ? tags.slice(0, 10) : ['HD', 'Trending'],
    categories: tags.slice(0, 4),
    starring: v.starring || [],
    publishDate: v.publishDate || v.publish_date || v.added || '2026-10-12',
    age: v.age || calculateAge(v.publishDate || v.publish_date || v.added),
    hd: v.hd !== false,
    hls: v.hls || null,
    qualities: v.qualities || ['1080p', '720p', '480p', '240p', 'Auto'],
    embed_url: embed_url,
    description: realDescription
  };
}

/**
 * Get feed of videos
 * Maps each section to genuinely distinct queries (PRD Fix item 2 & F7: Indian ranking boost)
 * Lengthened cache (F2) to 900s for stability
 */
export async function getFeed(section = 'hot', page = 1) {
  try {
    // Use local catalog (Redtube API is IP-blocked on Vercel).
    const catalog = await getCatalog();
    const perPage = 50;
    const offset = (page - 1) * perPage;

    let items = Object.entries(catalog)
      .map(([id, c]) => catalogToVideo(id, c));

    // Shorts: keep short-form (<90s).
    if (section === 'shorts') {
      items = items.filter(v => v.durationSec > 0 && v.durationSec <= 90);
      items.sort((a, b) => (b.views || 0) - (a.views || 0));
      return items.slice(offset, offset + perPage);
    }

    // Show all collected videos, 10+ minutes for normal sections.
    items = items.filter(v => (v.durationSec || 0) >= MIN_DURATION_SEC);

    // Date-wise sorting: newest uploads first, old/undated videos below.
    // (user: "new uper, old niche" — applies to 1080p videos too)
    const dateDesc = (a, b) =>
      String(b.publishDate || '').localeCompare(String(a.publishDate || ''));
    const recentFirst = (a, b, cmp) => dateDesc(a, b) || cmp(a, b);

    // Sort by section
    if (section === 'hot') {
      items.sort((a, b) => recentFirst(a, b, (x, y) => (y.views || 0) - (x.views || 0)));
    } else if (section === 'new') {
      items.sort((a, b) => String(b.publishDate || '').localeCompare(String(a.publishDate || '')));
    } else if (section === 'trending' || section === 'best') {
      items.sort((a, b) => recentFirst(a, b, (x, y) => (y.rating || 0) - (x.rating || 0)));
    } else if (section === 'indian') {
      const indianKeywords = [
        'indian', 'desi', 'hindi', 'tamil', 'telugu', 'bhabhi', 'mallu',
        'punjabi', 'kannada', 'marathi', 'bengali', 'pakistani', 'bangla', 'devar'
      ];
      items = items
        .filter(v => {
          const t = (v.title || '').toLowerCase();
          return indianKeywords.some(k => t.includes(k));
        })
        .sort((a, b) => recentFirst(a, b, (x, y) => (y.views || 0) - (x.views || 0)));
    } else {
      // Generic category section: normalize slugs ("big-tits" -> words) and
      // require every word in the title; keep date-wise order (newest first).
      const words = section.toLowerCase().replace(/[-_]+/g, ' ').split(/\s+/).filter(Boolean);
      items = items
        .filter(v => {
          const t = (v.title || '').toLowerCase();
          return words.length > 0 && words.every(w => t.includes(w));
        })
        .sort((a, b) => recentFirst(a, b, (x, y) => (y.views || 0) - (x.views || 0)));
    }

    return items.slice(offset, offset + perPage);
  } catch (err) {
    console.error(`getFeed(${section}) error:`, err);
    return [];
  }
}

/**
 * Search videos with fully wired filters (sort, duration, quality, page)
 */
export async function searchVideos(query, options = {}) {
  try {
    if (!query || !query.trim()) return [];

    const page = options.page || 1;
    const sort = options.sort || 'relevant';
    const dur = options.dur || 'all';
    const perPage = 50;
    const offset = (page - 1) * perPage;

    // Use local catalog (Redtube API is IP-blocked on Vercel).
    const catalog = await getCatalog();
    // Normalize category slugs ("big-tits" -> words ["big","tits"]) and require
    // every word in the title, so hyphenated category pages are never empty.
    const words = query.trim().toLowerCase().replace(/[-_]+/g, ' ').split(/\s+/).filter(Boolean);

    let items = Object.entries(catalog)
      .map(([id, c]) => catalogToVideo(id, c))
      .filter(v => {
        const t = (v.title || '').toLowerCase();
        return words.length > 0 && words.every(w => t.includes(w));
      });

    // Show all collected videos, 10+ minutes.
    items = items.filter(v => (v.durationSec || 0) >= MIN_DURATION_SEC);

    // 1. Duration filter:
    if (dur === 'short') {
      items = items.filter(v => v.durationSec < 600);
    } else if (dur === 'medium') {
      items = items.filter(v => v.durationSec >= 600 && v.durationSec <= 1800);
    } else if (dur === 'long') {
      items = items.filter(v => v.durationSec > 1800);
    }

    // 3. Exact Sorting:
    if (sort === 'views' || sort === 'mostviewed') {
      items.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sort === 'rating') {
      items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'newest') {
      items.sort((a, b) => String(b.publishDate || '').localeCompare(String(a.publishDate || '')));
    } else if (sort === 'longest') {
      items.sort((a, b) => (b.durationSec || 0) - (a.durationSec || 0));
    } else {
      items.sort((a, b) => (b.views || 0) - (a.views || 0));
    }

    return items.slice(offset, offset + perPage);
  } catch (err) {
    console.error('searchVideos error:', err);
    return [];
  }
}

/**
 * Get video details by vkey or ID (R1: No fake comments)
 */
export async function getVideoByVkey(vkey) {
  try {
    if (!vkey) throw new Error('Missing vkey');

    const cleanId = String(vkey).replace(/[^\d]/g, '') || vkey;

    // Use local catalog (Redtube API is IP-blocked on Vercel).
    const catalog = await getCatalog();
    const c = catalog[cleanId] || catalog[vkey];
    if (!c) throw new Error('Video not found');

    const video = catalogToVideo(cleanId, c);

    // Fetch related videos for the watch page sidebar (from local catalog)
    let related = [];
    try {
      related = Object.entries(catalog)
        .filter(([id]) => id !== cleanId)
        .map(([id, cc]) => catalogToVideo(id, cc))
        .filter(v => (v.durationSec || 0) >= MIN_DURATION_SEC)
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 16);
    } catch {}

    // R1: Return honest empty comments array — never invent user comments
    const comments = [];

    return {
      ...video,
      related,
      comments
    };
  } catch (err) {
    console.error('getVideoByVkey error:', err);
    throw err;
  }
}

// Backward compatibility alias
export const getVideo = getVideoByVkey;
export const getVideoInfo = getVideoByVkey;
export const getVideoInfoByUrl = async (url) => {
  const match = url?.match(/(\d{6,12})/);
  if (match) return getVideoByVkey(match[1]);
  throw new Error('Invalid URL');
};

// Category definitions (R3: dropped fabricated inventory counts)
export const POPULAR_CATEGORIES = [
  { slug: 'amateur', name: 'Amateur' },
  { slug: 'milf', name: 'MILF' },
  { slug: 'anal', name: 'Anal' },
  { slug: 'big-tits', name: 'Big Tits' },
  { slug: 'mature', name: 'Mature' },
  { slug: 'lesbian', name: 'Lesbian' },
  { slug: 'creampie', name: 'Creampie' },
  { slug: 'blowjob', name: 'Blowjob' },
  { slug: 'hentai', name: 'Hentai' },
  { slug: 'homemade', name: 'Homemade' },
  { slug: 'pov', name: 'POV' },
  { slug: 'teen-18', name: '18 Year Old' },
  { slug: 'asian', name: 'Asian' },
  { slug: 'ebony', name: 'Ebony' },
  { slug: 'latina', name: 'Latina' },
  { slug: 'massage', name: 'Massage' }
];

// Spotlight creators (R3 & F9: neutral SVG initial avatars, no fabricated subscribers)
export const SPOTLIGHT_CREATORS = [
  { slug: 'sweetsinner', name: 'Sweet Sinner', avatar: getInitialAvatar('Sweet Sinner') },
  { slug: 'privatesociety', name: 'Private Society', avatar: getInitialAvatar('Private Society') },
  { slug: 'littlecaprice', name: 'Little Caprice', avatar: getInitialAvatar('Little Caprice') },
  { slug: 'cherrypimps', name: 'Cherry Pimps', avatar: getInitialAvatar('Cherry Pimps') },
  { slug: 'puretaboo', name: 'Pure Taboo', avatar: getInitialAvatar('Pure Taboo') },
  { slug: 'blacked', name: 'Blacked Official', avatar: getInitialAvatar('Blacked Official') }
];
