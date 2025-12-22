const CACHE_NAME = 'sl-demo-v22-icons'; // Actualización de iconos
const REPO_PREFIX = '/Segured/'; // Definimos el prefijo
const ASSETS = [
  'pages/', // Cachea el directorio de páginas, que debería servir el nuevo index.
  'pages/index.html',
  'pages/layout.html',
  'drive-config.js',
  'favicon.svg',
  'css/style.css',
  'app.js',
  'main.js',
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
  'assets/images/safety-helmet.svg',
  'assets/images/safety-sign.svg',
  'assets/images/fire-extinguisher.svg',
  'assets/images/logo.svg'
].map(path => REPO_PREFIX + path.replace(/^\.\//, ''));

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  ).then(() => self.clients.claim()); // take control immediately and clear old caches
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Estrategia Network-First para navegación (HTML)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(resp => {
          // Verificamos que la respuesta sea válida (status 200) antes de actualizar la caché
          if (!resp || resp.status !== 200 || resp.type !== 'basic') {
            return resp;
          }
          // Si la petición de red funciona, la cacheamos y la devolvemos
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(req, resp.clone());
            return resp;
          });
        })
        .catch(() => caches.match(req)) // Si falla la red, intentamos servir desde la caché
    );
    return;
  }

  // Estrategia Cache-First para otros recursos (CSS, JS, imágenes)
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});
