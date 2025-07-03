import { useState } from 'react';
import { appData } from '../../data/mockData';
import MapComponent from '../../components/Map/MapComponent';
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
                <div className="kpi-value">{enterpriseTrucks.length}</div>
                <div className="kpi-label">Camiones Asignados</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-value">
                  {enterpriseTrucks.filter(c => c.estado === 'En ruta').length}
                </div>
                <div className="kpi-label">En Ruta</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-value">
                  {Math.round(enterpriseReports.reduce((sum, h) => sum + h.duracion, 0) / enterpriseReports.length) || 0}
                </div>
                <div className="kpi-label">Duración Promedio (min)</div>
              </div>
            </div>
            
            <div className="card">
              <div className="card__body">
                <h3>Ubicación de Camiones Asignados</h3>
                <MapComponent camiones={enterpriseTrucks} userType={user.tipo} />
              </div>
            </div>
          </div>
        );
        
      case 'tracking':
        return (
          <div className="dashboard-content">
            <div className="card">
              <div className="card__body">
                <h3>Seguimiento de Camiones</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Conductor</th>
                      <th>Estado</th>
                      <th>Ruta</th>
                      <th>Ubicación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enterpriseTrucks.map(camion => (
                      <tr key={camion.id}>
                        <td>{camion.id}</td>
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
                        <td>{camion.lat.toFixed(4)}, {camion.lng.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
        
      case 'reports':
        return (
          <div className="dashboard-content">
            <div className="card">
              <div className="card__body">
                <h3>Reportes de Recolección</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Camión</th>
                      <th>Fecha</th>
                      <th>Duración (min)</th>
                      <th>Paradas</th>
                      <th>Eficiencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enterpriseReports.map((recoleccion, index) => (
                      <tr key={index}>
                        <td>{recoleccion.camion}</td>
                        <td>{recoleccion.fecha}</td>
                        <td>{recoleccion.duracion}</td>
                        <td>{recoleccion.paradas}</td>
                        <td>
                          <span className={`status status--${
                            recoleccion.kgTotal > 800 ? 'success' : 
                            recoleccion.kgTotal > 600 ? 'warning' : 'error'
                          }`}>
                            {recoleccion.kgTotal > 800 ? 'Excelente' : 
                             recoleccion.kgTotal > 600 ? 'Buena' : 'Mejorable'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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