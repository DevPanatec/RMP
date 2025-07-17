import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './ManagementComponent.css';
import { appData } from '../../data/mockData';

// Mapbox token - same as used in MapComponent
const MAPBOX_TOKEN = 'pk.eyJ1Ijoia2V2aW5uMjMiLCJhIjoiY204Y2J0bWN1MTg5ZzJtb2xobXljODM0MiJ9.48MFADtQhp_sFuQjewLFeA';

// Fix leaflet default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons for different stop types
const createCustomIcon = (type, index) => {
  const colors = {
    inicio: '#2ecc71',
    residencial: '#3498db',
    comercial: '#f39c12',
    turistico: '#e74c3c',
    industrial: '#9b59b6'
  };
  
  const iconHtml = `
    <div style="
      background-color: ${colors[type] || '#3498db'};
      width: 25px;
      height: 25px;
      border-radius: 50%;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">
      ${index + 1}
    </div>
  `;
  
  return new L.DivIcon({
    html: iconHtml,
    className: 'custom-marker',
    iconSize: [25, 25],
    iconAnchor: [12.5, 12.5],
    popupAnchor: [0, -25]
  });
};

const ManagementComponent = ({ onViewTruckOnMap }) => {
  const [activeTab, setActiveTab] = useState('trucks');
  const [trucks, setTrucks] = useState(appData.camiones);
  const [routes, setRoutes] = useState(appData.rutas);
  const [personnel, setPersonnel] = useState(appData.usuarios.filter(u => u.tipo === 'conductor'));
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isCreateRoute, setIsCreateRoute] = useState(false);
  const [newRoute, setNewRoute] = useState({
    id: null,
    name: '',
    stops: [],
    distance: 0,
    estimatedTime: 0,
    assignedTruck: null,
    assignedDriver: null
  });

  // Drag and drop state for personnel
  const [draggedEmployee, setDraggedEmployee] = useState(null);
  const [shifts, setShifts] = useState({
    morning: [],
    afternoon: [],
    night: []
  });

  // Truck history modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedTruckHistory, setSelectedTruckHistory] = useState(null);

  // Route creation modal
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    // Initialize shifts - for now, randomly assign personnel to shifts
    const allPersonnel = [...personnel];
    const shuffled = allPersonnel.sort(() => 0.5 - Math.random());
    const third = Math.ceil(shuffled.length / 3);
    
    setShifts({
      morning: shuffled.slice(0, third),
      afternoon: shuffled.slice(third, third * 2),
      night: shuffled.slice(third * 2)
    });
  }, [personnel]);

  // Force map resize when modal opens
  useEffect(() => {
    if (showRouteModal) {
      setMapLoaded(false);
      setMapError(false);
      const timer = setTimeout(() => {
        setMapLoaded(true);
        // Multiple resize events to ensure map displays
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 100);
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 300);
      }, 300);
      
      // Fallback timeout in case map fails to load
      const errorTimer = setTimeout(() => {
        if (!mapLoaded) {
          setMapError(true);
        }
      }, 5000);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(errorTimer);
      };
    }
  }, [showRouteModal]);

  const handleDragStart = (e, employee) => {
    setDraggedEmployee(employee);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, shiftType) => {
    e.preventDefault();
    if (draggedEmployee) {
      // Remove from current shift
      const newShifts = { ...shifts };
      Object.keys(newShifts).forEach(key => {
        newShifts[key] = newShifts[key].filter(emp => emp.id !== draggedEmployee.id);
      });
      
      // Add to new shift
      newShifts[shiftType].push({
        ...draggedEmployee,
        turno: shiftType === 'morning' ? 'Matutino' : 
               shiftType === 'afternoon' ? 'Vespertino' : 'Nocturno'
      });
      
      setShifts(newShifts);
      setDraggedEmployee(null);
    }
  };

  const calculateRouteDistance = (stops) => {
    if (stops.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 0; i < stops.length - 1; i++) {
      const lat1 = stops[i].latitude;
      const lon1 = stops[i].longitude;
      const lat2 = stops[i + 1].latitude;
      const lon2 = stops[i + 1].longitude;
      
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      totalDistance += R * c;
    }
    
    return totalDistance;
  };

  const addStopToRoute = (latlng, customName = null) => {
    const stopTypes = ['inicio', 'residencial', 'comercial', 'turistico', 'industrial'];
    const getNextStopType = () => {
      if (newRoute.stops.length === 0) return 'inicio';
      return stopTypes[Math.floor(Math.random() * (stopTypes.length - 1)) + 1];
    };

    const newStop = {
      id: Date.now(),
      name: customName || `Parada ${newRoute.stops.length + 1}`,
      latitude: latlng.lat,
      longitude: latlng.lng,
      type: getNextStopType(),
      estimatedTime: 10,
      completed: false
    };
    
    const updatedStops = [...newRoute.stops, newStop];
    const distance = calculateRouteDistance(updatedStops);
    
    setNewRoute({
      ...newRoute,
      stops: updatedStops,
      distance: distance.toFixed(2),
      estimatedTime: Math.round(distance * 3) // 3 minutes per km estimate
    });
  };

  const removeStopFromRoute = (stopId) => {
    const updatedStops = newRoute.stops.filter(stop => stop.id !== stopId);
    const distance = calculateRouteDistance(updatedStops);
    
    setNewRoute({
      ...newRoute,
      stops: updatedStops,
      distance: distance.toFixed(2),
      estimatedTime: Math.round(distance * 3)
    });
  };

  const saveRoute = () => {
    if (newRoute.name && newRoute.stops.length > 0) {
      const routeToSave = {
        id: isCreateRoute ? `ruta-${Date.now()}` : newRoute.id,
        nombre: newRoute.name,
        descripcion: `Ruta con ${newRoute.stops.length} paradas`,
        distanciaTotal: parseFloat(newRoute.distance),
        tiempoEstimado: newRoute.estimatedTime,
        paradas: newRoute.stops.map(stop => ({
          lat: stop.latitude,
          lng: stop.longitude,
          nombre: stop.name,
          tipo: stop.type,
          estimado: `${stop.estimatedTime} min`,
          direccion: `${stop.name} - ${stop.type}`
        }))
      };
      
      if (isCreateRoute) {
        setRoutes([...routes, routeToSave]);
      } else {
        setRoutes(routes.map(route => 
          route.id === newRoute.id ? routeToSave : route
        ));
      }
      
      setIsCreateRoute(false);
      setSelectedRoute(null);
      setShowRouteModal(false);
      setMapLoaded(false);
      setMapError(false);
      setNewRoute({
        id: null,
        name: '',
        stops: [],
        distance: 0,
        estimatedTime: 0,
        assignedTruck: null,
        assignedDriver: null
      });
    }
  };

  const editRoute = (route) => {
    const editableRoute = {
      id: route.id,
      name: route.nombre,
      stops: route.paradas?.map(parada => ({
        id: Date.now() + Math.random(),
        name: parada.nombre,
        latitude: parada.lat,
        longitude: parada.lng,
        type: parada.tipo,
        estimatedTime: 10,
        completed: false
      })) || [],
      distance: route.distanciaTotal,
      estimatedTime: route.tiempoEstimado,
      assignedTruck: null,
      assignedDriver: null
    };
    setNewRoute(editableRoute);
    setSelectedRoute(route);
    setIsCreateRoute(false);
    setShowRouteModal(true);
  };

  const createNewRoute = () => {
    setNewRoute({
      id: null,
      name: '',
      stops: [],
      distance: 0,
      estimatedTime: 0,
      assignedTruck: null,
      assignedDriver: null
    });
    setIsCreateRoute(true);
    setSelectedRoute(null);
    setShowRouteModal(true);
  };

  const handleSearchLocation = async (query) => {
    if (!query.trim()) return;
    
    try {
      // Simulate location search - in real app, use a geocoding API
      const mockLocations = [
        { name: 'Plaza Mayor', lat: 8.9833, lng: -79.5167 },
        { name: 'Casco Viejo', lat: 8.9529, lng: -79.5329 },
        { name: 'Multiplaza', lat: 8.9969, lng: -79.5241 },
        { name: 'Albrook Mall', lat: 8.9726, lng: -79.5545 },
        { name: 'Hospital Santo Tomás', lat: 8.9574, lng: -79.5309 },
        { name: 'Universidad de Panamá', lat: 8.9665, lng: -79.5363 },
        { name: 'Estadio Nacional', lat: 8.9616, lng: -79.5077 },
        { name: 'Aeropuerto Internacional', lat: 8.9736, lng: -79.5559 }
      ];
      
      const filtered = mockLocations.filter(loc => 
        loc.name.toLowerCase().includes(query.toLowerCase())
      );
      
      if (filtered.length > 0) {
        const location = filtered[0];
        addStopToRoute({ lat: location.lat, lng: location.lng }, location.name);
        setSearchQuery('');
      } else {
        alert('Ubicación no encontrada. Intenta con: Plaza Mayor, Casco Viejo, Multiplaza, etc.');
      }
    } catch (error) {
      console.error('Error searching location:', error);
    }
  };

  const MapEvents = () => {
    useMapEvents({
      click: (e) => {
        if (isCreateRoute || selectedRoute) {
          addStopToRoute(e.latlng);
        }
      },
    });
    
    return null;
  };

  const getShiftColor = (shift) => {
    switch (shift) {
      case 'morning': return '#4CAF50';
      case 'afternoon': return '#FF9800';
      case 'night': return '#3F51B5';
      default: return '#666';
    }
  };

  const handleViewOnMap = (truck) => {
    if (onViewTruckOnMap) {
      onViewTruckOnMap(truck.id);
    }
  };

  const handleViewHistory = (truck) => {
    // Generate mock history data
    const mockHistory = [
      {
        date: '2024-01-15',
        route: truck.rutaAsignada || 'Ruta Centro',
        stops: truck.totalParadas || 8,
        completedStops: truck.paradaActual || 5,
        weight: truck.pesoAcumulado || 0,
        area: truck.areaFumigada || 0,
        startTime: '08:00',
        endTime: '14:30',
        efficiency: Math.floor(Math.random() * 20) + 80
      },
      {
        date: '2024-01-14',
        route: 'Ruta Norte',
        stops: 10,
        completedStops: 10,
        weight: 520,
        area: 450,
        startTime: '08:15',
        endTime: '15:00',
        efficiency: Math.floor(Math.random() * 20) + 80
      },
      {
        date: '2024-01-13',
        route: 'Ruta Sur',
        stops: 12,
        completedStops: 12,
        weight: 680,
        area: 320,
        startTime: '07:45',
        endTime: '14:45',
        efficiency: Math.floor(Math.random() * 20) + 80
      }
    ];
    
    setSelectedTruckHistory({ ...truck, history: mockHistory });
    setShowHistoryModal(true);
  };

  return (
    <div className="management-container">
      <div className="management-header">
        <h2>Gestión Integral</h2>
        <div className="management-tabs">
          <button 
            className={activeTab === 'trucks' ? 'active' : ''}
            onClick={() => setActiveTab('trucks')}
          >
            🚛 Camiones
          </button>
          <button 
            className={activeTab === 'routes' ? 'active' : ''}
            onClick={() => setActiveTab('routes')}
          >
            🗺️ Rutas
          </button>
          <button 
            className={activeTab === 'personnel' ? 'active' : ''}
            onClick={() => setActiveTab('personnel')}
          >
            👥 Personal
          </button>
        </div>
      </div>

      {activeTab === 'trucks' && (
        <div className="trucks-section">
          <div className="trucks-grid">
            {trucks.map(truck => (
              <div key={truck.id} className="truck-card">
                <div className="truck-header">
                  <h3>{truck.tipoServicio === 'fumigacion' ? '🚐' : '🚛'} {truck.id}</h3>
                  <span className={`status ${truck.estado.toLowerCase().replace(' ', '-')}`}>
                    {truck.estado}
                  </span>
                </div>
                <div className="truck-details">
                  <p><strong>Tipo:</strong> {truck.tipoServicio === 'fumigacion' ? 'Fumigación' : 'Recolección'}</p>
                  <p><strong>Conductor:</strong> {truck.conductor || 'Sin asignar'}</p>
                  <p><strong>Ruta Asignada:</strong> {truck.rutaAsignada || 'Sin asignar'}</p>
                </div>
                <div className="truck-actions">
                  <button 
                    className="btn-primary"
                    onClick={() => handleViewOnMap(truck)}
                  >
                    📍 Ver en Mapa
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={() => handleViewHistory(truck)}
                  >
                    📊 Ver Historial
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'routes' && (
        <div className="routes-section">
          <div className="routes-header">
            <h3>Gestión de Rutas</h3>
            <button className="btn-primary" onClick={createNewRoute}>
              + Crear Nueva Ruta
            </button>
          </div>
          
          <div className="routes-grid">
            {routes.map(route => (
              <div key={route.id} className="route-card">
                <div className="route-header">
                  <h3>🗺️ {route.nombre}</h3>
                  <span className="status activa">Activa</span>
                </div>
                <div className="route-details">
                  <p><strong>Paradas:</strong> {route.paradas?.length || 0}</p>
                  <p><strong>Distancia:</strong> {route.distanciaTotal} km</p>
                  <p><strong>Tiempo estimado:</strong> {route.tiempoEstimado} min</p>
                  <p><strong>Descripción:</strong> {route.descripcion}</p>
                </div>
                <div className="route-actions">
                  <button 
                    className="btn-primary"
                    onClick={() => editRoute(route)}
                  >
                    ✏️ Editar Ruta
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={() => {
                      setSelectedRoute(route);
                      setShowRouteModal(true);
                    }}
                  >
                    👁️ Ver Detalles
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'personnel' && (
        <div className="personnel-section">
          <div className="personnel-header">
            <h3>Gestión de Personal y Turnos</h3>
          </div>
          
          <div className="shifts-container">
            <div className="available-personnel">
              <h4>Personal Disponible</h4>
              <div className="personnel-list">
                {personnel.filter(emp => 
                  !shifts.morning.some(s => s.id === emp.id) &&
                  !shifts.afternoon.some(s => s.id === emp.id) &&
                  !shifts.night.some(s => s.id === emp.id)
                ).map(employee => (
                  <div
                    key={employee.id}
                    className="employee-card draggable"
                    draggable
                    onDragStart={(e) => handleDragStart(e, employee)}
                  >
                    <div className="employee-info">
                      <h5>{employee.nombre}</h5>
                      <span className="employee-position">{employee.tipo}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="shifts-grid">
              <div 
                className="shift-column morning"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'morning')}
              >
                <div className="shift-header">
                  <h4>🌅 Turno Mañana</h4>
                  <span className="shift-count">{shifts.morning.length}</span>
                </div>
                <div className="shift-employees">
                  {shifts.morning.map(employee => (
                    <div
                      key={employee.id}
                      className="employee-card in-shift"
                      draggable
                      onDragStart={(e) => handleDragStart(e, employee)}
                    >
                      <div className="employee-info">
                        <h5>{employee.nombre}</h5>
                        <span className="employee-position">{employee.tipo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div 
                className="shift-column afternoon"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'afternoon')}
              >
                <div className="shift-header">
                  <h4>🌞 Turno Tarde</h4>
                  <span className="shift-count">{shifts.afternoon.length}</span>
                </div>
                <div className="shift-employees">
                  {shifts.afternoon.map(employee => (
                    <div
                      key={employee.id}
                      className="employee-card in-shift"
                      draggable
                      onDragStart={(e) => handleDragStart(e, employee)}
                    >
                      <div className="employee-info">
                        <h5>{employee.nombre}</h5>
                        <span className="employee-position">{employee.tipo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div 
                className="shift-column night"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'night')}
              >
                <div className="shift-header">
                  <h4>🌙 Turno Noche</h4>
                  <span className="shift-count">{shifts.night.length}</span>
                </div>
                <div className="shift-employees">
                  {shifts.night.map(employee => (
                    <div
                      key={employee.id}
                      className="employee-card in-shift"
                      draggable
                      onDragStart={(e) => handleDragStart(e, employee)}
                    >
                      <div className="employee-info">
                        <h5>{employee.nombre}</h5>
                        <span className="employee-position">{employee.tipo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Historial de Camión */}
      {showHistoryModal && selectedTruckHistory && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content history-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>📊 Historial de {selectedTruckHistory.id}</h4>
              <button className="modal-close" onClick={() => setShowHistoryModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="truck-info">
                <div className="info-item">
                  <strong>Tipo:</strong> {selectedTruckHistory.tipoServicio === 'fumigacion' ? 'Fumigación' : 'Recolección'}
                </div>
                <div className="info-item">
                  <strong>Conductor:</strong> {selectedTruckHistory.conductor}
                </div>
                <div className="info-item">
                  <strong>Estado Actual:</strong> {selectedTruckHistory.estado}
                </div>
              </div>
              
              <div className="history-table">
                <h5>Historial de Actividades</h5>
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Ruta</th>
                      <th>Paradas</th>
                      <th>Inicio</th>
                      <th>Fin</th>
                      <th>Eficiencia</th>
                      {selectedTruckHistory.tipoServicio === 'recoleccion' && <th>Peso (kg)</th>}
                      {selectedTruckHistory.tipoServicio === 'fumigacion' && <th>Área (m²)</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTruckHistory.history.map((record, index) => (
                      <tr key={index}>
                        <td>{record.date}</td>
                        <td>{record.route}</td>
                        <td>{record.completedStops}/{record.stops}</td>
                        <td>{record.startTime}</td>
                        <td>{record.endTime}</td>
                        <td>
                          <span className={`efficiency ${record.efficiency >= 90 ? 'high' : record.efficiency >= 70 ? 'medium' : 'low'}`}>
                            {record.efficiency}%
                          </span>
                        </td>
                        {selectedTruckHistory.tipoServicio === 'recoleccion' && (
                          <td>{record.weight}</td>
                        )}
                        {selectedTruckHistory.tipoServicio === 'fumigacion' && (
                          <td>{record.area}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowHistoryModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Creación/Edición de Rutas */}
      {showRouteModal && (
        <div className="modal-overlay" onClick={() => {
          setShowRouteModal(false);
          setMapLoaded(false);
          setMapError(false);
        }}>
          <div className="modal-content route-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>
                {isCreateRoute ? '🗺️ Crear Nueva Ruta' : selectedRoute ? `🗺️ Ver Ruta: ${selectedRoute.nombre}` : '🗺️ Editar Ruta'}
              </h4>
              <button 
                className="modal-close" 
                onClick={() => {
                  setShowRouteModal(false);
                  setIsCreateRoute(false);
                  setSelectedRoute(null);
                  setMapLoaded(false);
                  setMapError(false);
                  setNewRoute({
                    id: null,
                    name: '',
                    stops: [],
                    distance: 0,
                    estimatedTime: 0,
                    assignedTruck: null,
                    assignedDriver: null
                  });
                }}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body-route">
              <div className="route-modal-container">
                <div className="route-map-container">
                  {!mapLoaded && !mapError && (
                    <div style={{ 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      background: '#f5f5f5',
                      fontSize: '18px',
                      color: '#666'
                    }}>
                      🗺️ Cargando mapa...
                    </div>
                  )}
                  {mapError && (
                    <div style={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      background: '#f5f5f5',
                      fontSize: '16px',
                      color: '#666',
                      padding: '20px'
                    }}>
                      <div style={{ marginBottom: '10px' }}>❌ Error cargando el mapa</div>
                      <div style={{ fontSize: '14px', textAlign: 'center' }}>
                        Verifica tu conexión a internet<br/>
                        o intenta cerrar y abrir el modal nuevamente
                      </div>
                      <button 
                        style={{ 
                          marginTop: '15px', 
                          padding: '8px 16px', 
                          background: '#3498db', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          setMapError(false);
                          setMapLoaded(false);
                          setTimeout(() => setMapLoaded(true), 500);
                        }}
                      >
                        🔄 Reintentar
                      </button>
                    </div>
                  )}
                  {mapLoaded && !mapError && (
                    <MapContainer
                      key={`map-${isCreateRoute ? 'create' : selectedRoute?.id || 'edit'}-${Date.now()}`}
                      center={[8.9833, -79.5167]}
                      zoom={13}
                      style={{ height: '100%', width: '100%' }}
                      whenCreated={(mapInstance) => {
                        // Force resize after map creation
                        setTimeout(() => {
                          mapInstance.invalidateSize();
                        }, 100);
                      }}
                    >
                    <TileLayer
                      url={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`}
                      attribution='&copy; <a href="https://www.mapbox.com/">Mapbox</a> - Datos © <a href="https://www.openstreetmap.org/">OpenStreetMap</a>.'
                      tileSize={512}
                      zoomOffset={-1}
                    />
                    
                    <MapEvents />
                    
                    {newRoute.stops.map((stop, index) => (
                      <Marker
                        key={stop.id}
                        position={[stop.latitude, stop.longitude]}
                        icon={createCustomIcon(stop.type, index)}
                      >
                        <Popup>
                          <div className="stop-popup">
                            <h4>{stop.name}</h4>
                            <select 
                              value={stop.type} 
                              onChange={(e) => {
                                const updatedStops = newRoute.stops.map(s => 
                                  s.id === stop.id ? {...s, type: e.target.value} : s
                                );
                                setNewRoute({...newRoute, stops: updatedStops});
                              }}
                            >
                              <option value="inicio">Inicio</option>
                              <option value="residencial">Residencial</option>
                              <option value="comercial">Comercial</option>
                              <option value="turistico">Turístico</option>
                              <option value="industrial">Industrial</option>
                            </select>
                            <button 
                              onClick={() => removeStopFromRoute(stop.id)}
                              className="btn-danger"
                            >
                              Eliminar
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                    
                    {newRoute.stops.length > 1 && (
                      <Polyline
                        positions={newRoute.stops.map(stop => [stop.latitude, stop.longitude])}
                        color="#27ae60"
                        weight={4}
                        opacity={0.8}
                      />
                    )}
                    </MapContainer>
                  )}
                  
                  <div className="map-overlay-instructions">
                    <p>📍 Haz clic en el mapa para agregar paradas</p>
                  </div>
                </div>
                
                <div className="route-sidebar">
                  <div className="route-form-section">
                    <h5>Información de la Ruta</h5>
                    <input
                      type="text"
                      placeholder="Nombre de la ruta"
                      value={newRoute.name}
                      onChange={(e) => setNewRoute({...newRoute, name: e.target.value})}
                      className="route-name-input"
                    />
                    
                    <div className="location-search">
                      <input
                        type="text"
                        placeholder="Buscar ubicación (ej: Plaza Mayor)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSearchLocation(searchQuery);
                          }
                        }}
                      />
                      <button 
                        className="search-button"
                        onClick={() => handleSearchLocation(searchQuery)}
                      >
                        🔍
                      </button>
                    </div>
                    
                    <div className="route-stats">
                      <div className="stat-box">
                        <span className="stat-number">{newRoute.stops.length}</span>
                        <span className="stat-label">Paradas</span>
                      </div>
                      <div className="stat-box">
                        <span className="stat-number">{newRoute.distance}</span>
                        <span className="stat-label">km</span>
                      </div>
                      <div className="stat-box">
                        <span className="stat-number">{newRoute.estimatedTime}</span>
                        <span className="stat-label">min</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="stops-section">
                    <h5>Paradas de la Ruta</h5>
                    <div className="stops-scroll">
                      {newRoute.stops.length === 0 ? (
                        <div className="no-stops">
                          <p>No hay paradas agregadas</p>
                          <p>Haz clic en el mapa o busca una ubicación</p>
                        </div>
                      ) : (
                        <div className="stops-list-container">
                          {newRoute.stops.map((stop, index) => (
                            <div key={stop.id} className="stop-item-new">
                              <div className="stop-marker">
                                <div className="stop-number-new" style={{backgroundColor: 
                                  stop.type === 'inicio' ? '#2ecc71' :
                                  stop.type === 'residencial' ? '#3498db' :
                                  stop.type === 'comercial' ? '#f39c12' :
                                  stop.type === 'turistico' ? '#e74c3c' :
                                  stop.type === 'industrial' ? '#9b59b6' : '#3498db'
                                }}>
                                  {index + 1}
                                </div>
                                {index < newRoute.stops.length - 1 && <div className="stop-connector"></div>}
                              </div>
                              <div className="stop-details">
                                <div className="stop-name-new">{stop.name}</div>
                                <div className="stop-type-new">{stop.type}</div>
                                <div className="stop-actions-new">
                                  <button 
                                    className="btn-edit-new"
                                    onClick={() => {
                                      const newName = prompt('Nuevo nombre:', stop.name);
                                      if (newName) {
                                        const updatedStops = newRoute.stops.map(s => 
                                          s.id === stop.id ? {...s, name: newName} : s
                                        );
                                        setNewRoute({...newRoute, stops: updatedStops});
                                      }
                                    }}
                                  >
                                    ✏️
                                  </button>
                                  <button 
                                    className="btn-remove-new"
                                    onClick={() => removeStopFromRoute(stop.id)}
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn-secondary"
                onClick={() => {
                  setShowRouteModal(false);
                  setIsCreateRoute(false);
                  setSelectedRoute(null);
                  setMapLoaded(false);
                  setMapError(false);
                  setNewRoute({
                    id: null,
                    name: '',
                    stops: [],
                    distance: 0,
                    estimatedTime: 0,
                    assignedTruck: null,
                    assignedDriver: null
                  });
                }}
              >
                ✕ Cancelar
              </button>
              {(isCreateRoute || selectedRoute) && (
                <button 
                  className="btn-primary"
                  onClick={saveRoute}
                  disabled={!newRoute.name || newRoute.stops.length === 0}
                >
                  💾 Guardar Ruta
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagementComponent;