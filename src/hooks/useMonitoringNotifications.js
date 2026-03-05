import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook para notificaciones sonoras y visuales del monitoreo en tiempo real.
 *
 * Detecta nuevos eventos de ruta y alertas, reproduce sonidos sutiles
 * via Web Audio API y expone Sets de IDs nuevos para animaciones CSS.
 *
 * Diseñado para uso en TV/dashboard en vivo — volumen bajo y ambient.
 */
export const useMonitoringNotifications = (recentActivity = [], displayAlerts = []) => {
  const [newEventIds, setNewEventIds] = useState(new Set());
  const [newAlertIds, setNewAlertIds] = useState(new Set());

  const prevActivityIds = useRef(new Set());
  const prevAlertIds = useRef(new Set());
  const isInitialized = useRef(false);

  // Sound player using Web Audio API (same pattern as useGeofenceAlerts)
  const playSound = useCallback((type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const vol = 0.15; // Subtle for ambient TV use

      const playTone = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;

      switch (type) {
        case 'parada_completada':
        case 'parada_llegada':
          // Soft ding: C6
          playTone(1047, now, 0.15);
          break;

        case 'ruta_iniciada':
          // Ascending 2-note: C5 → E5
          playTone(523, now, 0.13);
          playTone(659, now + 0.15, 0.13);
          break;

        case 'ruta_completada':
          // 3-note resolve: C5 → E5 → G5
          playTone(523, now, 0.1);
          playTone(659, now + 0.12, 0.1);
          playTone(784, now + 0.24, 0.18);
          break;

        case 'alert':
          // Low warning: A3 with slight vibrato
          {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 220;
            osc.type = 'sine';
            // Vibrato
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.frequency.value = 6;
            lfoGain.gain.value = 8;
            lfo.start(now);
            lfo.stop(now + 0.25);

            gain.gain.setValueAtTime(vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
          }
          break;

        default:
          playTone(880, now, 0.1);
      }
    } catch {
      // Audio not available — silent fallback
    }
  }, []);

  // Detect new route events
  useEffect(() => {
    if (!recentActivity || recentActivity.length === 0) return;

    const currentIds = new Set(recentActivity.map(a => a.id));

    // Skip on first render (don't alert for already-existing items)
    if (!isInitialized.current) {
      prevActivityIds.current = currentIds;
      isInitialized.current = true;
      return;
    }

    // Find truly new events
    const newIds = [];
    let soundType = null;

    for (const activity of recentActivity) {
      if (!prevActivityIds.current.has(activity.id)) {
        newIds.push(activity.id);
        // Use the most "important" sound type
        if (activity.tipo === 'ruta_completada') {
          soundType = 'ruta_completada';
        } else if (activity.tipo === 'ruta_iniciada' && soundType !== 'ruta_completada') {
          soundType = 'ruta_iniciada';
        } else if (!soundType) {
          soundType = activity.tipo || 'parada_completada';
        }
      }
    }

    if (newIds.length > 0) {
      // Play sound for the most important new event type
      playSound(soundType);

      // Set new IDs for CSS animation
      setNewEventIds(new Set(newIds));

      // Clear highlight after 5 seconds
      setTimeout(() => {
        setNewEventIds(new Set());
      }, 5000);
    }

    prevActivityIds.current = currentIds;
  }, [recentActivity, playSound]);

  // Detect new alerts
  useEffect(() => {
    if (!displayAlerts || displayAlerts.length === 0) return;

    const currentIds = new Set(displayAlerts.map(a => a._id || a.id));

    // Skip on first render
    if (prevAlertIds.current.size === 0 && !isInitialized.current) {
      prevAlertIds.current = currentIds;
      return;
    }

    const newIds = [];
    for (const alert of displayAlerts) {
      const id = alert._id || alert.id;
      if (!prevAlertIds.current.has(id)) {
        newIds.push(id);
      }
    }

    if (newIds.length > 0) {
      playSound('alert');

      setNewAlertIds(new Set(newIds));

      setTimeout(() => {
        setNewAlertIds(new Set());
      }, 5000);
    }

    prevAlertIds.current = currentIds;
  }, [displayAlerts, playSound]);

  return { newEventIds, newAlertIds };
};

export default useMonitoringNotifications;
