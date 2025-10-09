import { useState } from 'react';
import { Sparkles, ClipboardList } from '../Icons';
import { Button } from '../UI';
import CleaningAssignments from './CleaningAssignments';
import CleaningReports from './CleaningReports';
import './CleaningComponent.css';

const CleaningComponent = ({ userRole = 'admin' }) => {
  // Para enterprise, mostrar solo reportes
  const [activeSubTab, setActiveSubTab] = useState(
    userRole === 'enterprise' ? 'reportes' : 'asignaciones'
  );

  return (
    <div className="cleaning-container">
      {/* Header */}
      <div className="cleaning-header">
        <div className="cleaning-header__content">
          <div className="cleaning-header__title-group">
            <Sparkles className="cleaning-header__icon" size={32} />
            <div>
              <h1 className="cleaning-header__title">
                {userRole === 'enterprise' ? 'Reportes de Limpieza' : 'Gestión de Limpieza'}
              </h1>
              <p className="cleaning-header__subtitle">
                {userRole === 'enterprise'
                  ? 'Visualiza los reportes de limpieza realizados'
                  : 'Asignaciones, evidencias y reportes'}
              </p>
            </div>
          </div>
        </div>

        {/* Sub-navegación - Solo visible para admin */}
        {userRole !== 'enterprise' && (
          <div className="cleaning-subtabs">
            <button
              className={`cleaning-subtab ${activeSubTab === 'asignaciones' ? 'cleaning-subtab--active' : ''}`}
              onClick={() => setActiveSubTab('asignaciones')}
            >
              <Sparkles size={18} />
              <span>Asignaciones</span>
            </button>
            <button
              className={`cleaning-subtab ${activeSubTab === 'reportes' ? 'cleaning-subtab--active' : ''}`}
              onClick={() => setActiveSubTab('reportes')}
            >
              <ClipboardList size={18} />
              <span>Reportes</span>
            </button>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="cleaning-content">
        {activeSubTab === 'asignaciones' && userRole !== 'enterprise' && (
          <CleaningAssignments userRole={userRole} />
        )}
        {(activeSubTab === 'reportes' || userRole === 'enterprise') && (
          <CleaningReports userRole={userRole} />
        )}
      </div>
    </div>
  );
};

export default CleaningComponent;
