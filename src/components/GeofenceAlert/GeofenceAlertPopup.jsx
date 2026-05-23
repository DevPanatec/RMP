import React from 'react';
import { MapPin, X, Navigation, Clock, Truck, Gauge } from 'lucide-react';
import './GeofenceAlertPopup.css';

/**
 * Pop-up que aparece cuando un vehículo entra/sale de una zona (geofence)
 */
const GeofenceAlertPopup = ({ alerts, onDismiss, onViewMap }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="geofence-alerts-container" role="region" aria-label="Alertas de geocerca">
      {alerts.map((alert, index) => {
        const isEntering = alert.tipo_evento === 'entrada' || alert.category === 'geofence_enter';

        return (
          <div
            key={alert._id}
            className={`geofence-alert-card ${isEntering ? 'alert-enter' : 'alert-exit'}`}
            role="alert"
            aria-live="polite"
            style={{
              animationDelay: `${index * 0.1}s`,
              zIndex: 10000 - index
            }}
          >
            {/* Barra de color lateral */}
            <div className={`alert-color-bar ${isEntering ? 'bar-enter' : 'bar-exit'}`} />
            
            {/* Contenido */}
            <div className="alert-content">
              {/* Header */}
              <div className="alert-header">
                <div className="alert-icon-wrapper">
                  {isEntering ? (
                    <div className="alert-icon alert-icon--enter">
                      <Navigation size={18} />
                    </div>
                  ) : (
                    <div className="alert-icon alert-icon--exit">
                      <Navigation size={18} style={{ transform: 'rotate(180deg)' }} />
                    </div>
                  )}
                </div>
                
                <div className="alert-title-section">
                  <h4 className="alert-title">
                    {isEntering ? 'Entrada a Zona' : 'Salida de Zona'}
                  </h4>
                  <span className="alert-zone-name">{alert.geofence_nombre || alert.alert_title || 'Zona'}</span>
                </div>

                <button 
                  className="alert-close-btn"
                  onClick={() => onDismiss(alert._id)}
                  aria-label="Cerrar"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Detalles del vehículo */}
              <div className="alert-vehicle-info">
                <div className="vehicle-badge">
                  <Truck size={14} />
                  <span className="vehicle-placa">{alert.vehiculo_placa}</span>
                </div>
                {(alert.vehiculo_marca || alert.vehiculo_modelo) && (
                  <span className="vehicle-details">
                    {alert.vehiculo_marca} {alert.vehiculo_modelo}
                  </span>
                )}
              </div>

              {/* Tiempo y velocidad */}
              <div className="alert-meta">
                <div className="meta-item">
                  <Clock size={12} />
                  <span>{new Date(alert.timestamp).toLocaleTimeString('es-PA', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  })}</span>
                </div>
                {alert.speed !== undefined && alert.speed > 0 && (
                  <div className="meta-item">
                    <Gauge size={12} aria-hidden="true" />
                    <span>{Math.round(alert.speed)} km/h</span>
                  </div>
                )}
              </div>

              {/* Botón Ver en Mapa */}
              <button 
                className="alert-view-map-btn"
                onClick={() => onViewMap(alert)}
              >
                <MapPin size={14} />
                Ver en Mapa
              </button>
            </div>

            {/* Barra de progreso de auto-cierre */}
            <div className="alert-progress-bar">
              <div className="alert-progress-fill" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GeofenceAlertPopup;
