import { useEffect, useState } from 'react';

// Singleton pattern - carga Google API una sola vez globalmente
let isLoading = false;
let isLoaded = false;
let loadError = null;

/**
 * Hook para cargar Google Maps JavaScript API
 * Usa patrón singleton para cargar la API solo una vez
 * Utiliza el nuevo API funcional de @googlemaps/js-api-loader
 *
 * @returns {Object} { google, loading, error }
 */
export const useGoogleMaps = () => {
  const [loading, setLoading] = useState(!isLoaded);
  const [error, setError] = useState(loadError);
  const [google, setGoogle] = useState(isLoaded ? window.google : null);

  useEffect(() => {
    // Si ya está cargado, retornar inmediatamente
    if (isLoaded) {
      setGoogle(window.google);
      setLoading(false);
      return;
    }

    // Si hubo error previo, usar ese error
    if (loadError) {
      setError(loadError);
      setLoading(false);
      return;
    }

    // Si ya está cargando (otro componente lo inició), esperar
    if (isLoading) {
      const checkInterval = setInterval(() => {
        if (isLoaded) {
          setGoogle(window.google);
          setLoading(false);
          clearInterval(checkInterval);
        } else if (loadError) {
          setError(loadError);
          setLoading(false);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    // Iniciar carga de Google Maps API usando script directo
    isLoading = true;

    const loadGoogleMapsScript = () => {
      return new Promise((resolve, reject) => {
        // Verificar si ya existe el script
        if (window.google && window.google.maps) {
          resolve(window.google);
          return;
        }

        // Crear script tag
        const script = document.createElement('script');
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geocoding&v=weekly`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
          if (window.google && window.google.maps) {
            resolve(window.google);
          } else {
            reject(new Error('Google Maps failed to load'));
          }
        };

        script.onerror = () => {
          reject(new Error('Failed to load Google Maps script'));
        };

        document.head.appendChild(script);
      });
    };

    loadGoogleMapsScript()
      .then((googleObj) => {
        isLoaded = true;
        isLoading = false;
        setGoogle(googleObj);
        setLoading(false);
        console.log('✅ Google Maps API loaded successfully');
      })
      .catch((err) => {
        isLoading = false;
        loadError = err;
        setError(err);
        setLoading(false);
        console.error('❌ Error loading Google Maps API:', err);
      });
  }, []);

  return { google, loading, error };
};
