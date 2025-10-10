import { Sparkles, BarChart3 } from '../Icons';
import CleaningAssignments from './CleaningAssignments';
import './CleaningComponent.css';

const CleaningComponent = ({ userRole = 'admin', embedded = false }) => {
  if (embedded) {
    return (
      <div className="cleaning-container cleaning-container--embedded">
        <CleaningAssignments userRole={userRole} />
      </div>
    );
  }

  return (
    <div className="cleaning-container">
      {/* Header */}
      <div className="cleaning-header">
        <div className="cleaning-header__content">
          <div className="cleaning-header__title-group">
            <Sparkles className="cleaning-header__icon" size={32} />
            <div>
              <h1 className="cleaning-header__title">Gestión de Limpieza</h1>
              <p className="cleaning-header__subtitle">
                Crea y administra asignaciones de limpieza con evidencias fotográficas
              </p>
            </div>
          </div>
        </div>

        {/* Mensaje de reportes */}
        <div className="cleaning-notice">
          <BarChart3 size={18} />
          <span>
            Los reportes de limpieza ahora están disponibles en la sección 
            <strong> Reportes → Limpieza</strong>
          </span>
        </div>
      </div>

      {/* Contenido */}
      <div className="cleaning-content">
        <CleaningAssignments userRole={userRole} />
      </div>
    </div>
  );
};

export default CleaningComponent;
