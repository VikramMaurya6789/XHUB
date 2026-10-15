/**
 * XHUB — Parental controls shared utilities (client-safe).
 *
 * Storage keys:
 *   xhub_parent_pin     — FNV-1a hash of the 4-digit PIN (NOT high security;
 *                         it only deters casual browsing on a shared device)
 *   xhub_parent_lock    — '1' when PIN lock is enabled
 *   xhub_parent_blocked — JSON array of blocked category slugs
 */

export const PARENTAL_PIN_KEY = 'xhub_parent_pin';
export const PARENTAL_LOCK_KEY = 'xhub_parent_lock';
export const PARENTAL_BLOCKED_KEY = 'xhub_parent_blocked';
export const PARENTAL_EVENT = 'xhub-parental';

// Simple FNV-1a hash with a salt. Casual deterrent only — anyone with
// localStorage access can clear the keys. Never treat this as real security.
export function hashPin(pin) {
  const str = 'xhub-pc|' + String(pin);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

function safeGet(key) {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

export function hasPin() {
  return !!safeGet(PARENTAL_PIN_KEY);
}

export function verifyPin(pin) {
  const stored = safeGet(PARENTAL_PIN_KEY);
  if (!stored) return false;
  return hashPin(pin) === stored;
}

export function isParentalLocked() {
  return safeGet(PARENTAL_LOCK_KEY) === '1' && hasPin();
}

// Returns blocked category slugs only when the lock is ON.
export function getBlockedSlugs() {
  if (!isParentalLocked()) return [];
  try {
    const raw = safeGet(PARENTAL_BLOCKED_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter(s => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

// Same keyword normalization the server uses for category feeds
// (lib/videos.js getFeed): "big-tits" -> ["big","tits"], all must match.
export function categoryWords(slug) {
  return String(slug || '')
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function videoInBlockedCategory(video, slug) {
  const title = (video?.title || '').toLowerCase();
  const words = categoryWords(slug);
  return words.length > 0 && words.every(w => title.includes(w));
}

// Filter out videos whose titles match any blocked category.
export function filterBlockedVideos(videos, blockedSlugs) {
  if (!blockedSlugs || blockedSlugs.length === 0) return videos;
  return (videos || []).filter(v => !blockedSlugs.some(s => videoInBlockedCategory(v, s)));
}

export function notifyParentalChanged() {
  try {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(PARENTAL_EVENT));
  } catch {}
}
