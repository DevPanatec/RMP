import { useState, useEffect } from 'react';
import { Truck, MapPin, Clock, CheckCircle, Radio, Navigation, Wrench } from '../Icons';
import './RealtimeActivity.css';

const RealtimeActivity = ({ vehicles = [], routes = [], personnel = [], recentActivity = [] }) => {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    // Si hay datos de actividad reciente (modo demo), usarlos
    if (recentActivity && recentActivity.length > 0) {
      setActivities(recentActivity);
      return;
    }

    // Si no, generar actividades desde datos reales
    const generatedActivities = generateActivitiesFromRealData(vehicles, routes, personnel);
    setActivities(generatedActivities);
  }, [recentActivity, vehicles, routes, personnel]);

  const sortedActivities = [...activities]
    .filter(activity => activity.tipo !== 'alerta_creada') // Excluir alertas (se muestran en Riesgos)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 15); // Mostrar últimas 15 actividades

  if (sortedActivities.length === 0) {
    return (
      <div className="realtime-activity">
        <div className="activity-header">
          <h3><Radio strokeWidth={1.5} size={22} /> Registro de Actividades</h3>
          <span className="live-indicator">
            <span className="live-dot"></span>
            TIEMPO REAL
          </span>
        </div>
        <div className="no-activity">
          <Truck strokeWidth={1.5} size={48} />
          <p>Sin actividad registrada</p>
          <span>Las operaciones aparecerán cuando los vehículos inicien sus rutas</span>
        </div>
      </div>
    );
  }

  return (
    <div className="realtime-activity">
      <div className="activity-header">
        <h3><Radio strokeWidth={1.5} size={22} /> Registro de Actividades</h3>
        <span className="live-indicator">
          <span className="live-dot"></span>
          TIEMPO REAL
        </span>
      </div>

      <div className="activity-feed">
        {sortedActivities.map((activity, index) => (
          <ActivityItem
            key={activity.id || index}
            activity={activity}
            delay={index * 50}
          />
        ))}
      </div>
    </div>
  );
};

// Función para generar actividades desde datos reales
const generateActivitiesFromRealData = (vehicles, routes, personnel) => {
  const activities = [];
  let activityId = 1;

  // Generar actividades de vehículos en ruta
  vehicles.forEach(vehicle => {
    if (vehicle.estado === 'En ruta' || vehicle.estado === 'en_ruta') {
      const route = routes.find(r => r.id === vehicle.rutaAsignada || r.id === vehicle.ruta_id);
      const driver = personnel.find(p => p.id === vehicle.conductorAsignado || p.id === vehicle.conductor_id);

      if (route) {
        const stops = route.paradas || route.stops || [];
        const completedStops = stops.filter(stop => stop.completada || stop.completed);

        // Actividad de paradas completadas
        completedStops.slice(-3).forEach((stop, idx) => {
          const timeOffset = (idx + 1) * 15 * 60 * 1000; // 15, 30, 45 min atrás
          activities.push({
            id: activityId++,
            tipo: 'parada_completada',
            descripcion: `Parada "${stop.nombre || stop.direccion || 'Sin nombre'}" completada`,
            vehiculo: vehicle.placa || vehicle.nombre,
            conductor: driver?.nombre || 'Sin asignar',
            timestamp: new Date(Date.now() - timeOffset).toISOString(),
            ruta: route.nombre || route.name
          });
        });

        // Si hay paradas completadas, significa que inició la ruta
        if (completedStops.length > 0) {
          activities.push({
            id: activityId++,
            tipo: 'ruta_iniciada',
            descripcion: `Ruta "${route.nombre || route.name}" iniciada`,
            vehiculo: vehicle.placa || vehicle.nombre,
            conductor: driver?.nombre || 'Sin asignar',
            timestamp: new Date(Date.now() - (completedStops.length * 20 * 60 * 1000)).toISOString(),
            ruta: route.nombre || route.name
          });
        }
      }
    }
  });

  return activities;
};

const ActivityItem = ({ activity, delay }) => {
  const getActivityConfig = (tipo) => {
    switch (tipo) {
      case 'parada_completada':
        return {
          icon: <CheckCircle size={16} />,
          color: '#10b981',
          bgColor: 'rgba(16, 185, 129, 0.08)',
          label: 'Parada Completada',
          badgeColor: '#10b981'
        };
      case 'ruta_iniciada':
        return {
          icon: <Navigation size={16} />,
          color: '#3b82f6',
          bgColor: 'rgba(59, 130, 246, 0.08)',
          label: 'Ruta Iniciada',
          badgeColor: '#3b82f6'
        };
      case 'ruta_completada':
        return {
          icon: <CheckCircle size={16} />,
          color: '#8b5cf6',
          bgColor: 'rgba(139, 92, 246, 0.08)',
          label: 'Ruta Completada',
          badgeColor: '#8b5cf6'
        };
      default:
        return {
          icon: <Truck size={16} />,
          color: '#6b7280',
          bgColor: 'rgba(107, 114, 128, 0.08)',
          label: 'Actividad',
          badgeColor: '#6b7280'
        };
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now - activityTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Hace menos de 1 min';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return activityTime.toLocaleDateString('es-PA', { month: 'short', day: 'numeric' });
  };

  const formatTimeExact = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('es-PA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).toUpperCase();
  };

  const config = getActivityConfig(activity.tipo);

  return (
    <div className="activity-item">
      <div className="activity-timeline">
        <div className="activity-icon">
          {config.icon}
        </div>
        <div className="activity-line"></div>
      </div>

      <div className="activity-content">
        <div className="activity-main">
          <div className="activity-header-row">
            <span className="activity-badge">
              {config.label}
            </span>
            <span className="time-exact">{formatTimeExact(activity.timestamp)}</span>
          </div>
          <p className="activity-description">{activity.descripcion}</p>
          <div className="activity-meta">
            <span className="activity-vehicle">
              <Truck size={13} />
              {activity.vehiculo}
            </span>
            {activity.conductor && (
              <>
                <span className="activity-separator">•</span>
                <span className="activity-driver">{activity.conductor}</span>
              </>
            )}
            {activity.ruta && (
              <>
                <span className="activity-separator">•</span>
                <span className="activity-route">
                  <MapPin size={13} />
                  {activity.ruta}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="activity-time">
          <span className="time-relative">{formatTime(activity.timestamp)}</span>
        </div>
      </div>
    </div>
  );
};

export default RealtimeActivity;
