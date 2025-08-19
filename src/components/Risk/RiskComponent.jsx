import { useState, useEffect } from 'react';
import { reportesRiesgo } from '../../data/mockData';
import './RiskComponent.css';

const RiskComponent = ({ userType = 'admin' }) => {
  const [risks, setRisks] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadRiskData();
  }, []);

  const loadRiskData = () => {
    setIsLoading(true);

    setTimeout(() => {
      // Cargar reportes de riesgo de conductores
      setRisks(reportesRiesgo);
      setIsLoading(false);
    }, 800);
  };

  const updateReportStatus = (reportId, newStatus) => {
    setRisks(prevRisks => 
      prevRisks.map(risk => 
        risk.id === reportId 
          ? { ...risk, estado: newStatus, fechaActualizacion: new Date().toISOString() }
          : risk
      )
    );
  };

  const getPriorityLevel = (priority) => {
    switch(priority) {
      case 'critica': return 'alto';
      case 'alta': return 'alto';
      case 'media': return 'medio';
      case 'baja': return 'bajo';
      default: return 'medio';
    }
  };

  const getPriorityIcon = (priority) => {
    switch(priority) {
      case 'critica': return '🔴';
      case 'alta': return '🟠';
      case 'media': return '🟡';
      case 'baja': return '🟢';
      default: return '🟡';
    }
  };

  return (
    <div className="risk-container">
      <div className="risk-header-main">
        <div className="risk-title">
          <h2>⚠️ Reportes de Riesgo de Conductores</h2>
          <p>Reportes de riesgo creados por los conductores durante sus operaciones</p>
        </div>
      </div>

      {isLoading ? (
        <div className="risk-loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Cargando reportes de riesgo...</p>
          </div>
        </div>
      ) : (
        <div className="risk-body">
          {/* Estadísticas generales */}
          <div className="risk-stats">
            <div className="stat-card">
              <div className="stat-icon">📋</div>
              <div className="stat-data">
                <div className="stat-value">{risks.length}</div>
                <div className="stat-label">Total Reportes</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔧</div>
              <div className="stat-data">
                <div className="stat-value">
                  {risks.filter(r => r.tipo === 'interno').length}
                </div>
                <div className="stat-label">Riesgos Internos</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🚧</div>
              <div className="stat-data">
                <div className="stat-value">
                  {risks.filter(r => r.tipo === 'externo').length}
                </div>
                <div className="stat-label">Riesgos Externos</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⚡</div>
              <div className="stat-data">
                <div className="stat-value">
                  {risks.filter(r => r.estado === 'reportado').length}
                </div>
                <div className="stat-label">Pendientes</div>
              </div>
            </div>
          </div>

          {/* Lista de reportes */}
          <div className="reports-section">
            <h3>📋 Reportes de Conductores</h3>
            <div className="reports-grid">
              {risks.map(risk => (
                <div key={risk.id} className={`report-card report-${getPriorityLevel(risk.prioridad)}`}>
                  <div className="report-header">
                    <div className="report-type">
                      {risk.tipo === 'interno' ? '🔧' : '🚧'} {risk.tipo.toUpperCase()}
                    </div>
                    <div className="report-date">
                      {new Date(risk.fechaCreacion).toLocaleDateString('es-ES')}
                    </div>
                    <div className={`report-status status-${risk.estado}`}>
                      {risk.estado.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="report-body">
                    <h4>{risk.titulo}</h4>
                    <p className="report-category">📂 {risk.categoria}</p>
                    <p className="report-description">{risk.descripcion}</p>
                    
                    <div className="report-meta">
                      <div className="meta-row">
                        <span className="meta-label">👨‍💼 Conductor:</span>
                        <span className="meta-value">{risk.conductor}</span>
                      </div>
                      <div className="meta-row">
                        <span className="meta-label">🚛 Camión:</span>
                        <span className="meta-value">{risk.camion}</span>
                      </div>
                      <div className="meta-row">
                        <span className="meta-label">📍 Ubicación:</span>
                        <span className="meta-value">{risk.ubicacion}</span>
                      </div>
                      <div className="meta-row">
                        <span className="meta-label">⚠️ Prioridad:</span>
                        <span className={`priority-badge priority-${risk.prioridad}`}>
                          {getPriorityIcon(risk.prioridad)} {risk.prioridad.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="report-actions">
                    <button 
                      className="btn btn--small btn--outline"
                      onClick={() => setSelectedReport(risk)}
                    >
                      👁️ Ver Detalles
                    </button>
                    {risk.estado === 'reportado' && (
                      <button 
                        className="btn btn--small btn--primary"
                        onClick={() => updateReportStatus(risk.id, 'en_revision')}
                      >
                        📋 Revisar
                      </button>
                    )}
                    {risk.estado === 'en_revision' && (
                      <button 
                        className="btn btn--small btn--success"
                        onClick={() => updateReportStatus(risk.id, 'resuelto')}
                      >
                        ✅ Marcar Resuelto
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {risks.length === 0 && (
                <div className="no-reports">
                  <div className="no-reports-icon">📋</div>
                  <h4>No hay reportes de riesgo</h4>
                  <p>Los conductores no han creado reportes de riesgo aún</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalles */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal-content report-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 Detalles del Reporte</h3>
              <button className="modal-close" onClick={() => setSelectedReport(null)}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="detail-section">
                <h4>{selectedReport.titulo}</h4>
                <div className="detail-badges">
                  <span className={`type-badge type-${selectedReport.tipo}`}>
                    {selectedReport.tipo === 'interno' ? '🔧' : '🚧'} {selectedReport.tipo.toUpperCase()}
                  </span>
                  <span className={`priority-badge priority-${selectedReport.prioridad}`}>
                    {getPriorityIcon(selectedReport.prioridad)} {selectedReport.prioridad.toUpperCase()}
                  </span>
                  <span className={`status-badge status-${selectedReport.estado}`}>
                    {selectedReport.estado.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="detail-section">
                <h5>📂 Categoría</h5>
                <p>{selectedReport.categoria}</p>
              </div>

              <div className="detail-section">
                <h5>📄 Descripción</h5>
                <p>{selectedReport.descripcion}</p>
              </div>

              <div className="detail-section">
                <h5>ℹ️ Información del Reporte</h5>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">👨‍💼 Conductor:</span>
                    <span className="detail-value">{selectedReport.conductor}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">🚛 Camión:</span>
                    <span className="detail-value">{selectedReport.camion}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">📅 Fecha de Reporte:</span>
                    <span className="detail-value">
                      {new Date(selectedReport.fechaCreacion).toLocaleDateString('es-ES')} a las {' '}
                      {new Date(selectedReport.fechaCreacion).toLocaleTimeString('es-ES')}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">📍 Ubicación:</span>
                    <span className="detail-value">{selectedReport.ubicacion}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">📊 Última Actualización:</span>
                    <span className="detail-value">
                      {new Date(selectedReport.fechaActualizacion).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn--secondary"
                onClick={() => setSelectedReport(null)}
              >
                Cerrar
              </button>
              {selectedReport.estado === 'reportado' && (
                <button 
                  className="btn btn--primary"
                  onClick={() => {
                    updateReportStatus(selectedReport.id, 'en_revision');
                    setSelectedReport(null);
                  }}
                >
                  📋 Marcar en Revisión
                </button>
              )}
              {selectedReport.estado === 'en_revision' && (
                <button 
                  className="btn btn--success"
                  onClick={() => {
                    updateReportStatus(selectedReport.id, 'resuelto');
                    setSelectedReport(null);
                  }}
                >
                  ✅ Marcar como Resuelto
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskComponent; 