import { useEffect } from 'react';
import { X, Truck, Sparkles, Bug, Wrench, Inbox } from '../Icons';
import { formatTime } from '../../utils/dates';

const MODULE_META = {
  rec: { label: 'Rutas', Icon: Truck },
  lim: { label: 'Limpieza', Icon: Sparkles },
  fum: { label: 'Fumigación', Icon: Bug },
  mto: { label: 'Mantenimiento', Icon: Wrench },
};

const STATUS_LABEL = {
  completed: 'Completado',
  scheduled: 'Programado',
  in_progress: 'En progreso',
  overdue: 'Atrasado',
};

const formatLongDate = (ms) =>
  new Date(ms).toLocaleDateString('es-PA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const CronogramaDayDetail = ({ dayMs, module, events, loading, onClose, onEventClick }) => {
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const meta = MODULE_META[module];
  const Icon = meta.Icon;

  const completedCount = events?.filter((e) => e.status === 'completed').length ?? 0;
  const scheduledCount = events?.filter((e) => e.status === 'scheduled').length ?? 0;
  const inProgressCount = events?.filter((e) => e.status === 'in_progress').length ?? 0;
  const overdueCount = events?.filter((e) => e.status === 'overdue').length ?? 0;

  return (
    <>
      <div
        className="cronograma-detail__overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="cronograma-detail"
        role="dialog"
        aria-label={`Detalle de ${meta.label} para ${formatLongDate(dayMs)}`}
      >
        <header className={`cronograma-detail__header cronograma-detail__header--${module}`}>
          <div className={`cronograma-detail__header-glow cronograma-detail__header-glow--${module}`} aria-hidden="true" />
          <div className="cronograma-detail__title">
            <span className={`cronograma-detail__icon cronograma-detail__icon--${module}`}>
              <Icon size={20} strokeWidth={1.75} />
            </span>
            <div>
              <h3>{meta.label}</h3>
              <p>{formatLongDate(dayMs)}</p>
            </div>
          </div>
          <button
            type="button"
            className="cronograma-detail__close"
            onClick={onClose}
            aria-label="Cerrar detalle"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </header>

        {events && events.length > 0 && (
          <div className="cronograma-detail__stats">
            {completedCount > 0 && (
              <div className="cronograma-detail__stat cronograma-detail__stat--completed">
                <span className="cronograma-detail__stat-num">{completedCount}</span>
                <span className="cronograma-detail__stat-label">Completados</span>
              </div>
            )}
            {inProgressCount > 0 && (
              <div className="cronograma-detail__stat cronograma-detail__stat--in_progress">
                <span className="cronograma-detail__stat-num">{inProgressCount}</span>
                <span className="cronograma-detail__stat-label">En progreso</span>
              </div>
            )}
            {scheduledCount > 0 && (
              <div className="cronograma-detail__stat cronograma-detail__stat--scheduled">
                <span className="cronograma-detail__stat-num">{scheduledCount}</span>
                <span className="cronograma-detail__stat-label">Programados</span>
              </div>
            )}
            {overdueCount > 0 && (
              <div className="cronograma-detail__stat cronograma-detail__stat--overdue">
                <span className="cronograma-detail__stat-num">{overdueCount}</span>
                <span className="cronograma-detail__stat-label">Atrasados</span>
              </div>
            )}
          </div>
        )}

        <div className="cronograma-detail__body">
          {loading && (
            <div className="cronograma-detail__skeleton">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="cronograma-detail__skel-item" style={{ animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
          )}
          {!loading && events && events.length === 0 && (
            <div className="cronograma-detail__empty">
              <Inbox size={36} strokeWidth={1.25} />
              <p>Sin eventos pa' este día.</p>
            </div>
          )}
          {!loading && events && events.length > 0 && (
            <ul className="cronograma-detail__list">
              {events.map((e, i) => {
                const clickable = !!onEventClick;
                const handleClick = clickable ? () => onEventClick(e) : undefined;
                const handleKey = clickable
                  ? (ev) => {
                      if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        onEventClick(e);
                      }
                    }
                  : undefined;
                return (
                  <li
                    key={e.id}
                    style={{ animationDelay: `${i * 40}ms` }}
                    className={`cronograma-detail__item cronograma-event--${e.module} cronograma-event--${e.status} ${clickable ? 'cronograma-detail__item--clickable' : ''}`}
                    onClick={handleClick}
                    onKeyDown={handleKey}
                    role={clickable ? 'button' : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    aria-label={
                      clickable
                        ? e.status === 'completed'
                          ? `Ver reporte: ${e.label}`
                          : `Ver asignación: ${e.label}`
                        : undefined
                    }
                  >
                    <div className="cronograma-detail__time">{formatTime(e.timestamp) || '--:--'}</div>
                    <div className="cronograma-detail__main">
                      <div className="cronograma-detail__label">{e.label}</div>
                      {e.sublabel && (
                        <div className="cronograma-detail__sublabel">{e.sublabel}</div>
                      )}
                    </div>
                    <div className={`cronograma-detail__status cronograma-detail__status--${e.status}`}>
                      {STATUS_LABEL[e.status]}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
};

export default CronogramaDayDetail;
