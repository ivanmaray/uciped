// Service Worker para UCIPED
const CACHE_NAME = 'uciped-v59';
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css?v=114',
  './js/data.js?v=113',
  './js/logic.js?v=114',
  './js/perfusiones.config.js?v=113',
  './js/state.js?v=113',
  './js/tabs.js?v=113',
  './js/ui.js?v=114',
  './js/search.js?v=114',
  './js/theme.js?v=113',
  './js/focus-trap.js?v=113',
  './js/hyperkalemia.js?v=113',
  './js/announcer.js?v=113',
  './data/meds.json',
  './manifest.json',
  './favicon.ico',
  './favicon-16x16.png',
  './favicon-32x32.png',
  './android-chrome-192x192.png',
  './android-chrome-512x512.png',
  './logo.png',
  './apple-touch-icon.png'
];

// Instalación: cachear archivos estáticos
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker v58');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando archivos estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activación: limpiar cachés antiguos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: estrategia híbrida
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Para el archivo JSON de datos: Network First (priorizar datos frescos)
  if (url.pathname.endsWith('/data/meds.json')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Guardar en caché la respuesta fresca
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Si falla la red, usar caché
          return caches.match(request, { ignoreSearch: true });
        })
    );
    return;
  }

  const isSameOrigin = url.origin === self.location.origin;
  const requiresFreshVersion = isSameOrigin && (
    request.mode === 'navigate' ||
    ['script', 'style', 'worker', 'manifest'].includes(request.destination) ||
    url.pathname.endsWith('.html')
  );

  // Código de la app: Network First para no conservar JS/CSS antiguos tras publicar.
  if (requiresFreshVersion) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request, { ignoreSearch: request.mode === 'navigate' });
          return cached || caches.match('./index.html');
        })
    );
    return;
  }

  // Imágenes y resto de recursos: Cache First para mantener funcionamiento sin conexión.
  event.respondWith(
    caches.match(request).then((cachedResponse) => cachedResponse || fetch(request).then((response) => {
      if (request.method === 'GET' && response.status === 200) {
        caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
      }
      return response;
    }))
  );
});
