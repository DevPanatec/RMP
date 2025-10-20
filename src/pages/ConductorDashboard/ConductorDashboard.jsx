import { useState, useEffect } from 'react';
import WeightModal from '../../components/WeightModal/WeightModal';
import RouteCompletionModal from '../../components/RouteCompletionModal/RouteCompletionModal';
import MapComponent from '../../components/Map/MapComponent';
import { useSupabaseRiskReports } from '../../context/SupabaseRiskReportsContext';
import { useSupabaseFleet } from '../../context/SupabaseFleetContext';
import { useSupabaseRoutes } from '../../context/SupabaseRoutesContext';
import { useSupabaseSchedule } from '../../context/SupabaseScheduleContext';
import { useSupabaseReports } from '../../context/SupabaseReportsContext';
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
  const { addReport, getReportsByDriver, loading: reportsLoading, reports } = useSupabaseRiskReports();
  const { vehicles, loading: vehiclesLoading } = useSupabaseFleet();
  const { routes, loading: routesLoading } = useSupabaseRoutes();
  const { assignments, loading: assignmentsLoading, getAssignmentsByConductor, getDayNameFromDate } = useSupabaseSchedule();
  const { saveCompletedRoute } = useSupabaseReports();

  // Helper: parsear array de paradas desde JSONB
  const getParadasArray = (paradas) => {
    if (!paradas) return [];
    const paradasArray = typeof paradas === 'string' ? JSON.parse(paradas) : paradas;
    return Array.isArray(paradasArray) ? paradasArray : [];
  };

  const [routeStarted, setRouteStarted] = useState(false);
  const [completedStops, setCompletedStops] = useState([]);
  const [currentStop, setCurrentStop] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingStopIndex, setPendingStopIndex] = useState(null);
  const [timeOnRoute, setTimeOnRoute] = useState(0);
  const [routeStartTime, setRouteStartTime] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [activeTab, setActiveTab] = useState('ruta');
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [restorationAttempted, setRestorationAttempted] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionReportData, setCompletionReportData] = useState(null);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [riskReport, setRiskReport] = useState({
    tipo: 'interno',
    categoria: '',
    titulo: '',
    descripcion: '',
    prioridad: 'media'
  });

  // Obtener asignaciones del conductor
  const conductorAssignments = getAssignmentsByConductor(user.nombre || user.nombre_completo);

  // Obtener asignación de hoy (si existe) - formato en zona horaria local
  const today = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();
  const todayDayName = getDayNameFromDate(today);

  const todayAssignment = conductorAssignments.find(assignment => {
    if (!assignment.dias_semana || !Array.isArray(assignment.dias_semana)) return false;
    return assignment.dias_semana.includes(todayDayName);
  });

  // Obtener vehículo y ruta de la asignación de hoy
  const userTruck = todayAssignment ? vehicles.find(v => v.id === todayAssignment.vehiculo_id) : null;
  const assignedRoute = todayAssignment?.ruta || null;

  // Cargar estado de ruta desde localStorage - SOLO cuando todayAssignment esté disponible y solo UNA vez
  useEffect(() => {
    // Solo intentar restaurar si:
    // 1. No se ha intentado antes
    // 2. todayAssignment está disponible
    if (restorationAttempted || !todayAssignment) {
      return;
    }

    const savedRouteState = localStorage.getItem('conductorRouteState');

    if (savedRouteState) {
      try {
        const state = JSON.parse(savedRouteState);

        // Solo restaurar si es el mismo día y misma asignación
        if (state.date === today && state.assignmentId === todayAssignment.id) {
          setRouteStarted(state.routeStarted || false);
          setCompletedStops(state.completedStops || []);
          setTimeOnRoute(state.timeOnRoute || 0);
          setCurrentStop(state.currentStop || 0);
          setRouteStartTime(state.routeStartTime || null);
          setReportGenerated(state.reportGenerated || false);
        } else {
          localStorage.removeItem('conductorRouteState');
        }
      } catch (err) {
        console.error('Error al cargar estado de ruta:', err);
        localStorage.removeItem('conductorRouteState');
      }
    }

    // Marcar que ya se intentó restaurar (esto evita que se ejecute de nuevo)
    setRestorationAttempted(true);
  }, [todayAssignment, today, restorationAttempted]);

  // Persistir estado de ruta en localStorage cuando cambia (SIN timeOnRoute para evitar guardar cada segundo)
  useEffect(() => {
    if (todayAssignment && routeStarted) {
      const routeState = {
        date: today,
        assignmentId: todayAssignment.id,
        routeStarted,
        completedStops,
        timeOnRoute,
        currentStop,
        routeStartTime,
        reportGenerated
      };
      localStorage.setItem('conductorRouteState', JSON.stringify(routeState));
    }
  }, [routeStarted, completedStops, currentStop, routeStartTime, reportGenerated, todayAssignment?.id, today]);

  // Guardar timeOnRoute periódicamente (cada 30 segundos) para evitar bucle infinito
  useEffect(() => {
    if (!todayAssignment || !routeStarted) return;

    const saveInterval = setInterval(() => {
      const routeState = {
        date: today,
        assignmentId: todayAssignment.id,
        routeStarted,
        completedStops,
        timeOnRoute,
        currentStop,
        routeStartTime,
        reportGenerated
      };
      localStorage.setItem('conductorRouteState', JSON.stringify(routeState));
    }, 30000); // Guardar cada 30 segundos

    return () => clearInterval(saveInterval);
  }, [todayAssignment, routeStarted, today, completedStops, timeOnRoute, currentStop, routeStartTime, reportGenerated]);

  // Detectar completación de ruta al 100% y generar reporte
  useEffect(() => {
    const progressPercentage = assignedRoute ?
      Math.round((completedStops.length / getParadasArray(assignedRoute.paradas).length) * 100) : 0;

    if (progressPercentage === 100 && !reportGenerated && routeStarted) {
      generateRouteCompletionReport();
    }
  }, [completedStops, assignedRoute, reportGenerated, routeStarted]);

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

  // Cronómetro de tiempo en ruta (solo cuando la ruta está iniciada)
  useEffect(() => {
    if (!routeStarted) return;

    const timer = setInterval(() => {
      setTimeOnRoute(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [routeStarted]);

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
    const paradas = getParadasArray(assignedRoute.paradas);
    if (paradas.length === 0) return 0;
    return Math.round((completedStops.length / paradas.length) * 100);
  };

  const handleLogout = () => {
    // Limpiar localStorage antes de cerrar sesión
    localStorage.removeItem('conductorRouteState');
    onLogout();
  };

  const handleStartRoute = () => {
    const startTime = new Date().toISOString();
    setRouteStartTime(startTime);
    setRouteStarted(true);
  };

  const generateRouteCompletionReport = () => {
    if (!assignedRoute || !routeStartTime) return;

    const paradas = getParadasArray(assignedRoute.paradas);

    // Compilar datos de las paradas completadas con detalles
    const paradasCompletadas = completedStops.map((completed) => {
      const paradaOriginal = paradas[completed.index];
      return {
        index: completed.index,
        orden: completed.index + 1,
        direccion: paradaOriginal?.direccion || paradaOriginal?.nombre || `Parada ${completed.index + 1}`,
        categoria_carga: completed.category,
        timestamp: completed.timestamp,
        completada: true
      };
    });

    // Obtener reportes de riesgo creados durante esta ruta
    const routeRiskReports = reports.filter(report => {
      const reportDate = new Date(report.fechaCreacion);
      const routeStart = new Date(routeStartTime);
      return reportDate >= routeStart;
    });

    const reportData = {
      ruta_id: assignedRoute.id,
      asignacion_id: todayAssignment?.id,
      nombreRuta: assignedRoute.nombre || `Ruta ${assignedRoute.id}`,
      conductorNombre: user.nombre || user.nombre_completo,
      conductor_id: user.id || null,
      vehiculoPlaca: userTruck?.placa || 'N/A',
      vehiculo_id: userTruck?.id || null,
      fechaInicio: routeStartTime,
      fechaCompletacion: new Date().toISOString(),
      tiempoTotal: timeOnRoute,
      paradas: paradasCompletadas,
      reportes_riesgo_ids: routeRiskReports.map(r => r.id)
    };

    setCompletionReportData(reportData);
    setShowCompletionModal(true);
    setReportGenerated(true);
  };

  const handleConfirmReport = async (observaciones) => {
    if (!completionReportData) return;

    try {
      const reportToSave = {
        ruta_id: completionReportData.ruta_id,
        asignacion_id: completionReportData.asignacion_id,
        conductor_nombre: completionReportData.conductorNombre,
        conductor_id: completionReportData.conductor_id,
        vehiculo_placa: completionReportData.vehiculoPlaca,
        vehiculo_id: completionReportData.vehiculo_id,
        fecha_inicio: completionReportData.fechaInicio,
        fecha_completacion: completionReportData.fechaCompletacion,
        tiempo_total_segundos: completionReportData.tiempoTotal,
        paradas_completadas: completionReportData.paradas,
        reportes_riesgo_ids: completionReportData.reportes_riesgo_ids,
        observaciones: observaciones
      };

      await saveCompletedRoute(reportToSave);

      // Limpiar localStorage después de guardar exitosamente
      localStorage.removeItem('conductorRouteState');

      // Cerrar modal y mostrar mensaje de éxito
      setShowCompletionModal(false);
      alert('✅ Reporte de ruta guardado exitosamente');

      // Reset estado para nueva ruta
      setRouteStarted(false);
      setCompletedStops([]);
      setCurrentStop(0);
      setTimeOnRoute(0);
      setRouteStartTime(null);
      setReportGenerated(false);
    } catch (error) {
      console.error('Error guardando reporte:', error);
      alert('❌ Error al guardar el reporte. Por favor intenta de nuevo.');
    }
  };

  const handleCancelReport = () => {
    setShowCompletionModal(false);
    // No marcamos reportGenerated como false para no volver a mostrar el modal
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

  if (vehiclesLoading || routesLoading || assignmentsLoading) {
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

  if (!todayAssignment) {
    return (
      <div className="dashboard-container">
        <div className="main-content">
          <div className="dashboard-header">
            <h1><Truck size={24} /> Dashboard Conductor</h1>
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </div>
          <div className="card">
            <div className="card__body">
              <div className="no-assignment">
                <div className="no-assignment-icon">📅</div>
                <h3>Sin Asignación para Hoy</h3>
                <p>No tienes ruta asignada para {todayDayName}. Disfruta tu día libre!</p>

                {conductorAssignments.length > 0 && (
                  <div style={{ marginTop: '20px', textAlign: 'left' }}>
                    <h4>📋 Tus Asignaciones de la Semana:</h4>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                      {conductorAssignments.map(assignment => (
                        <li key={assignment.id} style={{ marginBottom: '10px', padding: '10px', background: '#f3f4f6', borderRadius: '8px' }}>
                          <strong>{assignment.ruta?.nombre || 'Ruta sin nombre'}</strong>
                          <br />
                          📍 Días: {assignment.dias_semana?.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
                          <br />
                          🚛 Vehículo: {vehicles.find(v => v.id === assignment.vehiculo_id)?.placa || 'No asignado'}
                          <br />
                          ⏰ Horario: {assignment.ruta?.hora_inicio || 'N/A'} - {assignment.ruta?.hora_fin || 'N/A'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button className="btn btn--primary" onClick={() => window.location.reload()} style={{ marginTop: '20px' }}>
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
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </div>
        </div>



        {activeTab === 'ruta' && (
          <>
            {/* Botón para iniciar ruta */}
            {!routeStarted && (
              <div className="start-route-container">
                <div className="start-route-card">
                  <div className="start-route-icon">🚀</div>
                  <h2>¿Listo para comenzar tu ruta?</h2>
                  <p>Ruta: <strong>{assignedRoute.nombre || assignedRoute.name}</strong></p>
                  <p>Vehículo: <strong>{userTruck.placa}</strong></p>
                  <p>Paradas: <strong>{getParadasArray(assignedRoute.paradas).length}</strong></p>
                  <button className="btn-start-route" onClick={handleStartRoute}>
                    <div className="btn-start-icon">▶️</div>
                    <span>Iniciar Ruta</span>
                  </button>
                  <p className="start-route-hint">El cronómetro comenzará cuando inicies la ruta</p>
                </div>
              </div>
            )}

            {/* KPIs del conductor (solo visible cuando la ruta está iniciada) */}
            {routeStarted && (
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
                  <div className="kpi-value">{completedStops.length}/{getParadasArray(assignedRoute.paradas).length}</div>
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
            )}

            {/* Timeline de la ruta (solo visible cuando la ruta está iniciada) */}
            {routeStarted && (
            <div className="route-timeline-section">
              <RouteTimeline
                route={{
                  ...assignedRoute,
                  estado: progressPercentage === 100 ? 'completada' : progressPercentage > 0 ? 'en progreso' : 'activa',
                  paradas: getParadasArray(assignedRoute.paradas).map((parada, index) => {
                    const completedStop = completedStops.find(stop => stop.index === index);
                    return {
                      ...parada,
                      completada: !!completedStop,
                      category: completedStop?.category,
                      timestamp: completedStop?.timestamp,
                      index: index
                    };
                  }),
                  paradaActual: currentStop,
                  duracionEstimada: assignedRoute.tiempo_estimado || assignedRoute.tiempoEstimado,
                  distancia: assignedRoute.distancia_total || assignedRoute.distanciaTotal
                }}
                onCompleteStop={handleCompleteStop}
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
            )}

            {/* Mapa del conductor (siempre visible) */}
            <div className="conductor-map-section">
              <div className="card">
                <div className="card__body">
                  <h3><MapPin size={20} /> Mi Ubicación en Tiempo Real</h3>
                  <div className="map-container-large">
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
          currentStop={pendingStopIndex !== null ? (() => {
            const paradas = getParadasArray(assignedRoute?.paradas);
            const parada = paradas[pendingStopIndex];
            return parada?.direccion || parada?.nombre || `Parada ${pendingStopIndex + 1}`;
          })() : ''}
        />

        {/* Modal de completación de ruta */}
        <RouteCompletionModal
          isOpen={showCompletionModal}
          routeData={completionReportData}
          riskReports={completionReportData?.reportes_riesgo_ids?.length > 0
            ? reports.filter(r => completionReportData.reportes_riesgo_ids.includes(r.id))
            : []
          }
          onConfirm={handleConfirmReport}
          onCancel={handleCancelReport}
        />
      </div>
    </div>
  );
};

export default ConductorDashboard; 