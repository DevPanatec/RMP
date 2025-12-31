import { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useAction, useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Satellite, Map as MapIcon, MapPin, X, Truck, Navigation, CheckCircle, Clock, Play, Battery, Signal, RefreshCw, Target, Trash2, Gauge, Copy, Radio, Recycle, Spray } from '../Icons';
import LocationPopup from './LocationPopup';
import GPSPlaybackModal from '../GPS/GPSPlaybackModal';
import { DEMO_LUGARES, DEMO_CLEANING_ASSIGNMENTS } from '../../utils/demoData';
import 'leaflet/dist/leaflet.css';
import './MapComponent.css';

// Componente para manejar clicks en el mapa (geofences)
function MapClickHandler({ onClick, active }) {
  useMapEvents({
    click: (e) => {
      if (active && onClick) {
        onClick(e);
      }
    },
  });
  return null;
}

// Componente para auto-centrar el mapa en las rutas/paradas
function AutoFitBounds({ rutas }) {
  const map = useMap();

  useEffect(() => {
    console.log('🎯 AutoFitBounds - rutas recibidas:', rutas);

    if (!rutas || rutas.length === 0) {
      console.log('❌ AutoFitBounds - No hay rutas');
      return;
    }

    // Recolectar todas las paradas de todas las rutas
    const todasLasParadas = rutas.flatMap(ruta => ruta.paradas || []);
    console.log('🎯 AutoFitBounds - Todas las paradas:', todasLasParadas);

    const paradasValidas = todasLasParadas.filter(p =>
      (p.lat || p.latitud) && (p.lng || p.longitud)
    );
    console.log('🎯 AutoFitBounds - Paradas válidas:', paradasValidas.length, paradasValidas);
    console.log('🎯 AutoFitBounds - Coordenadas de cada parada:');
    paradasValidas.forEach((p, idx) => {
      console.log(`  Parada ${idx + 1}: lat=${p.lat || p.latitud}, lng=${p.lng || p.longitud}, nombre=${p.nombre || p.direccion}`);
    });

    if (paradasValidas.length === 0) {
      console.log('❌ AutoFitBounds - No hay paradas válidas con GPS');
      return;
    }

    const doFitBounds = () => {
      // Invalidar tamaño del mapa para que calcule correctamente
      map.invalidateSize();
      console.log('🔄 AutoFitBounds - invalidateSize ejecutado');

      // Calcular el centro geográfico de todas las paradas
      const lats = paradasValidas.map(p => p.lat || p.latitud);
      const lngs = paradasValidas.map(p => p.lng || p.longitud);
      const centerLat = lats.reduce((sum, lat) => sum + lat, 0) / lats.length;
      const centerLng = lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length;

      console.log('📍 Centro calculado:', [centerLat, centerLng]);
      console.log('📍 Todas las lats:', lats);
      console.log('📍 Todas las lngs:', lngs);

      if (paradasValidas.length === 1) {
        // Una sola parada: centrar con zoom fijo
        console.log('✅ AutoFitBounds - setView (1 parada):', [centerLat, centerLng], 'zoom: 14');
        map.setView([centerLat, centerLng], 14, { animate: true });
      } else {
        // Múltiples paradas: centrar manualmente con zoom que muestre ambas
        // Calcular distancia aproximada para determinar zoom
        const latDiff = Math.max(...lats) - Math.min(...lats);
        const lngDiff = Math.max(...lngs) - Math.min(...lngs);
        const maxDiff = Math.max(latDiff, lngDiff);

        // Zoom basado en distancia (más paradas cerca = más zoom)
        let zoom = 14;
        if (maxDiff > 0.05) zoom = 12;
        else if (maxDiff > 0.02) zoom = 13;
        else if (maxDiff > 0.01) zoom = 14;
        else zoom = 15;

        console.log('✅ AutoFitBounds - setView (múltiples paradas):', [centerLat, centerLng], `zoom: ${zoom}`);
        console.log('📏 MaxDiff:', maxDiff, 'Zoom seleccionado:', zoom);

        map.setView([centerLat, centerLng], zoom, { animate: true });
      }
    };

    // Esperar a que el mapa + marcadores + modal estén listos
    const timeout = setTimeout(() => {
      console.log('🗺️ Ejecutando fitBounds después de delay...');
      doFitBounds();
    }, 800); // 800ms para que el modal, mapa y marcadores estén completamente renderizados

    return () => clearTimeout(timeout);
  }, [map, rutas]);

  return null;
}

// Componente para optimizar el mapa y pre-cargar tiles
function MapOptimizer() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Configurar opciones de rendimiento
    map.options.zoomSnap = 0.5;
    map.options.zoomDelta = 0.5;
    map.options.wheelDebounceTime = 40;
    map.options.wheelPxPerZoomLevel = 60;
    
    // Pre-cargar tiles cercanos
    map.on('zoomend moveend', () => {
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      
      // Pre-cargar tiles de niveles de zoom adyacentes
      const tileLayers = [];
      map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          tileLayers.push(layer);
        }
      });

      tileLayers.forEach((layer) => {
        // Forzar carga de tiles visibles
        if (layer._tileZoom !== undefined) {
          layer._resetView();
        }
      });
    });

    // Optimizar animaciones
    const container = map.getContainer();
    container.style.willChange = 'transform';
    
    return () => {
      map.off('zoomend moveend');
    };
  }, [map]);

  return null;
}

// Fix para iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/**
 * Formatea tiempo relativo (hace X minutos/horas)
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
 * Estados del vehículo basados en movimiento:
 * - 'moving': Avanzando (velocidad > 0 o actualización reciente < 2 min)
 * - 'stopped': Parado (sin movimiento 2-5 minutos)
 * - 'parked': Parqueado (sin movimiento > 5 minutos)
 */
const getVehicleMovementStatus = (vehicle) => {
  const now = Date.now();
  const lastUpdate = vehicle.gps_ultima_actualizacion || vehicle.ultimaActualizacion;
  const lastUpdateTime = typeof lastUpdate === 'number' ? lastUpdate : new Date(lastUpdate).getTime();
  const timeSinceUpdate = now - lastUpdateTime;
  
  // Tiempos en milisegundos
  const ONE_MINUTE = 60 * 1000;
  const THREE_MINUTES = 3 * 60 * 1000;
  
  // Velocidad real del vehículo
  const speed = vehicle.gps_velocidad || vehicle.velocidad || 0;
  
  // CRÍTICO: Si tiene velocidad > 0, está en movimiento
  if (speed > 0) {
    return 'moving';
  }
  
  // Si velocidad = 0, verificar tiempo parado
  if (timeSinceUpdate > THREE_MINUTES) {
    return 'parked'; // > 3 min parado = GRIS (parqueado)
  } else if (timeSinceUpdate > ONE_MINUTE) {
    return 'stopped'; // 1-3 min parado = AMARILLO (detenido)
  }
  
  // Recién parado (< 1 min)
  return 'stopped';
};

// Colores por estado de movimiento
const movementColors = {
  moving: { primary: '#10b981', glow: 'rgba(16, 185, 129, 0.5)', label: 'En movimiento' },  // Verde
  stopped: { primary: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)', label: 'Detenido' },      // Amarillo
  parked: { primary: '#6b7280', glow: 'rgba(107, 114, 128, 0.4)', label: 'Parqueado' }      // Gris
};

// Iconos de vehículos - Carro con humo cuando avanza
const createCustomIcon = (estado, direccion = 0, tipoServicio = 'recoleccion', placa = '', vehicle = null) => {
  // Determinar estado de movimiento
  const movementStatus = vehicle ? getVehicleMovementStatus(vehicle) : 'moving';
  const statusColor = movementColors[movementStatus];
  const isMoving = movementStatus === 'moving';

  // Obtener velocidad para mostrar
  const speed = vehicle?.gps_velocidad || vehicle?.velocidad || 0;

  // SVG profesional de carro vista superior (estilo Google Maps/Uber)
  const iconHtml = `
    <div class="gps-car-marker" style="transform: rotate(${direccion}deg)">
      <svg viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg" class="gps-car-svg">
        <defs>
          <linearGradient id="car-gradient-${movementStatus}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:${statusColor.primary};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${statusColor.primary};stop-opacity:0.85" />
          </linearGradient>
          <filter id="car-shadow">
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
              fill="url(#car-gradient-${movementStatus})"
              filter="url(#car-shadow)"/>
        
        <!-- Capó delantero -->
        <rect x="9" y="3" width="10" height="6" rx="2" fill="${statusColor.primary}"/>
        
        <!-- Parabrisas frontal -->
        <path d="M 10 8 Q 10 7 11 7 L 17 7 Q 18 7 18 8 L 18 12 L 10 12 Z"
              fill="rgba(135,206,250,0.75)"/>
        <rect x="11" y="8" width="6" height="3" rx="1" fill="rgba(255,255,255,0.3)"/>
        
        <!-- Techo/Cabina -->
        <rect x="9" y="13" width="10" height="10" rx="2" fill="${statusColor.primary}dd"/>
        
        <!-- Ventanas laterales -->
        <rect x="9.5" y="14" width="4" height="8" rx="1" fill="rgba(135,206,250,0.6)"/>
        <rect x="14.5" y="14" width="4" height="8" rx="1" fill="rgba(135,206,250,0.6)"/>
        
        <!-- Maletero/Parte trasera -->
        <rect x="9" y="24" width="10" height="9" rx="2" fill="${statusColor.primary}cc"/>
        
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
        <circle cx="5" cy="17" r="1.5" fill="${statusColor.primary}aa"/>
        <circle cx="23" cy="17" r="1.5" fill="${statusColor.primary}aa"/>
        
        <!-- Línea central del carro -->
        <line x1="14" y1="6" x2="14" y2="33" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/>
      </svg>
      
      <!-- Indicador de estado -->
      <div class="gps-car-status gps-status-${movementStatus}"></div>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'gps-car-icon',
    iconSize: [28, 40],
    iconAnchor: [14, 20]
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

/**
 * Función auxiliar para "snap" coordenadas a la calle más cercana usando Mapbox Map Matching
 * Esto ayuda cuando las paradas están en medio de edificios o plazas
 */
const snapToNearestRoad = async (lat, lng) => {
  try {
    // Usamos Geocoding API para encontrar la dirección más cercana
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=address&limit=1&access_token=${MAPBOX_TOKEN}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [snappedLng, snappedLat] = data.features[0].center;
      const distance = Math.sqrt(
        Math.pow(snappedLat - lat, 2) + Math.pow(snappedLng - lng, 2)
      );
      
      // Si está a más de ~100 metros, significa que está en un lugar raro
      if (distance > 0.001) {
        console.warn(`📍 Coordenada ajustada de [${lat}, ${lng}] a [${snappedLat}, ${snappedLng}] (${Math.round(distance * 111000)}m de diferencia)`);
      }
      
      return { lat: snappedLat, lng: snappedLng };
    }
  } catch (error) {
    console.warn('⚠️ No se pudo ajustar coordenada a calle, usando original');
  }
  
  return { lat, lng };
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

    // Llamar a Mapbox Directions API con parámetros optimizados
    // Documentación: https://docs.mapbox.com/api/navigation/directions/
    const numWaypoints = paradas.slice(0, 25).length;
    
    const params = new URLSearchParams({
      geometries: 'geojson',           // Formato GeoJSON para coordenadas
      overview: 'full',                 // Geometría completa (todos los puntos)
      steps: 'false',                   // No necesitamos instrucciones paso a paso
      continue_straight: 'false',       // Permitir giros en U cuando sea necesario
      waypoints_per_route: 'true',      // Incluir waypoints intermedios en la respuesta
      annotations: 'speed,duration',    // Incluir velocidad y duración por segmento
      // CRÍTICO: Estos parámetros aseguran respeto a sentidos viales y calles reales
      alternatives: 'false',            // No queremos rutas alternativas, solo la mejor
      // radiuses: radio de búsqueda desde cada waypoint (unlimited = buscar la calle más cercana sin límite)
      radiuses: Array(numWaypoints).fill('unlimited').join(';'),
      // approaches: aproximarse desde el lado correcto de la calle (curb = orilla de calle)
      approaches: Array(numWaypoints).fill('curb').join(';'),
      // banner_instructions: false - no necesitamos instrucciones visuales
      banner_instructions: 'false',
      // voice_instructions: false - no necesitamos instrucciones de voz
      voice_instructions: 'false',
    });
    
    // USAR PERFIL driving (básico pero funciona bien para camiones de basura)
    // Opciones: driving, driving-traffic, walking, cycling
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?${params.toString()}&access_token=${MAPBOX_TOKEN}`;

    console.log(`🗺️ Calculando ruta con Mapbox Directions: ${paradas.length} paradas`);
    console.log(`📍 Coordenadas enviadas a Mapbox: ${coordinates}`);
    console.log(`🔗 URL Mapbox (sin token):`, url.replace(MAPBOX_TOKEN, 'HIDDEN'));

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Verificar diferentes códigos de respuesta de Mapbox
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      // Mapbox devuelve coordenadas en formato [lng, lat], necesitamos [lat, lng]
      const routeCoords = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
      const routeDistance = data.routes[0].distance; // metros
      const routeDuration = data.routes[0].duration; // segundos
      
      console.log(`✅ Ruta calculada con Mapbox: ${routeCoords.length} puntos siguiendo calles reales`);
      console.log(`📏 Distancia total: ${(routeDistance / 1000).toFixed(2)} km`);
      console.log(`⏱️ Duración estimada: ${Math.round(routeDuration / 60)} minutos`);
      console.log(`🎯 Primer punto de ruta: [${routeCoords[0]}]`);
      console.log(`🎯 Último punto de ruta: [${routeCoords[routeCoords.length - 1]}]`);
      
      return routeCoords;
    } else if (data.code === 'NoRoute') {
      console.error(`❌ Mapbox no pudo encontrar una ruta entre los puntos (NoRoute)`);
      console.error(`📍 Coordenadas problemáticas:`, coordinates);
      console.warn(`⚠️ Posibles causas: 
        1. Puntos en lugares inaccesibles (edificios, plazas, parques)
        2. Puntos muy alejados de calles
        3. Puntos en islas o zonas sin conexión vial`);
      return paradas.map(p => [p.lat || p.latitud, p.lng || p.longitud]);
    } else if (data.code === 'InvalidInput') {
      console.error(`❌ Entrada inválida para Mapbox Directions`);
      console.error(`📍 Coordenadas enviadas:`, coordinates);
      return paradas.map(p => [p.lat || p.latitud, p.lng || p.longitud]);
    } else {
      console.warn(`⚠️ Mapbox devolvió código: ${data.code}${data.message ? ' - ' + data.message : ''}`);
      console.warn(`⚠️ Usando líneas directas como fallback`);
      return paradas.map(p => [p.lat || p.latitud, p.lng || p.longitud]);
    }
  } catch (error) {
    console.error('❌ Error calculando ruta con Mapbox Directions:', error);
    // Fallback: devolver líneas directas entre paradas
    return paradas.map(p => [p.lat || p.latitud, p.lng || p.longitud]);
  }
};

const MapComponent = ({ camiones, rutas = [], personnel = [], lugares = [], userType, showRealTime = true, selectedTruck = null, serviceTypeFilter = 'todos', onViewLocationReports, isMaximized = false }) => {
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
  const [playbackMode, setPlaybackMode] = useState(false); // Modo reproducción GPS
  const [playbackVehicle, setPlaybackVehicle] = useState(null); // Vehículo en reproducción
  const mapContainerRef = useRef(null); // Referencia al contenedor del mapa
  const [isSyncing, setIsSyncing] = useState(false); // Estado de sincronización GPS
  const prevCamionesRef = useRef([]); // Tracking previo para evitar loops infinitos
  // Tema del mapa (dark/light) - Guardar en localStorage
  const [mapTheme, setMapTheme] = useState(() => {
    return localStorage.getItem('mapTheme') || 'dark';
  });
  const [showRouteInfo, setShowRouteInfo] = useState(false); // Mostrar información de la ruta
  // Mapa de rutas viales precalculadas { [routeId]: coords[] }
  const [roadRoutes, setRoadRoutes] = useState({});
  const [routesLoading, setRoutesLoading] = useState(false);
  // Estado local de rutas con paradas actualizadas
  const [localRutas, setLocalRutas] = useState(rutas);
  
  // Action de Convex para sincronizar GPS manualmente
  const syncSafeTag = useAction(api.safetag.syncAllVehicles);
  
  // Geofences
  const [geofenceMode, setGeofenceMode] = useState(false); // Modo crear geofence
  const [newGeofence, setNewGeofence] = useState(null); // {lat, lng, radio, nombre}
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const geofences = useQuery(api.geofences.list) || [];
  const createGeofence = useMutation(api.geofences.create);
  const deleteGeofence = useMutation(api.geofences.remove);

  // Route progress (para mostrar paradas completadas/pendientes)
  const allRouteProgress = useQuery(api.route_progress.list) || [];
  const activeRouteProgress = useMemo(() => {
    return allRouteProgress.filter(rp => rp.estado === 'en_progreso');
  }, [allRouteProgress]);

  // Memoizar el conteo de rutas para evitar re-renders innecesarios
  const roadRoutesCount = useMemo(() => Object.keys(roadRoutes).length, [roadRoutes]);

  // Usar refs para valores que se usan en el interval (evita stale closures)
  const localRutasRef = useRef(localRutas);
  const roadRoutesRef = useRef(roadRoutes);

  // Mantener refs actualizados (NO causan re-renders, solo sincronizan refs)
  useEffect(() => {
    localRutasRef.current = localRutas;
  }, [localRutas]);

  useEffect(() => {
    roadRoutesRef.current = roadRoutes;
  }, [roadRoutes]);

  // Función para forzar sincronización GPS
  const handleForceSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      console.log('🔄 Forzando sincronización GPS...');
      const result = await syncSafeTag();
      console.log('✅ Sincronización completada:', result);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('❌ Error en sincronización:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Manejar click en mapa para crear geofence
  const handleMapClick = (e) => {
    if (geofenceMode) {
      setNewGeofence({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        radio: 150, // Radio inicial de 150 metros
        nombre: '',
        descripcion: '',
        tipo: 'ambos' // Por defecto: alertar entrada y salida
      });
      setShowGeofenceModal(true);
      setGeofenceMode(false);
    }
  };

  // Guardar geofence
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
        tipo: 'ambos'
      });
      console.log('✅ Geofence creado:', newGeofence.nombre);
      setNewGeofence(null);
      setShowGeofenceModal(false);
    } catch (error) {
      console.error('❌ Error creando geofence:', error);
    }
  };

  // Eliminar geofence
  const handleDeleteGeofence = async (id) => {
    try {
      await deleteGeofence({ id });
      console.log('✅ Geofence eliminado');
    } catch (error) {
      console.error('❌ Error eliminando geofence:', error);
    }
  };

  // Sincronizar localRutas cuando cambien las rutas desde props
  // DISABLED #1: Sincronizar localRutas - TESTING
  // useEffect(() => {
  //   setLocalRutas(rutas);
  // }, [rutas]);

  // Mostrar todos los vehículos (demo y reales)
  const activeCamiones = mapCamiones;

  // ⚠️ SIMULACIÓN DESACTIVADA - Ahora usa datos GPS reales desde Convex
  // DISABLED FOR DEBUGGING INFINITE LOOP
  // La simulación solo se activa en modo demo
  // useEffect(() => {
  //   // Si no es modo demo, NO simular movimiento (usar datos GPS reales)
  //   const isDemoMode = camiones.some(c => c.id && c.id.startsWith('demo-'));

  //   if (!realTimeEnabled || !isDemoMode) return;

  //   const interval = setInterval(() => {
  //     setMapCamiones(prevCamiones =>
  //       prevCamiones.map(camion => {
  //         // No actualizar si el camión está siendo hovereado o está seleccionado
  //         if (hoveredTruckId === camion.id || selectedTruckId === camion.id) {
  //           return camion;
  //         }

  //         if (camion.estado === 'En ruta' && (camion.rutaAsignada || camion.ruta_id)) {
  //           const rutaId = camion.rutaAsignada || camion.ruta_id;
  //           const ruta = localRutasRef.current.find(r => r.id === rutaId || r.nombre === rutaId);

  //           if (ruta) {
  //             // Usar la ruta calculada con OSRM desde roadRoutes
  //             const rutaCalculada = roadRoutesRef.current[ruta.id];

  //             // Hacer una copia de la ruta para modificarla
  //             const rutaCopia = { ...ruta, paradas: [...(ruta.paradas || [])] };

  //             // Usar la función de simulación mejorada con la ruta real
  //             const camionActualizado = simularMovimientoReal(camion, rutaCopia, rutaCalculada);

  //             // Actualizar localRutas si las paradas cambiaron
  //             if (rutaCopia.paradas !== ruta.paradas) {
  //               setLocalRutas(prevRutas =>
  //                 prevRutas.map(r =>
  //                   r.id === ruta.id ? rutaCopia : r
  //                 )
  //               );
  //             }

  //             // Agregar posición al historial siguiendo la ruta real
  //             const newHistorial = [...(camion.historialPosiciones || [])];
  //             if (newHistorial.length > 50) { // Mantener más puntos para rutas más suaves
  //               newHistorial.shift();
  //             }
  //             newHistorial.push({
  //               lat: camionActualizado.lat,
  //               lng: camionActualizado.lng,
  //               timestamp: new Date().toISOString()
  //             });

  //             return {
  //               ...camionActualizado,
  //               ultimaActualizacion: new Date().toISOString(),
  //               historialPosiciones: newHistorial,
  //               // Simular progreso en la ruta (cada ~30 segundos avanza una parada)
  //               paradaActual: Math.min(
  //                 rutaCopia.paradas?.length || camion.totalParadas || 0,
  //                 camion.paradaActual + (Math.random() < 0.05 ? 1 : 0)
  //               )
  //             };
  //           }
  //         }
  //         return camion;
  //       })
  //     );
  //     setLastUpdate(new Date());
  //   }, 3000); // Actualizar cada 3 segundos para movimiento más fluido (solo en demo)

  //   return () => clearInterval(interval);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [realTimeEnabled, hoveredTruckId, selectedTruckId]); // NO incluir localRutas ni roadRoutes (se usan en closure)

  // Actualizar camiones SOLO cuando realmente cambien (deep comparison)
  useEffect(() => {
    // Si no hay camiones, no hacer nada
    if (!camiones || camiones.length === 0) {
      if (prevCamionesRef.current.length > 0) {
        prevCamionesRef.current = [];
        setMapCamiones([]);
      }
      return;
    }

    // Comparar si realmente cambió algo relevante
    const hasChanged =
      camiones.length !== prevCamionesRef.current.length ||
      camiones.some((c, i) => {
        const prev = prevCamionesRef.current[i];
        if (!prev) return true;

        const cId = c._id || c.id;
        const prevId = prev._id || prev.id;

        // Solo considerar cambio si: ID cambió O GPS cambió O estado cambió
        return cId !== prevId ||
               c.gps_latitud !== prev.gps_latitud ||
               c.gps_longitud !== prev.gps_longitud ||
               c.lat !== prev.lat ||
               c.lng !== prev.lng ||
               c.estado !== prev.estado;
      });

    if (hasChanged) {
      prevCamionesRef.current = camiones;

      // Normalizar datos: asegurar que tenga lat/lng además de gps_latitud/gps_longitud
      const normalizedCamiones = camiones.map(c => ({
        ...c,
        lat: c.lat || c.gps_latitud,
        lng: c.lng || c.gps_longitud,
        id: c.id || c._id,
        placa: c.placa || c.vehiculo_placa
      }));

      setMapCamiones(normalizedCamiones);
    }
  }, [camiones]);

  // DISABLED #3: Inicializar índices
  // useEffect(() => {
  //   if (routesLoading || roadRoutesCount === 0) return;

  //   setMapCamiones(prevCamiones =>
  //     prevCamiones.map(camion => {
  //       if (camion.estado === 'En ruta' && (camion.rutaAsignada || camion.ruta_id)) {
  //         return {
  //           ...camion,
  //           _necesitaRecalcularIndice: true
  //         };
  //       }
  //       return camion;
  //     })
  //   );
  // }, [routesLoading, roadRoutesCount]);

  // Actualizar selectedTruck cuando cambie externamente
  // DISABLED #5: Selected truck modal - TESTING
  // useEffect(() => {
  //   setSelectedTruckId(selectedTruck);
  //   setShowTruckModal(!!selectedTruck);
  // }, [selectedTruck]);

  /* ------------------------------------------------------------
   * Precalcular rutas reales usando Mapbox Directions para TODAS las rutas al montar.
   * ----------------------------------------------------------*/
  // ROUTE CALCULATION - Calcula rutas con Mapbox Directions API
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

          console.log(`🗺️ Calculando ruta "${ruta.nombre || ruta.name}" (ID: ${ruta._id || ruta.id}) con ${paradasNormalizadas.length} paradas...`);

          const coords = await calcularRutaCompleta(paradasNormalizadas);

          if (coords && coords.length > 0) {
            newMap[(ruta._id || ruta.id)] = coords;
            console.log(`✅ Ruta "${ruta.nombre || ruta.name}" calculada: ${coords.length} puntos de vía siguiendo calles`);
          } else {
            // Fallback: líneas directas
            console.warn(`⚠️ Usando líneas directas para ruta ${ruta.nombre}`);
            newMap[(ruta._id || ruta.id)] = paradasNormalizadas.map(p => [p.lat, p.lng]);
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
            newMap[(ruta._id || ruta.id)] = paradasNormalizadas.map(p => [p.lat, p.lng]);
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

  // Calcular centro y zoom dinámicamente basado en las rutas
  const centerPosition = useMemo(() => {
    // Si hay rutas y no hay camiones (modo reporte), centrar en las paradas de la ruta
    if (localRutas && localRutas.length > 0 && mapCamiones.length === 0) {
      const todasLasParadas = localRutas.flatMap(ruta => ruta.paradas || []);
      const paradasValidas = todasLasParadas.filter(p =>
        (p.lat || p.latitud) && (p.lng || p.longitud)
      );

      if (paradasValidas.length > 0) {
        const lats = paradasValidas.map(p => p.lat || p.latitud);
        const lngs = paradasValidas.map(p => p.lng || p.longitud);
        const centerLat = lats.reduce((sum, lat) => sum + lat, 0) / lats.length;
        const centerLng = lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length;

        console.log('🎯 Centro calculado para MapContainer:', [centerLat, centerLng]);
        return [centerLat, centerLng];
      }
    }

    // Default: Centro de distribución en Pedregal
    return [8.9833, -79.5167];
  }, [localRutas, mapCamiones]);

  const initialZoom = useMemo(() => {
    // Si hay rutas y no hay camiones (modo reporte), calcular zoom basado en distancia entre paradas
    if (localRutas && localRutas.length > 0 && mapCamiones.length === 0) {
      const todasLasParadas = localRutas.flatMap(ruta => ruta.paradas || []);
      const paradasValidas = todasLasParadas.filter(p =>
        (p.lat || p.latitud) && (p.lng || p.longitud)
      );

      if (paradasValidas.length > 1) {
        const lats = paradasValidas.map(p => p.lat || p.latitud);
        const lngs = paradasValidas.map(p => p.lng || p.longitud);
        const latDiff = Math.max(...lats) - Math.min(...lats);
        const lngDiff = Math.max(...lngs) - Math.min(...lngs);
        const maxDiff = Math.max(latDiff, lngDiff);

        // Zoom basado en distancia (más paradas cerca = más zoom)
        let zoom = 14;
        if (maxDiff > 0.05) zoom = 12;
        else if (maxDiff > 0.02) zoom = 13;
        else if (maxDiff > 0.01) zoom = 14;
        else zoom = 15;

        console.log('🎯 Zoom inicial calculado:', zoom, 'MaxDiff:', maxDiff);
        return zoom;
      } else if (paradasValidas.length === 1) {
        return 14; // Una sola parada
      }
    }

    // Default: zoom 13
    return 13;
  }, [localRutas, mapCamiones]);

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

    const ruta = localRutas.find(r => r._id === rutaId || r.id === rutaId || r.nombre === rutaId);

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
        const ruta = localRutas.find(r => r._id === rutaId || r.id === rutaId || r.nombre === rutaId);
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
          zoom={initialZoom}
          style={{ height: '1000px', width: '100%' }}
          className="leaflet-container gps-map"
          zoomAnimation={true}
          zoomAnimationThreshold={4}
          fadeAnimation={true}
          markerZoomAnimation={false}
          preferCanvas={true}
          zoomSnap={1}
          zoomDelta={1}
          wheelPxPerZoomLevel={120}
          doubleClickZoom={true}
          scrollWheelZoom={true}
          touchZoom={true}
          boxZoom={true}
          keyboard={true}
          dragging={true}
          zoomControl={true}
          attributionControl={true}
        >
          <TileLayer
            url={`https://api.mapbox.com/styles/v1/mapbox/${mapTheme}-v11/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`}
            attribution='&copy; <a href="https://www.mapbox.com/">Mapbox</a> - Datos © <a href="https://www.openstreetmap.org/">OpenStreetMap</a>.'
            tileSize={512}
            zoomOffset={-1}
            minZoom={3}
            maxZoom={19}
            keepBuffer={4}
            updateWhenIdle={false}
            updateWhenZooming={true}
            updateInterval={100}
            crossOrigin={true}
            className="map-tiles-optimized"
          />

          {/* Optimizador de mapa para zoom fluido */}
          <MapOptimizer />

          {/* Handler de clicks para crear geofences */}
          <MapClickHandler onClick={handleMapClick} active={geofenceMode} />

          {/* Geofences existentes */}
          {geofences.map(geo => (
            <Circle
              key={geo._id}
              center={[geo.latitud, geo.longitud]}
              radius={geo.radio}
              pathOptions={{
                color: geo.color || '#ef4444',
                fillColor: geo.color || '#ef4444',
                fillOpacity: 0.15,
                weight: 2,
                dashArray: '5, 5'
              }}
            >
              <Popup>
                <div className="geofence-popup">
                  <h4>{geo.nombre}</h4>
                  <p>Radio: {geo.radio}m</p>
                  <p>Tipo: {geo.tipo === 'entrada' ? 'Solo entrada' : geo.tipo === 'salida' ? 'Solo salida' : 'Entrada y salida'}</p>
                  <button 
                    className="btn-delete-geofence"
                    onClick={() => handleDeleteGeofence(geo._id)}
                  >
                    <Trash2 size={14} /> Eliminar
                  </button>
                </div>
              </Popup>
            </Circle>
          ))}

          {/* Preview de nuevo geofence */}
          {newGeofence && (
            <Circle
              center={[newGeofence.lat, newGeofence.lng]}
              radius={newGeofence.radio}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.2,
                weight: 3
              }}
            />
          )}
          
          {/* NO mostrar rutas aquí - se muestran individualmente por camión seleccionado */}

          {activeCamiones
            .filter(camion => camion.lat !== undefined && camion.lng !== undefined)
            .map(camion => {
            const loadStatus = getLoadStatus(camion.pesoAcumulado);
            const isSelected = selectedTruckId === camion.id;

            // Buscar ruta con la misma lógica que getSelectedTruckRoute
            const rutaId = camion.rutaAsignada || camion.ruta_id;
            const currentRoute = rutaId ? localRutas.find(r => r._id === rutaId || r.id === rutaId || r.nombre === rutaId) : null;

            if (isSelected) {
              console.log('🚛 CAMIÓN SELECCIONADO:', {
                placa: camion.placa || camion.id,
                conductor: camion.conductor,
                conductor_nombre: camion.conductor_nombre,
                rutaId,
                currentRoute: currentRoute?.nombre,
                paradasEnRuta: currentRoute?.paradas?.length,
                selectedTruckId,
                camionId: camion.id
              });
            }

            return (
              <div key={camion.id}>
                {/* Marcador principal del camión con estilo Uber */}
                <Marker
                  position={[camion.lat, camion.lng]}
                  icon={createCustomIcon(camion.estado, camion.direccion || camion.gps_rumbo || 0, camion.tipoServicio, camion.placa || camion.id, camion)}
                  eventHandlers={{
                    click: () => handleTruckClick(camion.id),
                    mouseover: () => setHoveredTruckId(camion.id),
                    mouseout: () => setHoveredTruckId(null)
                  }}
                >
                  {/* Tooltip en hover - Info rápida del vehículo */}
                  <Tooltip 
                    direction="top" 
                    offset={[0, -25]} 
                    opacity={1}
                    permanent={false}
                    className="vehicle-tooltip"
                  >
                    <div className="vehicle-tooltip-content">
                      <div className="tooltip-header">
                        <span className="tooltip-placa">{camion.placa || camion.id}</span>
                        <span className={`tooltip-status tooltip-status--${getVehicleMovementStatus(camion)}`}>
                          {movementColors[getVehicleMovementStatus(camion)].label}
                        </span>
                      </div>
                      <div className="tooltip-stats">
                        <div className="tooltip-stat">
                          <span className="tooltip-stat-icon">🚀</span>
                          <span className="tooltip-stat-value">{camion.gps_velocidad || camion.velocidad || 0} km/h</span>
                        </div>
                        <div className="tooltip-stat">
                          <span className="tooltip-stat-icon">🕐</span>
                          <span className="tooltip-stat-value">{formatTimeAgo(camion.gps_ultima_actualizacion || camion.ultimaActualizacion)}</span>
                        </div>
                      </div>
                      {camion.conductor && (
                        <div className="tooltip-conductor">
                          <span>👤</span> {camion.conductor}
                        </div>
                      )}
                    </div>
                  </Tooltip>

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
                    const routeKey = currentRoute?._id || currentRoute?.id;
                    console.log(`🔍 Debug camión seleccionado ${camion.placa || camion.id}:`, {
                      showTrails,
                      isSelected,
                      estado: camion.estado,
                      rutaId,
                      currentRoute: currentRoute?.nombre,
                      currentRouteId: routeKey,
                      tieneRutaCalculada: currentRoute ? !!roadRoutes[routeKey] : false,
                      puntosRuta: currentRoute && roadRoutes[routeKey] ? roadRoutes[routeKey].length : 0
                    });
                  }

                  // Mostrar ruta SIEMPRE cuando el vehículo esté seleccionado y tenga ruta asignada
                  // (removido check de camion.estado !== 'En ruta' para mostrar ruta en cualquier estado)
                  if (!isSelected || !currentRoute) {
                    return null;
                  }

                  // Intentar usar ruta calculada por OSRM/Mapbox, o fallback a ruta directa entre paradas
                  const routeKey = currentRoute._id || currentRoute.id;
                  let rutaCalculada = roadRoutes[routeKey];

                  // FALLBACK: Si no hay ruta calculada, crear ruta simple conectando las paradas directamente
                  if (!rutaCalculada || rutaCalculada.length === 0) {
                    const paradas = currentRoute.paradas || [];
                    if (paradas.length === 0) {
                      console.warn(`⚠️ No hay paradas en la ruta ${currentRoute.id || currentRoute.nombre}`);
                      return null;
                    }

                    // Crear ruta simple: líneas rectas entre paradas (estilo Google Maps)
                    rutaCalculada = paradas.map(p => [
                      p.lat || p.latitud,
                      p.lng || p.longitud
                    ]).filter(coord => coord[0] && coord[1]); // Filtrar coordenadas inválidas

                    console.log(`🗺️ Usando ruta directa entre paradas para ${currentRoute.nombre}: ${rutaCalculada.length} puntos`);
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

                {/* Marcadores de paradas de la ruta (cuando camión está seleccionado) */}
                {isSelected && currentRoute && (() => {
                  console.log('🚏 DEBUG PARADAS:', {
                    isSelected,
                    currentRoute: currentRoute?.nombre,
                    currentRouteId: currentRoute?._id || currentRoute?.id,
                    paradasCount: currentRoute?.paradas?.length,
                    conductorName: camion.conductor || camion.conductor_nombre,
                    activeRouteProgressCount: activeRouteProgress.length
                  });

                  const paradas = currentRoute.paradas || [];
                  if (paradas.length === 0) {
                    console.log('⚠️ No hay paradas en la ruta');
                    return null;
                  }

                  // Obtener route_progress del conductor para saber qué paradas están completadas
                  const conductorName = camion.conductor || camion.conductor_nombre;
                  const progress = conductorName
                    ? activeRouteProgress.find(rp => {
                        const matchName = rp.conductor_nombre === conductorName;
                        const matchRoute = (rp.ruta_id === currentRoute._id) || (rp.ruta_id === currentRoute.id);
                        console.log('🔍 Buscando progress:', {
                          rpConductor: rp.conductor_nombre,
                          conductorName,
                          matchName,
                          rpRutaId: rp.ruta_id,
                          currentRouteId: currentRoute._id || currentRoute.id,
                          matchRoute
                        });
                        return matchName && matchRoute;
                      })
                    : null;

                  console.log('📊 Progress encontrado:', progress);

                  const completedStopsData = progress?.paradas_completadas || [];
                  const completedIndices = new Set(completedStopsData.map(cs => cs.index));

                  console.log('✅ Paradas completadas:', completedStopsData);

                  return paradas.map((parada, idx) => {
                    const lat = parada.lat || parada.latitud;
                    const lng = parada.lng || parada.longitud || parada.lon;
                    if (!lat || !lng) return null;

                    const isCompleted = completedIndices.has(idx);
                    const completedStop = completedStopsData.find(cs => cs.index === idx);

                    // Crear icono personalizado para la parada
                    const stopIcon = L.divIcon({
                      className: 'custom-stop-marker',
                      html: `
                        <div class="stop-marker ${isCompleted ? 'completed' : 'pending'}">
                          <div class="stop-number">${idx + 1}</div>
                          <div class="stop-status-icon">${isCompleted ? '✓' : '⏳'}</div>
                        </div>
                      `,
                      iconSize: [40, 40],
                      iconAnchor: [20, 40]
                    });

                    return (
                      <Marker
                        key={`stop-${idx}-${currentRoute.id}`}
                        position={[lat, lng]}
                        icon={stopIcon}
                      >
                        <Popup>
                          <div className="stop-popup">
                            <h4>Parada #{idx + 1}</h4>
                            <p><strong>{parada.nombre || parada.direccion}</strong></p>
                            <p className={`stop-status ${isCompleted ? 'completed' : 'pending'}`}>
                              Estado: {isCompleted ? '✅ Completada' : '⏳ Pendiente'}
                            </p>
                            {isCompleted && completedStop && (
                              <>
                                <p><strong>Categoría:</strong> {completedStop.category}</p>
                                <p><strong>Hora:</strong> {completedStop.timestamp}</p>
                              </>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    );
                  });
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
          {!showTrails && getSelectedTruckRoute() && (() => {
            const route = getSelectedTruckRoute();
            const truck = getSelectedTruck();

            // Intentar usar ruta calculada, o fallback a ruta directa
            const routeKey = route._id || route.id;
            let fullRoute = roadRoutes[routeKey];

            // FALLBACK: Si no hay ruta calculada, crear ruta simple conectando paradas
            if (!fullRoute || fullRoute.length === 0) {
              const paradas = route.paradas || [];
              if (paradas.length === 0) return null;

              fullRoute = paradas.map(p => [
                p.lat || p.latitud,
                p.lng || p.longitud
              ]).filter(coord => coord[0] && coord[1]);

              console.log(`🗺️ [!showTrails] Usando ruta directa para ${route.nombre}: ${fullRoute.length} puntos`);
            }

            if (!fullRoute || fullRoute.length === 0) return null;

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

          {/* 🆕 Renderizado de rutas HISTÓRICAS (modo reporte - sin camiones) */}
          {mapCamiones.length === 0 && localRutas && localRutas.length > 0 && localRutas.map((ruta) => {
            const routeKey = ruta._id || ruta.id;
            const paradas = ruta.paradas || [];
            const rutaCalculada = roadRoutes[routeKey];

            console.log(`🗺️ [HISTÓRICO] Renderizando ruta: ${ruta.nombre}, Paradas: ${paradas.length}, Ruta calculada: ${rutaCalculada ? rutaCalculada.length + ' puntos' : 'NO'}`);

            return (
              <div key={routeKey}>
                {/* Polyline de la ruta calculada */}
                {rutaCalculada && rutaCalculada.length > 1 && (
                  <>
                    {/* Glow para ruta completada */}
                    <Polyline
                      positions={rutaCalculada}
                      color="#10b981"
                      weight={16}
                      opacity={0.3}
                      className="route-glow-completed"
                    />
                    {/* Línea principal completada */}
                    <Polyline
                      positions={rutaCalculada}
                      color="#10b981"
                      weight={7}
                      opacity={0.95}
                      className="route-completed"
                    />
                    {/* Highlight brillante */}
                    <Polyline
                      positions={rutaCalculada}
                      color="#34d399"
                      weight={3}
                      opacity={0.9}
                      className="route-highlight"
                    />
                  </>
                )}

                {/* Marcadores de paradas */}
                {paradas.map((parada, idx) => {
                  const lat = parada.lat || parada.latitud;
                  const lng = parada.lng || parada.longitud || parada.lon;
                  console.log(`📍 MARCADOR Parada ${idx + 1}: lat=${lat}, lng=${lng}, nombre=${parada.nombre || parada.direccion}`);
                  if (!lat || !lng) {
                    console.warn(`⚠️ Parada ${idx + 1} sin coordenadas:`, parada);
                    return null;
                  }

                  // Crear icono personalizado para la parada
                  const stopIcon = L.divIcon({
                    className: 'custom-stop-marker',
                    html: `
                      <div class="stop-marker completed">
                        <div class="stop-number">${idx + 1}</div>
                      </div>
                    `,
                    iconSize: [40, 40],
                    iconAnchor: [20, 40]
                  });

                  return (
                    <Marker
                      key={`historic-stop-${routeKey}-${idx}`}
                      position={[lat, lng]}
                      icon={stopIcon}
                    >
                      <Popup>
                        <div className="stop-popup">
                          <h4>Parada #{idx + 1}</h4>
                          <p><strong>{parada.nombre || parada.direccion}</strong></p>
                          <p className="stop-status completed">
                            Estado: Completada
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </div>
            );
          })}

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

        {/* Panel de controles del mapa - Diseño profesional compacto */}
        <div className={`map-controls-panel ${isMaximized ? 'map-controls-panel--minimized' : ''}`}>
          {/* Indicador de carga */}
          {routesLoading && (
            <div className="map-control-loading">
              <span className="loading-spinner-mini"></span>
              <span>Calculando rutas...</span>
            </div>
          )}

          {/* Grupo principal de controles */}
          <div className="map-control-group">
            {/* Toggle de rutas */}
            <button
              className={`map-control-chip ${showTrails ? 'map-control-chip--active' : ''}`}
              onClick={() => setShowTrails(!showTrails)}
              title={showTrails ? "Ocultar rutas" : "Mostrar rutas"}
            >
              <MapIcon size={16} strokeWidth={2} />
              <span className="chip-label">Rutas</span>
              <span className={`chip-indicator ${showTrails ? 'on' : 'off'}`}></span>
            </button>

            {/* Toggle GPS */}
            <button
              className={`map-control-chip ${realTimeEnabled ? 'map-control-chip--active map-control-chip--live' : ''}`}
              onClick={() => setRealTimeEnabled(!realTimeEnabled)}
              title={realTimeEnabled ? "Pausar GPS" : "Activar GPS"}
            >
              <Satellite size={16} strokeWidth={2} />
              <span className="chip-label">GPS</span>
              {realTimeEnabled && <span className="live-pulse"></span>}
            </button>

            {/* Botón Sincronizar GPS */}
            <button
              className={`map-control-chip ${isSyncing ? 'map-control-chip--syncing' : ''}`}
              onClick={handleForceSync}
              disabled={isSyncing}
              title="Sincronizar GPS ahora"
            >
              <RefreshCw size={16} strokeWidth={2} className={isSyncing ? 'spin-animation' : ''} />
              <span className="chip-label">{isSyncing ? 'Sync...' : 'Sync'}</span>
            </button>

            {/* Botón Crear Geofence */}
            <button
              className={`map-control-chip ${geofenceMode ? 'map-control-chip--geofence-active' : ''}`}
              onClick={() => setGeofenceMode(!geofenceMode)}
              title={geofenceMode ? "Cancelar" : "Crear zona de alerta"}
            >
              <Target size={16} strokeWidth={2} />
              <span className="chip-label">{geofenceMode ? 'Cancelar' : 'Zona'}</span>
            </button>

            {/* Toggle tema */}
            {!isMaximized && (
              <button
                className="map-control-chip map-control-chip--icon"
                onClick={() => {
                  const newTheme = mapTheme === 'dark' ? 'light' : 'dark';
                  setMapTheme(newTheme);
                  localStorage.setItem('mapTheme', newTheme);
                }}
                title={mapTheme === 'dark' ? "Modo día" : "Modo noche"}
              >
                {mapTheme === 'dark' ? '☀️' : '🌙'}
              </button>
            )}
          </div>

          {/* Mensaje de modo geofence activo */}
          {geofenceMode && (
            <div className="geofence-mode-hint">
              <Target size={16} />
              <span>Haz click en el mapa para crear una zona de alerta</span>
            </div>
          )}

          {/* Leyenda de estados de vehículos */}
          {!isMaximized && (
            <div className="map-legend">
              <div className="legend-item">
                <span className="legend-dot legend-moving"></span>
                <span className="legend-label">En movimiento</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot legend-stopped"></span>
                <span className="legend-label">Detenido (&gt;2min)</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot legend-parked"></span>
                <span className="legend-label">Parqueado (&gt;5min)</span>
              </div>
            </div>
          )}

          {/* Botón de limpiar selección - solo cuando hay vehículo seleccionado */}
          {selectedTruckId && !isMaximized && (
            <button
              className="map-control-chip map-control-chip--secondary"
              onClick={() => {
                setSelectedTruckId(null);
                setShowTruckModal(false);
              }}
              title="Deseleccionar vehículo"
            >
              <X size={14} strokeWidth={2.5} />
              <span className="chip-label">Deseleccionar</span>
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

        {/* Modal de información del camión - Panel Lateral Profesional */}
        {showTruckModal && getSelectedTruck() && (() => {
          const truck = getSelectedTruck();
          const movementStatus = getVehicleMovementStatus(truck);
          const statusInfo = movementColors[movementStatus];
          const hasGPS = truck.safetag_device_id || truck.gps_latitud;
          
          // Formatear estado para mostrar
          const displayEstado = truck.estado === 'en_ruta' ? 'En ruta' : 
                               truck.estado === 'disponible' ? 'Disponible' : 
                               truck.estado === 'en_mantenimiento' ? 'En mantenimiento' : 
                               truck.estado;
          
          // Determinar color del estado operativo
          const estadoColor = truck.estado === 'en_ruta' || truck.estado === 'En ruta' ? '#10b981' :
                             truck.estado === 'disponible' || truck.estado === 'Disponible' ? '#3b82f6' :
                             truck.estado === 'en_mantenimiento' ? '#f59e0b' : '#6b7280';

          return (
            <div className="truck-modal-overlay" onClick={closeTruckModal}>
              <div className="truck-modal-v2" onClick={(e) => e.stopPropagation()}>
                {/* Header con gradiente */}
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
                        {truck.tipo_servicio === 'fumigacion' || truck.tipoServicio === 'fumigacion' ? (
                          <>
                            <Spray size={14} />
                            <span>Fumigación</span>
                          </>
                        ) : (
                          <>
                            <Recycle size={14} />
                            <span>Recolección</span>
                          </>
                        )}
                      </span>
                      <span className={`badge-movement badge-movement--${movementStatus}`}>
                        <span className="badge-dot"></span>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contenido scrolleable */}
                <div className="truck-modal-content-v2">
                  
                  {/* Sección GPS en Tiempo Real */}
                  {hasGPS && (
                    <div className="info-section">
                      <div className="section-title">
                        <Satellite size={16} />
                        <span>GPS en Tiempo Real</span>
                        {truck.gps_en_linea ? (
                          <span className="status-pill status-pill--online">
                            <span className="pill-dot"></span>
                            En línea
                          </span>
                        ) : (
                          <span className="status-pill status-pill--offline">Offline</span>
                        )}
                      </div>
                      
                      <div className="stats-grid-3">
                        <div className="stat-box">
                          <div className="stat-icon-small">
                            <Gauge size={18} />
                          </div>
                          <div className="stat-data">
                            <span className="stat-number">{truck.gps_velocidad ?? 0}</span>
                            <span className="stat-unit">km/h</span>
                          </div>
                          <span className="stat-label-small">Velocidad</span>
                        </div>

                        <div className="stat-box">
                          <div className="stat-icon-small">
                            <Signal size={18} />
                          </div>
                          <div className="stat-data">
                            <span className="stat-number">{truck.gps_senal ?? '—'}</span>
                            <span className="stat-unit">%</span>
                          </div>
                          <span className="stat-label-small">Señal</span>
                        </div>

                        <div className="stat-box">
                          <div className="stat-icon-small">
                            <Clock size={18} />
                          </div>
                          <div className="stat-data">
                            <span className="stat-number-text">
                              {formatTimeAgo(truck.gps_ultima_actualizacion || truck.ultimaActualizacion)}
                            </span>
                          </div>
                          <span className="stat-label-small">Última señal</span>
                        </div>
                      </div>

                      {/* Coordenadas con botón de copiar */}
                      {truck.lat && truck.lng && (
                        <div className="coordinates-row">
                          <div className="coord-icon">
                            <MapPin size={16} />
                          </div>
                          <div className="coord-values">
                            <span className="coord-label">Ubicación</span>
                            <span className="coord-text">{truck.lat.toFixed(6)}, {truck.lng.toFixed(6)}</span>
                          </div>
                          <button
                            className="btn-copy-coords"
                            onClick={() => {
                              navigator.clipboard.writeText(`${truck.lat}, ${truck.lng}`);
                            }}
                            title="Copiar coordenadas"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      )}

                      {/* Botón Ver Historial GPS */}
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

                  {/* Sin GPS configurado */}
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

                  {/* Sección Estado Operativo */}
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

                  {/* Sección Estado de Ruta (si tiene ruta activa) */}
                  {(() => {
                    const rutaId = truck.rutaAsignada || truck.ruta_id;
                    const currentRoute = rutaId ? localRutas.find(r => r._id === rutaId || r.id === rutaId || r.nombre === rutaId) : null;

                    if (!currentRoute) return null;

                    const paradas = currentRoute.paradas || [];
                    if (paradas.length === 0) return null;

                    // Obtener route_progress del conductor
                    const conductorName = truck.conductor || truck.conductor_nombre;
                    const progress = conductorName
                      ? activeRouteProgress.find(rp =>
                          rp.conductor_nombre === conductorName &&
                          (rp.ruta_id === currentRoute._id || rp.ruta_id === currentRoute.id)
                        )
                      : null;

                    const completedStopsData = progress?.paradas_completadas || [];
                    const completedCount = completedStopsData.length;
                    const totalStops = paradas.length;
                    const progressPercent = totalStops > 0 ? Math.round((completedCount / totalStops) * 100) : 0;

                    return (
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
                              {completedCount} de {totalStops} paradas ({progressPercent}%)
                            </span>
                          </div>
                        </div>

                        {/* Lista de paradas */}
                        <div className="route-stops-list">
                          <div className="stops-list-header">
                            <span>Paradas</span>
                          </div>
                          <div className="stops-list-items">
                            {paradas.map((parada, idx) => {
                              const completedStop = completedStopsData.find(cs => cs.index === idx);
                              const isCompleted = !!completedStop;

                              return (
                                <div key={idx} className={`stop-list-item ${isCompleted ? 'completed' : 'pending'}`}>
                                  <div className="stop-number-badge">{idx + 1}</div>
                                  <div className="stop-info">
                                    <div className="stop-name">{parada.nombre || parada.direccion}</div>
                                    {isCompleted && completedStop.category && (
                                      <div className="stop-category">{completedStop.category}</div>
                                    )}
                                    {isCompleted && completedStop.timestamp && (
                                      <div className="stop-time">{completedStop.timestamp}</div>
                                    )}
                                  </div>
                                  <div className="stop-status-icon">
                                    {isCompleted ? '✓' : '⏳'}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Sección Información del Vehículo */}
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
                        {truck.tipo && (
                          <div className="info-row-v2">
                            <span className="info-label">Tipo</span>
                            <span className="info-value" style={{ textTransform: 'capitalize' }}>{truck.tipo}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sección Paradas de Ruta (si tiene ruta asignada) */}
                  {getSelectedTruckRoute() && (
                    <div className="info-section">
                      <div className="section-title">
                        <MapPin size={16} />
                        <span>Ruta Asignada</span>
                        <span className="route-progress-badge">
                          {truck.paradaActual || 0}/{getSelectedTruckRoute().paradas.length}
                        </span>
                      </div>
                      
                      <div className="stops-timeline-v2">
                        {getSelectedTruckRoute().paradas.slice(0, 5).map((parada, index) => {
                          const status = getStopStatus(index, truck);
                          const isCurrent = index === truck.paradaActual;

                          return (
                            <div key={index} className={`timeline-item-v2 timeline-item--${status}`}>
                              <div className={`timeline-dot-v2 timeline-dot--${status}`}>
                                {status === 'completed' ? '✓' : index + 1}
                              </div>
                              <div className="timeline-info">
                                <span className="timeline-name">{parada.nombre || parada.direccion || `Parada ${index + 1}`}</span>
                                {isCurrent && <span className="current-tag">Actual</span>}
                              </div>
                            </div>
                          );
                        })}
                        {getSelectedTruckRoute().paradas.length > 5 && (
                          <div className="timeline-more">
                            +{getSelectedTruckRoute().paradas.length - 5} paradas más
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

        {/* Modal de Reproducción GPS - Fullscreen */}
        <GPSPlaybackModal
          isOpen={playbackMode}
          onClose={() => {
            setPlaybackMode(false);
            setPlaybackVehicle(null);
          }}
          vehicleData={playbackVehicle}
          vehiculoId={playbackVehicle?._id}
        />

        {/* Modal para crear nuevo Geofence */}
        {showGeofenceModal && newGeofence && (
          <div className="geofence-modal-overlay" onClick={() => {
            setShowGeofenceModal(false);
            setNewGeofence(null);
          }}>
            <div className="geofence-modal" onClick={(e) => e.stopPropagation()}>
              <div className="geofence-modal-header">
                <div className="geofence-modal-icon">
                  <Target size={24} />
                </div>
                <div className="geofence-modal-title">
                  <h3>Nueva Zona de Alerta</h3>
                  <p>Define un área para recibir notificaciones cuando los vehículos entren o salgan</p>
                </div>
                <button 
                  className="geofence-modal-close"
                  onClick={() => {
                    setShowGeofenceModal(false);
                    setNewGeofence(null);
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="geofence-modal-content">
                {/* Nombre de la zona */}
                <div className="geofence-field">
                  <label className="geofence-label">
                    <MapPin size={16} />
                    Nombre de la zona
                  </label>
                  <input
                    type="text"
                    className="geofence-input"
                    placeholder="Ej: Almacén Central, Zona Prohibida..."
                    value={newGeofence.nombre}
                    onChange={(e) => setNewGeofence({ ...newGeofence, nombre: e.target.value })}
                    autoFocus
                  />
                </div>

                {/* Descripción opcional */}
                <div className="geofence-field">
                  <label className="geofence-label">
                    Descripción (opcional)
                  </label>
                  <input
                    type="text"
                    className="geofence-input"
                    placeholder="Descripción adicional..."
                    value={newGeofence.descripcion || ''}
                    onChange={(e) => setNewGeofence({ ...newGeofence, descripcion: e.target.value })}
                  />
                </div>

                {/* Radio con slider */}
                <div className="geofence-field">
                  <label className="geofence-label">
                    <Target size={16} />
                    Radio de la zona
                  </label>
                  <div className="geofence-slider-container">
                    <input
                      type="range"
                      className="geofence-slider"
                      min="50"
                      max="1000"
                      step="25"
                      value={newGeofence.radio}
                      onChange={(e) => setNewGeofence({ ...newGeofence, radio: parseInt(e.target.value) })}
                    />
                    <div className="geofence-slider-value">
                      <span className="slider-number">{newGeofence.radio}</span>
                      <span className="slider-unit">metros</span>
                    </div>
                  </div>
                  <div className="geofence-slider-marks">
                    <span>50m</span>
                    <span>500m</span>
                    <span>1km</span>
                  </div>
                </div>

                {/* Tipo de alerta */}
                <div className="geofence-field">
                  <label className="geofence-label">
                    Tipo de alerta
                  </label>
                  <div className="geofence-type-options">
                    <button
                      className={`geofence-type-btn ${newGeofence.tipo === 'ambos' ? 'active' : ''}`}
                      onClick={() => setNewGeofence({ ...newGeofence, tipo: 'ambos' })}
                    >
                      <span className="type-icon">↔️</span>
                      <span className="type-label">Entrada y salida</span>
                    </button>
                    <button
                      className={`geofence-type-btn ${newGeofence.tipo === 'entrada' ? 'active' : ''}`}
                      onClick={() => setNewGeofence({ ...newGeofence, tipo: 'entrada' })}
                    >
                      <span className="type-icon">📥</span>
                      <span className="type-label">Solo entrada</span>
                    </button>
                    <button
                      className={`geofence-type-btn ${newGeofence.tipo === 'salida' ? 'active' : ''}`}
                      onClick={() => setNewGeofence({ ...newGeofence, tipo: 'salida' })}
                    >
                      <span className="type-icon">📤</span>
                      <span className="type-label">Solo salida</span>
                    </button>
                  </div>
                </div>

                {/* Coordenadas (info) */}
                <div className="geofence-coords-info">
                  <span className="coords-label">📍 Ubicación seleccionada:</span>
                  <span className="coords-value">{newGeofence.lat.toFixed(6)}, {newGeofence.lng.toFixed(6)}</span>
                </div>
              </div>

              <div className="geofence-modal-actions">
                <button 
                  className="geofence-btn geofence-btn-cancel"
                  onClick={() => {
                    setShowGeofenceModal(false);
                    setNewGeofence(null);
                  }}
                >
                  Cancelar
                </button>
                <button 
                  className="geofence-btn geofence-btn-save"
                  onClick={handleSaveGeofence}
                  disabled={!newGeofence.nombre.trim()}
                >
                  <Target size={16} />
                  Crear zona
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapComponent;