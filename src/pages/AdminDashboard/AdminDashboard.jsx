import { useState, useEffect, useMemo, useRef } from 'react';
import MapLibreComponent from '../../components/Map/MapLibreComponent';
import RoutesComponent from '../../components/Routes/RoutesComponent';
import ServiciosComponent from '../../components/Servicios';
import ScheduleComponent from '../../components/Schedule/ScheduleComponent';
import FleetManagement from '../../components/Fleet/FleetManagement';
import CalendarComponent from '../../components/Calendar/CalendarComponent';
import MaintenanceComponent from '../../components/Maintenance/MaintenanceComponent';
import InventoryComponent from '../../components/Inventory/InventoryComponent';
import RiskComponent from '../../components/Risk/RiskComponent';
import ReportsComponent from '../../components/Reports/ReportsComponent';
import RRHHComponent from '../../components/RRHH/RRHHComponent';
import AsistenciaComponent from '../../components/Asistencia/AsistenciaComponent';
import GeofenceAlertPopup from '../../components/GeofenceAlert/GeofenceAlertPopup';
import { ProjectSwitcher } from '../../components/Project';
import { OrganizationSwitcher } from '../../components/Organization';
import ProyectosComponent from '../../components/Proyectos';
import { PlataformaGroup } from '../../components/SuperAdmin';
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
  UserPlus, Shield, Lock, Mail, Phone, Target, Layers
} from '../../components/Icons';
import { Badge, ProgressBar, ConfirmDialog } from '../../components/UI';
import { useSafeTabNav } from '../../hooks/useModuleAccess';
import { AlertCard, PersonnelTable, HeroStats, RealtimeActivity, RiskAlerts, UpcomingRoutes } from '../../components/Dashboard';
import './AdminDashboard.css';

const AdminDashboard = ({ user, onLogout, userRole = 'admin' }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState('');
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 1025);
  const [monitoringSheetExpanded, setMonitoringSheetExpanded] = useState(false);
  const [monitoringSheetTab, setMonitoringSheetTab] = useState('activity');
  const [sidePanelTab, setSidePanelTab] = useState('activity');
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
  const [personnelPage, setPersonnelPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null); // { type, id, label }

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
  const { currentOrgId, availableOrgs, hasModulo, currentOrgModulos } = useOrganization();

  // Tabs derivadas: ocultas si org no tiene ningún módulo que las alimente.
  // Org sin módulos → solo dashboard (mapa GPS) + vehiculos + riesgos + admin tabs.
  const hasAnyOperacional = hasModulo('REC') || hasModulo('FUM') || hasModulo('LIM') || hasModulo('MTO');
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
  const routeEvents = useQuery(api.route_events.getRecent, {
    limit: 50,
    organizacion_id: currentOrgId ?? undefined,
  }) || [];

  // Geofences and route progress (pass as props to MapComponent)
  const geofences = useQuery(api.geofences.list) || [];
  const allRouteProgress = useQuery(api.route_progress.list, {
    organizacion_id: currentOrgId ?? undefined,
  }) || [];

  // Hooks de contextos reales
  const {
    loading: personnelLoading,
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

  // Monitoring notifications (sounds + animation IDs)
  const { newEventIds, newAlertIds } = useMonitoringNotifications(recentActivity, displayAlerts);

  const isViewer = userRole === 'viewer' || user?.tipo === 'viewer';
  // viewer ve dashboard + operaciones (read-only) + riesgos.
  // Layout flat: riesgos vive como tab top-nav propio, gated por REC.
  const VIEWER_ALLOWED_TABS = ['dashboard', 'operaciones', 'riesgos'];

  // Cliente con operaciones bloqueadas — controlado por flag `restricted_operations`
  // en `perfiles_usuarios` (schema). El backend lo expone vía `getCurrentUser`.
  const isRestrictedClient = user?.restricted_operations === true;
  const RESTRICTED_BLOCKED_TABS = ['operaciones'];

  const handleTabChange = (newTab, defaultSubTab = '') => {
    if (isViewer && !VIEWER_ALLOWED_TABS.includes(newTab)) return;
    if (isRestrictedClient && RESTRICTED_BLOCKED_TABS.includes(newTab)) return;
    setActiveTab(newTab);
    setActiveSubTab(defaultSubTab);
  };

  // Map de tabs → módulo(s) requeridos. Si el activeTab actual deja de cumplir
  // (super_admin desactivó un módulo, OrgSwitcher cambió a una org sin el módulo,
  // viewer/restricted cambió de permisos) → redirige a dashboard.
  // Crítico para que el usuario no quede atrapado en una pantalla huérfana.
  const isTabAvailable = (tab) => {
    if (tab === 'dashboard') return true;
    if (tab === 'operaciones') {
      if (isRestrictedClient) return false;
      return hasModulo('REC') || hasModulo('FUM') || hasModulo('LIM') || hasModulo('MTO') || hasModulo('PER');
    }
    if (tab === 'calendario') return hasAnyOperacional;
    if (tab === 'riesgos') return hasModulo('REC');
    if (tab === 'inventario') return hasModulo('INV');
    if (tab === 'mantenimiento') return hasModulo('MTO');
    if (tab === 'reportes') return hasModulo('BI');
    if (tab === 'asistencia') return hasModulo('ASI');
    if (tab === 'rrhh') return hasModulo('RRHH') || hasModulo('PER-full');
    if (tab === 'plataforma') return isSuperAdmin;
    if (tab === 'proyectos') return userRole === 'admin' && !isSuperAdmin;
    return false;
  };

  // safeNav genera callbacks que validan isTabAvailable antes de navegar.
  // Si target no está disponible, callback es undefined → el caller no renderiza el botón.
  // Layout flat: Reportes y Riesgos son tabs top-nav independientes.
  const safeNav = useSafeTabNav(isTabAvailable, setActiveTab);
  const navToReportes = safeNav('reportes');
  const navToRiesgos = safeNav('riesgos');

  useEffect(() => {
    // Si la tab activa ya no es accesible (módulo desactivado, org switch, etc.),
    // redirige automáticamente a dashboard sin perder el flujo del usuario.
    if (!isTabAvailable(activeTab)) {
      setActiveTab('dashboard');
      setActiveSubTab('');
    }
    // viewer extra-check: si su tab no está en el allowlist, redirige
    if (isViewer && !VIEWER_ALLOWED_TABS.includes(activeTab)) {
      setActiveTab('dashboard');
    }
    if (isRestrictedClient && RESTRICTED_BLOCKED_TABS.includes(activeTab)) {
      setActiveTab('dashboard');
    }
    // Operaciones sub-tab: si activeSubTab='personal' pero PER se desactivó, saltar a flota
    if (activeTab === 'operaciones' && activeSubTab === 'personal' && !hasModulo('PER')) {
      setActiveSubTab('flota');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeSubTab, currentOrgId, currentOrgModulos, isViewer, isRestrictedClient, userRole, isSuperAdmin]);

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
    // Si activeSubTab='personal' pero PER está off, usar 'flota' sin esperar el useEffect
    const defaultSub = hasModulo('PER') ? 'personal' : 'flota';
    const currentSubTab = activeSubTab || defaultSub;
    const effectiveSub = currentSubTab === 'personal' && !hasModulo('PER') ? 'flota' : currentSubTab;
    switch (effectiveSub) {
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
              {(userRole === 'admin' || isSuperAdmin) && hasModulo('PER') && (
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
              )}
              <div className="ops-header-stats">
                <div className="stat-pill">
                  <span className="stat-value">{displayPersonnel?.filter(p => p.activo !== false).length || 0}</span>
                  <span className="stat-label">Activos</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-value">{displayPersonnel?.filter(p => (p.cargo || '').toLowerCase().includes('supervisor')).length || 0}</span>
                  <span className="stat-label">Supervisores</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-value">{displayPersonnel?.filter(p => (p.cargo || '').toLowerCase().includes('conductor')).length || 0}</span>
                  <span className="stat-label">Conductores</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-value">{displayPersonnel?.filter(p => (p.cargo || '').toLowerCase().includes('recolector')).length || 0}</span>
                  <span className="stat-label">Recolectores</span>
                </div>
              </div>
            </div>
            <div className="ops-content-wrapper">
              <PersonnelTable
                personnel={displayPersonnel}
                userRole={userRole}
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
                  const emp = displayPersonnel?.find((p) => (p._id || p.id) === employeeId);
                  setConfirmDelete({
                    type: 'employee',
                    id: employeeId,
                    label: emp ? `${emp.nombre || ''} ${emp.apellido || ''}`.trim() : 'este empleado',
                  });
                }}
                currentPage={personnelPage}
                totalPages={Math.ceil((displayPersonnel?.length || 0) / 8)}
                onPageChange={setPersonnelPage}
              />
            </div>
          </div>
        );
      case 'flota':
        return <FleetManagement userRole={userRole} />;

      case 'servicios':
        return (
          <div className="operations-content-modern">
            <ServiciosComponent
              initialRoutes={displayRoutes}
              userRole={userRole}
            />
          </div>
        );
      case 'programacion':
        return (
          <div className="operations-content-modern">
            <ScheduleComponent viewerMode={isViewer} userRole={userRole} />
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
    if (isRestrictedClient && RESTRICTED_BLOCKED_TABS.includes(activeTab)) {
      return null;
    }
    switch (activeTab) {
      case 'dashboard':
        const activeCount = normalizedCamiones.filter(c => c.estado === 'En ruta' || c.estado === 'en_ruta').length;
        const personnelCount = displayPersonnel?.length || 0;

        // KPIs en vivo — solo módulos activos (regla EN VIVO del Sprint H).
        // Cada item lleva requiredModulo opcional; null = sin gating.
        const heroStatsData = [
          {
            id: 'active',
            icon: <TrendingUp strokeWidth={1.5} size={24} />,
            value: activeCount,
            label: 'En Ruta',
            requiredModulo: 'REC',
          },
          {
            id: 'personnel',
            icon: <Briefcase strokeWidth={1.5} size={24} />,
            value: personnelCount,
            label: 'Personal',
            requiredModulo: 'PER',
          }
        ].filter((s) => !s.requiredModulo || hasModulo(s.requiredModulo));

        return (
          <div className="monitoring-layout">
            {/* Desktop: Side panel with KPIs, Activity, Alerts */}
            {!isMobileView && (
              <div className="monitoring-side-panel">
                <HeroStats stats={heroStatsData} />
                {userRole === 'enterprise' && hasModulo('REC') && <UpcomingRoutes limit={6} />}
                <div className="side-panel-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={sidePanelTab === 'activity'}
                    className={`side-panel-tab side-panel-tab--activity ${sidePanelTab === 'activity' ? 'side-panel-tab--active' : ''}`}
                    onClick={() => setSidePanelTab('activity')}
                  >
                    <Radio size={14} />
                    Actividades
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={sidePanelTab === 'alerts'}
                    className={`side-panel-tab side-panel-tab--alerts ${sidePanelTab === 'alerts' ? 'side-panel-tab--active' : ''}`}
                    onClick={() => setSidePanelTab('alerts')}
                  >
                    <AlertTriangle size={14} />
                    Alertas
                    {displayAlerts.length > 0 && (
                      <span className="side-panel-tab__badge">{displayAlerts.length}</span>
                    )}
                  </button>
                </div>
                {sidePanelTab === 'activity' ? (
                  <RealtimeActivity
                    vehicles={normalizedCamiones}
                    routes={displayRoutes}
                    personnel={displayPersonnel}
                    recentActivity={hasModulo('REC') ? recentActivity : []}
                    newEventIds={newEventIds}
                    onViewAll={navToReportes}
                  />
                ) : (
                  <RiskAlerts
                    alerts={displayAlerts}
                    onViewDetails={navToRiesgos ? () => navToRiesgos() : undefined}
                    onViewAll={navToRiesgos}
                    newAlertIds={newAlertIds}
                  />
                )}
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
                    rutas={isViewer || !hasModulo('REC') ? [] : (displayRoutes || [])}
                    personnel={isViewer || !hasModulo('PER') ? [] : (displayPersonnel || [])}
                    lugares={isViewer || !(hasModulo('LIM') || hasModulo('FUM')) ? [] : (lugares || [])}
                    geofences={isViewer ? [] : geofences}
                    allRouteProgress={isViewer || !hasModulo('REC') ? [] : allRouteProgress}
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
                      recentActivity={hasModulo('REC') ? recentActivity : []}
                      newEventIds={newEventIds}
                      onViewAll={navToReportes}
                    />
                  ) : (
                    <RiskAlerts
                      alerts={displayAlerts}
                      onViewDetails={navToRiesgos ? () => navToRiesgos() : undefined}
                      onViewAll={navToRiesgos}
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
              {hasModulo('PER') && (
                <button
                  className={`ops-tab ${(!activeSubTab || activeSubTab === 'personal') ? 'ops-tab-active' : ''}`}
                  onClick={() => setActiveSubTab('personal')}
                  title="Módulo PER"
                >
                  <Briefcase strokeWidth={1.5} size={20} />
                  <span>Personal</span>
                </button>
              )}
              <button
                className={`ops-tab ${activeSubTab === 'flota' ? 'ops-tab-active' : ''}`}
                onClick={() => setActiveSubTab('flota')}
              >
                <Truck strokeWidth={1.5} size={20} />
                <span>Flota</span>
              </button>
              <button
                className={`ops-tab ${activeSubTab === 'servicios' ? 'ops-tab-active' : ''}`}
                onClick={() => setActiveSubTab('servicios')}
                title="Catálogo de servicios: rutas, lugares de fumigación, salas de limpieza"
              >
                <Layers strokeWidth={1.5} size={20} />
                <span>Catálogo</span>
              </button>
              <button
                className={`ops-tab ${activeSubTab === 'programacion' ? 'ops-tab-active' : ''}`}
                onClick={() => setActiveSubTab('programacion')}
                title="Asignar servicios del catálogo a conductores y fechas"
              >
                <Calendar strokeWidth={1.5} size={20} />
                <span>Asignaciones</span>
              </button>
            </div>
            {renderOperationsContent()}
          </div>
        );
      case 'calendario':
        return <CalendarComponent />;
      case 'inventario':
        return <InventoryComponent userType={user.tipo} />;
      case 'mantenimiento':
        return <MaintenanceComponent userRole={user.tipo} />;
      case 'reportes':
        return (
          <ReportsComponent
            preSelectedLocationId={selectedLocationId}
            onClearSelection={handleClearLocationSelection}
          />
        );
      case 'riesgos':
        return <RiskComponent userType={user.tipo} />;
      case 'asistencia':
        return <AsistenciaComponent />;
      case 'rrhh':
        return <RRHHComponent />;
      // admin (no super): Proyectos standalone
      case 'proyectos':
        return !isSuperAdmin ? <ProyectosComponent /> : null;
      // super_admin: PlataformaGroup agrupa Organizaciones + Proyectos
      case 'plataforma':
        return isSuperAdmin ? <PlataformaGroup /> : null;
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
            {(isViewer || userRole === 'enterprise') && (
              <div className="app-bar__role-badge" title="Solo puedes consultar información — no se permiten cambios">
                <Lock strokeWidth={2} size={12} />
                <span>Modo Lectura</span>
              </div>
            )}
            <div className="app-bar__status">
              <Activity size={16} />
              <span>Sistema en Tiempo Real</span>
            </div>
            <button className="app-bar__logout" onClick={onLogout} aria-label="Cerrar sesión">
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
          {!isRestrictedClient && (hasModulo('REC') || hasModulo('FUM') || hasModulo('LIM') || hasModulo('MTO') || hasModulo('PER')) && (
            <button
              className={`top-nav__tab ${activeTab === 'operaciones' ? 'active' : ''}`}
              onClick={() => handleTabChange('operaciones', hasModulo('PER') ? 'personal' : 'flota')}
            >
              <Truck strokeWidth={1.5} size={18} />
              <span>Operaciones</span>
            </button>
          )}
          {hasAnyOperacional && (
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
          )}
          {/* Layout flat: cada módulo es su propio tab top-nav.
              Orden visual: CORE primero (Monitoreo, Operaciones, Calendario, Riesgos),
              después módulos pagos (Inventario, Mantenimiento, Reportes, Asistencia, RRHH),
              después rol-only (Proyectos, Plataforma). */}

          {/* Riesgos: CORE gated por REC (incidentes de recolección) */}
          {hasModulo('REC') && (
            <button
              className={`top-nav__tab ${activeTab === 'riesgos' ? 'active' : ''}`}
              onClick={() => handleTabChange('riesgos')}
              title="Riesgos — reportes de incidentes operacionales"
            >
              <AlertTriangle strokeWidth={1.5} size={18} />
              <span>Riesgos</span>
            </button>
          )}

          {/* Inventario: módulo INV (incluye Costos como sub-tab interno) */}
          {hasModulo('INV') && (
            <button
              className={`top-nav__tab ${activeTab === 'inventario' ? 'active' : ''} ${isViewer ? 'tab-locked' : ''}`}
              onClick={() => handleTabChange('inventario')}
              disabled={isViewer}
              title={isViewer ? 'Sección bloqueada para tu cuenta' : 'Inventario — materiales, flota y costos'}
            >
              <Package strokeWidth={1.5} size={18} />
              <span>Inventario</span>
              {isViewer && <Lock strokeWidth={2} size={12} />}
            </button>
          )}

          {/* Mantenimiento: módulo MTO */}
          {hasModulo('MTO') && (
            <button
              className={`top-nav__tab ${activeTab === 'mantenimiento' ? 'active' : ''} ${isViewer ? 'tab-locked' : ''}`}
              onClick={() => handleTabChange('mantenimiento')}
              disabled={isViewer}
              title={isViewer ? 'Sección bloqueada para tu cuenta' : 'Mantenimiento — tareas técnicas de vehículos y equipos'}
            >
              <Wrench strokeWidth={1.5} size={18} />
              <span>Mantenimiento</span>
              {isViewer && <Lock strokeWidth={2} size={12} />}
            </button>
          )}

          {/* Reportes: módulo BI (histórico avanzado) */}
          {hasModulo('BI') && (
            <button
              className={`top-nav__tab ${activeTab === 'reportes' ? 'active' : ''} ${isViewer ? 'tab-locked' : ''}`}
              onClick={() => handleTabChange('reportes')}
              disabled={isViewer}
              title={isViewer ? 'Sección bloqueada para tu cuenta' : 'Reportes — histórico consolidado'}
            >
              <BarChart3 strokeWidth={1.5} size={18} />
              <span>Reportes</span>
              {isViewer && <Lock strokeWidth={2} size={12} />}
            </button>
          )}

          {/* Asistencia: módulo ASI (roadmap, placeholder) */}
          {hasModulo('ASI') && (
            <button
              className={`top-nav__tab ${activeTab === 'asistencia' ? 'active' : ''} ${isViewer ? 'tab-locked' : ''}`}
              onClick={() => handleTabChange('asistencia')}
              disabled={isViewer}
              title={isViewer ? 'Sección bloqueada para tu cuenta' : 'Asistencia — control de jornadas (próximamente)'}
            >
              <Clock strokeWidth={1.5} size={18} />
              <span>Asistencia</span>
              {isViewer && <Lock strokeWidth={2} size={12} />}
            </button>
          )}

          {/* RRHH: módulo RRHH / PER-full (roadmap, placeholder) */}
          {(hasModulo('RRHH') || hasModulo('PER-full')) && (
            <button
              className={`top-nav__tab ${activeTab === 'rrhh' ? 'active' : ''} ${isViewer ? 'tab-locked' : ''}`}
              onClick={() => handleTabChange('rrhh')}
              disabled={isViewer}
              title={isViewer ? 'Sección bloqueada para tu cuenta' : 'RRHH — contratos, payroll, documentos (próximamente)'}
            >
              <Users strokeWidth={1.5} size={18} />
              <span>RRHH</span>
              {isViewer && <Lock strokeWidth={2} size={12} />}
            </button>
          )}

          {/* Proyectos: solo para admin (no super_admin — super ve Plataforma que lo incluye) */}
          {!isSuperAdmin && (userRole === 'admin') && (
            <button
              className={`top-nav__tab ${activeTab === 'proyectos' ? 'active' : ''}`}
              onClick={() => handleTabChange('proyectos')}
            >
              <Briefcase strokeWidth={1.5} size={18} />
              <span>Proyectos</span>
            </button>
          )}

          {/* Plataforma: consolida Organizaciones + Proyectos para super_admin */}
          {isSuperAdmin && (
            <button
              className={`top-nav__tab ${activeTab === 'plataforma' ? 'active' : ''}`}
              onClick={() => handleTabChange('plataforma')}
              title="Plataforma — Organizaciones y Proyectos (super_admin)"
            >
              <Shield strokeWidth={1.5} size={18} />
              <span>Plataforma</span>
            </button>
          )}
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
                  rutas={isViewer || !hasModulo('REC') ? [] : (displayRoutes || [])}
                  personnel={isViewer || !hasModulo('PER') ? [] : (displayPersonnel || [])}
                  lugares={isViewer || !(hasModulo('LIM') || hasModulo('FUM')) ? [] : (lugares || [])}
                  geofences={isViewer ? [] : geofences}
                  allRouteProgress={isViewer || !hasModulo('REC') ? [] : allRouteProgress}
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
                    recentActivity={hasModulo('REC') ? recentActivity : []}
                    newEventIds={newEventIds}
                    onViewAll={navToReportes ? () => { setIsMapMaximized(false); navToReportes(); } : undefined}
                  />
                </div>

                <div className="map-floating-alerts">
                  <RiskAlerts
                    alerts={displayAlerts}
                    onViewDetails={navToRiesgos ? () => { setIsMapMaximized(false); navToRiesgos(); } : undefined}
                    onViewAll={navToRiesgos ? () => { setIsMapMaximized(false); navToRiesgos(); } : undefined}
                    newAlertIds={newAlertIds}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog (delete employee, etc.) */}
      {confirmDelete && (
        <ConfirmDialog
          open
          destructive
          title="¿Desactivar empleado?"
          message={`Vas a desactivar a ${confirmDelete.label || 'este empleado'}. Esta acción se puede revertir desde el panel de personal.`}
          confirmLabel="Desactivar"
          cancelLabel="Cancelar"
          onConfirm={() => {
            if (confirmDelete.type === 'employee') {
              deleteEmployee(confirmDelete.id);
            }
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
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