import { X, MapPin, Calendar, BarChart3, Camera } from '../Icons';
import './LocationPopup.css';

const LocationPopup = ({ location, onClose, onViewReports }) => {
  if (!location) return null;

  // Mapeo de imágenes por nombre de lugar
  const imageMap = {
    'Mercado del Marisco': '/lugares/mercado de mariscos.jpg',
    'Mercado San Felipe Neri': '/lugares/san felipe neri.jpeg',
    'Mercado de Alcalde Díaz': '/lugares/Mercado Alcalde Diaz.jpeg',
    'Mercado de Pueblo Nuevo': '/lugares/Mercado Pueblo Nuevo.jpg',
    'Mercado de Pacora': '/lugares/Mercado de Pacora.jpg',
    'Complejo Turístico Mi Pueblito': '/lugares/Mi Pueblito.jpeg',
    'Palacio Municipal': '/lugares/Palacio Municipal.jpg',
    'Casa Góngora': '/lugares/Plaza Gongora.jpg',
    'Casa de la Municipalidad': '/lugares/Casa de la Municipidad.jpg',
    'Edificio Hatillo': '/lugares/Edificio Hatillo.jpeg',
    'Almacén Central': '/lugares/Almacen Central MINSA.jpg',
    'Centro de Recaudación Magna Corp.': '/lugares/Centro de Recaudacion Magna Corp..jpg',
    'Oficinas del Parque Summit': '/lugares/Oficina del Parque Summit.jpg',
    'Planta de tratamiento (Mercado San Felipe Neri)': '/lugares/san felipe neri.jpeg',
    'Taller': '/lugares/Taller.jpg',
  };

  const imageUrl = imageMap[location.nombre] || null;

  return (
    <div className="location-popup-overlay" onClick={onClose}>
      <div className="location-popup" onClick={(e) => e.stopPropagation()}>
        <button className="location-popup-close" onClick={onClose}>
          <X size={18} strokeWidth={2} />
        </button>

        {/* Imagen del lugar */}
        <div className="location-popup-image">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={location.nombre}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--color-surface-secondary, #f3f2f1)' }}>
              <MapPin size={48} strokeWidth={1.5} style={{ color: 'var(--color-text-secondary, #605e5c)' }} />
            </div>
          )}
          <div className="location-popup-badge">
            <MapPin size={14} strokeWidth={2} />
            Punto de Limpieza
          </div>
        </div>

        {/* Contenido */}
        <div className="location-popup-content">
          <h3 className="location-popup-title">{location.nombre}</h3>

          {location.descripcion && (
            <div className="location-popup-info">
              <div className="location-popup-info-item">
                <MapPin size={14} />
                <span>{location.descripcion}</span>
              </div>
            </div>
          )}

          {location.latitud && location.longitud && (
            <div className="location-popup-info">
              <div className="location-popup-info-item">
                <Calendar size={14} />
                <span>{location.latitud.toFixed(4)}, {location.longitud.toFixed(4)}</span>
              </div>
            </div>
          )}

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
