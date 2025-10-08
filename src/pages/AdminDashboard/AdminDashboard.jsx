import { useState, useEffect, useMemo } from 'react';
import MapComponent from '../../components/Map/MapComponent';
import PersonnelComponent from '../../components/Personnel/PersonnelComponent';
import InventoryComponent from '../../components/Inventory/InventoryComponent';
import RoutesComponent from '../../components/Routes/RoutesComponent';
import RiskComponent from '../../components/Risk/RiskComponent';
import ReportsComponent from '../../components/Reports/ReportsComponent';
import ScheduleComponent from '../../components/Schedule/ScheduleComponent';
import FleetManagement from '../../components/Fleet/FleetManagement';
import { useSupabasePersonnel } from '../../context/SupabasePersonnelContext';
import { useSupabaseFleet } from '../../context/SupabaseFleetContext';
import { useSupabaseRoutes } from '../../context/SupabaseRoutesContext';
import { useSupabaseRiskReports } from '../../context/SupabaseRiskReportsContext';
import { 
  LayoutDashboard, Truck, AlertTriangle, Package, 
  BarChart3, Users, Map, LogOut, TrendingUp, CheckCircle,
  MapPin, Radio, Activity, Zap, Bell, Wrench, Leaf, Navigation, Clock, Save, Calendar
} from '../../components/Icons';
import { Badge, ProgressBar } from '../../components/UI';
import { DashboardKPI, AlertCard, PersonnelTable, VehicleCard, RouteTimeline, HeroStats, RealtimeActivity, RiskAlerts } from '../../components/Dashboard';
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
  
  // Estados para modales
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

  // Calcular estadísticas operativas basadas en datos reales
  const operationalStats = useMemo(() => {
    const defaultStats = {
      eficienciaPromedio: 85,
      totalKgHoy: 0
    };

    if (!vehicles || vehicles.length === 0) return defaultStats;

    return {
      eficienciaPromedio: 85, // Se puede calcular basado en rutas completadas
      totalKgHoy: vehicles.reduce((total, vehicle) => total + (vehicle.capacidad_carga || 0), 0)
    };
  }, [vehicles]);

  const handleTabChange = (newTab, defaultSubTab = '') => {
    setActiveTab(newTab);
    setActiveSubTab(defaultSubTab);
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
          <div className="operations-content">
            <div className="section-header">
              <div className="section-title">
                <h3>Gestión de Personal</h3>
                <p>Administra conductores, ayudantes y supervisores</p>
              </div>
            </div>
            <PersonnelTable
              personnel={personnel}
              onEdit={(employee) => {
                // TODO: Implement edit functionality
                console.log('Edit employee:', employee);
              }}
              onDelete={(employeeId) => {
                if (window.confirm('¿Estás seguro de que quieres eliminar este empleado?')) {
                  deleteEmployee(employeeId);
                }
              }}
              currentPage={1}
              totalPages={Math.ceil((personnel?.length || 0) / 8)}
              onPageChange={(page) => {
                // TODO: Implement pagination
                console.log('Page change:', page);
              }}
            />
          </div>
        );
      case 'flota':
        return (
          <div className="operations-content">
            <div className="section-header">
              <div className="section-title">
                <h3>Gestión de Flota</h3>
                <p>Monitorea y administra todos los vehículos</p>
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
            <div className="vehicle-grid">
              {normalizedCamiones
                .filter(vehicle => serviceTypeFilter === 'todos' || vehicle.tipoServicio === serviceTypeFilter)
                .map(vehicle => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    onLocationClick={(vehicle) => handleGoToVehicleLocation(vehicle.id)}
                    onMaintenanceClick={(vehicle) => {
                      // TODO: Implement maintenance functionality
                      console.log('Maintenance for vehicle:', vehicle);
                    }}
                    onHistoryClick={(vehicle) => {
                      // TODO: Implement history functionality
                      console.log('History for vehicle:', vehicle);
                    }}
                  />
                ))}
            </div>
            {normalizedCamiones.filter(vehicle => serviceTypeFilter === 'todos' || vehicle.tipoServicio === serviceTypeFilter).length === 0 && (
              <div className="empty-state">
                <div className="empty-icon"><Truck size={48} /></div>
                <h4>No hay vehículos</h4>
                <p>No se encontraron vehículos para el filtro seleccionado</p>
              </div>
            )}
          </div>
        );

      case 'rutas':
        return (
          <div className="operations-content">
            <div className="section-header">
              <div className="section-title">
                <h3>Gestión de Rutas</h3>
                <p>Visualiza y administra todas las rutas activas</p>
              </div>
            </div>
            <div className="routes-grid">
              {routes
                .filter(route => route.activa !== false && route.estado !== 'cancelada')
                .map(route => (
                  <RouteTimeline
                    key={route.id}
                    route={route}
                    onViewMap={(route) => {
                      // TODO: Implement map view
                      console.log('View map for route:', route);
                    }}
                    onEdit={(route) => handleEditRoute(route)}
                    onPause={(route) => handleToggleRouteStatus(route.id)}
                    onViewStats={(route) => {
                      // TODO: Implement stats view
                      console.log('View stats for route:', route);
                    }}
                  />
                ))}
            </div>
            {routes.filter(route => route.activa !== false && route.estado !== 'cancelada').length === 0 && (
              <div className="empty-state">
                <div className="empty-icon"><Map size={48} /></div>
                <h4>No hay rutas activas</h4>
                <p>No se encontraron rutas activas en el sistema</p>
              </div>
            )}
          </div>
        );
      case 'programacion':
        return (
          <div className="operations-content">
            <ScheduleComponent />
          </div>
        );
      default:
        return null;
    }
  };


  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        const heroStatsData = [
          {
            id: 'vehicles',
            icon: <Truck size={36} />,
            value: serviceTypeFilter === 'todos' 
              ? normalizedCamiones.length 
              : normalizedCamiones.filter(c => c.tipoServicio === serviceTypeFilter).length,
            label: serviceTypeFilter === 'todos' ? 'Total Vehículos' : 
                   serviceTypeFilter === 'recoleccion' ? 'Camiones Recolección' : 'Vehículos Fumigación',
            color: 'linear-gradient(135deg, #30d158 0%, #34c759 100%)'
          },
          {
            id: 'active',
            icon: <Activity size={36} />,
            value: serviceTypeFilter === 'todos' 
              ? normalizedCamiones.filter(c => c.estado === 'En ruta' || c.estado === 'en_ruta').length
              : normalizedCamiones.filter(c => (c.estado === 'En ruta' || c.estado === 'en_ruta') && c.tipoServicio === serviceTypeFilter).length,
            label: 'En Ruta',
            color: 'linear-gradient(135deg, #ff9500 0%, #ffb800 100%)'
          },
          {
            id: 'personnel',
            icon: <Users size={36} />,
            value: personnel?.length || 0,
            label: 'Personal',
            color: 'linear-gradient(135deg, #007aff 0%, #4da3ff 100%)'
          },
          {
            id: 'routes',
            icon: <Map size={36} />,
            value: routes.filter(r => r.activa !== false).length,
            label: 'Rutas Activas',
            color: 'linear-gradient(135deg, #00d4ff 0%, #0091ff 100%)'
          }
        ];

        return (
          <div className="dashboard-content">
            <HeroStats stats={heroStatsData} />
            
            <div className="map-section">
              <div className="map-header">
                <h3><Map size={24} /> Monitoreo GPS en Tiempo Real</h3>
                <div className="service-filters-modern">
                  <button 
                    className={`filter-chip ${serviceTypeFilter === 'todos' ? 'active' : ''}`}
                    onClick={() => setServiceTypeFilter('todos')}
                  >
                    <BarChart3 size={16} /> Todos
                  </button>
                  <button 
                    className={`filter-chip ${serviceTypeFilter === 'recoleccion' ? 'active' : ''}`}
                    onClick={() => setServiceTypeFilter('recoleccion')}
                  >
                    <Truck size={16} /> Recolección
                  </button>
                  <button 
                    className={`filter-chip ${serviceTypeFilter === 'fumigacion' ? 'active' : ''}`}
                    onClick={() => setServiceTypeFilter('fumigacion')}
                  >
                    <Truck size={16} /> Fumigación
                  </button>
                </div>
              </div>
              <div className="map-container-modern">
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

            <div className="dashboard-grid-2col">
              <RealtimeActivity 
                vehicles={normalizedCamiones}
                routes={routes}
                personnel={personnel}
              />

              <RiskAlerts 
                alerts={alerts}
                onViewDetails={(alert) => {
                  setActiveTab('riesgos');
                }}
              />
            </div>
          </div>
        );
      case 'operaciones':
        return (
          <div className="operations-section">
            <div className="operations-tabs">
              <button 
                className={`ops-tab ${(!activeSubTab || activeSubTab === 'personal') ? 'ops-tab-active' : ''}`}
                onClick={() => setActiveSubTab('personal')}
              >
                <Users size={20} />
                <span>Personal</span>
              </button>
              <button 
                className={`ops-tab ${activeSubTab === 'flota' ? 'ops-tab-active' : ''}`}
                onClick={() => setActiveSubTab('flota')}
              >
                <Truck size={20} />
                <span>Flota</span>
              </button>
              <button 
                className={`ops-tab ${activeSubTab === 'rutas' ? 'ops-tab-active' : ''}`}
                onClick={() => setActiveSubTab('rutas')}
              >
                <Map size={20} />
                <span>Rutas</span>
              </button>
              <button 
                className={`ops-tab ${activeSubTab === 'programacion' ? 'ops-tab-active' : ''}`}
                onClick={() => setActiveSubTab('programacion')}
              >
                <Calendar size={20} />
                <span>Programación</span>
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