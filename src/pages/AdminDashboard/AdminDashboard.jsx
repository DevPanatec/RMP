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
import { 
  LayoutDashboard, Truck, AlertTriangle, Package, 
  BarChart3, Users, Map, LogOut, TrendingUp, CheckCircle,
  MapPin, Radio, Activity, Zap, Fuel, Bell, Wrench, Leaf, Navigation, Clock, Save
} from '../../components/Icons';
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

  const handleVehicleRouteAssignment = async (vehicleId, routeId) => {
    try {
      await assignRoute(vehicleId, routeId || null);
    } catch (error) {
      console.error('Error al asignar ruta:', error);
      alert('Error al asignar la ruta. Por favor intenta de nuevo.');
    }
  };

  const getAssignedRoute = (vehicleId) => {
    return routes.find(r => r.vehiculo_id === vehicleId) || null;
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
                      <BarChart3 size={16} /> Todos
                    </button>
                    <button 
                      className={`filter-btn ${serviceTypeFilter === 'recoleccion' ? 'active' : ''}`}
                      onClick={() => setServiceTypeFilter('recoleccion')}
                    >
                      <Truck size={16} /> Recolección
                    </button>
                    <button 
                      className={`filter-btn ${serviceTypeFilter === 'fumigacion' ? 'active' : ''}`}
                      onClick={() => setServiceTypeFilter('fumigacion')}
                    >
                      <Truck size={16} /> Fumigación
                    </button>
                  </div>
                </div>
              </div>

              <div className="fleet-list-container">
                <div className="fleet-stats">
                  <div className="stat-item">
                    <span className="stat-icon"><Truck size={20} /></span>
                    <span className="stat-value">{filteredVehicles.length}</span>
                    <span className="stat-label">Vehículos</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon"><Activity size={20} /></span>
                    <span className="stat-value">
                      {filteredVehicles.filter(v => v.estado === 'En ruta').length}
                    </span>
                    <span className="stat-label">En Ruta</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon"><Map size={20} /></span>
                    <span className="stat-value">
                      {routes.filter(r => r.vehiculo_id).length}
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
                            <Truck size={32} />
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
                              <span className="fuel-level"><Fuel size={14} /> {vehicle.nivelCombustible}%</span>
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
                                value={getAssignedRoute(vehicle.id)?.id || ''}
                                onChange={(e) => handleVehicleRouteAssignment(vehicle.id, e.target.value)}
                              >
                                <option value="">Sin asignar</option>
                                {availableRoutes
                                  .filter(route => route.activa !== false && route.estado !== 'cancelada')
                                  .map(route => {
                                    const paradas = route.paradas || route.stops || [];
                                    const paradasCount = Array.isArray(paradas) ? paradas.length : 0;
                                    return (
                                      <option key={route.id} value={route.id}>
                                        {route.name || route.nombre} ({paradasCount} paradas)
                                      </option>
                                    );
                                  })}
                              </select>
                            </div>
                            
                            {getAssignedRoute(vehicle.id) && (
                              <div className="route-info-compact">
                                <div className="route-name-compact"><MapPin size={14} /> {getAssignedRoute(vehicle.id).name || getAssignedRoute(vehicle.id).nombre}</div>
                                <div className="route-stops-compact">
                                  {(() => {
                                    const assignedRoute = getAssignedRoute(vehicle.id);
                                    const paradas = assignedRoute.paradas || assignedRoute.stops || [];
                                    if (Array.isArray(paradas) && paradas.length > 0) {
                                      const stopNames = paradas.slice(0, 2).map(p => 
                                        typeof p === 'string' ? p : (p.nombre || p.direccion || 'Parada')
                                      );
                                      return stopNames.join(' → ') + 
                                        (paradas.length > 2 ? ` → +${paradas.length - 2} más` : '');
                                    }
                                    return 'Sin paradas';
                                  })()}
                                </div>
                                <div className="route-time-compact"><Clock size={14} /> {getAssignedRoute(vehicle.id).tiempo_estimado ? `${getAssignedRoute(vehicle.id).tiempo_estimado} min` : (getAssignedRoute(vehicle.id).estimatedTime || 'N/A')}</div>
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
                          <Navigation size={16} />
                        </button>
                        <button className="fleet-action-btn save">
                          <Save size={16} />
                        </button>
                        <button className="fleet-action-btn map">
                          <Map size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {filteredVehicles.length === 0 && (
                    <div className="empty-fleet">
                      <div className="empty-icon"><Truck size={48} /></div>
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
          <RoutesComponent 
            initialRoutes={routes}
            onRoutesChange={async (updatedRoutes) => {
              // Las rutas se manejan automáticamente por el SupabaseRoutesContext
              // que ya está siendo usado en este componente
              console.log('Rutas actualizadas:', updatedRoutes);
            }}
          />
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
                <h3><Map size={20} /> Monitoreo GPS en Tiempo Real</h3>
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
                    <BarChart3 size={16} /> Todos
                  </button>
                  <button 
                    className={`filter-btn ${serviceTypeFilter === 'recoleccion' ? 'active' : ''}`}
                    onClick={() => setServiceTypeFilter('recoleccion')}
                  >
                    <Truck size={16} /> Recolección
                  </button>
                  <button 
                    className={`filter-btn ${serviceTypeFilter === 'fumigacion' ? 'active' : ''}`}
                    onClick={() => setServiceTypeFilter('fumigacion')}
                  >
                    <Truck size={16} /> Fumigación
                  </button>
                </div>
              </div>
            </div>
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-icon"><Truck size={24} /></div>
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
                <div className="kpi-icon"><Activity size={24} /></div>
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
                <div className="kpi-icon"><Zap size={24} /></div>
                <div className="kpi-content">
                  <div className="kpi-value">
                    {Math.round(operationalStats.eficienciaPromedio)}%
                  </div>
                  <div className="kpi-label">Eficiencia Promedio</div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon"><Fuel size={24} /></div>
                <div className="kpi-content">
                  <div className="kpi-value">
                    {Math.round(operationalStats.combustiblePromedio)}%
                  </div>
                  <div className="kpi-label">Combustible Promedio</div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon"><AlertTriangle size={24} /></div>
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
                <h3><Bell size={20} /> Alertas Recientes</h3>
                <div className="alerts-grid">
                  {alerts.slice(0, 3).map(alerta => (
                    <div key={alerta.id} className={`alert-card alert-${alerta.prioridad}`}>
                      <div className="alert-header">
                        <span className="alert-type">
                          {alerta.tipo === 'combustible' && <Fuel size={16} />}
                          {alerta.tipo === 'mantenimiento' && <Wrench size={16} />}
                          {alerta.tipo === 'ruta' && <Map size={16} />}
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
                <Users size={18} /> Personal
              </button>
              <button 
                className={`sub-tab ${activeSubTab === 'flota' ? 'sub-tab--active' : ''}`}
                onClick={() => setActiveSubTab('flota')}
              >
                <Truck size={18} /> Flota
              </button>
              <button 
                className={`sub-tab ${activeSubTab === 'rutas' ? 'sub-tab--active' : ''}`}
                onClick={() => setActiveSubTab('rutas')}
              >
                <Map size={18} /> Rutas
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
          <h2><Leaf size={20} /> RMP Admin</h2>
          <p>Bienvenido, {user.nombre}</p>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li>
              <button 
                className={activeTab === 'dashboard' ? 'active' : ''}
                onClick={() => handleTabChange('dashboard')}
              >
                <LayoutDashboard size={18} /> Dashboard
              </button>
            </li>
            <li>
              <button 
                className={activeTab === 'operaciones' ? 'active' : ''}
                onClick={() => handleTabChange('operaciones', 'personal')}
              >
                <Truck size={18} /> Operaciones
              </button>
            </li>
            <li>
              <button 
                className={activeTab === 'riesgos' ? 'active' : ''}
                onClick={() => handleTabChange('riesgos')}
              >
                <AlertTriangle size={18} /> Riesgos
              </button>
            </li>
            <li>
              <button 
                className={activeTab === 'inventario' ? 'active' : ''}
                onClick={() => handleTabChange('inventario')}
              >
                <Package size={18} /> Inventario
              </button>
            </li>
            <li>
              <button 
                className={activeTab === 'reportes' ? 'active' : ''}
                onClick={() => handleTabChange('reportes')}
              >
                <BarChart3 size={18} /> Reportes
              </button>
            </li>
          </ul>
        </nav>
      </div>
      <div className="main-content">
        <div className="dashboard-header">
          <h1><Leaf size={24} /> Panel de Administración</h1>
          <div className="header-actions">
            <div className="realtime-status">
              <Activity size={16} /> Sistema en Tiempo Real
            </div>
            <button className="logout-btn" onClick={onLogout}>
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </div>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;