import React from 'react';
import { MapPin, TrendingUp, Clock, Zap, StopCircle, Navigation, Play, CheckCircle } from '../Icons';
import './RouteStatsPanel.css';

/**
 * Panel de estadísticas del recorrido GPS
 *
 * Muestra métricas calculadas de la ruta: distancia, duración, velocidades, paradas
 */
export const RouteStatsPanel = ({ stats, currentPoint }) => {
  if (!stats) {
    return (
      <div className="route-stats-panel empty">
        <p>No hay datos de ruta disponibles</p>
      </div>
    );
  }

  // Formatear duración en horas y minutos
  const formatDuration = (milliseconds) => {
    const totalMinutes = Math.floor(milliseconds / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  // Formatear hora
  const formatTime = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleTimeString('es-PA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Formatear distancia
  const formatDistance = (km) => {
    if (km === null || km === undefined) return 'N/A';
    if (km < 1) {
      return `${(km * 1000).toFixed(0)} m`;
    }
    return `${km.toFixed(1)} km`;
  };

  // Formatear velocidad
  const formatSpeed = (kmh) => {
    if (kmh === null || kmh === undefined || isNaN(kmh)) return '0 km/h';
    return `${Math.round(kmh)} km/h`;
  };

  return (
    <div className="route-stats-panel">
      <div className="stats-header">
        <h4>Estadísticas del Recorrido</h4>
      </div>

      <div className="stats-grid">
        {/* Distancia Total */}
        <div className="stat-card">
          <div className="stat-icon">
            <MapPin size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Distancia Total</span>
            <span className="stat-value">{formatDistance(stats.totalDistance)}</span>
          </div>
        </div>

        {/* Duración */}
        <div className="stat-card">
          <div className="stat-icon">
            <Clock size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Duración</span>
            <span className="stat-value">{formatDuration(stats.duration)}</span>
          </div>
        </div>

        {/* Velocidad Promedio */}
        <div className="stat-card">
          <div className="stat-icon">
            <TrendingUp size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Velocidad Promedio</span>
            <span className="stat-value">{formatSpeed(stats.avgSpeed)}</span>
          </div>
        </div>

        {/* Velocidad Máxima */}
        <div className="stat-card">
          <div className="stat-icon">
            <Zap size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Velocidad Máxima</span>
            <span className="stat-value highlight">{formatSpeed(stats.maxSpeed)}</span>
          </div>
        </div>

        {/* Paradas Realizadas */}
        <div className="stat-card">
          <div className="stat-icon">
            <StopCircle size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Paradas Realizadas</span>
            <span className="stat-value">{stats.stops || 0}</span>
          </div>
        </div>

        {/* Puntos GPS */}
        <div className="stat-card">
          <div className="stat-icon">
            <Navigation size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Puntos GPS</span>
            <span className="stat-value">{stats.totalPoints}</span>
          </div>
        </div>
      </div>

      {/* Información del tramo actual */}
      {currentPoint && (
        <div className="current-point-info">
          <h5>Punto Actual</h5>
          <div className="current-stats">
            <div className="current-stat">
              <span className="current-label">Hora:</span>
              <span className="current-value">
                {formatTime(currentPoint.timestamp || currentPoint.last_updated)}
              </span>
            </div>
            <div className="current-stat">
              <span className="current-label">Velocidad:</span>
              <span className="current-value">
                {formatSpeed(currentPoint.speed)}
              </span>
            </div>
            {currentPoint.coords && (
              <div className="current-stat">
                <span className="current-label">Posición:</span>
                <span className="current-value coords">
                  {currentPoint.coords.lat?.toFixed(5)}°N, {currentPoint.coords.lon?.toFixed(5)}°W
                </span>
              </div>
            )}
            {currentPoint.course !== undefined && (
              <div className="current-stat">
                <span className="current-label">Rumbo:</span>
                <span className="current-value">
                  {currentPoint.course}° ({getCardinalDirection(currentPoint.course)})
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Horarios */}
      <div className="time-range">
        <div className="time-info">
          <span className="time-label">
            <Play size={12} aria-hidden="true" /> Inicio:
          </span>
          <span className="time-value">{formatTime(stats.startTime)}</span>
        </div>
        <div className="time-info">
          <span className="time-label">
            <CheckCircle size={12} aria-hidden="true" /> Fin:
          </span>
          <span className="time-value">{formatTime(stats.endTime)}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Obtener dirección cardinal según grados
 */
function getCardinalDirection(degrees) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

export default RouteStatsPanel;
