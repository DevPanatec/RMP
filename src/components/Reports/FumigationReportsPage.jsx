import { useState, useMemo } from 'react';
import { Calendar, Download, FileText, Eye, X, Spray } from '../Icons';
import { Badge } from '../UI';
import FumigationReportDetailModal from '../Fumigation/FumigationReportDetailModal';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import './FumigationReportsPage.css';

pdfMake.vfs = pdfFonts.vfs;

// Helper para parsear fechas sin problemas de timezone
const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr.includes('T')) return new Date(dateStr);
  return new Date(dateStr + 'T00:00:00');
};

const FumigationReportsPage = ({ location, onClose, getStatusVariant }) => {
  const [dateRange, setDateRange] = useState({
    inicio: new Date(Date.now() - 365*24*60*60*1000).toISOString().split('T')[0],
    fin: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]
  });
  const [selectedReports, setSelectedReports] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // Filtrar reportes por rango de fechas
  const filteredReports = useMemo(() => {
    if (!location.assignments || location.assignments.length === 0) {
      return [];
    }

    return location.assignments.filter(assignment => {
      const assignmentDate = parseLocalDate(assignment.fecha);
      const startDate = parseLocalDate(dateRange.inicio);
      const endDate = parseLocalDate(dateRange.fin);
      return assignmentDate >= startDate && assignmentDate <= endDate;
    });
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
    setSelectedReport(report);
  };

  // Descargar reporte individual
  const handleDownloadReport = async (e, report) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    try {
      const docDefinition = {
        content: [
          {
            text: 'REPORTE DE FUMIGACIÓN',
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
          {
            columns: [
              { text: 'Ubicación:', bold: true, width: 100 },
              { text: location.nombre, width: '*' }
            ],
            margin: [0, 0, 0, 8]
          },
          {
            columns: [
              { text: 'Tipo:', bold: true, width: 100 },
              { text: report.tipo_fumigacion === 'interna' ? 'Fumigación Interna' : 'Fumigación Externa', width: '*' }
            ],
            margin: [0, 0, 0, 8]
          },
          {
            columns: [
              { text: 'Fecha:', bold: true, width: 100 },
              { text: report.fecha || 'No especificada', width: '*' }
            ],
            margin: [0, 0, 0, 8]
          },
          {
            columns: [
              { text: 'Horario:', bold: true, width: 100 },
              { text: `${report.horario_inicio} - ${report.horario_fin}`, width: '*' }
            ],
            margin: [0, 0, 0, 8]
          },
          ...(report.productos_utilizados && report.productos_utilizados.length > 0 ? [
            { text: 'Productos Utilizados:', bold: true, margin: [0, 10, 0, 5] },
            {
              ul: report.productos_utilizados,
              margin: [0, 0, 0, 15]
            }
          ] : []),
          ...(report.observaciones ? [
            { text: 'Observaciones:', bold: true, margin: [0, 0, 0, 5] },
            { text: report.observaciones, fontSize: 10, margin: [0, 0, 0, 15] }
          ] : []),
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

      const fileName = `Fumigacion_${location.nombre.replace(/\s+/g, '_')}_${report.fecha}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor intenta nuevamente.');
    }
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

  // Generar URL del mapa - preferir coordenadas GPS si están disponibles
  const mapQuery = location.latitud && location.longitud
    ? `${location.latitud},${location.longitud}`
    : encodeURIComponent(location.nombre + ', Panama City, Panama');
  const mapEmbedUrl = `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${mapQuery}&zoom=17`;

  const googleMapsUrl = location.latitud && location.longitud
    ? `https://www.google.com/maps/search/?api=1&query=${location.latitud},${location.longitud}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.nombre + ', Panama City, Panama')}`;

  return (
    <div className="fumigation-reports-page">
      {/* Header con botón de cerrar */}
      <div className="fumigation-page-header">
        <div className="fumigation-page-title">
          <Spray size={28} />
          <h1>Reportes de Fumigación</h1>
        </div>
        {onClose && (
          <button className="fumigation-page-close" onClick={onClose}>
            <X size={24} />
          </button>
        )}
      </div>

      {/* Mapa Grande Arriba */}
      {mapEmbedUrl && (
        <div className="fumigation-map-container">
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
          <div className="fumigation-map-overlay">
            <div className="fumigation-map-location">
              <h2>{location.nombre}</h2>
              <span>{filteredReports.length} reportes</span>
            </div>
            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="fumigation-open-maps"
              >
                Abrir en Google Maps
              </a>
            )}
          </div>
        </div>
      )}

      {/* Controles y Filtros */}
      <div className="fumigation-reports-section">
        <div className="fumigation-controls-bar">
          <div className="fumigation-controls-left">
            <button
              className={`fumigation-filter-btn ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Calendar size={16} />
              Filtrar por fecha
            </button>
          </div>
          <button
            className="fumigation-download-btn"
            onClick={() => alert('Descargando reportes...')}
            disabled={filteredReports.length === 0}
          >
            <Download size={16} />
            {selectedReports.length > 0 ? `Descargar (${selectedReports.length})` : 'Descargar todos'}
          </button>
        </div>

        {/* Filtros de Fecha */}
        {showFilters && (
          <div className="fumigation-date-filters">
            <div className="fumigation-date-presets">
              <button onClick={() => setDatePreset('today')}>Hoy</button>
              <button onClick={() => setDatePreset('week')}>7 días</button>
              <button onClick={() => setDatePreset('month')}>30 días</button>
              <button onClick={() => setDatePreset('all')}>Todo</button>
            </div>
            <div className="fumigation-date-range">
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
        <div className="fumigation-reports-list">
          {filteredReports.length === 0 ? (
            <div className="fumigation-empty">
              <FileText size={48} />
              <p>No hay reportes en el rango seleccionado</p>
            </div>
          ) : (
            filteredReports.map(report => (
              <div
                key={report._id || report.id}
                className={`fumigation-report-card ${selectedReports.includes(report._id || report.id) ? 'selected' : ''}`}
              >
                <div className="fumigation-report-header">
                  <input
                    type="checkbox"
                    checked={selectedReports.includes(report._id || report.id)}
                    onChange={() => toggleReportSelection(report._id || report.id)}
                    className="fumigation-checkbox"
                  />
                  <div className="fumigation-report-info">
                    <h4>
                      {report.tipo_fumigacion === 'interna' ? 'Fumigación Interna' : 'Fumigación Externa'}
                    </h4>
                    <div className="fumigation-report-meta">
                      <span className="fumigation-date">
                        <Calendar size={14} />
                        {parseLocalDate(report.fecha).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })} - {report.horario_inicio}
                      </span>
                      <Badge
                        variant={getStatusVariant ? getStatusVariant(report.estado) : 'default'}
                        text={report.estado}
                      />
                    </div>
                  </div>
                  <div className="fumigation-report-actions">
                    <button
                      className="fumigation-view-btn"
                      onClick={(e) => handleViewReport(e, report)}
                      title="Ver detalles y fotos"
                    >
                      <Eye size={16} />
                      Ver
                    </button>
                    <button
                      className="fumigation-download-single"
                      onClick={(e) => handleDownloadReport(e, report)}
                      title="Descargar PDF"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>

                {report.observaciones && (
                  <div className="fumigation-report-notes">
                    <strong>Notas:</strong> {report.observaciones}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de Detalle del Reporte */}
      {selectedReport && (
        <FumigationReportDetailModal
          isOpen={!!selectedReport}
          assignment={selectedReport}
          location={location}
          onClose={() => setSelectedReport(null)}
          onDownload={() => handleDownloadReport(null, selectedReport)}
        />
      )}
    </div>
  );
};

export default FumigationReportsPage;
