import { useState, useEffect } from 'react';
import { driverReports } from '../../data/mockData';
import './RiskComponent.css';

const RiskComponent = ({ userType = 'admin' }) => {
  const [driverReportsList, setDriverReportsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDriverReportModal, setShowDriverReportModal] = useState(false);
  const [selectedDriverReport, setSelectedDriverReport] = useState(null);

  useEffect(() => {
    loadDriverReports();
  }, []);

  const loadDriverReports = () => {
    setIsLoading(true);
    
    setTimeout(() => {
      const reports = driverReports.getReports();
      setDriverReportsList(reports);
      setIsLoading(false);
    }, 800);
  };

  // Filtrar reportes según criterios
  const filteredReports = driverReportsList.filter(report => {
    const matchesSeverity = filterSeverity === 'todos' || report.severity.toLowerCase() === filterSeverity;
    const matchesSearch = !searchTerm || 
      report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.stop.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSeverity && matchesSearch;
  });

  // Estadísticas de reportes
  const getReportStats = () => {
    const total = driverReportsList.length;
    const abiertos = driverReportsList.filter(r => r.status === 'Abierto').length;
    const enProceso = driverReportsList.filter(r => r.status === 'En Proceso').length;
    const resueltos = driverReportsList.filter(r => r.status === 'Resuelto').length;
    const alta = driverReportsList.filter(r => r.severity === 'Alta').length;
    
    return { total, abiertos, enProceso, resueltos, alta };
  };

  const stats = getReportStats();

  return (
    <div className="risk-container">
      <div className="risk-header-main">
        <div className="risk-title">
          <h2>📋 Reportes de Conductores</h2>
          <p>Gestión de reportes y problemas reportados por los conductores durante sus rutas</p>
        </div>
      </div>

      {isLoading ? (
        <div className="risk-loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Cargando reportes de conductores...</p>
          </div>
        </div>
      ) : (
        <div className="risk-body">
          {/* Estadísticas generales */}
          <div className="risk-stats">
            <div className="stat-card">
              <div className="stat-icon">📋</div>
              <div className="stat-data">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total Reportes</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔓</div>
              <div className="stat-data">
                <div className="stat-value">{stats.abiertos}</div>
                <div className="stat-label">Abiertos</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔄</div>
              <div className="stat-data">
                <div className="stat-value">{stats.enProceso}</div>
                <div className="stat-label">En Proceso</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-data">
                <div className="stat-value">{stats.resueltos}</div>
                <div className="stat-label">Resueltos</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🚨</div>
              <div className="stat-data">
                <div className="stat-value">{stats.alta}</div>
                <div className="stat-label">Alta Prioridad</div>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="risk-filters">
            <div className="filter-group">
              <label>🔍 Buscar:</label>
              <input
                type="text"
                placeholder="Buscar por descripción, conductor o parada..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="filter-input"
              />
            </div>
            <div className="filter-group">
              <label>🎯 Severidad:</label>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="filter-select"
              >
                <option value="todos">Todos</option>
                <option value="alta">🔴 Alta</option>
                <option value="media">🟡 Media</option>
                <option value="baja">🟢 Baja</option>
              </select>
            </div>
          </div>

          {/* Reportes de conductores */}
          <div className="driver-reports-section">
            <h3>📋 Reportes de Conductores ({filteredReports.length})</h3>
            {filteredReports.length === 0 ? (
              <div className="no-reports">
                <div className="no-reports-icon">📝</div>
                <h4>No hay reportes disponibles</h4>
                <p>No se encontraron reportes que coincidan con los filtros seleccionados.</p>
              </div>
            ) : (
              <div className="reports-grid">
                {filteredReports.map(report => (
                  <div key={report.id} className={`report-card report-${report.severity.toLowerCase()}`}>
                    <div className="report-header">
                      <span className="report-id">#{report.id}</span>
                      <span className={`report-type ${report.type.toLowerCase()}`}>
                        {report.type === 'Externo' ? '🌍' : '🚛'} {report.type}
                      </span>
                      <span className={`report-severity severity-${report.severity.toLowerCase()}`}>
                        {report.severity === 'Alta' ? '🔴' : report.severity === 'Media' ? '🟡' : '🟢'} {report.severity}
                      </span>
                    </div>
                    <div className="report-content">
                      <h4>{report.description}</h4>
                      <div className="report-meta">
                        <div className="report-info">
                          <span className="report-driver">👨‍💼 {report.driverName}</span>
                          <span className="report-truck">🚛 {report.truckId}</span>
                        </div>
                        <div className="report-location">
                          <span className="report-route">🗺️ {report.routeName}</span>
                          <span className="report-stop">📍 {report.stop}</span>
                        </div>
                      </div>
                      <div className="report-date">
                        📅 {new Date(report.createdAt).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {report.photos && report.photos.length > 0 && (
                          <span className="photos-indicator">
                            📸 {report.photos.length} foto{report.photos.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="report-actions">
                      <button 
                        className="btn btn--small btn--outline"
                        onClick={() => {
                          setSelectedDriverReport(report);
                          setShowDriverReportModal(true);
                        }}
                      >
                        👁️ Ver Detalles
                      </button>
                      <button 
                        className="btn btn--small btn--primary"
                        onClick={() => {
                          driverReports.updateReportStatus(report.id, 'En Proceso');
                          loadDriverReports();
                        }}
                      >
                        🔄 Procesar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de detalles del reporte de conductor */}
      {showDriverReportModal && selectedDriverReport && (
        <div className="risk-modal-overlay" onClick={() => setShowDriverReportModal(false)}>
          <div className="risk-modal" onClick={(e) => e.stopPropagation()}>
            <div className="risk-modal-header">
              <h3>📋 Detalles del Reporte: #{selectedDriverReport.id}</h3>
              <button className="modal-close-btn" onClick={() => setShowDriverReportModal(false)}>
                ✕
              </button>
            </div>
            <div className="risk-modal-content">
              <div className="risk-detail-grid">
                <div className="risk-detail-item">
                  <label>Tipo de Problema:</label>
                  <span className={`report-type ${selectedDriverReport.type.toLowerCase()}`}>
                    {selectedDriverReport.type === 'Externo' ? '🌍' : '🚛'} {selectedDriverReport.type}
                  </span>
                </div>
                <div className="risk-detail-item">
                  <label>Severidad:</label>
                  <span className={`report-severity severity-${selectedDriverReport.severity.toLowerCase()}`}>
                    {selectedDriverReport.severity === 'Alta' ? '🔴' : selectedDriverReport.severity === 'Media' ? '🟡' : '🟢'} {selectedDriverReport.severity}
                  </span>
                </div>
                <div className="risk-detail-item">
                  <label>Conductor:</label>
                  <span>👨‍💼 {selectedDriverReport.driverName}</span>
                </div>
                <div className="risk-detail-item">
                  <label>Camión:</label>
                  <span>🚛 {selectedDriverReport.truckId}</span>
                </div>
                <div className="risk-detail-item">
                  <label>Ruta:</label>
                  <span>🗺️ {selectedDriverReport.routeName}</span>
                </div>
                <div className="risk-detail-item">
                  <label>Parada:</label>
                  <span>📍 {selectedDriverReport.stop}</span>
                </div>
                <div className="risk-detail-item">
                  <label>Fecha del Reporte:</label>
                  <span>📅 {new Date(selectedDriverReport.createdAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
                <div className="risk-detail-item">
                  <label>Estado:</label>
                  <span className={`status-badge ${selectedDriverReport.status.toLowerCase().replace(' ', '-')}`}>
                    {selectedDriverReport.status}
                  </span>
                </div>
              </div>
              <div className="risk-description">
                <label>Descripción del Problema:</label>
                <p>{selectedDriverReport.description}</p>
              </div>
              
              {selectedDriverReport.photos && selectedDriverReport.photos.length > 0 && (
                <div className="report-photos">
                  <label>Fotos Adjuntas:</label>
                  <div className="photos-gallery">
                    {selectedDriverReport.photos.map((photo, index) => (
                      <div key={photo.id || index} className="photo-gallery-item">
                        <img 
                          src={photo.dataUrl} 
                          alt={`Foto ${index + 1}`}
                          className="photo-gallery-image"
                          onClick={() => window.open(photo.dataUrl, '_blank')}
                        />
                        <div className="photo-gallery-info">
                          <span className="photo-gallery-name">{photo.name}</span>
                          <span className="photo-gallery-size">{(photo.size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="risk-actions">
                <button 
                  className="btn btn--success"
                  onClick={() => {
                    driverReports.updateReportStatus(selectedDriverReport.id, 'Resuelto');
                    loadDriverReports();
                    setShowDriverReportModal(false);
                  }}
                >
                  ✅ Marcar como Resuelto
                </button>
                <button 
                  className="btn btn--warning"
                  onClick={() => {
                    driverReports.updateReportStatus(selectedDriverReport.id, 'En Proceso');
                    loadDriverReports();
                    setShowDriverReportModal(false);
                  }}
                >
                  🔄 En Proceso
                </button>
                <button 
                  className="btn btn--outline"
                  onClick={() => setShowDriverReportModal(false)}
                >
                  ❌ Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskComponent;