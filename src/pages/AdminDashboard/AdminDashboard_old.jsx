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
  const [activeSubTab, setActiveSubTab] = useState('');
  const [currentData, setCurrentData] = useState(appData);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [serviceTypeFilter, setServiceTypeFilter] = useState('todos');

  const normalizedCamiones = currentData.camiones.map(camion => (
    camion.tipoServicio ? camion : { ...camion, tipoServicio: 'recoleccion' }
  ));

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

  const handleTabChange = (newTab, defaultSubTab = '') => {
    setActiveTab(newTab);
    setActiveSubTab(defaultSubTab);
  };

  const renderOperationsContent = () => {
    const currentSubTab = activeSubTab || 'personal';
    
    switch (currentSubTab) {
      case 'personal':
        return (
          <div className="operations-flow">
            <div className="flow-description">
              <h3>👥 Gestión de Personal Operativo</h3>
              <p>Administra empleados, asigna turnos y prepara el personal para las operaciones</p>
            </div>
            <PersonnelComponent userType={user.tipo} operationalMode={true} />
          </div>
        );

      case 'flota':
        const filteredVehicles = serviceTypeFilter === 'todos' 
          ? normalizedCamiones 
          : normalizedCamiones.filter(c => c.tipoServicio === serviceTypeFilter);

        return (
          <div className="operations-flow">
            <div className="flow-description">
              <h3>🚛 Gestión de Flota y Asignaciones</h3>
              <p>Asigna personal a vehículos y gestiona la flota operativa</p>
            </div>
            <div className="dashboard-content">
              <div className="card">
                <div className="card__body">
                  <div className="assignment-section">
                    <h4>📋 Asignación de Personal a Vehículos</h4>
                    <div className="assignment-info">
                      <p>Asigna conductores y define turnos para cada vehículo de la flota</p>
                    </div>
                  </div>
                
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

                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Tipo</th>
                        <th>Conductor Asignado</th>
                        <th>Estado</th>
                        <th>Turno</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVehicles.map(camion => (
                        <tr key={camion.id}>
                          <td>
                            {camion.tipoServicio === 'fumigacion' ? '🚐' : '🚛'} {camion.id}
                          </td>
                          <td>
                            <span className={`service-type-badge ${camion.tipoServicio}`}>
                              {camion.tipoServicio === 'fumigacion' ? 'Fumigación' : 'Recolección'}
                            </span>
                          </td>
                          <td>
                            <select className="form-control">
                              <option value={camion.conductor}>{camion.conductor}</option>
                              <option value="">Sin asignar</option>
                              <option value="Juan Pérez">Juan Pérez</option>
                              <option value="María García">María García</option>
                              <option value="Carlos López">Carlos López</option>
                            </select>
                          </td>
                          <td>
                            <span className={`status status--${
                              camion.estado === 'En ruta' ? 'success' : 
                              camion.estado === 'Disponible' ? 'info' : 'warning'
                            }`}>
                              {camion.estado}
                            </span>
                          </td>
                          <td>
                            <select className="form-control">
                              <option value="Matutino">Matutino (6:00-14:00)</option>
                              <option value="Vespertino">Vespertino (14:00-22:00)</option>
                              <option value="Nocturno">Nocturno (22:00-6:00)</option>
                            </select>
                          </td>
                          <td>
                            <button className="btn btn--sm btn--primary">
                              💾 Guardar
                            </button>
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
          <div className="operations-flow">
            <div className="flow-description">
              <h3>🗺️ Planificación de Rutas y Horarios</h3>
              <p>Crea y asigna rutas, define horarios y optimiza las operaciones</p>
            </div>
            <RoutesComponent
              initialRoutes={currentData.rutas}
              onRoutesChange={(routes) => setCurrentData(prev => ({ ...prev, rutas: routes }))}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const renderAdministrationContent = () => {
    const currentSubTab = activeSubTab || 'inventario';
    switch (currentSubTab) {
      case 'inventario':
        return <InventoryComponent userType={user.tipo} />;
      case 'reportes':
        return <ReportsComponent userType={user.tipo} />;
      default:
        return null;
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="dashboard-content">
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
                />
              </div>
            </div>

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
        
      case 'operaciones':
        return (
          <div className="section-with-tabs">
            <div className="sub-tabs">
              <button 
                className={`sub-tab ${(!activeSubTab || activeSubTab === 'personal') ? 'sub-tab--active' : ''}`}
                onClick={() => setActiveSubTab('personal')}
              >
                👥 Personal
              </button>
              <button 
                className={`sub-tab ${activeSubTab === 'flota' ? 'sub-tab--active' : ''}`}
                onClick={() => setActiveSubTab('flota')}
              >
                🚛 Flota
              </button>
              <button 
                className={`sub-tab ${activeSubTab === 'rutas' ? 'sub-tab--active' : ''}`}
                onClick={() => setActiveSubTab('rutas')}
              >
                🗺️ Rutas
              </button>
            </div>
            {renderOperationsContent()}
          </div>
        );
        
      case 'riesgos':
        return <RiskComponent userType={user.tipo} />;
        
      case 'administracion':
        return (
          <div className="section-with-tabs">
            <div className="sub-tabs">
              <button 
                className={`sub-tab ${(!activeSubTab || activeSubTab === 'inventario') ? 'sub-tab--active' : ''}`}
                onClick={() => setActiveSubTab('inventario')}
              >
                📦 Inventario
              </button>
              <button 
                className={`sub-tab ${activeSubTab === 'reportes' ? 'sub-tab--active' : ''}`}
                onClick={() => setActiveSubTab('reportes')}
              >
                📊 Reportes
              </button>
            </div>
            {renderAdministrationContent()}
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
          <h2>🌱 RMP Admin</h2>
          <p>Bienvenido, {user.nombre}</p>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li>
              <button 
                className={activeTab === 'dashboard' ? 'active' : ''}
                onClick={() => handleTabChange('dashboard')}
              >
                📊 Dashboard
              </button>
            </li>
            <li>
              <button 
                className={activeTab === 'operaciones' ? 'active' : ''}
                onClick={() => handleTabChange('operaciones', 'personal')}
              >
                🚛 Operaciones
              </button>
            </li>
            <li>
              <button 
                className={activeTab === 'riesgos' ? 'active' : ''}
                onClick={() => handleTabChange('riesgos')}
              >
                ⚠️ Riesgos
              </button>
            </li>
            <li>
              <button 
                className={activeTab === 'administracion' ? 'active' : ''}
                onClick={() => handleTabChange('administracion', 'inventario')}
              >
                📋 Administración
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