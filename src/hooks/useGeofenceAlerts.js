import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

/**
 * Hook para manejar alertas de geofence en tiempo real
 * 
 * Escucha alertas y muestra pop-ups cuando:
 * - Un vehículo entra a una zona
 * - Un vehículo sale de una zona
 */
export const useGeofenceAlerts = () => {
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [alertQueue, setAlertQueue] = useState([]);
  const processedAlerts = useRef(new Set());
  
  // Query para obtener alertas no vistas
  const unviewedAlerts = useQuery(api.geofences.getUnviewedAlerts);
  
  // Mutation para marcar alerta como vista
  const markViewed = useMutation(api.geofences.markAlertViewed);

  // Detectar nuevas alertas
  useEffect(() => {
    if (!unviewedAlerts || unviewedAlerts.length === 0) return;

    // Filtrar alertas que no hemos procesado aún
    const newAlerts = unviewedAlerts.filter(
      alert => !processedAlerts.current.has(alert._id)
    );

    if (newAlerts.length > 0) {
      console.log('🚨 Nuevas alertas de geofence:', newAlerts.length);

      // Agregar a la cola de alertas
      setAlertQueue(prev => [...prev, ...newAlerts]);

      // Marcar como procesadas
      newAlerts.forEach(alert => {
        processedAlerts.current.add(alert._id);
      });

      // Reproducir sonido + voz
      playNotificationSound(newAlerts);
    }
  }, [unviewedAlerts]);

  // Procesar cola de alertas (mostrar una a la vez)
  useEffect(() => {
    if (alertQueue.length > 0 && activeAlerts.length < 3) {
      const nextAlert = alertQueue[0];
      
      setActiveAlerts(prev => [...prev, nextAlert]);
      setAlertQueue(prev => prev.slice(1));

      // Auto-cerrar después de 10 segundos
      setTimeout(() => {
        dismissAlert(nextAlert._id);
      }, 10000);
    }
  }, [alertQueue, activeAlerts]);

  // Hablar alerta usando Web Speech API
  const speakAlert = useCallback((message, isEntering) => {
    try {
      // Verificar si el navegador soporta Web Speech API
      if (!window.speechSynthesis) {
        console.log('🔇 Web Speech API no disponible');
        return;
      }

      const utterance = new SpeechSynthesisUtterance(message);

      // Configurar voz en español
      utterance.lang = 'es-ES'; // Español (fallback a es-PA si está disponible)

      // Ajustar parámetros según tipo de evento
      if (isEntering) {
        utterance.rate = 1.2;    // Más rápido para entrada
        utterance.pitch = 1.1;   // Más agudo
      } else {
        utterance.rate = 1.0;    // Normal para salida
        utterance.pitch = 0.9;   // Más grave
      }

      utterance.volume = 0.8;

      // Hablar
      window.speechSynthesis.speak(utterance);

      console.log(`🎤 Hablando: "${message}"`);
    } catch (error) {
      console.log('🔇 Error en Web Speech API:', error);
    }
  }, []);

  // Reproducir sonido de notificación + voz
  const playNotificationSound = useCallback((alerts) => {
    try {
      // Determinar tipo de evento
      const firstAlert = alerts[0];
      const isEntering = firstAlert.tipo_evento === 'entrada' || firstAlert.category === 'geofence_enter';

      // Crear contexto de audio
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Frecuencias: E5 = 659.25 Hz, A5 = 880 Hz
      const E5 = 659.25;
      const A5 = 880;

      // Configurar sonido según tipo de evento
      const [freq1, freq2] = isEntering ? [E5, A5] : [A5, E5]; // Ascendente o descendente

      // Primer tono
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();

      osc1.connect(gain1);
      gain1.connect(audioContext.destination);

      osc1.frequency.value = freq1;
      osc1.type = 'sine';
      gain1.gain.value = 0.25;

      osc1.start(audioContext.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      osc1.stop(audioContext.currentTime + 0.15);

      // Segundo tono (con delay de 100ms)
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();

      osc2.connect(gain2);
      gain2.connect(audioContext.destination);

      osc2.frequency.value = freq2;
      osc2.type = 'sine';
      gain2.gain.value = 0;

      osc2.start(audioContext.currentTime + 0.1);
      gain2.gain.setValueAtTime(0.25, audioContext.currentTime + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      osc2.stop(audioContext.currentTime + 0.3);

    } catch (error) {
      console.log('Audio no disponible');
    }

    // Sin voz - solo tonos profesionales
  }, []);

  // Cerrar alerta
  const dismissAlert = useCallback(async (alertId) => {
    setActiveAlerts(prev => prev.filter(a => a._id !== alertId));
    
    // Marcar como vista en la DB
    try {
      await markViewed({ alertId });
    } catch (error) {
      console.error('Error marcando alerta como vista:', error);
    }
  }, [markViewed]);

  // Ver ubicación en mapa
  const viewOnMap = useCallback((alert) => {
    if (alert?.location) {
      const [lat, lon] = alert.location.split(',').map(parseFloat);
      
      // Emitir evento para centrar mapa
      const event = new CustomEvent('centerMapOnLocation', {
        detail: { lat, lon, vehicleId: alert.vehiculo_id }
      });
      window.dispatchEvent(event);
      
      dismissAlert(alert._id);
    }
  }, [dismissAlert]);

  return {
    activeAlerts,
    dismissAlert,
    viewOnMap,
    hasActiveAlerts: activeAlerts.length > 0,
    alertCount: activeAlerts.length,
  };
};

export default useGeofenceAlerts;
