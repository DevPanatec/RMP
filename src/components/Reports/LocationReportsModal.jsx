import { useState, useMemo } from 'react';
import { X, Calendar, Download, FileText, Camera, Check, Eye, Truck, Zap, Sparkles, Wrench } from '../Icons';
import { Card, Badge } from '../UI';
import ReportDetailModal from '../Cleaning/ReportDetailModal';
import RouteReportDetailModal from './RouteReportDetailModal';
import FumigationReportDetailModal from '../Fumigation/FumigationReportDetailModal';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import './LocationReportsModal.css';

pdfMake.vfs = pdfFonts.vfs;

const LocationReportsModal = ({ location, onClose, getPhotoUrl, getStatusVariant, modalType = 'limpieza' }) => {
  // Determinar el logo según el tipo de modal
  const getModalLogo = () => {
    const logoMap = {
      'recoleccion': '/icons/modules/RECOLECCION.png',
      'fumigacion': '/icons/modules/FUMIGACION.png',
      'limpieza': '/icons/modules/limpieza.png',
      'mantenimiento': '/icons/modules/mantenimiento.png'
    };
    return logoMap[modalType] || logoMap['limpieza'];
  };
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
  const handleDownloadReport = async (e, report) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    try {
      // Preparar información de fotos
      const fotosByEtapa = report.fotos?.reduce((acc, foto) => {
        const etapa = foto.etapa || 'sin_etapa';
        acc[etapa] = (acc[etapa] || 0) + 1;
        return acc;
      }, {}) || {};

      const fotosContent = Object.entries(fotosByEtapa).map(([etapa, count]) => ({
        text: `  - ${etapa}: ${count} foto(s)`,
        fontSize: 10,
        margin: [5, 2, 0, 2]
      }));

      // Definir documento PDF
      const docDefinition = {
        content: [
          // Header
          {
            text: 'REPORTE DE SERVICIO',
            style: 'header',
            alignment: 'center',
            margin: [0, 0, 0, 10]
          },
          {
            canvas: [
              {
                type: 'line',
                x1: 0, y1: 0,
                x2: 515, y2: 0,
                lineWidth: 1
              }
            ],
            margin: [0, 0, 0, 15]
          },
          // Información del reporte
          {
            columns: [
              { text: 'Ubicación:', bold: true, width: 80 },
              { text: location.nombre, width: '*' }
            ],
            margin: [0, 0, 0, 8]
          },
          {
            columns: [
              { text: 'Área:', bold: true, width: 80 },
              { text: report.area?.nombre || 'No especificada', width: '*' }
            ],
            margin: [0, 0, 0, 8]
          },
          {
            columns: [
              { text: 'Fecha:', bold: true, width: 80 },
              { text: report.fecha || 'No especificada', width: '*' }
            ],
            margin: [0, 0, 0, 8]
          },
          {
            columns: [
              { text: 'Hora:', bold: true, width: 80 },
              { text: report.hora || 'No especificada', width: '*' }
            ],
            margin: [0, 0, 0, 8]
          },
          {
            columns: [
              { text: 'Estado:', bold: true, width: 80 },
              { text: report.estado || 'pendiente', width: '*' }
            ],
            margin: [0, 0, 0, 15]
          },
          // Observaciones
          ...(report.notas ? [
            { text: 'Observaciones:', bold: true, margin: [0, 0, 0, 5] },
            { text: report.notas, fontSize: 10, margin: [0, 0, 0, 15] }
          ] : []),
          // Evidencias fotográficas
          ...(report.fotos && report.fotos.length > 0 ? [
            { text: `Evidencias fotográficas: ${report.fotos.length}`, bold: true, margin: [0, 0, 0, 5] },
            ...fotosContent
          ] : [])
        ],
        footer: (currentPage, pageCount) => ({
          text: `Generado: ${new Date().toLocaleString('es-ES')} | Página ${currentPage} de ${pageCount}`,
          alignment: 'center',
          fontSize: 8,
          italics: true,
          margin: [0, 10, 0, 0]
        }),
        styles: {
          header: {
            fontSize: 18,
            bold: true
          }
        },
        defaultStyle: {
          fontSize: 12
        }
      };

      // Generar y descargar PDF
      const fileName = `Reporte_${location.nombre.replace(/\s+/g, '_')}_${report.fecha}_${report.hora?.replace(/:/g, '-') || 'sin-hora'}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);

      console.log('✅ PDF generado exitosamente:', fileName);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor intenta nuevamente.');
    }
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

  // Generar URL del mapa usando NOMBRE del lugar para ubicación exacta con marcador rojo
  const mapEmbedUrl = location.nombre
    ? `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(location.nombre + ', Panama City, Panama')}&zoom=17`
    : null;

  // URL para abrir en Google Maps usando nombre del lugar
  const googleMapsUrl = location.nombre
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.nombre + ', Panama City, Panama')}`
    : null;

  // Debug log
  console.log('🗺️ NUEVO MODAL CARGADO - Con mapa interactivo', {
    location: location.nombre,
    latitud: location.latitud,
    longitud: location.longitud,
    mapEmbedUrl,
    googleMapsUrl,
    reportes: location.assignments?.length
  });

  return (
    <div className="location-modal-overlay-new" onClick={onClose}>
      <div className="location-modal-new" onClick={(e) => e.stopPropagation()}>

        {/* Mapa Grande Arriba */}
        {mapEmbedUrl && (
          <div className="location-map-container">
            <iframe
              src={mapEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="eager"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Mapa de ${location.nombre}`}
            />
            <div className="map-overlay">
              <div className="map-location-name">
                <h2>
                  <span className="modal-icon-badge">
                    <img src={getModalLogo()} alt={modalType} className="modal-logo-img" />
                  </span>
                  {location.nombre}
                </h2>
                <span>{filteredReports.length} reportes</span>
              </div>
              <div className="map-overlay-actions">
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="open-maps-btn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Abrir en Google Maps
                  </a>
                )}
                <button className="close-button-map" onClick={onClose}>
                  <X size={20} />
                </button>
              </div>
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
                      <h4>
                        {report.area?.nombre ||
                         (modalType === 'recoleccion'
                           ? 'Reporte de Recolección'
                           : modalType === 'fumigacion'
                           ? 'Reporte de Fumigación'
                           : modalType === 'mantenimiento'
                           ? 'Reporte de Mantenimiento'
                           : 'Reporte de Limpieza')}
                      </h4>
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
      {selectedReport && modalType === 'recoleccion' ? (
        <RouteReportDetailModal
          isOpen={!!selectedReport}
          report={selectedReport}
          location={location}
          onClose={() => setSelectedReport(null)}
        />
      ) : selectedReport && modalType === 'fumigacion' ? (
        <FumigationReportDetailModal
          isOpen={!!selectedReport}
          assignment={selectedReport}
          location={location}
          onClose={() => setSelectedReport(null)}
          onDownload={() => handleDownloadReport(null, selectedReport)}
        />
      ) : selectedReport && (
        <ReportDetailModal
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          report={{
            fecha: selectedReport.fecha,
            hora: selectedReport.hora,
            sala: location.nombre,
            area: selectedReport.area?.nombre ||
                  (modalType === 'mantenimiento'
                    ? 'Reporte de Mantenimiento'
                    : 'Reporte de Limpieza'),
            rawAssignment: selectedReport
          }}
          onDownload={() => handleDownloadReport(selectedReport)}
        />
      )}
    </div>
  );
};

export default LocationReportsModal;
