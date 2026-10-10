// Hearth — app service worker (scope /app/). Registered by the app as
// /app/sw.js?v=<APP_VERSION>, and by the landing page with the same URL, so the
// app shell is cached for offline use before the first launch.
//
// v0.92.1 — reliable updates.
// - Page loads (/app/, /app/index.html and any other navigation) are
//   network-first: a new build shows on the next normal load. When offline,
//   or when the network doesn't answer within a few seconds, the cached copy
//   is served instead.
// - Static assets (icons, manifests) stay cache-first.
// - skipWaiting + clients.claim, and every old cache is deleted on activate
//   (including the 'hearth-v*' caches from the root worker before v0.92.1).
// Bump CACHE_VERSION whenever you ship a new build (keep it in step with
// CACHE_VERSION in /sw.js).

const CACHE_VERSION = 'hearth-v1.1.0';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  '/manifest.webmanifest',
  '/icons/icon-192-v75.png',
  '/icons/icon-512-v75.png',
  '/icons/apple-touch-icon-v75.png',
  // v0.93.0 — painted battle maps: renderer, texture packs and picker sprite,
  // precached so maps paint offline after the first visit. Relative paths keep
  // them working under the Android (Capacitor) origin too.
  './painted/painted-maps.js',
  './painted/painted-worker.js',
  './painted/packs/wilderness.js',
  './painted/packs/underground.js',
  './painted/packs/settlement.js',
  './painted/packs/water.js',
  './painted/packs/hazard.js',
  './painted/thumbs.webp',
];
const SHELL_URL = new URL('./', self.registration ? self.registration.scope : self.location.href).href;
const NAV_TIMEOUT_MS = 6000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // cache: 'reload' skips the HTTP cache so a fresh build is stored.
      // Added one by one so a single missing file can't fail the install.
      Promise.all(APP_SHELL.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names
      // Keep this build's cache and the landing-page worker's cache ('hearth-site-*', it cleans up its own).
      .filter((n) => n !== CACHE_VERSION && !n.startsWith('hearth-site-'))
      .map((n) => caches.delete(n))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function isHtmlRequest(req, url) {
  if (req.mode === 'navigate') return true;
  if (url.pathname === '/app/' || url.pathname === '/app' || url.pathname === '/app/index.html') return true;
  return (req.headers.get('accept') || '').includes('text/html');
}

function networkFirst(req) {
  return new Promise((resolve) => {
    let settled = false;
    const fromCache = () => caches.match(req, { ignoreSearch: true })
      .then((hit) => hit || caches.match(SHELL_URL))
      .then((hit) => hit || caches.match(new URL('index.html', SHELL_URL).href));
    const timer = setTimeout(() => {
      // Slow network: answer from the cache if there is a copy; otherwise keep waiting.
      fromCache().then((hit) => { if (hit && !settled) { settled = true; resolve(hit); } });
    }, NAV_TIMEOUT_MS);
    fetch(req).then((res) => {
      clearTimeout(timer);
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        const shellCopy = res.clone();
        caches.open(CACHE_VERSION).then((c) => Promise.all([
          c.put(req, copy),
          c.put(SHELL_URL, shellCopy), // offline fallback for any app URL
        ])).catch(() => {});
      }
      if (!settled) { settled = true; resolve(res); }
    }).catch(() => {
      clearTimeout(timer);
      fromCache().then((hit) => {
        if (settled) return;
        settled = true;
        resolve(hit || new Response('Hearth is offline and has not been cached yet.', { status: 503, headers: { 'Content-Type': 'text/plain' } }));
      });
    });
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/download/')) return;

  if (isHtmlRequest(req, url)) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Static assets: cache-first, filled on first use.
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
