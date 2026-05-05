import { useState, useMemo } from 'react';
import { X, Calendar, Eye, FileText, Truck, Clock, Package } from '../Icons';
import { Badge } from '../UI';
import './LocationReportsModal.css';

const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr.includes('T')) return new Date(dateStr);
  return new Date(dateStr + 'T00:00:00');
};

const formatTime = (seconds) => {
  if (!seconds && seconds !== 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const RouteReportsListModal = ({ card, onClose, onSelectReport, getStatusVariant }) => {
  const [dateRange, setDateRange] = useState({
    inicio: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    fin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  const [showFilters, setShowFilters] = useState(false);

  const filteredReports = useMemo(() => {
    if (!card.reports || card.reports.length === 0) return [];
    const start = parseLocalDate(dateRange.inicio);
    const end = parseLocalDate(dateRange.fin);
    return card.reports
      .filter(r => {
        const d = parseLocalDate(r.fecha_completacion);
        return d >= start && d <= end;
      })
      .sort((a, b) => (a.fecha_completacion < b.fecha_completacion ? 1 : -1));
  }, [card.reports, dateRange]);

  const setDatePreset = (preset) => {
    const today = new Date();
    let startDate;
    switch (preset) {
      case 'today': startDate = today; break;
      case 'week': startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case 'month': startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case 'all': startDate = new Date(2020, 0, 1); break;
      default: return;
    }
    setDateRange({
      inicio: startDate.toISOString().split('T')[0],
      fin: today.toISOString().split('T')[0],
    });
  };

  const ubic = card.ubicacion;
  const hasCoords = ubic?.latitud && ubic?.longitud;
  const mapQuery = hasCoords
    ? `${ubic.latitud},${ubic.longitud}`
    : encodeURIComponent((ubic?.nombre || card.nombre) + ', Panama City, Panama');
  const mapEmbedUrl = `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${mapQuery}&zoom=16`;
  const googleMapsUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${ubic.latitud},${ubic.longitud}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((ubic?.nombre || card.nombre) + ', Panama City, Panama')}`;

  return (
    <div className="location-modal-overlay-new" onClick={onClose}>
      <div className="location-modal-new" onClick={(e) => e.stopPropagation()}>
        <div className="location-map-container">
          <iframe
            src={mapEmbedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="eager"
            referrerPolicy="no-referrer-when-downgrade"
            title={`Mapa de ${card.nombre}`}
          />
          <div className="map-overlay">
            <div className="map-location-name">
              <h2>
                <span className="modal-icon-badge">
                  <img src="/icons/modules/RECOLECCION.png" alt="recoleccion" className="modal-logo-img" />
                </span>
                {card.nombre}
              </h2>
              <span>
                {filteredReports.length} reporte{filteredReports.length === 1 ? '' : 's'}
                {card.paradasCount ? ` · ${card.paradasCount} paradas planificadas` : ''}
                {card.orphan ? ' · ruta eliminada' : ''}
              </span>
            </div>
            <div className="map-overlay-actions">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="open-maps-btn"
                onClick={(e) => e.stopPropagation()}
              >
                Abrir en Google Maps
              </a>
              <button className="close-button-map" onClick={onClose}>
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

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
          </div>

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

          <div className="reports-list-container">
            {filteredReports.length === 0 ? (
              <div className="empty-reports">
                <FileText size={48} />
                <p>
                  {card.reports.length === 0
                    ? 'Esta ruta aún no ha sido ejecutada por ningún conductor.'
                    : 'No hay reportes en el rango seleccionado.'}
                </p>
              </div>
            ) : (
              filteredReports.map(report => {
                const completadas = (report.paradas_completadas || []).filter(p => p.completada).length;
                const total = report.paradas_completadas?.length || 0;
                const fecha = parseLocalDate(report.fecha_completacion);
                return (
                  <div key={report._id} className="report-card">
                    <div className="report-card-header">
                      <div className="report-info-main">
                        <h4>Ejecución del {fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</h4>
                        <div className="report-meta-inline">
                          <span className="report-date-inline">
                            <Truck size={14} />
                            {report.conductor_nombre} · {report.vehiculo_placa}
                          </span>
                          <span className="report-date-inline">
                            <Package size={14} />
                            {completadas}/{total} paradas
                          </span>
                          <span className="report-date-inline">
                            <Clock size={14} />
                            {formatTime(report.tiempo_total_segundos)}
                          </span>
                          {report.terminacion_anticipada && (
                            <Badge variant="warning" text="Terminada anticipadamente" />
                          )}
                        </div>
                      </div>
                      <div className="report-actions">
                        <button
                          className="view-report-btn"
                          onClick={() => onSelectReport(report)}
                          title="Ver detalles, mapa y paradas"
                        >
                          <Eye size={16} />
                          Ver
                        </button>
                      </div>
                    </div>
                    {report.observaciones && (
                      <div className="report-notes-inline">
                        <strong>Notas:</strong> {report.observaciones}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteReportsListModal;
