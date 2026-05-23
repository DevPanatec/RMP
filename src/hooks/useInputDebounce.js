import { useState, useEffect } from 'react';

/**
 * Debounce a rapidly-changing value (e.g., search input) so consumers
 * only react after the user stops typing for `delay` ms.
 *
 * Pattern:
 *   const [query, setQuery] = useState('');
 *   const debouncedQuery = useInputDebounce(query, 300);
 *   const filtered = useMemo(() => filter(data, debouncedQuery), [data, debouncedQuery]);
 *   <input value={query} onChange={e => setQuery(e.target.value)} />
 */
export function useInputDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default useInputDebounce;
