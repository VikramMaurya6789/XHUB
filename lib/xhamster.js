/**
 * Xhamster scraper - simple and reliable.
 * Xhamster exposes direct m3u8 HLS URLs in video page HTML.
 * No proxy needed for playlists, no short-lived tokens.
 */

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';
const BASE = 'https://xhamster.com';

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://www.google.com/',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function extractVideos(html, limit = 24) {
  const videos = [];
  const seen = new Set();
  // Match video links: /videos/slug-id or full https://xhamster.com/videos/slug-id
  // Exclude /creators/videos/ paths
  const re = /href="(https?:\/\/xhamster\.com)?(\/videos\/[^"]+)"/g;
  let m;
  while ((m = re.exec(html)) && videos.length < limit * 3) {
    const path = m[2];
    if (path.includes('/creators/')) continue;
    if (seen.has(path)) continue;
    seen.add(path);
    // Extract ID from end of URL
    const idMatch = path.match(/-([a-zA-Z0-9]+)$/);
    if (!idMatch) continue;
    const vkey = idMatch[1];
    videos.push({ vkey, url: BASE + path, path });
  }
  return videos.slice(0, limit);
}

function extractTitle(html) {
  const m = html.match(/<title>([^<]+)<\/title>/);
  if (m) return m[1].replace(/\s*-\s*xHamster.*$/i, '').trim();
  const og = html.match(/og:title"\s+content="([^"]+)"/);
  return og ? og[1].trim() : 'Untitled';
}

function extractThumbnail(html) {
  const m = html.match(/og:image"\s+content="([^"]+)"/);
  return m ? m[1] : null;
}

function extractDuration(html) {
  const m = html.match(/"duration"\s*:\s*"?(\d+)"?/);
  if (m) return parseInt(m[1]);
  const m2 = html.match(/duration["']?\s*:\s*["']?(\d+):(\d+)/);
  if (m2) return parseInt(m2[1]) * 60 + parseInt(m2[2]);
  return 0;
}

function extractM3u8(html) {
  const m = html.match(/https:\/\/[^"]*\.m3u8[^"]*/);
  return m ? m[0].replace(/&amp;/g, '&') : null;
}

function extractViews(html) {
  const m = html.match(/([\d,.]+[KMB]?)\s*[Vv]iews/);
  return m ? m[1] : null;
}

async function getFeed(section = 'hot', page = 1) {
  const urls = {
    hot: `${BASE}/`,
    new: `${BASE}/new/`,
    trending: `${BASE}/trending/`,
  };
  const url = urls[section] || urls.hot;
  const html = await fetchHtml(page > 1 ? `${url}${page}` : url);
  const videos = extractVideos(html, 24);

  // Enrich with thumbnails from video pages (batch, limited)
  // For feed, we use a faster approach: extract thumbs from listing HTML
  const thumbs = {};
  const thumbRe = /<img[^>]+src="([^"]+)"[^>]*>/g;
  // Instead, fetch each video's og:image (slower but reliable for first load)
  // We'll do it lazily - return basic info, thumbnails fetched on demand
  return videos.map(v => ({
    vkey: v.vkey,
    url: v.url,
    title: v.path.split('/').pop().replace(/-/g, ' ').replace(/[a-zA-Z0-9]+$/, '').trim(),
  }));
}

async function getVideoInfo(vkey) {
  // First, find the full URL - try direct
  // vkey alone isn't enough, need to search or use known URL pattern
  // We'll fetch from search or try common patterns
  throw new Error('Use getVideoInfoByUrl with full URL');
}

async function getVideoInfoByUrl(videoUrl) {
  const html = await fetchHtml(videoUrl);
  const m3u8 = extractM3u8(html);
  const title = extractTitle(html);
  const thumbnail = extractThumbnail(html);
  const duration = extractDuration(html);
  const views = extractViews(html);

  // Parse qualities from m3u8 URL if it's a master playlist
  const streams = [];
  if (m3u8) {
    // The m3u8 URL pattern includes quality info, but let's fetch the playlist
    try {
      const plRes = await fetch(m3u8, { headers: { 'User-Agent': UA } });
      const plText = await plRes.text();
      const lines = plText.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('#EXT-X-STREAM-INF')) {
          const res = lines[i].match(/RESOLUTION=(\d+x\d+)/);
          const bw = lines[i].match(/BANDWIDTH=(\d+)/);
          const url = lines[i + 1]?.trim();
          if (url) {
            const fullUrl = new URL(url, m3u8).toString();
            const height = res ? parseInt(res[1].split('x')[1]) : 0;
            streams.push({
              quality: height || bw?.[1] || 'auto',
              url: fullUrl,
              bandwidth: bw ? parseInt(bw[1]) : 0,
            });
          }
        }
      }
    } catch {}
    // Fallback: use master URL directly
    if (streams.length === 0) {
      streams.push({ quality: 'auto', url: m3u8 });
    }
  }

  // Sort by quality descending
  streams.sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0));

  return { title, thumbnail, duration, views, streams, m3u8, url: videoUrl };
}

async function searchVideos(query, page = 1) {
  const url = `${BASE}/search/${encodeURIComponent(query)}${page > 1 ? `/${page}` : ''}`;
  const html = await fetchHtml(url);
  return extractVideos(html, 24).map(v => ({
    vkey: v.vkey,
    url: v.url,
    title: v.path.split('/').pop().replace(/-/g, ' ').replace(/[a-zA-Z0-9]+$/, '').trim(),
  }));
}

module.exports = { getFeed, getVideoInfoByUrl, searchVideos, fetchHtml, BASE };
