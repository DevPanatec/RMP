import { useState, useMemo } from 'react';
import { X, Calendar, Download, FileText, Camera, Check, Eye } from '../Icons';
import { Card, Badge } from '../UI';
import ReportDetailModal from '../Cleaning/ReportDetailModal';
import './LocationReportsModal.css';

const LocationReportsModal = ({ location, onClose, getPhotoUrl, getStatusVariant }) => {
  const [dateRange, setDateRange] = useState({
    inicio: new Date(Date.now() - 365*24*60*60*1000).toISOString().split('T')[0],
    fin: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]
  });
  const [selectedReports, setSelectedReports] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // Filtrar reportes por rango de fechas
  const filteredReports = useMemo(() => {
    console.log('🔍 Location assignments:', location.assignments);
    console.log('🔍 Date range:', dateRange);

    if (!location.assignments || location.assignments.length === 0) {
      console.log('❌ No hay assignments en location');
      return [];
    }

    const filtered = location.assignments.filter(assignment => {
      const assignmentDate = new Date(assignment.fecha);
      const startDate = new Date(dateRange.inicio);
      const endDate = new Date(dateRange.fin);
      console.log('📅 Comparando:', {
        fecha: assignment.fecha,
        assignmentDate,
        startDate,
        endDate,
        cumple: assignmentDate >= startDate && assignmentDate <= endDate
      });
      return assignmentDate >= startDate && assignmentDate <= endDate;
    });

    console.log('✅ Reportes filtrados:', filtered);
    return filtered;
  }, [location.assignments, dateRange]);

  // Toggle selección de reporte
  const toggleReportSelection = (reportId) => {
    setSelectedReports(prev =>
      prev.includes(reportId)
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  // Abrir modal de detalle
  const handleViewReport = (e, report) => {
    e.stopPropagation();
    console.log('📝 Abriendo modal de detalle para:', report);
    setSelectedReport(report);
  };

  // Descargar reporte individual
  const handleDownloadReport = (e, report) => {
    e.stopPropagation();
    console.log('📥 Descargando reporte:', report);
    alert(`Generando PDF para: ${report.area?.nombre}\nFecha: ${report.fecha}`);
  };

  // Descargar reportes seleccionados como ZIP
  const handleDownloadSelected = () => {
    const reportsToDownload = selectedReports.length > 0
      ? filteredReports.filter(r => selectedReports.includes(r.id))
      : filteredReports;

    console.log('Descargando reportes seleccionados:', reportsToDownload);
    alert(`Generando ZIP con ${reportsToDownload.length} reportes...`);
  };

  // Presets de fecha
  const setDatePreset = (preset) => {
    const today = new Date();
    let startDate;

    switch (preset) {
      case 'today':
        startDate = today;
        break;
      case 'week':
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = new Date(2020, 0, 1);
        break;
      default:
        return;
    }

    setDateRange({
      inicio: startDate.toISOString().split('T')[0],
      fin: today.toISOString().split('T')[0]
    });
  };

  // Generar URL del mapa de Google Maps embed
  const mapUrl = location.latitud && location.longitud
    ? `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${location.latitud},${location.longitud}&zoom=16`
    : null;

  // Debug log
  console.log('🗺️ NUEVO MODAL CARGADO - Con mapa de Google Maps', {
    location: location.nombre,
    mapUrl,
    reportes: location.assignments?.length
  });

  return (
    <div className="location-modal-overlay-new" onClick={onClose}>
      <div className="location-modal-new" onClick={(e) => e.stopPropagation()}>

        {/* Mapa Grande Arriba */}
        {mapUrl && (
          <div className="location-map-container">
            <iframe
              src={mapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Mapa de ${location.nombre}`}
            />
            <div className="map-overlay">
              <div className="map-location-name">
                <h2>{location.nombre}</h2>
                <span>{filteredReports.length} reportes</span>
              </div>
              <button className="close-button-map" onClick={onClose}>
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Controles y Filtros */}
        <div className="reports-section">
          <div className="reports-controls-bar">
            <div className="controls-left">
              <button
                className={`filter-btn ${showFilters ? 'active' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Calendar size={16} />
                Filtrar por fecha
              </button>
            </div>
            <button
              className="download-all-btn"
              onClick={handleDownloadSelected}
              disabled={filteredReports.length === 0}
            >
              <Download size={16} />
              {selectedReports.length > 0 ? `Descargar (${selectedReports.length})` : 'Descargar todos'}
            </button>
          </div>

          {/* Filtros de Fecha */}
          {showFilters && (
            <div className="date-filters-bar">
              <div className="date-presets-buttons">
                <button onClick={() => setDatePreset('today')}>Hoy</button>
                <button onClick={() => setDatePreset('week')}>7 días</button>
                <button onClick={() => setDatePreset('month')}>30 días</button>
                <button onClick={() => setDatePreset('all')}>Todo</button>
              </div>
              <div className="date-range-inputs-inline">
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
          )}

          {/* Lista de Reportes */}
          <div className="reports-list-container">
            {filteredReports.length === 0 ? (
              <div className="empty-reports">
                <FileText size={48} />
                <p>No hay reportes en el rango seleccionado</p>
              </div>
            ) : (
              filteredReports.map(report => (
                <div
                  key={report.id}
                  className={`report-card ${selectedReports.includes(report.id) ? 'selected' : ''}`}
                >
                  <div className="report-card-header">
                    <input
                      type="checkbox"
                      checked={selectedReports.includes(report.id)}
                      onChange={() => toggleReportSelection(report.id)}
                      className="report-checkbox-custom"
                    />
                    <div className="report-info-main">
                      <h4>{report.area?.nombre || 'Área no especificada'}</h4>
                      <div className="report-meta-inline">
                        <span className="report-date-inline">
                          <Calendar size={14} />
                          {new Date(report.fecha).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })} - {report.hora}
                        </span>
                        <Badge
                          variant={getStatusVariant(report.estado)}
                          text={report.estado}
                        />
                      </div>
                    </div>
                    <div className="report-actions">
                      <button
                        className="view-report-btn"
                        onClick={(e) => handleViewReport(e, report)}
                        title="Ver detalles y fotos"
                      >
                        <Eye size={16} />
                        Ver
                      </button>
                      <button
                        className="download-single-btn"
                        onClick={(e) => handleDownloadReport(e, report)}
                        title="Descargar PDF"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Notas */}
                  {report.notas && (
                    <div className="report-notes-inline">
                      <strong>Notas:</strong> {report.notas}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Detalle del Reporte */}
      {selectedReport && (
        <ReportDetailModal
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          report={{
            fecha: selectedReport.fecha,
            hora: selectedReport.hora,
            sala: location.nombre,
            area: selectedReport.area?.nombre || 'Área no especificada',
            rawAssignment: selectedReport
          }}
          onDownload={() => handleDownloadReport(selectedReport)}
        />
      )}
    </div>
  );
};

export default LocationReportsModal;
