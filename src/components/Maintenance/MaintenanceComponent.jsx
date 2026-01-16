import { useState } from 'react';
import { BarChart3, Wrench } from '../Icons';
import MaintenanceDashboard from './MaintenanceDashboard';
import MaintenanceTasks from './MaintenanceTasks';
import './MaintenanceComponent.css';

const MaintenanceComponent = ({ userRole = 'admin' }) => {
  const [activeView, setActiveView] = useState('dashboard');

  const categories = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'tareas', label: 'Tareas', icon: Wrench }
  ];

  const renderCategoriesNav = () => (
    <div className="reports-categories">
      {categories.map(category => (
        <button
          key={category.id}
          className={`category-tab ${activeView === category.id ? 'category-tab--active' : ''}`}
          onClick={() => setActiveView(category.id)}
        >
          <category.icon size={20} strokeWidth={1.5} />
          <span>{category.label}</span>
        </button>
      ))}
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <MaintenanceDashboard userRole={userRole} />;
      case 'tareas':
        return <MaintenanceTasks userRole={userRole} />;
      default:
        return <MaintenanceDashboard userRole={userRole} />;
    }
  };

  return (
    <div className="reports-container-new maintenance-container-modern">
      {renderCategoriesNav()}
      <div className="reports-content-new" style={{ marginTop: '24px' }}>
        {renderContent()}
      </div>
    </div>
  );
};

export default MaintenanceComponent;
