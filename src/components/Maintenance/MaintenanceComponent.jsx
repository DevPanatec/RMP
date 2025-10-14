import { Wrench, BarChart3 } from '../Icons';
import MaintenanceDashboard from './MaintenanceDashboard';
import MaintenanceTasks from './MaintenanceTasks';
import MaintenanceAlerts from './MaintenanceAlerts';
import { useState } from 'react';
import './MaintenanceComponent.css';

const MaintenanceComponent = ({ userRole = 'admin' }) => {
  const [activeSubTab, setActiveSubTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeSubTab) {
      case 'dashboard':
        return <MaintenanceDashboard userRole={userRole} />;
      case 'tareas':
        return <MaintenanceTasks userRole={userRole} />;
      case 'alertas':
        return <MaintenanceAlerts userRole={userRole} />;
      default:
        return <MaintenanceDashboard userRole={userRole} />;
    }
  };

  return (
    <div className="maintenance-container">
      {/* Header */}
      <div className="maintenance-header">
        <div className="maintenance-header__content">
          <div className="maintenance-header__title-group">
            <Wrench className="maintenance-header__icon" size={32} />
            <div>
              <h1 className="maintenance-header__title">Mantenimiento</h1>
              <p className="maintenance-header__subtitle">
                Planta de Tratamiento - Mercado San Felipe Neri
              </p>
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="maintenance-subtabs">
          <button
            className={`maintenance-subtab ${activeSubTab === 'dashboard' ? 'maintenance-subtab--active' : ''}`}
            onClick={() => setActiveSubTab('dashboard')}
          >
            <BarChart3 size={18} />
            <span>Dashboard</span>
          </button>
          <button
            className={`maintenance-subtab ${activeSubTab === 'tareas' ? 'maintenance-subtab--active' : ''}`}
            onClick={() => setActiveSubTab('tareas')}
          >
            <Wrench size={18} />
            <span>Tareas</span>
          </button>
          <button
            className={`maintenance-subtab ${activeSubTab === 'alertas' ? 'maintenance-subtab--active' : ''}`}
            onClick={() => setActiveSubTab('alertas')}
          >
            <span>🔔</span>
            <span>Alertas</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="maintenance-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default MaintenanceComponent;
