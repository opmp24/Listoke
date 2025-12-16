const CACHE_NAME = 'sl-demo-v3';
const ASSETS = [
  'index.html',
  'style.css',
  'styles.css',
  'app.js',
  'admin.html',
  'manifest.json',
  'icons/icon-192.svg',
  'icons/icon-512.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'scripts/admin.js',
  'scripts/public-data.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(resp => {
      return caches.open(CACHE_NAME).then(cache => { cache.put(req, resp.clone()); return resp; });
    }).catch(() => caches.match('index.html')))
  );
});
