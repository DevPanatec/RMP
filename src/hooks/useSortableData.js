import { useState, useMemo } from 'react';

/**
 * Hook que devuelve datos ordenables + control para cambiar key/dirección al click.
 *
 * Uso:
 *   const { sortedData, sortKey, sortDir, requestSort } = useSortableData(items, 'nombre');
 *   // sortedData se usa pa' renderizar; requestSort(key) se pasa al SortableHeader.
 *
 * - Strings: localeCompare con numeric=true (maneja "MAT-2" vs "MAT-10" bien).
 * - Numbers: comparación numérica.
 * - null/undefined: van al final (asc) o al principio (desc).
 */
export function useSortableData(data, defaultKey = null, defaultDir = 'asc') {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState(defaultDir);

  const sortedData = useMemo(() => {
    if (!sortKey || !Array.isArray(data)) return data;
    const arr = [...data];
    arr.sort((a, b) => {
      const av = a?.[sortKey];
      const bv = b?.[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      if (typeof av === 'boolean' && typeof bv === 'boolean') return av === bv ? 0 : av ? -1 : 1;
      return String(av).localeCompare(String(bv), 'es', { numeric: true, sensitivity: 'base' });
    });
    return sortDir === 'asc' ? arr : arr.reverse();
  }, [data, sortKey, sortDir]);

  const requestSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return { sortedData, sortKey, sortDir, requestSort };
}

export default useSortableData;
