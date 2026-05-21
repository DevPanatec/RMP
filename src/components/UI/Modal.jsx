import { useEffect, useRef, useCallback, useState } from 'react';
import { X } from '../Icons';
import './Modal.css';

const SIZE_CLASS = {
  sm: 'modal--sm',
  md: 'modal--md',
  lg: 'modal--lg',
  full: 'modal--full',
};

const VARIANT_CLASS = {
  form: 'modal--form',
  detail: 'modal--detail',
  picker: 'modal--picker',
};

const BOTTOM_SHEET_BREAKPOINT = 600;

/**
 * Modal primitive Fluent — usar con slots Modal.Header / Modal.Body / Modal.Footer.
 *
 * Props:
 *   open          — boolean, defaults true (controlado por parent que decide montaje)
 *   size          — 'sm' | 'md' | 'lg' | 'full' (default 'md')
 *   variant       — 'form' | 'detail' | 'picker'
 *   onClose       — callback al cerrar (overlay click, Esc, X)
 *   closeOnOverlay — boolean, default true
 *   asBottomSheet — boolean | 'auto' (default 'auto' = bottom-sheet en <600px)
 *   ariaLabelledBy — id del título para a11y (opcional, Modal.Header lo setea solo)
 *
 * Slots vía children o sub-components: Modal.Header, Modal.Body, Modal.Footer.
 */
export const Modal = ({
  open = true,
  size = 'md',
  variant,
  onClose,
  closeOnOverlay = true,
  asBottomSheet = 'auto',
  ariaLabelledBy = 'modal-title',
  className = '',
  children,
}) => {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < BOTTOM_SHEET_BREAKPOINT
  );

  useEffect(() => {
    if (asBottomSheet !== 'auto') return;
    const handler = () => setIsMobile(window.innerWidth < BOTTOM_SHEET_BREAKPOINT);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [asBottomSheet]);

  // Focus management: foco al primer focusable al abrir, restaurar al cerrar
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement;
    const target =
      dialogRef.current?.querySelector('[data-autofocus]') ||
      dialogRef.current?.querySelector('button, input, textarea, select, [href]');
    target?.focus?.();
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // Focus trap + Esc
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose?.();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusables = dialogRef.current?.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables || focusables.length === 0) return;
    const list = Array.from(focusables);
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, [onClose]);

  if (!open) return null;

  const isSheet = asBottomSheet === true || (asBottomSheet === 'auto' && isMobile && size !== 'full');

  const classes = [
    'modal',
    SIZE_CLASS[size] || SIZE_CLASS.md,
    variant && VARIANT_CLASS[variant],
    isSheet && 'modal--bottom-sheet',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className="modal-overlay-primitive"
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      onKeyDown={handleKeyDown}
      onClick={closeOnOverlay ? onClose : undefined}
    >
      <div
        ref={dialogRef}
        className={classes}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

Modal.Header = function ModalHeader({ children, icon, onClose, id = 'modal-title', className = '' }) {
  return (
    <header className={`modal__header ${className}`}>
      {icon && <span className="modal__header-icon">{icon}</span>}
      <h2 id={id} className="modal__header-title">{children}</h2>
      {onClose && (
        <button
          type="button"
          className="modal__header-close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>
      )}
    </header>
  );
};

Modal.Body = function ModalBody({ children, scrollable = true, className = '' }) {
  return (
    <div className={`modal__body ${scrollable ? 'modal__body--scrollable' : ''} ${className}`}>
      {children}
    </div>
  );
};

Modal.Footer = function ModalFooter({ children, align = 'end', className = '' }) {
  return (
    <footer className={`modal__footer modal__footer--align-${align} ${className}`}>
      {children}
    </footer>
  );
};

export default Modal;
