import { useState } from 'react';
import { appData } from '../../data/mockData';
import MapComponent from '../../components/Map/MapComponent';
import { VehicleCard } from '../../components/Dashboard';
import {
  LayoutDashboard, TrendingUp, BarChart3, Map, LogOut,
  Truck, Activity, Package, Calendar, Building
} from '../../components/Icons';
import './EnterpriseDashboard.css';

const EnterpriseDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Filter data for enterprise (only specific trucks)
  const enterpriseTrucks = appData.camiones.filter(c => ['TR-001', 'TR-002'].includes(c.id));
  const enterpriseReports = appData.historialRecolecciones.filter(h => 
    enterpriseTrucks.some(t => t.id === h.camion)
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="dashboard-content">
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-icon"><Truck size={28} /></div>
                <div className="kpi-content">
                  <div className="kpi-value">{enterpriseTrucks.length}</div>
                  <div className="kpi-label">Camiones Asignados</div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon"><Activity size={28} /></div>
                <div className="kpi-content">
                  <div className="kpi-value">
                    {enterpriseTrucks.filter(c => c.estado === 'En ruta').length}
                  </div>
                  <div className="kpi-label">En Ruta</div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon"><TrendingUp size={28} /></div>
                <div className="kpi-content">
                  <div className="kpi-value">
                    {Math.round(enterpriseReports.reduce((sum, h) => sum + h.duracion, 0) / enterpriseReports.length) || 0}
                  </div>
                  <div className="kpi-label">Duración Promedio</div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon"><Package size={28} /></div>
                <div className="kpi-content">
                  <div className="kpi-value">
                    {enterpriseReports.reduce((sum, h) => sum + h.kgTotal, 0)}
                  </div>
                  <div className="kpi-label">Total Recogido (kg)</div>
                </div>
              </div>
            </div>

            <div className="section-header">
              <div className="section-title">
                <h3>Flota Asignada</h3>
                <p>Monitorea el estado de tus camiones asignados</p>
              </div>
            </div>

            <div className="vehicle-grid">
              {enterpriseTrucks.map(truck => (
                <VehicleCard
                  key={truck.id}
                  vehicle={{
                    ...truck,
                    nombre: truck.id,
                    placa: truck.id,
                    estado: truck.estado === 'En ruta' ? 'en ruta' : truck.estado === 'Disponible' ? 'disponible' : 'mantenimiento',
                    conductor: truck.conductor || 'Sin asignar',
                    rutaAsignada: truck.rutaAsignada || 'Sin asignar',
                    lat: truck.lat,
                    lng: truck.lng,
                    ultimoMantenimiento: '2024-01-15',
                    proximoMantenimiento: '2024-07-15'
                  }}
                  onLocationClick={() => {
                    // TODO: Implement location view
                    console.log('View location for truck:', truck);
                  }}
                  onMaintenanceClick={() => {
                    // TODO: Implement maintenance view
                    console.log('Maintenance for truck:', truck);
                  }}
                  onHistoryClick={() => {
                    // TODO: Implement history view
                    console.log('History for truck:', truck);
                  }}
                />
              ))}
            </div>

            <div className="card">
              <div className="card__body">
                <h3><Map size={20} /> Ubicación de Camiones Asignados</h3>
                <MapComponent camiones={enterpriseTrucks} userType={user.tipo} />
              </div>
            </div>
          </div>
        );
        
      case 'tracking':
        return (
          <div className="tracking-section">
            <div className="section-header">
              <div className="section-title">
                <h3>Seguimiento en Tiempo Real</h3>
                <p>Monitorea la ubicación y estado de todos tus camiones</p>
              </div>
            </div>

            <div className="tracking-grid">
              {enterpriseTrucks.map(truck => (
                <div key={truck.id} className="tracking-card">
                  <div className="tracking-header">
                    <div className="tracking-icon">
                      <Truck size={24} />
                    </div>
                    <div className="tracking-info">
                      <h4>{truck.id}</h4>
                      <span className={`status-badge status-${truck.estado.toLowerCase().replace(' ', '-')}`}>
                        {truck.estado}
                      </span>
                    </div>
                  </div>
                  <div className="tracking-details">
                    <div className="detail-row">
                      <span className="detail-label">Conductor:</span>
                      <span className="detail-value">{truck.conductor || 'Sin asignar'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Ruta:</span>
                      <span className="detail-value">{truck.rutaAsignada || 'Sin asignar'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Ubicación:</span>
                      <span className="detail-value">{truck.lat.toFixed(4)}, {truck.lng.toFixed(4)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Última actualización:</span>
                      <span className="detail-value">{new Date().toLocaleTimeString('es-ES')}</span>
                    </div>
                  </div>
                  <div className="tracking-actions">
                    <button className="action-btn action-btn--location">
                      <Map size={16} /> Ver en Mapa
                    </button>
                    <button className="action-btn action-btn--history">
                      <BarChart3 size={16} /> Historial
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {enterpriseTrucks.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon"><Truck size={48} /></div>
                <h4>No hay camiones asignados</h4>
                <p>Contacta con el administrador para asignar camiones a tu empresa</p>
              </div>
            )}
          </div>
        );
        
      case 'reports':
        return (
          <div className="reports-section">
            <div className="section-header">
              <div className="section-title">
                <h3>Reportes de Recolección</h3>
                <p>Historial detallado de todas las operaciones realizadas</p>
              </div>
            </div>

            <div className="reports-summary">
              <div className="summary-card">
                <div className="summary-icon"><Package size={24} /></div>
                <div className="summary-content">
                  <div className="summary-value">
                    {enterpriseReports.reduce((sum, r) => sum + r.kgTotal, 0)} kg
                  </div>
                  <div className="summary-label">Total Recogido</div>
                </div>
              </div>
              <div className="summary-card">
                <div className="summary-icon"><Activity size={24} /></div>
                <div className="summary-content">
                  <div className="summary-value">{enterpriseReports.length}</div>
                  <div className="summary-label">Operaciones</div>
                </div>
              </div>
              <div className="summary-card">
                <div className="summary-icon"><TrendingUp size={24} /></div>
                <div className="summary-content">
                  <div className="summary-value">
                    {Math.round(enterpriseReports.reduce((sum, r) => sum + r.duracion, 0) / enterpriseReports.length) || 0} min
                  </div>
                  <div className="summary-label">Tiempo Promedio</div>
                </div>
              </div>
            </div>

            <div className="reports-table-container">
              <div className="reports-table-wrapper">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Camión</th>
                      <th>Fecha</th>
                      <th>Duración</th>
                      <th>Paradas</th>
                      <th>Recogido</th>
                      <th>Eficiencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enterpriseReports.map((recoleccion, index) => (
                      <tr key={index}>
                        <td>
                          <div className="truck-cell">
                            <Truck size={16} />
                            <span>{recoleccion.camion}</span>
                          </div>
                        </td>
                        <td>
                          <div className="date-cell">
                            <Calendar size={14} />
                            <span>{recoleccion.fecha}</span>
                          </div>
                        </td>
                        <td>{recoleccion.duracion} min</td>
                        <td>{recoleccion.paradas} paradas</td>
                        <td>{recoleccion.kgTotal} kg</td>
                        <td>
                          <span className={`efficiency-badge efficiency-${recoleccion.kgTotal > 800 ? 'excellent' : recoleccion.kgTotal > 600 ? 'good' : 'poor'}`}>
                            {recoleccion.kgTotal > 800 ? 'Excelente' : recoleccion.kgTotal > 600 ? 'Buena' : 'Mejorable'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {enterpriseReports.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon"><BarChart3 size={48} /></div>
                <h4>No hay reportes disponibles</h4>
                <p>Aún no se han realizado operaciones de recolección</p>
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2><Building size={20} /> RMP Enterprise</h2>
          <p>Bienvenido, {user.nombre}</p>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li>
              <button
                className={activeTab === 'dashboard' ? 'active' : ''}
                onClick={() => setActiveTab('dashboard')}
              >
                <LayoutDashboard size={18} /> Dashboard
              </button>
            </li>
            <li>
              <button
                className={activeTab === 'tracking' ? 'active' : ''}
                onClick={() => setActiveTab('tracking')}
              >
                <Map size={18} /> Seguimiento
              </button>
            </li>
            <li>
              <button
                className={activeTab === 'reports' ? 'active' : ''}
                onClick={() => setActiveTab('reports')}
              >
                <BarChart3 size={18} /> Reportes
              </button>
            </li>
          </ul>
        </nav>
      </div>

      <div className="main-content">
        <div className="dashboard-header">
          <h1><Building size={24} /> Panel Enterprise</h1>
          <div className="header-actions">
            <button className="logout-btn" onClick={onLogout}>
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </div>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default EnterpriseDashboard; 