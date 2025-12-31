import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import './GeofenceAudioTest.css';

/**
 * Componente de prueba para escuchar los sonidos de geofence
 * TEMPORAL - Solo para desarrollo/demos
 */
const GeofenceAudioTest = () => {
  // Función para hablar usando Web Speech API
  const speakAlert = (message, isEntering) => {
    try {
      // Verificar si el navegador soporta Web Speech API
      if (!window.speechSynthesis) {
        alert('❌ Tu navegador no soporta Web Speech API');
        return;
      }

      const utterance = new SpeechSynthesisUtterance(message);

      // Configurar voz en español
      utterance.lang = 'es-ES';

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

      console.log(`🎤 [TEST] Hablando: "${message}"`);
    } catch (error) {
      console.error('🔇 Error en Web Speech API:', error);
      alert('❌ Error reproduciendo voz: ' + error.message);
    }
  };

  // Función para reproducir beep
  const playBeep = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();

      // Fade out
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.error('Audio no disponible:', error);
    }
  };

  // Simular entrada a zona
  const testEnter = () => {
    console.log('🧪 [TEST] Simulando ENTRADA a zona');
    playBeep();
    setTimeout(() => {
      speakAlert('como van?', true);
    }, 100);
  };

  // Simular salida de zona
  const testExit = () => {
    console.log('🧪 [TEST] Simulando SALIDA de zona');
    playBeep();
    setTimeout(() => {
      speakAlert('se fue', false);
    }, 100);
  };

  return (
    <div className="geofence-audio-test">
      <div className="audio-test-header">
        <Volume2 size={20} />
        <h4>🎤 Prueba de Audio Geofence</h4>
      </div>

      <div className="audio-test-buttons">
        <button
          className="audio-test-btn audio-test-btn--enter"
          onClick={testEnter}
        >
          <span className="btn-icon">🔔</span>
          <div className="btn-content">
            <span className="btn-label">Entrada a Zona</span>
            <span className="btn-message">"como van?"</span>
          </div>
        </button>

        <button
          className="audio-test-btn audio-test-btn--exit"
          onClick={testExit}
        >
          <span className="btn-icon">📤</span>
          <div className="btn-content">
            <span className="btn-label">Salida de Zona</span>
            <span className="btn-message">"se fue"</span>
          </div>
        </button>
      </div>

      <div className="audio-test-note">
        <VolumeX size={14} />
        <span>Si no escuchas nada, haz click en la página primero (restricción del navegador)</span>
      </div>
    </div>
  );
};

export default GeofenceAudioTest;
