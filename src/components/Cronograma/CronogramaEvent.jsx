import { formatTime } from '../../utils/dates';

const STATUS_LABEL = {
  completed: 'Completado',
  scheduled: 'Programado',
  in_progress: 'En progreso',
  overdue: 'Atrasado',
};

const MODULE_LABEL = {
  rec: 'Ruta',
  lim: 'Limpieza',
  fum: 'Fumigación',
  mto: 'Mantenimiento',
};

const CronogramaEvent = ({ event }) => {
  const timeLabel = formatTime(event.timestamp);
  const tooltip = [
    `${MODULE_LABEL[event.module]} · ${STATUS_LABEL[event.status]}`,
    timeLabel ? `Hora: ${timeLabel}` : null,
    event.label,
    event.sublabel,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <div
      className={`cronograma-event cronograma-event--${event.module} cronograma-event--${event.status}`}
      title={tooltip}
    >
      <span className="cronograma-event__time">{timeLabel}</span>
      <span className="cronograma-event__label">{event.label}</span>
      {event.sublabel && (
        <span className="cronograma-event__sublabel">{event.sublabel}</span>
      )}
    </div>
  );
};

export default CronogramaEvent;
