import { X, MapPin, Calendar, BarChart3, Camera } from '../Icons';
import './LocationPopup.css';

const LocationPopup = ({ location, onClose, onViewReports }) => {
  if (!location) return null;

  // Calcular última limpieza
  const getLastCleaning = () => {
    // Esta info vendría de los assignments pero por ahora usamos placeholder
    return 'Hoy 07:45 AM';
  };

  return (
    <div className="location-popup-overlay" onClick={onClose}>
      <div className="location-popup" onClick={(e) => e.stopPropagation()}>
        <button className="location-popup-close" onClick={onClose}>
          <X size={18} strokeWidth={2} />
        </button>

        {/* Imagen del lugar */}
        <div className="location-popup-image">
          <img
            src={location.foto}
            alt={location.nombre}
            onError={(e) => {
              e.target.src = '/placeholder-location.jpg';
            }}
          />
          <div className="location-popup-badge">
            <MapPin size={14} strokeWidth={2} />
            Punto de Limpieza
          </div>
        </div>

        {/* Contenido */}
        <div className="location-popup-content">
          <h3 className="location-popup-title">{location.nombre}</h3>

          <div className="location-popup-info">
            <div className="location-popup-info-item">
              <MapPin size={14} />
              <span>{location.direccion}</span>
            </div>

            <div className="location-popup-info-item">
              <Calendar size={14} />
              <span>Última limpieza: {getLastCleaning()}</span>
            </div>
          </div>

          <p className="location-popup-description">{location.descripcion}</p>

          {/* Botón para ver reportes */}
          <button
            className="location-popup-btn"
            onClick={() => {
              onViewReports(location);
              onClose();
            }}
          >
            <BarChart3 size={16} strokeWidth={2} />
            Ver Reportes de Limpieza
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPopup;
