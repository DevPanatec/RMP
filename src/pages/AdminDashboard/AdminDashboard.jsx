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
import CostosComponent from '../../components/Costos/CostosComponent';
import GeofenceAlertPopup from '../../components/GeofenceAlert/GeofenceAlertPopup';

import { usePersonnel } from '../../context/PersonnelContext';
import { useFleet } from '../../context/FleetContext';
import { useRoutes } from '../../context/RoutesContext';
import { useRiskReports } from '../../context/RiskReportsContext';
import { useCleaning } from '../../context/CleaningContext';
import { useDemoMode } from '../../hooks/useDemoMode';
import { useGeofenceAlerts } from '../../hooks/useGeofenceAlerts';
import { DEMO_VEHICLES, DEMO_ROUTES, DEMO_PERSONNEL, DEMO_ALERTS, DEMO_RECENT_ACTIVITY, mergeDemoData } from '../../utils/demoData';
import {
  LayoutDashboard, Truck, AlertTriangle, Package,
  BarChart3, Users, Map, LogOut, TrendingUp, CheckCircle,
  MapPin, Radio, Activity, Zap, Bell, Wrench, Leaf, Navigation, Clock, Save, Calendar,
  Satellite, Briefcase, Sparkles, Plus, X, Maximize2, Minimize2, DollarSign
} from '../../components/Icons';
import { Badge, ProgressBar } from '../../components/UI';
import { DashboardKPI, AlertCard, PersonnelTable, VehicleCard, HeroStats, RealtimeActivity, RiskAlerts } from '../../components/Dashboard';
import './AdminDashboard.css';

const AdminDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState('');
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [isMapMaximized, setIsMapMaximized] = useState(false);
  const [vehicleFormData, setVehicleFormData] = useState({
    nombre: '',
    placa: '',
    marca: '',
    modelo: '',
    anio: new Date().getFullYear(),
    tipo_servicio: 'recoleccion',
    gps_imei: '',
    gps_protocolo: 'GT06'
  });
  
  // Hooks de contextos reales
  const {
    personnel,
    loading: personnelLoading,
    moveEmployee,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    getPersonnelStats,
    getAllEmployees
  } = usePersonnel();

  const {
    vehicles,
    loading: fleetLoading,
    updateVehicle,
    addVehicle,
    deleteVehicle,
    getFleetStats
  } = useFleet();

  const {
    routes,
    loading: routesLoading,
    getRoutesStats
  } = useRoutes();

  const {
    reports: alerts,
    loading: alertsLoading,
    addReport: addAlert,
    updateReportStatus: updateAlert,
    deleteReport: deleteAlert,
    getReportStats: getAlertsStats
  } = useRiskReports();

  // Hook de alertas de geofence
  const { 
    activeAlerts: geofenceAlerts, 
    dismissAlert: dismissGeofenceAlert, 
    viewOnMap: viewGeofenceOnMap,
    hasActiveAlerts: hasGeofenceAlerts 
  } = useGeofenceAlerts();

  const {
    lugares,
    loading: lugaresLoading
  } = useCleaning();

  // Hook de modo demo
  const { isDemoMode, toggleDemoMode } = useDemoMode();

  // En modo demo, usar SOLO datos demo de vehículos (sin mezclar con Supabase)
  const displayVehicles = useMemo(() => {
    return vehicles;
  }, [vehicles]);

  const displayRoutes = useMemo(() => {
    return isDemoMode ? DEMO_ROUTES : routes;
  }, [isDemoMode, routes]);

  const displayPersonnel = useMemo(() => {
    // Convertir objeto de turnos a array plano
    const allEmployees = getAllEmployees();
    return isDemoMode ? DEMO_PERSONNEL : allEmployees;
  }, [isDemoMode, getAllEmployees]);

  const displayAlerts = useMemo(() => {
    return isDemoMode ? mergeDemoData(alerts, DEMO_ALERTS) : alerts;
  }, [isDemoMode, alerts]);

  // Usar datos reales o demo según el modo activo
  const normalizedCamiones = displayVehicles.map(camion => {
    // Normalizar tipoServicio
    const normalized = camion.tipoServicio ? camion : { ...camion, tipoServicio: 'recoleccion' };

    // Transformar coordenadas GPS de Convex (gps_latitud/gps_longitud) a formato mapa (lat/lng)
    if (normalized.gps_latitud !== undefined && normalized.gps_longitud !== undefined) {
      return {
        ...normalized,
        lat: normalized.gps_latitud,
        lng: normalized.gps_longitud,
        id: normalized._id || normalized.id,
        placa: normalized.placa || normalized.id,
      };
    }

    return normalized;
  });
  
  // Obtener estadísticas reales
  const personnelStats = getPersonnelStats();
  const fleetStats = getFleetStats();
  const routesStats = getRoutesStats();

  // Calcular estadísticas operativas basadas en datos activos (reales o demo)
  const operationalStats = useMemo(() => {
    const defaultStats = {
      eficienciaPromedio: 85,
      totalKgHoy: 0
    };

    if (!displayVehicles || displayVehicles.length === 0) return defaultStats;

    return {
      eficienciaPromedio: 85, // Se puede calcular basado en rutas completadas
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
                <Briefcase strokeWidth={1.5} size={26} className="ops-header-icon" />
                <div className="ops-header-text">
                  <h2>Gestión de Personal</h2>
                  <p>Administra conductores, ayudantes y supervisores</p>
                </div>
              </div>
              <div className="ops-header-stats">
                <div className="stat-pill">
                  <span className="stat-value">{displayPersonnel?.filter(p => p.active === true).length || 0}</span>
                  <span className="stat-label">Activos</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-value">{displayPersonnel?.filter(p => p.puesto?.includes('Supervisor')).length || 0}</span>
                  <span className="stat-label">Supervisores</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-value">{displayPersonnel?.filter(p => p.puesto === 'Conductor').length || 0}</span>
                  <span className="stat-label">Conductores</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-value">{displayPersonnel?.filter(p => p.puesto === 'Recolector').length || 0}</span>
                  <span className="stat-label">Recolectores</span>
                </div>
              </div>
            </div>
            <div className="ops-content-wrapper">
              <PersonnelTable
                personnel={displayPersonnel}
                onEdit={(employee) => {
                  console.log('Edit employee:', employee);
                }}
                onDelete={(employeeId) => {
                  if (window.confirm('¿Estás seguro de que quieres eliminar este empleado?')) {
                    deleteEmployee(employeeId);
                  }
                }}
                currentPage={1}
                totalPages={Math.ceil((displayPersonnel?.length || 0) / 8)}
                onPageChange={(page) => {
                  console.log('Page change:', page);
                }}
              />
            </div>
          </div>
        );
      case 'flota':
        return <FleetManagement />;

      case 'rutas':
        return (
          <div className="operations-content-modern">
            <div className="ops-header">
              <div className="ops-header-content">
                <MapPin strokeWidth={1.5} size={26} className="ops-header-icon" />
                <div className="ops-header-text">
                  <h2>Gestión de Rutas</h2>
                  <p>Define y administra plantillas de rutas</p>
                </div>
              </div>
              <div className="ops-header-stats">
                <div className="stat-pill">
                  <span className="stat-value">{isDemoMode ? 6 : displayRoutes.filter(r => r.tipo_servicio === 'recoleccion').length}</span>
                  <span className="stat-label">Recolección</span>
                </div>
                <div className="stat-pill info">
                  <span className="stat-value">{isDemoMode ? 6 : displayRoutes.filter(r => r.tipo_servicio === 'fumigacion').length}</span>
                  <span className="stat-label">Fumigación</span>
                </div>
              </div>
            </div>

            <div className="ops-content-wrapper">
              <RoutesComponent
                initialRoutes={displayRoutes}
                onRoutesChange={(updatedRoutes) => {
                  console.log('Routes updated:', updatedRoutes);
                }}
              />
            </div>
          </div>
        );
      case 'programacion':
        return (
          <div className="operations-content-modern">
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
        // Generate sparkline data (last 14 data points for trend visualization)
        const generateSparklineData = (baseValue, variance = 0.15) => {
          const dataPoints = 14;
          return Array.from({ length: dataPoints }, (_, i) => {
            const randomVariance = (Math.random() - 0.5) * variance * baseValue;
            const trendFactor = (i / dataPoints) * 0.1 * baseValue; // slight upward trend
            return Math.max(0, Math.round(baseValue + randomVariance + trendFactor));
          });
        };

        const vehicleCount = normalizedCamiones.length;
        const activeCount = normalizedCamiones.filter(c => c.estado === 'En ruta' || c.estado === 'en_ruta').length;
        const personnelCount = 16;
        const activeRoutesCount = displayRoutes.filter(r => r.estado === 'activa' || r.status === 'active').length;

        const heroStatsData = [
          {
            id: 'vehicles',
            icon: <Truck strokeWidth={1.5} size={24} />,
            value: vehicleCount,
            label: 'Total Vehículos',
            sparklineData: generateSparklineData(vehicleCount, 0.1)
          },
          {
            id: 'active',
            icon: <TrendingUp strokeWidth={1.5} size={24} />,
            value: activeCount,
            label: 'En Ruta',
            sparklineData: generateSparklineData(activeCount, 0.25)
          },
          {
            id: 'personnel',
            icon: <Briefcase strokeWidth={1.5} size={24} />,
            value: personnelCount,
            label: 'Personal',
            sparklineData: generateSparklineData(personnelCount, 0.05)
          },
          {
            id: 'routes',
            icon: <MapPin strokeWidth={1.5} size={24} />,
            value: activeRoutesCount,
            label: 'Rutas Activas',
            sparklineData: generateSparklineData(activeRoutesCount, 0.2)
          }
        ];

        return (
          <div className="dashboard-content">
            <HeroStats stats={heroStatsData} />
            
            <div className="map-section">
              <div className="map-header">
                <h3><Satellite strokeWidth={2} size={20} /> Monitoreo GPS</h3>
                <button
                  className="maximize-btn"
                  onClick={() => setIsMapMaximized(true)}
                  title="Maximizar mapa"
                >
                  <Maximize2 size={18} />
                </button>
              </div>
              <div
                className="map-container-modern"
                ref={(el) => {
                  if (el) {
                    const observer = new IntersectionObserver(
                      (entries) => {
                        entries.forEach((entry) => {
                          if (entry.isIntersecting) {
                            entry.target.classList.add('scroll-reveal');
                            observer.unobserve(entry.target);
                          }
                        });
                      },
                      { threshold: 0.2 }
                    );
                    observer.observe(el);
                  }
                }}
              >
                <MapComponent
                  key="map-main"
                  camiones={normalizedCamiones}
                  rutas={displayRoutes || []}
                  personnel={displayPersonnel || []}
                  lugares={lugares || []}
                  userType={user.tipo}
                  showRealTime={true}
                  selectedTruck={selectedTruck}
                  onViewLocationReports={handleViewLocationReports}
                />
              </div>
            </div>

            <div className="dashboard-grid-2col">
              <RealtimeActivity
                vehicles={normalizedCamiones}
                routes={displayRoutes}
                personnel={displayPersonnel}
                recentActivity={isDemoMode ? DEMO_RECENT_ACTIVITY : []}
              />

              <RiskAlerts
                alerts={displayAlerts}
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
                <Briefcase strokeWidth={1.5} size={20} />
                <span>Personal</span>
              </button>
              <button 
                className={`ops-tab ${activeSubTab === 'flota' ? 'ops-tab-active' : ''}`}
                onClick={() => setActiveSubTab('flota')}
              >
                <Truck strokeWidth={1.5} size={20} />
                <span>Flota</span>
              </button>
              <button 
                className={`ops-tab ${activeSubTab === 'rutas' ? 'ops-tab-active' : ''}`}
                onClick={() => setActiveSubTab('rutas')}
              >
                <MapPin strokeWidth={1.5} size={20} />
                <span>Rutas</span>
              </button>
              <button
                className={`ops-tab ${activeSubTab === 'programacion' ? 'ops-tab-active' : ''}`}
                onClick={() => setActiveSubTab('programacion')}
              >
                <Calendar strokeWidth={1.5} size={20} />
                <span>Asignación</span>
              </button>
            </div>
            {renderOperationsContent()}
          </div>
        );
      case 'calendario':
        return <CalendarComponent />;
      case 'mantenimiento':
        return <MaintenanceComponent userRole={user.tipo} />;
      case 'riesgos':
        return <RiskComponent userType={user.tipo} />;
      case 'inventario':
        return <InventoryComponent userType={user.tipo} />;
      case 'reportes':
        return <ReportsComponent userType={user.tipo} preSelectedLocationId={selectedLocationId} onClearSelection={handleClearLocationSelection} />;
      case 'costos':
        return <CostosComponent />;
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
          <p>Bienvenido, Administrador del Sistema</p>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li>
              <button
                className={activeTab === 'dashboard' ? 'active' : ''}
                onClick={() => handleTabChange('dashboard')}
              >
                <LayoutDashboard strokeWidth={1.5} size={18} /> Monitoreo
              </button>
            </li>
            <li>
              <button
                className={activeTab === 'operaciones' ? 'active' : ''}
                onClick={() => handleTabChange('operaciones', 'personal')}
              >
                <Truck strokeWidth={1.5} size={18} /> Operaciones
              </button>
            </li>
            <li>
              <button
                className={activeTab === 'calendario' ? 'active' : ''}
                onClick={() => handleTabChange('calendario')}
              >
                <Calendar strokeWidth={1.5} size={18} /> Calendario
              </button>
            </li>
            <li>
              <button
                className={activeTab === 'mantenimiento' ? 'active' : ''}
                onClick={() => handleTabChange('mantenimiento')}
              >
                <Wrench strokeWidth={1.5} size={18} /> Mantenimiento
              </button>
            </li>
            <li>
              <button
                className={activeTab === 'riesgos' ? 'active' : ''}
                onClick={() => handleTabChange('riesgos')}
              >
                <AlertTriangle strokeWidth={1.5} size={18} /> Riesgos
              </button>
            </li>
            <li>
              <button
                className={activeTab === 'inventario' ? 'active' : ''}
                onClick={() => handleTabChange('inventario')}
              >
                <Package strokeWidth={1.5} size={18} /> Inventario
              </button>
            </li>
            <li>
              <button
                className={activeTab === 'costos' ? 'active' : ''}
                onClick={() => handleTabChange('costos')}
              >
                <DollarSign strokeWidth={1.5} size={18} /> Costos
              </button>
            </li>

            <li>
              <button
                className={activeTab === 'reportes' ? 'active' : ''}
                onClick={() => handleTabChange('reportes')}
              >
                <BarChart3 strokeWidth={1.5} size={18} /> Reportes
              </button>
            </li>
          </ul>
        </nav>
      </div>
      <div className="main-content">
        <div className="dashboard-header">
          <h1><Leaf strokeWidth={1.5} size={24} /> Panel de Administración</h1>
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

      {/* Modal de Mapa Maximizado */}
      {isMapMaximized && (
        <div className="map-maximized-overlay" onClick={() => setIsMapMaximized(false)}>
          <div className="map-maximized-container" onClick={(e) => e.stopPropagation()}>
            <div className="map-maximized-header">
              <div className="map-maximized-title">
                <Satellite size={24} />
                <h2>Monitoreo GPS en Tiempo Real</h2>
              </div>
              <button
                className="minimize-btn"
                onClick={() => setIsMapMaximized(false)}
                title="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <div className="map-maximized-content">
              <div className="map-maximized-map-wrapper">
                <MapComponent
                  key="map-maximized"
                  camiones={normalizedCamiones}
                  rutas={displayRoutes || []}
                  personnel={displayPersonnel || []}
                  lugares={lugares || []}
                  userType={user.tipo}
                  showRealTime={true}
                  selectedTruck={selectedTruck}
                  onViewLocationReports={handleViewLocationReports}
                  isMaximized={true}
                />
              </div>

              {/* Notificaciones flotantes */}
              <div className="map-floating-notifications">
                <div className="map-floating-activity">
                  <RealtimeActivity
                    vehicles={normalizedCamiones}
                    routes={displayRoutes}
                    personnel={displayPersonnel}
                    recentActivity={isDemoMode ? DEMO_RECENT_ACTIVITY : []}
                  />
                </div>

                <div className="map-floating-alerts">
                  <RiskAlerts
                    alerts={displayAlerts}
                    onViewDetails={(alert) => {
                      setIsMapMaximized(false);
                      setActiveTab('riesgos');
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alertas de Geofence - Pop-ups flotantes */}
      {hasGeofenceAlerts && (
        <GeofenceAlertPopup
          alerts={geofenceAlerts}
          onDismiss={dismissGeofenceAlert}
          onViewMap={viewGeofenceOnMap}
        />
      )}
    </div>
  );
};

export default AdminDashboard;