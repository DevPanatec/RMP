import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Gauge,
  Clock,
  Navigation,
  MapPin,
  Truck,
  Battery,
  Signal,
  Maximize2,
  Minimize2,
  ChevronUp,
  ChevronDown,
} from '../Icons';
import { useRoutePlayback } from '../../hooks/useRoutePlayback';
import { exportToGPX } from '../../utils/routeExport';
import './GPSPlaybackModal.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

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
  const dateInputRef = useRef(null);
  const dateDropdownRef = useRef(null);
  const mapRef = useRef(null);
  const [snappedRoute, setSnappedRoute] = useState(null);
  const [isSnapping, setIsSnapping] = useState(false);
  const [hoverTooltip, setHoverTooltip] = useState(null);
  const [viewState, setViewState] = useState({
    longitude: -79.51667,
    latitude: 8.983333,
    zoom: 14
  });

  // Hook de reproducción GPS
  const playback = useRoutePlayback(
    vehicleData?.deviceId,
    selectedDate,
    vehiculoId
  );

  /**
   * Ajustar la traza GPS a las calles reales usando Mapbox Map Matching API
   */
  useEffect(() => {
    const snapRouteToRoads = async () => {
      if (!playback.routeData?.locations || playback.routeData.locations.length < 2) {
        setSnappedRoute(null);
        return;
      }

      setIsSnapping(true);

      try {
        const locations = playback.routeData.locations;

        let sampledLocations = locations;
        const MAX_COORDS = 100;

        if (locations.length > MAX_COORDS) {
          console.log(`📊 Submuestreando ${locations.length} puntos a ${MAX_COORDS} para Map Matching`);
          const step = Math.ceil(locations.length / MAX_COORDS);
          sampledLocations = locations.filter((_, index) => index % step === 0);
          if (sampledLocations[sampledLocations.length - 1] !== locations[locations.length - 1]) {
            sampledLocations.push(locations[locations.length - 1]);
          }
        }

        const coordinatesArray = sampledLocations
          .map(loc => {
            const lat = loc.coords?.lat || loc.status?.coords?.lat;
            const lon = loc.coords?.lon || loc.status?.coords?.lon;
            if (!lat || !lon || isNaN(lat) || isNaN(lon)) return null;
            return `${lon},${lat}`;
          })
          .filter(Boolean);

        const uniqueCoordinates = coordinatesArray.filter((coord, index, arr) => {
          if (index === 0) return true;
          return coord !== arr[index - 1];
        });

        console.log(`🧹 Filtrado de duplicados: ${coordinatesArray.length} → ${uniqueCoordinates.length} puntos únicos`);

        const coordinates = uniqueCoordinates.join(';');

        if (!coordinates || uniqueCoordinates.length < 2) {
          console.warn('⚠️ No hay suficientes coordenadas únicas para Map Matching');
          setSnappedRoute(null);
          setIsSnapping(false);
          return;
        }

        console.log(`🗺️ Ajustando ${uniqueCoordinates.length} puntos GPS únicos a calles con Map Matching...`);

        const params = new URLSearchParams({
          geometries: 'geojson',
          overview: 'full',
          steps: 'false',
          tidy: 'true',
          radiuses: uniqueCoordinates.map(() => '25').join(';'),
        });

        const url = `https://api.mapbox.com/matching/v5/mapbox/driving/${coordinates}?${params.toString()}&access_token=${MAPBOX_TOKEN}`;

        const response = await fetch(url);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.warn(`⚠️ Map Matching HTTP ${response.status}:`, errorData.message || response.statusText);

          if (response.status === 422) {
            console.log('📍 Usando puntos GPS originales (sin ajustar a calles)');
          }

          setSnappedRoute(null);
          setIsSnapping(false);
          return;
        }

        const data = await response.json();

        if (data.code === 'Ok' && data.matchings && data.matchings.length > 0) {
          // MapLibre expects [lng, lat]
          const matchedCoords = data.matchings[0].geometry.coordinates;

          console.log(`✅ Ruta ajustada a calles: ${matchedCoords.length} puntos`);
          console.log(`📏 Confianza del matching: ${(data.matchings[0].confidence * 100).toFixed(1)}%`);

          setSnappedRoute(matchedCoords);
        } else {
          console.warn(`⚠️ Map Matching code: ${data.code}, usando puntos GPS originales`);
          setSnappedRoute(null);
        }
      } catch (error) {
        console.warn('⚠️ Map Matching no disponible:', error.message);
        setSnappedRoute(null);
      } finally {
        setIsSnapping(false);
      }
    };

    if (playback.routeData && !playback.loading) {
      snapRouteToRoads();
    }
  }, [playback.routeData, playback.loading]);

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
        console.log('🔒 Cerrando date picker por click afuera');
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

  // Center map on route when data loads
  useEffect(() => {
    if (playback.routeData?.locations && playback.routeData.locations.length > 0) {
      const validLocations = playback.routeData.locations.filter(loc => {
        const lat = loc.coords?.lat || loc.status?.coords?.lat;
        const lon = loc.coords?.lon || loc.status?.coords?.lon;
        return lat && lon && !isNaN(lat) && !isNaN(lon);
      });

      if (validLocations.length > 0) {
        const firstLoc = validLocations[0];
        const lat = firstLoc.coords?.lat || firstLoc.status?.coords?.lat;
        const lon = firstLoc.coords?.lon || firstLoc.status?.coords?.lon;
        setViewState(prev => ({
          ...prev,
          latitude: lat,
          longitude: lon,
          zoom: 14
        }));
      }
    }
  }, [playback.routeData]);

  // === HOOKS ANTES DE EARLY RETURN ===
  // Coordenadas raw del GPS (siempre disponibles si hay data)
  const rawCoordinates = useMemo(() => {
    return (playback.routeData?.locations?.map(loc => [
      loc.coords?.lon || loc.status?.coords?.lon,
      loc.coords?.lat || loc.status?.coords?.lat,
    ]).filter(pos => pos[0] && pos[1] && !isNaN(pos[0]) && !isNaN(pos[1])) || []);
  }, [playback.routeData]);

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
        console.warn('⚠️ Timestamp inválido:', timestamp);
        return '--:--:--';
      }

      return date.toLocaleTimeString('es-PA', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch (error) {
      console.error('❌ Error formateando timestamp:', timestamp, error);
      return '--:--:--';
    }
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

  // Línea VISUAL del trayecto — usa snapped si está disponible, si no raw.
  // Una sola línea uniforme. El marker (pulsante cuando reproduce) es la única
  // indicación de "estoy aquí ahora". Revisitas a la misma calle no confunden
  // porque la línea no acumula color — siempre es la misma.
  const routeCoordinates = snappedRoute || rawCoordinates;
  const isAtEnd = playback.endTime != null && playback.currentTime != null && playback.currentTime >= playback.endTime;

  // MARKER: en raw GPS interpolado por TIEMPO. Al final, usar el último snapped
  // point pa' que matchee visualmente con el final de la línea.
  const currentVehiclePosition = (() => {
    if (isAtEnd && routeCoordinates.length > 0) {
      return routeCoordinates[routeCoordinates.length - 1];
    }
    if (playback.currentPoint?.coords) {
      return [playback.currentPoint.coords.lon, playback.currentPoint.coords.lat];
    }
    return null;
  })();

  const vehicleCourse = playback.currentPoint?.course ?? 0;

  // GeoJSON del trayecto completo del día — una sola línea uniforme.
  const fullRouteGeoJSON = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: routeCoordinates,
    },
  };

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
                {isSnapping && ' • Ajustando a calles...'}
                {snappedRoute && !isSnapping && ' • Ruta optimizada'}
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
              {mapTheme === 'dark' ? '☀️' : '🌙'}
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
                    ref={dateInputRef}
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
              <span className="error-icon">⚠️</span>
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

          {!playback.loading && !playback.error && playback.hasData && (
            <Map
              ref={mapRef}
              {...viewState}
              onMove={evt => setViewState(evt.viewState)}
              mapStyle={MAP_STYLES[mapTheme]}
              style={{ width: '100%', height: '100%' }}
            >
              <NavigationControl position="top-right" />

              {/* Trayecto del día — una sola línea uniforme.
                  El marker pulsante (encima) es la única indicación de "estoy aquí". */}
              {routeCoordinates.length > 1 && (
                <>
                  <Source id="full-route-glow" type="geojson" data={fullRouteGeoJSON}>
                    <Layer
                      id="full-route-glow-layer"
                      type="line"
                      paint={{
                        'line-color': '#3D5229',
                        'line-width': 10,
                        'line-opacity': 0.20,
                        'line-blur': 2
                      }}
                    />
                  </Source>
                  <Source id="full-route" type="geojson" data={fullRouteGeoJSON}>
                    <Layer
                      id="full-route-layer"
                      type="line"
                      paint={{
                        'line-color': '#3D5229',
                        'line-width': 5,
                        'line-opacity': 0.75
                      }}
                    />
                  </Source>
                </>
              )}

              {/* Punto de inicio */}
              {routeCoordinates.length > 0 && (
                <Marker
                  longitude={routeCoordinates[0][0]}
                  latitude={routeCoordinates[0][1]}
                  anchor="center"
                >
                  <div className="playback-marker playback-marker-start">
                    <span>A</span>
                  </div>
                </Marker>
              )}

              {/* Punto final */}
              {routeCoordinates.length > 1 && (
                <Marker
                  longitude={routeCoordinates[routeCoordinates.length - 1][0]}
                  latitude={routeCoordinates[routeCoordinates.length - 1][1]}
                  anchor="center"
                >
                  <div className="playback-marker playback-marker-end">
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
                    <br />
                    <span>🕐 {formatTime(playback.currentPoint?.timestamp || playback.currentPoint?.last_updated)}</span>
                    <br />
                    <span>🚗 {playback.currentPoint?.speed || 0} km/h</span>
                    {snappedRoute && <><br /><span>📍 Posición ajustada a calle</span></>}
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

            {/* Barra de información del punto actual */}
            {playback.currentPoint && controlsExpanded && (
              <div className="current-point-info">
                <div className="info-chip">
                  <Clock size={14} />
                  <span>{formatTime(playback.currentPoint.timestamp || playback.currentPoint.last_updated)}</span>
                </div>
                <div className="info-chip speed-chip">
                  <Gauge size={14} />
                  <span>{playback.currentPoint.speed || 0} km/h</span>
                </div>
                <div className="info-chip">
                  <Navigation size={14} />
                  <span>{playback.currentPoint.course || 0}°</span>
                </div>
                {playback.currentPoint.battery !== undefined && (
                  <div className="info-chip">
                    <Battery size={14} />
                    <span>{playback.currentPoint.battery}%</span>
                  </div>
                )}
                <div className="info-chip coords-chip">
                  <MapPin size={14} />
                  <span>
                    {playback.currentPoint.coords?.lat?.toFixed(5)}, {playback.currentPoint.coords?.lon?.toFixed(5)}
                  </span>
                </div>
              </div>
            )}

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
                {stats.totalDistance && (
                  <div className="quick-stat">
                    <span className="stat-value">{stats.totalDistance.toFixed(1)}</span>
                    <span className="stat-unit">km</span>
                  </div>
                )}
                {stats.avgSpeed && (
                  <div className="quick-stat">
                    <span className="stat-value">{stats.avgSpeed.toFixed(0)}</span>
                    <span className="stat-unit">km/h avg</span>
                  </div>
                )}
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
                {stats.maxSpeed && (
                  <div className="quick-stat">
                    <span className="stat-value">{stats.maxSpeed.toFixed(0)}</span>
                    <span className="stat-unit">km/h max</span>
                  </div>
                )}
                {stats.duration && (
                  <div className="quick-stat">
                    <span className="stat-value">{Math.round(stats.duration / 60)}</span>
                    <span className="stat-unit">min</span>
                  </div>
                )}
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
