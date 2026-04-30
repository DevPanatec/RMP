import { Check } from '../Icons';

const WEEKDAYS = [
  { key: 'lunes', label: 'L', full: 'Lunes' },
  { key: 'martes', label: 'M', full: 'Martes' },
  { key: 'miercoles', label: 'X', full: 'Miércoles' },
  { key: 'jueves', label: 'J', full: 'Jueves' },
  { key: 'viernes', label: 'V', full: 'Viernes' },
  { key: 'sabado', label: 'S', full: 'Sábado' },
  { key: 'domingo', label: 'D', full: 'Domingo' }
];

const WeekdayPicker = ({ selectedDays = [], onChange, blockedDays = {}, hideLabel = false }) => {
  const toggleDay = (dayKey) => {
    if (blockedDays[dayKey]) return;
    const next = selectedDays.includes(dayKey)
      ? selectedDays.filter((d) => d !== dayKey)
      : [...selectedDays, dayKey];
    onChange(next);
  };

  return (
    <div className="weekday-picker-inline">
      {!hideLabel && <label className="weekday-picker-label">Días *</label>}
      <div className="weekday-picker-row">
        {WEEKDAYS.map((day) => {
          const isSelected = selectedDays.includes(day.key);
          const isBlocked = !!blockedDays[day.key];
          const blockedBy = blockedDays[day.key];
          const title = isBlocked
            ? (blockedBy === 'No disponible' ? blockedBy : `Asignado a ${blockedBy}`)
            : day.full;
          return (
            <button
              key={day.key}
              type="button"
              className={`weekday-pill ${isSelected ? 'selected' : ''} ${isBlocked ? 'blocked' : ''}`}
              onClick={() => toggleDay(day.key)}
              disabled={isBlocked}
              title={title}
              aria-label={day.full}
              aria-pressed={isSelected}
            >
              <span className="weekday-pill-letter">{day.label}</span>
              {isSelected && !isBlocked && (
                <span className="weekday-pill-check">
                  <Check size={10} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default WeekdayPicker;
