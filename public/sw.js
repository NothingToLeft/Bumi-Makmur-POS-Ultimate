const CACHE_NAME = 'bumi-makmur-pos-hybrid-v4.2.0';
const APP_SHELL = [
  '/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/logo-bm.svg',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigasi memakai network-first agar versi terbaru cepat terbaca, tetapi tidak pernah memaksa reload klien.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put('/index.html', response.clone())));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Aset memakai stale-while-revalidate agar UI tetap cepat saat sinyal buruk.
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => {
        if (response.ok) event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone())));
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
