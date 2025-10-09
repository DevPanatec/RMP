import { Wrench, Map as MapIcon, AlertTriangle } from '../Icons';
import './AlertCard.css';

export const AlertCard = ({ alert }) => {
  const getIcon = () => {
    switch (alert.tipo) {
      case 'mantenimiento':
        return <Wrench size={20} />;
      case 'ruta':
        return <MapIcon size={20} />;
      default:
        return <AlertTriangle size={20} />;
    }
  };

  return (
    <div className={`alert-card-new alert-card-new--${alert.prioridad}`}>
      <div className="alert-card-new__header">
        <div className="alert-card-new__icon">
          {getIcon()}
        </div>
        <div className="alert-card-new__priority">
          {alert.prioridad}
        </div>
      </div>
      <div className="alert-card-new__body">
        <div className="alert-card-new__vehicle">{alert.camion}</div>
        <div className="alert-card-new__message">{alert.mensaje}</div>
      </div>
    </div>
  );
};

export default AlertCard;
