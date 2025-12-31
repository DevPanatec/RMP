import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';

/**
 * Hook que "debouncea" los resultados de un query de Convex
 *
 * Útil para reducir re-renders cuando los datos cambian muy frecuentemente
 * (ej: GPS updates cada 10 segundos)
 *
 * @param {Function} queryFunction - La función de query de Convex
 * @param {Object} args - Argumentos para el query
 * @param {number} delay - Milisegundos de delay (default: 1000ms)
 *
 * @example
 * // En vez de:
 * const vehicles = useQuery(api.vehiculos.list);
 *
 * // Usa:
 * const vehicles = useDebouncedQuery(api.vehiculos.list, {}, 2000);
 * // Solo actualiza UI cada 2 segundos, aunque Convex envíe updates cada 10 seg
 */
export const useDebouncedQuery = (queryFunction, args = {}, delay = 1000) => {
  // Query real de Convex (actualiza en tiempo real)
  const liveData = useQuery(queryFunction, args);

  // Estado local que solo actualiza cada 'delay' ms
  const [debouncedData, setDebouncedData] = useState(liveData);

  useEffect(() => {
    // Si no hay data, actualizar inmediatamente
    if (liveData === undefined) {
      setDebouncedData(undefined);
      return;
    }

    // Esperar 'delay' ms antes de actualizar
    const timeout = setTimeout(() => {
      setDebouncedData(liveData);
    }, delay);

    // Limpiar timeout si llegan nuevos datos antes
    return () => clearTimeout(timeout);
  }, [liveData, delay]);

  return debouncedData;
};

export default useDebouncedQuery;
