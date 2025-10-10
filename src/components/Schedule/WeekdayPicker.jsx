import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from '../Icons';

const WeekdayPicker = ({ selectedDays, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef(null);

  const weekdays = [
    { key: 'lunes', label: 'L', full: 'Lunes' },
    { key: 'martes', label: 'M', full: 'Martes' },
    { key: 'miercoles', label: 'X', full: 'Miércoles' },
    { key: 'jueves', label: 'J', full: 'Jueves' },
    { key: 'viernes', label: 'V', full: 'Viernes' },
    { key: 'sabado', label: 'S', full: 'Sábado' },
    { key: 'domingo', label: 'D', full: 'Domingo' }
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleDay = (dayKey) => {
    const newSelected = selectedDays.includes(dayKey)
      ? selectedDays.filter(d => d !== dayKey)
      : [...selectedDays, dayKey];
    onChange(newSelected);
  };

  const getSelectedSummary = () => {
    if (selectedDays.length === 0) return 'Seleccionar días';
    if (selectedDays.length === 7) return 'Todos los días';
    
    return weekdays
      .filter(d => selectedDays.includes(d.key))
      .map(d => d.label)
      .join(', ');
  };

  return (
    <div className="weekday-picker-container" ref={pickerRef}>
      <label className="weekday-picker-label">Días de la Semana *</label>
      
      <button 
        className={`weekday-picker-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <div className="trigger-content">
          <Calendar size={18} />
          <span className="trigger-text">{getSelectedSummary()}</span>
        </div>
        <ChevronDown size={16} className={`chevron ${isOpen ? 'rotated' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="weekday-picker-dropdown">
          <div className="weekday-picker-header">
            <h4>Seleccionar días</h4>
            <p>Elige los días en que se realizará esta ruta</p>
          </div>
          
          <div className="weekday-picker-grid">
            {weekdays.map(day => {
              const isSelected = selectedDays.includes(day.key);
              return (
                <button
                  key={day.key}
                  className={`weekday-picker-day ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleDay(day.key)}
                  type="button"
                >
                  <span className="day-letter">{day.label}</span>
                  <span className="day-full">{day.full}</span>
                  {isSelected && (
                    <div className="day-check">
                      <Check size={14} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          <div className="weekday-picker-footer">
            <span className="selected-count">
              {selectedDays.length} día{selectedDays.length !== 1 ? 's' : ''} seleccionado{selectedDays.length !== 1 ? 's' : ''}
            </span>
            <button 
              className="weekday-picker-done"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeekdayPicker;
