import { CheckCircle } from '../Icons';

const WeekdaySelector = ({ selectedDays, onChange }) => {
  const weekdays = [
    { key: 'lunes', label: 'Lun', fullLabel: 'Lunes' },
    { key: 'martes', label: 'Mar', fullLabel: 'Martes' },
    { key: 'miercoles', label: 'Mié', fullLabel: 'Miércoles' },
    { key: 'jueves', label: 'Jue', fullLabel: 'Jueves' },
    { key: 'viernes', label: 'Vie', fullLabel: 'Viernes' },
    { key: 'sabado', label: 'Sáb', fullLabel: 'Sábado' },
    { key: 'domingo', label: 'Dom', fullLabel: 'Domingo' }
  ];

  const toggleDay = (dayKey) => {
    const newSelected = selectedDays.includes(dayKey)
      ? selectedDays.filter(d => d !== dayKey)
      : [...selectedDays, dayKey];
    onChange(newSelected);
  };

  return (
    <div className="weekday-selector">
      <label className="weekday-selector-label">Días de la Semana: *</label>
      <p className="weekday-selector-help">Selecciona los días en que se realizará esta ruta</p>
      
      <div className="weekdays-grid">
        {weekdays.map(day => {
          const isSelected = selectedDays.includes(day.key);
          return (
            <label
              key={day.key}
              className={`weekday-item ${isSelected ? 'selected' : ''}`}
              title={day.fullLabel}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleDay(day.key)}
                className="weekday-checkbox"
              />
              <span className="weekday-label">{day.label}</span>
              {isSelected && (
                <CheckCircle size={16} className="weekday-check" />
              )}
            </label>
          );
        })}
      </div>
      
      {selectedDays.length > 0 && (
        <div className="selected-days-summary">
          <span className="summary-label">Seleccionados:</span>
          <span className="summary-value">
            {weekdays
              .filter(d => selectedDays.includes(d.key))
              .map(d => d.fullLabel)
              .join(', ')}
          </span>
        </div>
      )}
    </div>
  );
};

export default WeekdaySelector;
