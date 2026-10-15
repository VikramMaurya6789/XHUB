/* XHUB service worker — minimal offline/PWA shell.
 * - cache-first for immutable Next.js static assets (/_next/static/*)
 * - network-first for pages and other same-origin GETs (except video-byte proxies)
 * - never caches /api/vproxy stream bytes
 */
const STATIC_CACHE = 'xhub-static-v1';
const PAGE_CACHE = 'xhub-pages-v1';
const ALLOWED = new Set([STATIC_CACHE, PAGE_CACHE]);

self.addEventListener('install', () => {
  // Activate immediately so updates roll out on next load.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !ALLOWED.has(k))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function isStaticAsset(url) {
  return url.origin === self.location.origin && url.pathname.startsWith('/_next/static/');
}

function isBypassed(url) {
  // Video bytes + live stream lookups must never be cached.
  if (url.origin !== self.location.origin) return true;
  return (
    url.pathname.startsWith('/api/vproxy') ||
    url.pathname.startsWith('/api/stream')
  );
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok) cache.put(request, res.clone());
  return res;
}

async function networkFirst(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const res = await fetch(request);
    // Only cache small, safe document/API responses.
    if (res && res.ok && !isBypassed(new URL(request.url))) {
      cache.put(request, res.clone());
    }
    return res;
  } catch (err) {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (isBypassed(url)) return; // let the browser handle stream bytes directly
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
  }
});
