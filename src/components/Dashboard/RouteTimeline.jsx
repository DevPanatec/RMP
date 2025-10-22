import { Map, Edit, XCircle, BarChart3, Truck, Clock, Users, CheckCircle, Radio, Navigation, MapPin, Package } from '../Icons';
import './RouteTimeline.css';

export const RouteTimeline = ({
  route,
  onViewMap,
  onEdit,
  onPause,
  onViewStats,
  onCompleteStop
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
      case 'en progreso': return <Navigation size={14} />;
      case 'pausada': return <Clock size={14} />;
      case 'completada': return <CheckCircle size={14} />;
      case 'cancelada': return <XCircle size={14} />;
      default: return <Radio size={14} />;
    }
  };

  const getStopStatus = (stop, currentStopIndex) => {
    if (stop.completada) return 'completed';
    if (stop.index === currentStopIndex) return 'current';
    return 'pending';
  };

  const getStopIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle size={18} />;
      case 'current': return <Navigation size={18} />;
      case 'pending': return <Radio size={18} />;
      default: return <Radio size={18} />;
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
          {route.paradas?.map((stop, index) => {
            const status = getStopStatus(stop, route.paradaActual);
            const canComplete = onCompleteStop && !stop.completada && status === 'current';

            return (
              <div key={index} className={`stop-item stop-item--${status}`}>
                <div className="stop-connector">
                  <div className="stop-line"></div>
                  <div className="stop-dot">{getStopIcon(status)}</div>
                </div>
                <div className="stop-content">
                  <div className="stop-header">
                    <div className="stop-info">
                      <div className="stop-name">{stop.direccion || stop.nombre || `Parada ${stop.orden || index + 1}`}</div>
                      <div className="stop-time">{stop.horaEstimada || stop.hora || '00:00'}</div>
                    </div>
                    {canComplete && (
                      <button
                        className="btn-complete-stop"
                        onClick={() => onCompleteStop(index)}
                        title="Completar parada"
                      >
                        <CheckCircle size={16} /> Completar
                      </button>
                    )}
                  </div>
                  {status === 'current' && !stop.completada && (
                    <div className="stop-current-indicator">
                      <Navigation size={14} /> Parada Actual
                    </div>
                  )}
                  {stop.completada && stop.category && (
                    <div className="stop-completed-info">
                      <span className={`completed-badge badge-${stop.category}`}>
                        <Package size={14} />
                        {stop.category === 'baja' && 'Carga Baja'}
                        {stop.category === 'intermedia' && 'Carga Intermedia'}
                        {stop.category === 'alta' && 'Carga Alta'}
                        {stop.category === 'muy alta' && 'Carga Muy Alta'}
                      </span>
                      {stop.timestamp && (
                        <span className="completed-time">
                          <Clock size={14} /> {stop.timestamp}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
