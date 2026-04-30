import { useState, useEffect, useMemo, useRef } from 'react';
import MapLibreComponent from '../../components/Map/MapLibreComponent';
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
import { ProjectSwitcher } from '../../components/Project';
import { OrganizationSwitcher } from '../../components/Organization';
import ProyectosComponent from '../../components/Proyectos';
import OrganizacionesComponent from '../../components/Organizaciones';
import { useOrganization } from '../../context/OrganizationContext';

import { usePersonnel } from '../../context/PersonnelContext';
import { useFleet } from '../../context/FleetContext';
import { useRoutes } from '../../context/RoutesContext';
import { useRiskReports } from '../../context/RiskReportsContext';
import { useCleaning } from '../../context/CleaningContext';
import { useAuth } from '../../context/AuthContext';
import { useDemoMode } from '../../hooks/useDemoMode';
import { useGeofenceAlerts } from '../../hooks/useGeofenceAlerts';
import { useMonitoringNotifications } from '../../hooks/useMonitoringNotifications';
import { useAction, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { DEMO_VEHICLES, DEMO_ROUTES, DEMO_PERSONNEL, DEMO_ALERTS, DEMO_RECENT_ACTIVITY, mergeDemoData } from '../../utils/demoData';
import {
  LayoutDashboard, Truck, AlertTriangle, Package,
  BarChart3, Users, Map, LogOut, TrendingUp, CheckCircle,
  MapPin, Radio, Activity, Zap, Bell, Wrench, Leaf, Navigation, Clock, Save, Calendar,
  Satellite, Briefcase, Sparkles, Plus, X, Maximize2, Minimize2, DollarSign,
  UserPlus, Shield, Lock, Mail, Phone, Target
} from '../../components/Icons';
import { Badge, ProgressBar } from '../../components/UI';
import { DashboardKPI, AlertCard, PersonnelTable, VehicleCard, HeroStats, RealtimeActivity, RiskAlerts, UpcomingRoutes } from '../../components/Dashboard';
import './AdminDashboard.css';

const AdminDashboard = ({ user, onLogout, userRole = 'admin' }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState('');
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 1025);
  const [monitoringSheetExpanded, setMonitoringSheetExpanded] = useState(false);
  const [monitoringSheetTab, setMonitoringSheetTab] = useState('activity');
  const [showMobileHeader, setShowMobileHeader] = useState(true);
  const headerTimeoutRef = useRef(null);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showAddPersonnelModal, setShowAddPersonnelModal] = useState(false);
  const [showEditPersonnelModal, setShowEditPersonnelModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
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
  const [personnelFormData, setPersonnelFormData] = useState({
    nombre: '',
    apellido: '',
    cargo: ''
  });

  // Responsive breakpoint listener
  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 1025);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const triggerShowHeader = () => {
    setShowMobileHeader(true);
    if (headerTimeoutRef.current) clearTimeout(headerTimeoutRef.current);
    headerTimeoutRef.current = setTimeout(() => setShowMobileHeader(false), 3000);
  };

  useEffect(() => {
    if (headerTimeoutRef.current) {
      clearTimeout(headerTimeoutRef.current);
      headerTimeoutRef.current = null;
    }
    if (isMobileView && activeTab === 'dashboard') {
      setShowMobileHeader(true);
      headerTimeoutRef.current = setTimeout(() => setShowMobileHeader(false), 3000);
    } else {
      setShowMobileHeader(true);
    }
    return () => {
      if (headerTimeoutRef.current) clearTimeout(headerTimeoutRef.current);
    };
  }, [isMobileView, activeTab]);

  // Org context (super_admin can switch / admin locked)
  const { currentOrgId, availableOrgs } = useOrganization();
  const isSuperAdmin = userRole === 'super_admin' || user?.tipo === 'super_admin';

  // Profile creation states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    email: '',
    password: '',
    nombre_completo: '',
    tipo_usuario: 'conductor',
    telefono: '',
    documento: '',
    organizacion_id: ''
  });
  const [profileStatus, setProfileStatus] = useState({ type: '', message: '' });
  const [creatingProfile, setCreatingProfile] = useState(false);

  // Route events from Convex
  const routeEvents = useQuery(api.route_events.getRecent, { limit: 50 }) || [];

  // Geofences and route progress (pass as props to MapComponent)
  const geofences = useQuery(api.geofences.list) || [];
  const allRouteProgress = useQuery(api.route_progress.list) || [];

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

  const { signOut, user: currentUser } = useAuth();

  // Convex action to create users via Clerk Backend API
  const createUserAction = useAction(api.perfiles.createUserWithClerk);

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

  // Convertir route_events de Convex al formato esperado por RealtimeActivity
  const recentActivity = useMemo(() => {
    if (isDemoMode) return DEMO_RECENT_ACTIVITY;

    return routeEvents.map((event, index) => ({
      id: event._id || `event-${index}`,
      tipo: event.tipo_evento,
      descripcion: (() => {
        switch (event.tipo_evento) {
          case 'ruta_iniciada':
            return `Ruta "${event.ruta_nombre}" iniciada`;
          case 'parada_llegada':
            return `Llegada a parada "${event.parada_nombre}"`;
          case 'parada_completada':
            return `Parada "${event.parada_nombre}" completada${event.categoria_carga ? ` (${event.categoria_carga})` : ''}`;
          case 'ruta_completada':
            return `Ruta "${event.ruta_nombre}" completada`;
          default:
            return event.detalles || 'Actividad registrada';
        }
      })(),
      vehiculo: event.vehiculo_placa,
      conductor: event.conductor_nombre,
      ruta: event.ruta_nombre,
      timestamp: event.timestamp,
    }));
  }, [isDemoMode, routeEvents]);

  // Normalizar vehículos (ya vienen con conductor_nombre y ruta_id desde Convex)
  const normalizedCamiones = useMemo(() => {
    return displayVehicles.map(camion => {
      // Normalizar tipoServicio para compatibilidad
      const tipoServicio = camion.tipoServicio || camion.tipo_servicio || 'recoleccion';

      return {
        ...camion,
        tipoServicio,
        id: camion._id || camion.id,
        // Aliases para compatibilidad con código existente
        conductor: camion.conductor_nombre,
        rutaAsignada: camion.ruta_id,
      };
    });
  }, [displayVehicles]);
  
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

  // Monitoring notifications (sounds + animation IDs)
  const { newEventIds, newAlertIds } = useMonitoringNotifications(recentActivity, displayAlerts);

  const isViewer = userRole === 'viewer' || user?.tipo === 'viewer';
  const VIEWER_ALLOWED_TABS = ['dashboard', 'operaciones', 'riesgos'];

  const handleTabChange = (newTab, defaultSubTab = '') => {
    if (isViewer && !VIEWER_ALLOWED_TABS.includes(newTab)) return;
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

  // Profile creation handlers
  const handleProfileInputChange = (field, value) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
    setProfileStatus({ type: '', message: '' });
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    setCreatingProfile(true);
    setProfileStatus({ type: '', message: '' });

    try {
      // Validate required fields
      if (!profileForm.email || !profileForm.password || !profileForm.nombre_completo) {
        setProfileStatus({
          type: 'error',
          message: 'Email, contraseña y nombre completo son requeridos'
        });
        setCreatingProfile(false);
        return;
      }

      // Validate password strength
      if (profileForm.password.length < 8) {
        setProfileStatus({
          type: 'error',
          message: 'La contraseña debe tener al menos 8 caracteres'
        });
        setCreatingProfile(false);
        return;
      }

      // Determinar organizacion_id según rol del que crea
      let orgIdToUse;
      if (profileForm.tipo_usuario === 'super_admin') {
        orgIdToUse = undefined;
      } else if (isSuperAdmin) {
        orgIdToUse = profileForm.organizacion_id || currentOrgId;
        if (!orgIdToUse) {
          setProfileStatus({
            type: 'error',
            message: 'Selecciona una organización para asignar al usuario',
          });
          setCreatingProfile(false);
          return;
        }
      } else {
        orgIdToUse = user?.organizacion_id;
        if (!orgIdToUse) {
          setProfileStatus({
            type: 'error',
            message: 'No tienes una organización asignada. Contacta al super_admin.',
          });
          setCreatingProfile(false);
          return;
        }
      }

      // Create user via Clerk Backend API (works even when logged in)
      await createUserAction({
        email: profileForm.email,
        password: profileForm.password,
        nombre_completo: profileForm.nombre_completo,
        tipo_usuario: profileForm.tipo_usuario,
        telefono: profileForm.telefono || undefined,
        documento: profileForm.documento || undefined,
        organizacion_id: orgIdToUse
      });

      setProfileStatus({
        type: 'success',
        message: `Perfil de ${profileForm.tipo_usuario} creado exitosamente`
      });

      // Close modal after 2 seconds
      setTimeout(() => {
        setShowProfileModal(false);
        setProfileForm({
          email: '',
          password: '',
          nombre_completo: '',
          tipo_usuario: 'conductor',
          telefono: '',
          documento: '',
          organizacion_id: ''
        });
        setProfileStatus({ type: '', message: '' });
      }, 2000);

    } catch (error) {
      console.error('Error creando perfil:', error);

      // Extract clean error message (remove all Convex technical details)
      let errorMsg = error.message || 'Error al crear el perfil. Verifica que el email no esté en uso.';

      // Remove [CONVEX] prefix, Request IDs, file paths, etc
      // Look for "Uncaught Error: " and extract everything after it until "at handler"
      const uncaughtMatch = errorMsg.match(/Uncaught Error: (.+?)(?:\s+at handler|$)/s);
      if (uncaughtMatch) {
        errorMsg = uncaughtMatch[1].trim();
      } else {
        // Fallback: try to extract after "Error: "
        const errorMatch = errorMsg.match(/Error: (.+?)(?:\s+at |$)/s);
        if (errorMatch) {
          errorMsg = errorMatch[1].trim();
        }
      }

      setProfileStatus({
        type: 'error',
        message: errorMsg
      });
    } finally {
      setCreatingProfile(false);
    }
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
              <div className="ops-header-buttons">
                <button
                  className="btn-add-personnel"
                  onClick={() => setShowAddPersonnelModal(true)}
                >
                  <Plus size={18} />
                  Agregar Personal
                </button>
                <button
                  className="btn-create-profile"
                  onClick={() => setShowProfileModal(true)}
                >
                  <UserPlus size={18} />
                  Crear Perfil
                </button>
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
                  setSelectedEmployee(employee);
                  setPersonnelFormData({
                    nombre: employee.nombre || '',
                    apellido: employee.apellido || '',
                    cargo: employee.cargo || ''
                  });
                  setShowEditPersonnelModal(true);
                }}
                onDelete={(employeeId) => {
                  if (window.confirm('¿Estás seguro de que quieres desactivar este empleado?')) {
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
            <RoutesComponent
              initialRoutes={displayRoutes}
              onRoutesChange={(updatedRoutes) => {
                console.log('Routes updated:', updatedRoutes);
              }}
            />
          </div>
        );
      case 'programacion':
        return (
          <div className="operations-content-modern">
            <ScheduleComponent viewerMode={isViewer} />
          </div>
        );
      default:
        return null;
    }
  };


  const renderContent = () => {
    // Viewer solo ve dashboard + operaciones + riesgos. Defensa en profundidad.
    if (isViewer && !VIEWER_ALLOWED_TABS.includes(activeTab)) {
      return null;
    }
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
        const personnelCount = displayPersonnel?.length || 0;
        const activeRoutesCount = displayRoutes.filter(r => r.estado === 'activa' || r.status === 'active').length;

        const heroStatsData = [
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
          }
        ];

        return (
          <div className="monitoring-layout">
            {/* Desktop: Side panel with KPIs, Activity, Alerts */}
            {!isMobileView && (
              <div className="monitoring-side-panel">
                <HeroStats stats={heroStatsData} />
                {userRole === 'enterprise' && <UpcomingRoutes limit={6} />}
                <RealtimeActivity
                  vehicles={normalizedCamiones}
                  routes={displayRoutes}
                  personnel={displayPersonnel}
                  recentActivity={recentActivity}
                  newEventIds={newEventIds}
                  onViewAll={() => setActiveTab('reportes')}
                />
                <RiskAlerts
                  alerts={displayAlerts}
                  onViewDetails={(alert) => {
                    setActiveTab('riesgos');
                  }}
                  onViewAll={() => setActiveTab('riesgos')}
                  newAlertIds={newAlertIds}
                />
              </div>
            )}

            {/* Map area - full height */}
            <div
              className="monitoring-map-area"
              onTouchStart={isMobileView ? triggerShowHeader : undefined}
              onClick={isMobileView ? triggerShowHeader : undefined}
            >
              <div className="map-section">
                <div className="monitoring-map-fabs">
                  <button
                    className="monitoring-fab"
                    onClick={() => {
                      const v = normalizedCamiones.find(c => c.gps_latitud && c.gps_longitud);
                      const lat = v?.gps_latitud || 8.983333;
                      const lng = v?.gps_longitud || -79.516670;
                      window.dispatchEvent(new CustomEvent('recenterMap', { detail: { lat, lng, zoom: 13 } }));
                    }}
                    title="Centrar mapa"
                  >
                    <MapPin size={16} />
                  </button>
                  <button
                    className="monitoring-fab"
                    onClick={() => setIsMapMaximized(true)}
                    title="Maximizar mapa"
                  >
                    <Maximize2 size={16} />
                  </button>
                  <button
                    className="monitoring-fab"
                    onClick={() => window.dispatchEvent(new CustomEvent('toggleGeofenceMode'))}
                    title="Crear zona de alerta (geofence)"
                  >
                    <Target size={16} />
                  </button>
                </div>
                <div className="map-container-modern">
                  <MapLibreComponent
                    key="map-main"
                    camiones={normalizedCamiones}
                    rutas={isViewer ? [] : (displayRoutes || [])}
                    personnel={isViewer ? [] : (displayPersonnel || [])}
                    lugares={isViewer ? [] : (lugares || [])}
                    geofences={isViewer ? [] : geofences}
                    allRouteProgress={isViewer ? [] : allRouteProgress}
                    userType={user.tipo}
                    showRealTime={true}
                    selectedTruck={selectedTruck}
                    onViewLocationReports={handleViewLocationReports}
                  />
                </div>
              </div>

            </div>

            {/* Mobile: Bottom sheet with tabbed Activity/Alerts */}
            {isMobileView && (
              <div className={`monitoring-bottom-sheet ${monitoringSheetExpanded ? 'expanded' : 'collapsed'}`}>
                <div
                  className="monitoring-sheet__handle"
                  onClick={() => setMonitoringSheetExpanded(!monitoringSheetExpanded)}
                >
                  <div className="handle-bar" />
                  <div className="monitoring-sheet__tabs">
                    <button
                      className={`sheet-tab ${monitoringSheetTab === 'activity' ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setMonitoringSheetTab('activity'); setMonitoringSheetExpanded(true); }}
                    >
                      Actividades
                    </button>
                    <button
                      className={`sheet-tab ${monitoringSheetTab === 'alerts' ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setMonitoringSheetTab('alerts'); setMonitoringSheetExpanded(true); }}
                    >
                      Alertas {displayAlerts.length > 0 && <span className="sheet-tab__badge">{displayAlerts.length}</span>}
                    </button>
                  </div>
                </div>
                <div className="monitoring-sheet__content">
                  {monitoringSheetTab === 'activity' ? (
                    <RealtimeActivity
                      vehicles={normalizedCamiones}
                      routes={displayRoutes}
                      personnel={displayPersonnel}
                      recentActivity={recentActivity}
                      newEventIds={newEventIds}
                      onViewAll={() => setActiveTab('reportes')}
                    />
                  ) : (
                    <RiskAlerts
                      alerts={displayAlerts}
                      onViewDetails={(alert) => {
                        setActiveTab('riesgos');
                      }}
                      onViewAll={() => setActiveTab('riesgos')}
                      newAlertIds={newAlertIds}
                    />
                  )}
                </div>
              </div>
            )}
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
        return userRole === 'admin' ? <CostosComponent /> : null;
      case 'proyectos':
        return (userRole === 'admin' || isSuperAdmin) ? <ProyectosComponent /> : null;
      case 'organizaciones':
        return isSuperAdmin ? <OrganizacionesComponent /> : null;
      default:
        return null;
    }
  };

  
  return (
    <div className={`dashboard-container${activeTab === 'dashboard' ? ' monitoring-active' : ''}${isMobileView && activeTab === 'dashboard' ? ' monitoring--map-fullscreen' : ''}`}>
      {/* Top App Bar - Header con logo y acciones */}
      <div className={`app-bar${isMobileView && activeTab === 'dashboard' && !showMobileHeader ? ' app-bar--hidden' : ''}`}>
        <div className="app-bar__header">
          <div className="app-bar__brand">
            <img src="/icons/modules/Logo principal.png" alt="RMP Logo" className="app-bar__logo" />
          </div>
          <div className="app-bar__actions">
            <OrganizationSwitcher />
            <ProjectSwitcher />
            <div className="app-bar__status">
              <Activity size={16} />
              <span>Sistema en Tiempo Real</span>
            </div>
            <button className="app-bar__logout" onClick={onLogout}>
              <LogOut size={18} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>

        {/* Top Navigation Tabs - Navegación horizontal */}
        <nav className="top-nav">
          <button
            className={`top-nav__tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleTabChange('dashboard')}
          >
            <LayoutDashboard strokeWidth={1.5} size={18} />
            <span>Monitoreo</span>
          </button>
          <button
            className={`top-nav__tab ${activeTab === 'operaciones' ? 'active' : ''}`}
            onClick={() => handleTabChange('operaciones', 'personal')}
          >
            <Truck strokeWidth={1.5} size={18} />
            <span>Operaciones</span>
          </button>
          <button
            className={`top-nav__tab ${activeTab === 'calendario' ? 'active' : ''} ${isViewer ? 'tab-locked' : ''}`}
            onClick={() => handleTabChange('calendario')}
            disabled={isViewer}
            title={isViewer ? 'Sección bloqueada para tu cuenta' : ''}
          >
            <Calendar strokeWidth={1.5} size={18} />
            <span>Calendario</span>
            {isViewer && <Lock strokeWidth={2} size={12} />}
          </button>
          <button
            className={`top-nav__tab ${activeTab === 'mantenimiento' ? 'active' : ''} ${isViewer ? 'tab-locked' : ''}`}
            onClick={() => handleTabChange('mantenimiento')}
            disabled={isViewer}
            title={isViewer ? 'Sección bloqueada para tu cuenta' : ''}
          >
            <Wrench strokeWidth={1.5} size={18} />
            <span>Mantenimiento</span>
            {isViewer && <Lock strokeWidth={2} size={12} />}
          </button>
          <button
            className={`top-nav__tab ${activeTab === 'riesgos' ? 'active' : ''}`}
            onClick={() => handleTabChange('riesgos')}
          >
            <AlertTriangle strokeWidth={1.5} size={18} />
            <span>Riesgos</span>
          </button>
          <button
            className={`top-nav__tab ${activeTab === 'inventario' ? 'active' : ''} ${isViewer ? 'tab-locked' : ''}`}
            onClick={() => handleTabChange('inventario')}
            disabled={isViewer}
            title={isViewer ? 'Sección bloqueada para tu cuenta' : ''}
          >
            <Package strokeWidth={1.5} size={18} />
            <span>Inventario</span>
            {isViewer && <Lock strokeWidth={2} size={12} />}
          </button>
          {userRole === 'admin' && (
            <button
              className={`top-nav__tab ${activeTab === 'costos' ? 'active' : ''}`}
              onClick={() => handleTabChange('costos')}
            >
              <DollarSign strokeWidth={1.5} size={18} />
              <span>Costos</span>
            </button>
          )}
          {(userRole === 'admin' || isSuperAdmin) && (
            <button
              className={`top-nav__tab ${activeTab === 'proyectos' ? 'active' : ''}`}
              onClick={() => handleTabChange('proyectos')}
            >
              <Briefcase strokeWidth={1.5} size={18} />
              <span>Proyectos</span>
            </button>
          )}
          {isSuperAdmin && (
            <button
              className={`top-nav__tab ${activeTab === 'organizaciones' ? 'active' : ''}`}
              onClick={() => handleTabChange('organizaciones')}
            >
              <Shield strokeWidth={1.5} size={18} />
              <span>Organizaciones</span>
            </button>
          )}
          <button
            className={`top-nav__tab ${activeTab === 'reportes' ? 'active' : ''} ${isViewer ? 'tab-locked' : ''}`}
            onClick={() => handleTabChange('reportes')}
            disabled={isViewer}
            title={isViewer ? 'Sección bloqueada para tu cuenta' : ''}
          >
            <BarChart3 strokeWidth={1.5} size={18} />
            <span>Reportes</span>
            {isViewer && <Lock strokeWidth={2} size={12} />}
          </button>
        </nav>
      </div>

      {/* Main Content Area */}
      <main className="main-content">
        {renderContent()}
      </main>

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
                <MapLibreComponent
                  key="map-maximized"
                  camiones={normalizedCamiones}
                  rutas={isViewer ? [] : (displayRoutes || [])}
                  personnel={isViewer ? [] : (displayPersonnel || [])}
                  lugares={isViewer ? [] : (lugares || [])}
                  geofences={isViewer ? [] : geofences}
                  allRouteProgress={isViewer ? [] : allRouteProgress}
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
                    recentActivity={recentActivity}
                    newEventIds={newEventIds}
                    onViewAll={() => { setIsMapMaximized(false); setActiveTab('reportes'); }}
                  />
                </div>

                <div className="map-floating-alerts">
                  <RiskAlerts
                    alerts={displayAlerts}
                    onViewDetails={(alert) => {
                      setIsMapMaximized(false);
                      setActiveTab('riesgos');
                    }}
                    onViewAll={() => { setIsMapMaximized(false); setActiveTab('riesgos'); }}
                    newAlertIds={newAlertIds}
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

      {/* Modal Agregar Personal */}
      {showAddPersonnelModal && (
        <div className="modal-overlay-v2" onClick={() => setShowAddPersonnelModal(false)}>
          <div className="modal-content-v2 modal-personnel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-v2">
              <h2>Agregar Nuevo Personal</h2>
              <button className="btn-close-v2" onClick={() => setShowAddPersonnelModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const dataToSubmit = {
                    nombre: personnelFormData.nombre,
                    apellido: personnelFormData.apellido,
                    cargo: personnelFormData.cargo,
                    cedula: `${Date.now()}` // Auto-generar cédula temporal
                  };
                  
                  await addEmployee(dataToSubmit);
                  setShowAddPersonnelModal(false);
                  setPersonnelFormData({
                    nombre: '',
                    apellido: '',
                    cargo: ''
                  });
                } catch (error) {
                  console.error('Error al agregar personal:', error);
                  alert('Error al agregar personal: ' + error.message);
                }
              }}
              className="modal-form-v2"
            >
              <div className="form-group-v2">
                <label>Nombre *</label>
                <input
                  type="text"
                  value={personnelFormData.nombre}
                  onChange={(e) => setPersonnelFormData({...personnelFormData, nombre: e.target.value})}
                  placeholder="Ej: Juan"
                  required
                />
              </div>

              <div className="form-group-v2">
                <label>Apellido *</label>
                <input
                  type="text"
                  value={personnelFormData.apellido}
                  onChange={(e) => setPersonnelFormData({...personnelFormData, apellido: e.target.value})}
                  placeholder="Ej: Pérez"
                  required
                />
              </div>

              <div className="form-group-v2">
                <label>Cargo *</label>
                <select
                  value={personnelFormData.cargo}
                  onChange={(e) => setPersonnelFormData({...personnelFormData, cargo: e.target.value})}
                  className="select-v2"
                  required
                >
                  <option value="">Seleccionar...</option>
                  <option value="Conductor">Conductor</option>
                  <option value="Recolector">Recolector</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Ayudante">Ayudante</option>
                  <option value="Administrativo">Administrativo</option>
                </select>
              </div>

              <div className="modal-actions-v2">
                <button type="button" className="btn-secondary-v2" onClick={() => setShowAddPersonnelModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary-v2">
                  <CheckCircle size={16} />
                  Crear Personal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Personal */}
      {showEditPersonnelModal && selectedEmployee && (
        <div className="modal-overlay-v2" onClick={() => setShowEditPersonnelModal(false)}>
          <div className="modal-content-v2 modal-personnel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-v2">
              <h2>Editar Personal</h2>
              <button className="btn-close-v2" onClick={() => setShowEditPersonnelModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const dataToSubmit = {
                    nombre: personnelFormData.nombre,
                    apellido: personnelFormData.apellido,
                    cargo: personnelFormData.cargo
                  };
                  
                  await updateEmployee(selectedEmployee._id, dataToSubmit);
                  setShowEditPersonnelModal(false);
                  setSelectedEmployee(null);
                  setPersonnelFormData({ nombre: '', apellido: '', cargo: '' });
                } catch (error) {
                  console.error('Error al actualizar personal:', error);
                  alert('Error al actualizar personal: ' + error.message);
                }
              }}
              className="modal-form-v2"
            >
              <div className="form-group-v2">
                <label>Nombre *</label>
                <input
                  type="text"
                  value={personnelFormData.nombre}
                  onChange={(e) => setPersonnelFormData({...personnelFormData, nombre: e.target.value})}
                  placeholder="Ej: Juan"
                  required
                />
              </div>

              <div className="form-group-v2">
                <label>Apellido *</label>
                <input
                  type="text"
                  value={personnelFormData.apellido}
                  onChange={(e) => setPersonnelFormData({...personnelFormData, apellido: e.target.value})}
                  placeholder="Ej: Pérez"
                  required
                />
              </div>

              <div className="form-group-v2">
                <label>Cargo *</label>
                <select
                  value={personnelFormData.cargo}
                  onChange={(e) => setPersonnelFormData({...personnelFormData, cargo: e.target.value})}
                  className="select-v2"
                  required
                >
                  <option value="">Seleccionar...</option>
                  <option value="Conductor">Conductor</option>
                  <option value="Recolector">Recolector</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Ayudante">Ayudante</option>
                  <option value="Administrativo">Administrativo</option>
                </select>
              </div>

              <div className="modal-actions-v2">
                <button type="button" className="btn-secondary-v2" onClick={() => setShowEditPersonnelModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary-v2">
                  <CheckCircle size={16} />
                  Actualizar Personal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Creation Modal */}
      {showProfileModal && (
        <div className="modal-overlay-v2" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content-v2 modal-profile" onClick={e => e.stopPropagation()}>
            <div className="modal-header-v2">
              <div className="modal-header-title">
                <Shield size={24} />
                <h2>Crear Perfil de Usuario</h2>
              </div>
              <button className="btn-close-v2" onClick={() => setShowProfileModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProfile} className="modal-form-v2">
              {/* Status Message */}
              {profileStatus.message && (
                <div className={`profile-status ${profileStatus.type}`}>
                  {profileStatus.type === 'success' ? <CheckCircle size={16} /> : <X size={16} />}
                  <span>{profileStatus.message}</span>
                </div>
              )}

              <div className="form-divider-v2">
                <Mail size={16} />
                Credenciales de Acceso
              </div>

              <div className="form-group-v2">
                <label>Email *</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => handleProfileInputChange('email', e.target.value)}
                  placeholder="usuario@rmp.com"
                  required
                  disabled={creatingProfile}
                />
              </div>

              <div className="form-group-v2">
                <label>Contraseña *</label>
                <input
                  type="password"
                  value={profileForm.password}
                  onChange={(e) => handleProfileInputChange('password', e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  disabled={creatingProfile}
                  minLength={8}
                />
                <small className="form-hint">
                  Debe contener mayúsculas, minúsculas, números y símbolos
                </small>
              </div>

              <div className="form-divider-v2">
                <Users size={16} />
                Información Personal
              </div>

              <div className="form-group-v2">
                <label>Nombre Completo *</label>
                <input
                  type="text"
                  value={profileForm.nombre_completo}
                  onChange={(e) => handleProfileInputChange('nombre_completo', e.target.value)}
                  placeholder="Ej: Juan Carlos Pérez"
                  required
                  disabled={creatingProfile}
                />
              </div>

              <div className="form-group-v2">
                <label>Tipo de Usuario *</label>
                <select
                  value={profileForm.tipo_usuario}
                  onChange={(e) => handleProfileInputChange('tipo_usuario', e.target.value)}
                  className="select-v2"
                  required
                  disabled={creatingProfile}
                >
                  <option value="conductor">Conductor</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="admin">Administrador</option>
                  {isSuperAdmin && <option value="super_admin">Super Admin (global)</option>}
                </select>
              </div>

              {isSuperAdmin && profileForm.tipo_usuario !== 'super_admin' && (
                <div className="form-group-v2">
                  <label>Organización *</label>
                  <select
                    value={profileForm.organizacion_id || currentOrgId || ''}
                    onChange={(e) => handleProfileInputChange('organizacion_id', e.target.value)}
                    className="select-v2"
                    required
                    disabled={creatingProfile}
                  >
                    <option value="">Selecciona organización</option>
                    {availableOrgs.map((o) => (
                      <option key={o._id} value={o._id}>{o.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-row-v2">
                <div className="form-group-v2">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    value={profileForm.telefono}
                    onChange={(e) => handleProfileInputChange('telefono', e.target.value)}
                    placeholder="+507 6123-4567"
                    disabled={creatingProfile}
                  />
                </div>

                <div className="form-group-v2">
                  <label>Documento / Cédula</label>
                  <input
                    type="text"
                    value={profileForm.documento}
                    onChange={(e) => handleProfileInputChange('documento', e.target.value)}
                    placeholder="8-123-4567"
                    disabled={creatingProfile}
                  />
                </div>
              </div>

              <div className="modal-actions-v2">
                <button
                  type="button"
                  className="btn-secondary-v2"
                  onClick={() => setShowProfileModal(false)}
                  disabled={creatingProfile}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary-v2"
                  disabled={creatingProfile}
                >
                  {creatingProfile ? (
                    <>
                      <div className="spinner-small"></div>
                      Creando...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Crear Perfil
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;