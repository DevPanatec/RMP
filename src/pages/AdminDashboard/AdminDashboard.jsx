import { useState, useEffect } from 'react';
import { appData } from '../../data/mockData';
import MapComponent from '../../components/Map/MapComponent';
import ReportsComponent from '../../components/Reports/ReportsComponent';
import PersonnelComponent from '../../components/Personnel/PersonnelComponent';
import InventoryComponent from '../../components/Inventory/InventoryComponent';
import RoutesComponent from '../../components/Routes/RoutesComponent';
import ServicesComponent from '../../components/Services/ServicesComponent';
import RiskComponent from '../../components/Risk/RiskComponent';
import './AdminDashboard.css';

const AdminDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentData, setCurrentData] = useState(appData);
  const [selectedTruck, setSelectedTruck] = useState(null);

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
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-icon">🚛</div>
                <div className="kpi-content">
                  <div className="kpi-value">{currentData.camiones.length}</div>
                  <div className="kpi-label">Total Camiones</div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon">🟢</div>
                <div className="kpi-content">
                  <div className="kpi-value">
                    {currentData.camiones.filter(c => c.estado === 'En ruta').length}
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
            
            <div className="card">
              <div className="card__body">
                <h3>🗺️ Monitoreo GPS en Tiempo Real</h3>
                <p className="section-description">
                  Seguimiento en vivo de todos los vehículos recolectores con actualizaciones automáticas
                </p>
                <MapComponent 
                  camiones={currentData.camiones} 
                  userType={user.tipo}
                  showRealTime={true}
                  selectedTruck={selectedTruck}
                />
              </div>
            </div>
          </div>
        );
        
      case 'camiones':
        return (
          <div className="dashboard-content">
            <div className="card">
              <div className="card__body">
                <h3>🚛 Gestión de Camiones</h3>
                <div className="table-controls">
                  <div className="search-box">
                    <input 
                      type="text" 
                      placeholder="🔍 Buscar camión..." 
                      className="search-input"
                    />
                  </div>
                </div>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Conductor</th>
                        <th>Estado</th>
                        <th>Ruta Asignada</th>
                        <th>Progreso</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentData.camiones.map(camion => (
                        <tr key={camion.id} className={selectedTruck === camion.id ? 'selected-row' : ''}>
                          <td>
                            <button 
                              className="truck-id-btn"
                              onClick={() => setSelectedTruck(camion.id)}
                            >
                              {camion.id}
                            </button>
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
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button className="btn btn--sm btn--outline">
                                📍 Ver
                              </button>
                              <button className="btn btn--sm btn--outline">
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
            <RoutesComponent
              initialRoutes={currentData.rutas}
              onRoutesChange={(routes) => setCurrentData(prev => ({ ...prev, rutas: routes }))}
            />
          </div>
        );
        
      case 'reportes':
        return <ReportsComponent userType={user.tipo} />;
        
      case 'personal':
        return <PersonnelComponent userType={user.tipo} />;
        
      case 'inventario':
        return <InventoryComponent userType={user.tipo} />;
        
      case 'servicios':
        return <ServicesComponent userType={user.tipo} />;
        
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
                className={activeTab === 'servicios' ? 'active' : ''}
                onClick={() => setActiveTab('servicios')}
              >
                🏢 Servicios
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
    </div>
  );
};

export default AdminDashboard; 