import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronDown, Check } from '../Icons';

const WeekdayPicker = ({ selectedDays, onChange, blockedDays = {} }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [shouldPortal, setShouldPortal] = useState(false);
  const pickerRef = useRef(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

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
      // Check if click is inside picker container
      if (pickerRef.current && pickerRef.current.contains(event.target)) {
        return;
      }

      // Check if click is inside portaled dropdown
      if (dropdownRef.current && dropdownRef.current.contains(event.target)) {
        return;
      }

      // Click is outside, close dropdown
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Check if should use portal and calculate position
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const trigger = triggerRef.current;
      const modalBody = trigger.closest('.modal-body');

      if (modalBody) {
        setShouldPortal(true);

        const updatePosition = () => {
          const triggerRect = trigger.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const modalBodyRect = modalBody.getBoundingClientRect();

          // Verificar si el trigger está visible en el modal
          const triggerVisibleInModal =
            triggerRect.top >= modalBodyRect.top &&
            triggerRect.bottom <= modalBodyRect.bottom;

          // Si el trigger no está visible, cerrar el dropdown
          if (!triggerVisibleInModal) {
            setIsOpen(false);
            return;
          }

          const spaceBelow = viewportHeight - triggerRect.bottom - 16;
          const spaceAbove = triggerRect.top - 16;

          const style = {
            position: 'fixed',
            left: `${triggerRect.left}px`,
            width: `${triggerRect.width}px`,
            zIndex: 10000
          };

          if (spaceBelow >= 250 || spaceBelow > spaceAbove) {
            style.top = `${triggerRect.bottom + 10}px`;
            style.bottom = 'auto';
            style.maxHeight = `${Math.min(400, spaceBelow)}px`;
          } else {
            style.top = 'auto';
            style.bottom = `${viewportHeight - triggerRect.top + 10}px`;
            style.maxHeight = `${Math.min(400, spaceAbove)}px`;
          }

          setDropdownStyle(style);
        };

        updatePosition();

        const handleUpdate = () => updatePosition();
        window.addEventListener('scroll', handleUpdate, true);
        window.addEventListener('resize', handleUpdate);

        // También escuchar scroll del modal-body específicamente
        modalBody.addEventListener('scroll', handleUpdate);

        return () => {
          window.removeEventListener('scroll', handleUpdate, true);
          window.removeEventListener('resize', handleUpdate);
          modalBody.removeEventListener('scroll', handleUpdate);
        };
      } else {
        setShouldPortal(false);
        setDropdownStyle({});
      }
    }
  }, [isOpen]);

  const toggleDay = (dayKey) => {
    // No permitir seleccionar días bloqueados
    if (blockedDays[dayKey]) {
      return;
    }

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
        ref={triggerRef}
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

      {isOpen && !shouldPortal && (
        <div ref={dropdownRef} className="weekday-picker-dropdown">
          <div className="weekday-picker-header">
            <h4>Seleccionar días</h4>
            <p>Elige los días en que se realizará esta ruta</p>
          </div>

          <div className="weekday-picker-grid">
            {weekdays.map(day => {
              const isSelected = selectedDays.includes(day.key);
              const isBlocked = !!blockedDays[day.key];
              const blockedBy = blockedDays[day.key];

              return (
                <button
                  key={day.key}
                  className={`weekday-picker-day ${isSelected ? 'selected' : ''} ${isBlocked ? 'blocked' : ''}`}
                  onClick={() => toggleDay(day.key)}
                  type="button"
                  disabled={isBlocked}
                  title={isBlocked ? (blockedBy === 'No disponible' ? blockedBy : `Asignado a ${blockedBy}`) : ''}
                >
                  <span className="day-letter">{day.label}</span>
                  <span className="day-full">{day.full}</span>
                  {isSelected && !isBlocked && (
                    <div className="day-check">
                      <Check size={14} />
                    </div>
                  )}
                  {isBlocked && (
                    <div className="day-blocked-label">
                      {blockedBy === 'No disponible' ? blockedBy : `Asignado a ${blockedBy}`}
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

      {isOpen && shouldPortal && createPortal(
        <div ref={dropdownRef} className="weekday-picker-dropdown portaled" style={dropdownStyle}>
          <div className="weekday-picker-header">
            <h4>Seleccionar días</h4>
            <p>Elige los días en que se realizará esta ruta</p>
          </div>

          <div className="weekday-picker-grid">
            {weekdays.map(day => {
              const isSelected = selectedDays.includes(day.key);
              const isBlocked = !!blockedDays[day.key];
              const blockedBy = blockedDays[day.key];

              return (
                <button
                  key={day.key}
                  className={`weekday-picker-day ${isSelected ? 'selected' : ''} ${isBlocked ? 'blocked' : ''}`}
                  onClick={() => toggleDay(day.key)}
                  type="button"
                  disabled={isBlocked}
                  title={isBlocked ? (blockedBy === 'No disponible' ? blockedBy : `Asignado a ${blockedBy}`) : ''}
                >
                  <span className="day-letter">{day.label}</span>
                  <span className="day-full">{day.full}</span>
                  {isSelected && !isBlocked && (
                    <div className="day-check">
                      <Check size={14} />
                    </div>
                  )}
                  {isBlocked && (
                    <div className="day-blocked-label">
                      {blockedBy === 'No disponible' ? blockedBy : `Asignado a ${blockedBy}`}
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default WeekdayPicker;
