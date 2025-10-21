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
import './AdminDashboard.css';

const AdminDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState('');
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [serviceTypeFilter, setServiceTypeFilter] = useState('todos');
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
    alerts,
    loading: alertsLoading,
    addAlert,
    updateAlert,
    deleteAlert,
    getAlertsStats
  } = useSupabaseRiskReports();

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
                  <span className="stat-value">{displayPersonnel?.length || 0}</span>
                  <span className="stat-label">Total</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-value">{displayPersonnel?.filter(p => p.estado === 'activo').length || 0}</span>
                  <span className="stat-label">Activos</span>
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
        const filteredVehicles = normalizedCamiones.filter(vehicle =>
          serviceTypeFilter === 'todos' || vehicle.tipoServicio === serviceTypeFilter
        );

        const handleVehicleInputChange = (e) => {
          const { name, value } = e.target;
          setVehicleFormData(prev => ({ ...prev, [name]: value }));
        };

        const handleAddVehicle = async (e) => {
          e.preventDefault();
          try {
            await addVehicle(vehicleFormData);
            setShowAddVehicleModal(false);
            setVehicleFormData({
              nombre: '',
              placa: '',
              marca: '',
              modelo: '',
              año: new Date().getFullYear(),
              tipoServicio: 'recoleccion'
            });
          } catch (error) {
            console.error('Error adding vehicle:', error);
            alert('Error al agregar vehículo');
          }
        };

        return (
          <div className="operations-content-modern">
            <div className="ops-header">
              <div className="ops-header-content">
                <Truck strokeWidth={1.5} size={26} className="ops-header-icon" />
                <div className="ops-header-text">
                  <h2>Gestión de Flota</h2>
                  <p>Monitorea y administra todos los vehículos</p>
                </div>
              </div>
              <div className="ops-header-actions">
                <div className="ops-header-stats">
                  <div className="stat-pill">
                    <span className="stat-value">{normalizedCamiones.length}</span>
                    <span className="stat-label">Total</span>
                  </div>
                  <div className="stat-pill success">
                    <span className="stat-value">{normalizedCamiones.filter(v => v.estado === 'En ruta' || v.estado === 'en_ruta').length}</span>
                    <span className="stat-label">En Ruta</span>
                  </div>
                  <div className="stat-pill info">
                    <span className="stat-value">{normalizedCamiones.filter(v => v.estado === 'Disponible').length}</span>
                    <span className="stat-label">Disponibles</span>
                  </div>
                </div>
                <button className="btn-add-modern" onClick={() => setShowAddVehicleModal(true)}>
                  <Plus size={20} />
                  <span>Agregar Vehículo</span>
                </button>
              </div>
            </div>
            
            <div className="ops-filters-modern">
              <button
                className={`ops-filter-chip ${serviceTypeFilter === 'todos' ? 'active' : ''}`}
                onClick={() => setServiceTypeFilter('todos')}
              >
                <BarChart3 size={18} />
                <span>Todos</span>
                <span className="chip-badge">{normalizedCamiones.length}</span>
              </button>
              <button
                className={`ops-filter-chip ${serviceTypeFilter === 'recoleccion' ? 'active' : ''}`}
                onClick={() => setServiceTypeFilter('recoleccion')}
              >
                <Truck size={18} />
                <span>Recolección</span>
                <span className="chip-badge">{normalizedCamiones.filter(v => v.tipoServicio === 'recoleccion').length}</span>
              </button>
              <button
                className={`ops-filter-chip ${serviceTypeFilter === 'fumigacion' ? 'active' : ''}`}
                onClick={() => setServiceTypeFilter('fumigacion')}
              >
                <Truck size={18} />
                <span>Fumigación</span>
                <span className="chip-badge">{normalizedCamiones.filter(v => v.tipoServicio === 'fumigacion').length}</span>
              </button>
            </div>

            <div className="ops-content-wrapper">
              {filteredVehicles.length > 0 ? (
                <div className="vehicle-grid-modern">
                  {filteredVehicles.map((vehicle, index) => (
                    <div key={vehicle.id} style={{ animationDelay: `${index * 50}ms` }}>
                      <VehicleCard
                        vehicle={vehicle}
                        onLocationClick={(vehicle) => handleGoToVehicleLocation(vehicle.id)}
                        onMaintenanceClick={(vehicle) => {
                          console.log('Maintenance for vehicle:', vehicle);
                        }}
                        onHistoryClick={(vehicle) => {
                          console.log('History for vehicle:', vehicle);
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-modern">
                  <div className="empty-icon-modern">
                    <Truck strokeWidth={1.5} size={64} />
                  </div>
                  <h3>No hay vehículos</h3>
                  <p>No se encontraron vehículos para el filtro seleccionado</p>
                </div>
              )}
            </div>

            {/* Modal Agregar Vehículo */}
            {showAddVehicleModal && (
              <div className="modal-overlay" onClick={() => setShowAddVehicleModal(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <div className="modal-header">
                    <h2>Agregar Vehículo</h2>
                    <button className="btn-close" onClick={() => setShowAddVehicleModal(false)}>
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleAddVehicle} className="vehicle-form">
                    <div className="form-group">
                      <label>Nombre *</label>
                      <input
                        type="text"
                        name="nombre"
                        value={vehicleFormData.nombre}
                        onChange={handleVehicleInputChange}
                        placeholder="Ej: Camión Recolector 1"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Placa *</label>
                      <input
                        type="text"
                        name="placa"
                        value={vehicleFormData.placa}
                        onChange={handleVehicleInputChange}
                        placeholder="Ej: ABC-123"
                        required
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Marca</label>
                        <input
                          type="text"
                          name="marca"
                          value={vehicleFormData.marca}
                          onChange={handleVehicleInputChange}
                          placeholder="Ej: Ford"
                        />
                      </div>

                      <div className="form-group">
                        <label>Modelo</label>
                        <input
                          type="text"
                          name="modelo"
                          value={vehicleFormData.modelo}
                          onChange={handleVehicleInputChange}
                          placeholder="Ej: F-350"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Año</label>
                        <input
                          type="number"
                          name="año"
                          value={vehicleFormData.año}
                          onChange={handleVehicleInputChange}
                          min="1990"
                          max={new Date().getFullYear() + 1}
                        />
                      </div>

                      <div className="form-group">
                        <label>Tipo de Servicio *</label>
                        <select
                          name="tipoServicio"
                          value={vehicleFormData.tipoServicio}
                          onChange={handleVehicleInputChange}
                          required
                        >
                          <option value="recoleccion">🚛 Recolección</option>
                          <option value="fumigacion">🦟 Fumigación</option>
                        </select>
                      </div>
                    </div>

                    <div className="modal-actions">
                      <button type="button" className="btn-cancel" onClick={() => setShowAddVehicleModal(false)}>
                        Cancelar
                      </button>
                      <button type="submit" className="btn-submit">
                        Agregar Vehículo
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        );

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
                  <span className="stat-value">{displayRoutes.filter(r => r.tipo_servicio === 'recoleccion').length}</span>
                  <span className="stat-label">Recolección</span>
                </div>
                <div className="stat-pill info">
                  <span className="stat-value">{displayRoutes.filter(r => r.tipo_servicio === 'fumigacion').length}</span>
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
        const heroStatsData = [
          {
            id: 'vehicles',
            icon: <Truck strokeWidth={1.5} size={32} />,
            value: serviceTypeFilter === 'todos' 
              ? normalizedCamiones.length 
              : normalizedCamiones.filter(c => c.tipoServicio === serviceTypeFilter).length,
            label: serviceTypeFilter === 'todos' ? 'Total Vehículos' : 
                   serviceTypeFilter === 'recoleccion' ? 'Camiones Recolección' : 'Vehículos Fumigación',
            color: 'linear-gradient(135deg, #30d158 0%, #34c759 100%)'
          },
          {
            id: 'active',
            icon: <TrendingUp strokeWidth={1.5} size={32} />,
            value: serviceTypeFilter === 'todos' 
              ? normalizedCamiones.filter(c => c.estado === 'En ruta' || c.estado === 'en_ruta').length
              : normalizedCamiones.filter(c => (c.estado === 'En ruta' || c.estado === 'en_ruta') && c.tipoServicio === serviceTypeFilter).length,
            label: 'En Ruta',
            color: 'linear-gradient(135deg, #ff9500 0%, #ffb800 100%)'
          },
          {
            id: 'personnel',
            icon: <Briefcase strokeWidth={1.5} size={32} />,
            value: displayPersonnel?.length || 0,
            label: 'Personal',
            color: 'linear-gradient(135deg, #007aff 0%, #4da3ff 100%)'
          },
          {
            id: 'routes',
            icon: <MapPin strokeWidth={1.5} size={32} />,
            value: displayRoutes.filter(r => r.activa !== false).length,
            label: 'Rutas Activas',
            color: 'linear-gradient(135deg, #00d4ff 0%, #0091ff 100%)'
          }
        ];

        return (
          <div className="dashboard-content">
            <HeroStats stats={heroStatsData} />
            
            <div className="map-section">
              <div className="map-header">
                <h3><Satellite strokeWidth={1.5} size={22} /> Monitoreo GPS en Tiempo Real</h3>
                <div className="service-filters-modern">
                  <button 
                    className={`filter-chip ${serviceTypeFilter === 'todos' ? 'active' : ''}`}
                    onClick={() => setServiceTypeFilter('todos')}
                  >
                    <BarChart3 strokeWidth={1.5} size={16} /> Todos
                  </button>
                  <button 
                    className={`filter-chip ${serviceTypeFilter === 'recoleccion' ? 'active' : ''}`}
                    onClick={() => setServiceTypeFilter('recoleccion')}
                  >
                    <Truck strokeWidth={1.5} size={16} /> Recolección
                  </button>
                  <button 
                    className={`filter-chip ${serviceTypeFilter === 'fumigacion' ? 'active' : ''}`}
                    onClick={() => setServiceTypeFilter('fumigacion')}
                  >
                    <Truck strokeWidth={1.5} size={16} /> Fumigación
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
                  rutas={displayRoutes || []}
                  personnel={displayPersonnel || []}
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
                <span>Programación</span>
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
        return <ReportsComponent userType={user.tipo} />;
      default:
        return null;
    }
  };

  
  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2><Leaf strokeWidth={1.5} size={20} /> RMP Admin</h2>
          <p>Bienvenido, {user.nombre}</p>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li>
              <button 
                className={activeTab === 'dashboard' ? 'active' : ''}
                onClick={() => handleTabChange('dashboard')}
              >
                <LayoutDashboard strokeWidth={1.5} size={18} /> Dashboard
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
            {isDemoMode && (
              <div className="demo-badge">
                <Sparkles size={14} />
                <span>MODO DEMO</span>
              </div>
            )}
            <button
              className={`demo-toggle-btn ${isDemoMode ? 'active' : ''}`}
              onClick={toggleDemoMode}
              title={isDemoMode ? 'Desactivar modo demo' : 'Activar modo demo'}
            >
              <Sparkles size={16} />
              <span>{isDemoMode ? 'Demo ON' : 'Demo OFF'}</span>
            </button>
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