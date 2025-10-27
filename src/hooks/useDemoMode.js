import { useState, useEffect } from 'react';

/**
 * Hook para manejar el modo demo de la aplicación
 * Persiste el estado en localStorage
 */
export const useDemoMode = () => {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    // Leer del localStorage al inicializar
    const saved = localStorage.getItem('rmp_demo_mode');
    return saved === 'true';
  });

  // Guardar en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('rmp_demo_mode', isDemoMode.toString());
  }, [isDemoMode]);

  const toggleDemoMode = () => {
    setIsDemoMode(prev => !prev);
  };

  const enableDemoMode = () => {
    setIsDemoMode(true);
  };

  const disableDemoMode = () => {
    setIsDemoMode(false);
  };

  return {
    isDemoMode,
    toggleDemoMode,
    enableDemoMode,
    disableDemoMode
  };
};
