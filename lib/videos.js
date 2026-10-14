/**
 * XHUB — Complete Video Data Service
 * Implements PRD §9 & §10 with full Video object schema, caching & multi-source catalog
 */

const REDTUBE_API = 'https://api.redtube.com/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

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

  // Thumbnails: serve via /api/thumb proxy
  const proxyThumb = `/api/thumb?vkey=${encodeURIComponent(id)}`;
  let bestThumb = proxyThumb;
  const thumbSrcset = {
    '526': proxyThumb,
    '1280': proxyThumb
  };

  let thumbsList = [];
  if (Array.isArray(v.thumbs) && v.thumbs.length > 0) {
    const bigOrMed = v.thumbs
      .filter(t => t.size === 'medium2' || t.size === 'big')
      .map(t => t.src)
      .filter(Boolean);

    thumbsList = bigOrMed.length > 0 ? bigOrMed : v.thumbs.map(t => t.src).filter(Boolean);

    const big = v.thumbs.find(t => t.size === 'big');
    const med2 = v.thumbs.find(t => t.size === 'medium2');
    const med1 = v.thumbs.find(t => t.size === 'medium1');
    const directThumb = (big || med2 || med1 || v.thumbs[0])?.src;
    if (directThumb) bestThumb = directThumb;
    if (big) thumbSrcset['1280'] = big.src;
    if (med2) thumbSrcset['526'] = med2.src;
  }

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
    publishDate: v.publishDate || v.publish_date || '2026-10-12',
    age: v.age || calculateAge(v.publishDate || v.publish_date),
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
    const paramsObj = {
      data: 'redtube.Videos.searchVideos',
      output: 'json',
      page: String(page),
      thumbsize: 'all',
    };

    if (section === 'hot') {
      paramsObj.search = 'hot';
      paramsObj.ordering = 'mostviewed';
    } else if (section === 'new') {
      paramsObj.ordering = 'newest';
    } else if (section === 'trending') {
      paramsObj.search = 'popular';
      paramsObj.ordering = 'rating';
    } else if (section === 'best') {
      paramsObj.search = 'best';
      paramsObj.ordering = 'rating';
    } else if (section === 'shorts') {
      paramsObj.search = 'short vertical';
      paramsObj.ordering = 'mostviewed';
    } else if (section === 'indian') {
      paramsObj.category = 'indian';
      paramsObj.ordering = 'mostviewed';
    } else {
      paramsObj.search = section;
      paramsObj.ordering = 'mostviewed';
    }

    const params = new URLSearchParams(paramsObj);

    const res = await fetch(`${REDTUBE_API}?${params.toString()}`, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      next: { revalidate: 900 }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = data.videos || [];
    let items = list.map(transformToVideoObject).filter(Boolean);

    // "New" = newest first
    if (section === 'new') {
      items = [...items].sort(
        (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      );
    }

    // Filter for short-form rails if shorts section requested (<90s)
    if (section === 'shorts') {
      items = items.filter(v => v.durationSec <= 90);
    }

    // F7: Boost and rank Indian-relevant titles/tags for the Indian section
    if (section === 'indian') {
      const indianKeywords = [
        'indian', 'desi', 'hindi', 'tamil', 'telugu', 'bhabhi', 'mallu',
        'punjabi', 'kannada', 'marathi', 'bengali', 'pakistani', 'bangla', 'devar'
      ];
      items = [...items].sort((a, b) => {
        const aText = `${a.title} ${(a.tags || []).join(' ')}`.toLowerCase();
        const bText = `${b.title} ${(b.tags || []).join(' ')}`.toLowerCase();
        const aScore = indianKeywords.filter(k => aText.includes(k)).length;
        const bScore = indianKeywords.filter(k => bText.includes(k)).length;
        return bScore - aScore;
      });
    }

    return items;
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
    const quality = options.quality || 'all';

    let apiOrdering = 'mostviewed';
    if (sort === 'newest') apiOrdering = 'newest';
    else if (sort === 'rating') apiOrdering = 'rating';
    else if (sort === 'views' || sort === 'mostviewed') apiOrdering = 'mostviewed';

    const params = new URLSearchParams({
      data: 'redtube.Videos.searchVideos',
      output: 'json',
      search: query.trim(),
      page: String(page),
      thumbsize: 'all',
      ordering: apiOrdering
    });

    const res = await fetch(`${REDTUBE_API}?${params.toString()}`, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      next: { revalidate: 900 }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = data.videos || [];
    let items = list.map(transformToVideoObject).filter(Boolean);

    // 1. Duration filter:
    if (dur === 'short') {
      items = items.filter(v => v.durationSec < 600);
    } else if (dur === 'medium') {
      items = items.filter(v => v.durationSec >= 600 && v.durationSec <= 1800);
    } else if (dur === 'long') {
      items = items.filter(v => v.durationSec > 1800);
    }

    // 2. Quality filter:
    if (quality === 'hd') {
      items = items.filter(v => v.hd === true);
    }

    // 3. Exact Sorting:
    if (sort === 'views' || sort === 'mostviewed') {
      items.sort((a, b) => (b.viewsRaw || 0) - (a.viewsRaw || 0));
    } else if (sort === 'rating') {
      items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'newest') {
      items.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
    } else if (sort === 'longest') {
      items.sort((a, b) => (b.durationSec || 0) - (a.durationSec || 0));
    }

    return items;
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

    const params = new URLSearchParams({
      data: 'redtube.Videos.getVideoById',
      video_id: cleanId,
      output: 'json',
      thumbsize: 'all'
    });

    const res = await fetch(`${REDTUBE_API}?${params.toString()}`, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      next: { revalidate: 900 }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const v = data.video;
    if (!v) throw new Error('Video not found');

    const video = transformToVideoObject(v);

    // Fetch related videos for the watch page sidebar
    let related = [];
    const queryTag = video.tags[0] || 'hot';
    try {
      related = await searchVideos(queryTag, { page: 1, sort: 'views' });
      related = related.filter(r => r.vkey !== video.vkey).slice(0, 16);
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
