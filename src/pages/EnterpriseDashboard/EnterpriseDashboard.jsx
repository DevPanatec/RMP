import { useState } from 'react';
import { appData } from '../../data/mockData';
import MapComponent from '../../components/Map/MapComponent';
import './EnterpriseDashboard.css';

const EnterpriseDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Debug log
  console.log('EnterpriseDashboard rendering, activeTab:', activeTab);

  // Filter data for enterprise (only specific trucks)
  const enterpriseTrucks = appData.camiones.filter(c => ['TR-001', 'TR-002'].includes(c.id));
  const enterpriseReports = appData.historialRecolecciones.filter(h => 
    enterpriseTrucks.some(t => t.id === h.camion)
  );

  const renderContent = () => {
    console.log('Rendering content for tab:', activeTab);
    
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="unified-dashboard">
            {/* SECCIÓN 1: MAPA COMPLETO */}
            <section className="map-section">
              <div className="map-container-fullscreen">
                <div className="map-wrapper-fullscreen">
                  <MapComponent camiones={enterpriseTrucks} userType={user.tipo} />
                  <div className="service-filters-overlay">
                    <button className="filter-compact active">Todos</button>
                    <button className="filter-compact">🚛 Recolección</button>
                    <button className="filter-compact">🚐 Fumigación</button>
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
                  <h1>📊 Actividad del Día - Enterprise</h1>
                  <span className="dashboard-date">{new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>

                {/* KPIs Horizontales Compactos */}
                <div className="kpis-horizontal">
                  <div className="kpi-compact primary">
                    <div className="kpi-icon-small">🚛</div>
                    <div className="kpi-data">
                      <span className="kpi-number">{appData.rutas.filter(r => r.nombre.includes('Recolección')).length}</span>
                      <span className="kpi-label-small">Rutas Recolección</span>
                    </div>
                  </div>
                  <div className="kpi-compact success">
                    <div className="kpi-icon-small">🚐</div>
                    <div className="kpi-data">
                      <span className="kpi-number">{appData.rutas.filter(r => r.nombre.includes('Fumigación')).length}</span>
                      <span className="kpi-label-small">Rutas Fumigación</span>
                    </div>
                  </div>
                  <div className="kpi-compact warning">
                    <div className="kpi-icon-small">✅</div>
                    <div className="kpi-data">
                      <span className="kpi-number">{enterpriseTrucks.filter(c => c.paradaActual >= 3).length}</span>
                      <span className="kpi-label-small">Completadas</span>
                    </div>
                  </div>
                  <div className="kpi-compact secondary">
                    <div className="kpi-icon-small">⏱️</div>
                    <div className="kpi-data">
                      <span className="kpi-number">{enterpriseTrucks.filter(c => c.paradaActual < 3).length}</span>
                      <span className="kpi-label-small">En Progreso</span>
                    </div>
                  </div>
                </div>

                {/* Contenido Principal en Grid */}
                <div className="dashboard-main-grid">
                  {/* Columna Izquierda: Conductores */}
                  <div className="dashboard-column">
                    <h3>👥 Conductores Activos</h3>
                    <div className="conductors-compact">
                      {enterpriseTrucks.map(truck => (
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
                      {appData.rutas.slice(0, 4).map((route, index) => (
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
                          <div className="alert-truck-small">TR-001</div>
                          <div className="alert-message-small">Reporte de riesgo: Área con tráfico intenso</div>
                        </div>
                      </div>
                      <div className="alert-item-compact alert-baja">
                        <span className="alert-icon-small">📋</span>
                        <div className="alert-text">
                          <div className="alert-truck-small">TR-002</div>
                          <div className="alert-message-small">Reporte de conductor: Ruta completada</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resumen */}
                  <div className="summary-compact">
                    <h3>📈 Resumen</h3>
                    <div className="summary-items">
                      <div className="summary-item-small">
                        <span className="summary-number">87%</span>
                        <span className="summary-label">Eficiencia</span>
                      </div>
                      <div className="summary-item-small">
                        <span className="summary-number">4.2h</span>
                        <span className="summary-label">Tiempo Prom.</span>
                      </div>
                      <div className="summary-item-small">
                        <span className="summary-number">156</span>
                        <span className="summary-label">Paradas</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        );
        
      case 'tracking':
        return (
          <div className="dashboard-content">
            {/* Seguimiento con diseño moderno */}
            <div className="main-map-container">
              <div className="map-header">
                <h2>🚛 Seguimiento en Tiempo Real</h2>
                <div className="map-stats">
                  <div className="stat-item">
                    <span className="stat-value">{enterpriseTrucks.length}</span>
                    <span className="stat-label">Camiones Total</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{enterpriseTrucks.filter(c => c.estado === 'En ruta').length}</span>
                    <span className="stat-label">Activos</span>
                  </div>
                </div>
              </div>
              <div className="map-wrapper">
                <MapComponent camiones={enterpriseTrucks} userType={user.tipo} />
              </div>
            </div>

            {/* Tabla de seguimiento moderna */}
            <div className="daily-activity-dashboard">
              <div className="dashboard-header-section">
                <h2>🎯 Seguimiento Detallado</h2>
                <p className="dashboard-subtitle">Estado actual de todos los camiones asignados</p>
              </div>

              <div className="card">
                <div className="card__body">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Conductor</th>
                        <th>Estado</th>
                        <th>Ruta</th>
                        <th>Progreso</th>
                        <th>Ubicación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enterpriseTrucks.map(camion => (
                        <tr key={camion.id}>
                          <td><strong>{camion.id}</strong></td>
                          <td>
                            <div className="conductor-cell">
                              <div className="conductor-avatar-small">
                                {camion.conductor.charAt(0)}
                              </div>
                              {camion.conductor}
                            </div>
                          </td>
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
                            <div className="progress-cell">
                              <div className="progress-bar-small">
                                <div className="progress-fill" style={{ width: `${(camion.paradaActual / camion.totalParadas) * 100}%` }}></div>
                              </div>
                              <span className="progress-text-small">{camion.paradaActual}/{camion.totalParadas}</span>
                            </div>
                          </td>
                          <td>{camion.lat.toFixed(4)}, {camion.lng.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'reports':
        return (
          <div className="dashboard-content">
            {/* KPIs de reportes */}
            <div className="daily-activity-dashboard">
              <div className="dashboard-header-section">
                <h2>📊 Reportes y Análisis</h2>
                <p className="dashboard-subtitle">Análisis de rendimiento y estadísticas históricas</p>
              </div>

              {/* KPIs de reportes */}
              <div className="daily-kpis">
                <div className="kpi-card primary">
                  <div className="kpi-icon">📈</div>
                  <div className="kpi-content">
                    <div className="kpi-value">{enterpriseReports.length}</div>
                    <div className="kpi-label">Reportes Totales</div>
                    <div className="kpi-trend">Este mes</div>
                  </div>
                </div>
                
                <div className="kpi-card success">
                  <div className="kpi-icon">⭐</div>
                  <div className="kpi-content">
                    <div className="kpi-value">{Math.round(enterpriseReports.reduce((sum, h) => sum + h.duracion, 0) / enterpriseReports.length) || 0}</div>
                    <div className="kpi-label">Duración Promedio (min)</div>
                    <div className="kpi-trend">Óptimo</div>
                  </div>
                </div>
                
                <div className="kpi-card warning">
                  <div className="kpi-icon">🏆</div>
                  <div className="kpi-content">
                    <div className="kpi-value">{enterpriseReports.filter(r => r.kgTotal > 800).length}</div>
                    <div className="kpi-label">Reportes Excelentes</div>
                    <div className="kpi-trend">Alta eficiencia</div>
                  </div>
                </div>
                
                <div className="kpi-card secondary">
                  <div className="kpi-icon">📊</div>
                  <div className="kpi-content">
                    <div className="kpi-value">{Math.round(enterpriseReports.reduce((sum, h) => sum + h.kgTotal, 0) / enterpriseReports.length) || 0}</div>
                    <div className="kpi-label">Promedio KG</div>
                    <div className="kpi-trend">Por recolección</div>
                  </div>
                </div>
              </div>

              {/* Tabla de reportes moderna */}
              <div className="daily-section">
                <h3>📋 Historial de Recolecciones</h3>
                <div className="card">
                  <div className="card__body">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Camión</th>
                          <th>Fecha</th>
                          <th>Duración</th>
                          <th>Paradas</th>
                          <th>KG Recolectados</th>
                          <th>Eficiencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enterpriseReports.map((recoleccion, index) => (
                          <tr key={index}>
                            <td>
                              <div className="truck-cell">
                                <span className="truck-icon">🚛</span>
                                <strong>{recoleccion.camion}</strong>
                              </div>
                            </td>
                            <td>{recoleccion.fecha}</td>
                            <td>
                              <span className="duration-badge">
                                ⏱️ {recoleccion.duracion}min
                              </span>
                            </td>
                            <td>
                              <span className="stops-badge">
                                📍 {recoleccion.paradas}
                              </span>
                            </td>
                            <td>
                              <span className="weight-badge">
                                ⚖️ {recoleccion.kgTotal}kg
                              </span>
                            </td>
                            <td>
                              <span className={`status status--${
                                recoleccion.kgTotal > 800 ? 'success' : 
                                recoleccion.kgTotal > 600 ? 'warning' : 'error'
                              }`}>
                                {recoleccion.kgTotal > 800 ? '⭐ Excelente' : 
                                 recoleccion.kgTotal > 600 ? '✅ Buena' : '⚠️ Mejorable'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Análisis adicional */}
              <div className="summary-grid">
                <div className="summary-card">
                  <div className="summary-icon">📈</div>
                  <div className="summary-content">
                    <div className="summary-title">Tendencia Semanal</div>
                    <div className="summary-value">+15%</div>
                    <div className="summary-description">Mejora en eficiencia</div>
                  </div>
                </div>
                
                <div className="summary-card">
                  <div className="summary-icon">🎯</div>
                  <div className="summary-content">
                    <div className="summary-title">Meta Mensual</div>
                    <div className="summary-value">78%</div>
                    <div className="summary-description">Progreso actual</div>
                  </div>
                </div>
                
                <div className="summary-card">
                  <div className="summary-icon">⚡</div>
                  <div className="summary-content">
                    <div className="summary-title">Tiempo Óptimo</div>
                    <div className="summary-value">45min</div>
                    <div className="summary-description">Por ruta promedio</div>
                  </div>
                </div>
                
                <div className="summary-card">
                  <div className="summary-icon">🏅</div>
                  <div className="summary-content">
                    <div className="summary-title">Mejor Día</div>
                    <div className="summary-value">Viernes</div>
                    <div className="summary-description">Mayor eficiencia</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>RMP Enterprise</h2>
        <p>Bienvenido, {user.nombre}</p>
        <nav className="sidebar-nav">
          <ul>
            <li>
              <button 
                className={activeTab === 'dashboard' ? 'active' : ''}
                onClick={() => setActiveTab('dashboard')}
              >
                Dashboard
              </button>
            </li>
            <li>
              <button 
                className={activeTab === 'tracking' ? 'active' : ''}
                onClick={() => setActiveTab('tracking')}
              >
                Seguimiento
              </button>
            </li>
            <li>
              <button 
                className={activeTab === 'reports' ? 'active' : ''}
                onClick={() => setActiveTab('reports')}
              >
                Reportes
              </button>
            </li>
          </ul>
        </nav>
      </div>
      
      <div className="main-content">
        <div className="dashboard-header">
          <h1>Panel Enterprise</h1>
          <button className="logout-btn" onClick={onLogout}>
            Cerrar Sesión
          </button>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default EnterpriseDashboard; 