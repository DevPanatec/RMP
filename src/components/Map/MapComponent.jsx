import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapComponent.css';

// Fix para iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Iconos personalizados para diferentes estados con mejor diseño GPS
const createCustomIcon = (estado, direccion = 0, tipoServicio = 'recoleccion') => {
  const colors = {
    'En ruta': '#22c55e',
    'Disponible': '#3b82f6',
    'En mantenimiento': '#f59e0b'
  };
  
  // Iconos diferentes según el tipo de servicio
  const serviceIcons = {
    'recoleccion': '🚛',
    'fumigacion': '🚐'
  };
  
  // Colores específicos para fumigación
  const fumigationColors = {
    'En ruta': '#ef4444',
    'Disponible': '#8b5cf6',
    'En mantenimiento': '#f59e0b'
  };
  
  const iconColors = tipoServicio === 'fumigacion' ? fumigationColors : colors;
  
  const iconHtml = `
    <div class="custom-truck-marker gps-style ${tipoServicio}-vehicle" style="transform: rotate(${direccion}deg)">
      <div class="truck-icon-gps" style="background-color: ${iconColors[estado] || '#6b7280'}">
        <div class="truck-symbol">${serviceIcons[tipoServicio] || '🚛'}</div>
        <div class="gps-direction-arrow"></div>
        ${tipoServicio === 'fumigacion' ? '<div class="fumigation-indicator">🦟</div>' : ''}
      </div>
      <div class="truck-pulse-gps" style="border-color: ${iconColors[estado] || '#6b7280'}"></div>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-div-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
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

  const iconHtml = `
    <div class="route-stop-marker-gps route-stop-${status}" 
         style="border-color: ${color}; background: ${color};">
      <div class="stop-content-large">
        ${iconos[tipo] || stopNumber}
      </div>
      <div class="stop-number-badge-large">${stopNumber}</div>
    </div>
  `;
  
  return L.divIcon({
    html: iconHtml,
    className: 'custom-div-icon',
    iconSize: [45, 45], // Aumentado de 35x35 a 45x45
    iconAnchor: [22, 45]
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

const MapComponent = ({ camiones, rutas = [], userType, showRealTime = true, selectedTruck = null, serviceTypeFilter = 'todos' }) => {
  const [mapCamiones, setMapCamiones] = useState(camiones);
  const [showTrails, setShowTrails] = useState(true); // Activado por defecto para ver rutas
  const [realTimeEnabled, setRealTimeEnabled] = useState(showRealTime);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedTruckId, setSelectedTruckId] = useState(selectedTruck);
  const [showRouteInfo, setShowRouteInfo] = useState(false);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);
  const [showStopsModal, setShowStopsModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
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
    }, 2000); // Actualizar cada 2 segundos para movimiento más suave

    return () => clearInterval(interval);
  }, [realTimeEnabled]);

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
      setShowRouteInfo(false);
    } else {
      setSelectedTruckId(camionId);
      setShowRouteInfo(true);
      setIsPanelMinimized(false);
    }
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
    if (!camion || !camion.rutaAsignada) return null;
    return rutas.find(r => r.nombre === camion.rutaAsignada);
  };

  const getSelectedTruck = () => {
    if (!selectedTruckId) return null;
    return mapCamiones.find(c => c.id === selectedTruckId);
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
      <div className="map-controls">
        <div className="control-group">
          <label className="control-label gps-control">
            <input
              type="checkbox"
              checked={realTimeEnabled}
              onChange={(e) => setRealTimeEnabled(e.target.checked)}
            />
            🛰️ GPS en Tiempo Real
          </label>
          <label className="control-label gps-control">
            <input
              type="checkbox"
              checked={showTrails}
              onChange={(e) => setShowTrails(e.target.checked)}
            />
            🗺️ Mostrar Rutas Completas
          </label>
          {selectedTruckId && (
            <div className="selected-truck-info gps-info">
              📍 Rastreando: <strong>{getSelectedTruck()?.conductor}</strong> ({selectedTruckId})
              <button 
                className="btn btn--sm btn--outline"
                onClick={() => handleTruckClick(selectedTruckId)}
              >
                ❌ Dejar de rastrear
              </button>
            </div>
          )}
        </div>
        <div className="update-info gps-update">
          <span className="update-time">
            🕐 Última actualización: {formatTime(lastUpdate)}
          </span>
          {realTimeEnabled && (
            <span className="live-indicator gps-live">
              🔴 EN VIVO
            </span>
          )}
        </div>
      </div>

      <div className="map-legend gps-legend">
        {serviceTypeFilter === 'fumigacion' ? (
          <>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#ef4444' }}></span>
              🚐 Fumigación En Ruta ({activeCamiones.filter(c => c.estado === 'En ruta').length})
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#8b5cf6' }}></span>
              🚐 Fumigación Disponible ({activeCamiones.filter(c => c.estado === 'Disponible').length})
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
              🚐 Fumigación Mantenimiento ({activeCamiones.filter(c => c.estado === 'En mantenimiento').length})
            </div>
          </>
        ) : serviceTypeFilter === 'recoleccion' ? (
          <>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#22c55e' }}></span>
              🚛 Recolección En Ruta ({activeCamiones.filter(c => c.estado === 'En ruta').length})
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#3b82f6' }}></span>
              🚛 Recolección Disponible ({activeCamiones.filter(c => c.estado === 'Disponible').length})
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
              🚛 Recolección Mantenimiento ({activeCamiones.filter(c => c.estado === 'En mantenimiento').length})
            </div>
          </>
        ) : (
          <>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#22c55e' }}></span>
              En Ruta ({activeCamiones.filter(c => c.estado === 'En ruta').length})
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#3b82f6' }}></span>
              Disponible ({activeCamiones.filter(c => c.estado === 'Disponible').length})
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
              Mantenimiento ({activeCamiones.filter(c => c.estado === 'En mantenimiento').length})
            </div>
            <div className="legend-item" style={{ opacity: 0.7, fontSize: '10px' }}>
              🚛 Recolección | 🚐 Fumigación
            </div>
          </>
        )}
        <div className="legend-item" style={{ opacity: 0.6, fontSize: '11px' }}>
          💡 Solo vehículos activos
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <MapContainer 
          center={centerPosition} 
          zoom={13} 
          style={{ height: '600px', width: '100%' }}
          className="leaflet-container gps-map"
        >
          <TileLayer
            url={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`}
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
                  icon={createCustomIcon(camion.estado, camion.direccion, camion.tipoServicio)}
                  eventHandlers={{
                    click: () => handleTruckClick(camion.id)
                  }}
                >
                  {/* Solo mostrar popup si NO está seleccionado, para evitar dos modales */}
                  {!isSelected && (
                    <Popup>
                      <div className={`truck-popup gps-popup ${camion.tipoServicio === 'fumigacion' ? 'fumigation-popup' : ''}`}>
                        <div className="popup-header">
                          <h4>
                            {camion.tipoServicio === 'fumigacion' ? '🚐' : '🚛'} {camion.id}
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

          {/* Dibujar la ruta seleccionada con mayor grosor */}
          {!showTrails && getSelectedTruckRoute() && roadRoutes[getSelectedTruckRoute().id] && 
           Array.isArray(roadRoutes[getSelectedTruckRoute().id]) && 
           roadRoutes[getSelectedTruckRoute().id].length > 0 && (
            <Polyline
              positions={roadRoutes[getSelectedTruckRoute().id]}
              color={getStatusColor(getSelectedTruck()?.estado || 'En ruta')}
              weight={12} // Aumentado de 8 a 12
              opacity={0.95}
              className="route-selected gps-route-active"
            />
          )}

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

        {/* Panel de información GPS */}
        {showRouteInfo && getSelectedTruckRoute() && getSelectedTruck() && (
          <div 
            className={`route-info-panel gps-info-panel ${isPanelMinimized ? 'minimized' : ''}`}
            onClick={isPanelMinimized ? () => setIsPanelMinimized(false) : undefined}
          >
            <div className="route-info-header">
              <h4 className="route-info-title">
                🛰️ GPS: {getSelectedTruckRoute().nombre}
                {getSelectedTruck().tipoServicio === 'fumigacion' && (
                  <span className="service-type-badge">🚐 FUMIGACIÓN</span>
                )}
                {getSelectedTruck().tipoServicio === 'recoleccion' && (
                  <span className="service-type-badge">🚛 RECOLECCIÓN</span>
                )}
              </h4>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button 
                  className="route-minimize-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPanelMinimized(!isPanelMinimized);
                  }}
                  title={isPanelMinimized ? "Expandir panel" : "Minimizar panel"}
                >
                  {isPanelMinimized ? '⬆️' : '⬇️'}
                </button>
                <button 
                  className="route-close-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRouteInfo(false);
                    setIsPanelMinimized(false);
                  }}
                  title="Cerrar panel"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="route-info-content">
              <div className="gps-status">
                <div className="gps-signal">
                  <span className="signal-icon">📡</span>
                  <span>Señal GPS: Fuerte</span>
                </div>
                <div className="vehicle-speed">
                  <span className="speed-icon">🚀</span>
                  <span>{getSelectedTruck().velocidad} km/h</span>
                </div>
              </div>
              
              <div className="route-stats">
                <div className="route-stat">
                  <div className="route-stat-value">{getSelectedTruckRoute().paradas.length}</div>
                  <div className="route-stat-label">Paradas Total</div>
                </div>
                <div className="route-stat">
                  <div className="route-stat-value">{getSelectedTruckRoute().distanciaTotal} km</div>
                  <div className="route-stat-label">Distancia GPS</div>
                </div>
                <div className="route-stat">
                  <div className="route-stat-value">{getSelectedTruck().paradaActual}</div>
                  <div className="route-stat-label">Completadas</div>
                </div>
                <div className="route-stat">
                  <div className="route-stat-value">{Math.round(getSelectedTruckRoute().tiempoEstimado / 60)}h</div>
                  <div className="route-stat-label">ETA Total</div>
                </div>
              </div>
              
              <div className="route-progress">
                <div className="route-progress-bar">
                  <div 
                    className="route-progress-fill gps-progress"
                    style={{ width: `${calculateProgress(getSelectedTruck(), getSelectedTruckRoute())}%` }}
                  ></div>
                </div>
                <div className="route-progress-text">
                  Progreso GPS: {getSelectedTruck().paradaActual}/{getSelectedTruckRoute().paradas.length} paradas 
                  ({calculateProgress(getSelectedTruck(), getSelectedTruckRoute())}%)
                </div>
              </div>

              <div className="next-stop-info">
                <h6>📍 Próxima parada:</h6>
                {getSelectedTruckRoute().paradas[getSelectedTruck().paradaActual] ? (
                  <div className="next-stop">
                    <strong>{getSelectedTruckRoute().paradas[getSelectedTruck().paradaActual].nombre}</strong><br/>
                    <small>{getSelectedTruckRoute().paradas[getSelectedTruck().paradaActual].direccion || getSelectedTruckRoute().paradas[getSelectedTruck().paradaActual].nombre}</small><br/>
                    <small>ETA: {getSelectedTruckRoute().paradas[getSelectedTruck().paradaActual].estimado}</small>
                  </div>
                ) : (
                  <div className="route-complete">
                    ✅ Ruta completada
                  </div>
                )}
              </div>

              <div className="route-actions">
                <button 
                  className="btn btn--primary btn--full"
                  onClick={() => handleStopClick(getSelectedTruckRoute())}
                >
                  📋 Ver todas las paradas
                </button>
              </div>

              <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '16px', textAlign: 'center' }}>
                💡 Navegación GPS en tiempo real activada
              </div>
            </div>
          </div>
        )}

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
      </div>
    </div>
  );
};

export default MapComponent; 