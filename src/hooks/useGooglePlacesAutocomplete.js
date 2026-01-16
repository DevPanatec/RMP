import { useState, useCallback, useRef } from 'react';
import { useGooglePlaces } from '../context/GooglePlacesContext';
import { mapGooglePlaceToLocation, mapGeocoderResultToLocation, PANAMA_BIAS_CONFIG } from '../utils/googlePlacesMapper';
import { cacheGet, cacheSet, generateReverseGeocodeKey } from '../utils/googlePlacesCache';

/**
 * Hook para búsqueda de lugares con Google Places API
 * Proporciona autocomplete, detalles de lugares, y geocodificación inversa
 *
 * @returns {Object} { suggestions, isLoading, searchPlaces, getPlaceDetails, reverseGeocode, isReady }
 */
export const useGooglePlacesAutocomplete = () => {
  const { autocompleteService, placesService, geocoder, isReady } = useGooglePlaces();

  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Refs para manejar debounce
  const debounceTimer = useRef(null);

  /**
   * Buscar lugares con autocomplete (con debounce de 300ms)
   * @param {string} query - Texto de búsqueda (mínimo 3 caracteres)
   */
  const searchPlaces = useCallback((query) => {
    // Limpiar timer anterior
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Validar entrada
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    if (!autocompleteService) {
      console.warn('Google Places Autocomplete service not ready');
      return;
    }

    // Debounce de 300ms
    debounceTimer.current = setTimeout(() => {
      setIsLoading(true);

      const request = {
        input: query,
        ...PANAMA_BIAS_CONFIG
      };

      autocompleteService.getPlacePredictions(request, (predictions, status) => {
        setIsLoading(false);

        if (status === 'OK' && predictions) {
          // Limitar a 8 sugerencias (igual que Nominatim)
          setSuggestions(predictions.slice(0, 8));
        } else if (status === 'ZERO_RESULTS') {
          // Sin resultados - normal, no es error
          setSuggestions([]);
        } else if (status === 'OVER_QUERY_LIMIT') {
          console.error('❌ Google Places: Límite de cuota excedido');
          alert('Se ha excedido el límite de búsquedas. Por favor intenta más tarde.');
          setSuggestions([]);
        } else if (status === 'REQUEST_DENIED') {
          console.error('❌ Google Places: Solicitud denegada. Verifica la configuración de API key.');
          alert('Error de configuración de API. Contacta al administrador.');
          setSuggestions([]);
        } else if (status === 'INVALID_REQUEST') {
          console.error('❌ Google Places: Solicitud inválida', request);
          setSuggestions([]);
        } else {
          console.warn('Google Places Autocomplete status:', status);
          setSuggestions([]);
        }
      });
    }, 300);
  }, [autocompleteService]);

  /**
   * Obtener detalles completos de un lugar (incluye coordenadas)
   * @param {string} placeId - ID del lugar de Google Places
   * @returns {Promise<google.maps.GeocoderResult>} Resultado de geocodificación
   */
  const getPlaceDetails = useCallback((placeId) => {
    return new Promise((resolve, reject) => {
      if (!geocoder) {
        reject(new Error('Geocoder service not ready'));
        return;
      }

      geocoder.geocode({ placeId }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          resolve(results[0]);
        } else if (status === 'ZERO_RESULTS') {
          reject(new Error('No se encontraron resultados para este lugar'));
        } else if (status === 'OVER_QUERY_LIMIT') {
          console.error('❌ Geocoder: Límite de cuota excedido');
          reject(new Error('Límite de búsquedas excedido'));
        } else if (status === 'REQUEST_DENIED') {
          console.error('❌ Geocoder: Solicitud denegada');
          reject(new Error('Error de configuración de API'));
        } else {
          console.error('Geocoder error:', status);
          reject(new Error(`Error al obtener detalles: ${status}`));
        }
      });
    });
  }, [geocoder]);

  /**
   * Convertir coordenadas a dirección (geocodificación inversa)
   * Usa cache de sesión para reducir llamadas a la API
   * @param {number} lat - Latitud
   * @param {number} lng - Longitud
   * @returns {Promise<Object>} Objeto con estructura RMP { direccion, direccion_completa, latitud, longitud }
   */
  const reverseGeocode = useCallback((lat, lng) => {
    return new Promise((resolve, reject) => {
      if (!geocoder) {
        reject(new Error('Geocoder service not ready'));
        return;
      }

      // Verificar cache primero
      const cacheKey = generateReverseGeocodeKey(lat, lng);
      const cachedData = cacheGet(cacheKey);

      if (cachedData) {
        console.log('✅ Cache hit for reverse geocode:', cacheKey);
        resolve(cachedData);
        return;
      }

      // Cache miss - llamar a la API
      const location = { lat, lng };

      geocoder.geocode({ location }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const locationData = mapGeocoderResultToLocation(results[0], lat, lng);
          // Guardar en cache
          cacheSet(cacheKey, locationData);
          resolve(locationData);
        } else if (status === 'ZERO_RESULTS') {
          // Sin resultados - usar fallback de coordenadas
          console.warn('No address found for coordinates, using fallback');
          const fallbackData = mapGeocoderResultToLocation(null, lat, lng);
          // Guardar fallback en cache también
          cacheSet(cacheKey, fallbackData);
          resolve(fallbackData);
        } else if (status === 'OVER_QUERY_LIMIT') {
          console.error('❌ Reverse Geocoder: Límite de cuota excedido');
          reject(new Error('Límite de búsquedas excedido'));
        } else if (status === 'REQUEST_DENIED') {
          console.error('❌ Reverse Geocoder: Solicitud denegada');
          reject(new Error('Error de configuración de API'));
        } else {
          console.error('Reverse Geocoder error:', status);
          // Fallback a coordenadas en caso de error
          const fallbackData = mapGeocoderResultToLocation(null, lat, lng);
          resolve(fallbackData);
        }
      });
    });
  }, [geocoder]);

  // Limpiar timer al desmontar
  useCallback(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    suggestions,
    isLoading,
    searchPlaces,
    getPlaceDetails,
    reverseGeocode,
    isReady
  };
};
