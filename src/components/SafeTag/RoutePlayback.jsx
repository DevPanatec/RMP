import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Download,
  Calendar,
  Gauge,
  Clock,
  Navigation,
  MapPin,
} from '../Icons';
import { useRoutePlayback } from '../../hooks/useRoutePlayback';
import RouteStatsPanel from './RouteStatsPanel';
import 'leaflet/dist/leaflet.css';
import './RoutePlayback.css';

/**
 * Componente de reproducción animada del historial de rutas GPS
 *
 * Muestra un mapa con la ruta completa y permite reproducir el recorrido
 * con controles tipo reproductor de video
 */
export const RoutePlayback = ({ deviceId, deviceName, placa, vehiculoId, onClose }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const mapRef = useRef(null);

  // Buscar vehículo por SafeTag deviceId si no se proveyó vehiculoId
  const vehiclesByDeviceId = useQuery(api.vehiculos.list);
  const foundVehicle = vehiclesByDeviceId?.find(
    (v) => v.safetag_device_id === deviceId || v.gps_imei === deviceId
  );
  const resolvedVehiculoId = vehiculoId || foundVehicle?._id;

  // Hook de reproducción con vehiculoId
  const {
    isPlaying,
    currentIndex,
    playbackSpeed,
    loading,
    error,
    play,
    pause,
    restart,
    seekTo,
    changeSpeed,
    loadHistory,
    stats,
    currentPoint,
    progress,
    totalPoints,
    hasData,
    routeData,
  } = useRoutePlayback(deviceId, selectedDate, resolvedVehiculoId);

  /**
   * Ajustar vista del mapa para que se vea toda la ruta
   */
  useEffect(() => {
    if (mapRef.current && routeData?.locations && routeData.locations.length > 0) {
      const map = mapRef.current;
      const bounds = L.latLngBounds(
        routeData.locations.map((loc) => [
          loc.coords?.lat || loc.status?.coords?.lat,
          loc.coords?.lon || loc.status?.coords?.lon,
        ])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routeData]);

  /**
   * Formatear fecha y hora con manejo de errores
   */
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '--';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '--';
      return date.toLocaleTimeString('es-PA', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (error) {
      return '--';
    }
  };

  /**
   * Formatear velocidad
   */
  const formatSpeed = (speed) => {
    if (speed === null || speed === undefined || isNaN(speed)) return '0';
    return Math.round(speed);
  };

  /**
   * Formatear rumbo
   */
  const formatHeading = (heading) => {
    if (heading === null || heading === undefined || isNaN(heading)) return '--';
    return Math.round(heading);
  };

  /**
   * Obtener dirección cardinal
   */
  const getCardinalDirection = (degrees) => {
    if (degrees === null || degrees === undefined || isNaN(degrees)) return '--';
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  /**
   * Formatear coordenadas
   */
  const formatCoords = (lat, lon) => {
    if (!lat || !lon || isNaN(lat) || isNaN(lon)) return '--';
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  };

  /**
   * Manejar cambio de fecha
   */
  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setShowDatePicker(false);
  };

  /**
   * Manejar cambio de velocidad
   */
  const handleSpeedChange = () => {
    const speeds = [1, 2, 4, 8];
    const currentSpeedIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentSpeedIndex + 1) % speeds.length];
    changeSpeed(nextSpeed);
  };

  /**
   * Manejar cambio en el slider de timeline
   */
  const handleTimelineChange = (e) => {
    const newIndex = parseInt(e.target.value, 10);
    seekTo(newIndex);
  };

  /**
   * Toggle play/pause
   */
  const togglePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  /**
   * Avanzar 10 puntos
   */
  const skipForward = () => {
    seekTo(Math.min(currentIndex + 10, totalPoints - 1));
  };

  /**
   * Retroceder 10 puntos
   */
  const skipBackward = () => {
    seekTo(Math.max(currentIndex - 10, 0));
  };

  /**
   * Crear icono del vehículo con rotación
   */
  const createVehicleIcon = (course = 0) => {
    return L.divIcon({
      className: 'animated-vehicle-marker',
      html: `
        <div class="vehicle-marker-container" style="transform: rotate(${course}deg)">
          <div class="vehicle-marker-pulse"></div>
          <svg viewBox="0 0 32 32" class="vehicle-marker-icon">
            <circle cx="16" cy="16" r="14" fill="#3D5229" opacity="0.9"/>
            <circle cx="16" cy="16" r="10" fill="#fff"/>
            <path d="M16 8 L20 16 L16 24 L12 16 Z" fill="#3D5229"/>
          </svg>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  /**
   * Obtener color de la polyline según velocidad
   */
  const getSpeedColor = (speed) => {
    if (speed === 0) return '#9ca3af'; // Gris (detenido)
    if (speed < 20) return '#10b981'; // Verde (lento)
    if (speed < 40) return '#3b82f6'; // Azul (moderado)
    if (speed < 60) return '#f59e0b'; // Naranja (rápido)
    return '#ef4444'; // Rojo (muy rápido)
  };

  // Preparar coordenadas para polyline
  const routeCoordinates =
    routeData?.locations?.map((loc) => [
      loc.coords?.lat || loc.status?.coords?.lat,
      loc.coords?.lon || loc.status?.coords?.lon,
    ]) || [];

  // Polyline hasta el punto actual (ruta recorrida)
  const traveledRoute = routeCoordinates.slice(0, currentIndex + 1);

  // Centro del mapa (Panama City por defecto)
  const mapCenter =
    currentPoint && currentPoint.coords
      ? [currentPoint.coords.lat, currentPoint.coords.lon]
      : [8.983333, -79.51667];

  return (
    <div className="route-playback-container">
      {/* Header */}
      <div className="playback-header">
        <div className="header-info">
          <h3>Reproducción de Ruta - {placa}</h3>
          <p className="device-name">{deviceName || deviceId}</p>
        </div>

        <div className="header-actions">
          {/* Selector de fecha */}
          <div className="date-selector">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="date-button"
            >
              <Calendar size={16} strokeWidth={2} />
              {selectedDate ? new Date(selectedDate).toLocaleDateString() : 'Hoy'}
            </button>
            {showDatePicker && (
              <div className="date-picker-dropdown">
                <input
                  type="date"
                  value={selectedDate || ''}
                  onChange={handleDateChange}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            )}
          </div>

          {/* Botón de exportar */}
          <button className="export-button" disabled title="Exportar (Próximamente)">
            <Download size={16} strokeWidth={2} />
            Exportar
          </button>

          {/* Botón cerrar */}
          <button onClick={onClose} className="close-button">
            <X size={20} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="playback-content">
        {loading && (
          <div className="playback-loading">
            <div className="loading-spinner"></div>
            <p>Cargando historial GPS...</p>
          </div>
        )}

        {error && (
          <div className="playback-error">
            <p>Error: {error}</p>
            <button onClick={loadHistory} className="retry-button">
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && !hasData && (
          <div className="playback-empty">
            <p>No hay datos GPS para la fecha seleccionada</p>
            <button onClick={loadHistory} className="retry-button">
              Recargar
            </button>
          </div>
        )}

        {!loading && !error && hasData && (
          <>
            {/* Mapa */}
            <div className="playback-map-container">
              <MapContainer
                center={mapCenter}
                zoom={13}
                ref={mapRef}
                className="playback-map"
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Ruta completa (gris claro) */}
                <Polyline
                  positions={routeCoordinates}
                  color="#d1d5db"
                  weight={4}
                  opacity={0.4}
                />

                {/* Ruta recorrida (con color según velocidad) */}
                <Polyline
                  positions={traveledRoute}
                  color={getSpeedColor(currentPoint?.speed || 0)}
                  weight={5}
                  opacity={0.8}
                />

                {/* Marcador del vehículo actual */}
                {currentPoint && currentPoint.coords && (
                  <>
                    <Marker
                      position={[currentPoint.coords.lat, currentPoint.coords.lon]}
                      icon={createVehicleIcon(currentPoint.course || 0)}
                    >
                      <Popup>
                        <strong>{placa}</strong>
                        <br />
                        Velocidad: {currentPoint.speed || 0} km/h
                        <br />
                        {new Date(
                          currentPoint.timestamp || currentPoint.last_updated
                        ).toLocaleString()}
                      </Popup>
                    </Marker>

                    {/* Círculo de precisión */}
                    <Circle
                      center={[currentPoint.coords.lat, currentPoint.coords.lon]}
                      radius={20}
                      fillColor="#3D5229"
                      fillOpacity={0.1}
                      stroke={false}
                    />
                  </>
                )}

                {/* Punto de inicio */}
                {routeCoordinates.length > 0 && (
                  <Circle
                    center={routeCoordinates[0]}
                    radius={15}
                    fillColor="#10b981"
                    color="#10b981"
                    weight={2}
                    fillOpacity={0.5}
                  />
                )}

                {/* Punto de fin */}
                {routeCoordinates.length > 0 && (
                  <Circle
                    center={routeCoordinates[routeCoordinates.length - 1]}
                    radius={15}
                    fillColor="#ef4444"
                    color="#ef4444"
                    weight={2}
                    fillOpacity={0.5}
                  />
                )}
              </MapContainer>
            </div>

            {/* Controles de reproducción */}
            <div className="playback-controls">
              {/* Información del punto actual */}
              {currentPoint && (
                <div className="current-point-bar">
                  <div className="point-stat">
                    <Clock size={16} strokeWidth={2} />
                    <span className="stat-label">Hora</span>
                    <span className="stat-value">
                      {formatTimestamp(currentPoint.timestamp || currentPoint.last_updated)}
                    </span>
                  </div>
                  <div className="point-stat">
                    <Gauge size={16} strokeWidth={2} />
                    <span className="stat-label">Velocidad</span>
                    <span className="stat-value">{formatSpeed(currentPoint.speed)} km/h</span>
                  </div>
                  <div className="point-stat">
                    <Navigation size={16} strokeWidth={2} />
                    <span className="stat-label">Rumbo</span>
                    <span className="stat-value">
                      {formatHeading(currentPoint.course)}° {getCardinalDirection(currentPoint.course)}
                    </span>
                  </div>
                  {currentPoint.coords && (
                    <div className="point-stat">
                      <MapPin size={16} strokeWidth={2} />
                      <span className="stat-label">Posición</span>
                      <span className="stat-value coords">
                        {formatCoords(currentPoint.coords.lat, currentPoint.coords.lon)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Timeline */}
              <div className="timeline-container">
                <div className="timeline-info">
                  <span className="timeline-label">
                    Punto {currentIndex + 1} de {totalPoints}
                  </span>
                  <span className="timeline-progress">{progress.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={totalPoints - 1}
                  value={currentIndex}
                  onChange={handleTimelineChange}
                  className="timeline-slider"
                  style={{
                    background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${progress}%, var(--color-border) ${progress}%, var(--color-border) 100%)`,
                  }}
                />
              </div>

              {/* Botones de control */}
              <div className="control-buttons-wrapper">
                {/* Controles de reproducción */}
                <div className="playback-controls-group">
                  <button onClick={restart} className="control-btn" title="Reiniciar">
                    <SkipBack size={20} />
                  </button>

                  <button onClick={skipBackward} className="control-btn" title="Retroceder">
                    <SkipBack size={16} />
                  </button>

                  <button
                    onClick={togglePlayPause}
                    className="control-btn play-btn"
                    title={isPlaying ? 'Pausar' : 'Reproducir'}
                  >
                    {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                  </button>

                  <button onClick={skipForward} className="control-btn" title="Avanzar">
                    <SkipForward size={16} />
                  </button>

                  <button
                    onClick={handleSpeedChange}
                    className="control-btn speed-btn"
                    title="Cambiar velocidad"
                  >
                    <Gauge size={18} />
                    {playbackSpeed}x
                  </button>
                </div>

                {/* Botones de acción */}
                <div className="action-buttons-group">
                  <div className="date-selector-inline">
                    <button
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="action-btn"
                      title="Seleccionar fecha"
                    >
                      <Calendar size={18} strokeWidth={2} />
                    </button>
                    {showDatePicker && (
                      <div className="date-picker-dropdown-inline">
                        <input
                          type="date"
                          value={selectedDate || ''}
                          onChange={handleDateChange}
                          max={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    )}
                  </div>

                  <button className="action-btn" disabled title="Exportar (Próximamente)">
                    <Download size={18} strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>

            {/* Panel de estadísticas */}
            <div className="playback-stats">
              <RouteStatsPanel stats={stats} currentPoint={currentPoint} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RoutePlayback;
