import { useState, useMemo, useEffect } from 'react';
import { X, Calendar, Download, Search, Camera, Clock, FileText } from '../Icons';
import { Badge } from '../UI';
import { buildGmapsEmbedUrl } from '../../utils/gmaps';
import './LocationMapModal.css';

// Helper para parsear fechas sin problemas de timezone
const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr.includes('T')) return new Date(dateStr);
  return new Date(dateStr + 'T00:00:00');
};

const LocationMapModal = ({ location, onClose, getPhotoUrl, getStatusVariant }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    inicio: new Date(Date.now() - 365*24*60*60*1000).toISOString().split('T')[0],
    fin: new Date().toISOString().split('T')[0]
  });

  // Reset filtros al cambiar de location (evita bleed entre ubicaciones).
  useEffect(() => {
    setSearchTerm('');
    setDateRange({
      inicio: new Date(Date.now() - 365*24*60*60*1000).toISOString().split('T')[0],
      fin: new Date().toISOString().split('T')[0],
    });
  }, [location?._id ?? location]);

  const filteredReports = useMemo(() => {
    if (!location.assignments || location.assignments.length === 0) return [];

    return location.assignments.filter(assignment => {
      const assignmentDate = parseLocalDate(assignment.fecha);
      const startDate = parseLocalDate(dateRange.inicio);
      const endDate = parseLocalDate(dateRange.fin);
      const dateMatch = assignmentDate >= startDate && assignmentDate <= endDate;

      const searchMatch = !searchTerm ||
        (assignment.area?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (assignment.responsable?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());

      return dateMatch && searchMatch;
    });
  }, [location.assignments, dateRange, searchTerm]);

  const handleDownloadReport = (report) => {
    alert(`Generando PDF para: ${report.area?.nombre}\nFecha: ${report.fecha}`);
  };

  const setDatePreset = (preset) => {
    const today = new Date();
    let startDate;
    switch (preset) {
      case 'week': startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case 'month': startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case 'all': startDate = new Date(2020, 0, 1); break;
      default: return;
    }
    setDateRange({
      inicio: startDate.toISOString().split('T')[0],
      fin: today.toISOString().split('T')[0]
    });
  };

  const mapUrl = location.latitud && location.longitud
    ? buildGmapsEmbedUrl(`${location.latitud},${location.longitud}`, 16)
    : null;

  return (
    <div className="location-modal-overlay" onClick={onClose}>
      <div className="location-modal" onClick={(e) => e.stopPropagation()}>

        {/* MAPA ARRIBA */}
        {mapUrl && (
          <div className="modal-map-section">
            <iframe
              src={mapUrl}
              style={{ width: '100%', height: '100%', border: 0 }}
              allowFullScreen
              loading="lazy"
              title={location.nombre}
            />
            <div className="modal-map-header">
              <div>
                <h2>{location.nombre}</h2>
                <span className="report-count-badge">{filteredReports.length} reportes</span>
              </div>
              <button className="modal-close-btn" onClick={onClose}>
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* REPORTES ABAJO */}
        <div className="modal-content">

          {/* Barra de búsqueda y filtros */}
          <div className="modal-filters">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Buscar por área o responsable..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="date-filters">
              <button
                className="filter-btn"
                onClick={() => setDatePreset('week')}
              >
                7 días
              </button>
              <button
                className="filter-btn"
                onClick={() => setDatePreset('month')}
              >
                30 días
              </button>
              <button
                className="filter-btn"
                onClick={() => setDatePreset('all')}
              >
                Todos
              </button>
              <div className="date-range-inputs">
                <input
                  type="date"
                  value={dateRange.inicio}
                  onChange={(e) => setDateRange(prev => ({ ...prev, inicio: e.target.value }))}
                />
                <span>—</span>
                <input
                  type="date"
                  value={dateRange.fin}
                  onChange={(e) => setDateRange(prev => ({ ...prev, fin: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Lista de reportes */}
          <div className="reports-list">
            {filteredReports.length === 0 ? (
              <div className="empty-reports">
                <Calendar size={56} style={{ color: '#9ca3af' }} />
                <p>No hay reportes en este rango de fechas</p>
              </div>
            ) : (
              filteredReports.map(report => (
                <div key={report.id} className="report-card">
                  <div className="report-card-header">
                    <div className="report-card-info">
                      <h4>{report.area?.nombre || 'Sin área'}</h4>
                      <div className="report-card-meta">
                        <span className="meta-item">
                          <Calendar size={14} />
                          {parseLocalDate(report.fecha).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                        {report.hora && (
                          <span className="meta-item">
                            <Clock size={14} />
                            {report.hora}
                          </span>
                        )}
                        <Badge
                          variant={getStatusVariant(report.estado)}
                          text={report.estado.replace('_', ' ')}
                        />
                      </div>
                    </div>
                    <div className="report-actions">
                      <button
                        className="view-report-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          alert(`Ver detalles completos del reporte: ${report.area?.nombre}`);
                        }}
                        title="Ver reporte completo"
                      >
                        <FileText size={16} />
                        Ver
                      </button>
                      <button
                        className="download-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadReport(report);
                        }}
                        title="Descargar PDF"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Fotos */}
                  {report.fotos && report.fotos.length > 0 && (
                    <div className="report-photos-section">
                      <div className="photos-label">
                        <Camera size={14} />
                        <span>{report.fotos.length} fotos</span>
                      </div>
                      <div className="photos-grid-compact">
                        {report.fotos.slice(0, 3).map(foto => (
                          <div key={foto.id} className="photo-item-compact">
                            <img src={getPhotoUrl(foto.file_path)} alt={foto.etapa} />
                            <span className="photo-etapa">{foto.etapa}</span>
                          </div>
                        ))}
                        {report.fotos.length > 3 && (
                          <div className="photo-item-compact more-photos">
                            <span>+{report.fotos.length - 3}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notas */}
                  {report.notas && (
                    <div className="report-notes-compact">
                      <strong>Notas:</strong> {report.notas}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationMapModal;
