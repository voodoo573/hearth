// Hearth — offline-first service worker
// Strategy: cache-first for the app shell, network-first for the landing page.
// Bump CACHE_VERSION whenever you ship a new app build.

const CACHE_VERSION = 'hearth-v0.91.3';
const APP_SHELL = [
  '/app/',
  '/app/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192-v74.png',
  '/icons/icon-512-v74.png',
  '/icons/apple-touch-icon-v74.png',
];

// Pre-cache the app shell on install so installs work offline.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Clean up old caches on activate.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch handler:
// - For /app/* requests: cache-first, fall back to network, fall back to /app/.
// - For everything else: network-first, fall back to cache.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Only handle same-origin.
  if (url.origin !== location.origin) return;

  if (url.pathname.startsWith('/app/')) {
    // App shell — cache-first.
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          // Cache the response for next time.
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          return res;
        }).catch(() => caches.match('/app/'));
      })
    );
  } else {
    // Landing + icons + everything else — network-first so updates ship live.
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
  }
});
