// Script para desregistrar Service Worker durante desarrollo
// Ejecuta este script en la consola del navegador si tienes problemas con caché

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister().then(function(success) {
        console.log('✅ Service Worker desregistrado:', success);
      });
    }
  });
  
  // Limpiar todos los cachés
  caches.keys().then(function(names) {
    for (let name of names) {
      caches.delete(name).then(function(success) {
        console.log('✅ Caché eliminado:', name, success);
      });
    }
  });
  
  console.log('🔄 Recarga la página después de desregistrar el SW');
} else {
  console.log('❌ Service Worker no soportado');
}
