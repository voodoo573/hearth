// Hearth — offline-first service worker (per-app version)
// Lives at /app/sw.js so its scope is /app/. Hearth registers it via
// the relative path './sw.js' which resolves to /app/sw.js here.
// Bump CACHE_VERSION whenever you ship a new app build.

const CACHE_VERSION = 'hearth-v0.92.0';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  '/manifest.webmanifest',
  '/icons/icon-192-v74.png',
  '/icons/icon-512-v74.png',
  '/icons/apple-touch-icon-v74.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // addAll fails the whole install if any item misses, so add
      // individually with no-throw catches for safety.
      Promise.all(APP_SHELL.map(url =>
        cache.add(url).catch(() => null)
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // Background refresh — fetch new copy without blocking the response.
        fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('./'));
    })
  );
});
