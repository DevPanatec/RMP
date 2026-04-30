import { useState, useEffect } from 'react';

/**
 * Hook para manejar el modo demo de la aplicación
 * Persiste el estado en localStorage
 *
 * KILL SWITCH: en build de producción, demo mode SIEMPRE está apagado y
 * todas las operaciones de toggle son no-op. Esto evita que un localStorage
 * contaminado de un test pasado muestre data falsa al cliente/gobierno
 * durante una demo en vivo.
 *
 * Para activar en dev: import.meta.env.DEV (o MODE === 'development').
 * Override explícito: VITE_ALLOW_DEMO_MODE=true en .env.local.
 */
const DEMO_MODE_ALLOWED =
  import.meta.env.DEV || import.meta.env.VITE_ALLOW_DEMO_MODE === 'true';

export const useDemoMode = () => {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    if (!DEMO_MODE_ALLOWED) {
      // Limpiar cualquier residuo de localStorage al primer mount en prod
      try { localStorage.removeItem('rmp_demo_mode'); } catch (_) {}
      return false;
    }
    const saved = localStorage.getItem('rmp_demo_mode');
    return saved === 'true';
  });

  // Guardar en localStorage cuando cambie (solo si demo está permitido)
  useEffect(() => {
    if (!DEMO_MODE_ALLOWED) return;
    localStorage.setItem('rmp_demo_mode', isDemoMode.toString());
  }, [isDemoMode]);

  const toggleDemoMode = () => {
    if (!DEMO_MODE_ALLOWED) return;
    setIsDemoMode(prev => !prev);
  };

  const enableDemoMode = () => {
    if (!DEMO_MODE_ALLOWED) return;
    setIsDemoMode(true);
  };

  const disableDemoMode = () => {
    setIsDemoMode(false);
  };

  return {
    isDemoMode,
    toggleDemoMode,
    enableDemoMode,
    disableDemoMode,
    isDemoAllowed: DEMO_MODE_ALLOWED,
  };
};
