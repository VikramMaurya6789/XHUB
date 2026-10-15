/**
 * XHUB — tiny KV-or-memory store abstraction.
 *
 * Tries @vercel/kv via a bundler-ignored dynamic import (never breaks the
 * build when the package is absent) and falls back to a process-local Map.
 *
 * API:
 *   sget(key)            -> value | null
 *   sset(key, value)     -> true
 *   slist(pattern)       -> [{ key, value }, ...]  (pattern like "xhub:uploads:*")
 *   sdel(key)            -> true
 *
 * NOTE: on serverless, the in-memory fallback resets on cold starts — fine for
 * lightweight features (uploads, party rooms, collab playlists).
 */

const mem = new Map();
let kvClient = null;
let kvChecked = false;

async function getKV() {
  if (kvChecked) return kvClient;
  kvChecked = true;
  try {
    // webpackIgnore keeps the bundler from resolving this optional dependency.
    const mod = await import(/* webpackIgnore: true */ '@vercel/kv');
    kvClient = mod && mod.kv ? mod.kv : null;
  } catch {
    kvClient = null;
  }
  return kvClient;
}

export async function sget(key) {
  const kv = await getKV();
  if (kv) {
    try {
      const v = await kv.get(key);
      return v === undefined ? null : v;
    } catch { /* fall through to memory */ }
  }
  return mem.has(key) ? mem.get(key) : null;
}

export async function sset(key, value) {
  const kv = await getKV();
  if (kv) {
    try {
      await kv.set(key, value);
      return true;
    } catch { /* fall through to memory */ }
  }
  mem.set(key, value);
  return true;
}

export async function sdel(key) {
  const kv = await getKV();
  if (kv) {
    try {
      await kv.del(key);
    } catch { /* fall through to memory */ }
  }
  mem.delete(key);
  return true;
}

export async function slist(pattern) {  const kv = await getKV();
  if (kv) {
    try {
      const keys = await kv.keys(pattern);
      const out = [];
      for (const k of keys) {
        const v = await kv.get(k);
        out.push({ key: k, value: v });
      }
      return out;
    } catch { /* fall through to memory */ }
  }
  const prefix = String(pattern).replace(/\*$/, '');
  const out = [];
  for (const [k, v] of mem) {
    if (k.startsWith(prefix)) out.push({ key: k, value: v });
  }
  return out;
}

/**
 * Append `item` to the JSON array stored at `key`, keeping at most `max`
 * entries (oldest dropped). Returns the trimmed array.
 */
export async function spush(key, item, max = 200) {
  const current = await sget(key);
  const arr = Array.isArray(current) ? current : [];
  arr.push(item);
  const trimmed = arr.length > max ? arr.slice(arr.length - max) : arr;
  await sset(key, trimmed);
  return trimmed;
}

/** Which backend is in effect: 'kv' when KV env vars exist, else 'memory'. */
export function storeBackend() {
  return process.env.KV_REST_API_URL ? 'kv' : 'memory';
}
