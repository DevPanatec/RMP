import { useState, useEffect } from 'react';
import { appData } from '../../data/mockData';
import MapComponent from '../../components/Map/MapComponent';
import ReportsComponent from '../../components/Reports/ReportsComponent';
import PersonnelComponent from '../../components/Personnel/PersonnelComponent';
import InventoryComponent from '../../components/Inventory/InventoryComponent';
import RoutesComponent from '../../components/Routes/RoutesComponent';

import RiskComponent from '../../components/Risk/RiskComponent';
import './AdminDashboard.css';

const AdminDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentData, setCurrentData] = useState(appData);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [serviceTypeFilter, setServiceTypeFilter] = useState('todos'); // todos | recoleccion | fumigacion
  const [showTruckModal, setShowTruckModal] = useState(false);
  const [showTruckConfig, setShowTruckConfig] = useState(false);
  const [selectedTruckData, setSelectedTruckData] = useState(null);
  const [showRouteAssignment, setShowRouteAssignment] = useState(false);

  // Normalizar camiones: si no tienen tipoServicio, asumir 'recoleccion'
  const normalizedCamiones = currentData.camiones.map(camion => (
    camion.tipoServicio ? camion : { ...camion, tipoServicio: 'recoleccion' }
  ));

  // Simular actualizaciones de datos en tiempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentData(prevData => ({
        ...prevData,
        estadisticasOperativas: {
          ...prevData.estadisticasOperativas,
          totalKgHoy: prevData.estadisticasOperativas.totalKgHoy + Math.floor(Math.random() * 50),
          eficienciaPromedio: Math.min(100, prevData.estadisticasOperativas.eficienciaPromedio + (Math.random() - 0.5) * 2)
        }
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="dashboard-content">
            {/* Mapa primero */}
            <div className="card">
              <div className="card__body">
                <h3>🗺️ Monitoreo GPS en Tiempo Real</h3>
                <p className="section-description">
                  Seguimiento en vivo de {
                    serviceTypeFilter === 'todos' ? 'todos los vehículos' :
                    serviceTypeFilter === 'recoleccion' ? 'vehículos de recolección' : 'vehículos de fumigación'
                  } con actualizaciones automáticas
                </p>
                <MapComponent 
                  key={`map-${serviceTypeFilter}`}
                  camiones={serviceTypeFilter === 'todos' 
                    ? normalizedCamiones 
                    : normalizedCamiones.filter(c => c.tipoServicio === serviceTypeFilter)
                  } 
                  userType={user.tipo}
                  showRealTime={true}
                  selectedTruck={selectedTruck}
                  serviceTypeFilter={serviceTypeFilter}
                  showRoutes={true}
                  showStops={true}
                />
              </div>
            </div>

            {/* Filtros de servicio */}
            <div className="service-filters">
              <div className="filter-group">
                <label>Tipo de Servicio:</label>
                <div className="filter-buttons">
                  <button 
                    className={`filter-btn ${serviceTypeFilter === 'todos' ? 'active' : ''}`}
                    onClick={() => setServiceTypeFilter('todos')}
                  >
                    📊 Todos
                  </button>
                  <button 
                    className={`filter-btn ${serviceTypeFilter === 'recoleccion' ? 'active' : ''}`}
                    onClick={() => setServiceTypeFilter('recoleccion')}
                  >
                    🚛 Recolección
                  </button>
                  <button 
                    className={`filter-btn ${serviceTypeFilter === 'fumigacion' ? 'active' : ''}`}
                    onClick={() => setServiceTypeFilter('fumigacion')}
                  >
                    🚐 Fumigación
                  </button>
                </div>
              </div>
            </div>

            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-icon">🚛</div>
                <div className="kpi-content">
                  <div className="kpi-value">
                    {serviceTypeFilter === 'todos' 
                      ? normalizedCamiones.length 
                      : normalizedCamiones.filter(c => c.tipoServicio === serviceTypeFilter).length
                    }
                  </div>
                  <div className="kpi-label">
                    {serviceTypeFilter === 'todos' ? 'Total Vehículos' : 
                     serviceTypeFilter === 'recoleccion' ? 'Camiones Recolección' : 'Vehículos Fumigación'}
                  </div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon">🟢</div>
                <div className="kpi-content">
                  <div className="kpi-value">
                    {serviceTypeFilter === 'todos' 
                      ? normalizedCamiones.filter(c => c.estado === 'En ruta').length
                      : normalizedCamiones.filter(c => c.estado === 'En ruta' && c.tipoServicio === serviceTypeFilter).length
                    }
                  </div>
                  <div className="kpi-label">En Ruta</div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon">⚡</div>
                <div className="kpi-content">
                  <div className="kpi-value">
                    {Math.round(currentData.estadisticasOperativas.eficienciaPromedio)}%
                  </div>
                  <div className="kpi-label">Eficiencia Promedio</div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon">⛽</div>
                <div className="kpi-content">
                  <div className="kpi-value">
                    {Math.round(currentData.estadisticasOperativas.combustiblePromedio)}%
                  </div>
                  <div className="kpi-label">Combustible Promedio</div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon">⚠️</div>
                <div className="kpi-content">
                  <div className="kpi-value">
                    {currentData.alertas.length}
                  </div>
                  <div className="kpi-label">Alertas Activas</div>
                </div>
              </div>
            </div>

            {/* Alertas importantes */}
            {currentData.alertas.length > 0 && (
              <div className="alerts-section">
                <h3>🚨 Alertas Recientes</h3>
                <div className="alerts-grid">
                  {currentData.alertas.slice(0, 3).map(alerta => (
                    <div key={alerta.id} className={`alert-card alert-${alerta.prioridad}`}>
                      <div className="alert-header">
                        <span className="alert-type">
                          {alerta.tipo === 'combustible' && '⛽'}
                          {alerta.tipo === 'mantenimiento' && '🔧'}
                          {alerta.tipo === 'ruta' && '🗺️'}
                        </span>
                        <span className="alert-priority">{alerta.prioridad.toUpperCase()}</span>
                      </div>
                      <div className="alert-content">
                        <div className="alert-truck">Camión: {alerta.camion}</div>
                        <div className="alert-message">{alerta.mensaje}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
        
      case 'camiones':
        // Filtrar vehículos según el filtro seleccionado
        const filteredVehicles = serviceTypeFilter === 'todos' 
          ? normalizedCamiones 
          : normalizedCamiones.filter(c => c.tipoServicio === serviceTypeFilter);

        return (
          <div className="dashboard-content">
            <div className="card">
              <div className="card__body">
                <h3>
                  {serviceTypeFilter === 'todos' ? '🚛 Gestión de Vehículos' : 
                   serviceTypeFilter === 'recoleccion' ? '🚛 Gestión de Camiones' : '🚐 Gestión de Fumigación'}
                </h3>
                
                {/* Filtros de servicio también en la página de camiones */}
                <div className="service-filters">
                  <div className="filter-group">
                    <label>Tipo de Servicio:</label>
                    <div className="filter-buttons">
                      <button 
                        className={`filter-btn ${serviceTypeFilter === 'todos' ? 'active' : ''}`}
                        onClick={() => setServiceTypeFilter('todos')}
                      >
                        📊 Todos
                      </button>
                      <button 
                        className={`filter-btn ${serviceTypeFilter === 'recoleccion' ? 'active' : ''}`}
                        onClick={() => setServiceTypeFilter('recoleccion')}
                      >
                        🚛 Recolección
                      </button>
                      <button 
                        className={`filter-btn ${serviceTypeFilter === 'fumigacion' ? 'active' : ''}`}
                        onClick={() => setServiceTypeFilter('fumigacion')}
                      >
                        🚐 Fumigación
                      </button>
                    </div>
                  </div>
                </div>

                <div className="table-controls">
                  <div className="search-box">
                    <input 
                      type="text" 
                      placeholder="🔍 Buscar vehículo..." 
                      className="search-input"
                    />
                  </div>
                </div>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Tipo</th>
                        <th>Conductor</th>
                        <th>Estado</th>
                        <th>Ruta Asignada</th>
                        <th>Progreso</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVehicles.map(camion => (
                        <tr key={camion.id} className={selectedTruck === camion.id ? 'selected-row' : ''}>
                          <td>
                            <button 
                              className="truck-id-btn"
                              onClick={() => setSelectedTruck(camion.id)}
                            >
                              {camion.tipoServicio === 'fumigacion' ? '🚐' : '🚛'} {camion.id}
                            </button>
                          </td>
                          <td>
                            <span className={`service-type-badge ${camion.tipoServicio}`}>
                              {camion.tipoServicio === 'fumigacion' ? 'Fumigación' : 'Recolección'}
                            </span>
                          </td>
                          <td>{camion.conductor}</td>
                          <td>
                            <span className={`status status--${
                              camion.estado === 'En ruta' ? 'success' : 
                              camion.estado === 'Disponible' ? 'info' : 'warning'
                            }`}>
                              {camion.estado}
                            </span>
                          </td>
                          <td>{camion.rutaAsignada || 'Sin asignar'}</td>
                          <td>
                            {camion.estado === 'En ruta' && (
                              <div className="progress-info">
                                <div className="progress-bar">
                                  <div 
                                    className="progress-fill"
                                    style={{ width: `${(camion.paradaActual / camion.totalParadas) * 100}%` }}
                                  ></div>
                                </div>
                                <span className="progress-text">
                                  {camion.paradaActual}/{camion.totalParadas}
                                </span>
                                {camion.tipoServicio === 'fumigacion' && camion.areaFumigada && (
                                  <small className="fumigation-area">
                                    📐 {camion.areaFumigada}m²
                                  </small>
                                )}
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button 
                                className="btn btn--sm btn--outline"
                                onClick={() => {
                                  setSelectedTruckData(camion);
                                  setShowTruckModal(true);
                                }}
                              >
                                📍 Ver
                              </button>
                              <button 
                                className="btn btn--sm btn--outline"
                                onClick={() => {
                                  setSelectedTruckData(camion);
                                  setShowTruckConfig(true);
                                }}
                              >
                                ⚙️ Config
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'rutas':
        return (
          <div className="dashboard-content">
            <div className="routes-header-section">
              <RoutesComponent
                initialRoutes={currentData.rutas}
                onRoutesChange={(routes) => setCurrentData(prev => ({ ...prev, rutas: routes }))}
              />
              
              <div className="route-assignment-section">
                <div className="card">
                  <div className="card__body">
                    <h3>👥 Asignación de Rutas a Conductores</h3>
                    <p className="section-description">
                      Asigne rutas específicas a conductores para optimizar las operaciones
                    </p>
                    
                    <button 
                      className="btn btn--primary"
                      onClick={() => setShowRouteAssignment(true)}
                    >
                      🗺️ Gestionar Asignaciones
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'reportes':
        return <ReportsComponent userType={user.tipo} />;
        
      case 'personal':
        return <PersonnelComponent userType={user.tipo} />;
        
      case 'inventario':
        return <InventoryComponent userType={user.tipo} />;
        

        
      case 'riesgos':
        return <RiskComponent userType={user.tipo} />;
        
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>🌱 RMP Admin</h2>
          <p>Bienvenido, {user.nombre}</p>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li>
              <button 
                className={activeTab === 'dashboard' ? 'active' : ''}
                onClick={() => setActiveTab('dashboard')}
              >
                📊 Dashboard
              </button>
            </li>
            <li>
              <button 
                className={activeTab === 'camiones' ? 'active' : ''}
                onClick={() => setActiveTab('camiones')}
              >
                🚛 Camiones
              </button>
            </li>
            <li>
              <button 
                className={activeTab === 'rutas' ? 'active' : ''}
                onClick={() => setActiveTab('rutas')}
              >
                🗺️ Rutas
              </button>
            </li>
            <li>
              <button 
                className={activeTab === 'reportes' ? 'active' : ''}
                onClick={() => setActiveTab('reportes')}
              >
                📈 Reportes
              </button>
            </li>
            <li>
              <button 
                className={activeTab === 'personal' ? 'active' : ''}
                onClick={() => setActiveTab('personal')}
              >
                👥 Personal
              </button>
            </li>
            <li>
              <button 
                className={activeTab === 'inventario' ? 'active' : ''}
                onClick={() => setActiveTab('inventario')}
              >
                📦 Inventario
              </button>
            </li>

            <li>
              <button 
                className={activeTab === 'riesgos' ? 'active' : ''}
                onClick={() => setActiveTab('riesgos')}
              >
                ⚠️ Riesgos
              </button>
            </li>
          </ul>
        </nav>
      </div>
      
      <div className="main-content">
        <div className="dashboard-header">
          <h1>🌿 Panel de Administración</h1>
          <div className="header-actions">
            <div className="realtime-status">
              🟢 Sistema en Tiempo Real
            </div>
            <button className="logout-btn" onClick={onLogout}>
              🚪 Cerrar Sesión
            </button>
          </div>
        </div>
        {renderContent()}
      </div>

      {/* Modal para ver información del camión */}
      {showTruckModal && selectedTruckData && (
        <div className="modal-overlay" onClick={() => setShowTruckModal(false)}>
          <div className="modal-content truck-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>
                {selectedTruckData.tipoServicio === 'fumigacion' ? '🚐' : '🚛'} {selectedTruckData.id}
              </h4>
              <button className="modal-close" onClick={() => setShowTruckModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="truck-info-grid">
                <div className="info-section">
                  <h5>📋 Información General</h5>
                  <div className="info-row">
                    <strong>Conductor:</strong> {selectedTruckData.conductor}
                  </div>
                  <div className="info-row">
                    <strong>Estado:</strong> 
                    <span className={`status-badge status-${selectedTruckData.estado === 'En ruta' ? 'success' : selectedTruckData.estado === 'Disponible' ? 'info' : 'warning'}`}>
                      {selectedTruckData.estado}
                    </span>
                  </div>
                  <div className="info-row">
                    <strong>Tipo de Servicio:</strong> 
                    <span className="service-type-badge">
                      {selectedTruckData.tipoServicio === 'fumigacion' ? 'Fumigación' : 'Recolección'}
                    </span>
                  </div>
                  <div className="info-row">
                    <strong>Ruta Asignada:</strong> {selectedTruckData.rutaAsignada || 'Sin asignar'}
                  </div>
                </div>

                <div className="info-section">
                  <h5>📍 Ubicación y Estado</h5>
                  <div className="info-row">
                    <strong>Latitud:</strong> {selectedTruckData.lat.toFixed(6)}
                  </div>
                  <div className="info-row">
                    <strong>Longitud:</strong> {selectedTruckData.lng.toFixed(6)}
                  </div>
                  <div className="info-row">
                    <strong>Velocidad:</strong> {selectedTruckData.velocidad} km/h
                  </div>
                  <div className="info-row">
                    <strong>Combustible:</strong> 
                    <div className="fuel-bar">
                      <div className="fuel-fill" style={{ width: `${selectedTruckData.combustible}%` }}></div>
                    </div>
                    {selectedTruckData.combustible}%
                  </div>
                </div>

                {selectedTruckData.estado === 'En ruta' && (
                  <div className="info-section">
                    <h5>🗺️ Progreso de Ruta</h5>
                    <div className="info-row">
                      <strong>Parada Actual:</strong> {selectedTruckData.paradaActual}/{selectedTruckData.totalParadas}
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${(selectedTruckData.paradaActual / selectedTruckData.totalParadas) * 100}%` }}
                      ></div>
                    </div>
                    {selectedTruckData.tipoServicio === 'recoleccion' && (
                      <div className="info-row">
                        <strong>Peso Acumulado:</strong> {selectedTruckData.pesoAcumulado} kg
                      </div>
                    )}
                    {selectedTruckData.tipoServicio === 'fumigacion' && (
                      <div className="info-row">
                        <strong>Área Fumigada:</strong> {selectedTruckData.areaFumigada} m²
                      </div>
                    )}
                  </div>
                )}

                <div className="info-section">
                  <h5>🕐 Última Actualización</h5>
                  <div className="info-row">
                    <strong>Fecha:</strong> {new Date(selectedTruckData.ultimaActualizacion).toLocaleString('es-ES')}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn--outline" onClick={() => setShowTruckModal(false)}>Cerrar</button>
              <button 
                className="btn btn--primary" 
                onClick={() => {
                  setShowTruckModal(false);
                  setSelectedTruck(selectedTruckData.id);
                  setActiveTab('dashboard');
                }}
              >
                🗺️ Ver en Mapa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para configurar camión */}
      {showTruckConfig && selectedTruckData && (
        <div className="modal-overlay" onClick={() => setShowTruckConfig(false)}>
          <div className="modal-content truck-config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>⚙️ Configurar {selectedTruckData.id}</h4>
              <button className="modal-close" onClick={() => setShowTruckConfig(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="config-section">
                <h5>👨‍💼 Asignación de Conductor</h5>
                <select className="form-select" defaultValue={selectedTruckData.conductor}>
                  <option value="Juan Pérez">Juan Pérez</option>
                  <option value="María García">María García</option>
                  <option value="Carlos López">Carlos López</option>
                  <option value="Ana Martín">Ana Martín</option>
                  <option value="Luis Rodríguez">Luis Rodríguez</option>
                  <option value="Roberto Silva">Roberto Silva</option>
                  <option value="Carmen Vega">Carmen Vega</option>
                  <option value="Diego Morales">Diego Morales</option>
                </select>
              </div>

              <div className="config-section">
                <h5>🗺️ Asignación de Ruta</h5>
                <select className="form-select" defaultValue={selectedTruckData.rutaAsignada || ''}>
                  <option value="">Sin asignar</option>
                  <option value="Ruta Centro">Ruta Centro</option>
                  <option value="Ruta Norte">Ruta Norte</option>
                  <option value="Ruta Sur">Ruta Sur</option>
                  <option value="Ruta Este">Ruta Este</option>
                </select>
              </div>

              <div className="config-section">
                <h5>🔧 Estado del Vehículo</h5>
                <select className="form-select" defaultValue={selectedTruckData.estado}>
                  <option value="Disponible">Disponible</option>
                  <option value="En ruta">En ruta</option>
                  <option value="En mantenimiento">En mantenimiento</option>
                </select>
              </div>

              {selectedTruckData.tipoServicio === 'fumigacion' && (
                <div className="config-section">
                  <h5>🦟 Tipo de Plaga</h5>
                  <select className="form-select" defaultValue={selectedTruckData.tipoPlaga || ''}>
                    <option value="">Sin especificar</option>
                    <option value="mosquitos">Mosquitos</option>
                    <option value="roedores">Roedores</option>
                    <option value="cucarachas">Cucarachas</option>
                  </select>
                </div>
              )}

              <div className="config-section">
                <h5>⛽ Nivel de Combustible</h5>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={selectedTruckData.combustible} 
                  className="fuel-slider"
                  onChange={(e) => {
                    const updatedTruck = { ...selectedTruckData, combustible: parseInt(e.target.value) };
                    setSelectedTruckData(updatedTruck);
                    setCurrentData(prev => ({
                      ...prev,
                      camiones: prev.camiones.map(c => c.id === updatedTruck.id ? updatedTruck : c)
                    }));
                  }}
                />
                <div className="fuel-display">{selectedTruckData.combustible}%</div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn--outline" onClick={() => setShowTruckConfig(false)}>Cancelar</button>
              <button 
                className="btn btn--primary" 
                onClick={() => {
                  // Actualizar el camión en los datos
                  setCurrentData(prev => ({
                    ...prev,
                    camiones: prev.camiones.map(c => c.id === selectedTruckData.id ? selectedTruckData : c)
                  }));
                  setShowTruckConfig(false);
                  alert('✅ Configuración actualizada correctamente');
                }}
              >
                💾 Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de asignación de rutas */}
      {showRouteAssignment && (
        <div className="modal-overlay" onClick={() => setShowRouteAssignment(false)}>
          <div className="modal-content route-assignment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>🗺️ Asignación de Rutas a Conductores</h4>
              <button className="modal-close" onClick={() => setShowRouteAssignment(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="assignment-grid">
                <div className="drivers-section">
                  <h5>👨‍💼 Conductores Disponibles</h5>
                  <div className="drivers-list">
                    {normalizedCamiones.map(camion => (
                      <div key={camion.id} className="driver-item">
                        <div className="driver-info">
                          <div className="driver-name">{camion.conductor}</div>
                          <div className="driver-vehicle">
                            {camion.tipoServicio === 'fumigacion' ? '🚐' : '🚛'} {camion.id}
                          </div>
                          <div className="driver-status">
                            Estado: <span className={`status-${camion.estado === 'En ruta' ? 'success' : camion.estado === 'Disponible' ? 'info' : 'warning'}`}>
                              {camion.estado}
                            </span>
                          </div>
                        </div>
                        <div className="driver-assignment">
                          <select 
                            className="route-select"
                            value={camion.rutaAsignada || ''}
                            onChange={(e) => {
                              const updatedCamion = { ...camion, rutaAsignada: e.target.value || null };
                              setCurrentData(prev => ({
                                ...prev,
                                camiones: prev.camiones.map(c => c.id === camion.id ? updatedCamion : c)
                              }));
                            }}
                          >
                            <option value="">Sin asignar</option>
                            {currentData.rutas.map(ruta => (
                              <option key={ruta.id} value={ruta.nombre}>
                                {ruta.nombre} ({ruta.paradas.length} paradas)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="routes-summary">
                  <h5>📊 Resumen de Asignaciones</h5>
                  <div className="summary-stats">
                    <div className="summary-stat">
                      <div className="stat-value">{normalizedCamiones.filter(c => c.rutaAsignada).length}</div>
                      <div className="stat-label">Conductores Asignados</div>
                    </div>
                    <div className="summary-stat">
                      <div className="stat-value">{normalizedCamiones.filter(c => !c.rutaAsignada).length}</div>
                      <div className="stat-label">Conductores Disponibles</div>
                    </div>
                    <div className="summary-stat">
                      <div className="stat-value">{currentData.rutas.length}</div>
                      <div className="stat-label">Rutas Totales</div>
                    </div>
                  </div>

                  <div className="route-usage">
                    <h6>Uso de Rutas:</h6>
                    {currentData.rutas.map(ruta => {
                      const assignedDrivers = normalizedCamiones.filter(c => c.rutaAsignada === ruta.nombre);
                      return (
                        <div key={ruta.id} className="route-usage-item">
                          <div className="route-name">{ruta.nombre}</div>
                          <div className="route-drivers">
                            {assignedDrivers.length > 0 ? (
                              assignedDrivers.map(driver => (
                                <span key={driver.id} className="driver-badge">
                                  {driver.conductor} ({driver.id})
                                </span>
                              ))
                            ) : (
                              <span className="no-assignment">Sin asignar</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn--outline" onClick={() => setShowRouteAssignment(false)}>Cerrar</button>
              <button 
                className="btn btn--primary" 
                onClick={() => {
                  setShowRouteAssignment(false);
                  alert('✅ Asignaciones de rutas guardadas correctamente');
                }}
              >
                💾 Guardar Asignaciones
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; 