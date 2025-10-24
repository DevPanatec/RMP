import { useState, useEffect, useMemo } from 'react';
import MapComponent from '../../components/Map/MapComponent';
import PersonnelComponent from '../../components/Personnel/PersonnelComponent';
import InventoryComponent from '../../components/Inventory/InventoryComponent';
import RoutesComponent from '../../components/Routes/RoutesComponent';
import RiskComponent from '../../components/Risk/RiskComponent';
import ReportsComponent from '../../components/Reports/ReportsComponent';
import ScheduleComponent from '../../components/Schedule/ScheduleComponent';
import FleetManagement from '../../components/Fleet/FleetManagement';
import CalendarComponent from '../../components/Calendar/CalendarComponent';
import MaintenanceComponent from '../../components/Maintenance/MaintenanceComponent';
import { useSupabasePersonnel } from '../../context/SupabasePersonnelContext';
import { useSupabaseFleet } from '../../context/SupabaseFleetContext';
import { useSupabaseRoutes } from '../../context/SupabaseRoutesContext';
import { useSupabaseRiskReports } from '../../context/SupabaseRiskReportsContext';
import { useSupabaseCleaning } from '../../context/SupabaseCleaningContext';
import { useDemoMode } from '../../hooks/useDemoMode';
import { DEMO_VEHICLES, DEMO_ROUTES, DEMO_PERSONNEL, DEMO_ALERTS, DEMO_RECENT_ACTIVITY, mergeDemoData } from '../../utils/demoData';
import {
  LayoutDashboard, Truck, AlertTriangle, Package,
  BarChart3, Users, Map, LogOut, TrendingUp, CheckCircle,
  MapPin, Radio, Activity, Zap, Bell, Wrench, Leaf, Navigation, Clock, Save, Calendar,
  Satellite, Briefcase, Sparkles, Plus
} from '../../components/Icons';
import { Badge, ProgressBar } from '../../components/UI';
import { DashboardKPI, AlertCard, PersonnelTable, VehicleCard, HeroStats, RealtimeActivity, RiskAlerts } from '../../components/Dashboard';
import './EnterpriseDashboard.css';

const EnterpriseDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState('');
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [serviceTypeFilter, setServiceTypeFilter] = useState('todos');
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [vehicleFormData, setVehicleFormData] = useState({
    nombre: '',
    placa: '',
    marca: '',
    modelo: '',
    año: new Date().getFullYear(),
    tipoServicio: 'recoleccion'
  });

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
    getFleetStats
  } = useSupabaseFleet();

  const {
    routes,
    loading: routesLoading,
    getRoutesStats
  } = useSupabaseRoutes();

  const {
    reports: alerts,
    loading: alertsLoading,
    addReport: addAlert,
    updateReportStatus: updateAlert,
    deleteReport: deleteAlert,
    getReportStats: getAlertsStats
  } = useSupabaseRiskReports();

  const {
    lugares,
    loading: lugaresLoading
  } = useSupabaseCleaning();

  // Hook de modo demo
  const { isDemoMode, toggleDemoMode } = useDemoMode();

  // Mezclar datos reales con datos demo cuando el modo demo está activo
  const displayVehicles = useMemo(() => {
    return isDemoMode ? mergeDemoData(vehicles, DEMO_VEHICLES) : vehicles;
  }, [isDemoMode, vehicles]);

  const displayRoutes = useMemo(() => {
    return isDemoMode ? mergeDemoData(routes, DEMO_ROUTES) : routes;
  }, [isDemoMode, routes]);

  const displayPersonnel = useMemo(() => {
    return isDemoMode ? mergeDemoData(personnel, DEMO_PERSONNEL) : personnel;
  }, [isDemoMode, personnel]);

  const displayAlerts = useMemo(() => {
    return isDemoMode ? mergeDemoData(alerts, DEMO_ALERTS) : alerts;
  }, [isDemoMode, alerts]);

  // Usar datos reales o demo según el modo activo
  const normalizedCamiones = displayVehicles.map(camion => (
    camion.tipoServicio ? camion : { ...camion, tipoServicio: 'recoleccion' }
  ));

  // Obtener estadísticas - valores fijos para presentación
  const personnelStats = {
    total: 16,
    activos: 14,
    conductores: 8,
    tecnicos: 6,
    supervisores: 2
  };

  const fleetStats = {
    total: 13,
    enRuta: 5,
    disponibles: 8,
    mantenimiento: 0
  };

  const routesStats = {
    total: 5,
    activas: 3,
    completadas: 2,
    programadas: 0
  };

  // Calcular estadísticas operativas basadas en datos activos (reales o demo)
  const operationalStats = useMemo(() => {
    const defaultStats = {
      eficienciaPromedio: 85,
      totalKgHoy: 0
    };

    if (!displayVehicles || displayVehicles.length === 0) return defaultStats;

    return {
      eficienciaPromedio: 85,
      totalKgHoy: displayVehicles.reduce((total, vehicle) => total + (vehicle.capacidad_carga || 0), 0)
    };
  }, [displayVehicles]);

  const handleTabChange = (newTab, defaultSubTab = '') => {
    setActiveTab(newTab);
    setActiveSubTab(defaultSubTab);
  };

  const handleViewLocationReports = (locationId) => {
    setSelectedLocationId(locationId);
    handleTabChange('reportes');
  };

  const handleClearLocationSelection = () => {
    setSelectedLocationId(null);
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
          <div className="operations-content-modern">
            <div className="ops-header">
              <div className="ops-header-content">
                <h2><Users size={24} /> Gestión de Personal</h2>
                <p>Gestiona tu equipo de trabajo, conductores y personal operativo</p>
              </div>
            </div>
            <PersonnelComponent userType={user.tipo} />
          </div>
        );

      case 'flota':
        return (
          <div className="operations-content-modern">
            <div className="ops-header">
              <div className="ops-header-content">
                <h2><Truck size={24} /> Gestión de Flota</h2>
                <p>Administra todos los vehículos de la flota</p>
              </div>
            </div>
            <FleetManagement userType={user.tipo} />
          </div>
        );

      case 'rutas':
        return (
          <div className="operations-content-modern">
            <div className="ops-header">
              <div className="ops-header-content">
                <h2><MapPin size={24} /> Gestión de Rutas</h2>
                <p>Crea y gestiona las rutas de recolección</p>
              </div>
            </div>
            <RoutesComponent userType={user.tipo} />
          </div>
        );

      case 'programacion':
        return (
          <div className="operations-content-modern">
            <div className="ops-header">
              <div className="ops-header-content">
                <h2><Clock size={24} /> Asignación</h2>
                <p>Asigna rutas a conductores y vehículos</p>
              </div>
            </div>
            <ScheduleComponent userType={user.tipo} />
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
            icon: <Truck strokeWidth={1.5} size={32} />,
            value: fleetStats.total,
            label: 'Total Vehículos',
            color: 'linear-gradient(135deg, #30d158 0%, #34c759 100%)'
          },
          {
            id: 'active',
            icon: <TrendingUp strokeWidth={1.5} size={32} />,
            value: fleetStats.enRuta,
            label: 'En Ruta',
            color: 'linear-gradient(135deg, #ff9500 0%, #ffb800 100%)'
          },
          {
            id: 'personnel',
            icon: <Briefcase strokeWidth={1.5} size={32} />,
            value: personnelStats.total,
            label: 'Personal',
            color: 'linear-gradient(135deg, #007aff 0%, #4da3ff 100%)'
          },
          {
            id: 'routes',
            icon: <MapPin strokeWidth={1.5} size={32} />,
            value: routesStats.activas,
            label: 'Rutas Activas',
            color: 'linear-gradient(135deg, #00d4ff 0%, #0091ff 100%)'
          }
        ];

        return (
          <div className="dashboard-content">
            <HeroStats stats={heroStatsData} />

            <div className="dashboard-grid">
              <div className="dashboard-section dashboard-section-map">
                <div className="section-header-inline">
                  <div className="section-title">
                    <h3><Map size={20} /> Mapa en Tiempo Real</h3>
                    <p>Monitorea tu flota en vivo</p>
                  </div>
                  <div className="filter-controls">
                    <select
                      value={serviceTypeFilter}
                      onChange={(e) => setServiceTypeFilter(e.target.value)}
                      className="service-filter-select"
                    >
                      <option value="todos">Todos los servicios</option>
                      <option value="recoleccion">Recolección</option>
                      <option value="fumigacion">Fumigación</option>
                      <option value="limpieza">Limpieza</option>
                    </select>
                  </div>
                </div>
                <div className="map-container-dashboard">
                  <MapComponent
                    camiones={normalizedCamiones}
                    lugares={lugares || []}
                    userType={user.tipo}
                    selectedTruck={selectedTruck}
                    serviceTypeFilter={serviceTypeFilter}
                    onViewLocationReports={handleViewLocationReports}
                  />
                </div>
              </div>

              <div className="dashboard-section dashboard-section-activity">
                <RealtimeActivity
                  activities={isDemoMode ? DEMO_RECENT_ACTIVITY : []}
                />
              </div>
            </div>

            <RiskAlerts
              alerts={displayAlerts}
              onViewAll={() => handleTabChange('riesgos')}
            />
          </div>
        );

      case 'operaciones':
        return renderOperationsContent();

      case 'calendario':
        return <CalendarComponent userType={user.tipo} />;
      case 'mantenimiento':
        return <MaintenanceComponent userType={user.tipo} />;
      case 'riesgos':
        return <RiskComponent userType={user.tipo} />;
      case 'inventario':
        return <InventoryComponent userType={user.tipo} />;
      case 'reportes':
        return (
          <ReportsComponent
            userType={user.tipo}
            preSelectedLocationId={selectedLocationId}
            onClearSelection={handleClearLocationSelection}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/icons/modules/Logo principal.png" alt="RMP Logo" className="logo-image" />
          </div>
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
                <Briefcase size={18} /> Operaciones
              </button>
              {activeTab === 'operaciones' && (
                <ul className="submenu">
                  <li>
                    <button
                      className={activeSubTab === 'personal' ? 'active' : ''}
                      onClick={() => setActiveSubTab('personal')}
                    >
                      <Users size={16} /> Personal
                    </button>
                  </li>
                  <li>
                    <button
                      className={activeSubTab === 'flota' ? 'active' : ''}
                      onClick={() => setActiveSubTab('flota')}
                    >
                      <Truck size={16} /> Flota
                    </button>
                  </li>
                  <li>
                    <button
                      className={activeSubTab === 'rutas' ? 'active' : ''}
                      onClick={() => setActiveSubTab('rutas')}
                    >
                      <MapPin size={16} /> Rutas
                    </button>
                  </li>
                  <li>
                    <button
                      className={activeSubTab === 'programacion' ? 'active' : ''}
                      onClick={() => setActiveSubTab('programacion')}
                    >
                      <Clock size={16} /> Asignación
                    </button>
                  </li>
                </ul>
              )}
            </li>
            <li>
              <button
                className={activeTab === 'calendario' ? 'active' : ''}
                onClick={() => handleTabChange('calendario')}
              >
                <Calendar size={18} /> Calendario
              </button>
            </li>
            <li>
              <button
                className={activeTab === 'mantenimiento' ? 'active' : ''}
                onClick={() => handleTabChange('mantenimiento')}
              >
                <Wrench size={18} /> Mantenimiento
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
          <h1><Briefcase size={24} /> Panel Enterprise</h1>
          <div className="header-actions">
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

export default EnterpriseDashboard;
