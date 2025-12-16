const CACHE_NAME = 'sl-demo-v3';
const ASSETS = [
  'index.html',
  'css/style.css',
  'styles.css',
  'app.js',
  'manifest.json',
  'icons/icon-192.svg',
  'icons/icon-512.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'scripts/public-data.js',
  'pages/about.html',
  'pages/documents.html',
  'pages/gallery.html',
  'pages/rrss.html',
  'pages/contact.html',
  'assets/images/photo1.svg',
  'assets/images/photo2.svg',
  'assets/images/photo3.svg'
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
  // take control immediately and clear old caches
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // prefer network for navigation requests (so index.html updates), fallback to cache
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(resp => {
      return caches.open(CACHE_NAME).then(cache => { cache.put(req, resp.clone()); return resp; });
    }).catch(() => caches.match('index.html')));
    return;
  }
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(resp => {
      return caches.open(CACHE_NAME).then(cache => { cache.put(req, resp.clone()); return resp; });
    }).catch(() => caches.match('index.html')))
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
