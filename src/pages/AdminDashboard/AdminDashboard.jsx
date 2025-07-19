import { useState, useEffect } from 'react';
import { appData } from '../../data/mockData';
import MapComponent from '../../components/Map/MapComponent';
import ReportsComponent from '../../components/Reports/ReportsComponent';
import PersonnelComponent from '../../components/Personnel/PersonnelComponent';
import InventoryComponent from '../../components/Inventory/InventoryComponent';
import RoutesComponent from '../../components/Routes/RoutesComponent';
import ManagementComponent from '../../components/Management/ManagementComponent';

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
          <div className="unified-dashboard">
            {/* SECCIÓN 1: MAPA COMPLETO */}
            <section className="map-section">
              <div className="map-container-fullscreen">
                <div className="map-wrapper-fullscreen">
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
                  <div className="service-filters-overlay">
                    <button 
                      className={`filter-compact ${serviceTypeFilter === 'todos' ? 'active' : ''}`}
                      onClick={() => setServiceTypeFilter('todos')}
                    >
                      Todos
                    </button>
                    <button 
                      className={`filter-compact ${serviceTypeFilter === 'recoleccion' ? 'active' : ''}`}
                      onClick={() => setServiceTypeFilter('recoleccion')}
                    >
                      🚛 Recolección
                    </button>
                    <button 
                      className={`filter-compact ${serviceTypeFilter === 'fumigacion' ? 'active' : ''}`}
                      onClick={() => setServiceTypeFilter('fumigacion')}
                    >
                      🚐 Fumigación
                    </button>
                  </div>
                </div>
                <div className="scroll-indicator">
                  <span>Desliza hacia abajo para ver estadísticas</span>
                  <div className="scroll-arrow">↓</div>
                </div>
              </div>
            </section>

            {/* SECCIÓN 2: DASHBOARD COMPACTO */}
            <section className="dashboard-section">
              <div className="dashboard-container-compact">
                <div className="dashboard-header-compact">
                  <h1>📊 Actividad del Día</h1>
                  <span className="dashboard-date">{new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>

                {/* KPIs Horizontales Compactos */}
                <div className="kpis-horizontal">
                  <div className="kpi-compact primary">
                    <div className="kpi-icon-small">🚛</div>
                    <div className="kpi-data">
                      <span className="kpi-number">
                        {serviceTypeFilter === 'todos' 
                          ? normalizedCamiones.length 
                          : normalizedCamiones.filter(c => c.tipoServicio === serviceTypeFilter).length
                        }
                      </span>
                      <span className="kpi-label-small">Vehículos Activos</span>
                    </div>
                  </div>
                  <div className="kpi-compact success">
                    <div className="kpi-icon-small">✅</div>
                    <div className="kpi-data">
                      <span className="kpi-number">
                        {normalizedCamiones.filter(c => c.estado === 'En ruta').length}
                      </span>
                      <span className="kpi-label-small">En Ruta</span>
                    </div>
                  </div>
                  <div className="kpi-compact warning">
                    <div className="kpi-icon-small">⚡</div>
                    <div className="kpi-data">
                      <span className="kpi-number">{Math.round(currentData.estadisticasOperativas.eficienciaPromedio)}%</span>
                      <span className="kpi-label-small">Eficiencia</span>
                    </div>
                  </div>
                  <div className="kpi-compact secondary">
                    <div className="kpi-icon-small">⚠️</div>
                    <div className="kpi-data">
                      <span className="kpi-number">{currentData.alertas.length}</span>
                      <span className="kpi-label-small">Alertas</span>
                    </div>
                  </div>
                </div>

                {/* Contenido Principal en Grid */}
                <div className="dashboard-main-grid">
                  {/* Columna Izquierda: Conductores */}
                  <div className="dashboard-column">
                    <h3>👥 Conductores Activos</h3>
                    <div className="conductors-compact">
                      {normalizedCamiones.slice(0, 4).map(truck => (
                        <div key={truck.id} className="conductor-item-compact">
                          <div className="conductor-avatar-small">
                            <span>{truck.conductor.charAt(0)}</span>
                          </div>
                          <div className="conductor-details">
                            <div className="conductor-name-small">{truck.conductor}</div>
                            <div className="conductor-info-small">{truck.id} • {truck.rutaAsignada || 'Sin ruta'}</div>
                            <div className="progress-compact">
                              <div className="progress-bar-small">
                                <div className="progress-fill" style={{ width: `${(truck.paradaActual / truck.totalParadas) * 100}%` }}></div>
                              </div>
                              <span className="progress-text-small">{truck.paradaActual}/{truck.totalParadas}</span>
                            </div>
                          </div>
                          <div className={`status-badge-small status-${truck.estado.toLowerCase().replace(' ', '-')}`}>
                            {truck.estado === 'En ruta' ? 'Activo' : truck.estado}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Columna Derecha: Rutas */}
                  <div className="dashboard-column">
                    <h3>🗺️ Rutas de Hoy</h3>
                    <div className="routes-compact">
                      {currentData.rutas.slice(0, 4).map((route, index) => (
                        <div key={index} className="route-item-compact">
                          <div className="route-icon-small">
                            {route.nombre.includes('Norte') ? '🚛' : '🚐'}
                          </div>
                          <div className="route-details">
                            <div className="route-name-small">{route.nombre}</div>
                            <div className="route-info-small">
                              {route.paradas.length} paradas • {route.distanciaTotal} km • {Math.round(route.tiempoEstimado / 60)}h
                            </div>
                            <div className="progress-compact">
                              <div className="progress-bar-small">
                                <div className="progress-fill" style={{ width: `${Math.random() * 100}%` }}></div>
                              </div>
                              <span className="progress-text-small">
                                {Math.floor(Math.random() * 5)}/{route.paradas.length} completadas
                              </span>
                            </div>
                          </div>
                          <div className="route-status-small">
                            {Math.random() > 0.3 ? 'En progreso' : 'Completada'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Alertas y Resumen en Fila */}
                <div className="dashboard-bottom-row">
                  {/* Alertas */}
                  <div className="alerts-compact">
                    <h3>🚨 Alertas Recientes</h3>
                    <div className="alerts-horizontal">
                      <div className="alert-item-compact alert-media">
                        <span className="alert-icon-small">⚠️</span>
                        <div className="alert-text">
                          <div className="alert-truck-small">TR-003</div>
                          <div className="alert-message-small">Reporte de riesgo: Área peligrosa detectada</div>
                        </div>
                      </div>
                      <div className="alert-item-compact alert-baja">
                        <span className="alert-icon-small">📋</span>
                        <div className="alert-text">
                          <div className="alert-truck-small">TR-001</div>
                          <div className="alert-message-small">Reporte de conductor: Parada completada</div>
                        </div>
                      </div>
                      <div className="alert-item-compact alert-alta">
                        <span className="alert-icon-small">🚧</span>
                        <div className="alert-text">
                          <div className="alert-truck-small">TR-002</div>
                          <div className="alert-message-small">Riesgo reportado: Obstáculo en ruta</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resumen */}
                  <div className="summary-compact">
                    <h3>📈 Resumen</h3>
                    <div className="summary-items">
                      <div className="summary-item-small">
                        <span className="summary-number">{Math.round(currentData.estadisticasOperativas.eficienciaPromedio)}%</span>
                        <span className="summary-label">Eficiencia</span>
                      </div>
                      <div className="summary-item-small">
                        <span className="summary-number">{Math.round(currentData.estadisticasOperativas.combustiblePromedio)}%</span>
                        <span className="summary-label">Combustible</span>
                      </div>
                      <div className="summary-item-small">
                        <span className="summary-number">{Math.round(currentData.estadisticasOperativas.totalKgHoy / 10)}</span>
                        <span className="summary-label">Volumen (m³)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        );
        
      case 'management':
        return <ManagementComponent 
          userType={user.tipo} 
          onViewTruckOnMap={(truckId) => {
            setActiveTab('dashboard');
            setSelectedTruck(truckId);
          }}
        />;
        
      case 'reportes':
        return <ReportsComponent userType={user.tipo} />;
        
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
                className={activeTab === 'management' ? 'active' : ''}
                onClick={() => setActiveTab('management')}
              >
                🎛️ Gestión
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
                        <strong>Volumen Estimado:</strong> {Math.round(selectedTruckData.pesoAcumulado / 100)} m³
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