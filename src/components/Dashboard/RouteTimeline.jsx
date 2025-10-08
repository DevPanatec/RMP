import { Map, Edit, XCircle, BarChart3, Truck, Clock, Users } from '../Icons';
import './RouteTimeline.css';

export const RouteTimeline = ({
  route,
  onViewMap,
  onEdit,
  onPause,
  onViewStats
}) => {
  const getStatusColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'activa':
      case 'en progreso': return 'success';
      case 'pausada': return 'warning';
      case 'completada': return 'info';
      case 'cancelada': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'activa':
      case 'en progreso': return '🟢';
      case 'pausada': return '🟡';
      case 'completada': return '✅';
      case 'cancelada': return '❌';
      default: return '⚪';
    }
  };

  const getStopStatus = (stop, currentStopIndex) => {
    if (stop.completada) return 'completed';
    if (stop.index === currentStopIndex) return 'current';
    return 'pending';
  };

  const getStopIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'current': return '🔵';
      case 'pending': return '⚪';
      default: return '⚪';
    }
  };

  const progressPercentage = route.paradas ?
    (route.paradas.filter(p => p.completada).length / route.paradas.length) * 100 : 0;

  return (
    <div className="route-timeline-card">
      <div className="route-timeline-header">
        <div className="route-timeline-title">
          <h4>{route.nombre || `Ruta ${route.id}`}</h4>
          <span className={`route-status-badge route-status-badge--${getStatusColor(route.estado)}`}>
            {getStatusIcon(route.estado)} {route.estado}
          </span>
        </div>
        <div className="route-timeline-meta">
          <div className="route-meta-item">
            <Truck size={16} />
            <span>{route.tipoServicio === 'recoleccion' ? 'Recolección' : 'Fumigación'}</span>
          </div>
          <div className="route-meta-item">
            <span>{route.paradas?.length || 0} paradas</span>
          </div>
          <div className="route-meta-item">
            <span>{route.distancia || '0'} km</span>
          </div>
        </div>
      </div>

      <div className="route-timeline-driver">
        <div className="route-driver-item">
          <Clock size={16} />
          <span>~{route.duracionEstimada || '0'} hrs</span>
        </div>
        <div className="route-driver-item">
          <Users size={16} />
          <span>{route.conductor || 'Sin asignar'}</span>
        </div>
      </div>

      <div className="route-timeline-stops">
        <h5>Paradas:</h5>
        <div className="stops-timeline">
          {route.paradas?.slice(0, 6).map((stop, index) => {
            const status = getStopStatus(stop, route.paradaActual);
            return (
              <div key={index} className={`stop-item stop-item--${status}`}>
                <div className="stop-connector">
                  <div className="stop-line"></div>
                  <div className="stop-dot">{getStopIcon(status)}</div>
                </div>
                <div className="stop-content">
                  <div className="stop-name">{stop.nombre || `Parada ${index + 1}`}</div>
                  <div className="stop-time">{stop.horaEstimada || '00:00'}</div>
                  {status === 'current' && (
                    <div className="stop-current-indicator">← Actual</div>
                  )}
                </div>
              </div>
            );
          })}
          {route.paradas && route.paradas.length > 6 && (
            <div className="stops-more">
              +{route.paradas.length - 6} más
            </div>
          )}
        </div>
      </div>

      <div className="route-timeline-progress">
        <div className="progress-label">
          <span>Progreso</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      <div className="route-timeline-actions">
        <button
          className="route-action-btn"
          onClick={() => onViewMap?.(route)}
          title="Ver mapa"
        >
          <Map size={16} />
          <span>Mapa</span>
        </button>
        <button
          className="route-action-btn"
          onClick={() => onEdit?.(route)}
          title="Editar"
        >
          <Edit size={16} />
          <span>Editar</span>
        </button>
        <button
          className="route-action-btn"
          onClick={() => onPause?.(route)}
          title="Pausar"
        >
          <XCircle size={16} />
          <span>Pausar</span>
        </button>
        <button
          className="route-action-btn"
          onClick={() => onViewStats?.(route)}
          title="Estadísticas"
        >
          <BarChart3 size={16} />
          <span>Stats</span>
        </button>
      </div>
    </div>
  );
};

export default RouteTimeline;
