import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { appData, simularMovimientoReal, calcularRutaCompleta } from '../../data/mockData';
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
    'En ruta': '#27AE60',
    'Disponible': '#3498DB',
    'En mantenimiento': '#F39C12'
  };
  
  // Iconos diferentes según el tipo de servicio
  const serviceIcons = {
    'recoleccion': '🚛',
    'fumigacion': '🚐'
  };
  
  // Colores específicos para fumigación
  const fumigationColors = {
    'En ruta': '#E74C3C',
    'Disponible': '#8b5cf6',
    'En mantenimiento': '#F39C12'
  };
  
  const iconColors = tipoServicio === 'fumigacion' ? fumigationColors : colors;
  
  const iconHtml = `
    <div class="custom-truck-marker gps-style ${tipoServicio}-vehicle" style="transform: rotate(${direccion}deg)">
      <div class="truck-icon-gps" style="background-color: ${iconColors[estado] || '#666666'}">
        <div class="truck-symbol">${serviceIcons[tipoServicio] || '🚛'}</div>
        <div class="gps-direction-arrow"></div>
        ${tipoServicio === 'fumigacion' ? '<div class="fumigation-indicator">🦟</div>' : ''}
      </div>
      <div class="truck-pulse-gps" style="border-color: ${iconColors[estado] || '#666666'}"></div>
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

const MapComponent = ({ camiones, userType, showRealTime = true, selectedTruck = null, serviceTypeFilter = 'todos' }) => {
  const [mapCamiones, setMapCamiones] = useState(camiones);
  const [showTrails, setShowTrails] = useState(true); // Activado por defecto para ver rutas
  const [realTimeEnabled, setRealTimeEnabled] = useState(showRealTime);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedTruckId, setSelectedTruckId] = useState(selectedTruck);
  const [showRouteInfo, setShowRouteInfo] = useState(false);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);
  const [showStopsModal, setShowStopsModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
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
            const ruta = appData.rutas.find(r => r.nombre === camion.rutaAsignada);
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

  // Force map refresh when service filter changes
  useEffect(() => {
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }, [serviceTypeFilter]);

  // Force map refresh when component mounts
  useEffect(() => {
    console.log('MapComponent mounting...');
    const timer = setTimeout(() => {
      console.log('Setting map loaded to true');
      setMapLoaded(true);
      setTimeout(() => {
        console.log('Dispatching resize event');
        window.dispatchEvent(new Event('resize'));
      }, 100);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  /* ------------------------------------------------------------
   * Precalcular rutas reales usando OSRM para TODAS las rutas al montar.
   * ----------------------------------------------------------*/
  useEffect(() => {
    let mounted = true;

    const buildAllRoutes = async () => {
      const newMap = {};
      for (const ruta of appData.rutas) {
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
      case 'En ruta': return '#27AE60';
      case 'Disponible': return '#3498DB';
      case 'En mantenimiento': return '#F39C12';
      default: return '#666666';
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLoadStatus = (pesoAcumulado) => {
    if (pesoAcumulado > 600) return { text: 'Carga alta', color: '#27AE60' };
    if (pesoAcumulado > 300) return { text: 'Carga media', color: '#F39C12' };
    if (pesoAcumulado > 0) return { text: 'Carga baja', color: '#E74C3C' };
    return { text: 'Sin carga', color: '#666666' };
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
    return appData.rutas.find(r => r.nombre === camion.rutaAsignada);
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
      'ruta-norte': '#27AE60',
      'ruta-centro': '#3498DB', 
      'ruta-sur': '#F39C12'
    };
    return colors[routeId] || '#666666';
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
              <span className="legend-color" style={{ backgroundColor: '#E74C3C' }}></span>
              🚐 Fumigación En Ruta ({activeCamiones.filter(c => c.estado === 'En ruta').length})
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#8b5cf6' }}></span>
              🚐 Fumigación Disponible ({activeCamiones.filter(c => c.estado === 'Disponible').length})
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#F39C12' }}></span>
              🚐 Fumigación Mantenimiento ({activeCamiones.filter(c => c.estado === 'En mantenimiento').length})
            </div>
          </>
        ) : serviceTypeFilter === 'recoleccion' ? (
          <>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#27AE60' }}></span>
              🚛 Recolección En Ruta ({activeCamiones.filter(c => c.estado === 'En ruta').length})
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#3498DB' }}></span>
              🚛 Recolección Disponible ({activeCamiones.filter(c => c.estado === 'Disponible').length})
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#F39C12' }}></span>
              🚛 Recolección Mantenimiento ({activeCamiones.filter(c => c.estado === 'En mantenimiento').length})
            </div>
          </>
        ) : (
          <>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#27AE60' }}></span>
              En Ruta ({activeCamiones.filter(c => c.estado === 'En ruta').length})
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#3498DB' }}></span>
              Disponible ({activeCamiones.filter(c => c.estado === 'Disponible').length})
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#F39C12' }}></span>
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

      <div style={{ position: 'relative', flex: 1, minHeight: '500px' }}>
        {!mapLoaded && (
          <div style={{ 
            height: '500px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: '#f5f5f5',
            borderRadius: '8px',
            fontSize: '18px',
            color: '#666'
          }}>
            🗺️ Cargando mapa del dashboard...
          </div>
        )}
        {mapLoaded && (
          <MapContainer 
            key={`dashboard-map-${serviceTypeFilter}-${Date.now()}`}
            center={centerPosition} 
            zoom={13} 
            style={{ height: '100%', width: '100%', minHeight: '500px' }}
            className="leaflet-container gps-map"
            whenCreated={(mapInstance) => {
              // Force resize after map creation
              console.log('MapContainer created:', mapInstance);
              setTimeout(() => {
                console.log('Invalidating map size');
                mapInstance.invalidateSize();
              }, 100);
            }}
          >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={18}
          />
          
          {/* Mostrar todas las rutas activas con estilo GPS mejorado */}
          {showTrails && appData.rutas.map(ruta => {
            const routeColor = getRouteTypeColor(ruta.id);
            const isSelectedRoute = getSelectedTruckRoute() && getSelectedTruckRoute().id === ruta.id;
            
            return (
              <Polyline
                key={`route-${ruta.id}`}
                positions={roadRoutes[ruta.id] || ruta.coordenadasCompletas}
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
              appData.rutas.find(r => r.nombre === camion.rutaAsignada) : null;
            
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
                {showTrails && camion.historialPosiciones.length > 1 && (
                  <Polyline
                    positions={camion.historialPosiciones.map(pos => [pos.lat, pos.lng])}
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
          {!showTrails && getSelectedTruckRoute() && roadRoutes[getSelectedTruckRoute().id] && (
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
                'completed': '#27AE60',
                'current': '#F39C12',
                'pending': '#666666'
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
        )}

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

              <div style={{ fontSize: '12px', color: '#666666', marginTop: '16px', textAlign: 'center' }}>
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
                    <div className="stat-value">
                      {selectedRoute.paradas.reduce((sum, p) => sum + (p.pesoRecolectado || 0), 0)} kg
                    </div>
                    <div className="stat-label">Carga Total</div>
                  </div>
                </div>
                
                {/* Resumen de carga por niveles - Solo se muestra cuando se selecciona una parada individual */}
                {selectedRoute.paradas.length > 0 && (
                  <div className="load-summary">
                    <h4>📊 Resumen de Carga por Parada</h4>
                    <div className="load-breakdown">
                      {(() => {
                        const totalCarga = selectedRoute.paradas.reduce((sum, p) => sum + (p.pesoRecolectado || 0), 0);
                        const cargasBajas = selectedRoute.paradas.filter(p => (p.pesoRecolectado || 0) <= 30).length;
                        const cargasMedias = selectedRoute.paradas.filter(p => (p.pesoRecolectado || 0) > 30 && (p.pesoRecolectado || 0) <= 60).length;
                        const cargasAltas = selectedRoute.paradas.filter(p => (p.pesoRecolectado || 0) > 60).length;
                        
                        return (
                          <div className="load-stats">
                            <div className="load-stat">
                              <span className="load-stat-icon">🟢</span>
                              <span className="load-stat-label">Cargas bajas:</span>
                              <span className="load-stat-value">{cargasBajas} paradas</span>
                            </div>
                            <div className="load-stat">
                              <span className="load-stat-icon">🟡</span>
                              <span className="load-stat-label">Cargas medias:</span>
                              <span className="load-stat-value">{cargasMedias} paradas</span>
                            </div>
                            <div className="load-stat">
                              <span className="load-stat-icon">🔴</span>
                              <span className="load-stat-label">Cargas altas:</span>
                              <span className="load-stat-value">{cargasAltas} paradas</span>
                            </div>
                            <div className="load-stat total">
                              <span className="load-stat-icon">⚖️</span>
                              <span className="load-stat-label">Total acumulado:</span>
                              <span className="load-stat-value">{totalCarga} kg</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                <div className="stops-list">
                  {selectedRoute.paradas.map((parada, index) => {
                    const currentTruck = getSelectedTruck();
                    const status = getStopStatus(index, currentTruck);
                    
                    // Calcular nivel de carga basado en peso recolectado
                    const getLoadLevel = (peso) => {
                      if (!peso || peso === 0) return { level: 'Sin carga', color: '#666666', icon: '⚪' };
                      if (peso <= 30) return { level: 'Carga baja', color: '#27AE60', icon: '🟢' };
                      if (peso <= 60) return { level: 'Carga media', color: '#F39C12', icon: '🟡' };
                      return { level: 'Carga alta', color: '#E74C3C', icon: '🔴' };
                    };
                    
                    const loadInfo = getLoadLevel(parada.pesoRecolectado);
                    
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
                            {parada.nombre}
                          </div>
                          
                          <div className="stop-address">
                            📍 {parada.direccion || parada.nombre}
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
                              {status === 'completed' && parada.horaCompletado && (
                                <>
                                  <strong> | Completado:</strong> {parada.horaCompletado}
                                </>
                              )}
                            </div>
                          </div>
                          
                          <div className="stop-load-info">
                            <div className="load-indicator" style={{ color: loadInfo.color }}>
                              <span className="load-icon">{loadInfo.icon}</span>
                              <strong>Carga:</strong> {loadInfo.level}
                              {parada.pesoRecolectado !== undefined && parada.pesoRecolectado > 0 && (
                                <span className="load-weight"> ({parada.pesoRecolectado} kg)</span>
                              )}
                            </div>
                            {status === 'completed' && parada.pesoRecolectado && (
                              <div className="completion-info">
                                <span className="completion-time">✅ Completado a las {parada.horaCompletado || parada.horaSalida}</span>
                                <span className="completion-load">📦 Carga recolectada: {parada.pesoRecolectado} kg</span>
                              </div>
                            )}
                          </div>
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