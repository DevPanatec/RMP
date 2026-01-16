/**
 * Utilidades para mapear respuestas de Google Places API
 * a la estructura de datos de RMP
 */

/**
 * Mapea una predicción de Google Places y su resultado de geocodificación
 * a la estructura de datos de ubicación de RMP
 *
 * @param {google.maps.places.AutocompletePrediction} prediction - Predicción de autocomplete
 * @param {google.maps.GeocoderResult} geocodeResult - Resultado de geocodificación
 * @returns {Object} { direccion, direccion_completa, latitud, longitud }
 */
export const mapGooglePlaceToLocation = (prediction, geocodeResult) => {
  // Extraer dirección corta (texto principal)
  const shortAddress =
    prediction.structured_formatting?.main_text ||
    prediction.description.split(',')[0].trim();

  // Extraer dirección completa
  const fullAddress =
    geocodeResult?.formatted_address || prediction.description;

  // Extraer coordenadas
  const lat = geocodeResult?.geometry?.location?.lat();
  const lng = geocodeResult?.geometry?.location?.lng();

  return {
    direccion: shortAddress,
    direccion_completa: fullAddress,
    latitud: lat,
    longitud: lng
  };
};

/**
 * Mapea un resultado de geocodificación inversa de Google
 * a la estructura de datos de ubicación de RMP
 *
 * @param {google.maps.GeocoderResult} result - Resultado de geocoder
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @returns {Object} { direccion, direccion_completa, latitud, longitud }
 */
export const mapGeocoderResultToLocation = (result, lat, lng) => {
  // Si no hay resultado, usar coordenadas como fallback
  if (!result) {
    return {
      direccion: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      direccion_completa: `Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      latitud: lat,
      longitud: lng
    };
  }

  // Intentar extraer dirección de calle o primer componente
  const shortAddress =
    result.address_components?.[0]?.long_name ||
    result.formatted_address.split(',')[0].trim();

  return {
    direccion: shortAddress,
    direccion_completa: result.formatted_address,
    latitud: lat,
    longitud: lng
  };
};

/**
 * Configuración de bias para Panamá
 * Restringe resultados a Panamá y prioriza ubicaciones panameñas
 */
export const PANAMA_BIAS_CONFIG = {
  // Restringir solo a Panamá
  componentRestrictions: { country: 'pa' },

  // Bounding box de Panamá (mismo que Nominatim)
  bounds: {
    north: 10.0,
    south: 7.0,
    east: -77.0,
    west: -83.0
  },

  // Permitir algunos resultados fuera del bound si son muy relevantes
  strictBounds: false
};
