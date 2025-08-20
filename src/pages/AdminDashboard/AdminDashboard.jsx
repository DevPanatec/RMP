import { useState, useEffect, useMemo } from 'react';
import MapComponent from '../../components/Map/MapComponent';
import PersonnelComponent from '../../components/Personnel/PersonnelComponent';
import InventoryComponent from '../../components/Inventory/InventoryComponent';
import RoutesComponent from '../../components/Routes/RoutesComponent';
import RiskComponent from '../../components/Risk/RiskComponent';
import ReportsComponent from '../../components/Reports/ReportsComponent';
import { useSupabasePersonnel } from '../../context/SupabasePersonnelContext';
import { useSupabaseFleet } from '../../context/SupabaseFleetContext';
import { useSupabaseRoutes } from '../../context/SupabaseRoutesContext';
import { useSupabaseRiskReports } from '../../context/SupabaseRiskReportsContext';
import './AdminDashboard.css';

const AdminDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState('');
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [serviceTypeFilter, setServiceTypeFilter] = useState('todos');
  
  // Hooks de contextos reales
  const { 
    personnel, 
    loading: personnelLoading, 
    moveEmployee, 
    addEmployee, 
    updateEmployee, 
    deleteEmployee,
    getPersonnelStats 
  } = useSupabasePersonnel();
  
  const { 
    vehicles, 
    loading: fleetLoading, 
    updateVehicle, 
    addVehicle, 
    deleteVehicle, 
    assignRoute, 
    assignDriver,
    getFleetStats 
  } = useSupabaseFleet();
  
  const { 
    routes, 
    loading: routesLoading, 
    addRoute, 
    updateRoute, 
    deleteRoute, 
    toggleRouteStatus,
    getRoutesStats 
  } = useSupabaseRoutes();

  const {
    alerts,
    loading: alertsLoading,
    addAlert,
    updateAlert,
    deleteAlert,
    getAlertsStats
  } = useSupabaseRiskReports();
  
  // Estados para drag & drop y modales
  const [draggedEmployee, setDraggedEmployee] = useState(null);
  const [editingRoute, setEditingRoute] = useState(null);
  const [vehicleRouteAssignments, setVehicleRouteAssignments] = useState({});
  const [showRouteCreator, setShowRouteCreator] = useState(false);
  const [newRoute, setNewRoute] = useState({
    name: '',
    type: 'recoleccion',
    stops: [''],
    color: '#22c55e'
  });

  // Usar datos reales de los contextos
  const normalizedCamiones = vehicles.map(camion => (
    camion.tipoServicio ? camion : { ...camion, tipoServicio: 'recoleccion' }
  ));
  
  // Obtener estadísticas reales
  const personnelStats = getPersonnelStats();
  const fleetStats = getFleetStats();
  const routesStats = getRoutesStats();
  
  // Transformar personal en estructura esperada para drag & drop
  const organizedPersonnel = useMemo(() => {
    // Por ahora, todos los empleados van a "unassigned" 
    // Se puede modificar más tarde para clasificar por turnos
    return {
      unassigned: personnel || [],
      morning: [],
      afternoon: [],
      night: []
    };
  }, [personnel]);

  // Calcular estadísticas operativas basadas en datos reales
  const operationalStats = useMemo(() => {
    const defaultStats = {
      eficienciaPromedio: 85,
      combustiblePromedio: 75,
      totalKgHoy: 0
    };

    if (!vehicles || vehicles.length === 0) return defaultStats;

    const combustiblePromedio = vehicles.reduce((total, vehicle) => 
      total + (vehicle.combustible_nivel || 0), 0) / vehicles.length;

    return {
      eficienciaPromedio: 85, // Se puede calcular basado en rutas completadas
      combustiblePromedio: Math.round(combustiblePromedio),
      totalKgHoy: vehicles.reduce((total, vehicle) => total + (vehicle.capacidad_carga || 0), 0)
    };
  }, [vehicles]);

  const handleTabChange = (newTab, defaultSubTab = '') => {
    setActiveTab(newTab);
    setActiveSubTab(defaultSubTab);
  };

  const handleDragStart = (e, employee) => {
    setDraggedEmployee(employee);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetShift) => {
    e.preventDefault();
    if (!draggedEmployee) return;

    const sourceShift = findEmployeeShift(draggedEmployee.id);
    if (sourceShift === targetShift) return;

    // Usar función del contexto
    moveEmployee(draggedEmployee.id, sourceShift, targetShift);
    setDraggedEmployee(null);
  };

  const findEmployeeShift = (employeeId) => {
    for (const [shift, employees] of Object.entries(organizedPersonnel)) {
      if (employees.some(emp => emp.id === employeeId)) {
        return shift;
      }
    }
    return 'unassigned';
  };

  const calculateShiftAverage = (employees) => {
    if (employees.length === 0) return 0;
    const total = employees.reduce((sum, emp) => sum + emp.rating, 0);
    return (total / employees.length).toFixed(1);
  };

  const handleAddStop = () => {
    setNewRoute(prev => ({
      ...prev,
      stops: [...prev.stops, '']
    }));
  };

  const handleRemoveStop = (index) => {
    if (newRoute.stops.length > 1) {
      setNewRoute(prev => ({
        ...prev,
        stops: prev.stops.filter((_, i) => i !== index)
      }));
    }
  };

  const handleStopChange = (index, value) => {
    setNewRoute(prev => ({
      ...prev,
      stops: prev.stops.map((stop, i) => i === index ? value : stop)
    }));
  };

  const handleSaveRoute = () => {
    const validStops = newRoute.stops.filter(stop => typeof stop === 'string' && stop.trim());
    if (newRoute.name && validStops.length > 0) {
      const routeData = {
        ...newRoute,
        stops: validStops,
        estimatedTime: `${Math.ceil(validStops.length * 0.5)}h`,
        status: 'active'
      };
      
      // Usar función del contexto
      addRoute(routeData);
      setNewRoute({ name: '', type: 'recoleccion', stops: [''], color: '#22c55e' });
      setShowRouteCreator(false);
    }
  };

  const handleDeleteRoute = (routeId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta ruta?')) {
      // Usar función del contexto
      deleteRoute(routeId);
      
      // Remove route assignments from vehicles
      setVehicleRouteAssignments(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(vehicleId => {
          if (updated[vehicleId] === routeId) {
            delete updated[vehicleId];
          }
        });
        return updated;
      });
    }
  };

  const handleEditRoute = (route) => {
    setEditingRoute(route);
    
    // Convertir paradas de Supabase a formato de stops para edición
    const stops = route.paradas ? 
      route.paradas.map(parada => parada.direccion || `Parada ${parada.orden || 1}`) :
      [...(route.stops || [''])];
      
    setNewRoute({
      name: route.name || route.nombre,
      type: route.type || route.tipoServicio,
      stops: stops,
      color: route.color || '#22c55e'
    });
    setShowRouteCreator(true);
  };

  const handleUpdateRoute = () => {
    const validStops = newRoute.stops.filter(stop => typeof stop === 'string' && stop.trim());
    if (newRoute.name && validStops.length > 0) {
      const updatedRoute = {
        ...editingRoute,
        name: newRoute.name,
        type: newRoute.type,
        stops: validStops,
        color: newRoute.color,
        estimatedTime: `${Math.ceil(validStops.length * 0.5)}h`
      };
      
      // Usar función del contexto para actualizar
      updateRoute(editingRoute.id, updatedRoute);
      
      setNewRoute({ name: '', type: 'recoleccion', stops: [''], color: '#22c55e' });
      setEditingRoute(null);
      setShowRouteCreator(false);
    }
  };

  const handleToggleRouteStatus = (routeId) => {
    // Usar función del contexto
    toggleRouteStatus(routeId);
  };

  const handleDuplicateRoute = (route) => {
    const duplicatedRoute = {
      name: `${route.name || route.nombre} (Copia)`,
      type: route.type || route.tipoServicio,
      stops: route.paradas ? 
        route.paradas.map(p => p.direccion || `Parada ${p.orden}`) : 
        route.stops || [''],
      color: route.color || '#22c55e',
      status: 'inactive'
    };
    // Usar función del contexto
    addRoute(duplicatedRoute);
  };

  const handleVehicleRouteAssignment = (vehicleId, routeId) => {
    setVehicleRouteAssignments(prev => ({
      ...prev,
      [vehicleId]: routeId || undefined
    }));
  };

  const getAssignedRoute = (vehicleId) => {
    const routeId = vehicleRouteAssignments[vehicleId];
    return routeId ? routes.find(r => r.id === routeId) : null;
  };

  const handleGoToVehicleLocation = (vehicleId) => {
    setSelectedTruck(vehicleId);
    handleTabChange('dashboard');
  };

  const renderOperationsContent = () => {
    const currentSubTab = activeSubTab || 'personal';
    switch (currentSubTab) {
      case 'personal':
        return (
          <div className="operations-flow">
            <div className="section-header">
              <div className="section-title">
                <h3>Gestión de Personal</h3>
                <p>Arrastra y suelta empleados para asignar turnos</p>
              </div>
              <button className="btn-minimal primary">+ Agregar Empleado</button>
            </div>
            
            <div className="drag-drop-container">
              <div className="shifts-grid">
                {/* Personal Sin Asignar */}
                <div 
                  className="shift-zone unassigned"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'unassigned')}
                >
                  <div className="zone-header">
                    <div className="zone-title">
                      <h4>Personal Sin Asignar</h4>
                      <span className="zone-count">{organizedPersonnel.unassigned.length} empleados</span>
                    </div>
                  </div>
                  
                  <div className="employees-list">
                    {organizedPersonnel.unassigned.map(employee => (
                      <div
                        key={employee.id}
                        className="employee-card"
                        draggable
                        onDragStart={(e) => handleDragStart(e, employee)}
                      >
                        <div className="employee-avatar">{employee.avatar}</div>
                        <div className="employee-details">
                          <div className="employee-name">{employee.name}</div>
                          <div className="employee-meta">
                            <span className={`position-badge ${employee.position.toLowerCase()}`}>
                              {employee.position}
                            </span>
                            <span className="rating-display">★ {employee.rating}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {organizedPersonnel.unassigned.length === 0 && (
                      <div className="empty-zone">
                        <p>No hay personal sin asignar</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Turno Matutino */}
                <div 
                  className="shift-zone morning"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'morning')}
                >
                  <div className="zone-header">
                    <div className="zone-title">
                      <h4>Turno Matutino</h4>
                      <span className="shift-time">06:00 - 14:00</span>
                    </div>
                    <div className="zone-stats">
                      <span className="employee-count">{organizedPersonnel.morning.length}</span>
                      <span className="average-rating">
                        ★ {calculateShiftAverage(organizedPersonnel.morning)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="employees-list">
                    {organizedPersonnel.morning.map(employee => (
                      <div
                        key={employee.id}
                        className="employee-card"
                        draggable
                        onDragStart={(e) => handleDragStart(e, employee)}
                      >
                        <div className="employee-avatar">{employee.avatar}</div>
                        <div className="employee-details">
                          <div className="employee-name">{employee.name}</div>
                          <div className="employee-meta">
                            <span className={`position-badge ${employee.position.toLowerCase()}`}>
                              {employee.position}
                            </span>
                            <span className="rating-display">★ {employee.rating}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {organizedPersonnel.morning.length === 0 && (
                      <div className="empty-zone">
                        <p>Arrastra empleados aquí</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Turno Vespertino */}
                <div 
                  className="shift-zone afternoon"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'afternoon')}
                >
                  <div className="zone-header">
                    <div className="zone-title">
                      <h4>Turno Vespertino</h4>
                      <span className="shift-time">14:00 - 22:00</span>
                    </div>
                    <div className="zone-stats">
                      <span className="employee-count">{organizedPersonnel.afternoon.length}</span>
                      <span className="average-rating">
                        ★ {calculateShiftAverage(organizedPersonnel.afternoon)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="employees-list">
                    {organizedPersonnel.afternoon.map(employee => (
                      <div
                        key={employee.id}
                        className="employee-card"
                        draggable
                        onDragStart={(e) => handleDragStart(e, employee)}
                      >
                        <div className="employee-avatar">{employee.avatar}</div>
                        <div className="employee-details">
                          <div className="employee-name">{employee.name}</div>
                          <div className="employee-meta">
                            <span className={`position-badge ${employee.position.toLowerCase()}`}>
                              {employee.position}
                            </span>
                            <span className="rating-display">★ {employee.rating}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {organizedPersonnel.afternoon.length === 0 && (
                      <div className="empty-zone">
                        <p>Arrastra empleados aquí</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Turno Nocturno */}
                <div 
                  className="shift-zone night"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'night')}
                >
                  <div className="zone-header">
                    <div className="zone-title">
                      <h4>Turno Nocturno</h4>
                      <span className="shift-time">22:00 - 06:00</span>
                    </div>
                    <div className="zone-stats">
                      <span className="employee-count">{organizedPersonnel.night.length}</span>
                      <span className="average-rating">
                        ★ {calculateShiftAverage(organizedPersonnel.night)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="employees-list">
                    {organizedPersonnel.night.map(employee => (
                      <div
                        key={employee.id}
                        className="employee-card"
                        draggable
                        onDragStart={(e) => handleDragStart(e, employee)}
                      >
                        <div className="employee-avatar">{employee.avatar}</div>
                        <div className="employee-details">
                          <div className="employee-name">{employee.name}</div>
                          <div className="employee-meta">
                            <span className={`position-badge ${employee.position.toLowerCase()}`}>
                              {employee.position}
                            </span>
                            <span className="rating-display">★ {employee.rating}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {organizedPersonnel.night.length === 0 && (
                      <div className="empty-zone">
                        <p>Arrastra empleados aquí</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'flota':
        const filteredVehicles = serviceTypeFilter === 'todos' 
          ? normalizedCamiones 
          : normalizedCamiones.filter(c => c.tipoServicio === serviceTypeFilter);
        
        const availableRoutes = routes.filter(route => 
          serviceTypeFilter === 'todos' || route.type === serviceTypeFilter
        );

        return (
          <div className="operations-flow">
            <div className="section-header">
              <div className="section-title">
                <h3>Gestión de Flota</h3>
                <p>Asigna rutas y conductores a los vehículos</p>
              </div>
            </div>
            
            <div className="fleet-management">
              <div className="service-filters">
                <div className="filter-group">
                  <label>Tipo de Servicio:</label>
                  <div className="filter-buttons">
                    <button 
                      className={`filter-btn ${serviceTypeFilter === 'todos' ? 'active' : ''}`}
                      onClick={() => setServiceTypeFilter('todos')}
                    >
                      📊 Todos
                    </button>
                    <button 
                      className={`filter-btn ${serviceTypeFilter === 'recoleccion' ? 'active' : ''}`}
                      onClick={() => setServiceTypeFilter('recoleccion')}
                    >
                      🚛 Recolección
                    </button>
                    <button 
                      className={`filter-btn ${serviceTypeFilter === 'fumigacion' ? 'active' : ''}`}
                      onClick={() => setServiceTypeFilter('fumigacion')}
                    >
                      🚐 Fumigación
                    </button>
                  </div>
                </div>
              </div>

              <div className="fleet-list-container">
                <div className="fleet-stats">
                  <div className="stat-item">
                    <span className="stat-icon">🚛</span>
                    <span className="stat-value">{filteredVehicles.length}</span>
                    <span className="stat-label">Vehículos</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">🟢</span>
                    <span className="stat-value">
                      {filteredVehicles.filter(v => v.estado === 'En ruta').length}
                    </span>
                    <span className="stat-label">En Ruta</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">🗺️</span>
                    <span className="stat-value">
                      {Object.keys(vehicleRouteAssignments).length}
                    </span>
                    <span className="stat-label">Con Ruta</span>
                  </div>
                </div>

                <div className="fleet-list">
                  {filteredVehicles.map(vehicle => (
                    <div key={vehicle.id} className="fleet-list-item">
                      <div className="vehicle-main-info">
                        <div className="vehicle-indicator">
                          <div className="vehicle-icon-large">
                            {vehicle.tipoServicio === 'fumigacion' ? '🚐' : '🚛'}
                          </div>
                          <div className={`status-dot ${vehicle.estado.toLowerCase().replace(' ', '-')}`}></div>
                        </div>
                        
                        <div className="vehicle-details-list">
                          <div className="vehicle-primary">
                            <h4>{vehicle.id}</h4>
                            <div className="vehicle-meta-list">
                              <span className={`service-type-tag ${vehicle.tipoServicio}`}>
                                {vehicle.tipoServicio === 'fumigacion' ? 'Fumigación' : 'Recolección'}
                              </span>
                              <span className={`status-tag ${vehicle.estado.toLowerCase().replace(' ', '-')}`}>
                                {vehicle.estado}
                              </span>
                              <span className="fuel-level">⛽ {vehicle.nivelCombustible}%</span>
                            </div>
                          </div>
                          
                          <div className="assignments-compact">
                            <div className="assignment-row">
                              <label>Conductor:</label>
                              <select className="compact-select">
                                <option value={vehicle.conductor}>{vehicle.conductor}</option>
                                <option value="">Sin asignar</option>
                                <option value="Juan Pérez">Juan Pérez</option>
                                <option value="María García">María García</option>
                                <option value="Carlos López">Carlos López</option>
                                <option value="Ana Rodríguez">Ana Rodríguez</option>
                              </select>
                            </div>
                            
                            <div className="assignment-row">
                              <label>Ruta:</label>
                              <select 
                                className="compact-select"
                                value={vehicleRouteAssignments[vehicle.id] || ''}
                                onChange={(e) => handleVehicleRouteAssignment(vehicle.id, e.target.value)}
                              >
                                <option value="">Sin asignar</option>
                                {availableRoutes
                                  .filter(route => route.status === 'active')
                                  .map(route => (
                                  <option key={route.id} value={route.id}>
                                    {route.name} ({route.stops.length} paradas)
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            {getAssignedRoute(vehicle.id) && (
                              <div className="route-info-compact">
                                <div className="route-name-compact">📍 {getAssignedRoute(vehicle.id).name}</div>
                                <div className="route-stops-compact">
                                  {getAssignedRoute(vehicle.id).stops.slice(0, 2).join(' → ')}
                                  {getAssignedRoute(vehicle.id).stops.length > 2 && 
                                    ` → +${getAssignedRoute(vehicle.id).stops.length - 2} más`
                                  }
                                </div>
                                <div className="route-time-compact">⏱️ {getAssignedRoute(vehicle.id).estimatedTime}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="fleet-actions">
                        <button 
                          className="fleet-action-btn location"
                          onClick={() => handleGoToVehicleLocation(vehicle.id)}
                          title="Ver ubicación en mapa"
                        >
                          📍
                        </button>
                        <button className="fleet-action-btn save">
                          💾
                        </button>
                        <button className="fleet-action-btn map">
                          🗺️
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {filteredVehicles.length === 0 && (
                    <div className="empty-fleet">
                      <div className="empty-icon">🚛</div>
                      <h4>No hay vehículos</h4>
                      <p>No se encontraron vehículos para el filtro seleccionado</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      case 'rutas':
        return (
          <div className="operations-flow">
            <div className="section-header">
              <div className="section-title">
                <h3>Gestión de Rutas</h3>
                <p>Crea y gestiona rutas de recolección y fumigación</p>
              </div>
              <button 
                className="btn-minimal primary"
                onClick={() => setShowRouteCreator(!showRouteCreator)}
              >
                {showRouteCreator ? '✕ Cancelar' : '+ Nueva Ruta'}
              </button>
            </div>

            {showRouteCreator && (
              <div className="route-creator">
                <div className="creator-header">
                  <h4>🗺️ {editingRoute ? 'Editar Ruta' : 'Crear Nueva Ruta'}</h4>
                  <p>{editingRoute ? 'Modifica el nombre y las paradas de la ruta' : 'Configura el nombre y las paradas de la ruta'}</p>
                </div>
                
                <div className="creator-form">
                  <div className="form-row">
                    <div className="form-field">
                      <label>Nombre de la Ruta:</label>
                      <input
                        type="text"
                        className="route-name-input"
                        placeholder="Ej: Zona Centro, Sector Norte..."
                        value={newRoute.name}
                        onChange={(e) => setNewRoute(prev => ({...prev, name: e.target.value}))}
                      />
                    </div>
                    
                    <div className="form-field">
                      <label>Tipo de Servicio:</label>
                      <select
                        className="route-type-select"
                        value={newRoute.type}
                        onChange={(e) => setNewRoute(prev => ({...prev, type: e.target.value}))}
                      >
                        <option value="recoleccion">🚛 Recolección</option>
                        <option value="fumigacion">🚐 Fumigación</option>
                      </select>
                    </div>
                  </div>

                  <div className="stops-section">
                    <div className="stops-header">
                      <label>Paradas de la Ruta:</label>
                      <span className="stops-info">Agrega las ubicaciones en orden de visita</span>
                    </div>
                    
                    <div className="stops-list">
                      {newRoute.stops.map((stop, index) => (
                        <div key={index} className="stop-item">
                          <div className="stop-number">{index + 1}</div>
                          <input
                            type="text"
                            className="stop-input"
                            placeholder="Ej: Plaza Central, Banco Nacional, Centro Comercial..."
                            value={stop}
                            onChange={(e) => handleStopChange(index, e.target.value)}
                          />
                          {newRoute.stops.length > 1 && (
                            <button
                              className="remove-stop-btn"
                              onClick={() => handleRemoveStop(index)}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <button className="add-stop-btn" onClick={handleAddStop}>
                      ➕ Agregar Parada
                    </button>
                  </div>

                  <div className="creator-actions">
                    <button 
                      className="cancel-btn"
                      onClick={() => {
                        setShowRouteCreator(false);
                        setEditingRoute(null);
                        setNewRoute({ name: '', type: 'recoleccion', stops: [''], color: '#22c55e' });
                      }}
                    >
                      Cancelar
                    </button>
                    <button 
                      className="save-route-btn"
                      onClick={editingRoute ? handleUpdateRoute : handleSaveRoute}
                      disabled={!newRoute.name || newRoute.stops.filter(s => typeof s === 'string' && s.trim()).length === 0}
                    >
                      💾 {editingRoute ? 'Actualizar Ruta' : 'Guardar Ruta'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="routes-list-container">
              <div className="routes-stats">
                <div className="stat-item">
                  <span className="stat-icon">🗺️</span>
                  <span className="stat-value">{routes.length}</span>
                  <span className="stat-label">Total Rutas</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">📍</span>
                  <span className="stat-value">{routes.reduce((sum, r) => sum + r.stops.length, 0)}</span>
                  <span className="stat-label">Total Paradas</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">✅</span>
                  <span className="stat-value">{routes.filter(r => r.status === 'active').length}</span>
                  <span className="stat-label">Rutas Activas</span>
                </div>
              </div>

              <div className="routes-list">
                {routes.map(route => (
                  <div key={route.id} className="route-list-item">
                    <div className="route-main-info">
                      <div className="route-indicator">
                        <div 
                          className="route-color-dot" 
                          style={{backgroundColor: route.color}}
                        ></div>
                        <div className="route-type-icon">
                          {route.type === 'fumigacion' ? '🚐' : '🚛'}
                        </div>
                      </div>
                      
                      <div className="route-details-list">
                        <div className="route-name-section">
                          <h4>{route.name}</h4>
                          <div className="route-meta">
                            <button 
                              className={`route-status-toggle ${route.status}`}
                              onClick={() => handleToggleRouteStatus(route.id)}
                            >
                              {route.status === 'active' ? '🟢 Activa' : '🔴 Inactiva'}
                            </button>
                            <span className="route-service-type">
                              {route.type === 'fumigacion' ? 'Fumigación' : 'Recolección'}
                            </span>
                            <span className="vehicles-assigned">
                              🚛 {Object.values(vehicleRouteAssignments).filter(assignedId => assignedId === route.id).length} asignados
                            </span>
                          </div>
                        </div>
                        
                        <div className="route-stops-preview">
                          <div className="stops-header-info">
                            <span className="stops-count">📍 {route.paradas ? route.paradas.length : route.stops.length} paradas</span>
                            <span className="route-time">⏱️ {route.estimatedTime}</span>
                          </div>
                          <div className="stops-preview-list">
                            {route.paradas ? 
                              route.paradas.map((parada, index) => (
                                <span key={index} className="stop-preview">
                                  {parada.direccion || `Parada ${index + 1}`}
                                  {index < route.paradas.length - 1 && ' → '}
                                </span>
                              )) :
                              route.stops.map((stop, index) => (
                                <span key={index} className="stop-preview">
                                  {typeof stop === 'string' ? stop : `Parada ${index + 1}`}
                                  {index < route.stops.length - 1 && ' → '}
                                </span>
                              ))
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="route-actions-list">
                      <button 
                        className="action-btn-list edit"
                        onClick={() => handleEditRoute(route)}
                        title="Editar ruta"
                      >
                        ✏️
                      </button>
                      <button 
                        className="action-btn-list map"
                        onClick={() => alert('Funcionalidad de mapa próximamente')}
                        title="Ver en mapa"
                      >
                        🗺️
                      </button>
                      <button 
                        className="action-btn-list duplicate"
                        onClick={() => handleDuplicateRoute(route)}
                        title="Duplicar ruta"
                      >
                        📋
                      </button>
                      <button 
                        className="action-btn-list delete"
                        onClick={() => handleDeleteRoute(route.id)}
                        title="Eliminar ruta"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
                
                {routes.length === 0 && (
                  <div className="empty-routes">
                    <div className="empty-icon">🗺️</div>
                    <h4>No hay rutas creadas</h4>
                    <p>Crea tu primera ruta haciendo clic en "Nueva Ruta"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };


  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="dashboard-content">
            <div className="card">
              <div className="card__body">
                <h3>🗺️ Monitoreo GPS en Tiempo Real</h3>
                <p className="section-description">
                  Seguimiento en vivo de {
                    serviceTypeFilter === 'todos' ? 'todos los vehículos' :
                    serviceTypeFilter === 'recoleccion' ? 'vehículos de recolección' : 'vehículos de fumigación'
                  } con actualizaciones automáticas
                </p>
                <MapComponent 
                  key={`map-${serviceTypeFilter}`}
                  camiones={serviceTypeFilter === 'todos' 
                    ? normalizedCamiones 
                    : normalizedCamiones.filter(c => c.tipoServicio === serviceTypeFilter)
                  }
                  rutas={routes || []}
                  userType={user.tipo}
                  showRealTime={true}
                  selectedTruck={selectedTruck}
                  serviceTypeFilter={serviceTypeFilter}
                />
              </div>
            </div>
            <div className="service-filters">
              <div className="filter-group">
                <label>Tipo de Servicio:</label>
                <div className="filter-buttons">
                  <button 
                    className={`filter-btn ${serviceTypeFilter === 'todos' ? 'active' : ''}`}
                    onClick={() => setServiceTypeFilter('todos')}
                  >
                    📊 Todos
                  </button>
                  <button 
                    className={`filter-btn ${serviceTypeFilter === 'recoleccion' ? 'active' : ''}`}
                    onClick={() => setServiceTypeFilter('recoleccion')}
                  >
                    🚛 Recolección
                  </button>
                  <button 
                    className={`filter-btn ${serviceTypeFilter === 'fumigacion' ? 'active' : ''}`}
                    onClick={() => setServiceTypeFilter('fumigacion')}
                  >
                    🚐 Fumigación
                  </button>
                </div>
              </div>
            </div>
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-icon">🚛</div>
                <div className="kpi-content">
                  <div className="kpi-value">
                    {serviceTypeFilter === 'todos' 
                      ? normalizedCamiones.length 
                      : normalizedCamiones.filter(c => c.tipoServicio === serviceTypeFilter).length
                    }
                  </div>
                  <div className="kpi-label">
                    {serviceTypeFilter === 'todos' ? 'Total Vehículos' : 
                     serviceTypeFilter === 'recoleccion' ? 'Camiones Recolección' : 'Vehículos Fumigación'}
                  </div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon">🟢</div>
                <div className="kpi-content">
                  <div className="kpi-value">
                    {serviceTypeFilter === 'todos' 
                      ? normalizedCamiones.filter(c => c.estado === 'En ruta').length
                      : normalizedCamiones.filter(c => c.estado === 'En ruta' && c.tipoServicio === serviceTypeFilter).length
                    }
                  </div>
                  <div className="kpi-label">En Ruta</div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon">⚡</div>
                <div className="kpi-content">
                  <div className="kpi-value">
                    {Math.round(operationalStats.eficienciaPromedio)}%
                  </div>
                  <div className="kpi-label">Eficiencia Promedio</div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon">⛽</div>
                <div className="kpi-content">
                  <div className="kpi-value">
                    {Math.round(operationalStats.combustiblePromedio)}%
                  </div>
                  <div className="kpi-label">Combustible Promedio</div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon">⚠️</div>
                <div className="kpi-content">
                  <div className="kpi-value">
                    {alerts?.length || 0}
                  </div>
                  <div className="kpi-label">Alertas Activas</div>
                </div>
              </div>
            </div>
            {alerts && alerts.length > 0 && (
              <div className="alerts-section">
                <h3>🚨 Alertas Recientes</h3>
                <div className="alerts-grid">
                  {alerts.slice(0, 3).map(alerta => (
                    <div key={alerta.id} className={`alert-card alert-${alerta.prioridad}`}>
                      <div className="alert-header">
                        <span className="alert-type">
                          {alerta.tipo === 'combustible' && '⛽'}
                          {alerta.tipo === 'mantenimiento' && '🔧'}
                          {alerta.tipo === 'ruta' && '🗺️'}
                        </span>
                        <span className="alert-priority">{alerta.prioridad.toUpperCase()}</span>
                      </div>
                      <div className="alert-content">
                        <div className="alert-truck">Camión: {alerta.camion}</div>
                        <div className="alert-message">{alerta.mensaje}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 'operaciones':
        return (
          <div className="section-with-tabs">
            <div className="sub-tabs">
              <button 
                className={`sub-tab ${(!activeSubTab || activeSubTab === 'personal') ? 'sub-tab--active' : ''}`}
                onClick={() => setActiveSubTab('personal')}
              >
                👥 Personal
              </button>
              <button 
                className={`sub-tab ${activeSubTab === 'flota' ? 'sub-tab--active' : ''}`}
                onClick={() => setActiveSubTab('flota')}
              >
                🚛 Flota
              </button>
              <button 
                className={`sub-tab ${activeSubTab === 'rutas' ? 'sub-tab--active' : ''}`}
                onClick={() => setActiveSubTab('rutas')}
              >
                🗺️ Rutas
              </button>
            </div>
            {renderOperationsContent()}
          </div>
        );
      case 'riesgos':
        return <RiskComponent userType={user.tipo} />;
      case 'inventario':
        return <InventoryComponent userType={user.tipo} />;
      case 'reportes':
        return <ReportsComponent userType={user.tipo} />;
      default:
        return null;
    }
  };

  
  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>🌱 RMP Admin</h2>
          <p>Bienvenido, {user.nombre}</p>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li>
              <button 
                className={activeTab === 'dashboard' ? 'active' : ''}
                onClick={() => handleTabChange('dashboard')}
              >
                📊 Dashboard
              </button>
            </li>
            <li>
              <button 
                className={activeTab === 'operaciones' ? 'active' : ''}
                onClick={() => handleTabChange('operaciones', 'personal')}
              >
                🚛 Operaciones
              </button>
            </li>
            <li>
              <button 
                className={activeTab === 'riesgos' ? 'active' : ''}
                onClick={() => handleTabChange('riesgos')}
              >
                ⚠️ Riesgos
              </button>
            </li>
            <li>
              <button 
                className={activeTab === 'inventario' ? 'active' : ''}
                onClick={() => handleTabChange('inventario')}
              >
                📦 Inventario
              </button>
            </li>
            <li>
              <button 
                className={activeTab === 'reportes' ? 'active' : ''}
                onClick={() => handleTabChange('reportes')}
              >
                📊 Reportes
              </button>
            </li>
          </ul>
        </nav>
      </div>
      <div className="main-content">
        <div className="dashboard-header">
          <h1>🌿 Panel de Administración</h1>
          <div className="header-actions">
            <div className="realtime-status">
              🟢 Sistema en Tiempo Real
            </div>
            <button className="logout-btn" onClick={onLogout}>
              🚪 Cerrar Sesión
            </button>
          </div>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;