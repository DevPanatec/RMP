import { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { appData, simularMovimientoReal, calcularRutaCompleta } from '../../data/mockData';
import './MapComponent.css';

// Configurar token de Mapbox
mapboxgl.accessToken = 'pk.eyJ1Ijoia2V2aW5uMjMiLCJhIjoiY204Y2J0bWN1MTg5ZzJtb2xobXljODM0MiJ9.48MFADtQhp_sFuQjewLFeA';

// Servicio de geocoding para obtener direcciones reales
const geocodeAddress = async (coordinates) => {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates[0]},${coordinates[1]}.json?access_token=${mapboxgl.accessToken}&language=es&country=pa`
    );
    const data = await response.json();
    return data.features[0]?.place_name || `${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)}`;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return `${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)}`;
  }
};

// Servicio de rutas optimizadas
const getOptimizedRoute = async (coordinates, profile = 'driving') => {
  try {
    const coordinatesString = coordinates.map(coord => coord.join(',')).join(';');
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinatesString}?geometries=geojson&access_token=${mapboxgl.accessToken}&language=es`
    );
    const data = await response.json();
    return data.routes[0]?.geometry || null;
  } catch (error) {
    console.error('Error getting optimized route:', error);
    return null;
  }
};

// Función para crear marcadores de vehículos
const createVehicleMarker = (camion) => {
  const colors = {
    'En ruta': '#27AE60',
    'Disponible': '#3498DB',
    'En mantenimiento': '#F39C12'
  };
  
  const fumigationColors = {
    'En ruta': '#E74C3C',
    'Disponible': '#8b5cf6',
    'En mantenimiento': '#F39C12'
  };
  
  const iconColors = camion.tipoServicio === 'fumigacion' ? fumigationColors : colors;
  const serviceIcon = camion.tipoServicio === 'fumigacion' ? '🚐' : '🚛';
  
  const el = document.createElement('div');
  el.className = 'mapbox-vehicle-marker';
  el.style.backgroundColor = iconColors[camion.estado] || '#666666';
  el.style.width = '40px';
  el.style.height = '40px';
  el.style.borderRadius = '50%';
  el.style.border = '3px solid white';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.fontSize = '16px';
  el.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
  el.style.cursor = 'pointer';
  el.innerHTML = serviceIcon;
  
  return el;
};

// Función para crear marcadores de paradas
const createStopMarker = (stopNumber, status) => {
  const colors = {
    'completed': '#27AE60',
    'current': '#F39C12',
    'pending': '#666666'
  };
  
  const el = document.createElement('div');
  el.className = 'mapbox-stop-marker';
  el.style.backgroundColor = colors[status];
  el.style.width = '30px';
  el.style.height = '30px';
  el.style.borderRadius = '50%';
  el.style.border = '2px solid white';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.fontSize = '12px';
  el.style.fontWeight = 'bold';
  el.style.color = 'white';
  el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  el.style.cursor = 'pointer';
  el.innerHTML = stopNumber;
  
  return el;
};

const MapComponent = ({ camiones, userType, showRealTime = true, selectedTruck = null, serviceTypeFilter = 'todos' }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef(new Map());
  const routeLines = useRef(new Map());
  const routeStops = useRef(new Map());
  const activeRouteLayer = useRef(null);
  const progressMarkers = useRef(new Map());
  
  const [mapCamiones, setMapCamiones] = useState(camiones);
  const [showTrails, setShowTrails] = useState(true);
  const [realTimeEnabled, setRealTimeEnabled] = useState(showRealTime);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedTruckId, setSelectedTruckId] = useState(selectedTruck);
  const [showRouteInfo, setShowRouteInfo] = useState(false);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);
  const [showStopsModal, setShowStopsModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [roadRoutes, setRoadRoutes] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isFollowingTruck, setIsFollowingTruck] = useState(false);
  const [routeVisibility, setRouteVisibility] = useState({});
  const [animationFrame, setAnimationFrame] = useState(null);
  const [showTruckModal, setShowTruckModal] = useState(false);
  const [selectedTruckData, setSelectedTruckData] = useState(null);
  const [truckAddress, setTruckAddress] = useState('Obteniendo ubicación...');

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
    
    if (selectedTruck && map.current && mapLoaded) {
      const camion = mapCamiones.find(c => c.id === selectedTruck);
      if (camion) {
        setIsFollowingTruck(true);
        // Zoom automático al camión seleccionado
        setTimeout(() => {
          if (map.current) {
            map.current.flyTo({
              center: [camion.lng, camion.lat],
              zoom: 16,
              pitch: 60,
              bearing: 0,
              speed: 1.2,
              curve: 1.42,
              essential: true
            });
            highlightTruckRoute(camion);
          }
        }, 100);
      }
    } else {
      setIsFollowingTruck(false);
      if (map.current && mapLoaded) {
        restoreAllRoutes();
      }
    }
  }, [selectedTruck, mapCamiones, mapLoaded]);

  // Force map refresh when service filter changes
  useEffect(() => {
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }, [serviceTypeFilter]);

  // Inicializar mapa de Mapbox
  useEffect(() => {
    if (map.current) return; // Prevenir múltiples inicializaciones
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-79.5167, 8.9833], // Ciudad de Panamá
      zoom: 13,
      pitch: 45, // Vista 3D
      bearing: 0
    });

    // Agregar controles de navegación
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    
    // Agregar control de geolocalización
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      }), 'top-right'
    );

    // Cuando el mapa esté cargado
    map.current.on('load', () => {
      setMapLoaded(true);
      console.log('Mapbox cargado correctamente');
    });

    return () => {
      if (map.current) {
        // Limpiar marcadores
        markers.current.forEach(marker => marker.remove());
        markers.current.clear();
        
        // Limpiar rutas
        routeLines.current.forEach((sourceId, routeId) => {
          if (map.current.getLayer(`route-layer-${routeId}`)) {
            map.current.removeLayer(`route-layer-${routeId}`);
          }
          if (map.current.getSource(sourceId)) {
            map.current.removeSource(sourceId);
          }
        });
        routeLines.current.clear();
        
        // Limpiar paradas
        routeStops.current.forEach((sourceId, routeId) => {
          if (map.current.getLayer(`stops-layer-${routeId}`)) {
            map.current.removeLayer(`stops-layer-${routeId}`);
          }
          if (map.current.getSource(sourceId)) {
            map.current.removeSource(sourceId);
          }
        });
        routeStops.current.clear();
        
        // Limpiar progreso
        if (progressMarkers.current) {
          progressMarkers.current.forEach(marker => marker.remove());
          progressMarkers.current.clear();
        }
        
        // Cancelar animaciones
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
        
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Actualizar marcadores de vehículos con animación fluida
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    mapCamiones.forEach(camion => {
      const existingMarker = markers.current.get(camion.id);
      
      if (existingMarker) {
        // Actualizar posición con animación fluida
        const currentLngLat = existingMarker.getLngLat();
        const newLngLat = [camion.lng, camion.lat];
        
        // Solo animar si la posición ha cambiado significativamente
        const distance = Math.sqrt(
          Math.pow(newLngLat[0] - currentLngLat.lng, 2) + 
          Math.pow(newLngLat[1] - currentLngLat.lat, 2)
        );
        
        if (distance > 0.0001) { // Umbral mínimo para evitar animaciones innecesarias
          // Animación suave de movimiento
          const duration = 2000; // 2 segundos
          const startTime = Date.now();
          const startPos = [currentLngLat.lng, currentLngLat.lat];
          const endPos = newLngLat;
          
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Función de easing para movimiento suave
            const easeInOutQuad = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            const easedProgress = easeInOutQuad(progress);
            
            const currentPos = [
              startPos[0] + (endPos[0] - startPos[0]) * easedProgress,
              startPos[1] + (endPos[1] - startPos[1]) * easedProgress
            ];
            
            existingMarker.setLngLat(currentPos);
            
            // Seguir al camión seleccionado
            if (isFollowingTruck && selectedTruckId === camion.id && map.current) {
              try {
                map.current.easeTo({
                  center: currentPos,
                  duration: 100,
                  easing: (t) => t
                });
              } catch (error) {
                console.warn('Error siguiendo camión:', error);
              }
            }
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          
          animate();
        }
      } else {
        // Crear nuevo marcador
        const markerElement = createVehicleMarker(camion);
        
        const marker = new mapboxgl.Marker(markerElement)
          .setLngLat([camion.lng, camion.lat])
          .addTo(map.current);

        // Sin popup - usaremos solo el panel lateral
        
        // Manejar click en marcador
        markerElement.addEventListener('click', () => {
          handleTruckClick(camion.id);
        });

        markers.current.set(camion.id, marker);
      }
    });
    
    // Remover marcadores que ya no existen
    const existingIds = new Set(mapCamiones.map(c => c.id));
    markers.current.forEach((marker, id) => {
      if (!existingIds.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    });
  }, [mapCamiones, mapLoaded, isFollowingTruck, selectedTruckId]);

  // Agregar rutas al mapa con optimización y control de visibilidad
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Limpiar rutas existentes
    routeLines.current.forEach((sourceId) => {
      if (map.current.getSource(sourceId)) {
        map.current.removeLayer(`route-layer-${sourceId.split('-')[1]}`);
        map.current.removeSource(sourceId);
      }
    });
    routeStops.current.forEach((sourceId) => {
      if (map.current.getSource(sourceId)) {
        map.current.removeLayer(`stops-layer-${sourceId.split('-')[1]}`);
        map.current.removeSource(sourceId);
      }
    });
    routeLines.current.clear();
    routeStops.current.clear();

    // Agregar nuevas rutas con optimización
    appData.rutas.forEach(async (ruta, index) => {
      const routeCoords = ruta.paradas.map(parada => [parada.lng, parada.lat]);
      
      // Intentar obtener ruta optimizada de Mapbox
      const optimizedGeometry = await getOptimizedRoute(routeCoords);
      
      const sourceId = `route-${ruta.id}`;
      const layerId = `route-layer-${ruta.id}`;
      
      // Usar geometría optimizada si está disponible, sino usar coordenadas directas
      const routeGeometry = optimizedGeometry || {
        type: 'LineString',
        coordinates: routeCoords
      };
      
      if (map.current.getSource(sourceId)) {
        map.current.removeLayer(layerId);
        map.current.removeSource(sourceId);
      }
      
      map.current.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {
            routeName: ruta.nombre,
            routeType: ruta.tipo || 'recoleccion',
            distance: ruta.distanciaTotal
          },
          geometry: routeGeometry
        }
      });

      map.current.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          'visibility': showTrails ? 'visible' : 'none'
        },
        paint: {
          'line-color': getRouteTypeColor(ruta.id),
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 3,
            15, 5,
            18, 7
          ],
          'line-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 0.6,
            15, 0.7,
            18, 0.8
          ]
        }
      });

      // Agregar paradas como círculos
      const stopsSourceId = `stops-${ruta.id}`;
      const stopsLayerId = `stops-layer-${ruta.id}`;
      
      if (map.current.getSource(stopsSourceId)) {
        map.current.removeLayer(stopsLayerId);
        map.current.removeSource(stopsSourceId);
      }
      
      map.current.addSource(stopsSourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: ruta.paradas.map((parada, index) => ({
            type: 'Feature',
            properties: {
              name: parada.nombre,
              index: index + 1,
              type: parada.tipo || 'residencial'
            },
            geometry: {
              type: 'Point',
              coordinates: [parada.lng, parada.lat]
            }
          }))
        }
      });

      map.current.addLayer({
        id: stopsLayerId,
        type: 'circle',
        source: stopsSourceId,
        layout: {
          'visibility': showTrails ? 'visible' : 'none'
        },
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 3,
            15, 5,
            18, 7
          ],
          'circle-color': getRouteTypeColor(ruta.id),
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 0.5,
            15, 0.6,
            18, 0.7
          ]
        }
      });

      routeLines.current.set(ruta.id, sourceId);
      routeStops.current.set(ruta.id, stopsSourceId);
    });
  }, [mapLoaded, showTrails]);

  // Controlar visibilidad de rutas
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    appData.rutas.forEach(ruta => {
      const layerId = `route-layer-${ruta.id}`;
      const stopsLayerId = `stops-layer-${ruta.id}`;
      
      try {
        if (map.current.getLayer(layerId)) {
          map.current.setLayoutProperty(layerId, 'visibility', showTrails ? 'visible' : 'none');
        }
        
        if (map.current.getLayer(stopsLayerId)) {
          map.current.setLayoutProperty(stopsLayerId, 'visibility', showTrails ? 'visible' : 'none');
        }
      } catch (error) {
        console.warn('Error controlando visibilidad de ruta:', layerId, error);
      }
    });
    
    // Restaurar rutas si no hay camión seleccionado
    if (!selectedTruckId && showTrails) {
      restoreAllRoutes();
    }
  }, [showTrails, mapLoaded, selectedTruckId]);

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
    if (!map.current || !mapLoaded) return;
    
    const selectedCamion = mapCamiones.find(c => c.id === camionId);
    if (selectedCamion) {
      // Cerrar modal anterior si existe
      setShowTruckModal(false);
      
      // Configurar datos del camión seleccionado
      setSelectedTruckData(selectedCamion);
      setSelectedTruckId(camionId);
      setShowRouteInfo(true);
      setIsPanelMinimized(false);
      setIsFollowingTruck(true);
      
      // Obtener dirección del camión
      setTruckAddress('Obteniendo ubicación...');
      geocodeAddress([selectedCamion.lng, selectedCamion.lat])
        .then(address => setTruckAddress(address))
        .catch(() => setTruckAddress('Ubicación no disponible'));
      
      // Resaltar la ruta del camión seleccionado SIN hacer zoom automático
      try {
        highlightTruckRoute(selectedCamion);
      } catch (error) {
        console.warn('Error resaltando ruta:', error);
      }
    }
  };

  const handleCloseTruckModal = () => {
    setShowTruckModal(false);
    setSelectedTruckData(null);
    setSelectedTruckId(null);
    setShowRouteInfo(false);
    setIsFollowingTruck(false);
    setTruckAddress('Obteniendo ubicación...');
    
    // Restaurar vista general
    try {
      map.current.flyTo({
        center: [-79.5167, 8.9833],
        zoom: 13,
        pitch: 45,
        bearing: 0,
        speed: 1.5,
        curve: 1.42,
        essential: true
      });
      restoreAllRoutes();
    } catch (error) {
      console.warn('Error restaurando vista general:', error);
    }
  };

  const highlightTruckRoute = (camion) => {
    if (!map.current || !mapLoaded || !camion.rutaAsignada) return;
    
    const ruta = appData.rutas.find(r => r.nombre === camion.rutaAsignada);
    if (!ruta) return;
    
    // Ocultar todas las rutas
    appData.rutas.forEach(r => {
      const layerId = `route-layer-${r.id}`;
      const stopsLayerId = `stops-layer-${r.id}`;
      
      try {
        if (map.current.getLayer(layerId)) {
          map.current.setLayoutProperty(layerId, 'visibility', 'none');
        }
        if (map.current.getLayer(stopsLayerId)) {
          map.current.setLayoutProperty(stopsLayerId, 'visibility', 'none');
        }
      } catch (error) {
        console.warn('Error ocultando ruta:', layerId, error);
      }
    });
    
    // Mostrar solo la ruta del camión seleccionado
    const selectedLayerId = `route-layer-${ruta.id}`;
    const selectedStopsId = `stops-layer-${ruta.id}`;
    
    try {
      if (map.current.getLayer(selectedLayerId)) {
        map.current.setLayoutProperty(selectedLayerId, 'visibility', 'visible');
        map.current.setPaintProperty(selectedLayerId, 'line-width', 8);
        map.current.setPaintProperty(selectedLayerId, 'line-opacity', 1);
      }
      
      if (map.current.getLayer(selectedStopsId)) {
        map.current.setLayoutProperty(selectedStopsId, 'visibility', 'visible');
        map.current.setPaintProperty(selectedStopsId, 'circle-radius', 8);
        map.current.setPaintProperty(selectedStopsId, 'circle-opacity', 1);
      }
    } catch (error) {
      console.warn('Error resaltando ruta:', selectedLayerId, error);
    }
    
    // Agregar progreso de ruta
    addRouteProgress(ruta, camion);
  };

  const addRouteProgress = (ruta, camion) => {
    if (!map.current || !mapLoaded) return;
    
    const completedStops = Math.min(camion.paradaActual || 0, ruta.paradas.length);
    const progressSourceId = `progress-${ruta.id}`;
    const progressLayerId = `progress-layer-${ruta.id}`;
    
    // Crear línea de progreso
    const completedCoords = ruta.paradas.slice(0, completedStops + 1).map(p => [p.lng, p.lat]);
    
    if (completedCoords.length > 1) {
      try {
        if (map.current.getSource(progressSourceId)) {
          map.current.removeLayer(progressLayerId);
          map.current.removeSource(progressSourceId);
        }
        
        map.current.addSource(progressSourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: completedCoords
            }
          }
        });
        
        map.current.addLayer({
          id: progressLayerId,
          type: 'line',
          source: progressSourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#27AE60',
            'line-width': 6,
            'line-opacity': 0.8
          }
        });
      } catch (error) {
        console.warn('Error agregando progreso de ruta:', progressLayerId, error);
      }
    }
  };

  const restoreAllRoutes = () => {
    if (!map.current || !mapLoaded) return;
    
    appData.rutas.forEach(ruta => {
      const layerId = `route-layer-${ruta.id}`;
      const stopsLayerId = `stops-layer-${ruta.id}`;
      
      try {
        if (map.current.getLayer(layerId)) {
          map.current.setLayoutProperty(layerId, 'visibility', showTrails ? 'visible' : 'none');
          map.current.setPaintProperty(layerId, 'line-width', 6);
          map.current.setPaintProperty(layerId, 'line-opacity', 0.6);
        }
        
        if (map.current.getLayer(stopsLayerId)) {
          map.current.setLayoutProperty(stopsLayerId, 'visibility', showTrails ? 'visible' : 'none');
          map.current.setPaintProperty(stopsLayerId, 'circle-radius', 6);
          map.current.setPaintProperty(stopsLayerId, 'circle-opacity', 0.6);
        }
      } catch (error) {
        console.warn('Error restaurando ruta:', layerId, error);
      }
    });
    
    // Limpiar progreso
    appData.rutas.forEach(ruta => {
      const progressLayerId = `progress-layer-${ruta.id}`;
      const progressSourceId = `progress-${ruta.id}`;
      
      try {
        if (map.current.getLayer(progressLayerId)) {
          map.current.removeLayer(progressLayerId);
          map.current.removeSource(progressSourceId);
        }
      } catch (error) {
        console.warn('Error limpiando progreso:', progressLayerId, error);
      }
    });
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
    
    // Si tiene ruta asignada, buscarla en los datos
    if (camion.rutaAsignada) {
      const rutaAsignada = appData.rutas.find(r => r.nombre === camion.rutaAsignada);
      if (rutaAsignada) return rutaAsignada;
    }
    
    // Si no tiene ruta asignada, crear una ruta mock basada en el tipo de servicio
    const rutasMock = {
      'recoleccion': {
        nombre: 'Ruta de Recolección',
        paradas: [
          { nombre: 'Zona Centro', direccion: 'Calle Principal, Centro', estimado: '08:00', tipo: 'comercial' },
          { nombre: 'Zona Norte', direccion: 'Avenida Norte, Residencial', estimado: '09:30', tipo: 'residencial' },
          { nombre: 'Zona Sur', direccion: 'Boulevard Sur, Comercial', estimado: '11:00', tipo: 'comercial' },
          { nombre: 'Zona Este', direccion: 'Calle Este, Industrial', estimado: '12:30', tipo: 'comercial' },
          { nombre: 'Zona Oeste', direccion: 'Avenida Oeste, Residencial', estimado: '14:00', tipo: 'residencial' }
        ],
        distanciaTotal: 25,
        tiempoEstimado: 480
      },
      'fumigacion': {
        nombre: 'Ruta de Fumigación',
        paradas: [
          { nombre: 'Parque Central', direccion: 'Parque Central, Ciudad', estimado: '07:00', tipo: 'turistico' },
          { nombre: 'Zona Comercial', direccion: 'Centro Comercial, Main St', estimado: '09:00', tipo: 'comercial' },
          { nombre: 'Área Residencial', direccion: 'Barrio Residencial, Zona Norte', estimado: '11:00', tipo: 'residencial' },
          { nombre: 'Zona Industrial', direccion: 'Polígono Industrial, Zona Este', estimado: '13:00', tipo: 'comercial' }
        ],
        distanciaTotal: 18,
        tiempoEstimado: 360
      }
    };
    
    return rutasMock[camion.tipoServicio] || rutasMock['recoleccion'];
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

  // Funciones de búsqueda
  const searchAddress = async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&country=pa&language=es&limit=5`
      );
      const data = await response.json();
      setSearchResults(data.features || []);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching address:', error);
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const handleSearchSelect = (result) => {
    const [lng, lat] = result.center;
    map.current.flyTo({
      center: [lng, lat],
      zoom: 16,
      speed: 1.2,
      curve: 1.42
    });
    
    // Agregar marcador temporal
    const searchMarker = new mapboxgl.Marker({
      color: '#FF6B6B',
      scale: 1.2
    })
    .setLngLat([lng, lat])
    .setPopup(
      new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div class="mapbox-popup">
            <h3>📍 Búsqueda</h3>
            <p><strong>Dirección:</strong> ${result.place_name}</p>
            <p><strong>Tipo:</strong> ${result.place_type?.[0] || 'Ubicación'}</p>
          </div>
        `)
    )
    .addTo(map.current);
    
    // Remover marcador después de 10 segundos
    setTimeout(() => {
      searchMarker.remove();
    }, 10000);
    
    setSearchQuery(result.place_name);
    setShowSearchResults(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  return (
    <div className="map-component">
      {/* Barra de búsqueda */}
      <div className="mapbox-search-container">
        <div className="mapbox-search-bar">
          <input
            type="text"
            placeholder="🔍 Buscar dirección en Panamá..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              searchAddress(e.target.value);
            }}
            onFocus={() => {
              if (searchResults.length > 0) {
                setShowSearchResults(true);
              }
            }}
            className="mapbox-search-input"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="mapbox-search-clear"
              title="Limpiar búsqueda"
            >
              ❌
            </button>
          )}
        </div>
        
        {showSearchResults && searchResults.length > 0 && (
          <div className="mapbox-search-results">
            {searchResults.map((result, index) => (
              <div
                key={index}
                className="mapbox-search-result"
                onClick={() => handleSearchSelect(result)}
              >
                <div className="search-result-title">
                  📍 {result.text}
                </div>
                <div className="search-result-address">
                  {result.place_name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
            🗺️ Mostrar Rutas
          </label>
          {selectedTruckId && (
            <div className="selected-truck-info gps-info">
              📍 Rastreando: <strong>{getSelectedTruck()?.conductor}</strong> ({selectedTruckId})
              <button 
                className={`btn btn--sm ${isFollowingTruck ? 'btn--primary' : 'btn--outline'}`}
                onClick={() => setIsFollowingTruck(!isFollowingTruck)}
                title={isFollowingTruck ? 'Desactivar seguimiento' : 'Activar seguimiento'}
              >
                {isFollowingTruck ? '🎯 Siguiendo' : '🎯 Seguir'}
              </button>
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
          💡 Powered by Mapbox
        </div>
      </div>

      <div style={{ position: 'relative', flex: 1, minHeight: '500px' }}>
        <div 
          ref={mapContainer}
          className="mapbox-map"
          style={{ 
            height: '100%', 
            width: '100%', 
            minHeight: '500px',
            borderRadius: '8px'
          }}
        />
        
        {!mapLoaded && (
          <div style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            height: '500px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: 'rgba(245, 245, 245, 0.9)',
            borderRadius: '8px',
            fontSize: '18px',
            color: '#666',
            zIndex: 10
          }}>
            🗺️ Cargando Mapbox...
          </div>
        )}

        {/* Panel de información GPS */}
        {showRouteInfo && getSelectedTruck() && (
          <div 
            className={`route-info-panel gps-info-panel ${isPanelMinimized ? 'minimized' : ''}`}
            onClick={isPanelMinimized ? () => setIsPanelMinimized(false) : undefined}
          >
            <div className="route-info-header">
              <h4 className="route-info-title">
                🛰️ GPS: {getSelectedTruckRoute() ? getSelectedTruckRoute().nombre : `Camión ${getSelectedTruck().id}`}
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
                    setSelectedTruckId(null);
                    setSelectedTruckData(null);
                    setIsFollowingTruck(false);
                    restoreAllRoutes();
                  }}
                  title="Cerrar panel"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="route-info-content">
              {/* Información del conductor */}
              <div className="conductor-section">
                <h5>👤 Conductor</h5>
                <div className="conductor-details">
                  <div className="detail-item">
                    <span className="detail-label">Nombre:</span>
                    <span className="detail-value">{getSelectedTruck().conductor}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Estado:</span>
                    <span className={`detail-value status-${getSelectedTruck().estado.toLowerCase().replace(' ', '-')}`}>
                      {getSelectedTruck().estado}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Vehículo:</span>
                    <span className="detail-value">#{getSelectedTruck().id}</span>
                  </div>
                </div>
              </div>

              {/* Combustible */}
              <div className="fuel-section">
                <h5>⛽ Combustible</h5>
                <div className="fuel-display">
                  <div className="fuel-bar">
                    <div 
                      className="fuel-fill" 
                      style={{ 
                        width: `${getSelectedTruck().combustible}%`,
                        backgroundColor: getSelectedTruck().combustible > 50 ? '#27AE60' : 
                                       getSelectedTruck().combustible > 25 ? '#F39C12' : '#E74C3C'
                      }}
                    />
                  </div>
                  <span className="fuel-text">{getSelectedTruck().combustible}%</span>
                </div>
              </div>

              {/* Ubicación actual */}
              <div className="location-section">
                <h5>📍 Ubicación Actual</h5>
                <div className="location-details">
                  <div className="address-info">
                    {truckAddress}
                  </div>
                  <div className="coordinates-info">
                    <small>Lat: {getSelectedTruck().lat.toFixed(6)}, Lng: {getSelectedTruck().lng.toFixed(6)}</small>
                  </div>
                </div>
              </div>

              {/* Tiempo en ruta */}
              <div className="time-section">
                <h5>🕐 Tiempo en Ruta</h5>
                <div className="time-details">
                  <div className="detail-item">
                    <span className="detail-label">Inicio:</span>
                    <span className="detail-value">{getSelectedTruck().horaInicio || '08:00'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Tiempo transcurrido:</span>
                    <span className="detail-value">
                      {Math.floor((Date.now() - new Date(getSelectedTruck().ultimaActualizacion).getTime()) / (1000 * 60 * 60))}h 
                      {Math.floor(((Date.now() - new Date(getSelectedTruck().ultimaActualizacion).getTime()) % (1000 * 60 * 60)) / (1000 * 60))}m
                    </span>
                  </div>
                </div>
              </div>

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
              
              {/* Información de ruta (siempre disponible) */}
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
                  <div className="route-stat-value">{getSelectedTruck().paradaActual || 0}</div>
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
                  Progreso GPS: {getSelectedTruck().paradaActual || 0}/{getSelectedTruckRoute().paradas.length} paradas 
                  ({calculateProgress(getSelectedTruck(), getSelectedTruckRoute())}%)
                </div>
              </div>

              {/* Paradas restantes */}
              <div className="remaining-stops-info">
                <h6>📍 Paradas Restantes:</h6>
                <div className="stops-preview">
                  {getSelectedTruckRoute().paradas.slice(getSelectedTruck().paradaActual || 0, (getSelectedTruck().paradaActual || 0) + 3).map((parada, index) => (
                    <div key={index} className={`stop-preview ${index === 0 ? 'next-stop' : ''}`}>
                      <span className="stop-number">{(getSelectedTruck().paradaActual || 0) + index + 1}</span>
                      <div className="stop-info">
                        <div className="stop-name">{parada.nombre}</div>
                        <div className="stop-time">ETA: {parada.estimado}</div>
                      </div>
                      {index === 0 && <span className="current-badge">ACTUAL</span>}
                    </div>
                  ))}
                  {getSelectedTruckRoute().paradas.length > (getSelectedTruck().paradaActual || 0) + 3 && (
                    <div className="more-stops">
                      +{getSelectedTruckRoute().paradas.length - (getSelectedTruck().paradaActual || 0) - 3} paradas más
                    </div>
                  )}
                </div>
              </div>

              <div className="route-actions">
                <button 
                  className="btn btn--primary"
                  onClick={() => handleStopClick(getSelectedTruckRoute())}
                >
                  📋 Ver todas las paradas
                </button>
                <button 
                  className="btn btn--outline"
                  onClick={() => {
                    try {
                      map.current.flyTo({
                        center: [getSelectedTruck().lng, getSelectedTruck().lat],
                        zoom: 16,
                        pitch: 45,
                        bearing: 0,
                        speed: 1.0,
                        curve: 1.42,
                        essential: true
                      });
                    } catch (error) {
                      console.warn('Error haciendo zoom:', error);
                    }
                  }}
                >
                  🎯 Centrar en mapa
                </button>
              </div>

              <div style={{ fontSize: '12px', color: '#666666', marginTop: '16px', textAlign: 'center' }}>
                💡 Powered by Mapbox GL JS
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
                            {parada.nombre}
                          </div>
                          
                          <div className="stop-address">
                            📍 {parada.direccion || parada.nombre}
                          </div>
                          
                          <div className="stop-times">
                            <div className="time-info">
                              <strong>Estimado:</strong> {parada.estimado}
                            </div>
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