import { useState, useEffect } from 'react';
import { useSupabaseReports } from '../../context/SupabaseReportsContext';
import { ChevronLeft, Clock, CheckCircle, Truck, AlertTriangle, FileText, BarChart3 } from '../Icons';
import { Card } from '../UI';
import './RouteHistory.css';

const RouteHistory = ({ routeType, onBack }) => {
  const { completedRoutes, loading, error, getCompletedRoutes, exportRoutes } = useSupabaseReports();
  
  const [dateRange, setDateRange] = useState(() => {
    const formatLocalDate = (date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };
    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000);
    return {
      inicio: formatLocalDate(thirtyDaysAgo),
      fin: formatLocalDate(now)
    };
  });
  const [selectedRoutes, setSelectedRoutes] = useState([]);
  const [expandedRoutes, setExpandedRoutes] = useState([]);

  useEffect(() => {
    getCompletedRoutes(dateRange);
  }, [dateRange]);

  const filteredRoutes = completedRoutes.filter(route => 
    route.tipo_servicio === routeType
  );

  const exportRoutesPDF = () => {
    const selectedData = selectedRoutes.length > 0 
      ? filteredRoutes.filter(r => selectedRoutes.includes(r.id))
      : filteredRoutes;
      
    const reportContent = exportRoutes(selectedData, 'text');
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-${routeType}-${dateRange.inicio}-${dateRange.fin}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportRoutesExcel = () => {
    const selectedData = selectedRoutes.length > 0 
      ? filteredRoutes.filter(r => selectedRoutes.includes(r.id))
      : filteredRoutes;
      
    const csvContent = exportRoutes(selectedData, 'csv');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-${routeType}-${dateRange.inicio}-${dateRange.fin}.csv`;
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
            <Truck size={16} />
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
                    {parada.tipo_carga === 'alta' ? 'Alta' : 
                     parada.tipo_carga === 'media' ? 'Media' : 'Baja'}
                  </span>
                  <span className="stop-time"><Clock size={14} /> {parada.hora}</span>
                  <span className="stop-status"><CheckCircle size={14} /> Completada</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="route-history">
      <div className="route-history-header">
        <button className="back-button" onClick={onBack}>
          <ChevronLeft size={20} />
          Volver
        </button>
        <h3>Historial de {routeType === 'recoleccion' ? 'Recolección' : 'Fumigación'}</h3>
      </div>

      <div className="history-controls">
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
        </div>

        <div className="export-actions">
          <button 
            className="btn-new btn-new--secondary btn-new--sm"
            onClick={exportRoutesPDF}
            disabled={filteredRoutes.length === 0}
          >
            <FileText size={16} /> PDF
          </button>
          <button 
            className="btn-new btn-new--secondary btn-new--sm"
            onClick={exportRoutesExcel}
            disabled={filteredRoutes.length === 0}
          >
            <BarChart3 size={16} /> Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="route-history-loading">
          <div className="loading-spinner"></div>
          <p>Cargando historial...</p>
        </div>
      ) : error ? (
        <div className="route-history-error">
          <AlertTriangle size={48} />
          <p>{error}</p>
        </div>
      ) : filteredRoutes.length === 0 ? (
        <div className="route-history-empty">
          <Truck size={48} />
          <p>No hay rutas completadas en este período</p>
        </div>
      ) : (
        <div className="routes-list">
          {filteredRoutes.map(route => (
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
  );
};

export default RouteHistory;
