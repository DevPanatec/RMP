import { useEffect, useState, useRef, useMemo, useCallback, memo } from 'react';
import Map, { Marker, Source, Layer, Popup, NavigationControl, ScaleControl } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { useAction, useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Satellite, Map as MapIcon, MapPin, X, Truck, Navigation, CheckCircle, Clock, Play, Battery, Signal, RefreshCw, Target, Trash2, Gauge, Copy, Radio, Recycle, Spray, Sun, Moon, Route } from '../Icons';
import GPSPlaybackModal from '../GPS/GPSPlaybackModal';
import 'maplibre-gl/dist/maplibre-gl.css';
import './MapLibreComponent.css';

// ============================================
// PERFORMANCE OPTIMIZATIONS
// ============================================

// OpenFreeMap - Free vector tiles, no API key, no limits
const MAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark'
};

// Preload map styles for instant theme switching
const preloadedStyles = {};
const preloadStyle = (url) => {
  if (!preloadedStyles[url]) {
    preloadedStyles[url] = fetch(url)
      .then(res => res.json())
      .catch(() => null);
  }
  return preloadedStyles[url];
};

// Preload both themes on module load
if (typeof window !== 'undefined') {
  preloadStyle(MAP_STYLES.light);
  preloadStyle(MAP_STYLES.dark);
}

// Default center: Panama City
const DEFAULT_CENTER = { longitude: -79.5167, latitude: 8.9833 };
const DEFAULT_ZOOM = 13;

// Mapbox Directions API token
const MAPBOX_TOKEN = 'pk.eyJ1Ijoia2V2aW5uMjMiLCJhIjoiY204Y2J0bWN1MTg5ZzJtb2xobXljODM0MiJ9.48MFADtQhp_sFuQjewLFeA';

/**
 * Calculate road-following route using Mapbox Directions API
 * Returns coordinates in [lng, lat] format (GeoJSON standard)
 */
const calcularRutaCompleta = async (paradas) => {
  if (!paradas || paradas.length < 2) return null;

  // Mapbox limit: 25 waypoints max
  const limitedParadas = paradas.slice(0, 25);
  const coordinates = limitedParadas
    .map(p => `${p.lng || p.longitud},${p.lat || p.latitud}`)
    .join(';');

  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.code === 'Ok' && data.routes?.[0]) {
      // Mapbox returns [lng, lat] format - ready for GeoJSON
      return data.routes[0].geometry.coordinates;
    }
  } catch (error) {
    console.error('Error fetching route from Mapbox:', error);
  }

  // Fallback: direct line in [lng, lat] format
  return limitedParadas.map(p => [p.lng || p.longitud, p.lat || p.latitud]);
};

// World bounds to prevent map repetition
// Format: [[sw_lng, sw_lat], [ne_lng, ne_lat]]
const MAX_BOUNDS = [
  [-180, -85], // Southwest [lng, lat]
  [180, 85]    // Northeast [lng, lat]
];

/**
 * Format relative time (hace X minutos/horas)
 */
const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Sin datos';

  const now = Date.now();
  const time = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  const diffMs = now - time;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 30) return 'Ahora mismo';
  if (diffSec < 60) return `Hace ${diffSec} seg`;
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  return `Hace ${diffDays}d`;
};

/**
 * Vehicle movement status based on speed and last update:
 * - 'moving': Advancing (speed > 0)
 * - 'stopped': Stopped (no movement 1-3 minutes)
 * - 'parked': Parked (no movement > 3 minutes)
 */
const getVehicleMovementStatus = (vehicle) => {
  const now = Date.now();
  const lastUpdate = vehicle.gps_ultima_actualizacion || vehicle.ultimaActualizacion;
  const lastUpdateTime = typeof lastUpdate === 'number' ? lastUpdate : new Date(lastUpdate).getTime();
  const timeSinceUpdate = now - lastUpdateTime;

  const ONE_MINUTE = 60 * 1000;
  const THREE_MINUTES = 3 * 60 * 1000;

  const speed = vehicle.gps_velocidad || vehicle.velocidad || 0;

  if (speed > 0) return 'moving';
  if (timeSinceUpdate > THREE_MINUTES) return 'parked';
  if (timeSinceUpdate > ONE_MINUTE) return 'stopped';
  return 'stopped';
};

// Colors by movement status
const movementColors = {
  moving: { primary: '#10b981', glow: 'rgba(16, 185, 129, 0.5)', label: 'En movimiento' },
  stopped: { primary: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)', label: 'Detenido' },
  parked: { primary: '#6b7280', glow: 'rgba(107, 114, 128, 0.4)', label: 'Parqueado' }
};

/**
 * Create a GeoJSON circle polygon from center point and radius
 * @param {Object} center - { lat, lng } or { latitud, longitud }
 * @param {number} radiusMeters - Radius in meters
 * @param {number} points - Number of points for polygon approximation
 * @returns {Object} GeoJSON Feature
 */
const createCircleGeoJSON = (center, radiusMeters, points = 32) => {
  const lat = center.lat || center.latitud;
  const lng = center.lng || center.longitud;
  const radiusKm = radiusMeters / 1000;
  const coords = [];

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = radiusKm * Math.cos(angle);
    const dy = radiusKm * Math.sin(angle);

    // Convert to degrees (approximate)
    const newLat = lat + (dy / 111.32);
    const newLng = lng + (dx / (111.32 * Math.cos(lat * Math.PI / 180)));

    coords.push([newLng, newLat]);
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords]
    },
    properties: {}
  };
};

/**
 * Hook: Smooth GPS position interpolation (Uber-style)
 * Animates lat/lng/rotation from old to new over ~1.5s
 */
const useAnimatedPosition = (targetLat, targetLng, targetRotation, duration = 1500) => {
  const animRef = useRef(null);
  const prevRef = useRef({ lat: targetLat, lng: targetLng, rotation: targetRotation });
  const [pos, setPos] = useState({ lat: targetLat, lng: targetLng, rotation: targetRotation });

  useEffect(() => {
    // Skip if no real change (same position)
    if (targetLat === prevRef.current.lat && targetLng === prevRef.current.lng && targetRotation === prevRef.current.rotation) {
      return;
    }

    const startLat = prevRef.current.lat;
    const startLng = prevRef.current.lng;
    const startRot = prevRef.current.rotation;

    // Normalize rotation difference to shortest path (-180 to 180)
    let rotDiff = targetRotation - startRot;
    if (rotDiff > 180) rotDiff -= 360;
    if (rotDiff < -180) rotDiff += 360;

    const startTime = performance.now();

    // Cancel any running animation
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const animate = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Ease-out cubic for smooth deceleration
      const ease = 1 - Math.pow(1 - t, 3);

      const lat = startLat + (targetLat - startLat) * ease;
      const lng = startLng + (targetLng - startLng) * ease;
      const rotation = startRot + rotDiff * ease;

      setPos({ lat, lng, rotation });

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        prevRef.current = { lat: targetLat, lng: targetLng, rotation: targetRotation };
        animRef.current = null;
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [targetLat, targetLng, targetRotation, duration]);

  // Update prevRef on unmount-free initial render
  useEffect(() => {
    if (prevRef.current.lat === undefined) {
      prevRef.current = { lat: targetLat, lng: targetLng, rotation: targetRotation };
      setPos({ lat: targetLat, lng: targetLng, rotation: targetRotation });
    }
  }, []);

  return pos;
};

/**
 * Vehicle Marker Component - Custom car icon with rotation
 * Memoized to prevent unnecessary re-renders
 */
const VehicleMarker = memo(({ vehicle, isSelected, onClick, onHover }) => {
  const movementStatus = getVehicleMovementStatus(vehicle);
  const statusColor = movementColors[movementStatus];
  const rawRotation = vehicle.direccion || vehicle.gps_rumbo || 0;
  const isMoving = movementStatus === 'moving';

  // Smooth GPS interpolation
  const { lat: animLat, lng: animLng, rotation } = useAnimatedPosition(
    vehicle.lat, vehicle.lng, rawRotation
  );

  // Memoize click handler
  const handleClick = useCallback((e) => {
    e.originalEvent.stopPropagation();
    onClick(vehicle);
  }, [onClick, vehicle]);

  // Memoize hover handlers
  const handleMouseEnter = useCallback(() => onHover(vehicle.id), [onHover, vehicle.id]);
  const handleMouseLeave = useCallback(() => onHover(null), [onHover]);

  return (
    <Marker
      longitude={animLng}
      latitude={animLat}
      anchor="center"
      rotation={rotation}
      onClick={handleClick}
    >
      <div
        className={`maplibre-vehicle-marker ${isSelected ? 'selected' : ''} status-${movementStatus}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Car SVG */}
        <svg viewBox="0 0 28 40" className="vehicle-svg">
          <defs>
            <linearGradient id={`car-gradient-${vehicle.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: statusColor.primary, stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: statusColor.primary, stopOpacity: 0.85 }} />
            </linearGradient>
            <filter id="car-shadow">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.4"/>
            </filter>
          </defs>

          {/* Shadow */}
          <ellipse cx="14" cy="38" rx="10" ry="2" fill="rgba(0,0,0,0.2)"/>

          {/* Main car body */}
          <path d={`M 8 10 L 8 6 Q 8 4 10 4 L 18 4 Q 20 4 20 6 L 20 10 L 20 32 L 20 34 Q 20 36 18 36 L 10 36 Q 8 36 8 34 L 8 32 Z`}
                fill={`url(#car-gradient-${vehicle.id})`}
                filter="url(#car-shadow)"/>

          {/* Hood */}
          <rect x="9" y="3" width="10" height="6" rx="2" fill={statusColor.primary}/>

          {/* Front windshield */}
          <path d="M 10 8 Q 10 7 11 7 L 17 7 Q 18 7 18 8 L 18 12 L 10 12 Z" fill="rgba(135,206,250,0.75)"/>
          <rect x="11" y="8" width="6" height="3" rx="1" fill="rgba(255,255,255,0.3)"/>

          {/* Roof/Cabin */}
          <rect x="9" y="13" width="10" height="10" rx="2" fill={`${statusColor.primary}dd`}/>

          {/* Side windows */}
          <rect x="9.5" y="14" width="4" height="8" rx="1" fill="rgba(135,206,250,0.6)"/>
          <rect x="14.5" y="14" width="4" height="8" rx="1" fill="rgba(135,206,250,0.6)"/>

          {/* Trunk */}
          <rect x="9" y="24" width="10" height="9" rx="2" fill={`${statusColor.primary}cc`}/>

          {/* Rear windshield */}
          <rect x="11" y="29" width="6" height="3" rx="1" fill="rgba(135,206,250,0.5)"/>

          {/* Front headlights */}
          <circle cx="10.5" cy="5" r="1.2" fill={isMoving ? '#FFC107' : '#FFF8DC'}/>
          <circle cx="17.5" cy="5" r="1.2" fill={isMoving ? '#FFC107' : '#FFF8DC'}/>

          {/* Rear lights */}
          <rect x="9.5" y="33" width="3" height="1.5" rx="0.5" fill="#EF4444"/>
          <rect x="15.5" y="33" width="3" height="1.5" rx="0.5" fill="#EF4444"/>

          {/* Wheels */}
          <ellipse cx="6" cy="12" rx="2.5" ry="4" fill="#1a1a1a"/>
          <ellipse cx="22" cy="12" rx="2.5" ry="4" fill="#1a1a1a"/>
          <ellipse cx="6" cy="28" rx="2.5" ry="4" fill="#1a1a1a"/>
          <ellipse cx="22" cy="28" rx="2.5" ry="4" fill="#1a1a1a"/>

          {/* Rims */}
          <ellipse cx="6" cy="12" rx="1.2" ry="2" fill="#6b7280"/>
          <ellipse cx="22" cy="12" rx="1.2" ry="2" fill="#6b7280"/>
          <ellipse cx="6" cy="28" rx="1.2" ry="2" fill="#6b7280"/>
          <ellipse cx="22" cy="28" rx="1.2" ry="2" fill="#6b7280"/>

          {/* Side mirrors */}
          <circle cx="5" cy="17" r="1.5" fill={`${statusColor.primary}aa`}/>
          <circle cx="23" cy="17" r="1.5" fill={`${statusColor.primary}aa`}/>
        </svg>

        {/* Status indicator */}
        <div className={`status-indicator status-${movementStatus}`} />

        {/* Plate label */}
        <div className="plate-label">{vehicle.placa || vehicle.id}</div>
      </div>
    </Marker>
  );
});

/**
 * Stop Marker Component - Memoized
 */
const StopMarker = memo(({ stop, index, isCompleted, isSkipped, onClick }) => {
  const handleClick = useCallback((e) => {
    e.originalEvent.stopPropagation();
    if (onClick) onClick(stop, index);
  }, [onClick, stop, index]);

  const statusClass = isSkipped ? 'skipped' : isCompleted ? 'completed' : 'pending';

  return (
    <Marker
      longitude={stop.lng || stop.longitud}
      latitude={stop.lat || stop.latitud}
      anchor="bottom"
      onClick={handleClick}
    >
      <div className={`maplibre-stop-marker ${statusClass}`}>
        <div className="stop-pin">
          <div className="stop-number">{index + 1}</div>
        </div>
        <div className="stop-shadow" />
      </div>
    </Marker>
  );
});

/**
 * Geofence Circle Component - Memoized with optimized point count
 */
const GeofenceCircle = memo(({ geofence, onClick }) => {
  // Use the helper function to create circle GeoJSON
  const circleGeoJSON = useMemo(() =>
    createCircleGeoJSON(
      { lat: geofence.latitud, lng: geofence.longitud },
      geofence.radio
    ),
    [geofence.latitud, geofence.longitud, geofence.radio]
  );

  // Memoize paint objects to prevent re-renders
  const fillPaint = useMemo(() => ({
    'fill-color': geofence.color || '#ef4444',
    'fill-opacity': 0.15
  }), [geofence.color]);

  const linePaint = useMemo(() => ({
    'line-color': geofence.color || '#ef4444',
    'line-width': 2,
    'line-dasharray': [5, 5]
  }), [geofence.color]);

  // Handler for center marker click
  const handleCenterClick = useCallback((e) => {
    e.originalEvent.stopPropagation();
    if (onClick) onClick(geofence);
  }, [onClick, geofence]);

  return (
    <>
      <Source id={`geofence-${geofence._id}`} type="geojson" data={circleGeoJSON}>
        <Layer
          id={`geofence-fill-${geofence._id}`}
          type="fill"
          paint={fillPaint}
        />
        <Layer
          id={`geofence-stroke-${geofence._id}`}
          type="line"
          paint={linePaint}
        />
      </Source>
      {/* Center marker for clicking */}
      <Marker
        longitude={geofence.longitud}
        latitude={geofence.latitud}
        anchor="center"
        onClick={handleCenterClick}
      >
        <div className="geofence-center-marker">
          <Target size={20} />
        </div>
      </Marker>
    </>
  );
});

/**
 * Route Line Component - Memoized with optimized GeoJSON
 * Expects coordinates in [lng, lat] format (GeoJSON standard)
 */
const RouteLine = memo(({ coordinates, color, opacity, width, dashArray, id }) => {
  // Memoize GeoJSON to prevent recalculation
  // Coordinates should already be in [lng, lat] format from Mapbox Directions API
  const routeGeoJSON = useMemo(() => ({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coordinates // Already in [lng, lat] format
    }
  }), [coordinates]);

  // Memoize paint object to prevent re-renders
  const paint = useMemo(() => ({
    'line-color': color,
    'line-width': width,
    'line-opacity': opacity,
    ...(dashArray ? { 'line-dasharray': dashArray } : {})
  }), [color, width, opacity, dashArray]);

  // Static layout object
  const layout = useMemo(() => ({
    'line-cap': 'round',
    'line-join': 'round'
  }), []);

  return (
    <Source id={id} type="geojson" data={routeGeoJSON}>
      <Layer
        id={`${id}-line`}
        type="line"
        paint={paint}
        layout={layout}
      />
    </Source>
  );
});

/**
 * Main MapLibre Component
 */
const MapLibreComponent = ({
  camiones = [],
  rutas = [],
  personnel = [],
  lugares = [],
  geofences = [],
  allRouteProgress = [],
  userType,
  showRealTime = true,
  selectedTruck = null,
  serviceTypeFilter = 'todos',
  onViewLocationReports,
  isMaximized = false,
  gpsTrail = [],
  showMapboxRoute = true
}) => {
  const mapRef = useRef(null);
  const containerRef = useRef(null);

  // State
  const [isContainerReady, setIsContainerReady] = useState(false);
  const [mapTheme, setMapTheme] = useState(() => localStorage.getItem('mapTheme') || 'dark');
  const [selectedVehicleId, setSelectedVehicleId] = useState(selectedTruck);
  const [hoveredVehicleId, setHoveredVehicleId] = useState(null);
  const [popupInfo, setPopupInfo] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [geofenceMode, setGeofenceMode] = useState(false);
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [newGeofence, setNewGeofence] = useState(null);
  const [playbackMode, setPlaybackMode] = useState(false);
  const [playbackVehicle, setPlaybackVehicle] = useState(null);
  const [roadRoutes, setRoadRoutes] = useState({});
  const [routesLoading, setRoutesLoading] = useState(false);
  const [selectedGeofence, setSelectedGeofence] = useState(null);
  const [geofenceType, setGeofenceType] = useState('ambos');
  const [showTruckModal, setShowTruckModal] = useState(false);
  const [showTrails, setShowTrails] = useState(true);

  // Convex mutations
  const syncSafeTag = useAction(api.safetag.syncAllVehicles);
  const createGeofence = useMutation(api.geofences.create);
  const deleteGeofence = useMutation(api.geofences.remove);

  // Normalize vehicles data
  const normalizedVehicles = useMemo(() => {
    return camiones.map(c => ({
      ...c,
      lat: c.gps_latitud || c.lat,
      lng: c.gps_longitud || c.lng,
      id: c.id || c._id,
      placa: c.placa || c.vehiculo_placa
    })).filter(v => v.lat && v.lng);
  }, [camiones]);

  // Calculate initial view state
  const initialViewState = useMemo(() => {
    // If there are routes without vehicles (report mode), center on stops
    if (rutas && rutas.length > 0 && normalizedVehicles.length === 0) {
      const allStops = rutas.flatMap(ruta => ruta.paradas || []);
      const validStops = allStops.filter(p => (p.lat || p.latitud) && (p.lng || p.longitud));

      if (validStops.length > 0) {
        const lats = validStops.map(p => p.lat || p.latitud);
        const lngs = validStops.map(p => p.lng || p.longitud);
        const centerLat = lats.reduce((sum, lat) => sum + lat, 0) / lats.length;
        const centerLng = lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length;

        return {
          longitude: centerLng,
          latitude: centerLat,
          zoom: 14
        };
      }
    }

    // If there are vehicles, center on them
    if (normalizedVehicles.length > 0) {
      const lats = normalizedVehicles.map(v => v.lat);
      const lngs = normalizedVehicles.map(v => v.lng);
      const centerLat = lats.reduce((sum, lat) => sum + lat, 0) / lats.length;
      const centerLng = lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length;

      return {
        longitude: centerLng,
        latitude: centerLat,
        zoom: 13
      };
    }

    return {
      ...DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM
    };
  }, [rutas, normalizedVehicles]);

  // Check when container has proper dimensions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let resolved = false;
    const markReady = () => {
      if (resolved) return;
      resolved = true;
      setIsContainerReady(true);
    };

    const checkDimensions = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width > 0 && height > 0) {
        markReady();
      }
    };

    // Check immediately
    checkDimensions();

    // Also use ResizeObserver for dynamic changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          markReady();
        }
      }
    });

    resizeObserver.observe(container);

    // Fallback: force ready after 1.5s even if container has 0 dimensions
    // This prevents infinite spinner on mobile where vh units resolve late
    const fallbackTimer = setTimeout(() => {
      if (!resolved) {
        console.warn('⚠️ Map container dimensions not detected, forcing render');
        markReady();
      }
    }, 1500);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Resize map when container dimensions change (e.g. fullscreen mode)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isContainerReady) return;

    const resizeObserver = new ResizeObserver(() => {
      const map = mapRef.current?.getMap?.();
      if (map) {
        requestAnimationFrame(() => map.resize());
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [isContainerReady]);

  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem('mapTheme', mapTheme);
  }, [mapTheme]);

  // Calculate routes with Mapbox Directions API (debounced for live navigation)
  useEffect(() => {
    if (!rutas || rutas.length === 0 || !showMapboxRoute) {
      setRoadRoutes(prev => Object.keys(prev).length === 0 ? prev : {});
      setRoutesLoading(false);
      return;
    }

    // Debounce: wait 800ms before calling API (avoids spam during live GPS updates)
    const debounceTimer = setTimeout(() => {
      setRoutesLoading(true);

      const fetchAllRoutes = async () => {
        const newRoutes = {};

        for (const ruta of rutas) {
          const paradas = (ruta.paradas || []).filter(p =>
            (p.lat || p.latitud) && (p.lng || p.longitud)
          );

          if (paradas.length >= 2) {
            try {
              const routeCoords = await calcularRutaCompleta(paradas);
              if (routeCoords && routeCoords.length > 0) {
                newRoutes[ruta._id || ruta.id] = routeCoords;
              }
            } catch (error) {
              console.error(`Error calculando ruta ${ruta.nombre || ruta._id}:`, error);
              // Fallback to direct line
              newRoutes[ruta._id || ruta.id] = paradas.map(p => [
                p.lng || p.longitud,
                p.lat || p.latitud
              ]);
            }
          }
        }

        setRoadRoutes(newRoutes);
        setRoutesLoading(false);
      };

      fetchAllRoutes();
    }, 800);

    return () => clearTimeout(debounceTimer);
  }, [rutas, showMapboxRoute]);

  // Handle vehicle selection
  const handleVehicleClick = useCallback((vehicle) => {
    const isAlreadySelected = selectedVehicleId === vehicle.id;
    setSelectedVehicleId(isAlreadySelected ? null : vehicle.id);
    setShowTruckModal(!isAlreadySelected);
    setPopupInfo(null); // Close popup when opening modal
    setSelectedGeofence(null); // Close geofence popup
  }, [selectedVehicleId]);

  // Handle map click for geofence creation
  const handleMapClick = useCallback((event) => {
    if (geofenceMode) {
      const { lngLat } = event;
      setNewGeofence({
        lat: lngLat.lat,
        lng: lngLat.lng,
        radio: 150,
        nombre: '',
        descripcion: '',
        tipo: 'ambos'
      });
      setShowGeofenceModal(true);
      setGeofenceMode(false);
    } else {
      setPopupInfo(null);
    }
  }, [geofenceMode]);

  // Save geofence
  const handleSaveGeofence = async () => {
    if (!newGeofence || !newGeofence.nombre) return;

    try {
      await createGeofence({
        nombre: newGeofence.nombre,
        descripcion: newGeofence.descripcion || '',
        latitud: newGeofence.lat,
        longitud: newGeofence.lng,
        radio: newGeofence.radio,
        color: '#ef4444',
        tipo: geofenceType
      });
      console.log('✅ Geofence creado:', newGeofence.nombre);
      setNewGeofence(null);
      setShowGeofenceModal(false);
      setGeofenceType('ambos'); // Reset to default
    } catch (error) {
      console.error('❌ Error creando geofence:', error);
    }
  };

  // Handle geofence click - show popup with info and delete button
  const handleGeofenceClick = useCallback((geofence) => {
    setSelectedGeofence(geofence);
    setPopupInfo(null); // Clear vehicle popup
  }, []);

  // Delete geofence
  const handleDeleteGeofence = async (id) => {
    try {
      await deleteGeofence({ id });
      console.log('✅ Geofence eliminado');
      setSelectedGeofence(null); // Close popup
    } catch (error) {
      console.error('❌ Error eliminando geofence:', error);
    }
  };

  // Force GPS sync
  const handleForceSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      console.log('🔄 Forzando sincronización GPS...');
      await syncSafeTag();
      console.log('✅ Sincronización completada');
    } catch (error) {
      console.error('❌ Error en sincronización:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Get selected vehicle's route
  const selectedVehicle = normalizedVehicles.find(v => v.id === selectedVehicleId);
  const selectedRoute = useMemo(() => {
    if (!selectedVehicle) return null;
    const rutaId = selectedVehicle.rutaAsignada || selectedVehicle.ruta_id;
    if (!rutaId) return null;
    return rutas.find(r => r._id === rutaId || r.id === rutaId || r.nombre === rutaId);
  }, [selectedVehicle, rutas]);

  // Get route coordinates for selected vehicle
  const selectedRouteCoords = useMemo(() => {
    if (!selectedRoute) return null;
    const routeKey = selectedRoute._id || selectedRoute.id;
    return roadRoutes[routeKey] || null;
  }, [selectedRoute, roadRoutes]);

  // Get selected truck data (for sidebar modal)
  const getSelectedTruck = useCallback(() => {
    if (!selectedVehicleId) return null;
    const vehicle = normalizedVehicles.find(v => v.id === selectedVehicleId);
    if (!vehicle) return null;
    return {
      ...vehicle,
      _id: vehicle._id || vehicle.id,
      lat: vehicle.lat || vehicle.gps_latitud,
      lng: vehicle.lng || vehicle.gps_longitud
    };
  }, [selectedVehicleId, normalizedVehicles]);

  // Close truck modal
  const closeTruckModal = useCallback(() => {
    setShowTruckModal(false);
  }, []);

  // Get selected truck's route
  const getSelectedTruckRoute = useCallback(() => {
    const truck = getSelectedTruck();
    if (!truck) return null;
    const rutaId = truck.rutaAsignada || truck.ruta_id;
    if (!rutaId) return null;
    return rutas.find(r => r._id === rutaId || r.id === rutaId || r.nombre === rutaId);
  }, [getSelectedTruck, rutas]);

  // Get stop status (completed, current, pending)
  const getStopStatus = useCallback((index, truck) => {
    if (!truck) return 'pending';
    const currentStop = truck.paradaActual ?? 0;
    if (index < currentStop) return 'completed';
    if (index === currentStop) return 'current';
    return 'pending';
  }, []);

  // Get route progress for current truck
  const getRouteProgress = useCallback(() => {
    const truck = getSelectedTruck();
    if (!truck) return null;
    const conductorName = truck.conductor || truck.conductor_nombre;
    if (!conductorName) return null;
    const currentRoute = getSelectedTruckRoute();

    // Try matching by conductor + ruta_id first, then by conductor + estado en_progreso
    const byRoute = currentRoute ? allRouteProgress.find(rp =>
      rp.conductor_nombre === conductorName &&
      rp.estado === 'en_progreso' &&
      (rp.ruta_id === currentRoute._id || rp.ruta_id === currentRoute.id)
    ) : null;

    if (byRoute) return byRoute;

    // Fallback: find any active progress for this conductor
    return allRouteProgress.find(rp =>
      rp.conductor_nombre === conductorName &&
      rp.estado === 'en_progreso'
    ) || null;
  }, [getSelectedTruck, getSelectedTruckRoute, allRouteProgress]);

  return (
    <div ref={containerRef} className="maplibre-component-wrapper">
      {!isContainerReady ? (
        <div className="map-loading-placeholder">
          <RefreshCw size={24} className="spin" />
          <span>Cargando mapa...</span>
        </div>
      ) : (
      <Map
        ref={mapRef}
        mapLib={maplibregl}
        initialViewState={initialViewState}
        mapStyle={MAP_STYLES[mapTheme]}
        style={{ width: '100%', height: '100%', minHeight: '400px' }}

        // ============================================
        // ZOOM & BOUNDS OPTIMIZATION
        // ============================================
        maxZoom={18}
        minZoom={2}

        // Prevent world repetition (renders only one world copy)
        renderWorldCopies={false}

        // ============================================
        // PERFORMANCE OPTIMIZATIONS
        // ============================================
        // Disable tile fade-in for instant loading
        fadeDuration={0}

        // Use system fonts for labels (faster than downloading fonts)
        localIdeographFontFamily="'Noto Sans', 'Noto Sans CJK SC', sans-serif"

        // Disable resource timing collection
        collectResourceTiming={false}

        // Don't update URL hash
        hash={false}

        // Preserve drawing buffer for screenshots (false = better perf)
        preserveDrawingBuffer={false}

        // Antialias for smooth edges
        antialias={true}

        // Cross-source collisions for better label placement
        crossSourceCollisions={true}

        // ============================================
        // INTERACTION OPTIMIZATIONS
        // ============================================
        dragRotate={false}
        pitchWithRotate={false}
        touchZoomRotate={true}
        scrollZoom={true}
        doubleClickZoom={true}
        keyboard={true}
        touchPitch={false}

        // Box zoom for power users
        boxZoom={true}

        // ============================================
        // EVENT HANDLERS
        // ============================================
        onClick={handleMapClick}
        cursor={geofenceMode ? 'crosshair' : 'grab'}
      >
        {/* Scale control removed for cleaner UI */}

        {/* Geofences */}
        {geofences.map(geo => (
          <GeofenceCircle
            key={geo._id}
            geofence={geo}
            onClick={handleGeofenceClick}
          />
        ))}

        {/* Geofence Preview (while modal is open) */}
        {showGeofenceModal && newGeofence && (
          <Source
            id="geofence-preview"
            type="geojson"
            data={createCircleGeoJSON(newGeofence, newGeofence.radio)}
          >
            <Layer
              id="geofence-preview-fill"
              type="fill"
              paint={{
                'fill-color': '#0078D4',
                'fill-opacity': 0.2
              }}
            />
            <Layer
              id="geofence-preview-line"
              type="line"
              paint={{
                'line-color': '#0078D4',
                'line-width': 2,
                'line-dasharray': [3, 3]
              }}
            />
          </Source>
        )}

        {/* Route lines for selected vehicle */}
        {showTrails && selectedRouteCoords && selectedRouteCoords.length > 1 && (
          <>
            {/* Glow effect */}
            <RouteLine
              id="selected-route-glow"
              coordinates={selectedRouteCoords}
              color={userType === 'conductor' ? '#0078D4' : '#10b981'}
              opacity={0.3}
              width={16}
            />
            {/* Main route line */}
            <RouteLine
              id="selected-route-main"
              coordinates={selectedRouteCoords}
              color={userType === 'conductor' ? '#0078D4' : '#10b981'}
              opacity={0.95}
              width={7}
            />
            {/* Highlight */}
            <RouteLine
              id="selected-route-highlight"
              coordinates={selectedRouteCoords}
              color={userType === 'conductor' ? '#60a5fa' : '#34d399'}
              opacity={0.9}
              width={3}
            />
          </>
        )}

        {/* GPS Trail (for reports) */}
        {gpsTrail && gpsTrail.length > 1 && (
          <>
            <RouteLine
              id="gps-trail-glow"
              coordinates={gpsTrail.map(p => [p.lng, p.lat])}
              color="#f97316"
              opacity={0.25}
              width={10}
            />
            <RouteLine
              id="gps-trail-main"
              coordinates={gpsTrail.map(p => [p.lng, p.lat])}
              color="#f97316"
              opacity={0.9}
              width={4}
            />
          </>
        )}

        {/* Historic routes (report mode - no vehicles) */}
        {normalizedVehicles.length === 0 && rutas.map(ruta => {
          const routeKey = ruta._id || ruta.id;
          const routeCoords = roadRoutes[routeKey];

          if (!routeCoords || routeCoords.length < 2) return null;

          return (
            <div key={routeKey}>
              <RouteLine
                id={`historic-route-${routeKey}-glow`}
                coordinates={routeCoords}
                color="#10b981"
                opacity={0.3}
                width={16}
              />
              <RouteLine
                id={`historic-route-${routeKey}-main`}
                coordinates={routeCoords}
                color="#10b981"
                opacity={0.95}
                width={7}
              />

              {/* Stop markers for historic routes */}
              {(ruta._paradasOriginales || ruta.paradas || [])
                .filter(stop => !stop._isGpsOrigin)
                .map((stop, idx) => {
                const lat = stop.lat || stop.latitud;
                const lng = stop.lng || stop.longitud;
                if (!lat || !lng) return null;

                return (
                  <StopMarker
                    key={`historic-stop-${routeKey}-${idx}`}
                    stop={{ ...stop, lat, lng }}
                    index={idx}
                    isCompleted={true}
                  />
                );
              })}
            </div>
          );
        })}

        {/* Stop markers for selected route (use original paradas if available for live nav) */}
        {selectedRoute && (selectedRoute._paradasOriginales || selectedRoute.paradas || [])
          .filter(stop => !stop._isGpsOrigin)
          .map((stop, idx) => {
          const lat = stop.lat || stop.latitud;
          const lng = stop.lng || stop.longitud;
          if (!lat || !lng) return null;

          const isCompleted = (stop.completada || stop.completed) && stop.completada !== false;
          const isSkipped = stop.completada === false && stop.motivo_no_completada;

          return (
            <StopMarker
              key={`stop-${selectedRoute._id || selectedRoute.id}-${idx}`}
              stop={{ ...stop, lat, lng }}
              index={idx}
              isCompleted={isCompleted}
              isSkipped={isSkipped}
            />
          );
        })}

        {/* Location markers (cleaning/fumigation) */}
        {lugares
          .filter(lugar => lugar.latitud && lugar.longitud)
          .map(lugar => (
            <Marker
              key={lugar._id || lugar.id}
              longitude={lugar.longitud}
              latitude={lugar.latitud}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopupInfo({ type: 'location', ...lugar });
              }}
            >
              <div className="maplibre-location-marker">
                <MapPin size={24} />
              </div>
            </Marker>
          ))
        }

        {/* Vehicle markers */}
        {normalizedVehicles.map(vehicle => (
          <VehicleMarker
            key={vehicle.id}
            vehicle={vehicle}
            isSelected={selectedVehicleId === vehicle.id}
            onClick={handleVehicleClick}
            onHover={setHoveredVehicleId}
          />
        ))}

        {/* Popup for selected vehicle */}
        {popupInfo && popupInfo.type !== 'location' && (
          <Popup
            longitude={popupInfo.lng}
            latitude={popupInfo.lat}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
            className="maplibre-vehicle-popup"
          >
            <div className="popup-content">
              <div className="popup-header">
                <h4><Truck size={16} /> {popupInfo.placa || popupInfo.id}</h4>
                <span className={`status-badge status-${getVehicleMovementStatus(popupInfo)}`}>
                  {movementColors[getVehicleMovementStatus(popupInfo)].label}
                </span>
              </div>

              <div className="popup-stats">
                <div className="stat">
                  <Gauge size={14} />
                  <span>{popupInfo.gps_velocidad || 0} km/h</span>
                </div>
                <div className="stat">
                  <Clock size={14} />
                  <span>{formatTimeAgo(popupInfo.gps_ultima_actualizacion)}</span>
                </div>
              </div>

              {popupInfo.conductor && (
                <div className="popup-driver">
                  <strong>Conductor:</strong> {popupInfo.conductor}
                </div>
              )}

              <button
                className="btn-view-details"
                onClick={() => {
                  setPlaybackVehicle(popupInfo);
                  setPlaybackMode(true);
                }}
              >
                <Play size={14} /> Ver historial GPS
              </button>
            </div>
          </Popup>
        )}

        {/* Popup for location */}
        {popupInfo && popupInfo.type === 'location' && (
          <Popup
            longitude={popupInfo.longitud}
            latitude={popupInfo.latitud}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
            className="maplibre-location-popup"
          >
            <div className="location-popup-inline">
              <h4 className="location-popup-inline__title">
                <MapPin size={16} />
                {popupInfo.nombre}
              </h4>
              {popupInfo.descripcion && (
                <p className="location-popup-inline__desc">{popupInfo.descripcion}</p>
              )}
              <div className="location-popup-inline__coords">
                {popupInfo.latitud.toFixed(4)}, {popupInfo.longitud.toFixed(4)}
              </div>
              <button
                className="location-popup-inline__btn"
                onClick={() => {
                  if (onViewLocationReports) {
                    onViewLocationReports(popupInfo._id || popupInfo.id);
                  }
                }}
              >
                📊 Ver Reportes de Limpieza
              </button>
            </div>
          </Popup>
        )}

        {/* Popup for selected geofence */}
        {selectedGeofence && (
          <Popup
            longitude={selectedGeofence.longitud}
            latitude={selectedGeofence.latitud}
            anchor="bottom"
            onClose={() => setSelectedGeofence(null)}
            closeButton={true}
            closeOnClick={false}
            className="maplibre-geofence-popup"
          >
            <div className="popup-content geofence-popup-content">
              <div className="popup-header">
                <h4><Target size={16} /> {selectedGeofence.nombre}</h4>
              </div>
              <div className="geofence-info">
                <p><strong>Tipo:</strong> {selectedGeofence.tipo || 'ambos'}</p>
                <p><strong>Radio:</strong> {selectedGeofence.radio}m</p>
                {selectedGeofence.descripcion && (
                  <p className="geofence-description">{selectedGeofence.descripcion}</p>
                )}
              </div>
              <button
                className="btn-delete-geofence"
                onClick={() => handleDeleteGeofence(selectedGeofence._id)}
              >
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </Popup>
        )}
      </Map>
      )}

      {/* Map controls panel - hidden for conductor (they use nav button instead) */}
      {userType !== 'conductor' && (
      <div className={`map-controls-panel ${isMaximized ? 'minimized' : ''}`}>
        {/* Loading indicator */}
        {routesLoading && (
          <div className="control-loading">
            <RefreshCw size={14} className="spin" />
            <span>Calculando rutas...</span>
          </div>
        )}

        {/* Toggle Routes */}
        <button
          className={`control-btn ${showTrails ? 'active' : ''}`}
          onClick={() => setShowTrails(prev => !prev)}
          title={showTrails ? 'Ocultar rutas' : 'Mostrar rutas'}
        >
          <Route size={18} />
        </button>

        {/* Theme toggle */}
        <button
          className="control-btn"
          onClick={() => setMapTheme(prev => prev === 'dark' ? 'light' : 'dark')}
          title={mapTheme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {mapTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Sync GPS button */}
        <button
          className={`control-btn ${isSyncing ? 'syncing' : ''}`}
          onClick={handleForceSync}
          disabled={isSyncing}
          title="Sincronizar GPS"
        >
          <RefreshCw size={18} className={isSyncing ? 'spin' : ''} />
        </button>

        {/* Geofence mode toggle */}
        <button
          className={`control-btn ${geofenceMode ? 'active' : ''}`}
          onClick={() => setGeofenceMode(prev => !prev)}
          title={geofenceMode ? 'Cancelar geofence' : 'Crear geofence'}
        >
          <Target size={18} />
        </button>

        {/* Deselect vehicle */}
        {selectedVehicleId && (
          <button
            className="control-btn"
            onClick={() => {
              setSelectedVehicleId(null);
              setShowTruckModal(false);
            }}
            title="Deseleccionar vehículo"
          >
            <X size={18} />
          </button>
        )}
      </div>
      )}

      {/* Map Legend - hidden for conductor */}
      {!isMaximized && userType !== 'conductor' && (
        <div className="map-legend">
          <div className="legend-item">
            <span className="legend-dot legend-moving"></span>
            <span className="legend-label">En movimiento</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-stopped"></span>
            <span className="legend-label">Detenido</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-parked"></span>
            <span className="legend-label">Parqueado</span>
          </div>
        </div>
      )}

      {/* Geofence mode hint */}
      {geofenceMode && (
        <div className="geofence-hint">
          <Target size={16} />
          <span>Haz click en el mapa para crear un geofence</span>
        </div>
      )}

      {/* Geofence creation modal */}
      {showGeofenceModal && newGeofence && (
        <div className="geofence-modal-overlay">
          <div className="geofence-modal">
            <h3>Crear Geofence</h3>

            <div className="form-group">
              <label>Nombre</label>
              <input
                type="text"
                value={newGeofence.nombre}
                onChange={(e) => setNewGeofence(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Nombre del geofence"
              />
            </div>

            <div className="form-group">
              <label>Radio (metros)</label>
              <input
                type="number"
                value={newGeofence.radio}
                onChange={(e) => setNewGeofence(prev => ({ ...prev, radio: parseInt(e.target.value) || 150 }))}
                min="50"
                max="5000"
              />
            </div>

            <div className="form-group">
              <label>Tipo de alerta</label>
              <div className="geofence-type-selector">
                <label className={`type-option ${geofenceType === 'entrada' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="geofenceType"
                    value="entrada"
                    checked={geofenceType === 'entrada'}
                    onChange={(e) => setGeofenceType(e.target.value)}
                  />
                  <span>Entrada</span>
                </label>
                <label className={`type-option ${geofenceType === 'salida' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="geofenceType"
                    value="salida"
                    checked={geofenceType === 'salida'}
                    onChange={(e) => setGeofenceType(e.target.value)}
                  />
                  <span>Salida</span>
                </label>
                <label className={`type-option ${geofenceType === 'ambos' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="geofenceType"
                    value="ambos"
                    checked={geofenceType === 'ambos'}
                    onChange={(e) => setGeofenceType(e.target.value)}
                  />
                  <span>Ambos</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <textarea
                value={newGeofence.descripcion}
                onChange={(e) => setNewGeofence(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Descripción opcional"
              />
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => {
                setShowGeofenceModal(false);
                setNewGeofence(null);
                setGeofenceType('ambos');
              }}>
                Cancelar
              </button>
              <button className="btn-save" onClick={handleSaveGeofence}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GPS Playback Modal */}
      {playbackMode && playbackVehicle && (
        <GPSPlaybackModal
          vehicle={playbackVehicle}
          onClose={() => {
            setPlaybackMode(false);
            setPlaybackVehicle(null);
          }}
        />
      )}

      {/* Vehicle Details Sidebar Modal */}
      {showTruckModal && getSelectedTruck() && (() => {
        const truck = getSelectedTruck();
        const movementStatus = getVehicleMovementStatus(truck);
        const statusInfo = movementColors[movementStatus];
        const hasGPS = truck.safetag_device_id || truck.gps_latitud;
        const currentRoute = getSelectedTruckRoute();
        const progress = getRouteProgress();
        const completedStopsData = progress?.paradas_completadas || [];

        console.log('🔍 ADMIN SIDEBAR DEBUG:', {
          truckPlaca: truck.placa,
          conductorName: truck.conductor || truck.conductor_nombre,
          currentRouteId: currentRoute?._id || currentRoute?.id,
          progressFound: !!progress,
          progressId: progress?._id,
          completedStopsCount: completedStopsData.length,
          completedStopsData: completedStopsData.map(s => ({
            index: s.index,
            completada: s.completada,
            motivo: s.motivo_no_completada
          })),
          allProgressCount: allRouteProgress.length
        });

        // Format status display
        const displayEstado = truck.estado === 'en_ruta' ? 'En ruta' :
                             truck.estado === 'disponible' ? 'Disponible' :
                             truck.estado === 'en_mantenimiento' ? 'En mantenimiento' :
                             truck.estado || 'Sin estado';

        const estadoColor = truck.estado === 'en_ruta' ? '#10b981' :
                           truck.estado === 'disponible' ? '#3b82f6' :
                           truck.estado === 'en_mantenimiento' ? '#f59e0b' : '#6b7280';

        return (
          <div className="truck-modal-overlay" onClick={closeTruckModal}>
            <div className="truck-modal-v2" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="truck-modal-header-v2">
                <div className="header-top-row">
                  <div className="vehicle-badge-large">
                    <Truck size={20} />
                  </div>
                  <button className="modal-close-btn-v2" onClick={closeTruckModal}>
                    <X size={18} />
                  </button>
                </div>

                <div className="header-info">
                  <h2 className="vehicle-placa">{truck.placa || truck.id}</h2>
                  {(truck.marca || truck.modelo) && (
                    <p className="vehicle-model">
                      {[truck.marca, truck.modelo, truck.anio].filter(Boolean).join(' • ')}
                    </p>
                  )}
                  <div className="header-badges">
                    <span className="badge-service">
                      {truck.tipo_servicio === 'fumigacion' ? (
                        <><Spray size={14} /><span>Fumigación</span></>
                      ) : (
                        <><Recycle size={14} /><span>Recolección</span></>
                      )}
                    </span>
                    <span className={`badge-movement badge-movement--${movementStatus}`}>
                      <span className="badge-dot"></span>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="truck-modal-content-v2">
                {/* GPS Real-time Section */}
                {hasGPS && (
                  <div className="info-section">
                    <div className="section-title">
                      <Satellite size={16} />
                      <span>GPS en Tiempo Real</span>
                      {truck.gps_en_linea ? (
                        <span className="status-pill status-pill--online">
                          <span className="pill-dot"></span>En línea
                        </span>
                      ) : (
                        <span className="status-pill status-pill--offline">Offline</span>
                      )}
                    </div>

                    <div className="stats-grid-3">
                      <div className="stat-box">
                        <div className="stat-icon-small"><Gauge size={18} /></div>
                        <div className="stat-data">
                          <span className="stat-number">{truck.gps_velocidad ?? 0}</span>
                          <span className="stat-unit">km/h</span>
                        </div>
                        <span className="stat-label-small">Velocidad</span>
                      </div>

                      <div className="stat-box">
                        <div className="stat-icon-small"><Signal size={18} /></div>
                        <div className="stat-data">
                          <span className="stat-number">{truck.gps_senal ?? '—'}</span>
                          <span className="stat-unit">%</span>
                        </div>
                        <span className="stat-label-small">Señal</span>
                      </div>

                      <div className="stat-box">
                        <div className="stat-icon-small"><Clock size={18} /></div>
                        <div className="stat-data">
                          <span className="stat-number-text">
                            {formatTimeAgo(truck.gps_ultima_actualizacion)}
                          </span>
                        </div>
                        <span className="stat-label-small">Última señal</span>
                      </div>
                    </div>

                    {/* Coordinates with copy button */}
                    {truck.lat && truck.lng && (
                      <div className="coordinates-row">
                        <div className="coord-icon"><MapPin size={16} /></div>
                        <div className="coord-values">
                          <span className="coord-label">Ubicación</span>
                          <span className="coord-text">{truck.lat.toFixed(6)}, {truck.lng.toFixed(6)}</span>
                        </div>
                        <button
                          className="btn-copy-coords"
                          onClick={() => navigator.clipboard.writeText(`${truck.lat}, ${truck.lng}`)}
                          title="Copiar coordenadas"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    )}

                    {/* GPS History Button */}
                    {truck.safetag_device_id && (
                      <button
                        className="btn-history-v2"
                        onClick={() => {
                          setPlaybackVehicle({
                            _id: truck._id || truck.id,
                            deviceId: truck.safetag_device_id,
                            deviceName: truck.safetag_device_name,
                            placa: truck.placa,
                            marca: truck.marca,
                            modelo: truck.modelo,
                          });
                          setPlaybackMode(true);
                          closeTruckModal();
                        }}
                      >
                        <Play size={16} />
                        Ver Historial de Recorridos
                      </button>
                    )}
                  </div>
                )}

                {/* No GPS configured */}
                {!hasGPS && (
                  <div className="info-section">
                    <div className="section-title">
                      <Satellite size={16} />
                      <span>GPS</span>
                    </div>
                    <div className="no-gps-message">
                      <Radio size={24} />
                      <p>Este vehículo no tiene GPS configurado</p>
                    </div>
                  </div>
                )}

                {/* Operative Status Section */}
                <div className="info-section">
                  <div className="section-title">
                    <Truck size={16} />
                    <span>Estado Operativo</span>
                  </div>

                  <div className="info-rows">
                    <div className="info-row-v2">
                      <span className="info-label">Estado</span>
                      <span className="info-value" style={{ color: estadoColor, fontWeight: 600 }}>
                        {displayEstado}
                      </span>
                    </div>

                    {truck.conductor && (
                      <div className="info-row-v2">
                        <span className="info-label">Conductor</span>
                        <span className="info-value">{truck.conductor}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Route Status Section */}
                {currentRoute && (
                  <div className="info-section">
                    <div className="section-title">
                      <Navigation size={16} />
                      <span>Estado de Ruta</span>
                    </div>

                    <div className="info-rows">
                      <div className="info-row-v2">
                        <span className="info-label">Ruta</span>
                        <span className="info-value">{currentRoute.nombre}</span>
                      </div>

                      <div className="info-row-v2">
                        <span className="info-label">Progreso</span>
                        <span className="info-value" style={{ fontWeight: 600 }}>
                          {completedStopsData.filter(s => s.completada !== false).length} de {(currentRoute.paradas || []).length} paradas
                          {completedStopsData.some(s => s.completada === false) && (
                            <span style={{ color: 'var(--color-warning)', marginLeft: 6, fontSize: 12 }}>
                              ({completedStopsData.filter(s => s.completada === false).length} omitida{completedStopsData.filter(s => s.completada === false).length > 1 ? 's' : ''})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Stops List */}
                    {(currentRoute.paradas || []).length > 0 && (
                      <div className="route-stops-list">
                        <div className="stops-list-header"><span>Paradas</span></div>
                        <div className="stops-list-items">
                          {(currentRoute.paradas || []).slice(0, 8).map((parada, idx) => {
                            const completedStop = completedStopsData.find(cs => cs.index === idx);
                            const isCompleted = completedStop && completedStop.completada !== false;
                            const isSkipped = completedStop && completedStop.completada === false;

                            return (
                              <div key={idx} className={`stop-list-item ${isSkipped ? 'skipped' : isCompleted ? 'completed' : 'pending'}`}>
                                <div className="stop-number-badge">{idx + 1}</div>
                                <div className="stop-info">
                                  <div className="stop-name">{parada.nombre || parada.direccion}</div>
                                  {isCompleted && completedStop.timestamp && (
                                    <div className="stop-time">{completedStop.timestamp}</div>
                                  )}
                                  {isSkipped && (
                                    <div className="stop-skip-reason">
                                      <AlertTriangle size={12} /> {completedStop.motivo_no_completada || 'No completada'}
                                    </div>
                                  )}
                                </div>
                                <div className="stop-status-icon">
                                  {isSkipped ? <AlertTriangle size={16} /> : isCompleted ? <CheckCircle size={16} /> : <Clock size={16} />}
                                </div>
                              </div>
                            );
                          })}
                          {(currentRoute.paradas || []).length > 8 && (
                            <div className="stops-more">
                              +{(currentRoute.paradas || []).length - 8} paradas más
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Vehicle Info Section */}
                {(truck.marca || truck.modelo || truck.tipo || truck.anio) && (
                  <div className="info-section">
                    <div className="section-title">
                      <CheckCircle size={16} />
                      <span>Información del Vehículo</span>
                    </div>

                    <div className="info-rows">
                      {truck.marca && (
                        <div className="info-row-v2">
                          <span className="info-label">Marca</span>
                          <span className="info-value">{truck.marca}</span>
                        </div>
                      )}
                      {truck.modelo && (
                        <div className="info-row-v2">
                          <span className="info-label">Modelo</span>
                          <span className="info-value">{truck.modelo}</span>
                        </div>
                      )}
                      {truck.anio && (
                        <div className="info-row-v2">
                          <span className="info-label">Año</span>
                          <span className="info-value">{truck.anio}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default MapLibreComponent;
