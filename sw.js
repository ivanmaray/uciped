// Service Worker para UCIPED
const CACHE_NAME = 'uciped-v8';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/js/data.js',
  '/js/logic.js',
  '/js/perfusiones.config.js',
  '/js/state.js',
  '/js/tabs.js',
  '/js/ui.js',
  '/js/search.js',
  '/js/theme.js',
  '/manifest.json',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/logo.png'
];

// Instalación: cachear archivos estáticos
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
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
  if (url.pathname.includes('/data/meds.json')) {
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
          return caches.match(request);
        })
    );
    return;
  }

  // Para todo lo demás: Cache First (archivos estáticos)
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request)
          .then((response) => {
            // Cachear recursos nuevos
            if (request.method === 'GET' && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          });
      })
  );
});
