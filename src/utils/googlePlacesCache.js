/**
 * Utilidades para cache de resultados de Google Places API
 * Usa sessionStorage para almacenar temporalmente resultados de geocodificación
 * Reduce llamadas a la API y mejora rendimiento
 */

const CACHE_PREFIX = 'gplaces_';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos en milisegundos

/**
 * Obtener un valor del cache
 * @param {string} key - Clave del cache (sin prefijo)
 * @returns {any|null} Valor cacheado o null si expiró/no existe
 */
export const cacheGet = (key) => {
  try {
    const fullKey = CACHE_PREFIX + key;
    const cached = sessionStorage.getItem(fullKey);

    if (!cached) {
      return null;
    }

    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();

    // Verificar si el cache expiró
    if (now - timestamp > CACHE_DURATION) {
      sessionStorage.removeItem(fullKey);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
};

/**
 * Guardar un valor en el cache
 * @param {string} key - Clave del cache (sin prefijo)
 * @param {any} data - Datos a cachear
 */
export const cacheSet = (key, data) => {
  try {
    const fullKey = CACHE_PREFIX + key;
    const cacheEntry = {
      data,
      timestamp: Date.now()
    };

    sessionStorage.setItem(fullKey, JSON.stringify(cacheEntry));
  } catch (error) {
    // Si sessionStorage está lleno o no disponible, fallar silenciosamente
    console.warn('Error writing to cache:', error);
  }
};

/**
 * Limpiar todo el cache de Google Places
 */
export const cacheClear = () => {
  try {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

/**
 * Generar clave de cache para geocodificación inversa
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @returns {string} Clave de cache
 */
export const generateReverseGeocodeKey = (lat, lng) => {
  return `reverse_${lat.toFixed(6)}_${lng.toFixed(6)}`;
};
