import { X, MapPin, Clock, Calendar, FileText, Spray, UserCheck } from '../Icons';
import MapComponent from '../Map/MapComponent';
import './RouteReportDetailModal.css';

const FumigationReportDetailModal = ({ report, onClose }) => {
  if (!report) return null;

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Preparar punto para el mapa
  const lugarParaMapa = report.latitud && report.longitud
    ? [{
        _id: report.lugar_id || 'lugar-fumigacion',
        nombre: report.lugar_nombre,
        latitud: report.latitud,
        longitud: report.longitud,
        tipo: 'fumigacion',
      }]
    : [];

  console.log('🗺️ FumigationReportDetailModal - Reporte:', report);
  console.log('🗺️ Lugar para mapa:', lugarParaMapa);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="route-report-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="route-report-header">
          <div className="route-report-title">
            <Spray size={24} />
            <div>
              <h2>{report.lugar_nombre}</h2>
              <p className="route-report-subtitle">
                Reporte de Fumigación {report.tipo_fumigacion === 'interna' ? 'Interna' : 'Externa'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Contenido */}
        <div className="route-report-body">
          {/* 🗺️ MAPA ARRIBA */}
          <div className="route-map-section">
            <h3><MapPin size={20} /> Ubicación de Fumigación</h3>
            {lugarParaMapa.length > 0 ? (
              <div className="route-map-container">
                <MapComponent
                  key={`map-${report._id}`}
                  camiones={[]}
                  rutas={[]}
                  personnel={[]}
                  lugares={lugarParaMapa}
                  showRealTime={false}
                />
              </div>
            ) : (
              <div className="route-map-container" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f3f4f6',
                color: '#6b7280'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <MapPin size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <p>No hay coordenadas GPS disponibles para este lugar</p>
                </div>
              </div>
            )}
          </div>

          {/* 📊 STATS ABAJO */}
          <div className="route-report-stats">
            <div className="stat-card">
              <Calendar size={20} />
              <div>
                <span className="stat-label">Fecha</span>
                <span className="stat-value">
                  {new Date(report.fecha).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
            <div className="stat-card">
              <Clock size={20} />
              <div>
                <span className="stat-label">Horario</span>
                <span className="stat-value">{report.horario_inicio} - {report.horario_fin}</span>
              </div>
            </div>
            <div className="stat-card">
              <Clock size={20} />
              <div>
                <span className="stat-label">Duración</span>
                <span className="stat-value">{formatDuration(report.duracion_minutos)}</span>
              </div>
            </div>
            <div className="stat-card">
              <UserCheck size={20} />
              <div>
                <span className="stat-label">Realizado por</span>
                <span className="stat-value">{report.usuario_completo}</span>
              </div>
            </div>
          </div>

          {/* Productos Utilizados */}
          {report.productos_utilizados && report.productos_utilizados.length > 0 && (
            <div className="paradas-section">
              <h3><Spray size={20} /> Productos Utilizados ({report.productos_utilizados.length})</h3>
              <div className="productos-list">
                {report.productos_utilizados.map((producto, idx) => (
                  <div key={idx} className="producto-item">
                    <Spray size={16} />
                    <span>{producto}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fotos */}
          {report.fotos && report.fotos.length > 0 && (
            <div className="paradas-section">
              <h3><FileText size={20} /> Fotos ({report.fotos.length})</h3>
              <div className="fotos-grid">
                {report.fotos.map((foto, idx) => (
                  <div key={idx} className="foto-item">
                    <img src={foto.url} alt={foto.file_name} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observaciones */}
          {report.observaciones && (
            <div className="observaciones-section">
              <h3><FileText size={20} /> Observaciones</h3>
              <div className="observaciones-text">
                {report.observaciones}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="route-report-footer">
          <button className="btn btn--secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default FumigationReportDetailModal;
