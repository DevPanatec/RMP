import { useState } from 'react';
import { CheckCircle, Clock, MapPin, AlertTriangle, FileText, Download, Package, Trash2, RefreshCw, Truck } from '../Icons';
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
      case 'baja': return <FileText size={14} />;
      case 'intermedia': return <Trash2 size={14} />;
      case 'alta': return <RefreshCw size={14} />;
      case 'muy alta': return <Truck size={14} />;
      default: return <Package size={14} />;
    }
  };

  const downloadReport = () => {
    const completedStops = routeData.paradas_completadas || routeData.paradas.filter(p => p.completada !== false);
    const incompleteStops = routeData.paradas_no_completadas || [];

    let content = `=== REPORTE DE RUTA COMPLETADA ===\n\n`;
    content += `Ruta: ${routeData.ruta_nombre}\n`;
    content += `Conductor: ${routeData.conductor_nombre}\n`;
    content += `Vehículo: ${routeData.vehiculo_placa || 'N/A'}\n`;
    content += `Fecha: ${new Date(routeData.fechaInicio).toLocaleDateString('es-ES')}\n`;
    content += `Hora de inicio: ${new Date(routeData.fechaInicio).toLocaleTimeString('es-ES')}\n`;
    content += `Hora de finalización: ${new Date(routeData.fechaCompletacion).toLocaleTimeString('es-ES')}\n`;
    content += `Tiempo total: ${formatTime(routeData.tiempoTotal)}\n`;
    if (routeData.porcentaje_completado) {
      content += `Porcentaje completado: ${routeData.porcentaje_completado}%\n`;
    }
    content += `\n`;

    content += `=== PARADAS COMPLETADAS (${completedStops.length}) ===\n`;
    completedStops.forEach((parada, index) => {
      content += `\n${parada.orden || index + 1}. ${parada.direccion}\n`;
      content += `   Hora: ${parada.timestamp_llegada || parada.timestamp}\n`;
      content += `   Nivel de basura: ${parada.categoria_carga}\n`;
    });

    if (incompleteStops.length > 0) {
      content += `\n\n=== ⚠️ PARADAS NO COMPLETADAS (${incompleteStops.length}) ===\n`;
      incompleteStops.forEach((parada, index) => {
        content += `\n${parada.orden}. ${parada.direccion}\n`;
        content += `   Motivo: ${parada.motivo_no_completada}\n`;
      });
    }

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
    a.download = `reporte-ruta-${routeData.ruta_nombre}-${new Date().toISOString().split('T')[0]}.txt`;
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
                <span className="completion-info-value">{routeData.ruta_nombre}</span>
              </div>
              <div className="completion-info-item">
                <span className="completion-info-label">Conductor:</span>
                <span className="completion-info-value">{routeData.conductor_nombre}</span>
              </div>
              <div className="completion-info-item">
                <span className="completion-info-label">Vehículo:</span>
                <span className="completion-info-value">{routeData.vehiculo_placa || 'N/A'}</span>
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
              <h3>Paradas Completadas ({routeData.paradas_completadas?.length || routeData.paradas.length})</h3>
              {routeData.porcentaje_completado && routeData.porcentaje_completado < 100 && (
                <span className="completion-percentage" style={{
                  marginLeft: '10px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: routeData.porcentaje_completado >= 80 ? '#34c759' : routeData.porcentaje_completado >= 50 ? '#ff9500' : '#ff3b30',
                  color: 'white'
                }}>
                  {routeData.porcentaje_completado}% Completado
                </span>
              )}
            </div>
            <div className="completion-stops-list">
              {(routeData.paradas_completadas || routeData.paradas.filter(p => p.completada !== false)).map((parada, index) => (
                <div key={index} className="completion-stop-item">
                  <div className="completion-stop-number">{parada.orden || index + 1}</div>
                  <div className="completion-stop-content">
                    <div className="completion-stop-address">{parada.direccion}</div>
                    <div className="completion-stop-meta">
                      <span className="completion-stop-time">
                        <Clock size={14} /> {parada.timestamp_llegada || parada.timestamp}
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

          {/* Paradas NO Completadas (si existen) */}
          {routeData.paradas_no_completadas && routeData.paradas_no_completadas.length > 0 && (
            <div className="completion-section completion-section--incomplete">
              <div className="completion-section-header">
                <AlertTriangle size={20} />
                <h3>Paradas No Completadas ({routeData.paradas_no_completadas.length})</h3>
              </div>
              <div className="completion-alert-box">
                <AlertTriangle size={18} />
                <p>Las siguientes paradas no pudieron ser completadas. Verifica que hayas creado reportes de riesgo para cada una.</p>
              </div>
              <div className="completion-stops-list">
                {routeData.paradas_no_completadas.map((parada, index) => (
                  <div key={index} className="completion-stop-item completion-stop-item--incomplete">
                    <div className="completion-stop-number completion-stop-number--incomplete">{parada.orden}</div>
                    <div className="completion-stop-content">
                      <div className="completion-stop-address">{parada.direccion}</div>
                      <div className="completion-stop-meta">
                        <span className="completion-stop-reason">
                          <AlertTriangle size={14} /> {parada.motivo_no_completada}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                    <div className="completion-risk-icon"><AlertTriangle size={24} /></div>
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
