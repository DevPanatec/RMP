/**
 * ServiceDownloadSection - Componente reutilizable para descarga de reportes
 * Se puede usar en cualquier componente de servicio (Limpieza, Fumigacion, etc.)
 */
import { useState } from 'react';
import { Download, Calendar, FileText } from '../Icons';
import './ServiceDownloadSection.css';

// Helpers para fechas
const getFirstDayOfMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};

const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

const ServiceDownloadSection = ({
  serviceName,
  serviceIcon: ServiceIcon = FileText,
  onDownload,
  isLoading = false,
  disabled = false,
  variant = 'default', // 'default', 'compact', 'card'
  className = ''
}) => {
  const [dateRange, setDateRange] = useState({
    desde: getFirstDayOfMonth(),
    hasta: getTodayDate()
  });

  const handleDateChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDownload = () => {
    if (onDownload && !isLoading && !disabled) {
      onDownload(dateRange);
    }
  };

  // Validar que el rango sea correcto
  const isValidRange = dateRange.desde <= dateRange.hasta;

  if (variant === 'compact') {
    return (
      <div className={`service-download-section service-download-section--compact ${className}`}>
        <div className="download-inline-controls">
          <div className="download-date-group">
            <input
              type="date"
              value={dateRange.desde}
              onChange={(e) => handleDateChange('desde', e.target.value)}
              max={dateRange.hasta}
              className="download-date-input-compact"
              disabled={isLoading || disabled}
            />
            <span className="download-date-separator">-</span>
            <input
              type="date"
              value={dateRange.hasta}
              onChange={(e) => handleDateChange('hasta', e.target.value)}
              min={dateRange.desde}
              className="download-date-input-compact"
              disabled={isLoading || disabled}
            />
          </div>
          <button
            className="btn-download-compact"
            onClick={handleDownload}
            disabled={isLoading || disabled || !isValidRange}
          >
            <Download size={16} />
            {isLoading ? 'Generando...' : 'PDF'}
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`service-download-section service-download-section--card ${className}`}>
        <div className="download-card-header">
          <ServiceIcon size={24} />
          <h4>Descargar Reportes de {serviceName}</h4>
        </div>
        <div className="download-card-body">
          <div className="download-date-inputs-vertical">
            <div className="download-date-field">
              <label>
                <Calendar size={14} />
                Desde
              </label>
              <input
                type="date"
                value={dateRange.desde}
                onChange={(e) => handleDateChange('desde', e.target.value)}
                max={dateRange.hasta}
                disabled={isLoading || disabled}
              />
            </div>
            <div className="download-date-field">
              <label>
                <Calendar size={14} />
                Hasta
              </label>
              <input
                type="date"
                value={dateRange.hasta}
                onChange={(e) => handleDateChange('hasta', e.target.value)}
                min={dateRange.desde}
                disabled={isLoading || disabled}
              />
            </div>
          </div>
          {!isValidRange && (
            <p className="download-error-text">
              La fecha "Desde" debe ser anterior a "Hasta"
            </p>
          )}
          <button
            className="btn-download-card"
            onClick={handleDownload}
            disabled={isLoading || disabled || !isValidRange}
          >
            <Download size={18} />
            {isLoading ? 'Generando PDF...' : 'Descargar PDF'}
          </button>
        </div>
      </div>
    );
  }

  // Variant: default
  return (
    <div className={`service-download-section ${className}`}>
      <div className="download-section-header">
        <ServiceIcon size={20} />
        <span>Descargar Reportes de {serviceName}</span>
      </div>
      <div className="download-controls">
        <div className="download-date-inputs">
          <div className="download-date-field">
            <label>
              <Calendar size={14} />
              Desde
            </label>
            <input
              type="date"
              value={dateRange.desde}
              onChange={(e) => handleDateChange('desde', e.target.value)}
              max={dateRange.hasta}
              disabled={isLoading || disabled}
            />
          </div>
          <div className="download-date-field">
            <label>
              <Calendar size={14} />
              Hasta
            </label>
            <input
              type="date"
              value={dateRange.hasta}
              onChange={(e) => handleDateChange('hasta', e.target.value)}
              min={dateRange.desde}
              disabled={isLoading || disabled}
            />
          </div>
        </div>
        {!isValidRange && (
          <p className="download-error-text">
            La fecha "Desde" debe ser anterior a "Hasta"
          </p>
        )}
        <button
          className="btn-download-service"
          onClick={handleDownload}
          disabled={isLoading || disabled || !isValidRange}
        >
          <Download size={18} />
          {isLoading ? 'Generando PDF...' : 'Descargar PDF'}
        </button>
      </div>
    </div>
  );
};

export default ServiceDownloadSection;
