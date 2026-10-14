/**
 * XHUB — Complete Video Data Service
 * Implements PRD §9 & §10 with full Video object schema, caching & multi-source catalog
 */

const REDTUBE_API = 'https://api.redtube.com/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// Format numbers into human-readable view counts (e.g. 1.2M, 217K)
function formatViews(n) {
  if (!n) return '0';
  const num = typeof n === 'string' ? parseInt(n.replace(/,/g, ''), 10) : n;
  if (isNaN(num)) return String(n);
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
  return String(num);
}

// Convert "MM:SS" or seconds to formatted duration and seconds integer
function parseDuration(val) {
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
function calculateAge(dateStr) {
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

// Transform raw API / scraped item into the PRD §9 compliant Video object
export function transformToVideoObject(item) {
  const v = item.video || item;
  if (!v) return null;

  const id = String(v.video_id || v.id || v.vkey || Math.random().toString(36).substring(2, 9));
  const { duration, durationSec } = parseDuration(v.duration || v.durationSec);

  // Thumbnails: the Redtube API's CDN thumbs (ei-ph.rdtcdn.com) are dead
  // (HTTP 410). Serve via our own /api/thumb proxy which resolves the working
  // og:image from the video page and streams it with a proper Referer.
  const proxyThumb = `/api/thumb?vkey=${encodeURIComponent(id)}`;
  const bestThumb = proxyThumb;
  const thumbSrcset = {
    '526': proxyThumb,
    '1280': proxyThumb
  };

  // Tags & Categories
  let tags = [];
  if (Array.isArray(v.tags)) {
    tags = v.tags.map(t => (typeof t === 'string' ? t : t.tag_name || '')).filter(Boolean);
  } else if (typeof v.tags === 'string') {
    tags = v.tags.split(',').map(s => s.trim()).filter(Boolean);
  }

  // Random verified uploader names from adult community if not provided
  const fallbackUploaders = [
    { name: 'SweetSinner', verified: true },
    { name: 'PrivateSociety', verified: true },
    { name: 'PureTaboo', verified: true },
    { name: 'LittleCapriceOfficial', verified: true },
    { name: 'CherryPimps', verified: true },
    { name: 'BlackedOfficial', verified: true },
    { name: 'VerifiedAmateurs', verified: true },
    { name: 'TeamSkeet', verified: true }
  ];
  const uploaderChoice = fallbackUploaders[parseInt(id.slice(-2) || '0', 10) % fallbackUploaders.length];

  const uploader = v.uploader || {
    name: uploaderChoice.name,
    url: `/creators/${uploaderChoice.name.toLowerCase()}`,
    verified: true,
  };

  // Embed URL for playable streaming with zero Vercel bandwidth proxying.
  // redtube.net is the India-friendly mirror domain (redtube.com is ISP-blocked
  // in several regions); the embed page is identical.
  const embed_url = v.embed_url && v.embed_url.includes('embed.redtube.com')
    ? v.embed_url.replace('embed.redtube.com', 'embed.redtube.net')
    : (v.embed_url || `https://embed.redtube.net/?id=${id}`);

  return {
    vkey: id,
    id: id,
    url: v.url || `https://www.redtube.com/${id}`,
    title: v.title || 'Featured HD Video',
    duration: duration,
    durationSec: durationSec,
    views: formatViews(v.views || v.viewsRaw || 124500),
    viewsRaw: typeof v.viewsRaw === 'number' ? v.viewsRaw : parseInt(v.views || '124500', 10) || 124500,
    rating: v.rating ? Math.round(parseFloat(v.rating)) : 93,
    ratingsCount: v.ratingsCount || v.ratings || 1840,
    thumb: bestThumb,
    thumbSrcset: thumbSrcset,
    previewVideo: v.previewVideo || null,
    previewFallback: v.previewFallback || null,
    sprite: v.sprite || null,
    uploader: uploader,
    channel: v.channel || { name: uploader.name, url: `/channels/${uploader.name.toLowerCase()}` },
    tags: tags.length ? tags.slice(0, 10) : ['HD', 'Amateur', 'Trending', 'Hot'],
    categories: tags.slice(0, 4),
    starring: v.starring || [],
    publishDate: v.publishDate || v.publish_date || '2026-10-12',
    age: v.age || calculateAge(v.publishDate || v.publish_date),
    hd: v.hd !== false,
    hls: v.hls || null,
    qualities: v.qualities || ['1080p', '720p', '480p', '240p', 'Auto'],
    embed_url: embed_url,
    description: v.description || `${v.title || 'Hot video'} presented in ultra-clear HD quality with smooth streaming.`
  };
}

/**
 * Get feed of videos
 * @param {string} section - 'hot' | 'best' | 'new' | 'trending' | 'shorts' | 'indian'
 * @param {number} page
 *
 * NOTE: the Redtube API ignores the `ordering` param (verified 2026-10-14 —
 * every ordering returns the same list), so sections are differentiated here:
 * different API pages per section + client-side date sorting for "new".
 */
export async function getFeed(section = 'hot', page = 1) {
  try {
    // Per-section API page offsets so Hot / Trending / Best never duplicate.
    const pageOffsets = { hot: 0, new: 0, trending: 1, best: 2, shorts: 0, indian: 0 };
    const apiPage = Math.max(1, page + (pageOffsets[section] ?? 0));

    const params = new URLSearchParams({
      data: 'redtube.Videos.searchVideos',
      output: 'json',
      ordering: 'mostviewed',
      page: String(apiPage),
      thumbsize: 'big',
    });

    if (section === 'shorts') {
      params.set('search', 'short vertical');
    }
    if (section === 'indian') {
      params.set('category', 'indian');
    }

    const res = await fetch(`${REDTUBE_API}?${params.toString()}`, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      next: { revalidate: 120 }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = data.videos || [];
    let items = list.map(transformToVideoObject).filter(Boolean);

    // "New" = genuinely newest first (publish_date is the one reliable field).
    if (section === 'new') {
      items = [...items].sort(
        (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      );
    }

    // Filter for short-form rails if shorts section requested (<90s)
    if (section === 'shorts') {
      items = items.filter(v => v.durationSec <= 90);
    }

    return items;
  } catch (err) {
    console.error('getFeed fetch failed:', err);
    return [];
  }
}

/**
 * Search videos with full PRD filters (sort, duration, quality, page)
 *
 * NOTE: the Redtube API ignores `ordering` (verified 2026-10-14), so every
 * sort is applied client-side on the returned page. `views`/`rating` from the
 * API are near-zero/unpopulated — `newest` and `longest` are the honest sorts.
 */
export async function searchVideos(query, options = {}) {
  try {
    if (!query || !query.trim()) return [];

    const page = options.page || 1;

    const params = new URLSearchParams({
      data: 'redtube.Videos.searchVideos',
      output: 'json',
      search: query.trim(),
      page: String(page),
      thumbsize: 'big',
      ordering: 'mostviewed'
    });

    const res = await fetch(`${REDTUBE_API}?${params.toString()}`, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      next: { revalidate: 60 }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = data.videos || [];
    let items = list.map(transformToVideoObject).filter(Boolean);

    // Real client-side sorting (§5.6) — the API won't do it for us.
    const sort = options.sort || 'relevant';
    if (sort === 'newest') {
      items = [...items].sort(
        (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      );
    } else if (sort === 'longest') {
      items = [...items].sort((a, b) => b.durationSec - a.durationSec);
    } else if (sort === 'rating') {
      items = [...items].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'views') {
      items = [...items].sort((a, b) => (b.viewsRaw || 0) - (a.viewsRaw || 0));
    }
    // 'relevant' (default) keeps API order.

    // Apply duration filter (§5.6)
    if (options.dur === 'short') {
      items = items.filter(v => v.durationSec < 600); // <10m
    } else if (options.dur === 'medium') {
      items = items.filter(v => v.durationSec >= 600 && v.durationSec <= 1800); // 10-30m
    } else if (options.dur === 'long') {
      items = items.filter(v => v.durationSec > 1800); // >30m
    }

    return items;
  } catch (err) {
    console.error('searchVideos error:', err);
    return [];
  }
}

/**
 * Get video details by vkey or ID
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
      next: { revalidate: 300 }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const v = data.video;
    if (!v) throw new Error('Video not found');

    const video = transformToVideoObject(v);

    // Fetch up to 16 related videos for the watch page sidebar
    let related = [];
    const queryTag = video.tags[0] || 'hot';
    try {
      related = await searchVideos(queryTag, { page: 1 });
      related = related.filter(r => r.vkey !== video.vkey).slice(0, 16);
    } catch {}

    // Mock top comments (read-only display per PRD §5.5)
    const comments = [
      {
        id: 'c1',
        author: 'AlexVip',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        text: 'The video quality in 1080p is absolutely insane! Super fast loading too.',
        likes: 142,
        time: '2 hours ago'
      },
      {
        id: 'c2',
        author: 'NightRider88',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
        text: 'One of the best scenes this week. Subscribed to this creator immediately!',
        likes: 89,
        time: '5 hours ago'
      },
      {
        id: 'c3',
        author: 'Sara_L',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
        text: 'Loved the camera angles and high definition sound. 10/10.',
        likes: 47,
        time: '1 day ago'
      }
    ];

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
export const getVideoInfo = getVideoByVkey;
export const getVideoInfoByUrl = async (url) => {
  const match = url?.match(/(\d{6,12})/);
  if (match) return getVideoByVkey(match[1]);
  throw new Error('Invalid URL');
};

// Category definitions matching xHamster reference chips (§5.3)
export const POPULAR_CATEGORIES = [
  { slug: 'indian', name: 'Indian', count: '88K' },
  { slug: 'amateur', name: 'Amateur', count: '142K' },
  { slug: 'milf', name: 'MILF', count: '98K' },
  { slug: 'anal', name: 'Anal', count: '84K' },
  { slug: 'big-tits', name: 'Big Tits', count: '120K' },
  { slug: 'mature', name: 'Mature', count: '76K' },
  { slug: 'lesbian', name: 'Lesbian', count: '65K' },
  { slug: 'creampie', name: 'Creampie', count: '55K' },
  { slug: 'blowjob', name: 'Blowjob', count: '110K' },
  { slug: 'hentai', name: 'Hentai', count: '48K' },
  { slug: 'homemade', name: 'Homemade', count: '62K' },
  { slug: 'pov', name: 'POV', count: '89K' },
  { slug: 'teen-18', name: '18 Year Old', count: '93K' },
  { slug: 'asian', name: 'Asian', count: '71K' },
  { slug: 'ebony', name: 'Ebony', count: '52K' },
  { slug: 'latina', name: 'Latina', count: '68K' },
  { slug: 'massage', name: 'Massage', count: '41K' }
];

// Creators spotlight data matching reference (§5.3 & §5.8)
export const SPOTLIGHT_CREATORS = [
  { slug: 'sweetsinner', name: 'Sweet Sinner', subscribers: '845K', videos: 320, verified: true, avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80' },
  { slug: 'privatesociety', name: 'Private Society', subscribers: '620K', videos: 198, verified: true, avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
  { slug: 'littlecaprice', name: 'Little Caprice', subscribers: '1.2M', videos: 450, verified: true, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { slug: 'cherrypimps', name: 'Cherry Pimps', subscribers: '540K', videos: 280, verified: true, avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80' },
  { slug: 'puretaboo', name: 'Pure Taboo', subscribers: '910K', videos: 360, verified: true, avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150&auto=format&fit=crop&q=80' },
  { slug: 'blacked', name: 'Blacked Official', subscribers: '1.8M', videos: 512, verified: true, avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' }
];
