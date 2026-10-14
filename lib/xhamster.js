import {
  getFeed,
  searchVideos,
  getVideoByVkey,
  getVideoInfo,
  getVideoInfoByUrl,
  POPULAR_CATEGORIES,
  SPOTLIGHT_CREATORS
} from './videos.js';

export async function fetchHtml(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    return `<!-- Fetch error: ${err.message} -->`;
  }
}

export {
  getFeed,
  searchVideos,
  getVideoByVkey,
  getVideoInfo,
  getVideoInfoByUrl,
  POPULAR_CATEGORIES,
  SPOTLIGHT_CREATORS
};

export const BASE = 'https://www.redtube.com';
