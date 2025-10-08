import { useState, useEffect } from 'react';
import { Truck, MapPin, Clock, CheckCircle, Radio } from '../Icons';
import './RealtimeActivity.css';

const RealtimeActivity = ({ vehicles = [], routes = [], personnel = [] }) => {
  const activeVehicles = vehicles.filter(v => v.estado === 'En ruta' || v.estado === 'en_ruta');

  const getVehicleActivity = (vehicle) => {
    const route = routes.find(r => r.id === vehicle.rutaAsignada || r.id === vehicle.ruta_id);
    const driver = personnel.find(p => p.id === vehicle.conductorAsignado || p.id === vehicle.conductor_id);
    
    const stops = route?.paradas || route?.stops || [];
    const completedStops = stops.filter(stop => stop.completada || stop.completed);
    const totalStops = stops.length;
    const progress = totalStops > 0 ? (completedStops.length / totalStops) * 100 : 0;

    const nextStop = stops.find(stop => !stop.completada && !stop.completed);
    
    const recentStops = completedStops.slice(-3).reverse();

    return {
      vehicleId: vehicle.id,
      vehicleName: vehicle.placa || vehicle.nombre || `Camión ${vehicle.id}`,
      driverName: driver?.nombre || 'Sin asignar',
      routeName: route?.nombre || route?.name || 'Ruta sin nombre',
      progress,
      completedCount: completedStops.length,
      totalStops,
      recentStops,
      nextStop,
      vehicle
    };
  };

  const activities = activeVehicles.map(getVehicleActivity).filter(a => a.totalStops > 0);

  if (activities.length === 0) {
    return (
      <div className="realtime-activity">
        <div className="activity-header">
          <h3><Radio strokeWidth={1.5} size={22} /> Actividad en Tiempo Real</h3>
          <span className="live-indicator">
            <span className="live-dot"></span>
            EN VIVO
          </span>
        </div>
        <div className="no-activity">
          <Truck strokeWidth={1.5} size={48} />
          <p>No hay vehículos en ruta actualmente</p>
          <span>La actividad aparecerá cuando los vehículos inicien sus rutas</span>
        </div>
      </div>
    );
  }

  return (
    <div className="realtime-activity">
      <div className="activity-header">
        <h3><Radio strokeWidth={1.5} size={22} /> Actividad en Tiempo Real</h3>
        <span className="live-indicator">
          <span className="live-dot"></span>
          EN VIVO
        </span>
      </div>
      
      <div className="activity-list">
        {activities.map((activity, index) => (
          <ActivityCard key={activity.vehicleId} activity={activity} delay={index * 100} />
        ))}
      </div>
    </div>
  );
};

const ActivityCard = ({ activity, delay }) => {
  const [expanded, setExpanded] = useState(true);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(activity.progress);
    }, delay + 200);
    return () => clearTimeout(timer);
  }, [activity.progress, delay]);

  return (
    <div 
      className="activity-card"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="activity-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="vehicle-info">
          <div className="vehicle-icon">
            <Truck size={20} />
          </div>
          <div className="vehicle-details">
            <h4>{activity.vehicleName}</h4>
            <p>Conductor: {activity.driverName}</p>
          </div>
        </div>
        <button className="expand-btn" aria-label={expanded ? 'Colapsar' : 'Expandir'}>
          <span className={`arrow ${expanded ? 'up' : 'down'}`}>▼</span>
        </button>
      </div>

      {expanded && (
        <div className="activity-card-content">
          <div className="route-info">
            <div className="route-header">
              <MapPin size={16} />
              <span className="route-name">{activity.routeName}</span>
            </div>
            <div className="progress-section">
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill"
                  style={{ width: `${animatedProgress}%` }}
                >
                  <span className="progress-shine"></span>
                </div>
              </div>
              <span className="progress-label">
                {activity.completedCount}/{activity.totalStops} paradas
              </span>
            </div>
          </div>

          {activity.recentStops.length > 0 && (
            <div className="recent-stops">
              <h5><CheckCircle size={16} /> Últimas paradas completadas:</h5>
              <div className="stops-list">
                {activity.recentStops.map((stop, idx) => (
                  <div key={idx} className="stop-item">
                    <div className="stop-check">✓</div>
                    <div className="stop-details">
                      <span className="stop-time">
                        <Clock size={14} />
                        {stop.horaCompletada || stop.completedAt || 'Reciente'}
                      </span>
                      <span className="stop-address">
                        {stop.direccion || stop.address || stop.nombre || `Parada ${idx + 1}`}
                      </span>
                      {(stop.pesoRecolectado || stop.weight) && (
                        <span className="stop-weight">
                          {stop.pesoRecolectado || stop.weight} kg
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activity.nextStop && (
            <div className="next-stop">
              <div className="next-stop-icon">
                <Navigation size={16} />
              </div>
              <div className="next-stop-info">
                <span className="next-label">Próxima parada:</span>
                <span className="next-address">
                  {activity.nextStop.direccion || activity.nextStop.address || activity.nextStop.nombre || 'Siguiente ubicación'}
                </span>
                {activity.nextStop.eta && (
                  <span className="next-eta">ETA: {activity.nextStop.eta}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RealtimeActivity;
