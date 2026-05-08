import { useState, useEffect } from 'react';
import { CheckCircle, Clock, MapPin, AlertTriangle, FileText, Download, Package, Trash2, RefreshCw, Truck, X } from '../Icons';
import { generateSingleRouteReportPDF } from '../../utils/lazyPdf';
import './RouteCompletionModal.css';

const RouteCompletionModal = ({ isOpen, routeData, riskReports, onConfirm, onCancel }) => {
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const downloadReport = async () => {
    setDownloadingPdf(true);
    try {
      await generateSingleRouteReportPDF(routeData, riskReports, observaciones);
    } catch (err) {
      console.error('❌ Error generando PDF:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const completedStops = routeData.paradas_completadas || routeData.paradas.filter(p => p.completada !== false);
  const incompleteStops = routeData.paradas_no_completadas || [];

  // ==========================================
  // MOBILE: Full-screen bottom sheet
  // ==========================================
  if (isMobile) {
    return (
      <div className="sheet-backdrop sheet-backdrop--completion" onClick={onCancel}>
        <div className="completion-sheet" onClick={e => e.stopPropagation()}>
          <div className="sheet__handle" />

          {/* Compact header */}
          <div className="completion-sheet__header">
            <div className="completion-sheet__icon">
              <CheckCircle size={28} />
            </div>
            <div>
              <div className="completion-sheet__title">¡Ruta Completada!</div>
              <div className="completion-sheet__subtitle">{routeData.ruta_nombre}</div>
            </div>
            <button className="sheet__close" onClick={onCancel}>
              <X size={18} />
            </button>
          </div>

          {/* Stats row */}
          <div className="completion-sheet__stats">
            <div className="completion-sheet__stat">
              <MapPin size={14} />
              <span>{completedStops.length} paradas</span>
            </div>
            <div className="completion-sheet__stat">
              <Clock size={14} />
              <span>{formatTime(routeData.tiempoTotal)}</span>
            </div>
            {routeData.porcentaje_completado && routeData.porcentaje_completado < 100 && (
              <div className="completion-sheet__stat completion-sheet__stat--warn">
                <span>{routeData.porcentaje_completado}%</span>
              </div>
            )}
          </div>

          {/* Scrollable body */}
          <div className="completion-sheet__body">
            {/* Stops list */}
            <div className="completion-sheet__section-label">Paradas completadas</div>
            {completedStops.map((parada, index) => (
              <div key={index} className="completion-sheet__stop">
                <div className="completion-sheet__stop-num">{parada.orden || index + 1}</div>
                <div className="completion-sheet__stop-info">
                  <div className="completion-sheet__stop-addr">{parada.direccion}</div>
                  <div className="completion-sheet__stop-meta">
                    <span>{parada.timestamp_llegada || parada.timestamp}</span>
                    {parada.categoria_carga && (
                      <span className="completion-sheet__cat" style={{ color: getCategoryColor(parada.categoria_carga) }}>
                        {getCategoryIcon(parada.categoria_carga)} {parada.categoria_carga}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Incomplete stops */}
            {incompleteStops.length > 0 && (
              <>
                <div className="completion-sheet__section-label completion-sheet__section-label--warn">
                  <AlertTriangle size={14} /> No completadas ({incompleteStops.length})
                </div>
                {incompleteStops.map((parada, index) => (
                  <div key={index} className="completion-sheet__stop completion-sheet__stop--incomplete">
                    <div className="completion-sheet__stop-num completion-sheet__stop-num--incomplete">{parada.orden}</div>
                    <div className="completion-sheet__stop-info">
                      <div className="completion-sheet__stop-addr">{parada.direccion}</div>
                      <div className="completion-sheet__stop-meta" style={{ color: 'var(--color-error)' }}>
                        {parada.motivo_no_completada}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Risk reports */}
            {riskReports && riskReports.length > 0 && (
              <>
                <div className="completion-sheet__section-label completion-sheet__section-label--warn">
                  <AlertTriangle size={14} /> Riesgos ({riskReports.length})
                </div>
                {riskReports.map((report, index) => (
                  <div key={index} className="completion-sheet__risk">
                    <strong>{report.titulo}</strong>
                    <span className="completion-sheet__risk-type">{report.tipo} · {report.prioridad}</span>
                  </div>
                ))}
              </>
            )}

            {/* Observaciones */}
            <div className="completion-sheet__section-label">Observaciones (opcional)</div>
            <textarea
              className="sheet__textarea"
              placeholder="Agrega observaciones..."
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="sheet__actions">
            <button
              className="sheet__btn sheet__btn--primary"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? 'Guardando...' : <><CheckCircle size={16} /> Confirmar y Finalizar</>}
            </button>
            <div className="completion-sheet__bottom-row">
              <button className="sheet__btn sheet__btn--ghost" onClick={downloadReport} disabled={loading || downloadingPdf}>
                <Download size={14} /> {downloadingPdf ? 'Generando...' : 'Descargar PDF'}
              </button>
              <button className="sheet__btn sheet__btn--ghost" onClick={onCancel} disabled={loading}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // DESKTOP: Modal clásico (sin cambios)
  // ==========================================
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
              <h3>Paradas Completadas ({completedStops.length})</h3>
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
              {completedStops.map((parada, index) => (
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

          {/* Paradas NO Completadas */}
          {incompleteStops.length > 0 && (
            <div className="completion-section completion-section--incomplete">
              <div className="completion-section-header">
                <AlertTriangle size={20} />
                <h3>Paradas No Completadas ({incompleteStops.length})</h3>
              </div>
              <div className="completion-alert-box">
                <AlertTriangle size={18} />
                <p>Las siguientes paradas no pudieron ser completadas. Verifica que hayas creado reportes de riesgo para cada una.</p>
              </div>
              <div className="completion-stops-list">
                {incompleteStops.map((parada, index) => (
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
            disabled={loading || downloadingPdf}
          >
            <Download size={18} />
            {downloadingPdf ? 'Generando PDF...' : 'Descargar PDF'}
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
