/**
 * High-performance Video API client for XHUB
 * Fetches high quality videos, search, streams, and embeds
 */

const REDTUBE_API = 'https://api.redtube.com/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function formatViews(n) {
  if (!n) return '0';
  const num = typeof n === 'string' ? parseInt(n, 10) : n;
  if (isNaN(num)) return n;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(num);
}

function parseVideoItem(item) {
  const v = item.video || item;
  if (!v || !v.video_id) return null;

  // Find highest quality thumbnail
  let bestThumb = v.default_thumb || v.thumb;
  if (Array.isArray(v.thumbs) && v.thumbs.length > 0) {
    const big = v.thumbs.find(t => t.size === 'big');
    const med2 = v.thumbs.find(t => t.size === 'medium2');
    const med1 = v.thumbs.find(t => t.size === 'medium1');
    bestThumb = (big || med2 || med1 || v.thumbs[0])?.src || bestThumb;
  }

  // Format tags
  let tags = [];
  if (Array.isArray(v.tags)) {
    tags = v.tags.map(t => (typeof t === 'string' ? t : t.tag_name || '')).filter(Boolean);
  }

  return {
    id: String(v.video_id),
    vkey: String(v.video_id),
    title: v.title || 'Untitled Video',
    duration: v.duration || '0:00',
    views: formatViews(v.views),
    viewsRaw: v.views || 0,
    rating: v.rating ? Math.round(parseFloat(v.rating)) : null,
    ratingsCount: v.ratings || 0,
    thumb: bestThumb,
    thumbnail: bestThumb,
    embed_url: v.embed_url || `https://embed.redtube.com/?id=${v.video_id}`,
    url: v.url || `https://www.redtube.com/${v.video_id}`,
    tags: tags.slice(0, 8),
    publishDate: v.publish_date || null
  };
}

export async function getFeed(section = 'hot', page = 1) {
  try {
    let ordering = 'mostviewed';
    let searchQuery = '';

    if (section === 'new') {
      ordering = 'newest';
    } else if (section === 'trending') {
      ordering = 'rating';
    } else if (section === 'top') {
      ordering = 'rating';
    } else {
      ordering = 'mostviewed';
    }

    const params = new URLSearchParams({
      data: 'redtube.Videos.searchVideos',
      output: 'json',
      ordering,
      page: String(page),
      thumbsize: 'big',
      ...(searchQuery ? { search: searchQuery } : {})
    });

    const res = await fetch(`${REDTUBE_API}?${params.toString()}`, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      next: { revalidate: 120 }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = data.videos || [];
    const videos = list.map(parseVideoItem).filter(Boolean);

    return videos;
  } catch (err) {
    console.error('getFeed error:', err);
    return [];
  }
}

export async function searchVideos(query, page = 1) {
  try {
    if (!query || !query.trim()) return [];

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
    return list.map(parseVideoItem).filter(Boolean);
  } catch (err) {
    console.error('searchVideos error:', err);
    return [];
  }
}

export async function getVideoInfo(id) {
  try {
    if (!id) throw new Error('Video ID is required');

    // Fetch video details
    const params = new URLSearchParams({
      data: 'redtube.Videos.getVideoById',
      video_id: String(id),
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

    const parsed = parseVideoItem(v);

    // Fetch related videos based on first tag or general query
    let related = [];
    const tag = parsed.tags[0] || 'hot';
    try {
      related = await searchVideos(tag, 1);
      related = related.filter(r => r.id !== parsed.id).slice(0, 12);
    } catch {}

    return {
      ...parsed,
      related
    };
  } catch (err) {
    console.error('getVideoInfo error:', err);
    throw err;
  }
}

export async function getVideoInfoByUrl(url) {
  // Extract id from url if available
  const match = url?.match(/(\d{6,12})/);
  if (match) {
    return getVideoInfo(match[1]);
  }
  throw new Error('Could not parse video ID from URL');
}
