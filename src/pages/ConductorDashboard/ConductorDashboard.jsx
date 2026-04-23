import { useState, useEffect, useMemo, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import WeightModal from '../../components/WeightModal/WeightModal';
import RouteCompletionModal from '../../components/RouteCompletionModal/RouteCompletionModal';
import MapLibreComponent from '../../components/Map/MapLibreComponent';
import { useRiskReports } from '../../context/RiskReportsContext';
import { useFleet } from '../../context/FleetContext';
import { useRoutes } from '../../context/RoutesContext';
import { useSchedule } from '../../context/ScheduleContext';
import { useReports } from '../../context/ReportsContext';
// import supabaseClient from '../../utils/supabaseClient'; // Removed: Migrated to Convex
import {
  Truck, LogOut, Download, Map, Clock, AlertTriangle,
  ClipboardList, Package, TrendingUp, FileText, MapPin,
  CheckCircle, Calendar, Loader, Wrench, AlertOctagon, X,
  Activity, Navigation, Target
} from '../../components/Icons';
import { Badge, ProgressBar } from '../../components/UI';
import { RouteTimeline } from '../../components/Dashboard';
import BottomSheet from '../../components/BottomSheet';
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

  // Route events logging
  const addRouteEvent = useMutation(api.route_events.add);

  // Assignment status update
  const updateAssignmentStatus = useMutation(api.asignaciones.updateEstado);

  // Route progress tracking
  const startRouteProgress = useMutation(api.route_progress.start);
  const updateRouteProgress = useMutation(api.route_progress.update);
  const completeRouteProgress = useMutation(api.route_progress.complete);

  // State for route progress ID
  const [routeProgressId, setRouteProgressId] = useState(null);

  // Helper to get assignments by conductor
  const getAssignmentsByConductor = (conductorName) => {
    if (!conductorName) return [];
    const normalizedName = conductorName.trim();
    return assignments.filter(a => a.conductor_nombre?.trim() === normalizedName);
  };

  // Helper to get day name from date
  const getDayNameFromDate = (dateString) => {
    const date = new Date(dateString + 'T12:00:00'); // Agregar hora para evitar problemas de timezone
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']; // Sin acentos para consistencia
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
  const [currentGPS, setCurrentGPS] = useState({ lat: null, lng: null });
  const [showSuccessModal, setShowSuccessModal] = useState(null);
  const [riskReport, setRiskReport] = useState({
    tipo: 'interno',
    categoria: '',
    titulo: '',
    descripcion: '',
    prioridad: 'media'
  });
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [terminateReason, setTerminateReason] = useState('');
  const [selectedRiskForTermination, setSelectedRiskForTermination] = useState(null);
  const [useRiskAsReason, setUseRiskAsReason] = useState(true);
  const [skipStopData, setSkipStopData] = useState(null);
  const [showNavMenu, setShowNavMenu] = useState(false);

  // Bottom sheet states
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 1024);

  // Auto-hide header on mobile
  const [showMobileHeader, setShowMobileHeader] = useState(true);
  const headerTimeoutRef = useRef(null);

  const triggerShowHeader = () => {
    setShowMobileHeader(true);
    if (headerTimeoutRef.current) clearTimeout(headerTimeoutRef.current);
    headerTimeoutRef.current = setTimeout(() => setShowMobileHeader(false), 3000);
  };

  // Hide header after 3s on mount (mobile)
  useEffect(() => {
    if (isMobileView) {
      headerTimeoutRef.current = setTimeout(() => setShowMobileHeader(false), 3000);
    }
    return () => { if (headerTimeoutRef.current) clearTimeout(headerTimeoutRef.current); };
  }, [isMobileView]);

  // FORCE SCROLL TO TOP on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // Listener para resize (detectar mobile/desktop)
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    console.log('🔍 Checking assignment:', assignment._id || assignment.id, assignment.dias_semana, 'includes', todayDayName, '?', assignment.dias_semana?.includes(todayDayName));
    if (!assignment.dias_semana || !Array.isArray(assignment.dias_semana)) return false;
    return assignment.dias_semana.includes(todayDayName);
  });

  console.log('🔍 TODAY ASSIGNMENT:', todayAssignment);

  // Obtener vehículo y ruta de la asignación de hoy (MEMOIZADOS para evitar re-creación constante)
  const userTruck = useMemo(() => {
    return todayAssignment ? vehicles.find(v => (v._id || v.id) === todayAssignment.vehiculo_id) : null;
  }, [todayAssignment, vehicles]);

  const assignedRoute = useMemo(() => {
    return todayAssignment ? routes.find(r => (r._id || r.id) === todayAssignment.ruta_id) : null;
  }, [todayAssignment, routes]);

  // Ref para evitar stale closure en useEffect
  const assignedRouteRef = useRef(assignedRoute);
  useEffect(() => {
    assignedRouteRef.current = assignedRoute;
  }, [assignedRoute]);

  // CRITICAL: Memoizar el array de camiones para evitar infinite loop en MapComponent
  // Enriquecer con datos de la asignación para que MapComponent pueda mostrar paradas
  const camonesArray = useMemo(() => {
    if (!userTruck) return [];

    // Enriquecer vehículo con datos de asignación y conductor
    const enrichedTruck = {
      ...userTruck,
      conductor: user.nombre || user.nombre_completo,
      conductor_nombre: user.nombre || user.nombre_completo,
      ruta_id: assignedRoute?._id || assignedRoute?.id,
      rutaAsignada: assignedRoute?.nombre,
      ruta_nombre: assignedRoute?.nombre
    };

    return [enrichedTruck];
  }, [
    userTruck?._id,
    userTruck?.id,
    userTruck?.gps_latitud,
    userTruck?.gps_longitud,
    userTruck?.lat,
    userTruck?.lng,
    userTruck?.estado,
    user?.nombre,
    user?.nombre_completo,
    assignedRoute?._id,
    assignedRoute?.id,
    assignedRoute?.nombre
  ]);

  // GPS position used for last route recalculation (to detect significant movement)
  const lastRouteCalcGPS = useRef({ lat: null, lng: null });

  // Helper: Haversine distance in meters between two GPS points
  const gpsDistance = (lat1, lng1, lat2, lng2) => {
    if (!lat1 || !lng1 || !lat2 || !lng2) return Infinity;
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Quantized GPS for route recalculation (changes only when driver moves >150m)
  const [routeGPS, setRouteGPS] = useState({ lat: null, lng: null });

  useEffect(() => {
    if (!currentGPS.lat || !currentGPS.lng) return;
    const dist = gpsDistance(
      lastRouteCalcGPS.current.lat, lastRouteCalcGPS.current.lng,
      currentGPS.lat, currentGPS.lng
    );
    // Recalculate route when moved >150m from last calculation point
    if (dist > 150 || !lastRouteCalcGPS.current.lat) {
      lastRouteCalcGPS.current = { lat: currentGPS.lat, lng: currentGPS.lng };
      setRouteGPS({ lat: currentGPS.lat, lng: currentGPS.lng });
    }
  }, [currentGPS.lat, currentGPS.lng]);

  // Dynamic route: from current GPS to pending stops only (live navigation)
  const rutasArray = useMemo(() => {
    if (!assignedRoute) return [];

    // When route not started OR no GPS: show full static route
    if (!routeStarted || !routeGPS.lat || !routeGPS.lng) {
      return [assignedRoute];
    }

    // Build dynamic route: GPS origin -> pending stops only
    const allParadas = getParadasArray(assignedRoute.paradas);
    const completedIndexes = completedStops.map(s => s.index);
    const pendingParadas = allParadas.filter((_, i) => !completedIndexes.includes(i));

    if (pendingParadas.length === 0) return [assignedRoute];

    // Prepend current GPS position as navigation origin
    const gpsOrigin = {
      lat: routeGPS.lat,
      latitud: routeGPS.lat,
      lng: routeGPS.lng,
      longitud: routeGPS.lng,
      nombre: 'Tu ubicación',
      direccion: 'Tu ubicación',
      _isGpsOrigin: true
    };

    return [{
      ...assignedRoute,
      // Override paradas with GPS origin + pending stops for route line calculation
      paradas: [gpsOrigin, ...pendingParadas],
      // Keep original paradas in a separate field for stop markers
      _paradasOriginales: allParadas
    }];
  }, [
    assignedRoute?._id, assignedRoute?.id, assignedRoute?.paradas,
    routeStarted, routeGPS.lat, routeGPS.lng,
    completedStops.length
  ]);

  // Actualizar GPS actual desde el vehículo del conductor
  useEffect(() => {
    if (userTruck && (userTruck.gps_latitud || userTruck.lat) && (userTruck.gps_longitud || userTruck.lng)) {
      setCurrentGPS({
        lat: userTruck.gps_latitud || userTruck.lat,
        lng: userTruck.gps_longitud || userTruck.lng
      });
    }
  }, [userTruck]);

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
        if (state.date === today && state.assignmentId === (todayAssignment._id || todayAssignment.id)) {
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
        assignmentId: todayAssignment._id || todayAssignment.id,
        routeStarted,
        completedStops,
        timeOnRoute,
        currentStop,
        routeStartTime,
        reportGenerated
      };
      localStorage.setItem('conductorRouteState', JSON.stringify(routeState));
    }
  }, [routeStarted, completedStops, currentStop, routeStartTime, reportGenerated, todayAssignment?._id, todayAssignment?.id, today]);

  // Guardar timeOnRoute periódicamente (cada 30 segundos) para evitar bucle infinito
  useEffect(() => {
    if (!todayAssignment || !routeStarted) return;

    const saveInterval = setInterval(() => {
      const routeState = {
        date: today,
        assignmentId: todayAssignment._id || todayAssignment.id,
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
    const route = assignedRouteRef.current;
    if (!route || !routeStarted || reportGenerated) return;

    const paradas = getParadasArray(route.paradas);
    if (paradas.length === 0) return;

    const progressPercentage = Math.round((completedStops.length / paradas.length) * 100);

    if (progressPercentage === 100) {
      generateRouteCompletionReport();
    }
  }, [completedStops.length, routeStarted, reportGenerated]); // Solo depender del LENGTH de completedStops, no del array completo

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

  // Auto-arrival: detect when driver enters parada geofence radius and trigger WeightModal
  const ARRIVAL_RADIUS_M = 100;
  const arrivalTriggeredRef = useRef(new Set());

  useEffect(() => {
    arrivalTriggeredRef.current.clear();
  }, [assignedRoute?._id, assignedRoute?.id, routeStarted]);

  useEffect(() => {
    if (!routeStarted || !assignedRoute || isModalOpen) return;
    if (currentGPS.lat == null || currentGPS.lng == null) return;

    const paradas = getParadasArray(assignedRoute.paradas);
    if (paradas.length === 0) return;

    const completedIdxs = new Set(completedStops.map(s => s.index));
    const nextIdx = paradas.findIndex((_, i) => !completedIdxs.has(i));
    if (nextIdx < 0) return;
    if (arrivalTriggeredRef.current.has(nextIdx)) return;

    const parada = paradas[nextIdx];
    const pLat = typeof parada.latitud === 'number' ? parada.latitud : parada.lat;
    const pLng = typeof parada.longitud === 'number' ? parada.longitud : parada.lng;
    if (typeof pLat !== 'number' || typeof pLng !== 'number') return;

    const distance = gpsDistance(currentGPS.lat, currentGPS.lng, pLat, pLng);
    if (distance <= ARRIVAL_RADIUS_M) {
      arrivalTriggeredRef.current.add(nextIdx);
      handleCompleteStop(nextIdx);
    }
  }, [currentGPS.lat, currentGPS.lng, routeStarted, completedStops.length, assignedRoute?._id, assignedRoute?.id, isModalOpen]);

  const handleCompleteStop = async (stopIndex) => {
    const paradas = getParadasArray(assignedRoute.paradas);
    const parada = paradas[stopIndex];

    // 📊 Registrar evento: Llegada a Parada
    try {
      const eventData = {
        ruta_id: assignedRoute._id || assignedRoute.id,
        asignacion_id: todayAssignment._id || todayAssignment.id,
        conductor_id: user._id || user.id,
        conductor_nombre: user.nombre || user.nombre_completo,
        vehiculo_id: userTruck._id || userTruck.id,
        vehiculo_placa: userTruck.placa,
        ruta_nombre: assignedRoute.nombre,
        tipo_evento: "parada_llegada",
        parada_nombre: parada.direccion || parada.nombre,
        parada_orden: parada.orden,
        parada_index: stopIndex,
      };

      // Solo agregar GPS si tiene valores válidos (no null)
      if (currentGPS.lat != null && currentGPS.lng != null) {
        eventData.gps_latitud = currentGPS.lat;
        eventData.gps_longitud = currentGPS.lng;
      }

      await addRouteEvent(eventData);
      console.log(`✅ Evento registrado: Llegada a parada ${stopIndex}`);
    } catch (error) {
      console.error('❌ Error registrando evento de llegada:', error);
    }

    setPendingStopIndex(stopIndex);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPendingStopIndex(null);
  };

  const handleWeightConfirm = async (category) => {
    const timestamp = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const paradas = getParadasArray(assignedRoute.paradas);
    const parada = paradas[pendingStopIndex];

    const newCompletedStop = {
      index: pendingStopIndex,
      category: category,
      timestamp: timestamp,
      parada_nombre: parada.direccion || parada.nombre,
      parada_orden: parada.orden
    };

    const updatedCompletedStops = [...completedStops, newCompletedStop];
    setCompletedStops(updatedCompletedStops);

    setCurrentStop(prev => prev + 1);
    setIsModalOpen(false);

    // 📍 Actualizar route_progress con la parada completada
    if (routeProgressId) {
      try {
        await updateRouteProgress({
          id: routeProgressId,
          paradas_completadas: updatedCompletedStops,
          posicion_actual: {
            parada_index: pendingStopIndex,
            lat: currentGPS.lat,
            lng: currentGPS.lng
          }
        });
        console.log('✅ Route progress actualizado');
      } catch (error) {
        console.error('❌ Error actualizando route progress:', error);
      }
    }

    // 📊 Registrar evento: Parada Completada / Salida
    try {
      const eventData = {
        ruta_id: assignedRoute._id || assignedRoute.id,
        asignacion_id: todayAssignment._id || todayAssignment.id,
        conductor_id: user._id || user.id,
        conductor_nombre: user.nombre || user.nombre_completo,
        vehiculo_id: userTruck._id || userTruck.id,
        vehiculo_placa: userTruck.placa,
        ruta_nombre: assignedRoute.nombre,
        tipo_evento: "parada_completada",
        parada_nombre: parada.direccion || parada.nombre,
        parada_orden: parada.orden,
        parada_index: pendingStopIndex,
        categoria_carga: category,
      };

      // Solo agregar GPS si tiene valores válidos (no null)
      if (currentGPS.lat != null && currentGPS.lng != null) {
        eventData.gps_latitud = currentGPS.lat;
        eventData.gps_longitud = currentGPS.lng;
      }

      await addRouteEvent(eventData);
      console.log(`✅ Evento registrado: Parada completada - ${category}`);
    } catch (error) {
      console.error('❌ Error registrando evento de parada completada:', error);
    }

    setPendingStopIndex(null);
  };

  const handleSkipStop = () => {
    console.log('⏭️ handleSkipStop ejecutado - pendingStopIndex:', pendingStopIndex);

    // Capturar datos de la parada actual para vincular con el reporte de riesgo
    const paradas = getParadasArray(assignedRoute.paradas);
    const parada = paradas[pendingStopIndex];

    const skipData = {
      index: pendingStopIndex,
      nombre: parada.direccion || parada.nombre || `Parada ${pendingStopIndex + 1}`,
      orden: parada.orden || pendingStopIndex + 1,
      lat: currentGPS.lat,
      lng: currentGPS.lng
    };

    console.log('⏭️ skipData creado:', skipData);

    // Guardar datos de parada para vincular con el reporte
    setSkipStopData(skipData);
    console.log('⏭️ setSkipStopData llamado con:', skipData);

    // Cerrar modal de peso y abrir modal de riesgo
    setIsModalOpen(false);
    setPendingStopIndex(null);
    setShowRiskModal(true);
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

  // Determinar si la ruta de hoy ya fue completada
  const isRouteCompleted = todayAssignment?.estado === 'completada' && !routeStarted;

  // Calcular próximas rutas (otros días de la semana)
  const upcomingAssignments = useMemo(() => {
    if (!isRouteCompleted) return [];
    const dayOrder = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const todayIndex = dayOrder.indexOf(todayDayName);

    // Buscar asignaciones que incluyan días después de hoy
    const upcoming = [];
    conductorAssignments.forEach(assignment => {
      if (!assignment.dias_semana) return;
      const futureDays = assignment.dias_semana.filter(d => {
        const dIndex = dayOrder.indexOf(d);
        return dIndex > todayIndex;
      });
      if (futureDays.length > 0) {
        const route = routes.find(r => (r._id || r.id) === assignment.ruta_id);
        const vehicle = vehicles.find(v => (v._id || v.id) === assignment.vehiculo_id);
        upcoming.push({
          ...assignment,
          nextDay: futureDays.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b))[0],
          routeName: route?.nombre || route?.name || 'Ruta sin nombre',
          vehiclePlaca: vehicle?.placa || 'N/A',
          paradasCount: getParadasArray(route?.paradas).length
        });
      }
    });

    return upcoming.sort((a, b) => {
      const aIdx = dayOrder.indexOf(a.nextDay);
      const bIdx = dayOrder.indexOf(b.nextDay);
      return aIdx - bIdx;
    });
  }, [isRouteCompleted, conductorAssignments, todayDayName, routes, vehicles]);

  const handleLogout = () => {
    // Limpiar localStorage antes de cerrar sesión
    localStorage.removeItem('conductorRouteState');
    onLogout();
  };

  const handleStartRoute = async () => {
    // ⚠️ VERIFICAR: No permitir iniciar si la asignación ya está completada
    if (todayAssignment?.estado === 'completada') {
      alert('⚠️ Esta ruta ya fue completada anteriormente. No se puede volver a iniciar.');
      return;
    }

    const startTime = new Date().toISOString();
    setRouteStartTime(startTime);
    setRouteStarted(true);

    // Actualizar estado de la asignación a "en_progreso"
    try {
      await updateAssignmentStatus({
        id: todayAssignment._id || todayAssignment.id,
        estado: "en_progreso"
      });
      console.log('✅ Asignación marcada como en progreso');
    } catch (error) {
      console.error('❌ Error actualizando estado de asignación:', error);
    }

    // 📍 Crear registro de progreso de ruta
    try {
      const paradas = getParadasArray(assignedRoute.paradas);
      const progressId = await startRouteProgress({
        conductor_id: user._id || user.id,
        conductor_nombre: user.nombre || user.nombre_completo,
        ruta_id: assignedRoute._id || assignedRoute.id,
        vehiculo_id: userTruck._id || userTruck.id,
        asignacion_id: todayAssignment._id || todayAssignment.id,
        total_paradas: paradas.length,
        tipo_ruta: assignedRoute.tipo_servicio || 'recoleccion'
      });
      setRouteProgressId(progressId);
      console.log('✅ Route progress creado:', progressId);
    } catch (error) {
      console.error('❌ Error creando route progress:', error);
    }

    // 📊 Registrar evento: Ruta Iniciada
    try {
      const eventData = {
        ruta_id: assignedRoute._id || assignedRoute.id,
        asignacion_id: todayAssignment._id || todayAssignment.id,
        conductor_id: user._id || user.id,
        conductor_nombre: user.nombre || user.nombre_completo,
        vehiculo_id: userTruck._id || userTruck.id,
        vehiculo_placa: userTruck.placa,
        ruta_nombre: assignedRoute.nombre,
        tipo_evento: "ruta_iniciada",
      };

      // Solo agregar GPS si tiene valores válidos (no null)
      if (currentGPS.lat != null && currentGPS.lng != null) {
        eventData.gps_latitud = currentGPS.lat;
        eventData.gps_longitud = currentGPS.lng;
      }

      await addRouteEvent(eventData);
      console.log('✅ Evento registrado: Ruta iniciada');
    } catch (error) {
      console.error('❌ Error registrando evento de inicio:', error);
    }
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
        // Parada encontrada en completedStops (puede estar completada o no completada)
        return {
          index: index,
          orden: index + 1,
          direccion: completedStop.direccion || parada?.direccion || parada?.nombre || `Parada ${index + 1}`,
          categoria_carga: completedStop.category,
          timestamp_llegada: completedStop.timestamp,
          timestamp_salida: completedStop.timestamp,
          gps_completada: null,
          completada: completedStop.completada !== false, // 🔥 USAR EL VALOR REAL!!!
          motivo_no_completada: completedStop.motivo_no_completada, // 🔥 AGREGAR MOTIVO
          reporte_riesgo_id: completedStop.reporte_riesgo_id // 🔥 AGREGAR ID DE REPORTE
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

    // Obtener reportes de riesgo creados durante esta ruta POR ESTE CONDUCTOR
    const conductorName = (user.nombre || user.nombre_completo || '').trim().toLowerCase();
    const routeRiskReports = reports.filter(report => {
      const reportDate = new Date(report.fechaCreacion || report.fecha_reporte);
      const routeStart = new Date(routeStartTime);
      const reportConductor = (report.conductor || report.conductor_nombre || '').trim().toLowerCase();
      return reportDate >= routeStart && reportConductor === conductorName;
    });

    const reportData = {
      ruta_id: assignedRoute._id || assignedRoute.id,
      asignacion_id: todayAssignment?._id || todayAssignment?.id,
      ruta_nombre: assignedRoute.nombre || `Ruta ${assignedRoute._id || assignedRoute.id}`,
      conductor_nombre: user.nombre || user.nombre_completo,
      conductor_id: user._id || user.id || undefined,
      vehiculo_placa: userTruck?.placa || 'N/A', // FIXED: snake_case
      vehiculo_id: userTruck?._id || userTruck?.id || undefined,
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
        conductor_nombre: completionReportData.conductor_nombre, // FIXED: usar snake_case
        conductor_id: completionReportData.conductor_id,
        vehiculo_placa: completionReportData.vehiculo_placa, // FIXED: usar snake_case
        vehiculo_id: completionReportData.vehiculo_id,
        fecha_inicio: completionReportData.fechaInicio,
        fecha_completacion: completionReportData.fechaCompletacion,
        tiempo_total_segundos: completionReportData.tiempoTotal,
        paradas_completadas: completionReportData.paradas,
        reportes_riesgo_ids: completionReportData.reportes_riesgo_ids,
        observaciones: observaciones,
        tipo_ruta: completionReportData.tipo_ruta,
        ruta_nombre: completionReportData.ruta_nombre, // FIXED: usar snake_case
        ruta_paradas: completionReportData.ruta_paradas
      };

      await saveRouteCompletionReport(reportToSave);

      // 🔄 Actualizar estado de la asignación a "completada"
      try {
        await updateAssignmentStatus({
          id: completionReportData.asignacion_id,
          estado: "completada"
        });
        console.log('✅ Asignación marcada como completada');
      } catch (error) {
        console.error('❌ Error actualizando estado de asignación:', error);
      }

      // 📍 Marcar route_progress como completado
      if (routeProgressId) {
        try {
          await completeRouteProgress({
            id: routeProgressId
          });
          console.log('✅ Route progress completado');
        } catch (error) {
          console.error('❌ Error completando route progress:', error);
        }
      }

      // 📊 Registrar evento: Ruta Completada
      try {
        const eventData = {
          ruta_id: completionReportData.ruta_id,
          asignacion_id: completionReportData.asignacion_id,
          conductor_id: completionReportData.conductor_id,
          conductor_nombre: completionReportData.conductor_nombre,
          vehiculo_id: completionReportData.vehiculo_id,
          vehiculo_placa: completionReportData.vehiculo_placa,
          ruta_nombre: completionReportData.ruta_nombre,
          tipo_evento: "ruta_completada",
          detalles: `Completada con ${completionReportData.paradas_completadas.length} paradas. ${observaciones}`,
        };

        // Solo agregar GPS si tiene valores válidos (no null)
        if (currentGPS.lat != null && currentGPS.lng != null) {
          eventData.gps_latitud = currentGPS.lat;
          eventData.gps_longitud = currentGPS.lng;
        }

        await addRouteEvent(eventData);
        console.log('✅ Evento registrado: Ruta completada');
      } catch (error) {
        console.error('❌ Error registrando evento de ruta completada:', error);
      }

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

  const handleTerminarRutaAnticipadamente = async () => {
    // Obtener reportes de riesgo creados durante esta ruta POR ESTE CONDUCTOR
    const conductorName2 = (user.nombre || user.nombre_completo || '').trim().toLowerCase();
    const routeRiskReports = reports.filter(report => {
      const reportDate = new Date(report.fechaCreacion || report.fecha_reporte);
      const routeStart = new Date(routeStartTime);
      const reportConductor = (report.conductor || report.conductor_nombre || '').trim().toLowerCase();
      return reportDate >= routeStart && reportConductor === conductorName2;
    });

    // Usar el último reporte de riesgo como motivo si existe
    let finalReason = terminateReason;
    if (useRiskAsReason && routeRiskReports.length > 0) {
      const latestRisk = routeRiskReports[routeRiskReports.length - 1];
      finalReason = `${latestRisk.titulo} - ${latestRisk.descripcion}`;
    }

    if (!finalReason || !finalReason.trim()) {
      setShowSuccessModal({
        type: 'error',
        message: 'Por favor indica el motivo de la terminación anticipada'
      });
      return;
    }

    // Generar reporte parcial
    const paradas = getParadasArray(assignedRoute.paradas);

    const todasLasParadas = paradas.map((parada, index) => {
      const completedStop = completedStops.find(stop => stop.index === index);

      if (completedStop) {
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
        return {
          index: index,
          orden: index + 1,
          direccion: parada?.direccion || parada?.nombre || `Parada ${index + 1}`,
          categoria_carga: null,
          timestamp_llegada: null,
          timestamp_salida: null,
          gps_completada: null,
          completada: false,
          motivo_no_completada: finalReason
        };
      }
    });

    const paradasCompletadas = todasLasParadas.filter(p => p.completada);
    const paradasNoCompletadas = todasLasParadas.filter(p => !p.completada);

    const reportData = {
      ruta_id: assignedRoute._id || assignedRoute.id,
      asignacion_id: todayAssignment?._id || todayAssignment?.id,
      ruta_nombre: assignedRoute.nombre || `Ruta ${assignedRoute._id || assignedRoute.id}`,
      conductor_nombre: user.nombre || user.nombre_completo,
      conductor_id: user._id || user.id || undefined,
      vehiculo_placa: userTruck?.placa || 'N/A',
      vehiculo_id: userTruck?._id || userTruck?.id || undefined,
      fechaInicio: routeStartTime,
      fechaCompletacion: new Date().toISOString(),
      tiempoTotal: timeOnRoute,
      paradas: todasLasParadas,
      paradas_completadas: paradasCompletadas,
      paradas_no_completadas: paradasNoCompletadas,
      reportes_riesgo_ids: routeRiskReports.map(r => r.id),
      tipo_ruta: assignedRoute.tipo_servicio || assignedRoute.tipoServicio || 'recoleccion',
      ruta_paradas: paradas,
      porcentaje_completado: Math.round((paradasCompletadas.length / paradas.length) * 100),
      terminacion_anticipada: true,
      motivo_terminacion: finalReason
    };

    const reportToSave = {
      ruta_id: reportData.ruta_id,
      asignacion_id: reportData.asignacion_id,
      conductor_nombre: reportData.conductor_nombre,
      conductor_id: reportData.conductor_id,
      vehiculo_placa: reportData.vehiculo_placa,
      vehiculo_id: reportData.vehiculo_id,
      fecha_inicio: reportData.fechaInicio,
      fecha_completacion: reportData.fechaCompletacion,
      tiempo_total_segundos: reportData.tiempoTotal,
      paradas_completadas: reportData.paradas,
      reportes_riesgo_ids: reportData.reportes_riesgo_ids,
      observaciones: `⚠️ TERMINACIÓN ANTICIPADA\n\nMotivo: ${finalReason}\n\nParadas completadas: ${paradasCompletadas.length}/${paradas.length} (${reportData.porcentaje_completado}%)`,
      tipo_ruta: reportData.tipo_ruta,
      ruta_nombre: reportData.ruta_nombre,
      ruta_paradas: reportData.ruta_paradas,
      terminacion_anticipada: true,
      motivo_terminacion: finalReason
    };

    try {
      await saveRouteCompletionReport(reportToSave);

      // Actualizar estado de la asignación a "completada" (aunque sea anticipada)
      try {
        await updateAssignmentStatus({
          id: reportData.asignacion_id,
          estado: "completada"
        });
      } catch (error) {
        console.error('❌ Error actualizando estado de asignación:', error);
      }

      // Marcar route_progress como completado
      if (routeProgressId) {
        try {
          await completeRouteProgress({
            id: routeProgressId
          });
        } catch (error) {
          console.error('❌ Error completando route progress:', error);
        }
      }

      // Registrar evento
      try {
        const eventData = {
          ruta_id: reportData.ruta_id,
          asignacion_id: reportData.asignacion_id,
          conductor_id: reportData.conductor_id,
          conductor_nombre: reportData.conductor_nombre,
          vehiculo_id: reportData.vehiculo_id,
          vehiculo_placa: reportData.vehiculo_placa,
          ruta_nombre: reportData.ruta_nombre,
          tipo_evento: "ruta_terminada_anticipadamente",
          detalles: `Terminada anticipadamente: ${finalReason}. Paradas completadas: ${paradasCompletadas.length}/${paradas.length}`,
        };

        if (currentGPS.lat != null && currentGPS.lng != null) {
          eventData.gps_latitud = currentGPS.lat;
          eventData.gps_longitud = currentGPS.lng;
        }

        await addRouteEvent(eventData);
      } catch (error) {
        console.error('❌ Error registrando evento:', error);
      }

      // Limpiar estado
      localStorage.removeItem('conductorRouteState');
      setShowTerminateModal(false);
      setShowSuccessModal({
        type: 'success',
        message: 'La ruta ha sido terminada anticipadamente. El reporte ha sido guardado.'
      });

      // Reset
      setRouteStarted(false);
      setCompletedStops([]);
      setCurrentStop(0);
      setTimeOnRoute(0);
      setRouteStartTime(null);
      setReportGenerated(false);
      setTerminateReason('');
      setSelectedRiskForTermination(null);
    } catch (error) {
      console.error('Error guardando terminación anticipada:', error);
      setShowSuccessModal({
        type: 'error',
        message: 'Error al guardar. Por favor intenta de nuevo.'
      });
    }
  };

  const handleSubmitRiskReport = async () => {
    console.log('🚨 handleSubmitRiskReport - skipStopData:', skipStopData);

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

      // Crear el reporte con datos reales para Convex
      const reportData = {
        titulo: riskReport.titulo,
        descripcion: riskReport.descripcion,
        tipo_riesgo: tipoRiesgoMap[riskReport.categoria] || 'operacional',
        nivel_severidad: prioridadMap[riskReport.prioridad] || 'medio',
        prioridad: riskReport.prioridad === 'critica' ? 10 : riskReport.prioridad === 'alta' ? 7 : riskReport.prioridad === 'media' ? 5 : 3,
        // Campos desnormalizados
        conductor_nombre: user.nombre || user.nombre_completo || 'Conductor Desconocido',
        vehiculo_placa: userTruck?.placa || 'N/A'
      };

      // 🆕 Si viene de skipStopData, agregar datos de parada
      if (skipStopData) {
        reportData.parada_nombre = skipStopData.nombre;
        reportData.parada_orden = skipStopData.orden;
        reportData.parada_index = skipStopData.index;
        console.log('🔗 Vinculando reporte con parada:', skipStopData);
      }

      // Agregar campos opcionales solo si tienen valores válidos (no null ni undefined)
      if (userTruck) {
        const lat = userTruck.gps_latitud || userTruck.lat;
        const lng = userTruck.gps_longitud || userTruck.lng;

        if (lat != null && lng != null) {
          reportData.ubicacion = `Lat: ${lat}, Lng: ${lng}`;
          reportData.gps_latitud = lat;
          reportData.gps_longitud = lng;
        } else {
          reportData.ubicacion = 'GPS no disponible';
        }

        const vehiculoId = userTruck._id || userTruck.id;
        if (vehiculoId) {
          reportData.vehiculo_id = vehiculoId;
        }
      } else {
        reportData.ubicacion = 'No disponible';
      }

      const rutaId = assignedRoute?._id || assignedRoute?.id;
      if (rutaId) {
        reportData.ruta_id = rutaId;
      }

      const perfilId = user._id || user.id;
      if (perfilId) {
        reportData.perfil_usuario_id = perfilId;
      }

      console.log('📊 Enviando reporte de riesgo:', reportData);

      // Guardar usando el context
      const reportId = await addReport(reportData);

      // 🆕 Si viene de skipStopData, marcar parada como no completada y avanzar
      if (skipStopData) {
        const timestamp = new Date().toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit'
        });

        const skippedStop = {
          index: skipStopData.index,
          completada: false,
          direccion: skipStopData.nombre, // 🆕 Campo que usa RouteReportDetailModal
          parada_nombre: skipStopData.nombre,
          parada_orden: skipStopData.orden,
          motivo_no_completada: `${riskReport.titulo} - ${riskReport.descripcion}`,
          reporte_riesgo_id: reportId,
          timestamp: timestamp,
          // Datos de GPS en el momento de saltar
          gps_saltada: skipStopData.lat && skipStopData.lng ? {
            lat: skipStopData.lat,
            lng: skipStopData.lng
          } : null
        };

        const updatedCompletedStops = [...completedStops, skippedStop];
        setCompletedStops(updatedCompletedStops);
        setCurrentStop(prev => prev + 1);

        console.log('⏭️ Parada marcada como no completada:', skippedStop);

        // Actualizar route_progress si existe
        if (routeProgressId) {
          try {
            await updateRouteProgress({
              id: routeProgressId,
              paradas_completadas: updatedCompletedStops,
              posicion_actual: {
                parada_index: skipStopData.index,
                lat: skipStopData.lat,
                lng: skipStopData.lng
              }
            });
            console.log('✅ Route progress actualizado con parada saltada');
          } catch (error) {
            console.error('❌ Error actualizando route progress:', error);
          }
        }

        // Limpiar skipStopData
        setSkipStopData(null);

        setShowSuccessModal({
          type: 'success',
          message: 'Reporte creado y parada marcada como no completada. Continuando con la siguiente parada.'
        });
      } else {
        setShowSuccessModal({
          type: 'success',
          message: 'Reporte de riesgo enviado correctamente. El administrador será notificado.'
        });
      }

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
      <div className="dashboard-container conductor-dashboard">
        <div className="app-bar">
          <div className="app-bar__header">
            <div className="app-bar__brand">
              <img src="/icons/modules/Logo principal.png" alt="RMP Logo" className="app-bar__logo" />
            </div>
            <div className="app-bar__actions">
              <div className="app-bar__status">
                <Activity size={16} />
                <span>{user.nombre}</span>
              </div>
              <button className="app-bar__logout" onClick={handleLogout}>
                <LogOut size={18} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
          <nav className="top-nav">
            <button
              className={`top-nav__tab ${activeTab === 'ruta' ? 'active' : ''}`}
              onClick={() => setActiveTab('ruta')}
            >
              <Map strokeWidth={1.5} size={18} />
              <span>Mi Ruta</span>
            </button>
            <button
              className={`top-nav__tab ${activeTab === 'reportes' ? 'active' : ''}`}
              onClick={() => setActiveTab('reportes')}
            >
              <ClipboardList strokeWidth={1.5} size={18} />
              <span>Mis Reportes</span>
            </button>
          </nav>
        </div>

        <main className="main-content">

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
                          <li key={assignment._id || assignment.id}>
                            <strong>{assignment.ruta?.nombre || 'Ruta sin nombre'}</strong>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                              <span><MapPin size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Días: {assignment.dias_semana?.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}</span>
                              <span><Truck size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Vehículo: {vehicles.find(v => (v._id || v.id) === assignment.vehiculo_id)?.placa || 'No asignado'}</span>
                              <span><Clock size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Horario: {assignment.hora_inicio || assignment.ruta?.hora_inicio || 'N/A'} - {assignment.hora_fin || assignment.ruta?.hora_fin || 'N/A'}</span>
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
                    <div key={reporte._id || reporte.id} className="report-card">
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
        </main>
      </div>
    );
  }

  // Validar que la ruta existe (la asignación tiene ruta_id pero la ruta no se encuentra)
  if (!assignedRoute) {
    return (
      <div className="dashboard-container conductor-dashboard">
        <div className="app-bar">
          <div className="app-bar__header">
            <div className="app-bar__brand">
              <img src="/icons/modules/Logo principal.png" alt="RMP Logo" className="app-bar__logo" />
            </div>
            <div className="app-bar__actions">
              <button className="app-bar__logout" onClick={handleLogout}>
                <LogOut size={18} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
        <main className="main-content">
          <div className="no-assignment">
            <div className="no-assignment-icon">
              <AlertTriangle size={80} />
            </div>
            <h2>Error: Ruta no encontrada</h2>
            <p>Tienes una asignación pero la ruta asociada no existe en el sistema.</p>
            <p>
              <strong>ID de Ruta:</strong> {todayAssignment?.ruta_id}<br />
              <strong>Asignación:</strong> {todayAssignment?._id}
            </p>
            <p className="no-assignment-help">
              Por favor contacta al administrador para resolver este problema.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const progressPercentage = getProgressPercentage();

  return (
    <div className={`dashboard-container conductor-dashboard${isMobileView && activeTab === 'ruta' ? ' conductor-dashboard--map-fullscreen' : ''}`}>
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
            <span>📱 Instala RMP en tu dispositivo</span>
            <button className="install-btn" onClick={installPWA}>
              <Download size={16} /> Instalar App
            </button>
          </div>
        </div>
      )}

      <div className="app-bar">
        <div className="app-bar__header">
          <div className="app-bar__brand">
            <img src="/icons/modules/Logo principal.png" alt="RMP Logo" className="app-bar__logo" />
          </div>
          <div className="app-bar__actions">
            {routeStarted && (
              <>
                <div className="time-badge">
                  <Clock size={16} />
                  <span>{formatTime(timeOnRoute)}</span>
                </div>
                <button
                  className="btn btn--warning btn--sm"
                  onClick={() => setShowRiskModal(true)}
                  title="Reportar un riesgo"
                >
                  <AlertTriangle size={16} /> Reportar Riesgo
                </button>
                <button
                  className="btn btn--sm"
                  onClick={() => setShowTerminateModal(true)}
                  title="Terminar ruta anticipadamente"
                  style={{ background: 'var(--color-error)', color: 'white', border: 'none' }}
                >
                  <X size={16} /> Terminar
                </button>
                <button
                  className="btn btn--success btn--sm"
                  onClick={handleFinalizarRuta}
                  title="Finalizar ruta actual"
                >
                  <CheckCircle size={16} /> Finalizar
                </button>
              </>
            )}
            <div className="app-bar__status">
              <Activity size={16} />
              <span>{user.nombre}</span>
            </div>
            <button className="app-bar__logout" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Salir</span>
            </button>
          </div>
        </div>
        <nav className="top-nav">
          <button
            className={`top-nav__tab ${activeTab === 'ruta' ? 'active' : ''}`}
            onClick={() => setActiveTab('ruta')}
          >
            <Map strokeWidth={1.5} size={18} />
            <span>Mi Ruta</span>
          </button>
          <button
            className={`top-nav__tab ${activeTab === 'reportes' ? 'active' : ''}`}
            onClick={() => setActiveTab('reportes')}
          >
            <ClipboardList strokeWidth={1.5} size={18} />
            <span>Mis Reportes</span>
          </button>
        </nav>
      </div>

      <main className="main-content">

        {activeTab === 'ruta' && (
          <>
            {/* Desktop: Side panel with route info, KPIs, stops */}
            {!isMobileView && (
              <div className="conductor-desktop-panel">
                {/* Route info header */}
                <div className="desktop-panel__route-info">
                  <h2 className="desktop-panel__route-name">
                    <MapPin size={18} />
                    {assignedRoute.nombre || assignedRoute.name}
                  </h2>
                  <div className="desktop-panel__route-chips">
                    <span className="desktop-panel__chip"><Truck size={14} /> {userTruck.placa}</span>
                    <span className="desktop-panel__chip"><Package size={14} /> {getParadasArray(assignedRoute.paradas).length} paradas</span>
                  </div>

                  {/* Start route button or completed state */}
                  {!routeStarted && !isRouteCompleted && (
                    <button className="btn-start-route" onClick={handleStartRoute}>
                      <CheckCircle size={20} />
                      <span>Iniciar Ruta</span>
                    </button>
                  )}

                  {isRouteCompleted && (
                    <div className="route-completed-card">
                      <div className="route-completed-card__header">
                        <CheckCircle size={24} />
                        <div>
                          <h3>Ruta Completada</h3>
                          <p>{assignedRoute.nombre || assignedRoute.name} finalizada exitosamente</p>
                        </div>
                      </div>
                      {upcomingAssignments.length > 0 ? (
                        <div className="route-completed-card__upcoming">
                          <h4><Calendar size={16} /> Próximas Rutas</h4>
                          {upcomingAssignments.map((a, i) => (
                            <div key={i} className="upcoming-route-item">
                              <div className="upcoming-route-item__day">
                                {a.nextDay.charAt(0).toUpperCase() + a.nextDay.slice(1)}
                              </div>
                              <div className="upcoming-route-item__details">
                                <span><MapPin size={13} /> {a.routeName}</span>
                                <span><Truck size={13} /> {a.vehiclePlaca}</span>
                                <span><Package size={13} /> {a.paradasCount} paradas</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="route-completed-card__empty">
                          <Calendar size={20} />
                          <span>No tienes más rutas asignadas esta semana</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Stops preview when route NOT started (fill empty space) */}
                {!routeStarted && !isRouteCompleted && (
                  <div className="desktop-panel__stops">
                    <div className="desktop-panel__stops-header">
                      <MapPin size={14} />
                      <span>Paradas de la Ruta</span>
                    </div>
                    {getParadasArray(assignedRoute.paradas).map((parada, index) => (
                      <div key={index} className="desktop-stop-item">
                        <div className="desktop-stop-item__icon desktop-stop-item__icon--pending">
                          {index + 1}
                        </div>
                        <div className="desktop-stop-item__info">
                          <div className="desktop-stop-item__name">
                            {parada.direccion || parada.nombre || `Parada ${index + 1}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* KPIs when route started */}
                {routeStarted && (
                  <div className="desktop-panel__kpis">
                    <div className="kpi-card">
                      <div className="kpi-icon"><Truck size={16} /></div>
                      <div className="kpi-content">
                        <div className="kpi-value">{userTruck?.placa || 'N/A'}</div>
                        <div className="kpi-label">Camión</div>
                      </div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-icon"><Package size={16} /></div>
                      <div className="kpi-content">
                        <div className="kpi-value">{completedStops.length}/{getParadasArray(assignedRoute.paradas).length}</div>
                        <div className="kpi-label">Paradas</div>
                      </div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-icon"><Clock size={16} /></div>
                      <div className="kpi-content">
                        <div className="kpi-value">{formatTime(timeOnRoute)}</div>
                        <div className="kpi-label">Tiempo</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stops list when route started */}
                {routeStarted && (
                  <>
                    <div className="desktop-panel__stops">
                      <div className="desktop-panel__stops-header">
                        <MapPin size={14} />
                        <span>Paradas de la Ruta</span>
                      </div>
                      {getParadasArray(assignedRoute.paradas).map((parada, index) => {
                        const completedStop = completedStops.find(stop => stop.index === index);
                        const isCompleted = !!completedStop;
                        const isSkipped = completedStop && completedStop.completada === false;
                        const isCurrent = !isCompleted && index === currentStop;
                        const isPending = !isCompleted && index !== currentStop;

                        let itemClass = 'desktop-stop-item';
                        let iconClass = 'desktop-stop-item__icon';
                        if (isSkipped) {
                          itemClass += ' desktop-stop-item--skipped';
                          iconClass += ' desktop-stop-item__icon--skipped';
                        } else if (isCompleted) {
                          itemClass += ' desktop-stop-item--completed';
                          iconClass += ' desktop-stop-item__icon--completed';
                        } else if (isCurrent) {
                          itemClass += ' desktop-stop-item--current';
                          iconClass += ' desktop-stop-item__icon--current';
                        } else {
                          iconClass += ' desktop-stop-item__icon--pending';
                        }

                        return (
                          <div key={index} className={itemClass}>
                            <div className={iconClass}>
                              {isSkipped ? '⚠' : isCompleted ? <CheckCircle size={14} /> : (index + 1)}
                            </div>
                            <div className="desktop-stop-item__info">
                              <div className="desktop-stop-item__name">
                                {parada.direccion || parada.nombre || `Parada ${index + 1}`}
                              </div>
                              {isCompleted && !isSkipped && (
                                <div className="desktop-stop-item__meta">
                                  {completedStop.category} · {completedStop.timestamp}
                                </div>
                              )}
                              {isSkipped && (
                                <div className="desktop-stop-item__meta">
                                  No completada · {completedStop.timestamp}
                                </div>
                              )}
                            </div>
                            {isCurrent && (
                              <button
                                className="desktop-stop-item__action"
                                onClick={() => handleCompleteStop(index)}
                              >
                                Completar
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Progress bar */}
                    <div className="desktop-panel__progress">
                      <div className="desktop-panel__progress-header">
                        <span>Progreso</span>
                        <span className="desktop-panel__progress-value">{progressPercentage}%</span>
                      </div>
                      <div className="desktop-panel__progress-bar">
                        <div
                          className="desktop-panel__progress-fill"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Mapa del conductor */}
            <div className="conductor-map-section" onTouchStart={isMobileView ? triggerShowHeader : undefined} onClick={isMobileView ? triggerShowHeader : undefined}>
              <div className="map-container-large">
                <MapLibreComponent
                  camiones={camonesArray}
                  rutas={rutasArray}
                  userType={user.tipo}
                  showRealTime={true}
                  selectedTruck={userTruck._id || userTruck.id}
                />

                {/* Mobile: Header flotante sobre el mapa (auto-hide) */}
                {isMobileView && (
                  <div className={`map-overlay-header ${showMobileHeader ? '' : 'map-overlay-header--hidden'}`}>
                    <div className="map-overlay-header__brand">
                      <img src="/icons/modules/Logo principal.png" alt="RMP" className="map-overlay-header__logo" />
                    </div>
                    <div className="map-overlay-header__actions">
                      {routeStarted && (
                        <div className="map-overlay-header__timer">
                          <Clock size={14} />
                          <span>{formatTime(timeOnRoute)}</span>
                        </div>
                      )}
                      <button
                        className={`map-overlay-header__tab ${activeTab === 'reportes' ? 'active' : ''}`}
                        onClick={() => setActiveTab('reportes')}
                      >
                        <ClipboardList size={16} />
                      </button>
                      <button className="map-overlay-header__logout" onClick={handleLogout}>
                        <LogOut size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Mobile: KPI chips flotantes (cuando ruta iniciada) */}
                {isMobileView && routeStarted && (
                  <div className="map-overlay-kpis">
                    <div className="map-overlay-kpi-chip">
                      <Truck size={14} />
                      <span>{userTruck?.placa || 'N/A'}</span>
                    </div>
                    <div className="map-overlay-kpi-chip">
                      <Package size={14} />
                      <span>{completedStops.length}/{getParadasArray(assignedRoute.paradas).length}</span>
                    </div>
                    <div className="map-overlay-kpi-chip">
                      <Clock size={14} />
                      <span>{formatTime(timeOnRoute)}</span>
                    </div>
                  </div>
                )}

                {/* Mobile: Botón "Iniciar Ruta" flotante */}
                {isMobileView && !routeStarted && !isRouteCompleted && (
                  <div className="map-overlay-start">
                    <div className="map-overlay-start__info">
                      <span className="map-overlay-start__chip"><MapPin size={14} /> {assignedRoute.nombre || assignedRoute.name}</span>
                      <span className="map-overlay-start__chip"><Package size={14} /> {getParadasArray(assignedRoute.paradas).length} paradas</span>
                    </div>
                    <button
                      className="map-overlay-start__btn"
                      onClick={handleStartRoute}
                    >
                      <CheckCircle size={22} />
                      <span>Iniciar Ruta</span>
                    </button>
                  </div>
                )}

                {/* Botón flotante: centrar en mi ubicación */}
                {isMobileView && (
                  <button
                    className="recenter-fab"
                    onClick={() => {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          window.dispatchEvent(new CustomEvent('recenterMap', {
                            detail: { lat: pos.coords.latitude, lng: pos.coords.longitude, zoom: 15 }
                          }));
                        },
                        () => {
                          // Fallback: center on assigned vehicle if geolocation fails
                          if (userTruck?.gps_latitud && userTruck?.gps_longitud) {
                            window.dispatchEvent(new CustomEvent('recenterMap', {
                              detail: { lat: userTruck.gps_latitud, lng: userTruck.gps_longitud, zoom: 15 }
                            }));
                          }
                        },
                        { enableHighAccuracy: true, timeout: 5000 }
                      );
                    }}
                    title="Centrar en mi ubicación"
                  >
                    <Target size={20} />
                  </button>
                )}

                {/* Botón de navegación externa (Waze / Google Maps) */}
                {assignedRoute && getParadasArray(assignedRoute.paradas).length > 0 && (
                  <div className="nav-app-container">
                    <button
                      className="nav-app-fab"
                      onClick={() => setShowNavMenu(!showNavMenu)}
                      title="Abrir ruta en app de navegación"
                    >
                      <Navigation size={20} />
                    </button>

                    {showNavMenu && (
                      <>
                        <div className="nav-app-backdrop" onClick={() => setShowNavMenu(false)} />
                        <div className="nav-app-menu">
                          <div className="nav-app-menu-header">Abrir ruta en:</div>

                          {/* Google Maps - soporta múltiples waypoints */}
                          <button
                            className="nav-app-option"
                            onClick={() => {
                              const paradas = getParadasArray(assignedRoute.paradas);
                              const pendientes = paradas.filter((p, i) => !completedStops.includes(i) && !p.completada);
                              const stops = pendientes.length > 0 ? pendientes : paradas;

                              if (stops.length === 0) return;

                              const origin = currentGPS.lat && currentGPS.lng
                                ? `${currentGPS.lat},${currentGPS.lng}`
                                : `${stops[0].latitud || stops[0].lat},${stops[0].longitud || stops[0].lng}`;

                              const destination = stops[stops.length - 1];
                              const destStr = `${destination.latitud || destination.lat},${destination.longitud || destination.lng}`;

                              // Google Maps soporta hasta 9 waypoints intermedios
                              const waypoints = stops.slice(0, -1).slice(0, 9)
                                .map(s => `${s.latitud || s.lat},${s.longitud || s.lng}`)
                                .join('|');

                              let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destStr}&travelmode=driving`;
                              if (waypoints) url += `&waypoints=${waypoints}`;

                              window.open(url, '_blank');
                              setShowNavMenu(false);
                            }}
                          >
                            <img src="https://upload.wikimedia.org/wikipedia/commons/a/aa/Google_Maps_icon_%282020%29.svg" alt="Google Maps" width="24" height="24" />
                            <div className="nav-app-option-text">
                              <span className="nav-app-option-name">Google Maps</span>
                              <span className="nav-app-option-desc">Ruta completa con todas las paradas</span>
                            </div>
                          </button>

                          {/* Waze - solo destino único, navega a siguiente parada pendiente */}
                          <button
                            className="nav-app-option"
                            onClick={() => {
                              const paradas = getParadasArray(assignedRoute.paradas);
                              const nextPendingIdx = paradas.findIndex((p, i) => !completedStops.includes(i) && !p.completada);
                              const target = nextPendingIdx >= 0 ? paradas[nextPendingIdx] : paradas[0];

                              const lat = target.latitud || target.lat;
                              const lng = target.longitud || target.lng;

                              window.open(`https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
                              setShowNavMenu(false);
                            }}
                          >
                            <img src="https://upload.wikimedia.org/wikipedia/commons/3/39/Waze_icon.svg" alt="Waze" width="24" height="24" />
                            <div className="nav-app-option-text">
                              <span className="nav-app-option-name">Waze</span>
                              <span className="nav-app-option-desc">Navegar a siguiente parada pendiente</span>
                            </div>
                          </button>

                          <div className="nav-app-menu-footer">
                            {(() => {
                              const paradas = getParadasArray(assignedRoute.paradas);
                              const pendientes = paradas.filter((p, i) => !completedStops.includes(i) && !p.completada);
                              return `${pendientes.length} parada${pendientes.length !== 1 ? 's' : ''} pendiente${pendientes.length !== 1 ? 's' : ''}`;
                            })()}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Desktop: KPIs del conductor (debajo del mapa) */}
            {!isMobileView && routeStarted && (
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-icon"><Truck size={20} /></div>
                <div className="kpi-content">
                  <div className="kpi-value">{userTruck?.placa || 'N/A'}</div>
                  <div className="kpi-label">Mi Camión</div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon"><Package size={20} /></div>
                <div className="kpi-content">
                  <div className="kpi-value">{completedStops.length}/{getParadasArray(assignedRoute.paradas).length}</div>
                  <div className="kpi-label">Paradas</div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon"><Clock size={20} /></div>
                <div className="kpi-content">
                  <div className="kpi-value">{formatTime(timeOnRoute)}</div>
                  <div className="kpi-label">Tiempo</div>
                </div>
              </div>
            </div>
            )}

            {/* Mobile: Bottom sheet de ruta completada con próximas rutas */}
            {isRouteCompleted && isMobileView && (
              <div className={`completed-bottom-sheet ${isDrawerExpanded ? 'completed-bottom-sheet--expanded' : 'completed-bottom-sheet--collapsed'}`}>
                <div
                  className="completed-bottom-sheet__header"
                  onClick={() => setIsDrawerExpanded(!isDrawerExpanded)}
                >
                  <div className="bottom-sheet-handle-bar" />
                  <div className="completed-bottom-sheet__summary">
                    <div className="completed-bottom-sheet__status">
                      <CheckCircle size={20} />
                      <span>Ruta Completada</span>
                    </div>
                    <button className="bottom-sheet-toggle-btn">
                      {isDrawerExpanded
                        ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 15 12 9 18 15"/></svg>
                        : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                      }
                    </button>
                  </div>
                </div>
                <div className="completed-bottom-sheet__content">
                  <div className="completed-bottom-sheet__done-banner">
                    <CheckCircle size={28} />
                    <div>
                      <strong>{assignedRoute.nombre || assignedRoute.name}</strong>
                      <span>Finalizada exitosamente</span>
                    </div>
                  </div>

                  {upcomingAssignments.length > 0 ? (
                    <div className="completed-bottom-sheet__section">
                      <div className="completed-bottom-sheet__section-title">
                        <Calendar size={15} />
                        <span>Próximas Rutas</span>
                      </div>
                      {upcomingAssignments.map((a, i) => (
                        <div key={i} className="completed-upcoming-item">
                          <div className="completed-upcoming-item__day">
                            {a.nextDay.charAt(0).toUpperCase() + a.nextDay.slice(1)}
                          </div>
                          <div className="completed-upcoming-item__info">
                            <span className="completed-upcoming-item__route"><MapPin size={13} /> {a.routeName}</span>
                            <div className="completed-upcoming-item__meta">
                              <span><Truck size={12} /> {a.vehiclePlaca}</span>
                              <span><Package size={12} /> {a.paradasCount} paradas</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="completed-bottom-sheet__empty">
                      <Calendar size={24} />
                      <span>No tienes más rutas asignadas esta semana</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Sheet (mobile) o RouteTimeline (desktop) */}
            {routeStarted && (
              isMobileView ? (
                <BottomSheet
                  isExpanded={isDrawerExpanded}
                  onToggle={setIsDrawerExpanded}
                  stops={getParadasArray(assignedRoute.paradas).map((parada, index) => {
                    const completedStop = completedStops.find(stop => stop.index === index);
                    return {
                      ...parada,
                      completada: !!completedStop,
                      category: completedStop?.category,
                      timestamp: completedStop?.timestamp,
                      index: index
                    };
                  })}
                  completedStops={completedStops}
                  currentStop={currentStop}
                  onCompleteStop={handleCompleteStop}
                  progressPercentage={progressPercentage}
                  isMobile={true}
                  onTerminateRoute={() => setShowTerminateModal(true)}
                  onCompleteRoute={handleFinalizarRuta}
                />
              ) : (
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
                    onViewMap={() => console.log('View map')}
                    onEdit={() => console.log('Edit disabled')}
                    onPause={() => console.log('Pause')}
                    onViewStats={() => console.log('Stats')}
                  />
                </div>
              )
            )}
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
                  <div key={reporte._id || reporte.id} className="report-card">
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
        {showRiskModal && (isMobileView ? (
          /* MOBILE: Bottom sheet */
          <div className="sheet-backdrop" onClick={() => setShowRiskModal(false)}>
            <div className="sheet sheet--risk" onClick={e => e.stopPropagation()}>
              <div className="sheet__handle" />
              <div className="sheet__header">
                <div className="sheet__badge sheet__badge--warning">
                  <AlertTriangle size={14} />
                  <span>Reportar Riesgo</span>
                </div>
                <button className="sheet__close" onClick={() => setShowRiskModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="sheet__body">
                <div className="sheet__section-label">Tipo de Riesgo</div>
                <div className="sheet__radio-row">
                  <button
                    className={`sheet__radio-btn ${riskReport.tipo === 'interno' ? 'sheet__radio-btn--active' : ''}`}
                    onClick={() => setRiskReport(prev => ({...prev, tipo: 'interno'}))}
                  >
                    <Wrench size={16} />
                    <span>Interno</span>
                  </button>
                  <button
                    className={`sheet__radio-btn ${riskReport.tipo === 'externo' ? 'sheet__radio-btn--active' : ''}`}
                    onClick={() => setRiskReport(prev => ({...prev, tipo: 'externo'}))}
                  >
                    <AlertOctagon size={16} />
                    <span>Externo</span>
                  </button>
                </div>

                <div className="sheet__section-label">Categoría</div>
                <select
                  className="sheet__select"
                  value={riskReport.categoria}
                  onChange={e => setRiskReport(prev => ({...prev, categoria: e.target.value}))}
                >
                  <option value="">Seleccionar...</option>
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

                <div className="sheet__section-label">Título</div>
                <input
                  className="sheet__input"
                  type="text"
                  placeholder="Resumen breve del riesgo"
                  value={riskReport.titulo}
                  onChange={e => setRiskReport(prev => ({...prev, titulo: e.target.value}))}
                />

                <div className="sheet__section-label">Descripción</div>
                <textarea
                  className="sheet__textarea"
                  placeholder="Describe el riesgo..."
                  rows={3}
                  value={riskReport.descripcion}
                  onChange={e => setRiskReport(prev => ({...prev, descripcion: e.target.value}))}
                />

                <div className="sheet__location">
                  <MapPin size={14} />
                  <span>GPS: {(userTruck?.gps_latitud || userTruck?.lat || 0).toFixed(4)}, {(userTruck?.gps_longitud || userTruck?.lng || 0).toFixed(4)}</span>
                </div>
              </div>

              <div className="sheet__actions">
                <button className="sheet__btn sheet__btn--primary sheet__btn--warning" onClick={handleSubmitRiskReport}>
                  <AlertTriangle size={16} />
                  Enviar Reporte
                </button>
                <button className="sheet__btn sheet__btn--ghost" onClick={() => { setShowRiskModal(false); setSkipStopData(null); }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* DESKTOP: Modal clásico */
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

                <div className="location-info">
                  <p><MapPin size={16} style={{display: 'inline', marginRight: '6px'}} /><strong>Ubicación actual:</strong></p>
                  <p>Lat: {(userTruck?.gps_latitud || userTruck?.lat || 0).toFixed(6)}, Lng: {(userTruck?.gps_longitud || userTruck?.lng || 0).toFixed(6)}</p>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn--secondary"
                  onClick={() => {
                    setShowRiskModal(false);
                    setSkipStopData(null);
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn--warning"
                  onClick={handleSubmitRiskReport}
                >
                  <AlertTriangle size={16} />
                  Enviar Reporte
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Modal de terminación anticipada */}
        {showTerminateModal && (() => {
          const cn = (user.nombre || user.nombre_completo || '').trim().toLowerCase();
          const routeRiskReports = reports.filter(report => {
            const reportDate = new Date(report.fechaCreacion || report.fecha_reporte);
            const routeStart = new Date(routeStartTime);
            const rc = (report.conductor || report.conductor_nombre || '').trim().toLowerCase();
            return reportDate >= routeStart && rc === cn;
          });
          const latestRisk = routeRiskReports.length > 0 ? routeRiskReports[routeRiskReports.length - 1] : null;

          if (isMobileView) {
            /* MOBILE: Bottom sheet */
            return (
              <div className="sheet-backdrop" onClick={() => setShowTerminateModal(false)}>
                <div className="sheet sheet--terminate" onClick={e => e.stopPropagation()}>
                  <div className="sheet__handle" />
                  <div className="sheet__header">
                    <div className="sheet__badge sheet__badge--danger">
                      <X size={14} />
                      <span>Terminar Ruta</span>
                    </div>
                    <button className="sheet__close" onClick={() => setShowTerminateModal(false)}>
                      <X size={18} />
                    </button>
                  </div>

                  <div className="sheet__body">
                    <div className="sheet__alert sheet__alert--warning">
                      <AlertTriangle size={18} />
                      <span>Se terminará la ruta y se generará un reporte parcial.</span>
                    </div>

                    <div className="sheet__progress-chips">
                      <div className="sheet__chip">
                        <MapPin size={14} />
                        <span>{completedStops.length}/{getParadasArray(assignedRoute.paradas).length} paradas</span>
                      </div>
                      <div className="sheet__chip">
                        <Clock size={14} />
                        <span>{formatTime(timeOnRoute)}</span>
                      </div>
                    </div>

                    {latestRisk ? (
                      <div className="sheet__risk-card">
                        <div className="sheet__section-label">Riesgo detectado</div>
                        <strong>{latestRisk.titulo}</strong>
                        <label className="sheet__checkbox">
                          <input
                            type="checkbox"
                            checked={useRiskAsReason}
                            onChange={e => setUseRiskAsReason(e.target.checked)}
                          />
                          <span>Usar como motivo</span>
                        </label>
                      </div>
                    ) : (
                      <>
                        <div className="sheet__section-label">Motivo</div>
                        <textarea
                          className="sheet__textarea"
                          placeholder="Describe el motivo..."
                          rows={3}
                          value={terminateReason}
                          onChange={e => setTerminateReason(e.target.value)}
                        />
                      </>
                    )}
                  </div>

                  <div className="sheet__actions">
                    <button className="sheet__btn sheet__btn--primary sheet__btn--danger" onClick={handleTerminarRutaAnticipadamente}>
                      <X size={16} />
                      Confirmar Terminación
                    </button>
                    <button className="sheet__btn sheet__btn--ghost" onClick={() => { setShowTerminateModal(false); setTerminateReason(''); }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          /* DESKTOP: Modal clásico */
          return (
            <div className="modal-overlay" onClick={() => setShowTerminateModal(false)}>
              <div className="modal-content terminate-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3><X size={20} /> Terminar Ruta Anticipadamente</h3>
                  <button className="modal-close" onClick={() => setShowTerminateModal(false)}>
                    <X size={20} />
                  </button>
                </div>

                <div className="modal-body">
                  <div className="terminate-warning-box">
                    <AlertTriangle size={24} className="terminate-warning-icon" />
                    <div>
                      <h4 className="terminate-warning-title">Advertencia</h4>
                      <p className="terminate-warning-text">
                        Esta acción terminará tu ruta actual antes de completar todas las paradas.
                        Se generará un reporte parcial con las paradas completadas hasta el momento.
                      </p>
                    </div>
                  </div>

                  {latestRisk ? (
                    <div className="terminate-risk-box">
                      <h4 className="terminate-risk-title">
                        <AlertTriangle size={20} />
                        Reporte de Riesgo Detectado
                      </h4>
                      <div className="terminate-risk-detail">
                        <strong>{latestRisk.titulo}</strong>
                        <p>{latestRisk.descripcion}</p>
                      </div>
                      <div className="terminate-risk-checkbox">
                        <label>
                          <input
                            type="checkbox"
                            checked={useRiskAsReason}
                            onChange={e => setUseRiskAsReason(e.target.checked)}
                          />
                          <span>Usar este reporte de riesgo como motivo de terminación</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="form-group">
                      <label>Motivo de terminación anticipada *</label>
                      <textarea
                        className="form-control"
                        placeholder="Describe el motivo de la terminación anticipada..."
                        rows={4}
                        value={terminateReason}
                        onChange={e => setTerminateReason(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <div className="terminate-progress-box">
                    <h4>Progreso actual</h4>
                    <div className="terminate-progress-row">
                      <span>Paradas completadas:</span>
                      <strong>{completedStops.length} / {getParadasArray(assignedRoute.paradas).length}</strong>
                    </div>
                    <div className="terminate-progress-row">
                      <span>Tiempo en ruta:</span>
                      <strong>{formatTime(timeOnRoute)}</strong>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    className="btn btn--secondary"
                    onClick={() => { setShowTerminateModal(false); setTerminateReason(''); }}
                  >
                    Cancelar
                  </button>
                  <button
                    className="btn btn--danger"
                    onClick={handleTerminarRutaAnticipadamente}
                  >
                    <X size={16} />
                    Confirmar Terminación
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        <WeightModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onConfirm={handleWeightConfirm}
          onSkip={handleSkipStop}
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
        {showSuccessModal && (isMobileView ? (
          <div className="sheet-backdrop" onClick={() => setShowSuccessModal(null)}>
            <div className="sheet sheet--success" onClick={e => e.stopPropagation()}>
              <div className="sheet__handle" />
              <div className="sheet__status-icon-wrap">
                <div className={`sheet__status-icon ${showSuccessModal.type === 'error' ? 'sheet__status-icon--error' : ''}`}>
                  {showSuccessModal.type === 'error' ? <AlertTriangle size={32} /> : <CheckCircle size={32} />}
                </div>
              </div>
              <div className="sheet__status-title">
                {showSuccessModal.type === 'error' ? 'Error' : '¡Éxito!'}
              </div>
              <div className="sheet__status-msg">
                {showSuccessModal.message || 'Operación completada exitosamente'}
              </div>
              <div className="sheet__actions">
                <button className="sheet__btn sheet__btn--primary" onClick={() => setShowSuccessModal(null)}>
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        ) : (
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
        ))}
      </main>
    </div>
  );
};

export default ConductorDashboard; 