import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Polyline, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
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
import 'leaflet/dist/leaflet.css';
import './GPSPlaybackModal.css';

const MAPBOX_TOKEN = 'pk.eyJ1Ijoia2V2aW5uMjMiLCJhIjoiY204Y2J0bWN1MTg5ZzJtb2xobXljODM0MiJ9.48MFADtQhp_sFuQjewLFeA';

// Componente para ajustar el mapa a los bounds de la ruta
const MapBoundsHandler = ({ routeData }) => {
  const map = useMap();
  
  useEffect(() => {
    if (routeData?.locations && routeData.locations.length > 0) {
      const validLocations = routeData.locations.filter(loc => {
        const lat = loc.coords?.lat || loc.status?.coords?.lat;
        const lon = loc.coords?.lon || loc.status?.coords?.lon;
        return lat && lon && !isNaN(lat) && !isNaN(lon);
      });
      
      if (validLocations.length > 0) {
        const bounds = L.latLngBounds(
          validLocations.map(loc => [
            loc.coords?.lat || loc.status?.coords?.lat,
            loc.coords?.lon || loc.status?.coords?.lon,
          ])
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      }
    }
  }, [map, routeData]);
  
  return null;
};

// Crear icono del vehículo - MISMO que el mapa en vivo
const createVehicleIcon = (course = 0, isMoving = true) => {
  const statusColor = isMoving ? '#10b981' : '#6b7280';
  
  return L.divIcon({
    className: 'gps-car-icon playback-vehicle-marker',
    html: `
      <div class="gps-car-marker" style="transform: rotate(${course}deg)">
        <svg viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg" class="gps-car-svg">
          <defs>
            <linearGradient id="car-gradient-playback" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:${statusColor};stop-opacity:1" />
              <stop offset="100%" style="stop-color:${statusColor};stop-opacity:0.85" />
            </linearGradient>
            <filter id="car-shadow-playback">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.4"/>
            </filter>
          </defs>
          
          <!-- Sombra del carro -->
          <ellipse cx="14" cy="38" rx="10" ry="2" fill="rgba(0,0,0,0.2)"/>
          
          <!-- Cuerpo principal del carro -->
          <path d="M 8 10 
                   L 8 6 Q 8 4 10 4 L 18 4 Q 20 4 20 6 L 20 10
                   L 20 32
                   L 20 34 Q 20 36 18 36 L 10 36 Q 8 36 8 34 L 8 32
                   Z"
                fill="url(#car-gradient-playback)"
                filter="url(#car-shadow-playback)"/>
          
          <!-- Capó delantero -->
          <rect x="9" y="3" width="10" height="6" rx="2" fill="${statusColor}"/>
          
          <!-- Parabrisas frontal -->
          <path d="M 10 8 Q 10 7 11 7 L 17 7 Q 18 7 18 8 L 18 12 L 10 12 Z"
                fill="rgba(135,206,250,0.75)"/>
          <rect x="11" y="8" width="6" height="3" rx="1" fill="rgba(255,255,255,0.3)"/>
          
          <!-- Techo/Cabina -->
          <rect x="9" y="13" width="10" height="10" rx="2" fill="${statusColor}dd"/>
          
          <!-- Ventanas laterales -->
          <rect x="9.5" y="14" width="4" height="8" rx="1" fill="rgba(135,206,250,0.6)"/>
          <rect x="14.5" y="14" width="4" height="8" rx="1" fill="rgba(135,206,250,0.6)"/>
          
          <!-- Maletero/Parte trasera -->
          <rect x="9" y="24" width="10" height="9" rx="2" fill="${statusColor}cc"/>
          
          <!-- Parabrisas trasero -->
          <rect x="11" y="29" width="6" height="3" rx="1" fill="rgba(135,206,250,0.5)"/>
          
          <!-- Luces delanteras (amarillas cuando se mueve) -->
          <circle cx="10.5" cy="5" r="1.2" fill="${isMoving ? '#FFC107' : '#FFF8DC'}"/>
          <circle cx="17.5" cy="5" r="1.2" fill="${isMoving ? '#FFC107' : '#FFF8DC'}"/>
          ${isMoving ? `
            <circle cx="10.5" cy="5" r="2" fill="rgba(255,193,7,0.4)">
              <animate attributeName="opacity" values="0.4;0.8;0.4" dur="0.6s" repeatCount="indefinite"/>
            </circle>
            <circle cx="17.5" cy="5" r="2" fill="rgba(255,193,7,0.4)">
              <animate attributeName="opacity" values="0.4;0.8;0.4" dur="0.6s" repeatCount="indefinite"/>
            </circle>
          ` : ''}
          
          <!-- Luces traseras rojas -->
          <rect x="9.5" y="33" width="3" height="1.5" rx="0.5" fill="#EF4444"/>
          <rect x="15.5" y="33" width="3" height="1.5" rx="0.5" fill="#EF4444"/>
          
          <!-- Ruedas -->
          <ellipse cx="6" cy="12" rx="2.5" ry="4" fill="#1a1a1a"/>
          <ellipse cx="22" cy="12" rx="2.5" ry="4" fill="#1a1a1a"/>
          <ellipse cx="6" cy="28" rx="2.5" ry="4" fill="#1a1a1a"/>
          <ellipse cx="22" cy="28" rx="2.5" ry="4" fill="#1a1a1a"/>
          
          <!-- Rines -->
          <ellipse cx="6" cy="12" rx="1.2" ry="2" fill="#6b7280"/>
          <ellipse cx="22" cy="12" rx="1.2" ry="2" fill="#6b7280"/>
          <ellipse cx="6" cy="28" rx="1.2" ry="2" fill="#6b7280"/>
          <ellipse cx="22" cy="28" rx="1.2" ry="2" fill="#6b7280"/>
          
          <!-- Espejos laterales -->
          <circle cx="5" cy="17" r="1.5" fill="${statusColor}aa"/>
          <circle cx="23" cy="17" r="1.5" fill="${statusColor}aa"/>
          
          <!-- Línea central del carro -->
          <line x1="14" y1="6" x2="14" y2="33" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/>
        </svg>
        
        <!-- Indicador de estado -->
        <div class="gps-car-status gps-status-${isMoving ? 'moving' : 'stopped'}"></div>
      </div>
    `,
    iconSize: [28, 40],
    iconAnchor: [14, 20]
  });
};

/**
 * GPSPlaybackModal - Modal fullscreen para reproducción de historial GPS
 * Diseño profesional tipo YouTube/Spotify con controles modernos
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
  const dateInputRef = useRef(null);
  const dateDropdownRef = useRef(null); // Ref para detectar clicks afuera
  const [snappedRoute, setSnappedRoute] = useState(null); // Ruta ajustada a calles
  const [isSnapping, setIsSnapping] = useState(false); // Indicador de procesamiento

  // Hook de reproducción GPS
  const playback = useRoutePlayback(
    vehicleData?.deviceId,
    selectedDate,
    vehiculoId
  );

  /**
   * Ajustar la traza GPS a las calles reales usando Mapbox Map Matching API
   * Esto hace que el historial se vea profesional siguiendo calles en lugar de líneas rectas
   */
  useEffect(() => {
    const snapRouteToRoads = async () => {
      // Solo procesar si hay datos de ruta
      if (!playback.routeData?.locations || playback.routeData.locations.length < 2) {
        setSnappedRoute(null);
        return;
      }

      setIsSnapping(true);

      try {
        const locations = playback.routeData.locations;
        
        // Mapbox Map Matching API tiene límite de ~100 coordenadas por request
        // Si hay más, submuestrear inteligentemente
        let sampledLocations = locations;
        const MAX_COORDS = 100;
        
        if (locations.length > MAX_COORDS) {
          console.log(`📊 Submuestreando ${locations.length} puntos a ${MAX_COORDS} para Map Matching`);
          const step = Math.ceil(locations.length / MAX_COORDS);
          sampledLocations = locations.filter((_, index) => index % step === 0);
          // Siempre incluir el último punto
          if (sampledLocations[sampledLocations.length - 1] !== locations[locations.length - 1]) {
            sampledLocations.push(locations[locations.length - 1]);
          }
        }

        // Construir coordenadas en formato lng,lat para Mapbox
        // IMPORTANTE: Filtrar puntos duplicados (vehículo detenido) que causan error 422
        const coordinatesArray = sampledLocations
          .map(loc => {
            const lat = loc.coords?.lat || loc.status?.coords?.lat;
            const lon = loc.coords?.lon || loc.status?.coords?.lon;
            if (!lat || !lon || isNaN(lat) || isNaN(lon)) return null;
            return `${lon},${lat}`;
          })
          .filter(Boolean);

        // Eliminar duplicados consecutivos (vehículo detenido)
        const uniqueCoordinates = coordinatesArray.filter((coord, index, arr) => {
          if (index === 0) return true; // Siempre incluir el primero
          return coord !== arr[index - 1]; // Incluir solo si es diferente al anterior
        });

        console.log(`🧹 Filtrado de duplicados: ${coordinatesArray.length} → ${uniqueCoordinates.length} puntos únicos`);

        const coordinates = uniqueCoordinates.join(';');

        if (!coordinates || uniqueCoordinates.length < 2) {
          console.warn('⚠️ No hay suficientes coordenadas únicas para Map Matching (vehículo mayormente detenido)');
          setSnappedRoute(null);
          setIsSnapping(false);
          return;
        }

        console.log(`🗺️ Ajustando ${uniqueCoordinates.length} puntos GPS únicos a calles con Map Matching...`);

        // Llamar a Mapbox Map Matching API
        // Documentación: https://docs.mapbox.com/api/navigation/map-matching/
        const params = new URLSearchParams({
          geometries: 'geojson',
          overview: 'full',
          steps: 'false',
          tidy: 'true', // Eliminar puntos GPS ruidosos/outliers
          // radiuses: array de radios de búsqueda (25 metros por defecto)
          radiuses: uniqueCoordinates.map(() => '25').join(';'),
        });

        const url = `https://api.mapbox.com/matching/v5/mapbox/driving/${coordinates}?${params.toString()}&access_token=${MAPBOX_TOKEN}`;

        const response = await fetch(url);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.warn(`⚠️ Map Matching HTTP ${response.status}:`, errorData.message || response.statusText);
          
          // Si es 422 (datos inválidos), simplemente usar puntos originales sin error
          if (response.status === 422) {
            console.log('📍 Usando puntos GPS originales (sin ajustar a calles)');
          }
          
          setSnappedRoute(null);
          setIsSnapping(false);
          return;
        }

        const data = await response.json();

        if (data.code === 'Ok' && data.matchings && data.matchings.length > 0) {
          // Convertir de [lng, lat] a [lat, lng]
          const matchedCoords = data.matchings[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
          
          console.log(`✅ Ruta ajustada a calles: ${matchedCoords.length} puntos (de ${locations.length} originales)`);
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

    // Ejecutar el snap cuando cambien los datos
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



  if (!isOpen) return null;

  // Formatear timestamp (mejorado para manejar timestamps Unix y ISO)
  const formatTime = (timestamp) => {
    if (!timestamp) return '--:--:--';
    try {
      let date;
      
      // Si es número (timestamp Unix en segundos o milisegundos)
      if (typeof timestamp === 'number') {
        // Si es menor a un billón, probablemente está en segundos (antes de 2001 en ms)
        date = timestamp < 10000000000 
          ? new Date(timestamp * 1000) 
          : new Date(timestamp);
      } else {
        // String ISO o formato de fecha
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
        hour12: false, // Formato 24 horas
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

  // Manejar cambio de velocidad (agregadas velocidades extremas)
  const handleSpeedChange = () => {
    const speeds = [1, 2, 4, 8, 16, 32, 64, 128];
    const currentIndex = speeds.indexOf(playback.playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    playback.changeSpeed(nextSpeed);
  };

  // Color ESTANDARIZADO para la ruta recorrida
  // SIEMPRE verde (#10b981) para consistencia visual
  const getSpeedColor = (speed) => {
    return '#10b981'; // Verde estándar - ruta recorrida
  };

  // Preparar datos de la ruta
  // PRIORIDAD: Usar ruta ajustada a calles (snappedRoute) si está disponible, sino usar puntos GPS originales
  const routeCoordinates = snappedRoute || (playback.routeData?.locations?.map(loc => [
    loc.coords?.lat || loc.status?.coords?.lat,
    loc.coords?.lon || loc.status?.coords?.lon,
  ]).filter(pos => pos[0] && pos[1] && !isNaN(pos[0]) && !isNaN(pos[1])) || []);

  // Para la ruta ajustada, necesitamos mapear el índice de playback a los puntos snapped
  // Usamos proporción ya que snappedRoute puede tener diferente cantidad de puntos
  const totalOriginalPoints = playback.routeData?.locations?.length || 1;
  const totalSnappedPoints = routeCoordinates.length;
  const snappedIndex = snappedRoute 
    ? Math.round((playback.currentIndex / totalOriginalPoints) * totalSnappedPoints)
    : playback.currentIndex;

  const traveledRoute = routeCoordinates.slice(0, snappedIndex + 1);
  const pendingRoute = routeCoordinates.slice(snappedIndex);

  // Calcular la posición actual del vehículo
  // PRIORIDAD: Usar coordenadas de la ruta snapped para que coincida con la línea dibujada
  const currentVehiclePosition = (() => {
    if (snappedRoute && snappedRoute.length > 0 && snappedIndex < snappedRoute.length) {
      // Usar la posición de la ruta ajustada a calles
      return snappedRoute[snappedIndex];
    } else if (playback.currentPoint?.coords) {
      // Fallback a coordenadas GPS originales
      return [playback.currentPoint.coords.lat, playback.currentPoint.coords.lon];
    }
    return null;
  })();

  // Calcular la dirección del vehículo basada en la ruta
  const vehicleCourse = (() => {
    if (snappedRoute && snappedIndex > 0 && snappedIndex < snappedRoute.length) {
      const prev = snappedRoute[snappedIndex - 1];
      const curr = snappedRoute[snappedIndex];
      const deltaLat = curr[0] - prev[0];
      const deltaLng = curr[1] - prev[1];
      // Convertir a grados (0° = Norte, 90° = Este)
      return Math.atan2(deltaLng, deltaLat) * (180 / Math.PI);
    }
    return playback.currentPoint?.course || 0;
  })();

  // Centro del mapa
  const mapCenter = currentVehiclePosition || [8.983333, -79.51667];

  // Calcular estadísticas
  const stats = playback.stats || {};

  // Usar Portal para renderizar FUERA del árbol DOM del MapComponent
  // Esto evita problemas con transform/filter que rompen position:fixed
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

            {/* Selector de fecha - SIMPLIFICADO Y FUNCIONAL */}
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
                  {/* Botones rápidos */}
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
                  
                  {/* Separador */}
                  <div className="gps-date-divider">
                    <span>o elige fecha</span>
                  </div>
                  
                  {/* Input de fecha */}
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
            <MapContainer
              center={mapCenter}
              zoom={14}
              className="playback-map-fullscreen"
              zoomControl={true}
            >
              <TileLayer
                url={`https://api.mapbox.com/styles/v1/mapbox/${mapTheme}-v11/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`}
                attribution='&copy; <a href="https://www.mapbox.com/">Mapbox</a>'
                tileSize={512}
                zoomOffset={-1}
              />
              
              <MapBoundsHandler routeData={playback.routeData} />

              {/* Ruta pendiente (gris) */}
              {pendingRoute.length > 1 && (
                <Polyline
                  positions={pendingRoute}
                  color="#6b7280"
                  weight={5}
                  opacity={0.4}
                  dashArray="8, 8"
                />
              )}

              {/* Ruta recorrida (verde) */}
              {traveledRoute.length > 1 && (
                <>
                  {/* Glow */}
                  <Polyline
                    positions={traveledRoute}
                    color="#3D5229"
                    weight={12}
                    opacity={0.2}
                  />
                  {/* Línea principal */}
                  <Polyline
                    positions={traveledRoute}
                    color={getSpeedColor(playback.currentPoint?.speed)}
                    weight={5}
                    opacity={0.9}
                  />
                </>
              )}

              {/* Punto de inicio */}
              {routeCoordinates.length > 0 && (
                <Circle
                  center={routeCoordinates[0]}
                  radius={25}
                  fillColor="#10b981"
                  color="#fff"
                  weight={3}
                  fillOpacity={0.8}
                />
              )}

              {/* Punto final */}
              {routeCoordinates.length > 1 && (
                <Circle
                  center={routeCoordinates[routeCoordinates.length - 1]}
                  radius={25}
                  fillColor="#ef4444"
                  color="#fff"
                  weight={3}
                  fillOpacity={0.8}
                />
              )}

              {/* Marcador del vehículo - Ahora sincronizado con la ruta dibujada */}
              {currentVehiclePosition && (
                <>
                  <Marker
                    position={currentVehiclePosition}
                    icon={createVehicleIcon(vehicleCourse, playback.isPlaying)}
                    zIndexOffset={1000} // Asegurar que esté encima de todo
                  >
                    <Popup>
                      <div className="vehicle-popup-content">
                        <strong>{vehicleData?.placa}</strong>
                        <br />
                        <span>🕐 {formatTime(playback.currentPoint?.timestamp || playback.currentPoint?.last_updated)}</span>
                        <br />
                        <span>🚗 {playback.currentPoint?.speed || 0} km/h</span>
                        {snappedRoute && <><br /><span>📍 Posición ajustada a calle</span></>}
                      </div>
                    </Popup>
                  </Marker>
                  
                  {/* Círculo de precisión GPS */}
                  <Circle
                    center={currentVehiclePosition}
                    radius={30}
                    fillColor="#3D5229"
                    color="#3D5229"
                    weight={1}
                    fillOpacity={0.15}
                  />
                </>
              )}
            </MapContainer>
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
                <div className="info-chip speed-chip" style={{ '--speed-color': getSpeedColor(playback.currentPoint.speed) }}>
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

            {/* Timeline */}
            <div className="timeline-section">
              <span className="timeline-text">
                {playback.currentIndex + 1} / {playback.totalPoints}
              </span>
              <div className="timeline-slider-wrapper">
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, playback.totalPoints - 1)}
                  value={playback.currentIndex}
                  onChange={(e) => playback.seekTo(parseInt(e.target.value, 10))}
                  className="timeline-slider-input"
                  style={{
                    '--progress': `${playback.progress}%`
                  }}
                />
              </div>
              <span className="timeline-text">{playback.progress.toFixed(0)}%</span>
            </div>

            {/* Controles principales */}
            <div className="main-controls">
              <div className="controls-left">
                {/* Stats rápidas */}
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
                  onClick={() => playback.seekTo(Math.max(0, playback.currentIndex - 10))}
                  title="Retroceder 10 puntos"
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
                  onClick={() => playback.seekTo(Math.min(playback.currentIndex + 10, playback.totalPoints - 1))}
                  title="Avanzar 10 puntos"
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
    document.body // Renderizar directamente en el body
  );
};

export default GPSPlaybackModal;
