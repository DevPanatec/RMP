import { Bug, BarChart3 } from '../Icons';
import FumigationAssignments from './FumigationAssignments';
import './FumigationComponent.css';

const FumigationComponent = ({ userRole = 'admin', embedded = false }) => {
  if (embedded) {
    return (
      <div className="fumigation-container fumigation-container--embedded">
        <FumigationAssignments userRole={userRole} />
      </div>
    );
  }

  return (
    <div className="fumigation-container">
      {/* Header */}
      <div className="fumigation-header">
        <div className="fumigation-header__content">
          <div className="fumigation-header__title-group">
            <Bug className="fumigation-header__icon" size={32} />
            <div>
              <h1 className="fumigation-header__title">Gestión de Fumigación</h1>
              <p className="fumigation-header__subtitle">
                Registra fumigaciones internas y externas con evidencia fotográfica
              </p>
            </div>
          </div>
        </div>

        {/* Información de frecuencia */}
        <div className="fumigation-info">
          <div className="fumigation-info__item">
            <span className="fumigation-info__label">🏢 Interna (Mensual):</span>
            <span className="fumigation-info__value">1 vez al mes • 7:00 PM - 11:00 PM</span>
          </div>
          <div className="fumigation-info__item">
            <span className="fumigation-info__label">🌳 Externa (Semanal):</span>
            <span className="fumigation-info__value">3 veces por semana • 7:00 PM - 11:00 PM</span>
          </div>
        </div>

        {/* Mensaje de reportes */}
        <div className="fumigation-notice">
          <BarChart3 size={18} />
          <span>
            Los reportes de fumigación ahora están disponibles en la sección
            <strong> Reportes → Fumigación</strong>
          </span>
        </div>
      </div>

      {/* Contenido */}
      <div className="fumigation-content">
        <FumigationAssignments userRole={userRole} />
      </div>
    </div>
  );
};

export default FumigationComponent;
