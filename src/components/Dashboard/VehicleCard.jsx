import { Truck, MapPin, Wrench, BarChart3, Users, Navigation } from '../Icons';
import './VehicleCard.css';

export const VehicleCard = ({
  vehicle,
  onLocationClick,
  onMaintenanceClick,
  onHistoryClick
}) => {
  const getStatusColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'en ruta': return 'success';
      case 'disponible': return 'info';
      default: return 'info'; // Cualquier otro estado se trata como Disponible
    }
  };

  const getStatusIcon = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'en ruta': return '🟢';
      case 'disponible': return '⚪';
      default: return '⚪'; // Cualquier otro estado se trata como Disponible
    }
  };

  return (
    <div className="vehicle-card-new">
      <div className="vehicle-card-new__header">
        <div className="vehicle-card-new__icon">
          <Truck size={24} />
        </div>
        <div className="vehicle-card-new__title">
          <h4>{vehicle.nombre || vehicle.placa}</h4>
          <span className={`vehicle-status-new vehicle-status-new--${getStatusColor(vehicle.estado)}`}>
            {getStatusIcon(vehicle.estado)} {vehicle.estado}
          </span>
        </div>
      </div>

      <div className="vehicle-card-new__content">
        <div className="vehicle-info-row">
          <div className="vehicle-info-item">
            <Users size={16} />
            <span>Conductor: {vehicle.conductor || 'Sin asignar'}</span>
          </div>
        </div>

        <div className="vehicle-info-row">
          <div className="vehicle-info-item">
            <Navigation size={16} />
            <span>Ruta: {vehicle.rutaAsignada || 'Sin asignar'}</span>
          </div>
        </div>

        <div className="vehicle-info-row">
          <div className="vehicle-info-item">
            <MapPin size={16} />
            <span>{vehicle.lat?.toFixed(4)}, {vehicle.lng?.toFixed(4)}</span>
          </div>
        </div>

        <div className="vehicle-maintenance">
          <div className="maintenance-item">
            <Wrench size={14} />
            <span>Últ. Mant: {vehicle.ultimoMantenimiento || 'N/A'}</span>
          </div>
          <div className="maintenance-item">
            <span>Próx: {vehicle.proximoMantenimiento || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="vehicle-card-new__actions">
        <button
          className="vehicle-action-btn"
          onClick={() => onLocationClick?.(vehicle)}
          title="Ver ubicación"
        >
          <MapPin size={16} />
        </button>
        <button
          className="vehicle-action-btn"
          onClick={() => onMaintenanceClick?.(vehicle)}
          title="Mantenimiento"
        >
          <Wrench size={16} />
        </button>
        <button
          className="vehicle-action-btn"
          onClick={() => onHistoryClick?.(vehicle)}
          title="Historial"
        >
          <BarChart3 size={16} />
        </button>
      </div>
    </div>
  );
};

export default VehicleCard;
