/**
 * XHUB — Video Data Service (xHamster Provider)
 * Routes all video catalog, feed, and search queries through xHamster.
 */

import {
  getFeed,
  searchVideos,
  getVideoByVkey,
  getVideoInfo,
  getVideoInfoByUrl,
  getStreams,
  POPULAR_CATEGORIES,
  SPOTLIGHT_CREATORS,
} from './xhamster.js';

import {
  TOP_PORNSTARS,
  getPornstarBySlug,
  searchPornstars,
} from './pornstars.js';

export async function getThumbRawUrl(vkey) {
  try {
    const video = await getVideoByVkey(vkey);
    return video?.thumbRaw || video?.thumb || null;
  } catch {
    return null;
  }
}

export const getVideo = getVideoByVkey;

export {
  getFeed,
  searchVideos,
  getVideoByVkey,
  getVideoInfo,
  getVideoInfoByUrl,
  getStreams,
  POPULAR_CATEGORIES,
  SPOTLIGHT_CREATORS,
  TOP_PORNSTARS,
  getPornstarBySlug,
  searchPornstars,
};
