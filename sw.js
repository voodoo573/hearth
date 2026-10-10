// Hearth — root service worker (scope "/": the landing page and shared assets).
//
// v0.92.1 — reliable updates.
// - It no longer handles anything under /app/. The app has its own worker
//   (/app/sw.js, scope /app/), so the two never fight over the app shell. The
//   landing page registers both, so the app is still cached for offline use as
//   soon as someone visits the landing page or installs from it.
// - Page loads (navigations) are network-first, falling back to the cache when
//   offline. Static assets (icons, manifest) stay cache-first.
// - skipWaiting + clients.claim, and old caches are deleted on activate.
// Bump CACHE_VERSION whenever you ship a new build (keep it in step with
// CACHE_VERSION in /app/sw.js).

const CACHE_VERSION = 'hearth-site-v1.1.1';
const PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192-v75.png',
  '/icons/icon-512-v75.png',
  '/icons/apple-touch-icon-v75.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => Promise.all(PRECACHE.map((url) =>
      cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
    ))).then(() => self.skipWaiting())
  );
});

// Delete this worker's old caches, plus every cache left by builds before
// v0.92.1, when the root and app workers both used 'hearth-v<version>'. The
// app worker's own current cache ('hearth-v<version>', v0.92.1 and later) is
// left alone; it cleans up after itself.
function isLegacySharedCache(name) {
  const m = /^hearth-v(\d+)\.(\d+)\.(\d+)$/.exec(name);
  if (!m) return false;
  const [maj, min, pat] = [+m[1], +m[2], +m[3]];
  return maj === 0 && (min < 92 || (min === 92 && pat === 0));
}
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names
      .filter((n) => (n.startsWith('hearth-site-') && n !== CACHE_VERSION) || isLegacySharedCache(n))
      .map((n) => caches.delete(n))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function isHtmlRequest(req) {
  return req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // The app (and its worker) own /app/; big downloads go straight to the network.
  if (url.pathname === '/app' || url.pathname.startsWith('/app/')) return;
  if (url.pathname.startsWith('/download/')) return;

  if (isHtmlRequest(req)) {
    // Network-first so a new landing page shows on the next load; cache when offline.
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match('/')))
    );
    return;
  }

  // Static assets: cache-first (icon file names are versioned).
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }))
  );
});
