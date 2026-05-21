import { useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, X } from '../Icons';
import './ConfirmDialog.css';

export const ConfirmDialog = ({
  open = true,
  title = '¿Confirmar acción?',
  message = '',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef(null);
  const confirmBtnRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement;
    confirmBtnRef.current?.focus();
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel?.();
    } else if (e.key === 'Tab') {
      const focusables = dialogRef.current?.querySelectorAll(
        'button, [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [onCancel]);

  if (!open) return null;

  return (
    <div
      className="confirm-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onKeyDown={handleKey}
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        className={`confirm-dialog ${destructive ? 'confirm-dialog--destructive' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-dialog__header">
          <div className="confirm-dialog__icon">
            <AlertTriangle size={20} />
          </div>
          <h3 id="confirm-dialog-title" className="confirm-dialog__title">{title}</h3>
          <button
            type="button"
            className="confirm-dialog__close"
            onClick={onCancel}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        {message && <p className="confirm-dialog__body">{message}</p>}
        <div className="confirm-dialog__actions">
          <button
            type="button"
            className="confirm-dialog__btn confirm-dialog__btn--secondary"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={`confirm-dialog__btn ${destructive ? 'confirm-dialog__btn--danger' : 'confirm-dialog__btn--primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
