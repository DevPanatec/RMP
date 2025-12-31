import { X, MapPin, Clock, Calendar, FileText, Sparkles, User } from '../Icons';
import MapComponent from '../Map/MapComponent';
import './RouteReportDetailModal.css';

const CleaningReportDetailModal = ({ report, onClose }) => {
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
  const salaParaMapa = report.latitud && report.longitud
    ? [{
        _id: report.sala_id || 'sala-limpieza',
        nombre: `${report.sala_nombre} - ${report.area_nombre}`,
        latitud: report.latitud,
        longitud: report.longitud,
        tipo: 'limpieza',
      }]
    : [];

  console.log('🗺️ CleaningReportDetailModal - Reporte:', report);
  console.log('🗺️ Sala para mapa:', salaParaMapa);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="route-report-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="route-report-header">
          <div className="route-report-title">
            <Sparkles size={24} />
            <div>
              <h2>{report.sala_nombre}</h2>
              <p className="route-report-subtitle">
                Reporte de Limpieza - {report.area_nombre}
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
            <h3><MapPin size={20} /> Ubicación de Limpieza</h3>
            {salaParaMapa.length > 0 ? (
              <div className="route-map-container">
                <MapComponent
                  key={`map-${report._id}`}
                  camiones={[]}
                  rutas={[]}
                  personnel={[]}
                  lugares={salaParaMapa}
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
                  <p>No hay coordenadas GPS disponibles para esta sala</p>
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
                <span className="stat-value">{report.hora_inicio} - {report.hora_fin}</span>
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
              <User size={20} />
              <div>
                <span className="stat-label">Realizado por</span>
                <span className="stat-value">{report.usuario_completo}</span>
              </div>
            </div>
          </div>

          {/* Fotos - Antes */}
          {report.fotos_antes && report.fotos_antes.length > 0 && (
            <div className="paradas-section">
              <h3><FileText size={20} /> Fotos Antes ({report.fotos_antes.length})</h3>
              <div className="fotos-grid">
                {report.fotos_antes.map((foto, idx) => (
                  <div key={idx} className="foto-item">
                    <img src={foto.url} alt={`Antes - ${foto.file_name}`} />
                    <span className="foto-label">Antes</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fotos - Durante */}
          {report.fotos_durante && report.fotos_durante.length > 0 && (
            <div className="paradas-section">
              <h3><FileText size={20} /> Fotos Durante ({report.fotos_durante.length})</h3>
              <div className="fotos-grid">
                {report.fotos_durante.map((foto, idx) => (
                  <div key={idx} className="foto-item">
                    <img src={foto.url} alt={`Durante - ${foto.file_name}`} />
                    <span className="foto-label">Durante</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fotos - Después */}
          {report.fotos_despues && report.fotos_despues.length > 0 && (
            <div className="paradas-section">
              <h3><FileText size={20} /> Fotos Después ({report.fotos_despues.length})</h3>
              <div className="fotos-grid">
                {report.fotos_despues.map((foto, idx) => (
                  <div key={idx} className="foto-item">
                    <img src={foto.url} alt={`Después - ${foto.file_name}`} />
                    <span className="foto-label">Después</span>
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

export default CleaningReportDetailModal;
