import { useState, useEffect } from 'react';
import WeightModal from '../../components/WeightModal/WeightModal';
import MapComponent from '../../components/Map/MapComponent';
import { useSupabaseRiskReports } from '../../context/SupabaseRiskReportsContext';
import { useSupabaseFleet } from '../../context/SupabaseFleetContext';
import { useSupabaseRoutes } from '../../context/SupabaseRoutesContext';
import { 
  Truck, LogOut, Download, Map, Clock, AlertTriangle, 
  ClipboardList, Package, TrendingUp, FileText, MapPin,
  CheckCircle, Calendar, Loader, Wrench, AlertOctagon
} from '../../components/Icons';
import { Badge, ProgressBar } from '../../components/UI';
import { RouteTimeline } from '../../components/Dashboard';
import './ConductorDashboard.css';

// Hook para PWA
const usePWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  return { isInstallable, installPWA };
};

const ConductorDashboard = ({ user, onLogout }) => {
  const { isInstallable, installPWA } = usePWAInstallPrompt();
  const { addReport, getReportsByDriver, loading: reportsLoading } = useSupabaseRiskReports();
  const { vehicles, loading: vehiclesLoading } = useSupabaseFleet();
  const { routes, loading: routesLoading } = useSupabaseRoutes();
  
  const [completedStops, setCompletedStops] = useState([]);
  const [currentStop, setCurrentStop] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingStopIndex, setPendingStopIndex] = useState(null);
  const [timeOnRoute, setTimeOnRoute] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [activeTab, setActiveTab] = useState('ruta');
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [riskReport, setRiskReport] = useState({
    tipo: 'interno',
    categoria: '',
    titulo: '',
    descripcion: '',
    prioridad: 'media'
  });

  // Detectar estado de conexión
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineBanner(false);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineBanner(true);
      setTimeout(() => setShowOfflineBanner(false), 5000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Simular tiempo en ruta
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeOnRoute(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Obtener vehículo asignado al conductor desde Supabase
  const userTruck = vehicles.find(v => 
    v.conductorId === user.id || 
    v.conductor === user.nombre ||
    v.id === user.camionAsignado
  );

  // Obtener ruta asignada al vehículo del conductor
  const assignedRoute = routes.find(r => r.vehiculo_id === userTruck?.id);

  const handleCompleteStop = (stopIndex) => {
    setPendingStopIndex(stopIndex);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPendingStopIndex(null);
  };

  const handleWeightConfirm = (category) => {
    const timestamp = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    setCompletedStops(prev => [...prev, {
      index: pendingStopIndex,
      category: category,
      timestamp: timestamp
    }]);
    
    setCurrentStop(prev => prev + 1);
    setIsModalOpen(false);
    setPendingStopIndex(null);
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!assignedRoute) return 0;
    const paradas = assignedRoute.paradas || [];
    if (!Array.isArray(paradas) || paradas.length === 0) return 0;
    return Math.round((completedStops.length / paradas.length) * 100);
  };

  const handleSubmitRiskReport = () => {
    if (!riskReport.categoria || !riskReport.titulo || !riskReport.descripcion) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    // Crear el reporte con datos reales
    const reportData = {
      conductor: user.nombre,
      camion: user.camionAsignado,
      fecha: new Date().toISOString(),
      ...riskReport,
      ubicacion: userTruck ? `Lat: ${userTruck.lat.toFixed(6)}, Lng: ${userTruck.lng.toFixed(6)}` : 'No disponible',
      coordenadas: userTruck ? { lat: userTruck.lat, lng: userTruck.lng } : null
    };

    // Agregar al estado global (se guarda automáticamente en localStorage)
    const createdReport = addReport(reportData);
    console.log('Reporte creado:', createdReport);
    
    alert('✅ Reporte de riesgo enviado correctamente. El administrador será notificado.');
    
    // Resetear formulario
    setRiskReport({
      tipo: 'interno',
      categoria: '',
      titulo: '',
      descripcion: '',
      prioridad: 'media'
    });
    setShowRiskModal(false);
  };

  if (vehiclesLoading || routesLoading) {
    return (
      <div className="dashboard-container">
        <div className="main-content">
          <div className="dashboard-header">
            <h1><Truck size={24} /> Dashboard Conductor</h1>
          </div>
          <div className="card">
            <div className="card__body">
              <div className="no-assignment">
                <div className="spinner"></div>
                <h3>Cargando...</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!userTruck || !assignedRoute) {
    return (
      <div className="dashboard-container">
        <div className="main-content">
          <div className="dashboard-header">
            <h1><Truck size={24} /> Dashboard Conductor</h1>
            <button className="logout-btn" onClick={onLogout}>
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </div>
          <div className="card">
            <div className="card__body">
              <div className="no-assignment">
                <div className="no-assignment-icon">🚫</div>
                <h3>Sin Asignación</h3>
                <p>No tienes un camión o ruta asignada. Contacta con el administrador.</p>
                <p className="debug-info">
                  {!userTruck && '❌ No se encontró vehículo asignado'}
                  {!assignedRoute && userTruck && '❌ No se encontró ruta asignada al vehículo'}
                </p>
                <button className="btn btn--primary" onClick={() => window.location.reload()}>
                  🔄 Actualizar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage = getProgressPercentage();

  return (
    <div className="dashboard-container">
      {/* Banner de estado offline */}
      {showOfflineBanner && (
        <div className="offline-banner">
          📱 Modo sin conexión activado - Los datos se sincronizarán cuando regrese la conexión
        </div>
      )}

      {/* Banner de instalación PWA */}
      {isInstallable && (
        <div className="install-banner">
          <div className="install-content">
            <span>📱 Instala RMP Conductor en tu dispositivo</span>
            <button className="install-btn" onClick={installPWA}>
              <Download size={16} /> Instalar App
            </button>
          </div>
        </div>
      )}

      <div className="sidebar">
        <div className="sidebar-header">
          <h2><Truck size={20} /> RMP Conductor</h2>
          <p>Bienvenido, {user.nombre}</p>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li>
              <button
                className={activeTab === 'ruta' ? 'active' : ''}
                onClick={() => setActiveTab('ruta')}
              >
                <Map size={18} /> Mi Ruta
              </button>
            </li>
            <li>
              <button
                className={activeTab === 'reportes' ? 'active' : ''}
                onClick={() => setActiveTab('reportes')}
              >
                <ClipboardList size={18} /> Mis Reportes
              </button>
            </li>
          </ul>
        </nav>
      </div>

      <div className="main-content">
        <div className="dashboard-header">
          <h1><Truck size={24} /> Panel de Conductor</h1>
          <div className="header-actions">
            <div className="connection-status">
              {isOnline ? '🟢 En línea' : '🔴 Sin conexión'}
            </div>
            <div className="route-status">
              <Map size={16} /> {assignedRoute.nombre || assignedRoute.name}
            </div>
            <div className="time-indicator">
              <Clock size={16} /> {formatTime(timeOnRoute)}
            </div>
            <button
              className="btn btn--warning"
              onClick={() => setShowRiskModal(true)}
              title="Reportar un riesgo"
            >
              <AlertTriangle size={16} /> Reportar Riesgo
            </button>
            <button className="logout-btn" onClick={onLogout}>
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </div>
        </div>



        {activeTab === 'ruta' && (
          <>
            {/* KPIs del conductor */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-icon"><Truck size={28} /></div>
                <div className="kpi-content">
                  <div className="kpi-value">{userTruck.id}</div>
                  <div className="kpi-label">Mi Camión</div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon"><Package size={28} /></div>
                <div className="kpi-content">
                  <div className="kpi-value">{completedStops.length}/{(assignedRoute.paradas || []).length}</div>
                  <div className="kpi-label">Paradas Completadas</div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon"><TrendingUp size={28} /></div>
                <div className="kpi-content">
                  <div className="kpi-value">{progressPercentage}%</div>
                  <div className="kpi-label">Progreso</div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon"><Clock size={28} /></div>
                <div className="kpi-content">
                  <div className="kpi-value">{formatTime(timeOnRoute)}</div>
                  <div className="kpi-label">Tiempo en Ruta</div>
                </div>
              </div>
            </div>

        {/* Timeline de la ruta */}
        <div className="route-timeline-section">
          <RouteTimeline
            route={{
              ...assignedRoute,
              estado: progressPercentage === 100 ? 'completada' : progressPercentage > 0 ? 'en progreso' : 'activa',
              paradas: (assignedRoute.paradas || []).map((parada, index) => ({
                ...parada,
                completada: completedStops.some(stop => stop.index === index),
                index: index
              })),
              paradaActual: currentStop,
              duracionEstimada: assignedRoute.tiempo_estimado || assignedRoute.tiempoEstimado,
              distancia: assignedRoute.distancia_total || assignedRoute.distanciaTotal
            }}
            onViewMap={() => {
              // El mapa ya se muestra abajo, quizás hacer scroll
              console.log('View map for route');
            }}
            onEdit={() => {
              // Los conductores no pueden editar rutas
              console.log('Conductors cannot edit routes');
            }}
            onPause={() => {
              // TODO: Implement pause functionality
              console.log('Pause route');
            }}
            onViewStats={() => {
              // TODO: Implement stats view
              console.log('View route stats');
            }}
          />
        </div>

        {/* Información del conductor y mapa */}
        <div className="conductor-layout">
          <div className="conductor-info-section">
            <div className="card">
              <div className="card__body">
                <h3><MapPin size={20} /> Mi Ubicación Actual</h3>
                <MapComponent
                  camiones={[userTruck]}
                  userType={user.tipo}
                  showRealTime={true}
                  selectedTruck={userTruck.id}
                />
              </div>
        </div>

        {/* Mapa del conductor */}
            <div className="card">
              <div className="card__body">
                <h3><MapPin size={20} /> Mi Ubicación</h3>
                <MapComponent 
                  camiones={[userTruck]} 
                  userType={user.tipo}
                  showRealTime={true}
                  selectedTruck={userTruck.id}
                />
              </div>
            </div>
          </div>
        </div>
        </>
        )}

        {activeTab === 'reportes' && (
          <div className="reports-section">
            <div className="section-header">
              <div className="section-title">
                <h3>Mis Reportes de Riesgo</h3>
                <p>Historial de reportes enviados al administrador</p>
              </div>
            </div>

            {reportsLoading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Cargando reportes...</p>
              </div>
            ) : (
              <div className="reports-grid">
                {getReportsByDriver(user.nombre).map(reporte => (
                  <div key={reporte.id} className="report-card">
                    <div className="report-header">
                      <div className="report-type">
                        {reporte.tipo === 'interno' ? <Wrench size={16} /> : <AlertOctagon size={16} />}
                        <span>{reporte.tipo.toUpperCase()}</span>
                      </div>
                      <div className={`report-priority priority-${reporte.prioridad}`}>
                        {reporte.prioridad.toUpperCase()}
                      </div>
                    </div>
                    <div className="report-body">
                      <h4>{reporte.titulo}</h4>
                      <p className="report-category">{reporte.categoria}</p>
                      <p className="report-description">{reporte.descripcion}</p>
                      <div className="report-meta">
                        <div className="meta-item">
                          <Calendar size={14} />
                          <span>{new Date(reporte.fechaCreacion).toLocaleDateString('es-ES')}</span>
                        </div>
                        <div className="meta-item">
                          <MapPin size={14} />
                          <span>{reporte.ubicacion}</span>
                        </div>
                        <div className={`meta-item status-${reporte.estado}`}>
                          <span>{reporte.estado.replace('_', ' ').toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {getReportsByDriver(user.nombre).length === 0 && !reportsLoading && (
              <div className="empty-state">
                <div className="empty-icon"><ClipboardList size={48} /></div>
                <h4>No tienes reportes de riesgo</h4>
                <p>Usa el botón "Reportar Riesgo" para crear tu primer reporte</p>
              </div>
            )}
          </div>
        )}

        {/* Modal de reporte de riesgo */}
        {showRiskModal && (
          <div className="modal-overlay" onClick={() => setShowRiskModal(false)}>
            <div className="modal-content risk-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>⚠️ Reportar Riesgo</h3>
                <button className="modal-close" onClick={() => setShowRiskModal(false)}>✕</button>
              </div>
              
              <div className="modal-body">
                <div className="form-group">
                  <label>Tipo de Riesgo *</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="tipo"
                        value="interno"
                        checked={riskReport.tipo === 'interno'}
                        onChange={e => setRiskReport(prev => ({...prev, tipo: e.target.value}))}
                      />
                      <span>🔧 Interno</span>
                      <small>Problemas con el vehículo, equipo o empresa</small>
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="tipo"
                        value="externo"
                        checked={riskReport.tipo === 'externo'}
                        onChange={e => setRiskReport(prev => ({...prev, tipo: e.target.value}))}
                      />
                      <span>🚧 Externo</span>
                      <small>Situaciones externas que afectan las operaciones</small>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Categoría *</label>
                  <select
                    value={riskReport.categoria}
                    onChange={e => setRiskReport(prev => ({...prev, categoria: e.target.value}))}
                    required
                  >
                    <option value="">Seleccionar categoría</option>
                    {riskReport.tipo === 'interno' ? (
                      <>
                        <option value="Mecánico">Problemas mecánicos</option>
                        <option value="Combustible">Combustible</option>
                        <option value="Equipo de seguridad">Equipo de seguridad</option>
                        <option value="Mantenimiento">Mantenimiento requerido</option>
                      </>
                    ) : (
                      <>
                        <option value="Bloqueo de vía">Bloqueo de vía</option>
                        <option value="Seguridad ciudadana">Seguridad ciudadana</option>
                        <option value="Condiciones climáticas">Condiciones climáticas</option>
                        <option value="Protesta/manifestación">Protesta o manifestación</option>
                        <option value="Accidente de tránsito">Accidente de tránsito</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>Título del reporte *</label>
                  <input
                    type="text"
                    placeholder="Resumen breve del riesgo"
                    value={riskReport.titulo}
                    onChange={e => setRiskReport(prev => ({...prev, titulo: e.target.value}))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Descripción detallada *</label>
                  <textarea
                    placeholder="Describe el riesgo con el mayor detalle posible..."
                    rows={4}
                    value={riskReport.descripcion}
                    onChange={e => setRiskReport(prev => ({...prev, descripcion: e.target.value}))}
                    required
                  ></textarea>
                </div>

                <div className="form-group">
                  <label>Prioridad</label>
                  <select
                    value={riskReport.prioridad}
                    onChange={e => setRiskReport(prev => ({...prev, prioridad: e.target.value}))}
                  >
                    <option value="baja">🟢 Baja</option>
                    <option value="media">🟡 Media</option>
                    <option value="alta">🟠 Alta</option>
                    <option value="critica">🔴 Crítica</option>
                  </select>
                </div>

                <div className="location-info">
                  <p><strong>📍 Ubicación actual:</strong></p>
                  <p>Lat: {userTruck?.lat.toFixed(6)}, Lng: {userTruck?.lng.toFixed(6)}</p>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  className="btn btn--secondary"
                  onClick={() => setShowRiskModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="btn btn--warning"
                  onClick={handleSubmitRiskReport}
                >
                  📤 Enviar Reporte
                </button>
              </div>
            </div>
          </div>
        )}

        <WeightModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onConfirm={handleWeightConfirm}
          currentStop={pendingStopIndex !== null ? (assignedRoute.paradas[pendingStopIndex]?.nombre || assignedRoute.paradas[pendingStopIndex]?.direccion || 'Parada') : ''}
        />
      </div>
    </div>
  );
};

export default ConductorDashboard; 