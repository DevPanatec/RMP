import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Atrapa el focus dentro del elemento referenciado mientras esté activo.
 * Cierra el modal con Escape llamando onEscape.
 *
 * @param {boolean} active - si el trap está activo
 * @param {Function} [onEscape] - callback al presionar Escape
 * @returns {React.RefObject} ref para asignar al contenedor del modal
 */
export function useFocusTrap(active, onEscape) {
  const containerRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    previouslyFocusedRef.current = document.activeElement;

    const focusables = container.querySelectorAll(FOCUSABLE_SELECTOR);
    const first = focusables[0];
    if (first) {
      requestAnimationFrame(() => first.focus?.());
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onEscape) {
        e.stopPropagation();
        onEscape();
        return;
      }
      if (e.key !== 'Tab') return;

      const list = container.querySelectorAll(FOCUSABLE_SELECTOR);
      if (list.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = list[0];
      const lastEl = list[list.length - 1];

      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      const prev = previouslyFocusedRef.current;
      if (prev && typeof prev.focus === 'function') {
        prev.focus();
      }
    };
  }, [active, onEscape]);

  return containerRef;
}

export default useFocusTrap;
