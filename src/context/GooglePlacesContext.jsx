import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';

const GooglePlacesContext = createContext(null);

/**
 * Hook para acceder a los servicios de Google Places
 * @returns {Object} { google, autocompleteService, placesService, geocoder, loading, error, isReady }
 */
export const useGooglePlaces = () => {
  const context = useContext(GooglePlacesContext);
  if (!context) {
    throw new Error('useGooglePlaces must be used within GooglePlacesProvider');
  }
  return context;
};

/**
 * Provider que inicializa y expone servicios de Google Places
 * - AutocompleteService: Para sugerencias de búsqueda
 * - PlacesService: Para detalles de lugares
 * - Geocoder: Para geocodificación inversa (lat/lng → dirección)
 */
export const GooglePlacesProvider = ({ children }) => {
  const { google, loading, error } = useGoogleMaps();
  const [services, setServices] = useState({
    autocompleteService: null,
    placesService: null,
    geocoder: null
  });

  useEffect(() => {
    if (!google || !google.maps) return;

    let placesServiceDiv = null;
    try {
      // Inicializar AutocompleteService
      const autocompleteService = new google.maps.places.AutocompleteService();

      // Inicializar Geocoder
      const geocoder = new google.maps.Geocoder();

      // PlacesService requiere un elemento DOM (usamos un div oculto)
      placesServiceDiv = document.createElement('div');
      placesServiceDiv.style.display = 'none';
      document.body.appendChild(placesServiceDiv);
      const placesService = new google.maps.places.PlacesService(placesServiceDiv);

      setServices({
        autocompleteService,
        placesService,
        geocoder
      });
    } catch (err) {
      console.error('❌ Error initializing Google Places services:', err);
    }

    return () => {
      // Cleanup: remove the hidden div appended to document.body
      if (placesServiceDiv && placesServiceDiv.parentNode) {
        placesServiceDiv.remove();
      }
    };
  }, [google]);

  const value = useMemo(() => ({
    google,
    ...services,
    loading,
    error,
    isReady: !loading && !error && services.autocompleteService !== null
  }), [google, services, loading, error]);

  return (
    <GooglePlacesContext.Provider value={value}>
      {children}
    </GooglePlacesContext.Provider>
  );
};
