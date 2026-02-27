import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'

// Desregistrar Service Workers en desarrollo para evitar cache stale
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => {
      reg.unregister();
      console.log('SW desregistrado en desarrollo:', reg.scope);
    });
  });
  // Limpiar todos los caches del SW
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)