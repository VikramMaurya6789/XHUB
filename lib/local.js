'use client';

/**
 * lib/local.js — client-side localStorage helpers for the community
 * features (ratings, follows, comments name, profile, notifications).
 * localStorage is the source of truth; API calls are best-effort.
 */

function safeLS() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readJSON(key, fallback) {
  const ls = safeLS();
  if (!ls) return fallback;
  try {
    const raw = ls.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  const ls = safeLS();
  if (!ls) return;
  try {
    ls.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable — local-first features just skip
  }
}

/** Display name from the profile page, or '' when unset. */
export function getDisplayName() {
  const profile = readJSON('xhub_profile', null);
  const name = profile && typeof profile.name === 'string' ? profile.name.trim() : '';
  return name;
}

/** Best-effort sync of a follow/unfollow to the server. Never throws. */
export async function syncFollow(uid, creatorId, name, action) {
  if (!uid || !creatorId) return;
  try {
    await fetch('/api/follows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, creatorId, name, action }),
    });
  } catch {
    // offline / server down — localStorage stays the source of truth
  }
}

/** Merge two follow lists (server + local) by creator id. */
export function mergeCreators(serverList, localNames) {
  const seen = new Set();
  const out = [];
  const push = (id, name) => {
    const key = String(id || '').toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({ id: String(id), name: name || String(id) });
  };
  (Array.isArray(serverList) ? serverList : []).forEach(c => push(c.id || c.name, c.name || c.id));
  (Array.isArray(localNames) ? localNames : []).forEach(n => push(n, n));
  return out;
}

export function creatorSlug(name) {
  return encodeURIComponent(
    String(name || 'official').trim().toLowerCase().replace(/\s+/g, '-')
  );
}

export function formatWatchTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}
