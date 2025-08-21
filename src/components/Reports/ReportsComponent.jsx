import { useState, useEffect } from 'react';
import { useSupabaseReports } from '../../context/SupabaseReportsContext';
import './ReportsComponent.css';

const ReportsComponent = ({ userType = 'admin' }) => {
  const { completedRoutes, loading, error, getCompletedRoutes, exportRoutes, getReportsStats } = useSupabaseReports();
  
  const [dateRange, setDateRange] = useState({
    inicio: '2024-01-01', // Fecha más amplia para incluir todos los reportes
    fin: new Date().toISOString().split('T')[0]
  });
  const [selectedRoutes, setSelectedRoutes] = useState([]);
  const [expandedRoutes, setExpandedRoutes] = useState([]);

  // Cargar rutas completadas
  useEffect(() => {
    getCompletedRoutes(dateRange);
  }, [dateRange]);

  const exportRoutesPDF = () => {
    const selectedData = selectedRoutes.length > 0 
      ? completedRoutes.filter(r => selectedRoutes.includes(r.id))
      : completedRoutes;
      
    const reportContent = exportRoutes(selectedData, 'text');
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-rutas-${dateRange.inicio}-${dateRange.fin}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportRoutesExcel = () => {
    const selectedData = selectedRoutes.length > 0 
      ? completedRoutes.filter(r => selectedRoutes.includes(r.id))
      : completedRoutes;
      
    const csvContent = exportRoutes(selectedData, 'csv');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-rutas-detallado-${dateRange.inicio}-${dateRange.fin}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleRouteSelection = (routeId) => {
    setSelectedRoutes(prev => 
      prev.includes(routeId) 
        ? prev.filter(id => id !== routeId)
        : [...prev, routeId]
    );
  };
  
  const selectAllRoutes = () => {
    setSelectedRoutes(completedRoutes.map(r => r.id));
  };
  
  const clearSelection = () => {
    setSelectedRoutes([]);
  };
  
  const toggleRouteExpansion = (routeId) => {
    setExpandedRoutes(prev => 
      prev.includes(routeId) 
        ? prev.filter(id => id !== routeId)
        : [...prev, routeId]
    );
  };

  const renderRouteHeader = (route) => (
    <div className="route-header" onClick={() => toggleRouteExpansion(route.id)}>
      <div className="route-compact-info">
        <div className="route-left">
          <span className="route-date">{route.fecha_completada}</span>
          <span className="route-name">{route.nombre}</span>
        </div>
        <div className="route-center">
          <span className="route-conductor">{route.conductor}</span>
          <span className="route-stops">{route.paradas.length} paradas</span>
        </div>
        <div className="route-right">
          <span className={`service-badge-compact service-badge--${route.tipo_servicio}`}>
            {route.tipo_servicio === 'recoleccion' ? '🚛' : '🚐'}
          </span>
        </div>
      </div>
      <div className="route-expand">
        <span className={`expand-icon ${expandedRoutes.includes(route.id) ? 'expanded' : ''}`}>
          ▼
        </span>
      </div>
    </div>
  );
  
  const renderRouteDetails = (route) => (
    <div className={`route-details ${expandedRoutes.includes(route.id) ? 'expanded' : ''}`}>
      <div className="route-expanded-info">
        <div className="route-meta-grid">
          <div className="meta-item">
            <span className="meta-label">Tipo:</span>
            <span className="meta-value">
              {route.tipo_servicio === 'recoleccion' ? '🚛 Recolección' : '🚐 Fumigación'}
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Vehículo:</span>
            <span className="meta-value">{route.vehiculo}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Horario:</span>
            <span className="meta-value">{route.hora_inicio} - {route.hora_fin}</span>
          </div>
          {route.proyecto && (
            <div className="meta-item">
              <span className="meta-label">Proyecto:</span>
              <span className="meta-value">{route.proyecto}</span>
            </div>
          )}
        </div>
        
        {route.observaciones && (
          <div className="route-observations">
            <span className="meta-label">Observaciones:</span>
            <span className="meta-value">{route.observaciones}</span>
          </div>
        )}
      </div>
      
      <div className="stops-section">
        <h5>Paradas realizadas ({route.paradas.length}):</h5>
        <div className="stops-list">
          {route.paradas.map((parada, index) => (
            <div key={index} className="stop-item">
              <div className="stop-number">{parada.orden}</div>
              <div className="stop-details">
                <div className="stop-address">{parada.direccion}</div>
                <div className="stop-meta">
                  <span className={`cargo-type cargo--${parada.tipo_carga}`}>
                    {parada.tipo_carga === 'alta' ? '🔴 Alta' : 
                     parada.tipo_carga === 'media' ? '🟡 Media' : '🟢 Baja'}
                  </span>
                  <span className="stop-time">🕔 {parada.hora}</span>
                  <span className="stop-status">✅ Completada</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="reports-container">
      <div className="reports-header">
        <div className="reports-title">
          <h2>📄 Historial de Rutas Completadas</h2>
          <p>Reporte detallado de rutas realizadas con paradas y tipos de carga</p>
        </div>
        
        <div className="reports-controls">
          <div className="date-range">
            <label>Desde:</label>
            <input 
              type="date" 
              value={dateRange.inicio}
              onChange={(e) => setDateRange(prev => ({ ...prev, inicio: e.target.value }))}
            />
            <label>Hasta:</label>
            <input 
              type="date" 
              value={dateRange.fin}
              onChange={(e) => setDateRange(prev => ({ ...prev, fin: e.target.value }))}
            />
            <div className="quick-range">
              <button className="btn btn--sm" onClick={() => setDateRange({ inicio: new Date().toISOString().split('T')[0], fin: new Date().toISOString().split('T')[0] })}>Hoy</button>
              <button className="btn btn--sm" onClick={() => setDateRange({ inicio: new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0], fin: new Date().toISOString().split('T')[0] })}>7d</button>
              <button className="btn btn--sm" onClick={() => setDateRange({ inicio: new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0], fin: new Date().toISOString().split('T')[0] })}>30d</button>
            </div>
          </div>
          
          <div className="selection-controls">
            <span className="selection-info">
              {selectedRoutes.length > 0 && `${selectedRoutes.length} ruta(s) seleccionada(s)`}
            </span>
            <button className="btn btn--sm" onClick={selectAllRoutes}>Seleccionar Todas</button>
            <button className="btn btn--sm" onClick={clearSelection}>Limpiar Selección</button>
          </div>
          
          <div className="export-actions">
            <button 
              className="btn btn--secondary"
              onClick={exportRoutesPDF}
              disabled={completedRoutes.length === 0}
            >
              📄 Descargar PDF
            </button>
            <button 
              className="btn btn--secondary"
              onClick={exportRoutesExcel}
              disabled={completedRoutes.length === 0}
            >
              📊 Descargar Excel
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="reports-loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Cargando rutas completadas...</p>
          </div>
        </div>
      ) : error ? (
        <div className="reports-error">
          <div className="error-message">
            <div className="error-icon">⚠️</div>
            <h3>Error al cargar los reportes</h3>
            <p>{error}</p>
            <button className="btn btn--primary" onClick={() => getCompletedRoutes(dateRange)}>
              Reintentar
            </button>
          </div>
        </div>
      ) : (
        <div className="reports-body">
          {completedRoutes.length === 0 ? (
            <div className="no-data">
              <div className="no-data-icon">📋</div>
              <h3>No hay rutas completadas</h3>
              <p>No se encontraron rutas completadas en el período seleccionado.</p>
            </div>
          ) : (
            <div className="routes-list">
              {completedRoutes.map(route => (
                <div key={route.id} className={`route-accordion ${selectedRoutes.includes(route.id) ? 'route-accordion--selected' : ''}`}>
                  <div className="route-accordion-header">
                    <input
                      type="checkbox"
                      checked={selectedRoutes.includes(route.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleRouteSelection(route.id);
                      }}
                      className="route-checkbox"
                    />
                    {renderRouteHeader(route)}
                  </div>
                  {renderRouteDetails(route)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default ReportsComponent; 