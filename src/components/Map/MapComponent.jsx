import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Satellite, Map as MapIcon, MapPin, X, Truck, Navigation, CheckCircle, Clock } from '../Icons';
import LocationPopup from './LocationPopup';
import { DEMO_LUGARES, DEMO_CLEANING_ASSIGNMENTS } from '../../utils/demoData';
import 'leaflet/dist/leaflet.css';
import './MapComponent.css';

// Fix para iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Iconos profesionales 3D para vehículos con efectos avanzados
const createCustomIcon = (estado, direccion = 0, tipoServicio = 'recoleccion', placa = '') => {
  const colors = {
    'En ruta': { primary: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
    'Disponible': { primary: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' }
  };

  const fumigationColors = {
    'En ruta': { primary: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)' },
    'Disponible': { primary: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' }
  };

  const colorScheme = tipoServicio === 'fumigacion' ? fumigationColors : colors;
  const statusColor = colorScheme[estado] || { primary: '#6b7280', glow: 'rgba(107, 114, 128, 0.4)' };

  // SVG de camión 3D mejorado según tipo de servicio
  const truckSVG = tipoServicio === 'fumigacion' ? `
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" class="vehicle-svg">
      <!-- Sombra -->
      <ellipse cx="32" cy="58" rx="24" ry="4" fill="rgba(0,0,0,0.15)"/>
      <!-- Cuerpo del vehículo -->
      <rect x="10" y="28" width="35" height="20" rx="2" fill="${statusColor.primary}" filter="url(#shadow)"/>
      <rect x="12" y="30" width="31" height="16" rx="1" fill="url(#gradient1)"/>
      <!-- Cabina -->
      <path d="M 45 30 L 52 35 L 52 48 L 45 48 Z" fill="${statusColor.primary}" filter="url(#shadow)"/>
      <path d="M 46 32 L 51 36 L 51 46 L 46 46 Z" fill="url(#gradient1)"/>
      <!-- Ventanas -->
      <rect x="14" y="32" width="8" height="6" rx="1" fill="rgba(255,255,255,0.3)"/>
      <rect x="24" y="32" width="8" height="6" rx="1" fill="rgba(255,255,255,0.3)"/>
      <path d="M 47 36 L 50 38 L 50 44 L 47 44 Z" fill="rgba(255,255,255,0.3)"/>
      <!-- Ruedas -->
      <circle cx="18" cy="48" r="5" fill="#2d3748"/>
      <circle cx="18" cy="48" r="3" fill="#4a5568"/>
      <circle cx="42" cy="48" r="5" fill="#2d3748"/>
      <circle cx="42" cy="48" r="3" fill="#4a5568"/>
      <!-- Spray de fumigación -->
      <circle cx="8" cy="40" r="1.5" fill="rgba(255,255,255,0.6)" opacity="0.8"/>
      <circle cx="6" cy="38" r="1" fill="rgba(255,255,255,0.5)" opacity="0.6"/>
      <circle cx="10" cy="42" r="1" fill="rgba(255,255,255,0.5)" opacity="0.6"/>
      <!-- Gradientes y filtros -->
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(255,255,255,0.4);stop-opacity:1" />
          <stop offset="100%" style="stop-color:rgba(0,0,0,0.1);stop-opacity:1" />
        </linearGradient>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1"/>
          <feOffset dx="0" dy="2" result="offsetblur"/>
          <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
          <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
    </svg>
  ` : `
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" class="vehicle-svg">
      <!-- Sombra -->
      <ellipse cx="32" cy="58" rx="24" ry="4" fill="rgba(0,0,0,0.15)"/>
      <!-- Cuerpo compactador -->
      <rect x="8" y="25" width="40" height="23" rx="3" fill="${statusColor.primary}" filter="url(#shadow)"/>
      <rect x="10" y="27" width="36" height="19" rx="2" fill="url(#gradient1)"/>
      <!-- Compartimento trasero (compactador) -->
      <rect x="10" y="27" width="20" height="19" rx="2" fill="rgba(0,0,0,0.1)"/>
      <!-- Cabina -->
      <path d="M 48 27 L 56 32 L 56 48 L 48 48 Z" fill="${statusColor.primary}" filter="url(#shadow)"/>
      <path d="M 49 29 L 55 33 L 55 46 L 49 46 Z" fill="url(#gradient1)"/>
      <!-- Ventanas cabina -->
      <path d="M 50 33 L 54 35 L 54 43 L 50 43 Z" fill="rgba(255,255,255,0.3)"/>
      <!-- Detalles compactador -->
      <line x1="15" y1="30" x2="15" y2="43" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
      <line x1="20" y1="30" x2="20" y2="43" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
      <line x1="25" y1="30" x2="25" y2="43" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
      <!-- Ruedas -->
      <circle cx="16" cy="48" r="6" fill="#2d3748"/>
      <circle cx="16" cy="48" r="4" fill="#4a5568"/>
      <circle cx="35" cy="48" r="6" fill="#2d3748"/>
      <circle cx="35" cy="48" r="4" fill="#4a5568"/>
      <circle cx="50" cy="48" r="6" fill="#2d3748"/>
      <circle cx="50" cy="48" r="4" fill="#4a5568"/>
      <!-- Gradientes y filtros -->
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(255,255,255,0.4);stop-opacity:1" />
          <stop offset="100%" style="stop-color:rgba(0,0,0,0.1);stop-opacity:1" />
        </linearGradient>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
          <feOffset dx="0" dy="2" result="offsetblur"/>
          <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
          <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
    </svg>
  `;

  const isMoving = estado === 'En ruta';

  const iconHtml = `
    <div class="vehicle-marker-container" style="transform: rotate(${direccion}deg)">
      <!-- Pulso animado -->
      ${isMoving ? `<div class="vehicle-pulse" style="border-color: ${statusColor.primary};"></div>` : ''}

      <!-- Estela de movimiento -->
      ${isMoving ? `<div class="vehicle-trail" style="background: linear-gradient(90deg, transparent, ${statusColor.glow}, transparent);"></div>` : ''}

      <!-- Icono del vehículo -->
      <div class="vehicle-icon-3d" style="background: linear-gradient(135deg, ${statusColor.primary}, ${statusColor.primary}dd); box-shadow: 0 6px 20px ${statusColor.glow}, 0 0 30px ${statusColor.glow};">
        ${truckSVG}
      </div>

      <!-- Flecha de dirección -->
      ${isMoving ? `
        <div class="direction-arrow" style="border-left-color: ${statusColor.primary};">
          <div class="arrow-glow" style="background: ${statusColor.glow};"></div>
        </div>
      ` : ''}

      <!-- Glow effect -->
      <div class="vehicle-glow" style="box-shadow: 0 0 40px 15px ${statusColor.glow};"></div>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-vehicle-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
};

// Icono para paradas de ruta con estilo GPS más grande tipo Waze/Google Maps
const createStopIcon = (stopNumber, status, color, tipo = 'normal') => {
  const iconos = {
    'inicio': '🏁',
    'residencial': '🏠',
    'comercial': '🏢',
    'turistico': '🏛️',
    'normal': stopNumber
  };

  // Gradientes modernos según estado
  const gradients = {
    'completed': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    'current': 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    'pending': 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
  };

  const iconHtml = `
    <div class="stop-pin-modern stop-pin-${status}">
      <div class="pin-head" style="background: ${gradients[status]};">
        <div class="pin-content">
          ${iconos[tipo] || stopNumber}
        </div>
        <div class="pin-pulse"></div>
      </div>
      <div class="pin-tip"></div>
      <div class="pin-shadow"></div>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-div-icon',
    iconSize: [40, 56],
    iconAnchor: [20, 56]
  });
};

// Icono para puntos de limpieza
const createLocationIcon = () => {
  const iconHtml = `
    <div class="location-marker-container">
      <!-- Pulso animado -->
      <div class="location-pulse"></div>

      <!-- Ícono principal -->
      <div class="location-icon-main">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                fill="#10b981"/>
          <path d="M12 9m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" fill="white"/>
        </svg>
      </div>

      <!-- Sombra -->
      <div class="location-shadow"></div>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-location-marker',
    iconSize: [30, 40],
    iconAnchor: [15, 40]
  });
};

const MAPBOX_TOKEN = 'pk.eyJ1Ijoia2V2aW5uMjMiLCJhIjoiY204Y2J0bWN1MTg5ZzJtb2xobXljODM0MiJ9.48MFADtQhp_sFuQjewLFeA';
const GOOGLE_MAPS_API_KEY = 'AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8';

// Funciones de utilidad para simulación de movimiento siguiendo rutas reales
const simularMovimientoReal = (camion, ruta, rutaCalculada) => {
  // Usar la ruta calculada con OSRM si está disponible, sino usar coordenadasCompletas
  const coordenadas = rutaCalculada || ruta?.coordenadasCompletas;

  if (!coordenadas || coordenadas.length === 0) {
    return camion;
  }

  const ahora = Date.now();
  const tiempoTranscurrido = ahora - (camion.ultimaActualizacion || ahora);
  const velocidadKmH = 30; // Velocidad fija de 30 km/h para simulación
  const velocidadMS = (velocidadKmH * 1000) / 3600; // Convertir a m/s
  const distanciaRecorrida = velocidadMS * (tiempoTranscurrido / 1000);

  // Calcular índice inicial basado en paradas completadas
  let indiceActual = camion.indiceRuta;

  // Si no hay indiceRuta o es la primera vez, calcularlo desde paradas completadas
  if (indiceActual === undefined || indiceActual === null || camion._necesitaRecalcularIndice) {
    const paradas = ruta.paradas || [];
    const ultimaParadaCompletada = paradas.filter(p => p.completada || p.completed).pop();

    if (ultimaParadaCompletada) {
      // Encontrar índice más cercano a la última parada completada
      const latParada = ultimaParadaCompletada.lat || ultimaParadaCompletada.latitud;
      const lngParada = ultimaParadaCompletada.lng || ultimaParadaCompletada.longitud;

      let distanciaMinima = Infinity;
      let indiceMasCercano = 0;

      coordenadas.forEach((punto, idx) => {
        const distancia = Math.sqrt(
          Math.pow(punto[0] - latParada, 2) +
          Math.pow(punto[1] - lngParada, 2)
        );
        if (distancia < distanciaMinima) {
          distanciaMinima = distancia;
          indiceMasCercano = idx;
        }
      });

      indiceActual = indiceMasCercano;
    } else {
      indiceActual = 0;
    }
  }

  if (indiceActual >= coordenadas.length - 1) {
    return { ...camion, estado: 'Disponible' };
  }

  const puntoActual = coordenadas[indiceActual];
  const siguientePunto = coordenadas[indiceActual + 1];

  // Calcular dirección del movimiento
  const deltaLat = siguientePunto[0] - puntoActual[0];
  const deltaLng = siguientePunto[1] - puntoActual[1];
  const direccion = Math.atan2(deltaLng, deltaLat) * (180 / Math.PI);

  // ⭐ NUEVO: Verificar si el camión está cerca de alguna parada y marcarla como completada
  const paradas = ruta.paradas || [];
  const DISTANCIA_COMPLETAR = 0.0005; // ~55 metros (aproximadamente)

  const paradasActualizadas = paradas.map(parada => {
    // Si ya está completada, no hacer nada
    if (parada.completada || parada.completed) {
      return parada;
    }

    // Calcular distancia del camión a la parada
    const latParada = parada.lat || parada.latitud;
    const lngParada = parada.lng || parada.longitud;

    const distancia = Math.sqrt(
      Math.pow(puntoActual[0] - latParada, 2) +
      Math.pow(puntoActual[1] - lngParada, 2)
    );

    // Si el camión está cerca, marcar como completada
    if (distancia < DISTANCIA_COMPLETAR) {
      console.log(`✅ Parada "${parada.nombre || parada.name}" completada automáticamente`);
      return {
        ...parada,
        completada: true,
        completed: true,
        horaCompletada: new Date().toISOString()
      };
    }

    return parada;
  });

  // Actualizar la ruta con las paradas actualizadas
  if (ruta.paradas) {
    ruta.paradas = paradasActualizadas;
  }

  return {
    ...camion,
    lat: puntoActual[0],
    lng: puntoActual[1],
    direccion: direccion,
    indiceRuta: Math.min(indiceActual + 1, coordenadas.length - 1),
    ultimaActualizacion: ahora,
    _necesitaRecalcularIndice: false, // Ya lo calculamos
    historialPosiciones: [
      ...(camion.historialPosiciones || []).slice(-20),
      { lat: puntoActual[0], lng: puntoActual[1], timestamp: new Date().toISOString() }
    ]
  };
};

// Función para calcular ruta real usando Mapbox Directions API
const calcularRutaCompleta = async (paradas) => {
  if (!paradas || paradas.length < 2) {
    console.log('No hay suficientes paradas para calcular ruta');
    return [];
  }

  try {
    // Mapbox Directions API soporta hasta 25 coordenadas totales
    if (paradas.length > 25) {
      console.warn(`⚠️ Ruta tiene ${paradas.length} paradas (máximo 25 para Mapbox). Usando solo las primeras 25.`);
    }

    // Construir coordenadas en formato lng,lat para Mapbox
    const coordinates = paradas
      .slice(0, 25) // Limitar a 25 paradas
      .map(p => {
        const lng = p.lng || p.longitud;
        const lat = p.lat || p.latitud;
        if (!lng || !lat) return null;
        return `${lng},${lat}`;
      })
      .filter(coord => coord !== null)
      .join(';');

    if (!coordinates || coordinates.split(';').length < 2) {
      console.log('No se pudieron extraer suficientes coordenadas válidas');
      return paradas.map(p => [p.lat || p.latitud, p.lng || p.longitud]);
    }

    // Llamar a Mapbox Directions API
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;

    console.log(`🗺️ Calculando ruta con Mapbox Directions: ${paradas.length} paradas`);
    console.log(`📍 Coordenadas enviadas a Mapbox: ${coordinates}`);
    console.log(`🔗 URL Mapbox (sin token):`, url.replace(MAPBOX_TOKEN, 'HIDDEN'));

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      // Mapbox devuelve coordenadas en formato [lng, lat], necesitamos [lat, lng]
      const routeCoords = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
      console.log(`✅ Ruta calculada con Mapbox: ${routeCoords.length} puntos siguiendo calles reales`);
      console.log(`🎯 Primer punto de ruta: [${routeCoords[0]}]`);
      console.log(`🎯 Último punto de ruta: [${routeCoords[routeCoords.length - 1]}]`);
      return routeCoords;
    } else {
      console.warn(`⚠️ Mapbox no pudo calcular la ruta (code: ${data.code}). Usando líneas directas`);
      return paradas.map(p => [p.lat || p.latitud, p.lng || p.longitud]);
    }
  } catch (error) {
    console.error('❌ Error calculando ruta con Mapbox Directions:', error);
    // Fallback: devolver líneas directas entre paradas
    return paradas.map(p => [p.lat || p.latitud, p.lng || p.longitud]);
  }
};

const MapComponent = ({ camiones, rutas = [], personnel = [], lugares = [], userType, showRealTime = true, selectedTruck = null, serviceTypeFilter = 'todos', onViewLocationReports }) => {
  const [mapCamiones, setMapCamiones] = useState(camiones);
  const [showTrails, setShowTrails] = useState(true); // Activado por defecto para ver rutas
  const [realTimeEnabled, setRealTimeEnabled] = useState(showRealTime);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedTruckId, setSelectedTruckId] = useState(selectedTruck);
  const [showStopsModal, setShowStopsModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [hoveredTruckId, setHoveredTruckId] = useState(null); // Para pausar animación en hover
  const [showTruckModal, setShowTruckModal] = useState(false); // Modal de información del camión
  // Tema del mapa (dark/light) - Guardar en localStorage
  const [mapTheme, setMapTheme] = useState(() => {
    return localStorage.getItem('mapTheme') || 'dark';
  });
  const [showRouteInfo, setShowRouteInfo] = useState(false); // Mostrar información de la ruta
  // Mapa de rutas viales precalculadas { [routeId]: coords[] }
  const [roadRoutes, setRoadRoutes] = useState({});
  const [routesLoading, setRoutesLoading] = useState(true);
  // Estado local de rutas con paradas actualizadas
  const [localRutas, setLocalRutas] = useState(rutas);

  // Sincronizar localRutas cuando cambien las rutas desde props
  useEffect(() => {
    setLocalRutas(rutas);
  }, [rutas]);

  // TEMPORAL: Mostrar solo el camión RMP-P02 (demo-vehicle-5) para depuración de rutas
  const activeCamiones = mapCamiones.filter(c => c.id === 'demo-vehicle-5');

  // Simular actualizaciones en tiempo real siguiendo rutas reales de OSRM
  useEffect(() => {
    if (!realTimeEnabled) return;

    const interval = setInterval(() => {
      setMapCamiones(prevCamiones =>
        prevCamiones.map(camion => {
          // No actualizar si el camión está siendo hovereado o está seleccionado
          if (hoveredTruckId === camion.id || selectedTruckId === camion.id) {
            return camion;
          }

          if (camion.estado === 'En ruta' && (camion.rutaAsignada || camion.ruta_id)) {
            const rutaId = camion.rutaAsignada || camion.ruta_id;
            const ruta = localRutas.find(r => r.id === rutaId || r.nombre === rutaId);

            if (ruta) {
              // Usar la ruta calculada con OSRM desde roadRoutes
              const rutaCalculada = roadRoutes[ruta.id];

              // Hacer una copia de la ruta para modificarla
              const rutaCopia = { ...ruta, paradas: [...(ruta.paradas || [])] };

              // Usar la función de simulación mejorada con la ruta real
              const camionActualizado = simularMovimientoReal(camion, rutaCopia, rutaCalculada);

              // Actualizar localRutas si las paradas cambiaron
              if (rutaCopia.paradas !== ruta.paradas) {
                setLocalRutas(prevRutas =>
                  prevRutas.map(r =>
                    r.id === ruta.id ? rutaCopia : r
                  )
                );
              }

              // Agregar posición al historial siguiendo la ruta real
              const newHistorial = [...(camion.historialPosiciones || [])];
              if (newHistorial.length > 50) { // Mantener más puntos para rutas más suaves
                newHistorial.shift();
              }
              newHistorial.push({
                lat: camionActualizado.lat,
                lng: camionActualizado.lng,
                timestamp: new Date().toISOString()
              });

              return {
                ...camionActualizado,
                ultimaActualizacion: new Date().toISOString(),
                historialPosiciones: newHistorial,
                // Simular progreso en la ruta (cada ~30 segundos avanza una parada)
                paradaActual: Math.min(
                  rutaCopia.paradas?.length || camion.totalParadas || 0,
                  camion.paradaActual + (Math.random() < 0.05 ? 1 : 0)
                )
              };
            }
          }
          return camion;
        })
      );
      setLastUpdate(new Date());
    }, 3000); // Actualizar cada 3 segundos para movimiento más fluido

    return () => clearInterval(interval);
  }, [realTimeEnabled, hoveredTruckId, selectedTruckId, localRutas, roadRoutes]);

  // Actualizar cuando cambien los camiones externos
  useEffect(() => {
    setMapCamiones(camiones);
  }, [camiones]);

  // Inicializar índices de camiones basados en paradas completadas cuando roadRoutes esté listo
  useEffect(() => {
    if (routesLoading || Object.keys(roadRoutes).length === 0) return;

    setMapCamiones(prevCamiones =>
      prevCamiones.map(camion => {
        // Marcar que necesita recalcular índice si está en ruta
        if (camion.estado === 'En ruta' && (camion.rutaAsignada || camion.ruta_id)) {
          return {
            ...camion,
            _necesitaRecalcularIndice: true
          };
        }
        return camion;
      })
    );
  }, [routesLoading, roadRoutes]);

  // Actualizar selectedTruck cuando cambie externamente
  useEffect(() => {
    setSelectedTruckId(selectedTruck);
    setShowTruckModal(!!selectedTruck);
  }, [selectedTruck]);

  /* ------------------------------------------------------------
   * Precalcular rutas reales usando Mapbox Directions para TODAS las rutas al montar.
   * ----------------------------------------------------------*/
  useEffect(() => {
    let mounted = true;

    const buildAllRoutes = async () => {
      console.log(`🚀 Iniciando cálculo de ${rutas.length} rutas con Mapbox Directions API...`);
      setRoutesLoading(true);
      const newMap = {};

      for (const ruta of rutas) {
        try {
          // Normalizar paradas para asegurar formato correcto
          const paradasNormalizadas = (ruta.paradas || []).map(parada => ({
            lat: parada.lat || parada.latitud,
            lng: parada.lng || parada.longitud || parada.lon,
            nombre: parada.nombre || parada.direccion
          })).filter(p => p.lat && p.lng);

          if (paradasNormalizadas.length < 2) {
            console.warn(`⚠️ Ruta ${ruta.nombre} no tiene suficientes paradas válidas (${paradasNormalizadas.length})`);
            continue;
          }

          console.log(`🗺️ Calculando ruta "${ruta.nombre || ruta.name}" (ID: ${ruta.id}) con ${paradasNormalizadas.length} paradas...`);

          const coords = await calcularRutaCompleta(paradasNormalizadas);

          if (coords && coords.length > 0) {
            newMap[ruta.id] = coords;
            console.log(`✅ Ruta "${ruta.nombre || ruta.name}" calculada: ${coords.length} puntos de vía siguiendo calles`);
          } else {
            // Fallback: líneas directas
            console.warn(`⚠️ Usando líneas directas para ruta ${ruta.nombre}`);
            newMap[ruta.id] = paradasNormalizadas.map(p => [p.lat, p.lng]);
          }

          // Pequeño delay para no sobrecargar la API (Mapbox tiene límites de rate)
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`❌ Error calculando ruta ${ruta.nombre}:`, error);
          // Fallback: líneas directas entre paradas
          const paradasNormalizadas = (ruta.paradas || []).map(parada => ({
            lat: parada.lat || parada.latitud,
            lng: parada.lng || parada.longitud
          })).filter(p => p.lat && p.lng);

          if (paradasNormalizadas.length > 0) {
            newMap[ruta.id] = paradasNormalizadas.map(p => [p.lat, p.lng]);
          }
        }
      }

      if (mounted) {
        setRoadRoutes(newMap);
        setRoutesLoading(false);
        console.log(`🎉 ¡Rutas calculadas completadas con Mapbox! ${Object.keys(newMap).length} rutas listas`);
        console.log('📊 IDs de rutas calculadas:', Object.keys(newMap));
      }
    };

    if (rutas && rutas.length > 0) {
      buildAllRoutes();
    } else {
      setRoutesLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [rutas]);

  // Centro en Ciudad de Panamá con mejor zoom
  const centerPosition = [8.9833, -79.5167]; // Centro de distribución en Pedregal

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'En ruta': return '#22c55e';
      case 'Disponible': return '#3b82f6';
      default: return '#3b82f6'; // Cualquier otro estado se trata como Disponible
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLoadStatus = (pesoAcumulado) => {
    if (pesoAcumulado > 600) return { text: 'Carga alta', color: '#22c55e' };
    if (pesoAcumulado > 300) return { text: 'Carga media', color: '#f59e0b' };
    if (pesoAcumulado > 0) return { text: 'Carga baja', color: '#ef4444' };
    return { text: 'Sin carga', color: '#6b7280' };
  };

  const handleTruckClick = (camionId) => {
    if (selectedTruckId === camionId) {
      setSelectedTruckId(null);
      setShowTruckModal(false);
    } else {
      setSelectedTruckId(camionId);
      setShowTruckModal(true);
    }
  };

  const closeTruckModal = () => {
    setShowTruckModal(false);
  };

  const handleStopClick = (ruta) => {
    setSelectedRoute(ruta);
    setShowStopsModal(true);
  };

  const closeStopsModal = () => {
    setShowStopsModal(false);
    setSelectedRoute(null);
  };

  const getSelectedTruckRoute = () => {
    if (!selectedTruckId) return null;
    const camion = mapCamiones.find(c => c.id === selectedTruckId);
    if (!camion) return null;

    // Buscar por ID de ruta (soporta tanto rutaAsignada como ruta_id)
    const rutaId = camion.rutaAsignada || camion.ruta_id;
    if (!rutaId) return null;

    const ruta = localRutas.find(r => r.id === rutaId || r.nombre === rutaId);

    // Si encontramos la ruta, normalizarla para que tenga la estructura esperada
    if (ruta) {
      // Normalizar paradas (latitud/longitud -> lat/lng, y agregar campos faltantes)
      const paradasNormalizadas = (ruta.paradas || []).map((parada, index) => ({
        ...parada,
        lat: parada.lat || parada.latitud,
        lng: parada.lng || parada.longitud,
        nombre: parada.nombre || `Parada ${index + 1}`,
        direccion: parada.direccion || parada.nombre || `Parada ${index + 1}`,
        tipo: parada.tipo || 'comercial',
        estimado: parada.estimado || parada.hora_completada || `${index + 1}:00`,
        completada: parada.completada || parada.completed || false
      }));

      return {
        ...ruta,
        paradas: paradasNormalizadas,
        distanciaTotal: ruta.distancia_km || ruta.distanciaTotal || 0,
        tiempoEstimado: ruta.tiempo_estimado_min || ruta.tiempoEstimado || 0
      };
    }

    return null;
  };

  const getSelectedTruck = () => {
    if (!selectedTruckId) return null;
    const camion = mapCamiones.find(c => c.id === selectedTruckId);
    if (!camion) return null;

    // Calcular paradaActual basado en paradas completadas
    let paradaActual = camion.paradaActual || 0;

    // Si no tiene paradaActual, calcular desde la ruta
    if (!paradaActual) {
      const rutaId = camion.rutaAsignada || camion.ruta_id;
      if (rutaId) {
        const ruta = localRutas.find(r => r.id === rutaId || r.nombre === rutaId);
        if (ruta && ruta.paradas) {
          paradaActual = ruta.paradas.filter(p => p.completada || p.completed).length;
        }
      }
    }

    // Buscar conductor si existe
    let conductorNombre = camion.conductor || '';
    if (!conductorNombre && (camion.conductorAsignado || camion.conductor_id)) {
      // Buscar en la lista de personal
      const conductorId = camion.conductorAsignado || camion.conductor_id;
      const conductor = personnel.find(p => p.id === conductorId);
      if (conductor) {
        conductorNombre = `${conductor.nombre} ${conductor.apellido || ''}`.trim();
      } else {
        // Fallback si no se encuentra en personnel
        conductorNombre = conductorId;
      }
    }

    return {
      ...camion,
      paradaActual,
      conductor: conductorNombre
    };
  };

  const getStopStatus = (stopIndex, camion) => {
    if (!camion) return 'pending';
    if (stopIndex < camion.paradaActual) return 'completed';
    if (stopIndex === camion.paradaActual) return 'current';
    return 'pending';
  };

  const calculateProgress = (camion, ruta) => {
    if (!camion || !ruta) return 0;
    return Math.round((camion.paradaActual / camion.totalParadas) * 100);
  };

  const getRouteTypeColor = (routeId) => {
    const colors = {
      'ruta-norte': '#22c55e',
      'ruta-centro': '#3b82f6', 
      'ruta-sur': '#f59e0b'
    };
    return colors[routeId] || '#6b7280';
  };

  return (
    <div className="map-component-wrapper">
      <div className="map-component">
        <MapContainer
          center={centerPosition}
          zoom={13}
          style={{ height: '750px', width: '100%' }}
          className="leaflet-container gps-map"
        >
          <TileLayer
            url={`https://api.mapbox.com/styles/v1/mapbox/${mapTheme}-v11/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`}
            attribution='&copy; <a href="https://www.mapbox.com/">Mapbox</a> - Datos © <a href="https://www.openstreetmap.org/">OpenStreetMap</a>.'
            tileSize={512}
            zoomOffset={-1}
          />
          
          {/* NO mostrar rutas aquí - se muestran individualmente por camión seleccionado */}
          
          {activeCamiones.map(camion => {
            const loadStatus = getLoadStatus(camion.pesoAcumulado);
            const isSelected = selectedTruckId === camion.id;

            // Buscar ruta con la misma lógica que getSelectedTruckRoute
            const rutaId = camion.rutaAsignada || camion.ruta_id;
            const currentRoute = rutaId ? localRutas.find(r => r.id === rutaId || r.nombre === rutaId) : null;
            
            return (
              <div key={camion.id}>
                {/* Marcador principal del camión con estilo GPS */}
                <Marker
                  position={[camion.lat, camion.lng]}
                  icon={createCustomIcon(camion.estado, camion.direccion, camion.tipoServicio, camion.placa || camion.id)}
                  eventHandlers={{
                    click: () => handleTruckClick(camion.id),
                    mouseover: () => setHoveredTruckId(camion.id),
                    mouseout: () => setHoveredTruckId(null)
                  }}
                >
                  {/* Solo mostrar popup si NO está seleccionado, para evitar dos modales */}
                  {!isSelected && (
                    <Popup>
                      <div className={`truck-popup gps-popup ${camion.tipoServicio === 'fumigacion' ? 'fumigation-popup' : ''}`}>
                        <div className="popup-header">
                          <h4>
                            <Truck size={16} /> {camion.id}
                            {camion.tipoServicio === 'fumigacion' && (
                              <span className="service-type">FUMIGACIÓN</span>
                            )}
                          </h4>
                          <span 
                            className="status-badge" 
                            style={{ backgroundColor: getStatusColor(camion.estado) }}
                          >
                            {camion.estado}
                          </span>
                        </div>
                        
                        <div className="popup-content">
                          <div className="info-row">
                            <strong>👨‍💼 Conductor:</strong> {camion.conductor}
                          </div>
                          <div className="info-row">
                            <strong>🗺️ Ruta:</strong> {camion.rutaAsignada || 'Sin asignar'}
                          </div>
                          {/* Información específica de fumigación */}
                          {camion.tipoServicio === 'fumigacion' && (
                            <>
                              {camion.tipoPlaga && (
                                <div className="info-row">
                                  <strong>🦟 Plaga:</strong> 
                                  <span className="plague-type">{camion.tipoPlaga}</span>
                                </div>
                              )}
                              {camion.areaFumigada > 0 && (
                                <div className="info-row">
                                  <strong>📐 Área fumigada:</strong> {camion.areaFumigada} m²
                                </div>
                              )}
                              <div className="fumigation-stats">
                                <div className="fumigation-stat">
                                  <span className="stat-icon">🎯</span>
                                  <span>{camion.paradaActual}/{camion.totalParadas}</span>
                                </div>
                                <div className="fumigation-stat">
                                  <span className="stat-icon">⛽</span>
                                  <span>{camion.combustible}%</span>
                                </div>
                              </div>
                            </>
                          )}
                          
                          {/* Información específica de recolección */}
                          {camion.tipoServicio === 'recoleccion' && camion.pesoAcumulado > 0 && (
                            <div className="info-row">
                              <strong>⚖️ Peso acumulado:</strong> {camion.pesoAcumulado} kg
                            </div>
                          )}
                          
                          <div className="info-row">
                            <button 
                              className="btn btn--primary btn--sm"
                              onClick={() => handleTruckClick(camion.id)}
                            >
                              🛰️ Ver información completa
                            </button>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  )}
                </Marker>

                {/* Mostrar ruta completa con diferenciación entre completada y pendiente */}
                {(() => {
                  // Debug: Verificar condiciones antes de renderizar
                  if (isSelected) {
                    console.log(`🔍 Debug camión seleccionado ${camion.placa || camion.id}:`, {
                      showTrails,
                      isSelected,
                      estado: camion.estado,
                      rutaId,
                      currentRoute: currentRoute?.id || currentRoute?.nombre,
                      tieneRutaCalculada: currentRoute ? !!roadRoutes[currentRoute.id] : false,
                      puntosRuta: currentRoute && roadRoutes[currentRoute.id] ? roadRoutes[currentRoute.id].length : 0
                    });
                  }

                  if (!showTrails || !isSelected || camion.estado !== 'En ruta' || !currentRoute) {
                    return null;
                  }

                  const rutaCalculada = roadRoutes[currentRoute.id];
                  if (!rutaCalculada || rutaCalculada.length === 0) {
                    console.warn(`⚠️ No hay ruta calculada para ${currentRoute.id || currentRoute.nombre}`);
                    return null;
                  }

                  // Usar la posición GPS actual del camión (indiceRuta) para dividir verde/gris
                  let indiceActual = camion.indiceRuta || 0;

                  // FALLBACK: Si indiceRuta es muy bajo pero hay paradas completadas, recalcular
                  const paradasCompletadas = (currentRoute.paradas || []).filter(p => p.completada || p.completed);
                  if (indiceActual < 50 && paradasCompletadas.length > 0) {
                    // Buscar el índice de la última parada completada en la ruta OSRM
                    const ultimaParada = paradasCompletadas[paradasCompletadas.length - 1];
                    const latParada = ultimaParada.lat || ultimaParada.latitud;
                    const lngParada = ultimaParada.lng || ultimaParada.longitud;

                    let distanciaMinima = Infinity;
                    let indiceMasCercano = 0;

                    rutaCalculada.forEach((punto, idx) => {
                      const distancia = Math.sqrt(
                        Math.pow(punto[0] - latParada, 2) +
                        Math.pow(punto[1] - lngParada, 2)
                      );
                      if (distancia < distanciaMinima) {
                        distanciaMinima = distancia;
                        indiceMasCercano = idx;
                      }
                    });

                    indiceActual = indiceMasCercano;
                    console.log(`🔄 Recalculado indiceRuta para ${camion.placa}: ${indiceMasCercano} (paradas completadas: ${paradasCompletadas.length})`);
                  }

                  // Dividir la ruta en completada (verde hasta posición actual del camión) y pendiente (gris resto)
                  const rutaCompletada = rutaCalculada.slice(0, indiceActual + 1);
                  const rutaPendiente = rutaCalculada.slice(Math.max(0, indiceActual), rutaCalculada.length);

                  console.log(`🚛 Vehículo ${camion.placa || camion.nombre}:`, {
                    indiceActual,
                    paradasCompletadas: paradasCompletadas.length,
                    rutaCompletadaPuntos: rutaCompletada.length,
                    rutaPendientePuntos: rutaPendiente.length,
                    rutaTotalPuntos: rutaCalculada.length,
                    progreso: `${Math.round((indiceActual / rutaCalculada.length) * 100)}%`
                  });

                  return (
                    <>
                      {/* PRIMERO: Ruta pendiente (gris punteada) - se dibuja primero para que quede debajo */}
                      {rutaPendiente.length > 1 && (
                        <>
                          {/* Glow para ruta pendiente */}
                          <Polyline
                            positions={rutaPendiente}
                            color="#6b7280"
                            weight={14}
                            opacity={0.25}
                            className="route-glow-pending"
                          />
                          {/* Línea principal pendiente */}
                          <Polyline
                            positions={rutaPendiente}
                            color="#9ca3af"
                            weight={6}
                            opacity={0.85}
                            dashArray="10, 10"
                            className="route-pending"
                          />
                        </>
                      )}

                      {/* SEGUNDO: Ruta completada (verde brillante) - se dibuja encima */}
                      {rutaCompletada.length > 1 && (
                        <>
                          {/* Glow para ruta completada */}
                          <Polyline
                            positions={rutaCompletada}
                            color="#10b981"
                            weight={16}
                            opacity={0.3}
                            className="route-glow-completed"
                          />
                          {/* Línea principal completada */}
                          <Polyline
                            positions={rutaCompletada}
                            color="#10b981"
                            weight={7}
                            opacity={0.95}
                            className="route-selected gps-trail-active"
                          />
                          {/* Highlight brillante */}
                          <Polyline
                            positions={rutaCompletada}
                            color="#34d399"
                            weight={3}
                            opacity={0.9}
                            className="route-highlight"
                          />
                        </>
                      )}
                    </>
                  );
                })()}

                {/* Círculo de cobertura GPS para camiones en ruta */}
                {camion.estado === 'En ruta' && isSelected && (
                  <Circle
                    center={[camion.lat, camion.lng]}
                    radius={300}
                    fillColor={getStatusColor(camion.estado)}
                    color={getStatusColor(camion.estado)}
                    weight={2}
                    opacity={0.4}
                    fillOpacity={0.1}
                    className="gps-coverage"
                  />
                )}
              </div>
            );
          })}

          {/* Dibujar la ruta seleccionada con segmentos de progreso */}
          {!showTrails && getSelectedTruckRoute() && roadRoutes[getSelectedTruckRoute().id] &&
           Array.isArray(roadRoutes[getSelectedTruckRoute().id]) &&
           roadRoutes[getSelectedTruckRoute().id].length > 0 && (() => {
            const route = getSelectedTruckRoute();
            const truck = getSelectedTruck();
            const fullRoute = roadRoutes[route.id];

            // Usar la posición GPS actual del camión (indiceRuta) para dividir verde/gris (misma lógica que arriba)
            let indiceActual = truck.indiceRuta || 0;

            // FALLBACK: Si indiceRuta es muy bajo pero hay paradas completadas, recalcular
            const paradasCompletadas = (route.paradas || []).filter(p => p.completada || p.completed);
            if (indiceActual < 50 && paradasCompletadas.length > 0) {
              // Buscar el índice de la última parada completada en la ruta OSRM
              const ultimaParada = paradasCompletadas[paradasCompletadas.length - 1];
              const latParada = ultimaParada.lat || ultimaParada.latitud;
              const lngParada = ultimaParada.lng || ultimaParada.longitud;

              let distanciaMinima = Infinity;
              let indiceMasCercano = 0;

              fullRoute.forEach((punto, idx) => {
                const distancia = Math.sqrt(
                  Math.pow(punto[0] - latParada, 2) +
                  Math.pow(punto[1] - lngParada, 2)
                );
                if (distancia < distanciaMinima) {
                  distanciaMinima = distancia;
                  indiceMasCercano = idx;
                }
              });

              indiceActual = indiceMasCercano;
              console.log(`🔄 [Selected] Recalculado indiceRuta para ${truck.placa}: ${indiceMasCercano} (paradas completadas: ${paradasCompletadas.length})`);
            }

            // Dividir la ruta en completada (verde hasta posición actual del camión) y pendiente (gris resto)
            const rutaCompletada = fullRoute.slice(0, indiceActual + 1);
            const rutaPendiente = fullRoute.slice(Math.max(0, indiceActual), fullRoute.length);

            return (
              <>
                {/* Ruta pendiente (gris punteada) */}
                {rutaPendiente.length > 1 && (
                  <>
                    {/* Glow para ruta pendiente */}
                    <Polyline
                      positions={rutaPendiente}
                      color="#6b7280"
                      weight={14}
                      opacity={0.25}
                      className="route-glow-pending"
                    />
                    {/* Línea principal pendiente */}
                    <Polyline
                      positions={rutaPendiente}
                      color="#9ca3af"
                      weight={6}
                      opacity={0.85}
                      dashArray="10, 10"
                      className="route-pending"
                    />
                  </>
                )}

                {/* Ruta completada (verde brillante) */}
                {rutaCompletada.length > 1 && (
                  <>
                    {/* Glow para ruta completada */}
                    <Polyline
                      positions={rutaCompletada}
                      color="#10b981"
                      weight={16}
                      opacity={0.3}
                      className="route-glow-completed"
                    />
                    {/* Línea principal completada */}
                    <Polyline
                      positions={rutaCompletada}
                      color="#10b981"
                      weight={7}
                      opacity={0.95}
                      className="route-completed gps-trail-active"
                    />
                    {/* Highlight brillante */}
                    <Polyline
                      positions={rutaCompletada}
                      color="#34d399"
                      weight={3}
                      opacity={0.9}
                      className="route-highlight"
                    />
                  </>
                )}
              </>
            );
          })()}

          {/* Marcadores de las paradas */}
          {getSelectedTruckRoute() && getSelectedTruck() && (
            getSelectedTruckRoute().paradas.map((parada, index) => {
              const status = getStopStatus(index, getSelectedTruck());
              const statusColors = {
                'completed': '#34a853',
                'current': '#fbbc05',
                'pending': '#9e9e9e'
              };
              return (
                <Marker
                  key={`stop-${index}`}
                  position={[parada.lat, parada.lng]}
                  icon={createStopIcon(index + 1, status, statusColors[status], parada.tipo)}
                  eventHandlers={{
                    click: () => handleStopClick(getSelectedTruckRoute())
                  }}
                >
                  <Popup>
                    <div className="stop-popup gps-stop-popup">
                      <h5>📍 {parada.nombre}</h5>
                      <div className="stop-info">
                        <strong>Parada:</strong> {index + 1} de {getSelectedTruckRoute().paradas.length}<br/>
                        <strong>Tipo:</strong> {parada.tipo}<br/>
                        <strong>Dirección:</strong> {parada.direccion || parada.nombre}<br/>
                        <strong>Horario estimado:</strong> {parada.estimado}
                      </div>
                      <div className={`stop-status ${status}`}>
                        {status === 'completed' && '✅ Completada'}
                        {status === 'current' && '📍 En proceso'}
                        {status === 'pending' && '⏳ Pendiente'}
                      </div>
                      <div className="info-row" style={{ marginTop: '12px' }}>
                        <button 
                          className="btn btn--primary btn--sm"
                          onClick={() => handleStopClick(getSelectedTruckRoute())}
                        >
                          📋 Ver todas las paradas
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })
          )}

          {/* Marcadores de puntos de limpieza */}
          {lugares
            .filter(lugar => lugar.latitud && lugar.longitud)
            .map(lugar => (
              <Marker
                key={lugar.id}
                position={[lugar.latitud, lugar.longitud]}
                icon={createLocationIcon()}
                eventHandlers={{
                  click: () => setSelectedLocation(lugar)
                }}
              >
                <Popup>
                  <div className="location-popup-mini">
                    <h4>{lugar.nombre}</h4>
                    <p>{lugar.direccion}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>

        {/* Controles personalizados del mapa */}
        <div className="map-controls">
          {routesLoading && (
            <div className="map-control-btn" style={{ background: 'rgba(59, 130, 246, 0.9)', pointerEvents: 'none' }}>
              <span className="loading-spinner"></span>
              <span>Calculando rutas...</span>
            </div>
          )}

          <button
            className="map-control-btn"
            onClick={() => {
              const newTheme = mapTheme === 'dark' ? 'light' : 'dark';
              setMapTheme(newTheme);
              localStorage.setItem('mapTheme', newTheme);
            }}
            title={mapTheme === 'dark' ? "Cambiar a modo día" : "Cambiar a modo noche"}
          >
            {mapTheme === 'dark' ? '☀️' : '🌙'}
            <span>{mapTheme === 'dark' ? "Modo Día" : "Modo Noche"}</span>
          </button>

          <button
            className="map-control-btn"
            onClick={() => setShowTrails(!showTrails)}
            title={showTrails ? "Ocultar rutas completas" : "Mostrar rutas completas"}
          >
            <MapIcon size={18} strokeWidth={2} />
            <span>{showTrails ? "Ocultar Rutas" : "Mostrar Rutas"}</span>
          </button>

          <button
            className="map-control-btn"
            onClick={() => setRealTimeEnabled(!realTimeEnabled)}
            title={realTimeEnabled ? "Pausar seguimiento GPS" : "Activar seguimiento GPS"}
          >
            <Satellite size={18} strokeWidth={2} />
            <span>{realTimeEnabled ? "GPS Activo" : "GPS Pausado"}</span>
            {realTimeEnabled && <span className="live-indicator-dot"></span>}
          </button>

          {selectedTruckId && (
            <button
              className="map-control-btn map-control-btn--danger"
              onClick={() => {
                setSelectedTruckId(null);
                setShowTruckModal(false);
              }}
              title="Deseleccionar vehículo"
            >
              <X size={18} strokeWidth={2} />
              <span>Limpiar Selección</span>
            </button>
          )}
        </div>


        {/* Modal de paradas detallado */}
        {showStopsModal && selectedRoute && (
          <div className="stops-modal-overlay" onClick={closeStopsModal}>
            <div className="stops-modal" onClick={(e) => e.stopPropagation()}>
              <div className="stops-modal-header">
                <h3>📋 {selectedRoute.nombre} - Paradas Detalladas</h3>
                <button 
                  className="modal-close-btn"
                  onClick={closeStopsModal}
                >
                  ✕
                </button>
              </div>
              
              <div className="stops-modal-content">
                <div className="route-summary">
                  <div className="summary-stat">
                    <div className="stat-value">{selectedRoute.paradas.length}</div>
                    <div className="stat-label">Total Paradas</div>
                  </div>
                  <div className="summary-stat">
                    <div className="stat-value">{selectedRoute.distanciaTotal} km</div>
                    <div className="stat-label">Distancia</div>
                  </div>
                  <div className="summary-stat">
                    <div className="stat-value">{Math.round(selectedRoute.tiempoEstimado / 60)}h</div>
                    <div className="stat-label">Duración Est.</div>
                  </div>
                  <div className="summary-stat">
                    <div className="stat-value">{selectedRoute.paradas.reduce((sum, p) => sum + (p.pesoRecolectado || 0), 0)}</div>
                    <div className="stat-label">Carga Total</div>
                  </div>
                </div>

                <div className="stops-list">
                  {selectedRoute.paradas.map((parada, index) => {
                    const currentTruck = getSelectedTruck();
                    const status = getStopStatus(index, currentTruck);
                    
                    return (
                      <div key={index} className={`stop-item stop-item--${status}`}>
                        <div className="stop-number">
                          <span className={`stop-badge stop-badge--${status}`}>
                            {index + 1}
                          </span>
                        </div>
                        
                        <div className="stop-details">
                          <div className="stop-name">
                            <span className="stop-type-icon">
                              {parada.tipo === 'turistico' && '🏛️'}
                              {parada.tipo === 'comercial' && '🏢'}
                              {parada.tipo === 'residencial' && '🏠'}
                              {parada.tipo === 'inicio' && '🏁'}
                            </span>
                            {parada.direccion || `Parada ${index + 1}`}
                          </div>
                          
                          <div className="stop-address">
                            📍 {parada.direccion || `Lat: ${parada.latitud}, Lng: ${parada.longitud}`}
                          </div>
                          
                          <div className="stop-times">
                            <div className="time-info">
                              <strong>Estimado:</strong> {parada.estimado}
                              {parada.horaLlegada && (
                                <>
                                  <strong> | Llegada:</strong> {parada.horaLlegada}
                                  <strong> | Salida:</strong> {parada.horaSalida}
                                </>
                              )}
                            </div>
                          </div>
                          
                          {parada.pesoRecolectado !== undefined && (
                            <div className="stop-weight">
                              <strong>Carga recolectada:</strong> {parada.pesoRecolectado}
                            </div>
                          )}
                        </div>
                        
                        <div className="stop-status-indicator">
                          {status === 'completed' && <span className="status-icon">✅</span>}
                          {status === 'current' && <span className="status-icon">📍</span>}
                          {status === 'pending' && <span className="status-icon">⏳</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de información del camión */}
        {showTruckModal && getSelectedTruck() && (
          <div className="truck-modal-overlay" onClick={closeTruckModal}>
            <div className="truck-modal" onClick={(e) => e.stopPropagation()}>
              <div className="truck-modal-header">
                <div className="truck-modal-title-section">
                  <Truck size={24} strokeWidth={2} />
                  <div>
                    <h3>{getSelectedTruck().placa || getSelectedTruck().id}</h3>
                    <span className="truck-modal-subtitle">
                      {getSelectedTruck().tipoServicio === 'fumigacion' ? 'Fumigación' : 'Recolección'}
                    </span>
                  </div>
                </div>
                <button className="modal-close-btn" onClick={closeTruckModal}>
                  <X size={20} strokeWidth={2} />
                </button>
              </div>

              <div className="truck-modal-content">
                {/* Estado del vehículo */}
                <div className="truck-status-section">
                  <div className="status-card">
                    <div className="status-icon-wrapper" style={{
                      backgroundColor: getSelectedTruck().estado === 'En ruta' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                      borderColor: getSelectedTruck().estado === 'En ruta' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'
                    }}>
                      <Satellite size={24} />
                    </div>
                    <div className="status-info">
                      <div className="status-label">Estado</div>
                      <div className="status-value" style={{
                        color: getSelectedTruck().estado === 'En ruta' ? '#059669' : '#2563eb'
                      }}>
                        {getSelectedTruck().estado}
                      </div>
                    </div>
                  </div>

                  {getSelectedTruck().conductor && (
                    <div className="status-card">
                      <div className="status-icon-wrapper" style={{
                        backgroundColor: 'rgba(107, 142, 35, 0.1)',
                        borderColor: 'rgba(107, 142, 35, 0.3)'
                      }}>
                        👤
                      </div>
                      <div className="status-info">
                        <div className="status-label">Conductor</div>
                        <div className="status-value">{getSelectedTruck().conductor}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Paradas de la ruta */}
                {getSelectedTruckRoute() && (
                  <>
                    {/* Lista de paradas */}
                    <div className="stops-list-section">
                      <div className="section-header">
                        <MapPin size={20} strokeWidth={2} />
                        <h4>Paradas de la Ruta</h4>
                      </div>

                      <div className="stops-timeline">
                        {getSelectedTruckRoute().paradas.map((parada, index) => {
                          const status = getStopStatus(index, getSelectedTruck());
                          const isCurrent = index === getSelectedTruck().paradaActual;

                          return (
                            <div key={index} className={`timeline-stop timeline-stop--${status} ${isCurrent ? 'timeline-stop--current' : ''}`}>
                              <div className="timeline-marker">
                                <div className={`timeline-dot timeline-dot--${status}`}>
                                  {status === 'completed' && '✓'}
                                  {status === 'current' && index + 1}
                                  {status === 'pending' && index + 1}
                                </div>
                                {index < getSelectedTruckRoute().paradas.length - 1 && (
                                  <div className={`timeline-line timeline-line--${status}`}></div>
                                )}
                              </div>

                              <div className="timeline-content">
                                <div className="timeline-stop-header">
                                  <span className="timeline-stop-title">{parada.nombre}</span>
                                  {isCurrent && <span className="current-badge">Actual</span>}
                                </div>
                                <div className="timeline-stop-address">{parada.direccion || parada.nombre}</div>
                                <div className="timeline-stop-meta">
                                  <span>Tipo: {parada.tipo}</span>
                                  {parada.estimado && <span>• ETA: {parada.estimado}</span>}
                                </div>
                                {parada.pesoRecolectado && (
                                  <div className="timeline-stop-weight">
                                    Carga: {parada.pesoRecolectado} kg
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {!getSelectedTruckRoute() && (
                  <div className="no-route-message">
                    <MapPin size={48} />
                    <p>Este vehículo no tiene una ruta asignada</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Popup de ubicación */}
        {selectedLocation && (
          <LocationPopup
            location={selectedLocation}
            onClose={() => setSelectedLocation(null)}
            onViewReports={(location) => {
              if (onViewLocationReports) {
                onViewLocationReports(location.id);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default MapComponent; 