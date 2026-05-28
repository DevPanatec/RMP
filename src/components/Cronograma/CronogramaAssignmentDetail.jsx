import { useEffect } from 'react';
import { X, ChevronRight, Truck, Sparkles, Bug, Wrench, Calendar, Clock } from '../Icons';
import { formatTime } from '../../utils/dates';

const MODULE_META = {
  rec: { label: 'Rutas', Icon: Truck },
  lim: { label: 'Limpieza', Icon: Sparkles },
  fum: { label: 'Fumigación', Icon: Bug },
  mto: { label: 'Mantenimiento', Icon: Wrench },
};

const STATUS_LABEL = {
  scheduled: 'Programado',
  in_progress: 'En progreso',
  overdue: 'Atrasado',
  completed: 'Completado',
};

const formatLongDate = (ms) =>
  new Date(ms).toLocaleDateString('es-PA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const CronogramaAssignmentDetail = ({ event, onClose, onNavigateToModule }) => {
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!event) return null;
  const meta = MODULE_META[event.module];
  const Icon = meta.Icon;
  const time = formatTime(event.timestamp);

  return (
    <div
      className="cronograma-assignment__overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="cronograma-assignment__modal"
        role="dialog"
        aria-label={`Asignación ${meta.label}`}
      >
        <header className={`cronograma-assignment__header cronograma-assignment__header--${event.module}`}>
          <div className={`cronograma-assignment__icon cronograma-assignment__icon--${event.module}`}>
            <Icon size={20} strokeWidth={1.75} />
          </div>
          <div className="cronograma-assignment__title">
            <h3>{meta.label}</h3>
            <span className={`cronograma-assignment__status cronograma-assignment__status--${event.status}`}>
              {STATUS_LABEL[event.status]}
            </span>
          </div>
          <button
            type="button"
            className="cronograma-assignment__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </header>

        <div className="cronograma-assignment__body">
          <div className="cronograma-assignment__primary">
            {event.label}
          </div>
          {event.sublabel && (
            <div className="cronograma-assignment__secondary">
              {event.sublabel}
            </div>
          )}

          <dl className="cronograma-assignment__meta">
            <div className="cronograma-assignment__row">
              <dt><Calendar size={14} strokeWidth={2} /> Fecha</dt>
              <dd>{formatLongDate(event.timestamp)}</dd>
            </div>
            {time && (
              <div className="cronograma-assignment__row">
                <dt><Clock size={14} strokeWidth={2} /> Hora</dt>
                <dd>{time}</dd>
              </div>
            )}
          </dl>

          <p className="cronograma-assignment__hint">
            Aún no hay reporte. Pa' editar la asignación o registrar el reporte, abrí el módulo.
          </p>
        </div>

        <footer className="cronograma-assignment__footer">
          <button
            type="button"
            className="cronograma-assignment__btn cronograma-assignment__btn--ghost"
            onClick={onClose}
          >
            Cerrar
          </button>
          <button
            type="button"
            className={`cronograma-assignment__btn cronograma-assignment__btn--primary cronograma-assignment__btn--${event.module}`}
            onClick={() => {
              onNavigateToModule?.(event.module, event);
              onClose();
            }}
          >
            Editar en {meta.label}
            <ChevronRight size={14} strokeWidth={2} />
          </button>
        </footer>
      </div>
    </div>
  );
};

export default CronogramaAssignmentDetail;
