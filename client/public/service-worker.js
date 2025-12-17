const CACHE_NAME = 'ecosign-cache-v2';
const urlsToCache = [
  '/assets/icons/icon-72x72.png',
  '/assets/icons/icon-96x96.png',
  '/assets/icons/icon-128x128.png',
  '/assets/icons/icon-144x144.png',
  '/assets/icons/icon-152x152.png',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-384x384.png',
  '/assets/icons/icon-512x512.png',
];

// Solo activar en producción (no en localhost)
const isProduction = !self.location.hostname.includes('localhost') && !self.location.hostname.includes('127.0.0.1');

self.addEventListener('install', (event) => {
  if (!isProduction) {
    console.log('[SW] Service Worker disabled in development');
    self.skipWaiting();
    return;
  }
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((err) => {
        console.warn('[SW] Cache addAll failed:', err);
      })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Bypass Service Worker in development
  if (!isProduction) {
    return;
  }

  const { request } = event;
  // Network-first for HTML/JS/CSS to avoid serving stale hashed assets
  if (request.destination === 'document' || request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for icons/others
  event.respondWith(
    caches.match(request)
      .then((response) => response || fetch(request))
      .catch(() => fetch(request))
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
