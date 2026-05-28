import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

/**
 * Hook para reproducción del historial de rutas GPS — VERSIÓN TIEMPO REAL
 *
 * Cambio crítico vs versión anterior:
 *   - Antes: avanzaba por INDEX (punto-a-punto a 500ms fijos)
 *   - Ahora: avanza por TIEMPO REAL, interpola lat/lng entre pings GPS
 *
 * Garantías:
 *   - La hora mostrada coincide con la posición visual (interp por timestamp)
 *   - A 1x: 1 segundo real = 1 segundo playback
 *   - Auto-skip de gaps grandes (>5min sin pings) — comprime a ~1s playback
 *
 * @param {string} deviceId - IMEI SafeTag (opcional)
 * @param {string} selectedDate - Fecha ISO "YYYY-MM-DD" (opcional)
 * @param {string} vehiculoId - ID Convex del vehículo (prioriza local)
 */

const TICK_MS = 50; // Frecuencia del timer (20 fps)
const MAX_GAP_MS = 5 * 60 * 1000; // Gaps >5min se saltan
const GAP_SKIP_LANDING_MS = 1000; // Aterrizar 1s antes del próximo punto post-gap

// Binary search: máximo índice donde locs[i]._timestamp <= t
function findSegmentIndex(locs, t) {
  if (locs.length === 0) return -1;
  if (t <= locs[0]._timestamp) return 0;
  if (t >= locs[locs.length - 1]._timestamp) return locs.length - 1;
  let lo = 0;
  let hi = locs.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (locs[mid]._timestamp <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

// Interpolación shortest-path entre dos rumbos en grados (0-359).
function lerpAngle(a, b, t) {
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return ((a + diff * t) % 360 + 360) % 360;
}

function getInterpolatedPoint(locs, t) {
  if (locs.length === 0) return null;
  if (locs.length === 1 || t <= locs[0]._timestamp) {
    return { ...locs[0], _interpolated: false, _segmentIndex: 0 };
  }
  if (t >= locs[locs.length - 1]._timestamp) {
    const last = locs[locs.length - 1];
    return { ...last, _interpolated: false, _segmentIndex: locs.length - 1 };
  }
  const i = findSegmentIndex(locs, t);
  const a = locs[i];
  const b = locs[i + 1];
  if (!b) return { ...a, _interpolated: false, _segmentIndex: i };
  const span = b._timestamp - a._timestamp;
  const ratio = span <= 0 ? 0 : (t - a._timestamp) / span;
  const aLat = a.coords?.lat ?? 0;
  const aLon = a.coords?.lon ?? 0;
  const bLat = b.coords?.lat ?? aLat;
  const bLon = b.coords?.lon ?? aLon;
  return {
    coords: {
      lat: aLat + (bLat - aLat) * ratio,
      lon: aLon + (bLon - aLon) * ratio,
    },
    speed: (a.speed || 0) + ((b.speed || 0) - (a.speed || 0)) * ratio,
    course: lerpAngle(a.course || 0, b.course || 0, ratio),
    timestamp: new Date(t).toISOString(),
    _timestamp: t,
    _interpolated: true,
    _segmentIndex: i,
  };
}

// Verifica si advancing from `currentT` by `delta` cruza un gap grande.
// Si sí, retorna timestamp justo antes del próximo punto. Si no, retorna currentT+delta.
function advanceWithGapSkip(currentT, delta, locs) {
  const nextT = currentT + delta;
  if (locs.length < 2) return nextT;
  const i = findSegmentIndex(locs, currentT);
  const next = locs[i + 1];
  if (!next) return nextT;
  const gap = next._timestamp - locs[i]._timestamp;
  if (gap > MAX_GAP_MS && nextT < next._timestamp) {
    // Saltar el gap — aterrizar GAP_SKIP_LANDING_MS antes del próximo punto
    return Math.max(nextT, next._timestamp - GAP_SKIP_LANDING_MS);
  }
  return nextT;
}

export const useRoutePlayback = (deviceId, selectedDate = null, vehiculoId = null) => {
  // Estado de reproducción — driven by TIME, not index
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(null);

  // Datos
  const [routeData, setRouteData] = useState(null);
  const [processedLocations, setProcessedLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const timerRef = useRef(null);
  const lastResetKey = useRef(null);

  // Convex actions (fallback SafeTag API)
  const fetchHistory = useAction(api.safetag.fetchLocationHistory);
  const fetchTodayHistory = useAction(api.safetag.fetchTodayHistory);

  const queryType = useMemo(() => {
    if (!vehiculoId) return 'none';
    if (selectedDate) return 'byDay';
    return 'recent';
  }, [vehiculoId, selectedDate]);

  const historyByDayQuery = useQuery(
    api.vehicleHistory.getVehicleHistoryByDay,
    queryType === 'byDay' && vehiculoId && selectedDate
      ? { vehiculoId, date: selectedDate }
      : 'skip'
  );

  const recentHistoryQuery = useQuery(
    api.vehicleHistory.getRecentHistory,
    queryType === 'recent' && vehiculoId
      ? { vehiculoId, hours: 24 }
      : 'skip'
  );

  const localHistoryQuery = useMemo(() => {
    if (queryType === 'byDay') return historyByDayQuery;
    if (queryType === 'recent') return recentHistoryQuery;
    return undefined;
  }, [queryType, historyByDayQuery, recentHistoryQuery]);

  const initialLoadDone = useRef(false);
  const lastLoadedSource = useRef(null);

  const processLocations = useCallback((locations) => {
    if (!locations || locations.length === 0) return [];
    const withTimestamps = locations
      .map(loc => ({
        ...loc,
        _timestamp: new Date(loc.timestamp || loc.last_updated).getTime(),
      }))
      .filter(loc => Number.isFinite(loc._timestamp));
    withTimestamps.sort((a, b) => a._timestamp - b._timestamp);
    return withTimestamps;
  }, []);

  // Auto-sync cuando localHistoryQuery cambia.
  // `loading=true` mientras query === undefined (evita flash "Sin datos GPS").
  // currentTime/isPlaying SOLO se resetean cuando cambia el key (vehiculoId+selectedDate),
  // no en cada reactive update — sino el playback se reiniciaba con cada ping nuevo.
  useEffect(() => {
    if (!vehiculoId) return;

    const resetKey = `${vehiculoId}|${selectedDate || 'recent'}`;
    const isNewKey = lastResetKey.current !== resetKey;

    if (localHistoryQuery === undefined) {
      // Query aún cargando — mostrar spinner, no empty state
      if (isNewKey) {
        setLoading(true);
        setError(null);
      }
      return;
    }

    if (localHistoryQuery && localHistoryQuery.locations && localHistoryQuery.locations.length > 0) {
      const locations = localHistoryQuery.locations.map((loc) => ({
        coords: { lat: loc.gps_latitud, lon: loc.gps_longitud },
        speed: loc.gps_velocidad || 0,
        course: loc.gps_rumbo || 0,
        timestamp: new Date(loc.timestamp).toISOString(),
        last_updated: new Date(loc.timestamp).toISOString(),
      }));

      const processed = processLocations(locations);
      if (processed.length > 0) {
        setRouteData({
          locations,
          totalDistance: null,
          deviceId: deviceId || vehiculoId,
          startDate: selectedDate,
          endDate: selectedDate,
          source: 'convex-local',
        });
        setProcessedLocations(processed);
        if (isNewKey) {
          setCurrentTime(processed[0]._timestamp);
          setIsPlaying(false);
          lastResetKey.current = resetKey;
        }
        setLoading(false);
        setError(null);
        lastLoadedSource.current = 'convex-local';
        initialLoadDone.current = true;
      }
    } else if (localHistoryQuery && (!localHistoryQuery.locations || localHistoryQuery.locations.length === 0)) {
      setRouteData(null);
      setProcessedLocations([]);
      if (isNewKey) {
        setCurrentTime(null);
        setIsPlaying(false);
        lastResetKey.current = resetKey;
      }
      setLoading(false);
      lastLoadedSource.current = 'convex-local-empty';
      initialLoadDone.current = true;
    }
  }, [localHistoryQuery, vehiculoId, deviceId, selectedDate, processLocations]);

  // Fallback: SafeTag API
  const loadHistory = useCallback(async () => {
    if (vehiculoId && lastLoadedSource.current === 'convex-local') return;
    if (!deviceId && vehiculoId) return;
    if (!deviceId && !vehiculoId) {
      setError('No se puede cargar historial sin deviceId o vehiculoId');
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
        const processed = processLocations(data.locations || []);
        if (processed.length > 0) {
          setRouteData(data);
          setProcessedLocations(processed);
          setCurrentTime(processed[0]._timestamp);
          setIsPlaying(false);
        }
        lastLoadedSource.current = 'safetag-api';
        initialLoadDone.current = true;
      }
    } catch (err) {
      setError(err.message || 'No se pudo cargar el historial GPS');
    } finally {
      setLoading(false);
    }
  }, [deviceId, selectedDate, vehiculoId, fetchHistory, fetchTodayHistory, processLocations]);

  const startTime = processedLocations.length > 0 ? processedLocations[0]._timestamp : null;
  const endTime = processedLocations.length > 0 ? processedLocations[processedLocations.length - 1]._timestamp : null;
  const duration = startTime && endTime ? endTime - startTime : 0;

  // Timer: avanza currentTime real, con gap-skip
  useEffect(() => {
    if (!isPlaying || processedLocations.length === 0 || endTime === null) return;

    timerRef.current = setInterval(() => {
      setCurrentTime(prev => {
        if (prev === null) return processedLocations[0]._timestamp;
        const delta = TICK_MS * playbackSpeed;
        const next = advanceWithGapSkip(prev, delta, processedLocations);
        if (next >= endTime) {
          setIsPlaying(false);
          return endTime;
        }
        return next;
      });
    }, TICK_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeed, processedLocations, endTime]);

  const play = useCallback(() => {
    if (processedLocations.length === 0) return;
    setCurrentTime(prev => {
      // Si terminó, reiniciar
      if (prev === null || prev >= endTime) return processedLocations[0]._timestamp;
      return prev;
    });
    setIsPlaying(true);
  }, [processedLocations, endTime]);

  const pause = useCallback(() => setIsPlaying(false), []);

  const restart = useCallback(() => {
    if (processedLocations.length === 0) return;
    setCurrentTime(processedLocations[0]._timestamp);
    setIsPlaying(false);
  }, [processedLocations]);

  // seekTo legacy (acepta índice) — mantiene API previa
  const seekTo = useCallback((index) => {
    if (processedLocations.length === 0) return;
    const clamped = Math.max(0, Math.min(index, processedLocations.length - 1));
    setCurrentTime(processedLocations[clamped]._timestamp);
  }, [processedLocations]);

  // seekToTime: nueva API por timestamp ms
  const seekToTime = useCallback((t) => {
    if (processedLocations.length === 0 || !startTime || !endTime) return;
    setCurrentTime(Math.max(startTime, Math.min(t, endTime)));
  }, [processedLocations, startTime, endTime]);

  // seekToProgress: 0-100 percent
  const seekToProgress = useCallback((pct) => {
    if (!startTime || !endTime) return;
    const t = startTime + ((endTime - startTime) * Math.max(0, Math.min(100, pct))) / 100;
    setCurrentTime(t);
  }, [startTime, endTime]);

  const changeSpeed = useCallback((speed) => setPlaybackSpeed(speed), []);

  useEffect(() => {
    if (deviceId && !vehiculoId) loadHistory();
  }, [deviceId, selectedDate, loadHistory, vehiculoId]);

  // Derivados pa' la UI
  const currentPoint = useMemo(() => {
    if (currentTime === null) return null;
    return getInterpolatedPoint(processedLocations, currentTime);
  }, [processedLocations, currentTime]);

  const currentIndex = currentPoint?._segmentIndex ?? 0;

  const progress = useMemo(() => {
    if (!startTime || !endTime || currentTime === null || duration === 0) return 0;
    return ((currentTime - startTime) / duration) * 100;
  }, [currentTime, startTime, endTime, duration]);

  const stats = useMemo(() => {
    if (processedLocations.length === 0) return null;
    const maxSpeed = Math.max(...processedLocations.map(loc => loc.speed || 0));
    const moving = processedLocations.filter(loc => (loc.speed || 0) > 0);
    const avgSpeed = moving.length > 0
      ? moving.reduce((sum, loc) => sum + (loc.speed || 0), 0) / moving.length
      : 0;
    return {
      totalDistance: routeData?.totalDistance || 0,
      totalPoints: processedLocations.length,
      duration,
      maxSpeed,
      avgSpeed,
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
    };
  }, [processedLocations, routeData, duration, startTime, endTime]);

  return {
    // Estado
    isPlaying,
    currentIndex,
    currentTime,
    playbackSpeed,
    loading,
    error,
    routeData,
    // Controles
    play,
    pause,
    restart,
    seekTo,
    seekToTime,
    seekToProgress,
    changeSpeed,
    loadHistory,
    // Derivados
    stats,
    currentPoint,
    progress,
    totalPoints: processedLocations.length,
    hasData: processedLocations.length > 0,
    startTime,
    endTime,
    duration,
  };
};

export default useRoutePlayback;
