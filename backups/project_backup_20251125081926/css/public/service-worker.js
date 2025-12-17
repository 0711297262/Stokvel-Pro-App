/* service-worker.js — Stokvel PRO PWA service worker (v1) */
const CACHE_VERSION = 'stokvelpro-v1';
const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/groups.html',
  '/group_overview.html',
  '/profile.html',
  '/notifications.html',
  '/css/layout.css',
  '/js/theme.js',
  '/js/load-partials.js',
  '/manifest.webmanifest',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png'
];

// Install: cache core assets
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(CACHE_ASSETS))
  );
});

// Activate: cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => { if (k !== CACHE_VERSION) return caches.delete(k); })
    )).then(() => self.clients.claim())
  );
});

// Fetch: Cache-first, then network fallback, with stale-while-revalidate behavior
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Skip analytics / external origins (allow network)
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(resp => {
        // update cache in background for same-origin requests
        if (resp && resp.status === 200 && event.request.method === 'GET') {
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, resp.clone()));
        }
        return resp.clone ? resp : resp;
      }).catch(()=> null);

      // Return cached if available, otherwise network; but if we have both return cached immediately and update in background
      return cached || networkFetch || new Response(null, { status: 504, statusText: 'offline' });
    })
  );
});

// optional: message handling to skipWaiting from client
self.addEventListener('message', event => {
  if(event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
