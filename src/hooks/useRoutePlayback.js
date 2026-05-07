import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

/**
 * Hook para gestionar la reproducción animada del historial de rutas GPS
 * 
 * ESTRATEGIA: REPRODUCTOR SIMPLE (PUNTO A PUNTO)
 * - Avanza de punto en punto a intervalos fijos
 * - Muestra los datos TAL CUAL vienen de Convex/SafeTag
 * - La hora puede "saltar" entre puntos (ej: 12:30:20 → 12:31:03) - esto es CORRECTO
 * - NO interpola posición ni tiempo
 * 
 * Velocidades: 1x, 2x, 4x, 8x, 16x, 32x, 64x, 128x
 * Intervalo base: 500ms por punto a 1x
 *
 * @param {string} deviceId - IMEI del dispositivo SafeTag (opcional si se provee vehiculoId)
 * @param {string} selectedDate - Fecha en formato ISO (opcional, default: hoy)
 * @param {string} vehiculoId - ID del vehículo en Convex (opcional, prioriza historial local)
 * @returns {object} Estado y funciones de reproducción
 */
export const useRoutePlayback = (deviceId, selectedDate = null, vehiculoId = null) => {
  // Estado de reproducción
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 4x, 8x, 16x, 32x, 64x, 128x
  const [currentIndex, setCurrentIndex] = useState(0);

  // Datos de la ruta
  const [routeData, setRouteData] = useState(null);
  const [processedLocations, setProcessedLocations] = useState([]); // Array ordenado y limpio
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Referencia para el timer
  const timerRef = useRef(null);

  // Actions de Convex para SafeTag API (fallback)
  const fetchHistory = useAction(api.safetag.fetchLocationHistory);
  const fetchTodayHistory = useAction(api.safetag.fetchTodayHistory);

  // Determinar qué tipo de query usar (memoizado para estabilidad)
  const queryType = useMemo(() => {
    if (!vehiculoId) return 'none';
    if (selectedDate) return 'byDay';
    return 'recent';
  }, [vehiculoId, selectedDate]);

  // Query para historial por día
  const historyByDayQuery = useQuery(
    api.vehicleHistory.getVehicleHistoryByDay,
    queryType === 'byDay' && vehiculoId && selectedDate
      ? { vehiculoId, date: selectedDate }
      : "skip"
  );

  // Query para historial reciente
  const recentHistoryQuery = useQuery(
    api.vehicleHistory.getRecentHistory,
    queryType === 'recent' && vehiculoId
      ? { vehiculoId, hours: 24 }
      : "skip"
  );

  // Seleccionar el resultado correcto basado en queryType
  const localHistoryQuery = useMemo(() => {
    if (queryType === 'byDay') return historyByDayQuery;
    if (queryType === 'recent') return recentHistoryQuery;
    return undefined;
  }, [queryType, historyByDayQuery, recentHistoryQuery]);

  // Ref para trackear si ya cargamos datos iniciales
  const initialLoadDone = useRef(false);
  const lastLoadedSource = useRef(null);

  /**
   * Procesar y ordenar los datos GPS
   * - Ordena por timestamp ASCENDENTE
   * - NO elimina ningún punto (mantiene todos los datos reales)
   * - Retorna array completo ordenado
   */
  const processLocations = useCallback((locations) => {
    if (!locations || locations.length === 0) return [];

    // Convertir todos los timestamps a números para ordenar
    const withTimestamps = locations.map(loc => ({
      ...loc,
      _timestamp: new Date(loc.timestamp || loc.last_updated).getTime()
    }));

    // Ordenar por timestamp ASCENDENTE (más antiguo primero)
    withTimestamps.sort((a, b) => a._timestamp - b._timestamp);

    // NO eliminamos ningún punto - mostramos TODOS los datos reales
    // Esto incluye puntos duplicados cuando el vehículo está detenido

    if (withTimestamps.length === 0) return [];

    return withTimestamps;
  }, []);

  /**
   * Efecto para sincronizar automáticamente cuando localHistoryQuery cambia
   */
  useEffect(() => {
    if (!vehiculoId) return;
    if (localHistoryQuery === undefined) return;
    
    if (localHistoryQuery && localHistoryQuery.locations && localHistoryQuery.locations.length > 0) {
      // Transformar datos de Convex al formato esperado
      const locations = localHistoryQuery.locations.map((loc) => ({
        coords: {
          lat: loc.gps_latitud,
          lon: loc.gps_longitud,
        },
        speed: loc.gps_velocidad || 0,
        course: loc.gps_rumbo || 0,
        timestamp: new Date(loc.timestamp).toISOString(),
        last_updated: new Date(loc.timestamp).toISOString(),
      }));

      const data = {
        locations,
        totalDistance: null,
        deviceId: deviceId || vehiculoId,
        startDate: selectedDate,
        endDate: selectedDate,
        source: 'convex-local'
      };

      // Procesar y ordenar los datos
      const processed = processLocations(locations);
      
      if (processed.length > 0) {
        setRouteData(data);
        setProcessedLocations(processed);
        setCurrentIndex(0);
        setIsPlaying(false);
        setLoading(false);
        setError(null);
        lastLoadedSource.current = 'convex-local';
        initialLoadDone.current = true;
      }
    } else if (localHistoryQuery && (!localHistoryQuery.locations || localHistoryQuery.locations.length === 0)) {
      setRouteData(null);
      setProcessedLocations([]);
      setLoading(false);
      lastLoadedSource.current = 'convex-local-empty';
      initialLoadDone.current = true;
    }
  }, [localHistoryQuery, vehiculoId, deviceId, selectedDate, processLocations]);

  /**
   * Cargar historial de ubicaciones - SOLO para SafeTag API (fallback)
   */
  const loadHistory = useCallback(async () => {
    if (vehiculoId && lastLoadedSource.current === 'convex-local') {
      return;
    }

    if (!deviceId && vehiculoId) {
      return;
    }

    if (!deviceId && !vehiculoId) {
      setError("No se puede cargar historial sin deviceId o vehiculoId");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let data;

      if (selectedDate) {
        const date = new Date(selectedDate);
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        data = await fetchHistory({
          deviceId,
          startDate: startOfDay.toISOString(),
          endDate: endOfDay.toISOString(),
        });
      } else {
        data = await fetchTodayHistory({ deviceId });
      }

      if (data) {
        data.source = 'safetag-api';
        
        // Procesar los datos
        const processed = processLocations(data.locations || []);
        
        if (processed.length > 0) {
          setRouteData(data);
          setProcessedLocations(processed);
          setCurrentIndex(0);
          setIsPlaying(false);
        }
        
        lastLoadedSource.current = 'safetag-api';
        initialLoadDone.current = true;
      }
    } catch (err) {
      console.error("❌ Error loading route history:", err);
      setError(err.message || "No se pudo cargar el historial GPS");
    } finally {
      setLoading(false);
    }
  }, [deviceId, selectedDate, vehiculoId, fetchHistory, fetchTodayHistory, processLocations]);

  /**
   * Iniciar reproducción
   */
  const play = useCallback(() => {
    if (processedLocations.length === 0) return;

    // Si llegamos al final, reiniciar
    if (currentIndex >= processedLocations.length - 1) {
      setCurrentIndex(0);
    }

    setIsPlaying(true);
  }, [processedLocations, currentIndex]);

  /**
   * Pausar reproducción
   */
  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  /**
   * Reiniciar desde el inicio
   */
  const restart = useCallback(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, []);

  /**
   * Saltar a un índice específico (para el slider)
   */
  const seekTo = useCallback((index) => {
    if (processedLocations.length === 0) return;
    
    const clampedIndex = Math.max(0, Math.min(index, processedLocations.length - 1));
    setCurrentIndex(clampedIndex);
  }, [processedLocations]);

  /**
   * Cambiar velocidad de reproducción
   */
  const changeSpeed = useCallback((speed) => {
    setPlaybackSpeed(speed);
  }, []);

  /**
   * TIMER SIMPLE: Avanza punto por punto
   * 
   * Intervalo base: 500ms a velocidad 1x
   * A velocidad 2x: 250ms
   * A velocidad 128x: ~4ms (prácticamente instantáneo)
   */
  useEffect(() => {
    if (isPlaying && processedLocations.length > 0) {
      const BASE_INTERVAL = 500; // 500ms por punto a velocidad 1x
      const interval = Math.max(16, BASE_INTERVAL / playbackSpeed); // Mínimo 16ms (60fps)

      timerRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          const nextIndex = prev + 1;
          
          // Si llegamos al final, detener
          if (nextIndex >= processedLocations.length) {
            setIsPlaying(false);
            return prev;
          }
          
          return nextIndex;
        });
      }, interval);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [isPlaying, playbackSpeed, processedLocations.length]);

  /**
   * Cargar datos al montar o cambiar deviceId/fecha
   */
  useEffect(() => {
    if (deviceId && !vehiculoId) {
      loadHistory();
    }
  }, [deviceId, selectedDate, loadHistory, vehiculoId]);

  /**
   * Calcular estadísticas de la ruta
   */
  const calculateStats = useCallback(() => {
    if (processedLocations.length === 0) {
      return null;
    }

    const startTime = processedLocations[0]._timestamp;
    const endTime = processedLocations[processedLocations.length - 1]._timestamp;
    const duration = endTime - startTime;

    // Distancia total
    const totalDistance = routeData?.totalDistance || 0;

    // Velocidad máxima
    const maxSpeed = Math.max(...processedLocations.map(loc => loc.speed || 0));

    // Velocidad promedio (solo puntos en movimiento)
    const movingPoints = processedLocations.filter(loc => (loc.speed || 0) > 0);
    const avgSpeed = movingPoints.length > 0
      ? movingPoints.reduce((sum, loc) => sum + (loc.speed || 0), 0) / movingPoints.length
      : 0;

    return {
      totalDistance,
      totalPoints: processedLocations.length,
      duration,
      maxSpeed,
      avgSpeed,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    };
  }, [processedLocations, routeData]);

  /**
   * Obtener punto actual de la reproducción
   * Retorna el punto TAL CUAL viene de los datos (sin interpolación)
   */
  const getCurrentPoint = useCallback(() => {
    if (processedLocations.length === 0 || currentIndex >= processedLocations.length) {
      return null;
    }
    return processedLocations[currentIndex];
  }, [processedLocations, currentIndex]);

  /**
   * Obtener progreso de la reproducción (0-100)
   */
  const getProgress = useCallback(() => {
    if (processedLocations.length <= 1) return 0;
    return (currentIndex / (processedLocations.length - 1)) * 100;
  }, [processedLocations, currentIndex]);

  // Datos de tiempo calculados
  const startTime = processedLocations.length > 0 ? processedLocations[0]._timestamp : null;
  const endTime = processedLocations.length > 0 ? processedLocations[processedLocations.length - 1]._timestamp : null;
  const duration = startTime && endTime ? endTime - startTime : 0;

  return {
    // Estado
    isPlaying,
    currentIndex,
    playbackSpeed,
    loading,
    error,
    routeData,

    // Funciones de control
    play,
    pause,
    restart,
    seekTo,
    changeSpeed,
    loadHistory,

    // Datos calculados
    stats: calculateStats(),
    currentPoint: getCurrentPoint(),
    progress: getProgress(),

    // Utilidades
    totalPoints: processedLocations.length,
    hasData: processedLocations.length > 0,
    
    // Datos de tiempo
    startTime,
    endTime,
    duration,
  };
};

export default useRoutePlayback;
