const CACHE_NAME = 'rmp-conductor-v6.0';
const STATIC_CACHE = 'rmp-static-v6.0';
const DYNAMIC_CACHE = 'rmp-dynamic-v6.0';

const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/src/main.jsx',
  '/src/pages/ConductorDashboard/ConductorDashboard.jsx',
  '/src/pages/ConductorDashboard/ConductorDashboard.css',
  '/src/components/WeightModal/WeightModal.jsx'
];

function isDevelopment() {
  return self.location.hostname === 'localhost' || 
         self.location.hostname === '127.0.0.1';
}

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('SW: Instalando...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('SW: Cache estático abierto');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('SW: Archivos cacheados correctamente');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('SW: Error al cachear archivos:', error);
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
      
      // Invalidación automática de cache en desarrollo cada 5 minutos
      if (isDevelopment()) {
        setInterval(() => {
          console.log('SW Dev: Limpiando cache automáticamente...');
          caches.keys().then(names => {
            names.forEach(name => {
              if (name === DYNAMIC_CACHE) {
                caches.delete(name);
                console.log('SW Dev: Cache dinámico eliminado:', name);
              }
            });
          });
        }, 5 * 60 * 1000);
      }
      
       // return self.clients.claim(); // Desactivado para evitar reinicios en desarrollo
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

  // Network First para API y datos dinámicos
  if (url.pathname.includes('/api/') || request.method === 'POST') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then(cache => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // Fallback al cache si no hay red
          return caches.match(request)
            .then(response => {
              if (response) {
                return response;
              }
              // Respuesta offline por defecto
              return new Response(
                JSON.stringify({
                  error: 'Sin conexión',
                  offline: true,
                  timestamp: Date.now()
                }),
                {
                  status: 503,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
        })
    );
    return;
  }

  // Stale While Revalidate para navegación (HTML)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request)
        .then(response => {
          const fetchPromise = fetch(request)
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
              // Si falla la red, devolver página offline
              return caches.match('/') || new Response('Offline', { status: 503 });
            });

          return response || fetchPromise;
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

// Sincronización en segundo plano
self.addEventListener('sync', (event) => {
  console.log('SW: Evento sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Sincronizar datos pendientes cuando hay conexión
      syncPendingData()
    );
  }
});

async function syncPendingData() {
  try {
    // Obtener datos pendientes del IndexedDB o localStorage
    const pendingData = await getPendingData();
    
    if (pendingData && pendingData.length > 0) {
      console.log('SW: Sincronizando datos pendientes:', pendingData.length);
      
      for (const data of pendingData) {
        try {
          await fetch('/api/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
          });
          
          // Marcar como sincronizado
          await markAsSynced(data.id);
        } catch (error) {
          console.error('SW: Error sincronizando:', error);
        }
      }
    }
  } catch (error) {
    console.error('SW: Error en sincronización:', error);
  }
}

async function getPendingData() {
  // Implementar obtención de datos pendientes
  // Por ahora retornamos array vacío
  return [];
}

async function markAsSynced(id) {
  // Implementar marcado como sincronizado
  console.log('SW: Marcando como sincronizado:', id);
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
        title: '👀 Ver',
        icon: '/icon-192.png'
      },
      {
        action: 'dismiss',
        title: '❌ Descartar',
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