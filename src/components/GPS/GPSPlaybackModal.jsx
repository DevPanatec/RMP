import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Map, { Marker, Source, Layer, Popup, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Download,
  Calendar,
  Clock,
  MapPin,
  Truck,
  ChevronUp,
  ChevronDown,
  Sun,
  Moon,
  AlertTriangle,
} from '../Icons';
import { useRoutePlayback } from '../../hooks/useRoutePlayback';
import { exportToGPX } from '../../utils/routeExport';
import './GPSPlaybackModal.css';

// OpenFreeMap — mismo provider que MapLibreComponent (monitoreo) pa' look consistente
const MAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark'
};

/**
 * GPSPlaybackModal - Modal fullscreen para reproducción de historial GPS
 * Diseño profesional tipo YouTube/Spotify con controles modernos
 * Migrado a MapLibre GL JS para zoom fluido
 */
const GPSPlaybackModal = ({
  isOpen,
  onClose,
  vehicleData,
  vehiculoId
}) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [mapTheme, setMapTheme] = useState(() => localStorage.getItem('mapTheme') || 'dark');
  const [controlsExpanded, setControlsExpanded] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const dateDropdownRef = useRef(null);
  const mapRef = useRef(null);
  const [hoverTooltip, setHoverTooltip] = useState(null);
  // Map uncontrolled — initialViewState al primer punto, fitBounds maneja framing real.
  const fittedRouteKey = useRef(null);

  // Hook de reproducción GPS
  const playback = useRoutePlayback(
    vehicleData?.deviceId,
    selectedDate,
    vehiculoId
  );

  // Cerrar con Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Cerrar el date picker cuando se hace click afuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDatePicker &&
          dateDropdownRef.current &&
          !dateDropdownRef.current.contains(event.target) &&
          !event.target.closest('.date-btn')) {
        console.log('Cerrando date picker por click afuera');
        setShowDatePicker(false);
      }
    };

    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDatePicker]);

  // Reset fitted key cuando cierra modal (pa' re-fit al reabrir).
  useEffect(() => {
    if (!isOpen) {
      fittedRouteKey.current = null;
    }
  }, [isOpen]);

  // === HOOKS ANTES DE EARLY RETURN ===
  // Coordenadas raw del GPS (siempre disponibles si hay data)
  const rawCoordinates = useMemo(() => {
    return (playback.routeData?.locations?.map(loc => [
      loc.coords?.lon || loc.status?.coords?.lon,
      loc.coords?.lat || loc.status?.coords?.lat,
    ]).filter(pos => pos[0] && pos[1] && !isNaN(pos[0]) && !isNaN(pos[1])) || []);
  }, [playback.routeData]);

  // Línea VISUAL del trayecto = raw GPS directo. No Map Matching:
  //   - Token Mapbox era público (riesgo seguridad + cost)
  //   - Submuestreo a 100 pts perdía 96% data en rutas largas
  //   - Con pings sparse, snapping retornaba línea recta mintiendo "Ruta optimizada"
  //   - Para forense gubernamental, raw > inferido
  const routeCoordinates = rawCoordinates;

  const isAtEnd = playback.endTime != null && playback.currentTime != null && playback.currentTime >= playback.endTime;

  const currentVehiclePosition = useMemo(() => {
    if (isAtEnd && routeCoordinates.length > 0) {
      return routeCoordinates[routeCoordinates.length - 1];
    }
    if (playback.currentPoint?.coords) {
      return [playback.currentPoint.coords.lon, playback.currentPoint.coords.lat];
    }
    return null;
  }, [isAtEnd, routeCoordinates, playback.currentPoint]);

  // Calidad GPS: detecta data sparse pa' warning honesto al usuario.
  // Gap promedio > 60s o <20 puntos en >1h = "datos escasos".
  const gpsQuality = useMemo(() => {
    const locs = playback.routeData?.locations;
    if (!locs || locs.length < 2 || !playback.startTime || !playback.endTime) return null;
    const totalMin = (playback.endTime - playback.startTime) / 60000;
    const avgGapSec = (totalMin * 60) / (locs.length - 1);
    const isSparse = avgGapSec > 60 || (totalMin > 60 && locs.length < 20);
    return { isSparse, avgGapSec: Math.round(avgGapSec), totalPoints: locs.length };
  }, [playback.routeData, playback.startTime, playback.endTime]);

  // Split track: TRAVELED (ya pasó) vs REMAINING (falta).
  // Cut basado en playback.progress (0-100). Append currentVehiclePosition al cut
  // pa' que ambos segmentos se toquen exact en el carro. Esto da el feedback visual
  // tipo Spotify/YouTube: lo recorrido brilla, lo pendiente queda dim.
  const { traveledGeoJSON, remainingGeoJSON } = useMemo(() => {
    if (routeCoordinates.length < 2 || !currentVehiclePosition) {
      return { traveledGeoJSON: null, remainingGeoJSON: null };
    }
    if (isAtEnd) {
      return {
        traveledGeoJSON: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: routeCoordinates },
        },
        remainingGeoJSON: null,
      };
    }
    const total = routeCoordinates.length;
    const cutIdx = Math.max(
      1,
      Math.min(total - 1, Math.floor((playback.progress / 100) * total)),
    );
    const traveled = routeCoordinates.slice(0, cutIdx).concat([currentVehiclePosition]);
    const remaining = [currentVehiclePosition].concat(routeCoordinates.slice(cutIdx));
    return {
      traveledGeoJSON: traveled.length > 1
        ? { type: 'Feature', geometry: { type: 'LineString', coordinates: traveled } }
        : null,
      remainingGeoJSON: remaining.length > 1
        ? { type: 'Feature', geometry: { type: 'LineString', coordinates: remaining } }
        : null,
    };
  }, [routeCoordinates, currentVehiclePosition, playback.progress, isAtEnd]);

  // fitBounds cuando llega data nueva — encaja ruta completa en viewport.
  // Solo refit cuando cambia el key (vehiculoId+date), no en cada update reactivo.
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map || !routeCoordinates || routeCoordinates.length < 2) return;
    const key = `${vehiculoId}|${selectedDate || 'recent'}|${routeCoordinates.length}`;
    if (fittedRouteKey.current === key) return;

    const lons = routeCoordinates.map(c => c[0]);
    const lats = routeCoordinates.map(c => c[1]);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    try {
      map.fitBounds(
        [[minLon, minLat], [maxLon, maxLat]],
        { padding: 80, duration: 600, maxZoom: 16 }
      );
      fittedRouteKey.current = key;
    } catch (err) {
      console.warn('fitBounds falló:', err);
    }
  }, [routeCoordinates, vehiculoId, selectedDate]);

  if (!isOpen) return null;

  // Formatear timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '--:--:--';
    try {
      let date;

      if (typeof timestamp === 'number') {
        date = timestamp < 10000000000
          ? new Date(timestamp * 1000)
          : new Date(timestamp);
      } else {
        date = new Date(timestamp);
      }

      if (isNaN(date.getTime())) {
        console.warn('Timestamp inválido:', timestamp);
        return '--:--:--';
      }

      return date.toLocaleTimeString('es-PA', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch (error) {
      console.error('Error formateando timestamp:', timestamp, error);
      return '--:--:--';
    }
  };

  // Formatear duración en ms a "Xh Ymin" o "Ymin" si <1h.
  const formatDuration = (ms) => {
    if (!ms || ms <= 0) return '0min';
    const totalMin = Math.round(ms / 1000 / 60);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  };

  // Formatear fecha completa
  const formatFullDate = (timestamp) => {
    if (!timestamp) return '--';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '--';
      return date.toLocaleDateString('es-PA', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '--';
    }
  };

  // Manejar cambio de fecha
  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setShowDatePicker(false);
  };

  // Manejar cambio de velocidad
  const handleSpeedChange = () => {
    const speeds = [1, 2, 4, 8, 16, 32, 64, 128];
    const currentIndex = speeds.indexOf(playback.playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    playback.changeSpeed(nextSpeed);
  };

  const vehicleCourse = playback.currentPoint?.course ?? 0;

  // Estadísticas
  const stats = playback.stats || {};

  // Usar Portal para renderizar FUERA del árbol DOM
  return createPortal(
    <div className="gps-playback-modal-overlay">
      <div className="gps-playback-modal">
        {/* Header */}
        <header className="gps-playback-header">
          <div className="header-left">
            <div className="vehicle-badge">
              <Truck size={20} />
            </div>
            <div className="header-info">
              <h2>{vehicleData?.placa || 'Vehículo'}</h2>
              <span className="header-subtitle">
                {vehicleData?.deviceName || vehicleData?.deviceId || 'GPS'}
                {selectedDate && ` • ${formatFullDate(selectedDate)}`}
                {gpsQuality?.isSparse && ` • Datos GPS escasos (${gpsQuality.totalPoints} pts, ~${gpsQuality.avgGapSec}s entre pings)`}
              </span>
            </div>
          </div>

          <div className="header-right">
            {/* Selector de tema */}
            <button
              className="header-btn"
              onClick={() => {
                const newTheme = mapTheme === 'dark' ? 'light' : 'dark';
                setMapTheme(newTheme);
                localStorage.setItem('mapTheme', newTheme);
              }}
              title={mapTheme === 'dark' ? 'Modo día' : 'Modo noche'}
            >
              {mapTheme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
            </button>

            {/* Selector de fecha */}
            <div className="date-selector-wrapper">
              <button
                className="header-btn date-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDatePicker(!showDatePicker);
                }}
                title="Seleccionar fecha"
              >
                <Calendar size={18} />
                <span>{selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Hoy'}</span>
              </button>
              {showDatePicker && (
                <div
                  ref={dateDropdownRef}
                  className="gps-date-picker"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="gps-date-quick-btns">
                    <button
                      className={`gps-quick-btn ${!selectedDate ? 'active' : ''}`}
                      onClick={() => { setSelectedDate(null); setShowDatePicker(false); }}
                    >
                      Hoy
                    </button>
                    <button
                      className="gps-quick-btn"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 1);
                        setSelectedDate(d.toISOString().split('T')[0]);
                        setShowDatePicker(false);
                      }}
                    >
                      Ayer
                    </button>
                    <button
                      className="gps-quick-btn"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 7);
                        setSelectedDate(d.toISOString().split('T')[0]);
                        setShowDatePicker(false);
                      }}
                    >
                      -7 días
                    </button>
                  </div>

                  <div className="gps-date-divider">
                    <span>o elige fecha</span>
                  </div>

                  <input
                    type="date"
                    className="gps-date-input"
                    value={selectedDate || new Date().toISOString().split('T')[0]}
                    onChange={handleDateChange}
                    max={new Date().toISOString().split('T')[0]}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
            </div>

            {/* Botón exportar */}
            <button
              className="header-btn"
              onClick={() => {
                if (playback.routeData) {
                  exportToGPX(
                    playback.routeData.locations,
                    'Historial GPS',
                    vehicleData?.placa || 'vehiculo'
                  );
                }
              }}
              disabled={!playback.hasData}
              title="Exportar GPX"
            >
              <Download size={18} />
            </button>

            {/* Botón cerrar */}
            <button className="header-btn close-btn" onClick={onClose} title="Cerrar">
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Contenido principal - Mapa */}
        <main className="gps-playback-content">
          {playback.loading && (
            <div className="playback-loading-state">
              <div className="loading-spinner-large"></div>
              <p>Cargando historial GPS...</p>
            </div>
          )}

          {playback.error && (
            <div className="playback-error-state">
              <AlertTriangle size={32} className="error-icon" aria-hidden="true" />
              <p>{playback.error}</p>
              <button onClick={playback.loadHistory} className="retry-btn">
                Reintentar
              </button>
            </div>
          )}

          {!playback.loading && !playback.error && !playback.hasData && (
            <div className="playback-empty-state">
              <MapPin size={64} />
              <h3>Sin datos GPS</h3>
              <p>No hay registros de ubicación para la fecha seleccionada</p>
              <button
                className="select-date-btn"
                onClick={() => setShowDatePicker(true)}
              >
                <Calendar size={18} />
                Seleccionar otra fecha
              </button>
            </div>
          )}

          {!playback.loading && !playback.error && playback.hasData && rawCoordinates.length > 0 && (
            <Map
              ref={mapRef}
              initialViewState={{
                longitude: rawCoordinates[0][0],
                latitude: rawCoordinates[0][1],
                zoom: 14,
              }}
              mapStyle={MAP_STYLES[mapTheme]}
              style={{ width: '100%', height: '100%' }}
            >
              <NavigationControl position="top-right" />

              {/* Trayecto del día — split traveled vs remaining (estilo Spotify/YouTube).
                  REMAINING (lo que falta): gris dasheado, opaco bajo, debajo de todo.
                  TRAVELED (ya pasó): verde sólido + casing oscuro + glow brillante, encima.
                  Resultado: claro visualmente por dónde pasó vs por dónde va a pasar. */}

              {/* REMAINING — render PRIMERO para que quede debajo del traveled */}
              {remainingGeoJSON && (
                <Source id="route-remaining" type="geojson" data={remainingGeoJSON}>
                  <Layer
                    id="route-remaining-layer"
                    type="line"
                    paint={{
                      'line-color': mapTheme === 'dark' ? '#9ca3af' : '#6b7280',
                      'line-width': 4,
                      'line-opacity': 0.6,
                      'line-dasharray': [2, 2],
                    }}
                    layout={{ 'line-cap': 'butt', 'line-join': 'round' }}
                  />
                </Source>
              )}

              {/* TRAVELED — 3 capas pa' contraste (glow + casing + main) */}
              {traveledGeoJSON && (
                <>
                  <Source id="route-traveled-glow" type="geojson" data={traveledGeoJSON}>
                    <Layer
                      id="route-traveled-glow-layer"
                      type="line"
                      paint={{
                        'line-color': '#22c55e',
                        'line-width': 14,
                        'line-opacity': 0.35,
                        'line-blur': 4,
                      }}
                      layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                    />
                  </Source>
                  <Source id="route-traveled-casing" type="geojson" data={traveledGeoJSON}>
                    <Layer
                      id="route-traveled-casing-layer"
                      type="line"
                      paint={{
                        'line-color': mapTheme === 'dark' ? '#0a0a0a' : '#ffffff',
                        'line-width': 8,
                        'line-opacity': 0.85,
                      }}
                      layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                    />
                  </Source>
                  <Source id="route-traveled" type="geojson" data={traveledGeoJSON}>
                    <Layer
                      id="route-traveled-layer"
                      type="line"
                      paint={{
                        'line-color': '#22c55e',
                        'line-width': 5,
                        'line-opacity': 1,
                      }}
                      layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                    />
                  </Source>
                </>
              )}

              {/* Punto de inicio (A) — pin anchor="bottom" sobresale hacia arriba.
                  Antes era center → quedaba tapado por el vehicle marker (40px center). */}
              {routeCoordinates.length > 0 && (
                <Marker
                  longitude={routeCoordinates[0][0]}
                  latitude={routeCoordinates[0][1]}
                  anchor="bottom"
                >
                  <div className="playback-pin playback-pin-start">
                    <span>A</span>
                  </div>
                </Marker>
              )}

              {/* Punto final (B) — mismo pattern de pin */}
              {routeCoordinates.length > 1 && (
                <Marker
                  longitude={routeCoordinates[routeCoordinates.length - 1][0]}
                  latitude={routeCoordinates[routeCoordinates.length - 1][1]}
                  anchor="bottom"
                >
                  <div className="playback-pin playback-pin-end">
                    <span>B</span>
                  </div>
                </Marker>
              )}

              {/* Marker del vehículo — mismo SVG que monitoring pa' look consistente.
                  Color verde si playing, gris si pausado. Rotación = rumbo GPS interpolado. */}
              {currentVehiclePosition && (() => {
                const markerColor = playback.isPlaying ? '#10b981' : '#6b7280';
                const isMovingMarker = playback.isPlaying;
                const gradId = 'pb-car-gradient';
                return (
                  <Marker
                    longitude={currentVehiclePosition[0]}
                    latitude={currentVehiclePosition[1]}
                    anchor="center"
                    rotation={vehicleCourse}
                    onClick={() => setShowPopup(true)}
                    className="playback-vehicle-marker-wrapper"
                  >
                    <div className={`playback-vehicle-marker ${isMovingMarker ? 'moving' : 'stopped'}`}>
                      <svg viewBox="0 0 28 40" className="playback-vehicle-svg">
                        <defs>
                          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={markerColor} stopOpacity={1} />
                            <stop offset="100%" stopColor={markerColor} stopOpacity={0.85} />
                          </linearGradient>
                          <filter id="pb-car-shadow">
                            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.4" />
                          </filter>
                        </defs>
                        <ellipse cx="14" cy="38" rx="10" ry="2" fill="rgba(0,0,0,0.2)" />
                        <path d="M 8 10 L 8 6 Q 8 4 10 4 L 18 4 Q 20 4 20 6 L 20 10 L 20 32 L 20 34 Q 20 36 18 36 L 10 36 Q 8 36 8 34 L 8 32 Z"
                              fill={`url(#${gradId})`} filter="url(#pb-car-shadow)" />
                        <rect x="9" y="3" width="10" height="6" rx="2" fill={markerColor} />
                        <path d="M 10 8 Q 10 7 11 7 L 17 7 Q 18 7 18 8 L 18 12 L 10 12 Z" fill="rgba(135,206,250,0.75)" />
                        <rect x="11" y="8" width="6" height="3" rx="1" fill="rgba(255,255,255,0.3)" />
                        <rect x="9" y="13" width="10" height="10" rx="2" fill={`${markerColor}dd`} />
                        <rect x="9.5" y="14" width="4" height="8" rx="1" fill="rgba(135,206,250,0.6)" />
                        <rect x="14.5" y="14" width="4" height="8" rx="1" fill="rgba(135,206,250,0.6)" />
                        <rect x="9" y="24" width="10" height="9" rx="2" fill={`${markerColor}cc`} />
                        <rect x="11" y="29" width="6" height="3" rx="1" fill="rgba(135,206,250,0.5)" />
                        <circle cx="10.5" cy="5" r="1.2" fill={isMovingMarker ? '#FFC107' : '#FFF8DC'} />
                        <circle cx="17.5" cy="5" r="1.2" fill={isMovingMarker ? '#FFC107' : '#FFF8DC'} />
                        <rect x="9.5" y="33" width="3" height="1.5" rx="0.5" fill="#EF4444" />
                        <rect x="15.5" y="33" width="3" height="1.5" rx="0.5" fill="#EF4444" />
                        <ellipse cx="6" cy="12" rx="2.5" ry="4" fill="#1a1a1a" />
                        <ellipse cx="22" cy="12" rx="2.5" ry="4" fill="#1a1a1a" />
                        <ellipse cx="6" cy="28" rx="2.5" ry="4" fill="#1a1a1a" />
                        <ellipse cx="22" cy="28" rx="2.5" ry="4" fill="#1a1a1a" />
                        <ellipse cx="6" cy="12" rx="1.2" ry="2" fill="#6b7280" />
                        <ellipse cx="22" cy="12" rx="1.2" ry="2" fill="#6b7280" />
                        <ellipse cx="6" cy="28" rx="1.2" ry="2" fill="#6b7280" />
                        <ellipse cx="22" cy="28" rx="1.2" ry="2" fill="#6b7280" />
                        <circle cx="5" cy="17" r="1.5" fill={`${markerColor}aa`} />
                        <circle cx="23" cy="17" r="1.5" fill={`${markerColor}aa`} />
                      </svg>
                    </div>
                  </Marker>
                );
              })()}

              {/* Popup del vehículo */}
              {showPopup && currentVehiclePosition && (
                <Popup
                  longitude={currentVehiclePosition[0]}
                  latitude={currentVehiclePosition[1]}
                  onClose={() => setShowPopup(false)}
                  closeButton={true}
                  closeOnClick={false}
                  anchor="bottom"
                  offset={20}
                >
                  <div className="vehicle-popup-content">
                    <strong>{vehicleData?.placa}</strong>
                    <div className="vehicle-popup-row">
                      <Clock size={12} aria-hidden="true" />
                      <span>{formatTime(playback.currentPoint?.timestamp || playback.currentPoint?.last_updated)}</span>
                    </div>
                  </div>
                </Popup>
              )}
            </Map>
          )}
        </main>

        {/* Controles de reproducción */}
        {playback.hasData && (
          <footer className={`gps-playback-controls ${controlsExpanded ? 'expanded' : 'collapsed'}`}>
            {/* Toggle de expansión */}
            <button
              className="controls-toggle"
              onClick={() => setControlsExpanded(!controlsExpanded)}
            >
              {controlsExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </button>

            {/* Timeline — driven por TIEMPO real */}
            <div className="timeline-section">
              <span className="timeline-text timeline-text--time">
                {formatTime(playback.currentTime)}
              </span>
              <div
                className="timeline-slider-wrapper"
                onMouseMove={(e) => {
                  if (!playback.startTime || !playback.endTime) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  const hoverTime = playback.startTime + (playback.endTime - playback.startTime) * pct;
                  setHoverTooltip({ x: e.clientX - rect.left, time: hoverTime });
                }}
                onMouseLeave={() => setHoverTooltip(null)}
              >
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="1"
                  value={Math.round(playback.progress * 10)}
                  onChange={(e) => playback.seekToProgress(parseInt(e.target.value, 10) / 10)}
                  className="timeline-slider-input"
                  style={{ '--progress': `${playback.progress}%` }}
                />
                {hoverTooltip && (
                  <div
                    className="timeline-slider-tooltip"
                    style={{ left: `${hoverTooltip.x}px` }}
                  >
                    {formatTime(hoverTooltip.time)}
                  </div>
                )}
              </div>
              <span className="timeline-text timeline-text--time">
                {formatTime(playback.endTime)}
              </span>
            </div>

            {/* Controles principales */}
            <div className="main-controls">
              <div className="controls-left">
                {stats.totalDistance ? (
                  <div className="quick-stat">
                    <span className="stat-value">{stats.totalDistance.toFixed(1)}</span>
                    <span className="stat-unit">km</span>
                  </div>
                ) : null}
              </div>

              <div className="controls-center">
                <button
                  className="control-button"
                  onClick={playback.restart}
                  title="Reiniciar"
                >
                  <SkipBack size={20} />
                </button>

                <button
                  className="control-button"
                  onClick={() => playback.seekToTime((playback.currentTime || playback.startTime) - 30000)}
                  title="Retroceder 30s"
                >
                  <SkipBack size={16} />
                </button>

                <button
                  className="control-button play-button"
                  onClick={() => playback.isPlaying ? playback.pause() : playback.play()}
                  title={playback.isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {playback.isPlaying ? <Pause size={28} /> : <Play size={28} />}
                </button>

                <button
                  className="control-button"
                  onClick={() => playback.seekToTime((playback.currentTime || playback.startTime) + 30000)}
                  title="Avanzar 30s"
                >
                  <SkipForward size={16} />
                </button>

                <button
                  className="control-button speed-button"
                  onClick={handleSpeedChange}
                  title="Cambiar velocidad"
                >
                  {playback.playbackSpeed}x
                </button>
              </div>

              <div className="controls-right">
                {stats.duration ? (
                  <div className="quick-stat">
                    <span className="stat-value">{formatDuration(stats.duration)}</span>
                    <span className="stat-unit">duración</span>
                  </div>
                ) : null}
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
};

export default GPSPlaybackModal;
