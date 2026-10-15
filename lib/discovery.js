/**
 * XHUB — Discovery helpers (client-safe)
 * Shared localStorage persistence + filtering for:
 *  - "Not interested" hidden vkeys        -> xhub_hidden (array of vkeys)
 *  - Hide watched toggle                  -> xhub_hide_watched (boolean)
 *  - Watch history vkeys                  -> xhub_history (array of video objects)
 *  - Trending searches                    -> xhub_searches ({ term: count })
 *
 * Components that render feeds call filterDiscoveryVideos() on render and
 * subscribe to xhub:hidden-changed / xhub:hide-watched-changed events so a
 * change in one card re-renders every feed.
 */
import { useEffect, useState } from 'react';

export const HIDDEN_KEY = 'xhub_hidden';
export const HIDE_WATCHED_KEY = 'xhub_hide_watched';
export const HISTORY_KEY = 'xhub_history';
export const SEARCHES_KEY = 'xhub_searches';

function safeParse(raw, fallback) {
  try {
    const v = JSON.parse(raw);
    return v === undefined ? fallback : v;
  } catch {
    return fallback;
  }
}

/* ---------------- Not interested (hidden vkeys) ---------------- */

export function getHiddenVkeys() {
  if (typeof window === 'undefined') return [];
  const v = safeParse(localStorage.getItem(HIDDEN_KEY), []);
  return Array.isArray(v) ? v.map(String) : [];
}

export function isVkeyHidden(vkey) {
  return getHiddenVkeys().includes(String(vkey));
}

export function hideVkey(vkey) {
  if (typeof window === 'undefined') return;
  const set = new Set(getHiddenVkeys());
  set.add(String(vkey));
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...set]));
  } catch {}
  window.dispatchEvent(new CustomEvent('xhub:hidden-changed', { detail: String(vkey) }));
}

export function unhideVkey(vkey) {
  if (typeof window === 'undefined') return;
  const updated = getHiddenVkeys().filter(k => k !== String(vkey));
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(updated));
  } catch {}
  window.dispatchEvent(new CustomEvent('xhub:hidden-changed', { detail: String(vkey) }));
}

/* ---------------- Hide watched toggle ---------------- */

export function isHideWatchedOn() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(HIDE_WATCHED_KEY) === '1';
}

export function setHideWatched(on) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HIDE_WATCHED_KEY, on ? '1' : '0');
  } catch {}
  window.dispatchEvent(new CustomEvent('xhub:hide-watched-changed', { detail: !!on }));
}

export function getHistoryVkeySet() {
  if (typeof window === 'undefined') return new Set();
  const history = safeParse(localStorage.getItem(HISTORY_KEY), []);
  const arr = Array.isArray(history) ? history : [];
  return new Set(arr.map(item => String(item?.vkey || item?.id || '')).filter(Boolean));
}

/* ---------------- Feed filtering ---------------- */

/**
 * Remove hidden + (optionally) watched videos from a feed list.
 * All feed components must apply this on render.
 */
export function filterDiscoveryVideos(videos) {
  if (!Array.isArray(videos)) return videos;
  const hidden = new Set(getHiddenVkeys());
  const hideWatched = isHideWatchedOn();
  const watched = hideWatched ? getHistoryVkeySet() : null;
  if (hidden.size === 0 && !hideWatched) return videos;
  return videos.filter(v => {
    const k = String(v?.vkey || v?.id || '');
    if (!k) return true;
    if (hidden.has(k)) return false;
    if (hideWatched && watched.has(k)) return false;
    return true;
  });
}

/**
 * Version counter that bumps whenever hidden set / hide-watched changes,
 * so feed components re-render via useMemo deps.
 */
export function useDiscoveryVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion(v => v + 1);
    window.addEventListener('xhub:hidden-changed', bump);
    window.addEventListener('xhub:hide-watched-changed', bump);
    window.addEventListener('storage', bump);
    return () => {
      window.removeEventListener('xhub:hidden-changed', bump);
      window.removeEventListener('xhub:hide-watched-changed', bump);
      window.removeEventListener('storage', bump);
    };
  }, []);
  return version;
}

/* ---------------- Shuffle (Fisher-Yates) ---------------- */

export function shuffleArray(arr) {
  const a = [...(arr || [])];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------- Advanced client filters (/new, /best) ---------------- */

export const DURATION_FILTERS = [
  { id: 'all', label: 'All lengths' },
  { id: 'short', label: '< 5 min' },
  { id: 'medium', label: '5–20 min' },
  { id: 'long', label: '20+ min' },
];

export const QUALITY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'hd', label: 'HD' },
  { id: 'sd', label: 'SD' },
];

export const DATE_FILTERS = [
  { id: 'all', label: 'Any time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
];

export function isVideoHD(video) {
  if (Array.isArray(video?.qualities) && video.qualities.length > 0) {
    return video.qualities.includes('1080p') || video.qualities.includes('720p');
  }
  return video?.hd !== false;
}

export function matchesDuration(video, dur) {
  const sec = video?.durationSec || 0;
  if (dur === 'short') return sec > 0 && sec < 300;
  if (dur === 'medium') return sec >= 300 && sec <= 1200;
  if (dur === 'long') return sec > 1200;
  return true;
}

export function matchesDate(video, dateId) {
  if (dateId === 'all') return true;
  const raw = video?.publishDate || video?.added || '';
  const ts = new Date(raw).getTime();
  if (isNaN(ts)) return false;
  const ageMs = Date.now() - ts;
  if (ageMs < 0) return false;
  if (dateId === 'today') return ageMs < 24 * 3600 * 1000;
  if (dateId === 'week') return ageMs < 7 * 24 * 3600 * 1000;
  if (dateId === 'month') return ageMs < 30 * 24 * 3600 * 1000;
  return true;
}

/* ---------------- Watch page tag derivation ---------------- */

const TAG_STOPWORDS = new Set([
  'the', 'and', 'with', 'from', 'that', 'this', 'her', 'his', 'she',
  'him', 'you', 'are', 'was', 'were', 'has', 'have', 'had', 'for',
  'all', 'but', 'not', 'into', 'out', 'over', 'under', 'gets', 'got',
  'hot', 'big', 'new', 'sex', 'xxx', 'porn', 'full', 'hd',
]);

export function deriveTagsFromTitle(title, max = 8) {
  if (!title) return [];
  const seen = new Set();
  const out = [];
  for (const w of String(title).toLowerCase().split(/[^a-z0-9]+/)) {
    if (w.length <= 3 || TAG_STOPWORDS.has(w) || seen.has(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length >= max) break;
  }
  return out;
}

/* ---------------- Trending searches ---------------- */

export const DEFAULT_TRENDING_SEARCHES = ['MILF', 'POV', 'Amateur', 'Japanese'];

export function trackSearch(term) {
  if (typeof window === 'undefined') return;
  const t = String(term || '').trim().toLowerCase();
  if (!t || t.length < 2) return;
  try {
    const counts = safeParse(localStorage.getItem(SEARCHES_KEY), {});
    counts[t] = (counts[t] || 0) + 1;
    localStorage.setItem(SEARCHES_KEY, JSON.stringify(counts));
  } catch {}
}

/**
 * Top 8 tracked search terms (by count), followed by 4 hardcoded defaults
 * (defaults that duplicate a tracked term are skipped).
 */
export function getTrendingSearches() {
  const defaults = [...DEFAULT_TRENDING_SEARCHES];
  if (typeof window === 'undefined') return defaults;
  const counts = safeParse(localStorage.getItem(SEARCHES_KEY), {});
  const ranked = Object.entries(counts)
    .filter(([t, c]) => t && t.length > 1 && c > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t)
    .slice(0, 8);
  const seen = new Set(ranked.map(t => t.toLowerCase()));
  const extra = defaults.filter(d => !seen.has(d.toLowerCase()));
  return [...ranked, ...extra];
}
