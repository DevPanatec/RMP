import { useState } from 'react';
import { CheckCircle, Clock, MapPin, AlertTriangle, FileText, Download } from '../Icons';
import './RouteCompletionModal.css';

const RouteCompletionModal = ({ isOpen, routeData, riskReports, onConfirm, onCancel }) => {
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !routeData) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(observaciones);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'baja': return '#34c759';
      case 'intermedia': return '#ff9500';
      case 'alta': return '#ff6b35';
      case 'muy alta': return '#ff3b30';
      default: return '#8e8e93';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'baja': return '📄';
      case 'intermedia': return '🗑️';
      case 'alta': return '♻️';
      case 'muy alta': return '🚚';
      default: return '📦';
    }
  };

  const downloadReport = () => {
    let content = `=== REPORTE DE RUTA COMPLETADA ===\n\n`;
    content += `Ruta: ${routeData.nombreRuta}\n`;
    content += `Conductor: ${routeData.conductorNombre}\n`;
    content += `Vehículo: ${routeData.vehiculoPlaca || 'N/A'}\n`;
    content += `Fecha: ${new Date(routeData.fechaInicio).toLocaleDateString('es-ES')}\n`;
    content += `Hora de inicio: ${new Date(routeData.fechaInicio).toLocaleTimeString('es-ES')}\n`;
    content += `Hora de finalización: ${new Date(routeData.fechaCompletacion).toLocaleTimeString('es-ES')}\n`;
    content += `Tiempo total: ${formatTime(routeData.tiempoTotal)}\n\n`;

    content += `=== PARADAS COMPLETADAS (${routeData.paradas.length}) ===\n`;
    routeData.paradas.forEach((parada, index) => {
      content += `\n${index + 1}. ${parada.direccion}\n`;
      content += `   Hora: ${parada.timestamp}\n`;
      content += `   Nivel de basura: ${parada.categoria_carga}\n`;
    });

    if (riskReports && riskReports.length > 0) {
      content += `\n\n=== REPORTES DE RIESGO (${riskReports.length}) ===\n`;
      riskReports.forEach((report, index) => {
        content += `\n${index + 1}. ${report.titulo}\n`;
        content += `   Tipo: ${report.tipo}\n`;
        content += `   Prioridad: ${report.prioridad}\n`;
        content += `   Descripción: ${report.descripcion}\n`;
      });
    }

    if (observaciones) {
      content += `\n\n=== OBSERVACIONES ===\n${observaciones}\n`;
    }

    content += `\n\n=== FIN DEL REPORTE ===\n`;
    content += `Generado el: ${new Date().toLocaleString('es-ES')}\n`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-ruta-${routeData.nombreRuta}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="completion-modal-overlay" onClick={onCancel}>
      <div className="completion-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="completion-modal-header">
          <div className="completion-header-icon">
            <CheckCircle size={40} />
          </div>
          <h2>¡Ruta Completada!</h2>
          <p>Revisa el resumen de tu jornada antes de finalizar</p>
        </div>

        <div className="completion-modal-body">
          {/* Información General */}
          <div className="completion-section">
            <div className="completion-section-header">
              <FileText size={20} />
              <h3>Información General</h3>
            </div>
            <div className="completion-info-grid">
              <div className="completion-info-item">
                <span className="completion-info-label">Ruta:</span>
                <span className="completion-info-value">{routeData.nombreRuta}</span>
              </div>
              <div className="completion-info-item">
                <span className="completion-info-label">Conductor:</span>
                <span className="completion-info-value">{routeData.conductorNombre}</span>
              </div>
              <div className="completion-info-item">
                <span className="completion-info-label">Vehículo:</span>
                <span className="completion-info-value">{routeData.vehiculoPlaca || 'N/A'}</span>
              </div>
              <div className="completion-info-item">
                <span className="completion-info-label">Tiempo total:</span>
                <span className="completion-info-value">{formatTime(routeData.tiempoTotal)}</span>
              </div>
              <div className="completion-info-item">
                <span className="completion-info-label">Hora de inicio:</span>
                <span className="completion-info-value">
                  {new Date(routeData.fechaInicio).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="completion-info-item">
                <span className="completion-info-label">Hora de finalización:</span>
                <span className="completion-info-value">
                  {new Date(routeData.fechaCompletacion).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Paradas Completadas */}
          <div className="completion-section">
            <div className="completion-section-header">
              <MapPin size={20} />
              <h3>Paradas Completadas ({routeData.paradas.length})</h3>
            </div>
            <div className="completion-stops-list">
              {routeData.paradas.map((parada, index) => (
                <div key={index} className="completion-stop-item">
                  <div className="completion-stop-number">{index + 1}</div>
                  <div className="completion-stop-content">
                    <div className="completion-stop-address">{parada.direccion}</div>
                    <div className="completion-stop-meta">
                      <span className="completion-stop-time">
                        <Clock size={14} /> {parada.timestamp}
                      </span>
                      <span
                        className="completion-stop-category"
                        style={{
                          backgroundColor: `${getCategoryColor(parada.categoria_carga)}15`,
                          color: getCategoryColor(parada.categoria_carga),
                          borderColor: `${getCategoryColor(parada.categoria_carga)}30`
                        }}
                      >
                        {getCategoryIcon(parada.categoria_carga)} {parada.categoria_carga}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reportes de Riesgo */}
          {riskReports && riskReports.length > 0 && (
            <div className="completion-section completion-section--warning">
              <div className="completion-section-header">
                <AlertTriangle size={20} />
                <h3>Reportes de Riesgo ({riskReports.length})</h3>
              </div>
              <div className="completion-risks-list">
                {riskReports.map((report, index) => (
                  <div key={index} className="completion-risk-item">
                    <div className="completion-risk-icon">⚠️</div>
                    <div className="completion-risk-content">
                      <div className="completion-risk-title">{report.titulo}</div>
                      <div className="completion-risk-meta">
                        <span className={`completion-risk-priority completion-risk-priority--${report.prioridad}`}>
                          {report.prioridad}
                        </span>
                        <span className="completion-risk-type">{report.tipo}</span>
                      </div>
                      {report.descripcion && (
                        <div className="completion-risk-description">{report.descripcion}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observaciones Finales */}
          <div className="completion-section">
            <div className="completion-section-header">
              <FileText size={20} />
              <h3>Observaciones Finales (Opcional)</h3>
            </div>
            <textarea
              className="completion-observations"
              placeholder="Agrega cualquier observación adicional sobre la ruta..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="completion-modal-footer">
          <button
            className="completion-btn completion-btn--download"
            onClick={downloadReport}
            disabled={loading}
          >
            <Download size={18} />
            Descargar
          </button>
          <div className="completion-actions-group">
            <button
              className="completion-btn completion-btn--cancel"
              onClick={onCancel}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              className="completion-btn completion-btn--confirm"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="completion-spinner"></span>
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  Confirmar y Finalizar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteCompletionModal;
