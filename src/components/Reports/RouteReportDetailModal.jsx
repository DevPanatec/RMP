import { X, Truck, Calendar, Clock, MapPin, Package } from '../Icons';
import './RouteReportDetailModal.css';

const RouteReportDetailModal = ({ isOpen, report, location, onClose }) => {
  if (!isOpen || !report) return null;

  // Generar URL del mapa con todas las paradas de la ruta
  const generateMapUrl = () => {
    if (!report.paradas_completadas || report.paradas_completadas.length === 0) {
      return null;
    }

    // Crear waypoints para Google Maps Directions
    const paradas = report.paradas_completadas.filter(p => p.latitud && p.longitud);

    if (paradas.length === 0) return null;

    const origin = `${paradas[0].latitud},${paradas[0].longitud}`;
    const destination = `${paradas[paradas.length - 1].latitud},${paradas[paradas.length - 1].longitud}`;

    let waypoints = '';
    if (paradas.length > 2) {
      waypoints = '&waypoints=' + paradas.slice(1, -1)
        .map(p => `${p.latitud},${p.longitud}`)
        .join('|');
    }

    return `https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${origin}&destination=${destination}${waypoints}&mode=driving`;
  };

  const mapUrl = generateMapUrl();

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="route-detail-overlay" onClick={onClose}>
      <div className="route-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Mapa del tracking */}
        {mapUrl ? (
          <div className="route-map-container">
            <iframe
              src={mapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Mapa de ruta"
            />
            <button className="route-close-btn" onClick={onClose}>
              <X size={24} />
            </button>
          </div>
        ) : (
          <div className="route-map-placeholder">
            <MapPin size={48} />
            <p>No hay información de tracking disponible</p>
            <button className="route-close-btn" onClick={onClose}>
              <X size={24} />
            </button>
          </div>
        )}

        {/* Datos del reporte */}
        <div className="route-details-content">
          <div className="route-detail-header">
            <h2>
              <Truck size={24} />
              {report.ruta_nombre}
            </h2>
            <p className="route-location">{location?.nombre}</p>
          </div>

          <div className="route-info-grid">
            <div className="route-info-card">
              <div className="info-label">Conductor</div>
              <div className="info-value">{report.conductor_nombre}</div>
            </div>

            <div className="route-info-card">
              <div className="info-label">Vehículo</div>
              <div className="info-value">{report.vehiculo_placa}</div>
            </div>

            <div className="route-info-card">
              <div className="info-label">
                <Calendar size={16} />
                Fecha
              </div>
              <div className="info-value">
                {new Date(report.fecha_completacion).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
            </div>

            <div className="route-info-card">
              <div className="info-label">
                <Clock size={16} />
                Duración total
              </div>
              <div className="info-value">
                {formatTime(report.tiempo_total_segundos)}
              </div>
            </div>
          </div>

          {/* Parada específica de este lugar */}
          {report.parada_info && (
            <div className="parada-detail-section">
              <h3>
                <MapPin size={20} />
                Detalle de esta parada
              </h3>
              <div className="parada-info-grid">
                <div className="parada-info-item">
                  <span className="parada-label">Hora de llegada:</span>
                  <span className="parada-value">{report.parada_info.timestamp_llegada}</span>
                </div>
                <div className="parada-info-item">
                  <span className="parada-label">Hora de salida:</span>
                  <span className="parada-value">{report.parada_info.timestamp_salida}</span>
                </div>
                <div className="parada-info-item">
                  <span className="parada-label">Categoría de carga:</span>
                  <span className={`categoria-badge categoria-${report.parada_info.categoria_carga}`}>
                    <Package size={14} />
                    {report.parada_info.categoria_carga}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Todas las paradas de la ruta */}
          {report.paradas_completadas && report.paradas_completadas.length > 0 && (
            <div className="all-stops-section">
              <h3>Recorrido completo ({report.paradas_completadas.length} paradas)</h3>
              <div className="stops-list">
                {report.paradas_completadas.map((parada, index) => (
                  <div
                    key={index}
                    className={`stop-item ${parada.direccion === location?.nombre ? 'current-location' : ''}`}
                  >
                    <div className="stop-number">{parada.orden}</div>
                    <div className="stop-info">
                      <div className="stop-name">{parada.direccion}</div>
                      <div className="stop-meta">
                        <span>{parada.timestamp_llegada} - {parada.timestamp_salida}</span>
                        <span className={`stop-categoria categoria-${parada.categoria_carga}`}>
                          {parada.categoria_carga}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observaciones */}
          {report.observaciones && (
            <div className="observaciones-section">
              <h3>Observaciones</h3>
              <p>{report.observaciones}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RouteReportDetailModal;
