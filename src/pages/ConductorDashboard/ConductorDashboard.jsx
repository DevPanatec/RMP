import { useState, useEffect } from 'react';
import WeightModal from '../../components/WeightModal/WeightModal';
import RouteCompletionModal from '../../components/RouteCompletionModal/RouteCompletionModal';
import MapComponent from '../../components/Map/MapComponent';
import { useRiskReports } from '../../context/RiskReportsContext';
import { useFleet } from '../../context/FleetContext';
import { useRoutes } from '../../context/RoutesContext';
import { useSchedule } from '../../context/ScheduleContext';
import { useReports } from '../../context/ReportsContext';
// import supabaseClient from '../../utils/supabaseClient'; // Removed: Migrated to Convex
import {
  Truck, LogOut, Download, Map, Clock, AlertTriangle,
  ClipboardList, Package, TrendingUp, FileText, MapPin,
  CheckCircle, Calendar, Loader, Wrench, AlertOctagon, X
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
  const { addReport, getReportsByDriver, loading: reportsLoading, reports } = useRiskReports();
  const { vehicles, loading: vehiclesLoading } = useFleet();
  const { routes, loading: routesLoading } = useRoutes();
  const { assignments, loading: assignmentsLoading } = useSchedule();
  const { saveRouteCompletionReport } = useReports();

  // Helper to get assignments by conductor
  const getAssignmentsByConductor = (conductorName) => {
    return assignments.filter(a => a.conductor === conductorName);
  };

  // Helper to get day name from date
  const getDayNameFromDate = (dateString) => {
    const date = new Date(dateString);
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return dayNames[date.getDay()];
  };

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
  const [routeProgressId, setRouteProgressId] = useState(null);
  const [currentGPS, setCurrentGPS] = useState({ lat: null, lng: null });
  const [showSuccessModal, setShowSuccessModal] = useState(null);
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

  console.log('🔍 DEBUG CONDUCTOR:', {
    userName: user.nombre,
    userFullName: user.nombre_completo,
    today,
    todayDayName,
    conductorAssignments,
    assignmentsCount: conductorAssignments.length
  });

  const todayAssignment = conductorAssignments.find(assignment => {
    console.log('🔍 Checking assignment:', assignment.id, assignment.dias_semana, 'includes', todayDayName, '?', assignment.dias_semana?.includes(todayDayName));
    if (!assignment.dias_semana || !Array.isArray(assignment.dias_semana)) return false;
    return assignment.dias_semana.includes(todayDayName);
  });

  console.log('🔍 TODAY ASSIGNMENT:', todayAssignment);

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

  // 🆕 PERMITIR FINALIZAR MANUALMENTE (aunque falten paradas)
  const handleFinalizarRuta = () => {
    const paradas = getParadasArray(assignedRoute.paradas);
    const completadas = completedStops.length;
    const total = paradas.length;
    const faltantes = total - completadas;

    if (faltantes > 0) {
      const confirmar = window.confirm(
        `⚠️ ATENCIÓN\n\n` +
        `Faltan ${faltantes} parada(s) por completar.\n\n` +
        `¿Estás seguro de finalizar la ruta?\n\n` +
        `NOTA: Si alguna parada no se pudo completar, debes crear un Reporte de Riesgo explicando el motivo.`
      );
      if (!confirmar) return;
    }

    generateRouteCompletionReport();
  };

  const generateRouteCompletionReport = () => {
    if (!assignedRoute || !routeStartTime) return;

    const paradas = getParadasArray(assignedRoute.paradas);

    // 🆕 Compilar datos de TODAS las paradas (completadas Y no completadas)
    const todasLasParadas = paradas.map((parada, index) => {
      const completedStop = completedStops.find(stop => stop.index === index);

      if (completedStop) {
        // Parada COMPLETADA
        return {
          index: index,
          orden: index + 1,
          direccion: parada?.direccion || parada?.nombre || `Parada ${index + 1}`,
          categoria_carga: completedStop.category,
          timestamp_llegada: completedStop.timestamp,
          timestamp_salida: completedStop.timestamp,
          gps_completada: null,
          completada: true
        };
      } else {
        // Parada NO COMPLETADA
        return {
          index: index,
          orden: index + 1,
          direccion: parada?.direccion || parada?.nombre || `Parada ${index + 1}`,
          categoria_carga: null,
          timestamp_llegada: null,
          timestamp_salida: null,
          gps_completada: null,
          completada: false,
          motivo_no_completada: 'Ver reportes de riesgo asociados'
        };
      }
    });

    // Separar paradas completadas y no completadas
    const paradasCompletadas = todasLasParadas.filter(p => p.completada);
    const paradasNoCompletadas = todasLasParadas.filter(p => !p.completada);

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
      paradas: todasLasParadas, // 🆕 TODAS las paradas
      paradas_completadas: paradasCompletadas, // Para estadísticas
      paradas_no_completadas: paradasNoCompletadas, // 🆕 NUEVAS
      reportes_riesgo_ids: routeRiskReports.map(r => r.id),
      tipo_ruta: assignedRoute.tipo_servicio || assignedRoute.tipoServicio || 'recoleccion',
      ruta_paradas: paradas,
      porcentaje_completado: Math.round((paradasCompletadas.length / paradas.length) * 100)
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
        observaciones: observaciones,
        tipo_ruta: completionReportData.tipo_ruta,
        nombreRuta: completionReportData.nombreRuta,
        ruta_paradas: completionReportData.ruta_paradas
      };

      await saveCompletedRoute(reportToSave);

      // Limpiar localStorage después de guardar exitosamente
      localStorage.removeItem('conductorRouteState');

      // Cerrar modal y mostrar mensaje de éxito
      setShowCompletionModal(false);
      setShowSuccessModal({
        type: 'success',
        message: 'El reporte de ruta ha sido guardado exitosamente'
      });

      // Reset estado para nueva ruta
      setRouteStarted(false);
      setCompletedStops([]);
      setCurrentStop(0);
      setTimeOnRoute(0);
      setRouteStartTime(null);
      setReportGenerated(false);
    } catch (error) {
      console.error('Error guardando reporte:', error);
      setShowSuccessModal({
        type: 'error',
        message: 'Error al guardar el reporte. Por favor intenta de nuevo.'
      });
    }
  };

  const handleCancelReport = () => {
    setShowCompletionModal(false);
    // No marcamos reportGenerated como false para no volver a mostrar el modal
  };

  const handleSubmitRiskReport = async () => {
    if (!riskReport.categoria || !riskReport.titulo || !riskReport.descripcion) {
      setShowSuccessModal({
        type: 'error',
        message: 'Por favor completa todos los campos obligatorios'
      });
      return;
    }

    try {
      // Mapear prioridad a nivel_severidad
      const prioridadMap = {
        'baja': 'bajo',
        'media': 'medio',
        'alta': 'alto',
        'critica': 'critico'
      };

      // Mapear categoría a tipo_riesgo
      const tipoRiesgoMap = {
        'Mecánico': 'mecanico',
        'Combustible': 'combustible',
        'Equipo de seguridad': 'seguridad',
        'Mantenimiento': 'mantenimiento',
        'Bloqueo de vía': 'bloqueo_via',
        'Seguridad ciudadana': 'seguridad_ciudadana',
        'Condiciones climáticas': 'climatico',
        'Protesta/manifestación': 'manifestacion',
        'Accidente de tránsito': 'accidente'
      };

      // Crear el reporte con datos reales para Supabase
      const reportData = {
        titulo: riskReport.titulo,
        descripcion: riskReport.descripcion,
        tipo_riesgo: tipoRiesgoMap[riskReport.categoria] || 'operacional',
        nivel_severidad: prioridadMap[riskReport.prioridad] || 'medio',
        ubicacion: userTruck ? `Lat: ${userTruck.lat.toFixed(6)}, Lng: ${userTruck.lng.toFixed(6)}` : 'No disponible',
        gps_latitud: userTruck?.lat || null,
        gps_longitud: userTruck?.lng || null,
        empleado_reporta_id: user.id || null,
        vehiculo_id: userTruck?.id || null,
        ruta_id: assignedRoute?.id || null,
        prioridad: riskReport.prioridad === 'critica' ? 10 : riskReport.prioridad === 'alta' ? 7 : riskReport.prioridad === 'media' ? 5 : 3,
        // Campos adicionales para el contexto
        conductor: user.nombre || user.nombre_completo,
        camion: userTruck?.placa || 'N/A'
      };

      // Guardar en Supabase usando el context
      await addReport(reportData);

      setShowSuccessModal({
        type: 'success',
        message: 'Reporte de riesgo enviado correctamente. El administrador será notificado.'
      });

      // Resetear formulario
      setRiskReport({
        tipo: 'interno',
        categoria: '',
        titulo: '',
        descripcion: '',
        prioridad: 'media'
      });
      setShowRiskModal(false);
    } catch (error) {
      console.error('Error guardando reporte de riesgo:', error);
      setShowSuccessModal({
        type: 'error',
        message: 'Error al enviar el reporte. Por favor intenta de nuevo.'
      });
    }
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
              <button className="logout-btn" onClick={handleLogout}>
                <LogOut size={18} /> Cerrar Sesión
              </button>
            </div>
          </div>

          {activeTab === 'ruta' && (
            <div className="card">
              <div className="card__body">
                <div className="no-assignment">
                  <div className="no-assignment-icon">
                    <Calendar size={64} strokeWidth={1.5} />
                  </div>
                  <h3>Sin Asignación para Hoy</h3>
                  <p>No tienes ruta asignada para {todayDayName}. Disfruta tu día libre!</p>

                  {conductorAssignments.length > 0 && (
                    <div style={{ marginTop: '32px', textAlign: 'left' }}>
                      <h4><ClipboardList size={20} /> Tus Asignaciones de la Semana</h4>
                      <ul>
                        {conductorAssignments.map(assignment => (
                          <li key={assignment.id}>
                            <strong>{assignment.ruta?.nombre || 'Ruta sin nombre'}</strong>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                              <span><MapPin size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Días: {assignment.dias_semana?.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}</span>
                              <span><Truck size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Vehículo: {vehicles.find(v => v.id === assignment.vehiculo_id)?.placa || 'No asignado'}</span>
                              <span><Clock size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Horario: {assignment.ruta?.hora_inicio || 'N/A'} - {assignment.ruta?.hora_fin || 'N/A'}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              </div>
            </div>
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
                  <p>Los reportes que crees aparecerán aquí</p>
                </div>
              )}
            </div>
          )}
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
          <div className="header-left">
            <h1>Panel de Conductor</h1>
            {routeStarted && (
              <div className="header-subtitle">
                <Map size={16} /> {assignedRoute.nombre || assignedRoute.name}
              </div>
            )}
          </div>
          <div className="header-actions">
            {routeStarted && (
              <>
                <div className="time-badge">
                  <Clock size={16} />
                  <span>{formatTime(timeOnRoute)}</span>
                </div>
                <button
                  className="btn btn--warning"
                  onClick={() => setShowRiskModal(true)}
                  title="Reportar un riesgo"
                >
                  <AlertTriangle size={16} /> Reportar Riesgo
                </button>
                <button
                  className="btn btn--success"
                  onClick={handleFinalizarRuta}
                  title="Finalizar ruta actual"
                >
                  <CheckCircle size={16} /> Finalizar
                </button>
              </>
            )}
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={18} />
            </button>
          </div>
        </div>



        {activeTab === 'ruta' && (
          <>
            {/* Botón para iniciar ruta */}
            {!routeStarted && (
              <div className="start-route-container">
                <div className="start-route-card">
                  <div className="start-route-header">
                    <div className="start-route-icon-circle">
                      <Map size={40} />
                    </div>
                    <h2>¿Listo para comenzar tu ruta?</h2>
                  </div>

                  <div className="route-details-grid">
                    <div className="detail-item">
                      <div className="detail-icon"><MapPin size={20} /></div>
                      <div className="detail-content">
                        <span className="detail-label">Ruta</span>
                        <strong>{assignedRoute.nombre || assignedRoute.name}</strong>
                      </div>
                    </div>

                    <div className="detail-item">
                      <div className="detail-icon"><Truck size={20} /></div>
                      <div className="detail-content">
                        <span className="detail-label">Vehículo</span>
                        <strong>{userTruck.placa}</strong>
                      </div>
                    </div>

                    <div className="detail-item">
                      <div className="detail-icon"><Package size={20} /></div>
                      <div className="detail-content">
                        <span className="detail-label">Paradas</span>
                        <strong>{getParadasArray(assignedRoute.paradas).length}</strong>
                      </div>
                    </div>
                  </div>

                  <button className="btn-start-route" onClick={handleStartRoute}>
                    <CheckCircle size={20} />
                    <span>Iniciar Ruta</span>
                  </button>

                  <p className="start-route-hint">
                    <Clock size={14} />
                    El cronómetro comenzará cuando inicies la ruta
                  </p>
                </div>
              </div>
            )}

            {/* KPIs del conductor (solo visible cuando la ruta está iniciada) */}
            {routeStarted && (
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-icon"><Truck size={28} /></div>
                <div className="kpi-content">
                  <div className="kpi-value">{userTruck?.placa || 'N/A'}</div>
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
                <h3><AlertTriangle size={20} /> Reportar Riesgo</h3>
                <button className="modal-close" onClick={() => setShowRiskModal(false)}>
                  <X size={20} />
                </button>
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
                      <span><Wrench size={16} /> Interno</span>
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
                      <span><AlertOctagon size={16} /> Externo</span>
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
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>

                <div className="location-info">
                  <p><MapPin size={16} style={{display: 'inline', marginRight: '6px'}} /><strong>Ubicación actual:</strong></p>
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
                  <AlertTriangle size={16} style={{marginRight: '6px'}} />
                  Enviar Reporte
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

        {/* Modal de éxito/error */}
        {showSuccessModal && (
          <div className="modal-overlay" onClick={() => setShowSuccessModal(null)}>
            <div className="success-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className={`success-icon-wrapper ${showSuccessModal.type === 'error' ? 'error' : ''}`}>
                {showSuccessModal.type === 'error' ? (
                  <AlertTriangle size={64} />
                ) : (
                  <CheckCircle size={64} />
                )}
              </div>
              <h2>{showSuccessModal.type === 'error' ? 'Error' : '¡Éxito!'}</h2>
              <p>{showSuccessModal.message || 'Operación completada exitosamente'}</p>
              <button
                className="btn btn--primary"
                onClick={() => setShowSuccessModal(null)}
              >
                Aceptar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConductorDashboard; 