const CACHE_NAME = 'rmp-conductor-v8.2';
const STATIC_CACHE = 'rmp-static-v8.2';
const DYNAMIC_CACHE = 'rmp-dynamic-v8.2';

const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192.png'
];

function isDevelopment() {
  return self.location.hostname === 'localhost' || 
         self.location.hostname === '127.0.0.1';
}

// Instalación del Service Worker
// Cacheamos cada archivo individualmente: si uno falla (404, red intermitente),
// no se aborta todo el install como ocurre con cache.addAll().
self.addEventListener('install', (event) => {
  console.log('SW: Instalando...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(async (cache) => {
        const results = await Promise.allSettled(
          urlsToCache.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`SW: No se pudo cachear ${url}:`, err.message);
              throw err;
            })
          )
        );
        const failed = results.filter((r) => r.status === 'rejected').length;
        console.log(`SW: Cache estático listo (${results.length - failed}/${results.length})`);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('SW: Error fatal en install:', error);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('SW: Activando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (![STATIC_CACHE, DYNAMIC_CACHE].includes(cacheName)) {
            console.log('SW: Eliminando cache antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('SW: Activado correctamente');

      // Invalidación automática de cache en desarrollo cada 5 minutos.
      // Guardar handle en self para clear en re-activate (evita stack de intervals).
      if (isDevelopment()) {
        if (self.__rmpDevCacheInterval) clearInterval(self.__rmpDevCacheInterval);
        self.__rmpDevCacheInterval = setInterval(() => {
          caches.keys().then(names => {
            names.forEach(name => {
              if (name === DYNAMIC_CACHE) caches.delete(name);
            });
          });
        }, 5 * 60 * 1000);
      }

      return self.clients.claim();
    })
  );
});

// Estrategia Cache First para archivos estáticos y Network First para API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests de extensiones del navegador
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Ignorar WebSocket connections
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  // En desarrollo, NO interceptar nada - dejar que Vite maneje todo
  if (isDevelopment()) {
    return;
  }

  // Ignorar archivos de desarrollo de Vite (producción fallback)
  if (url.pathname.includes('/node_modules/.vite/') ||
      url.pathname.includes('/@vite/') ||
      url.pathname.includes('/@fs/') ||
      url.searchParams.has('t') || // timestamp parameter de Vite
      url.searchParams.has('v')) { // version parameter de Vite
    return;
  }

  // Estrategia condicional para archivos estáticos (JS, CSS, imágenes)
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image' ||
      url.pathname.includes('/static/') ||
      url.pathname.includes('.js') ||
      url.pathname.includes('.css') ||
      url.pathname.includes('.png') ||
      url.pathname.includes('.jpg') ||
      url.pathname.includes('.svg')) {
    
    if (isDevelopment()) {
      // Stale While Revalidate en desarrollo - sirve cache inmediatamente y actualiza en background
      event.respondWith(
        caches.match(request)
          .then(cachedResponse => {
            const fetchPromise = fetch(request)
              .then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                  const responseToCache = networkResponse.clone();
                  caches.open(STATIC_CACHE)
                    .then(cache => {
                      cache.put(request, responseToCache);
                      console.log('SW Dev: Cache actualizado en background:', request.url);
                    });
                }
                return networkResponse;
              })
              .catch(() => {
                console.log('SW Dev: Red no disponible, usando cache');
                return cachedResponse;
              });
            
            // Si hay cache, retornarlo inmediatamente, sino esperar la red
            if (cachedResponse) {
              console.log('SW Dev: Sirviendo desde cache (actualizando en background):', request.url);
              return cachedResponse;
            }
            
            return fetchPromise;
          })
          .catch(() => {
            // Fallback para imágenes si todo falla
            if (request.destination === 'image') {
              return caches.match('/icon-192.png');
            }
          })
      );
    } else {
      // Cache First en producción - más agresivo
      event.respondWith(
        caches.match(request)
          .then(response => {
            if (response) {
              console.log('SW Prod: Sirviendo desde cache:', request.url);
              return response;
            }
            
            return fetch(request)
              .then(fetchResponse => {
                if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                  return fetchResponse;
                }
                
                const responseToCache = fetchResponse.clone();
                caches.open(STATIC_CACHE)
                  .then(cache => {
                    cache.put(request, responseToCache);
                  });
                
                return fetchResponse;
              })
              .catch(() => {
                // Fallback para imágenes
                if (request.destination === 'image') {
                  return caches.match('/icon-192.png');
                }
              });
          })
      );
    }
    return;
  }

  // Network First para API GET. POST/PUT/DELETE NO se cachean (mutations no son
  // idempotentes — servir cache stale puede crear datos inconsistentes).
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.status === 200 && request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then(cache => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          if (request.method !== 'GET') {
            return new Response(
              JSON.stringify({ error: 'Sin conexión', offline: true, timestamp: Date.now() }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          }
          return caches.match(request)
            .then(response => {
              if (response) return response;
              return new Response(
                JSON.stringify({ error: 'Sin conexión', offline: true, timestamp: Date.now() }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
              );
            });
        })
    );
    return;
  }

  // Network First para navegación (HTML) — evita servir index.html viejo con hashes rotos
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(fetchResponse => {
          if (fetchResponse.status === 200) {
            const responseClone = fetchResponse.clone();
            caches.open(DYNAMIC_CACHE)
              .then(cache => {
                cache.put(request, responseClone);
              });
          }
          return fetchResponse;
        })
        .catch(() => {
          return caches.match(request)
            .then(cached => cached || caches.match('/') || new Response('Offline', { status: 503 }));
        })
    );
    return;
  }

  // Default: Network first con fallback
  event.respondWith(
    fetch(request)
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Background Sync — notifica al cliente React para que drene la cola de fotos
// El SW no sube directamente porque no tiene el token de Clerk; el cliente sí lo tiene.
self.addEventListener('sync', (event) => {
  console.log('SW: Evento sync:', event.tag);
  if (event.tag === 'sync-stop-photos') {
    event.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync() {
  const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clientList.forEach((c) => c.postMessage({ type: 'DRAIN_PHOTO_QUEUE' }));
}

// Manejo de notificaciones push para conductores
self.addEventListener('push', (event) => {
  console.log('SW: Notificación push recibida');
  
  let notificationData = {
    title: 'RMP Conductor',
    body: 'Nueva actualización disponible',
    icon: '/icon-192.png',
    badge: '/icon-192.png'
  };

  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (error) {
      console.error('SW: Error parseando notificación:', error);
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: {
      dateOfArrival: Date.now(),
      primaryKey: notificationData.id || Date.now(),
      url: notificationData.url || '/'
    },
    actions: [
      {
        action: 'view',
        title: 'Ver',
        icon: '/icon-192.png'
      },
      {
        action: 'dismiss',
        title: 'Descartar',
        icon: '/icon-192.png'
      }
    ],
    tag: 'rmp-conductor-notification'
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Manejo de clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('SW: Click en notificación:', event.action);
  event.notification.close();

  if (event.action === 'view') {
    const urlToOpen = event.notification.data.url || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          // Si ya hay una ventana abierta, enfocarla
          for (const client of clientList) {
            if (client.url.includes(urlToOpen) && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Si no hay ventana abierta, abrir una nueva
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Manejo de cierre de notificaciones
self.addEventListener('notificationclose', (event) => {
  console.log('SW: Notificación cerrada:', event.notification.tag);
});