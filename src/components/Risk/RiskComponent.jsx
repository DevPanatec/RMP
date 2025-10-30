import { useState, useEffect } from 'react';
import { useRiskReports } from '../../context/RiskReportsContext';
import {
  AlertTriangle, ClipboardList, Wrench, AlertOctagon, Zap,
  Eye, CheckCircle, FolderOpen, FileText, Users, Truck,
  MapPin, Calendar, BarChart3, X
} from '../Icons';
import './RiskComponent.css';

const RiskComponent = ({ userType = 'admin' }) => {
  const { reports, loading, updateReportStatus, getReportStats } = useRiskReports();
  const [selectedReport, setSelectedReport] = useState(null);

  // Los reportes y funciones vienen del contexto
  const stats = getReportStats();

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
      case 'critica': return <AlertTriangle size={14} />;
      case 'alta': return <AlertTriangle size={14} />;
      case 'media': return <AlertTriangle size={14} />;
      case 'baja': return <CheckCircle size={14} />;
      default: return <AlertTriangle size={14} />;
    }
  };

  return (
    <div className="risk-container">
      <div className="risk-header-main">
        <div className="risk-title">
          <h2><AlertTriangle size={24} /> Reportes de Riesgo de Conductores</h2>
          <p>Reportes de riesgo creados por los conductores durante sus operaciones</p>
        </div>
      </div>

      {loading ? (
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
              <div className="stat-icon"><ClipboardList size={24} /></div>
              <div className="stat-data">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total Reportes</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><Wrench size={24} /></div>
              <div className="stat-data">
                <div className="stat-value">{stats.internos}</div>
                <div className="stat-label">Riesgos Internos</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><AlertOctagon size={24} /></div>
              <div className="stat-data">
                <div className="stat-value">{stats.externos}</div>
                <div className="stat-label">Riesgos Externos</div>
              </div>
            </div>
          </div>

          {/* Grid de reportes */}
          <div className="reports-section">
            <div className="reports-section-header">
              <h3><ClipboardList size={20} /> Reportes de Conductores</h3>
              <div className="reports-filters">
                <select className="reports-filter-select">
                  <option value="todos">Todos los reportes</option>
                  <option value="reportado">Pendientes</option>
                  <option value="en_revision">En revisión</option>
                  <option value="resuelto">Resueltos</option>
                </select>
                <select className="reports-filter-select">
                  <option value="todos">Todos los tipos</option>
                  <option value="interno">Internos</option>
                  <option value="externo">Externos</option>
                </select>
              </div>
            </div>
            
            {reports.length === 0 ? (
              <div className="no-reports">
                <div className="no-reports-icon"><ClipboardList size={48} /></div>
                <h4>No hay reportes de riesgo</h4>
                <p>Los conductores no han creado reportes de riesgo aún</p>
              </div>
            ) : (
              <div className="reports-responsive-grid">
                {reports.map(risk => (
                <div key={risk.id} className={`report-card report-${getPriorityLevel(risk.prioridad)}`}>
                  <div className="report-header">
                    <div className="report-type">
                      {risk.tipo === 'interno' ? <Wrench size={16} /> : <AlertOctagon size={16} />} {risk.tipo.toUpperCase()}
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
                    <p className="report-category"><FolderOpen size={14} /> {risk.categoria}</p>
                    <p className="report-description">{risk.descripcion}</p>
                    
                    <div className="report-meta">
                      <div className="meta-row">
                        <span className="meta-label"><Users size={14} /> Conductor:</span>
                        <span className="meta-value">{risk.conductor}</span>
                      </div>
                      <div className="meta-row">
                        <span className="meta-label"><Truck size={14} /> Camión:</span>
                        <span className="meta-value">{risk.camion}</span>
                      </div>
                      <div className="meta-row">
                        <span className="meta-label"><MapPin size={14} /> Ubicación:</span>
                        <span className="meta-value">{risk.ubicacion}</span>
                      </div>
                      <div className="meta-row">
                        <span className="meta-label"><AlertTriangle size={14} /> Prioridad:</span>
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
                      <Eye size={14} /> Ver Detalles
                    </button>
                    {risk.estado === 'reportado' && (
                      <button 
                        className="btn btn--small btn--primary"
                        onClick={() => updateReportStatus(risk.id, 'en_revision')}
                      >
                        <ClipboardList size={14} /> Revisar
                      </button>
                    )}
                    {risk.estado === 'en_revision' && (
                      <button 
                        className="btn btn--small btn--success"
                        onClick={() => updateReportStatus(risk.id, 'resuelto')}
                      >
                        <CheckCircle size={14} /> Marcar Resuelto
                      </button>
                    )}
                  </div>
                </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de detalles */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal-content report-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><ClipboardList size={20} /> Detalles del Reporte</h3>
              <button className="modal-close" onClick={() => setSelectedReport(null)}><X size={20} /></button>
            </div>
            
            <div className="modal-body">
              <div className="detail-section">
                <h4>{selectedReport.titulo}</h4>
                <div className="detail-badges">
                  <span className={`type-badge type-${selectedReport.tipo}`}>
                    {selectedReport.tipo === 'interno' ? <Wrench size={14} /> : <AlertOctagon size={14} />} {selectedReport.tipo.toUpperCase()}
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
                <h5><FolderOpen size={16} /> Categoría</h5>
                <p>{selectedReport.categoria}</p>
              </div>

              <div className="detail-section">
                <h5><FileText size={16} /> Descripción</h5>
                <p>{selectedReport.descripcion}</p>
              </div>

              <div className="detail-section">
                <h5><AlertTriangle size={16} /> Información del Reporte</h5>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label"><Users size={14} /> Conductor:</span>
                    <span className="detail-value">{selectedReport.conductor}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label"><Truck size={14} /> Camión:</span>
                    <span className="detail-value">{selectedReport.camion}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label"><Calendar size={14} /> Fecha de Reporte:</span>
                    <span className="detail-value">
                      {new Date(selectedReport.fechaCreacion).toLocaleDateString('es-ES')} a las {' '}
                      {new Date(selectedReport.fechaCreacion).toLocaleTimeString('es-ES')}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label"><MapPin size={14} /> Ubicación:</span>
                    <span className="detail-value">{selectedReport.ubicacion}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label"><BarChart3 size={14} /> Última Actualización:</span>
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
                  <ClipboardList size={16} /> Marcar en Revisión
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
                  <CheckCircle size={16} /> Marcar como Resuelto
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