import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Satellite, Map as MapIcon, MapPin, X, Truck, Navigation, CheckCircle, Clock } from '../Icons';
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
const createCustomIcon = (estado, direccion = 0, tipoServicio = 'recoleccion', velocidad = 0, placa = '') => {
  const colors = {
    'En ruta': { primary: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
    'Disponible': { primary: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
    'En mantenimiento': { primary: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' }
  };

  const fumigationColors = {
    'En ruta': { primary: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)' },
    'Disponible': { primary: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' },
    'En mantenimiento': { primary: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' }
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

  const isMoving = estado === 'En ruta' && velocidad > 0;

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

      <!-- Badge de velocidad -->
      ${isMoving ? `
        <div class="speed-badge" style="background: rgba(0,0,0,0.75); backdrop-filter: blur(10px);">
          <span class="speed-value">${Math.round(velocidad)}</span>
          <span class="speed-unit">km/h</span>
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

const MAPBOX_TOKEN = 'pk.eyJ1Ijoia2V2aW5uMjMiLCJhIjoiY204Y2J0bWN1MTg5ZzJtb2xobXljODM0MiJ9.48MFADtQhp_sFuQjewLFeA';

// Funciones de utilidad para simulación de movimiento
const simularMovimientoReal = (camion, ruta) => {
  if (!ruta?.coordenadasCompletas || ruta.coordenadasCompletas.length === 0) {
    return camion;
  }

  const ahora = Date.now();
  const tiempoTranscurrido = ahora - (camion.ultimaActualizacion || ahora);
  const velocidadKmH = 30; // Velocidad promedio en km/h
  const velocidadMS = (velocidadKmH * 1000) / 3600; // Convertir a m/s
  const distanciaRecorrida = velocidadMS * (tiempoTranscurrido / 1000);

  // Simular avance en la ruta
  const indiceActual = camion.indiceRuta || 0;
  const coordenadas = ruta.coordenadasCompletas;
  
  if (indiceActual >= coordenadas.length - 1) {
    return { ...camion, estado: 'Disponible' };
  }

  const puntoActual = coordenadas[indiceActual];
  const siguientePunto = coordenadas[indiceActual + 1];

  return {
    ...camion,
    lat: puntoActual[0],
    lng: puntoActual[1],
    indiceRuta: Math.min(indiceActual + 1, coordenadas.length - 1),
    ultimaActualizacion: ahora,
    historialPosiciones: [
      ...(camion.historialPosiciones || []).slice(-10), // Mantener solo las últimas 10 posiciones
      { lat: puntoActual[0], lng: puntoActual[1], timestamp: new Date().toISOString() }
    ]
  };
};

const calcularRutaCompleta = async (paradas) => {
  // Simulación básica de coordenadas para las paradas
  // En un caso real, usarías una API de routing como OpenRouteService o Mapbox
  const coordenadas = [];
  
  for (let i = 0; i < paradas.length; i++) {
    const parada = paradas[i];
    // Coordenadas simuladas para Bogotá
    const lat = 4.6097100 + (Math.random() - 0.5) * 0.1;
    const lng = -74.0817500 + (Math.random() - 0.5) * 0.1;
    coordenadas.push([lat, lng]);
  }
  
  return coordenadas;
};

const MapComponent = ({ camiones, rutas = [], personnel = [], userType, showRealTime = true, selectedTruck = null, serviceTypeFilter = 'todos' }) => {
  const [mapCamiones, setMapCamiones] = useState(camiones);
  const [showTrails, setShowTrails] = useState(true); // Activado por defecto para ver rutas
  const [realTimeEnabled, setRealTimeEnabled] = useState(showRealTime);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedTruckId, setSelectedTruckId] = useState(selectedTruck);
  const [showStopsModal, setShowStopsModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [hoveredTruckId, setHoveredTruckId] = useState(null); // Para pausar animación en hover
  const [showTruckModal, setShowTruckModal] = useState(false); // Modal de información del camión
  // Mapa de rutas viales precalculadas { [routeId]: coords[] }
  const [roadRoutes, setRoadRoutes] = useState({});

  // Usar todos los camiones recibidos sin filtrar por estado
  const activeCamiones = mapCamiones;

  // Simular actualizaciones en tiempo real siguiendo rutas reales
  useEffect(() => {
    if (!realTimeEnabled) return;

    const interval = setInterval(() => {
      setMapCamiones(prevCamiones =>
        prevCamiones.map(camion => {
          // No actualizar si el camión está siendo hovereado o está seleccionado
          if (hoveredTruckId === camion.id || selectedTruckId === camion.id) {
            return camion;
          }

          if (camion.estado === 'En ruta' && camion.rutaAsignada) {
            const ruta = rutas.find(r => r.nombre === camion.rutaAsignada);
            if (ruta && ruta.coordenadasCompletas) {
              // Usar la función de simulación mejorada
              const camionActualizado = simularMovimientoReal(camion, ruta);

              // Agregar posición al historial siguiendo la ruta real
              const newHistorial = [...camion.historialPosiciones];
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
                // Simular progreso en la ruta
                paradaActual: Math.min(
                  camion.totalParadas,
                  camion.paradaActual + (Math.random() < 0.1 ? 1 : 0)
                )
              };
            }
          }
          return camion;
        })
      );
      setLastUpdate(new Date());
    }, 6000); // Actualizar cada 6 segundos para evitar movimiento demasiado rápido

    return () => clearInterval(interval);
  }, [realTimeEnabled, hoveredTruckId, selectedTruckId, rutas]);

  // Actualizar cuando cambien los camiones externos
  useEffect(() => {
    setMapCamiones(camiones);
  }, [camiones]);

  // Actualizar selectedTruck cuando cambie externamente
  useEffect(() => {
    setSelectedTruckId(selectedTruck);
    setShowRouteInfo(!!selectedTruck);
  }, [selectedTruck]);

  /* ------------------------------------------------------------
   * Precalcular rutas reales usando OSRM para TODAS las rutas al montar.
   * ----------------------------------------------------------*/
  useEffect(() => {
    let mounted = true;

    const buildAllRoutes = async () => {
      const newMap = {};
      for (const ruta of rutas) {
        try {
          console.log(`Calculando ruta ${ruta.nombre} con ${ruta.paradas.length} paradas...`);
          const coords = await calcularRutaCompleta(ruta.paradas);
          newMap[ruta.id] = coords;
          console.log(`Ruta ${ruta.nombre} calculada: ${coords.length} puntos`);
        } catch (error) {
          console.error(`Error calculando ruta ${ruta.nombre}:`, error);
          // Fallback: líneas directas entre paradas
          const fallbackCoords = [];
          ruta.paradas.forEach(parada => {
            fallbackCoords.push([parada.lat, parada.lng]);
          });
          newMap[ruta.id] = fallbackCoords;
        }
      }
      
      if (mounted) {
        setRoadRoutes(newMap);
        console.log('Todas las rutas calculadas:', Object.keys(newMap));
      }
    };

    buildAllRoutes();

    return () => {
      mounted = false;
    };
  }, []);

  // Centro en Ciudad de Panamá con mejor zoom
  const centerPosition = [8.9833, -79.5167]; // Centro de distribución en Pedregal

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'En ruta': return '#22c55e';
      case 'Disponible': return '#3b82f6';
      case 'En mantenimiento': return '#f59e0b';
      default: return '#6b7280';
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

  // Funciones para calcular métricas avanzadas
  const calculateAdvancedMetrics = (truck, route) => {
    if (!truck || !route) return null;

    const now = Date.now();
    const horaInicio = truck.horaInicio || (now - 2 * 60 * 60 * 1000); // Default: 2 horas atrás
    const tiempoEnRutaMs = now - horaInicio;
    const tiempoEnRutaHoras = tiempoEnRutaMs / (1000 * 60 * 60);
    const tiempoEnRutaMinutos = tiempoEnRutaMs / (1000 * 60);

    // Tiempo en ruta formateado
    const hours = Math.floor(tiempoEnRutaHoras);
    const minutes = Math.floor((tiempoEnRutaHoras - hours) * 60);
    const tiempoEnRuta = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}h`;

    // Calcular tiempo restante basado en paradas pendientes
    const paradasPendientes = route.paradas.length - (truck.paradaActual || 0);
    const tiempoPorParada = route.tiempoEstimado / route.paradas.length; // minutos por parada
    const tiempoRestanteMin = paradasPendientes * tiempoPorParada;
    const hoursRest = Math.floor(tiempoRestanteMin / 60);
    const minutesRest = Math.floor(tiempoRestanteMin % 60);
    const tiempoRestante = `${hoursRest.toString().padStart(2, '0')}:${minutesRest.toString().padStart(2, '0')}h`;

    // Carga acumulada
    const cargaAcumulada = truck.pesoAcumulado || route.paradas
      .slice(0, truck.paradaActual || 0)
      .reduce((sum, p) => sum + (p.pesoRecolectado || 0), 0);

    // Eficiencia (paradas por hora)
    const eficiencia = tiempoEnRutaHoras > 0
      ? ((truck.paradaActual || 0) / tiempoEnRutaHoras).toFixed(1)
      : '0.0';

    // Distancia recorrida (estimada proporcionalmente)
    const porcentajeCompletado = ((truck.paradaActual || 0) / route.paradas.length) * 100;
    const distanciaRecorrida = ((porcentajeCompletado / 100) * route.distanciaTotal).toFixed(1);

    // Velocidad promedio
    const velocidadPromedio = tiempoEnRutaHoras > 0
      ? (distanciaRecorrida / tiempoEnRutaHoras).toFixed(1)
      : '0.0';

    // Capacidad de carga (porcentaje)
    const capacidadMaxima = truck.capacidad_carga || truck.capacidadCarga || 8000;
    const porcentajeCarga = ((cargaAcumulada / capacidadMaxima) * 100).toFixed(0);

    // Último reporte (formato relativo)
    const ultimaActualizacion = truck.ultimaActualizacion || now;
    const diffMinutos = Math.floor((now - ultimaActualizacion) / (1000 * 60));
    let ultimoReporte;
    if (diffMinutos < 1) ultimoReporte = 'Ahora';
    else if (diffMinutos < 60) ultimoReporte = `Hace ${diffMinutos} min`;
    else ultimoReporte = `Hace ${Math.floor(diffMinutos / 60)}h ${diffMinutos % 60}min`;

    return {
      tiempoEnRuta,
      tiempoRestante,
      cargaAcumulada,
      eficiencia,
      distanciaRecorrida,
      distanciaTotal: route.distanciaTotal,
      velocidadPromedio,
      capacidadMaxima,
      porcentajeCarga,
      ultimoReporte,
      porcentajeCompletado: Math.round(porcentajeCompletado)
    };
  };

  const getSelectedTruckRoute = () => {
    if (!selectedTruckId) return null;
    const camion = mapCamiones.find(c => c.id === selectedTruckId);
    if (!camion) return null;

    // Buscar por ID de ruta (soporta tanto rutaAsignada como ruta_id)
    const rutaId = camion.rutaAsignada || camion.ruta_id;
    if (!rutaId) return null;

    const ruta = rutas.find(r => r.id === rutaId || r.nombre === rutaId);

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
        const ruta = rutas.find(r => r.id === rutaId || r.nombre === rutaId);
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
    <div className="map-component">
      <div style={{ position: 'relative' }}>
        <MapContainer 
          center={centerPosition} 
          zoom={13} 
          style={{ height: '600px', width: '100%' }}
          className="leaflet-container gps-map"
        >
          <TileLayer
            url={`https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`}
            attribution='&copy; <a href="https://www.mapbox.com/">Mapbox</a> - Datos © <a href="https://www.openstreetmap.org/">OpenStreetMap</a>.'
            tileSize={512}
            zoomOffset={-1}
          />
          
          {/* Mostrar todas las rutas activas con estilo GPS mejorado */}
          {showTrails && rutas.map(ruta => {
            const routeColor = getRouteTypeColor(ruta.id);
            const isSelectedRoute = getSelectedTruckRoute() && getSelectedTruckRoute().id === ruta.id;
            const routePositions = roadRoutes[ruta.id] || ruta.coordenadasCompletas;
            
            // Solo renderizar si hay coordenadas válidas
            if (!routePositions || !Array.isArray(routePositions) || routePositions.length === 0) {
              return null;
            }
            
            return (
              <Polyline
                key={`route-${ruta.id}`}
                positions={routePositions}
                color={routeColor}
                weight={isSelectedRoute ? 12 : 6} // Aumentado de 8/4 a 12/6 para mejor visibilidad GPS
                opacity={isSelectedRoute ? 1 : 0.7} // Mejor contraste
                dashArray={isSelectedRoute ? null : "15, 8"} // Patrón más visible
                className={isSelectedRoute ? 'route-selected gps-route-active' : 'gps-route'}
              />
            );
          })}
          
          {activeCamiones.map(camion => {
            const loadStatus = getLoadStatus(camion.pesoAcumulado);
            const isSelected = selectedTruckId === camion.id;
            const currentRoute = camion.rutaAsignada ? 
              rutas.find(r => r.nombre === camion.rutaAsignada) : null;
            
            return (
              <div key={camion.id}>
                {/* Marcador principal del camión con estilo GPS */}
                <Marker
                  position={[camion.lat, camion.lng]}
                  icon={createCustomIcon(camion.estado, camion.direccion, camion.tipoServicio, camion.velocidad || 0, camion.placa || camion.id)}
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
                          
                          {camion.estado === 'En ruta' && (
                            <>
                              <div className="info-row">
                                <strong>🚀 Velocidad:</strong> {camion.velocidad} km/h
                              </div>
                            </>
                          )}
                          
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

                {/* Mostrar historial de GPS si está habilitado */}
                {showTrails && camion.historialPosiciones && camion.historialPosiciones.length > 1 && (
                  <Polyline
                    positions={camion.historialPosiciones
                      .filter(pos => pos.lat != null && pos.lng != null)
                      .map(pos => [pos.lat, pos.lng])
                    }
                    color={getStatusColor(camion.estado)}
                    weight={isSelected ? 6 : 3}
                    opacity={isSelected ? 0.9 : 0.5}
                    dashArray={camion.estado === 'En ruta' ? null : "5, 10"}
                    className={isSelected ? 'route-selected gps-trail-active' : 'gps-trail'}
                  />
                )}

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
            const stops = route.paradas;
            const currentStopIndex = truck.paradaActual || 0;

            // Calcular índices de segmentos en la ruta
            const totalPoints = fullRoute.length;
            const pointsPerStop = Math.floor(totalPoints / stops.length);

            const segments = [];

            // Segmento completado (verde)
            if (currentStopIndex > 0) {
              const completedEnd = Math.min(currentStopIndex * pointsPerStop, totalPoints);
              const completedSegment = fullRoute.slice(0, completedEnd);

              if (completedSegment.length > 1) {
                segments.push(
                  <React.Fragment key="completed">
                    {/* Glow effect */}
                    <Polyline
                      positions={completedSegment}
                      color="#10b981"
                      weight={20}
                      opacity={0.2}
                      className="route-glow"
                    />
                    {/* Main line */}
                    <Polyline
                      positions={completedSegment}
                      color="#10b981"
                      weight={8}
                      opacity={0.9}
                      className="route-completed"
                    />
                    {/* Highlight */}
                    <Polyline
                      positions={completedSegment}
                      color="#ffffff"
                      weight={2}
                      opacity={0.6}
                    />
                  </React.Fragment>
                );
              }
            }

            // Segmento actual (naranja animado)
            if (currentStopIndex < stops.length) {
              const currentStart = currentStopIndex * pointsPerStop;
              const currentEnd = Math.min((currentStopIndex + 1) * pointsPerStop, totalPoints);
              const currentSegment = fullRoute.slice(currentStart, currentEnd);

              if (currentSegment.length > 1) {
                segments.push(
                  <React.Fragment key="current">
                    {/* Glow effect */}
                    <Polyline
                      positions={currentSegment}
                      color="#f59e0b"
                      weight={20}
                      opacity={0.25}
                      className="route-glow route-glow-pulse"
                    />
                    {/* Main line with animation */}
                    <Polyline
                      positions={currentSegment}
                      color="#f59e0b"
                      weight={8}
                      opacity={0.95}
                      className="route-current route-pulse"
                    />
                    {/* Highlight */}
                    <Polyline
                      positions={currentSegment}
                      color="#ffffff"
                      weight={2}
                      opacity={0.7}
                    />
                  </React.Fragment>
                );
              }
            }

            // Segmentos pendientes (gris punteado)
            if (currentStopIndex + 1 < stops.length) {
              const pendingStart = (currentStopIndex + 1) * pointsPerStop;
              const pendingSegment = fullRoute.slice(pendingStart);

              if (pendingSegment.length > 1) {
                segments.push(
                  <React.Fragment key="pending">
                    {/* Glow effect */}
                    <Polyline
                      positions={pendingSegment}
                      color="#9ca3af"
                      weight={16}
                      opacity={0.15}
                    />
                    {/* Main line dashed */}
                    <Polyline
                      positions={pendingSegment}
                      color="#9ca3af"
                      weight={6}
                      opacity={0.6}
                      dashArray="12, 8"
                      className="route-pending"
                    />
                  </React.Fragment>
                );
              }
            }

            return <>{segments}</>;
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
        </MapContainer>

        {/* Controles personalizados del mapa */}
        <div className="map-controls">
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
                      backgroundColor: getSelectedTruck().estado === 'En ruta' ? 'rgba(16, 185, 129, 0.1)' :
                                      getSelectedTruck().estado === 'Disponible' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      borderColor: getSelectedTruck().estado === 'En ruta' ? 'rgba(16, 185, 129, 0.3)' :
                                  getSelectedTruck().estado === 'Disponible' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(245, 158, 11, 0.3)'
                    }}>
                      <Satellite size={24} />
                    </div>
                    <div className="status-info">
                      <div className="status-label">Estado</div>
                      <div className="status-value" style={{
                        color: getSelectedTruck().estado === 'En ruta' ? '#059669' :
                               getSelectedTruck().estado === 'Disponible' ? '#2563eb' : '#d97706'
                      }}>
                        {getSelectedTruck().estado}
                      </div>
                    </div>
                  </div>

                  <div className="status-card">
                    <div className="status-icon-wrapper" style={{
                      backgroundColor: 'rgba(139, 92, 246, 0.1)',
                      borderColor: 'rgba(139, 92, 246, 0.3)'
                    }}>
                      <Navigation size={24} />
                    </div>
                    <div className="status-info">
                      <div className="status-label">Velocidad</div>
                      <div className="status-value">{getSelectedTruck().velocidad || 0} km/h</div>
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

                {/* Información de la ruta */}
                {getSelectedTruckRoute() && (
                  <>
                    <div className="route-info-section">
                      <div className="section-header">
                        <MapPin size={20} strokeWidth={2} />
                        <h4>Información de Ruta</h4>
                      </div>

                      <div className="route-name">
                        <strong>{getSelectedTruckRoute().nombre}</strong>
                      </div>

                      <div className="route-stats-grid">
                        <div className="stat-card">
                          <div className="stat-icon">📍</div>
                          <div className="stat-content">
                            <div className="stat-value">{getSelectedTruckRoute().paradas.length}</div>
                            <div className="stat-label">Paradas Totales</div>
                          </div>
                        </div>

                        <div className="stat-card">
                          <div className="stat-icon">✅</div>
                          <div className="stat-content">
                            <div className="stat-value">{getSelectedTruck().paradaActual || 0}</div>
                            <div className="stat-label">Completadas</div>
                          </div>
                        </div>

                        <div className="stat-card">
                          <div className="stat-icon">⏳</div>
                          <div className="stat-content">
                            <div className="stat-value">{getSelectedTruckRoute().paradas.length - (getSelectedTruck().paradaActual || 0)}</div>
                            <div className="stat-label">Pendientes</div>
                          </div>
                        </div>

                        <div className="stat-card">
                          <div className="stat-icon">📏</div>
                          <div className="stat-content">
                            <div className="stat-value">{getSelectedTruckRoute().distanciaTotal} km</div>
                            <div className="stat-label">Distancia</div>
                          </div>
                        </div>
                      </div>

                      {/* Progreso de la ruta */}
                      <div className="route-progress-section">
                        <div className="progress-header">
                          <span>Progreso de Ruta</span>
                          <span className="progress-percentage">{calculateProgress(getSelectedTruck(), getSelectedTruckRoute())}%</span>
                        </div>
                        <div className="progress-bar-container">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${calculateProgress(getSelectedTruck(), getSelectedTruckRoute())}%` }}
                          ></div>
                        </div>
                        <div className="progress-info">
                          {getSelectedTruck().paradaActual || 0} de {getSelectedTruckRoute().paradas.length} paradas completadas
                        </div>
                      </div>
                    </div>

                    {/* Métricas operativas avanzadas */}
                    {(() => {
                      const metrics = calculateAdvancedMetrics(getSelectedTruck(), getSelectedTruckRoute());
                      if (!metrics) return null;

                      return (
                        <div className="operational-metrics-section">
                          <div className="section-header">
                            <Clock size={20} strokeWidth={2} />
                            <h4>Métricas Operativas</h4>
                          </div>

                          <div className="metrics-grid">
                            <div className="metric-card">
                              <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                                ⏱️
                              </div>
                              <div className="metric-content">
                                <div className="metric-value">{metrics.tiempoEnRuta}</div>
                                <div className="metric-label">Tiempo en Ruta</div>
                              </div>
                            </div>

                            <div className="metric-card">
                              <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                                🎯
                              </div>
                              <div className="metric-content">
                                <div className="metric-value">{metrics.tiempoRestante}</div>
                                <div className="metric-label">Tiempo Restante</div>
                              </div>
                            </div>

                            <div className="metric-card">
                              <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                                📦
                              </div>
                              <div className="metric-content">
                                <div className="metric-value">{metrics.cargaAcumulada} kg</div>
                                <div className="metric-label">Carga Acumulada</div>
                              </div>
                            </div>

                            <div className="metric-card">
                              <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
                                ⚡
                              </div>
                              <div className="metric-content">
                                <div className="metric-value">{metrics.eficiencia}/h</div>
                                <div className="metric-label">Eficiencia</div>
                              </div>
                            </div>

                            <div className="metric-card">
                              <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' }}>
                                📍
                              </div>
                              <div className="metric-content">
                                <div className="metric-value">{metrics.distanciaRecorrida} km</div>
                                <div className="metric-label">Distancia Recorrida</div>
                              </div>
                            </div>

                            <div className="metric-card">
                              <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }}>
                                🚀
                              </div>
                              <div className="metric-content">
                                <div className="metric-value">{metrics.velocidadPromedio} km/h</div>
                                <div className="metric-label">Velocidad Promedio</div>
                              </div>
                            </div>
                          </div>

                          {/* Barra de capacidad de carga */}
                          <div className="capacity-section">
                            <div className="capacity-header">
                              <span>Capacidad de Carga</span>
                              <span className="capacity-percentage">{metrics.porcentajeCarga}%</span>
                            </div>
                            <div className="capacity-bar-container">
                              <div
                                className="capacity-bar-fill"
                                style={{
                                  width: `${metrics.porcentajeCarga}%`,
                                  background: metrics.porcentajeCarga > 80
                                    ? 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)'
                                    : metrics.porcentajeCarga > 50
                                    ? 'linear-gradient(90deg, #10b981 0%, #f59e0b 100%)'
                                    : 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)'
                                }}
                              ></div>
                            </div>
                            <div className="capacity-info">
                              {metrics.cargaAcumulada} kg de 5,000 kg capacidad
                            </div>
                          </div>

                          {/* Último reporte */}
                          <div className="last-report">
                            <span className="report-icon">🕐</span>
                            <span>Último reporte: {metrics.ultimoReporte}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Próxima parada */}
                    <div className="next-stop-section">
                      <div className="section-header">
                        <Navigation size={20} strokeWidth={2} />
                        <h4>Próxima Parada</h4>
                      </div>

                      {getSelectedTruckRoute().paradas[getSelectedTruck().paradaActual] ? (
                        <div className="next-stop-card">
                          <div className="next-stop-number">
                            {(getSelectedTruck().paradaActual || 0) + 1}
                          </div>
                          <div className="next-stop-details">
                            <div className="next-stop-name">
                              {getSelectedTruckRoute().paradas[getSelectedTruck().paradaActual].nombre}
                            </div>
                            <div className="next-stop-address">
                              {getSelectedTruckRoute().paradas[getSelectedTruck().paradaActual].direccion ||
                               getSelectedTruckRoute().paradas[getSelectedTruck().paradaActual].nombre}
                            </div>
                            <div className="next-stop-eta">
                              ETA: {getSelectedTruckRoute().paradas[getSelectedTruck().paradaActual].estimado}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="route-completed-card">
                          <CheckCircle size={32} />
                          <div className="completed-text">Ruta Completada</div>
                          <div className="completed-subtext">Todas las paradas han sido visitadas</div>
                        </div>
                      )}
                    </div>

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

                    {/* Botón para ver todas las paradas en detalle */}
                    <div className="modal-actions">
                      <button
                        className="btn-modal btn-modal--primary"
                        onClick={() => {
                          handleStopClick(getSelectedTruckRoute());
                          closeTruckModal();
                        }}
                      >
                        <MapPin size={18} strokeWidth={2} />
                        Ver todas las paradas en detalle
                      </button>
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
      </div>
    </div>
  );
};

export default MapComponent; 