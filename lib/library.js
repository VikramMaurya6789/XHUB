'use client';
// Shared client-side helpers for XHUB library features.
// Everything here is localStorage-based (privacy-first, per-device).
//
// Keys:
//   xhub_playlists           [{id, name, vkeys: [], ts}]
//   xhub_liked               [vkey, ...]
//   xhub_watchlater_folders  [{id, name, vkeys: []}]   (migrated from xhub_watch_later)
//   xhub_library_cache       {vkey: {vkey, title, thumb, ...}}  (lets vkey-only
//                            collections render full video cards)

const isBrowser = () => typeof window !== 'undefined' && !!window.localStorage;

export function readLS(key, fallback) {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeLS(key, val) {
  if (!isBrowser()) return false;
  try {
    localStorage.setItem(key, JSON.stringify(val));
    return true;
  } catch {
    return false;
  }
}

export const vkOf = v => (v && (v.vkey || v.id) != null ? String(v.vkey || v.id) : null);

const newId = prefix =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// ---------------------------------------------------------------------------
// Video meta cache — keeps a small snapshot of every video the user saves so
// playlists / liked / folders (which store only vkeys) can render cards.
// ---------------------------------------------------------------------------

const CACHE_KEY = 'xhub_library_cache';
const CACHE_MAX = 800;

export function cacheVideo(video) {
  if (!video || !isBrowser()) return;
  const vkey = vkOf(video);
  if (!vkey) return;
  try {
    const cache = readLS(CACHE_KEY, {}) || {};
    cache[vkey] = {
      vkey,
      title: video.title,
      thumb: video.thumb,
      duration: video.duration,
      views: video.views,
      age: video.age,
      rating: video.rating,
      hd: video.hd,
      uploader: video.uploader
        ? { name: video.uploader.name, verified: video.uploader.verified }
        : undefined,
      _ts: Date.now(),
    };
    const keys = Object.keys(cache);
    if (keys.length > CACHE_MAX) {
      keys.sort((a, b) => (cache[a]._ts || 0) - (cache[b]._ts || 0));
      for (const k of keys.slice(0, keys.length - CACHE_MAX)) delete cache[k];
    }
    writeLS(CACHE_KEY, cache);
  } catch {}
}

export function getCachedVideo(vkey) {
  if (vkey == null) return null;
  const cache = readLS(CACHE_KEY, {}) || {};
  const entry = cache[String(vkey)];
  return entry && entry.title ? entry : null;
}

// Resolve vkeys -> video objects (cache first, then /api/video for misses).
export async function resolveVideos(vkeys) {
  const keys = (vkeys || []).map(String).filter(Boolean);
  if (!keys.length || !isBrowser()) return [];
  const found = [];
  const missing = [];
  for (const vk of keys) {
    const c = getCachedVideo(vk);
    if (c) found.push(c);
    else missing.push(vk);
  }
  const fetched = [];
  const CONC = 6;
  for (let i = 0; i < missing.length; i += CONC) {
    const batch = missing.slice(i, i + CONC);
    const results = await Promise.all(
      batch.map(vk =>
        fetch(`/api/video?vkey=${encodeURIComponent(vk)}`)
          .then(r => (r.ok ? r.json() : null))
          .then(d => {
            if (d) {
              cacheVideo(d);
              return d;
            }
            return null;
          })
          .catch(() => null)
      )
    );
    for (const d of results) if (d) fetched.push(d);
  }
  const byKey = {};
  for (const v of [...found, ...fetched]) byKey[String(vkOf(v))] = v;
  return keys.map(vk => byKey[vk]).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Playlists — xhub_playlists = [{id, name, vkeys: [], ts}]
// ---------------------------------------------------------------------------

const PLAYLISTS_KEY = 'xhub_playlists';

export function getPlaylists() {
  const raw = readLS(PLAYLISTS_KEY, []);
  const list = Array.isArray(raw) ? raw.filter(p => p && typeof p === 'object' && p.id) : [];
  // normalize
  return list.map(p => ({
    id: String(p.id),
    name: String(p.name || 'Untitled playlist').slice(0, 80),
    vkeys: Array.isArray(p.vkeys) ? p.vkeys.map(String) : [],
    ts: p.ts || 0,
  }));
}

export function savePlaylists(list) {
  writeLS(PLAYLISTS_KEY, list);
  return list;
}

export function getPlaylist(id) {
  return getPlaylists().find(p => p.id === String(id)) || null;
}

export function createPlaylist(name) {
  const clean = String(name || '').trim().slice(0, 80) || 'Untitled playlist';
  const pl = { id: newId('pl'), name: clean, vkeys: [], ts: Date.now() };
  savePlaylists([pl, ...getPlaylists()]);
  return pl;
}

export function renamePlaylist(id, name) {
  const clean = String(name || '').trim().slice(0, 80);
  if (!clean) return getPlaylists();
  return savePlaylists(
    getPlaylists().map(p => (p.id === String(id) ? { ...p, name: clean, ts: Date.now() } : p))
  );
}

export function deletePlaylist(id) {
  return savePlaylists(getPlaylists().filter(p => p.id !== String(id)));
}

// Returns true if the video was added, false if it was removed.
export function toggleInPlaylist(id, video) {
  const vkey = vkOf(video);
  if (!vkey) return null;
  let added = false;
  const next = getPlaylists().map(p => {
    if (p.id !== String(id)) return p;
    const has = p.vkeys.includes(vkey);
    added = !has;
    if (!has) cacheVideo(video);
    return {
      ...p,
      vkeys: has ? p.vkeys.filter(k => k !== vkey) : [vkey, ...p.vkeys],
      ts: Date.now(),
    };
  });
  savePlaylists(next);
  return added;
}

export function removeFromPlaylist(id, vkey) {
  const vk = String(vkey);
  return savePlaylists(
    getPlaylists().map(p =>
      p.id === String(id) ? { ...p, vkeys: p.vkeys.filter(k => k !== vk), ts: Date.now() } : p
    )
  );
}

// Ids of playlists that contain the vkey.
export function playlistsContaining(vkey) {
  const vk = String(vkey);
  return getPlaylists()
    .filter(p => p.vkeys.includes(vk))
    .map(p => p.id);
}

// ---------------------------------------------------------------------------
// Liked videos — xhub_liked = [vkey, ...]
// ---------------------------------------------------------------------------

const LIKED_KEY = 'xhub_liked';

export function getLikedVkeys() {
  const raw = readLS(LIKED_KEY, []);
  return Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
}

export function isLiked(vkey) {
  if (vkey == null) return false;
  return getLikedVkeys().includes(String(vkey));
}

// Returns the new liked state (true = now liked).
export function toggleLiked(video) {
  const vkey = vkOf(video);
  if (!vkey) return false;
  const list = getLikedVkeys();
  if (list.includes(vkey)) {
    writeLS(LIKED_KEY, list.filter(k => k !== vkey));
    return false;
  }
  cacheVideo(video);
  writeLS(LIKED_KEY, [vkey, ...list]);
  return true;
}

export function clearLiked() {
  writeLS(LIKED_KEY, []);
}

// ---------------------------------------------------------------------------
// Watch Later folders — xhub_watchlater_folders = [{id, name, vkeys: []}]
//
// Backward compat: the legacy flat list `xhub_watch_later` (still written by
// VideoCard + WatchClient toggles) is migrated into a "Default" folder on
// first load, and new flat-list saves are merged into "Default" on later
// loads. Removing from the Default folder also removes from the flat list.
// ---------------------------------------------------------------------------

const FOLDERS_KEY = 'xhub_watchlater_folders';
const FLAT_KEY = 'xhub_watch_later';
export const DEFAULT_FOLDER_ID = 'default';

export function getFlatWatchLater() {
  const raw = readLS(FLAT_KEY, []);
  return Array.isArray(raw) ? raw : [];
}

function normalizeFolders(raw) {
  return (Array.isArray(raw) ? raw : [])
    .filter(f => f && typeof f === 'object' && f.id)
    .map(f => ({
      id: String(f.id),
      name: String(f.name || 'Untitled folder').slice(0, 80),
      vkeys: Array.isArray(f.vkeys) ? [...new Set(f.vkeys.map(String))] : [],
    }));
}

export function getWatchLaterFolders() {
  let folders = readLS(FOLDERS_KEY, null);
  if (!Array.isArray(folders)) {
    // First load: migrate the legacy flat list into a "Default" folder.
    const flat = getFlatWatchLater();
    const vkeys = [];
    for (const v of flat) {
      const vk = vkOf(v);
      if (vk && !vkeys.includes(vk)) {
        vkeys.push(vk);
        cacheVideo(v);
      }
    }
    folders = [{ id: DEFAULT_FOLDER_ID, name: 'Default', vkeys }];
    writeLS(FOLDERS_KEY, folders);
    return folders;
  }
  folders = normalizeFolders(folders);
  if (!folders.some(f => f.id === DEFAULT_FOLDER_ID)) {
    folders = [{ id: DEFAULT_FOLDER_ID, name: 'Default', vkeys: [] }, ...folders];
  }
  // Merge any new flat-list saves (from card toggles) into Default.
  const flatVkeys = getFlatWatchLater()
    .map(vkOf)
    .filter(Boolean);
  let changed = false;
  folders = folders.map(f => {
    if (f.id !== DEFAULT_FOLDER_ID) return f;
    const merged = [...f.vkeys];
    for (const vk of flatVkeys) {
      if (!merged.includes(vk)) {
        merged.push(vk);
        changed = true;
      }
    }
    return changed ? { ...f, vkeys: merged } : f;
  });
  if (changed) writeLS(FOLDERS_KEY, folders);
  return folders;
}

export function saveWatchLaterFolders(folders) {
  writeLS(FOLDERS_KEY, normalizeFolders(folders));
  return getWatchLaterFolders();
}

export function createWatchLaterFolder(name) {
  const clean = String(name || '').trim().slice(0, 80) || 'Untitled folder';
  const folder = { id: newId('wl'), name: clean, vkeys: [] };
  saveWatchLaterFolders([...getWatchLaterFolders(), folder]);
  return folder;
}

export function renameWatchLaterFolder(id, name) {
  const clean = String(name || '').trim().slice(0, 80);
  if (!clean) return getWatchLaterFolders();
  return saveWatchLaterFolders(
    getWatchLaterFolders().map(f => (f.id === String(id) ? { ...f, name: clean } : f))
  );
}

export function deleteWatchLaterFolder(id) {
  if (String(id) === DEFAULT_FOLDER_ID) return getWatchLaterFolders();
  const folders = getWatchLaterFolders().filter(f => f.id !== String(id));
  saveWatchLaterFolders(folders);
  return folders;
}

// Move a vkey into a folder (removes it from all other folders).
export function moveToFolder(folderId, vkey, video) {
  const vk = String(vkey);
  if (video) cacheVideo(video);
  const folders = getWatchLaterFolders().map(f => ({
    ...f,
    vkeys: f.id === String(folderId)
      ? [...new Set([vk, ...f.vkeys])]
      : f.vkeys.filter(k => k !== vk),
  }));
  // Keep the legacy flat list in sync as the union of all folders.
  const union = [...new Set(folders.flatMap(f => f.vkeys))];
  const flat = getFlatWatchLater();
  const byKey = {};
  for (const v of flat) {
    const k = vkOf(v);
    if (k) byKey[k] = v;
  }
  const flatEntry = byKey[vk] || video || getCachedVideo(vk) || { vkey: vk };
  const nextFlat = union.map(k => byKey[k] || (k === vk ? flatEntry : { vkey: k }));
  writeLS(FLAT_KEY, nextFlat);
  saveWatchLaterFolders(folders);
  return folders;
}

export function removeFromFolder(folderId, vkey) {
  const vk = String(vkey);
  const folders = getWatchLaterFolders().map(f =>
    f.id === String(folderId) ? { ...f, vkeys: f.vkeys.filter(k => k !== vk) } : f
  );
  if (String(folderId) === DEFAULT_FOLDER_ID) {
    writeLS(
      FLAT_KEY,
      getFlatWatchLater().filter(v => vkOf(v) !== vk)
    );
  }
  saveWatchLaterFolders(folders);
  return folders;
}

export function clearWatchLaterFolders() {
  writeLS(FOLDERS_KEY, [{ id: DEFAULT_FOLDER_ID, name: 'Default', vkeys: [] }]);
  writeLS(FLAT_KEY, []);
  return getWatchLaterFolders();
}
