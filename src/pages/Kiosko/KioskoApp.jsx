import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { initHuman, detectFace, captureFrame, uploadBlobToConvex } from '../../lib/facial';
import './KioskoApp.css';

const TIPO_MARCA_LABELS = {
  entrada: 'Entrada',
  salida_almuerzo: 'Salida a almuerzo',
  regreso_almuerzo: 'Regreso de almuerzo',
  salida: 'Salida',
};

// Detection throttling — 8fps es plenty pa' face match. Más es CPU desperdicio.
const DETECTION_FPS = 8;
const DETECTION_MS = 1000 / DETECTION_FPS;
// Cuántos frames consecutivos con detección estable antes de subir candidato al server
const STABILITY_FRAMES = 4;
// Match enrollment quality threshold (alineado con MIN_QUALITY de FacialEnrollmentModal).
const MIN_QUALITY_KIOSKO = 0.45;
// Alineado con server LIVENESS_THRESHOLD=0.6. Si bajamos acá, server rechaza y
// rate-limit bloquea legit users tras 5 intentos. Mantener exacto match.
const MIN_LIVENESS_PASSIVE = 0.6;

// Server-side match: cliente envía embedding al server (con nonce + claim empleado_id);
// server hace cosine contra DB. Embeddings ya NO viajan al cliente (HARDENING #1).
// Pa' identificar quién está al frente, KioskoApp envía embedding "blind" y server lo
// matchea contra TODOS los empleados de la zone. Nueva mutation pa' eso.

const KioskoApp = () => {
  const { token, testMode } = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      token: params.get('token') ?? '',
      // ?test=1 → modo prueba: facial recognition real pero NO marca,
      // no consume nonce, no toca jornadas. Pa' training/demo infinito.
      testMode: params.get('test') === '1',
    };
  }, []);

  // Split queries: estática (empleados) + dinámica (jornadas/horarios)
  const empleadosCtx = useQuery(
    api.asistencia.kioscos.getKioskoEmpleados,
    token ? { device_token: token } : 'skip',
  );
  const stateCtx = useQuery(
    api.asistencia.kioscos.getKioskoState,
    token ? { device_token: token } : 'skip',
  );

  const marcarPinMut = useMutation(api.asistencia.marcacion.marcarConPin);
  const marcarFacialMut = useMutation(api.asistencia.marcacion.marcarConFacial);
  const matchFacialMut = useMutation(api.asistencia.marcacion.matchFacial);
  const startSessionMut = useMutation(api.asistencia.marcacion.startFacialSession);
  const uploadUrlMut = useMutation(api.asistencia.marcacion.generateMarcacionUploadUrl);
  const pingMut = useMutation(api.asistencia.kioscos.ping);

  const [clock, setClock] = useState(new Date());
  const [gps, setGps] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [humanReady, setHumanReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // State machine
  const [state, setState] = useState('initializing'); // initializing | scanning | matched | confirming | result
  const [matched, setMatched] = useState(null); // { empleado, score, tipoSugerido, embedding, liveness }
  const [result, setResult] = useState(null);
  const [showPinFallback, setShowPinFallback] = useState(false);
  const [multipleFaces, setMultipleFaces] = useState(false);

  // Refs (no re-render)
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const humanRef = useRef(null);
  const rafRef = useRef(null);
  const lastDetectionMs = useRef(0);
  const stabilityCountRef = useRef(0);
  const autoConfirmTimerRef = useRef(null);
  const matchInFlightRef = useRef(false); // anti server-match storm
  const confirmInFlightRef = useRef(false); // anti double-submit (race auto-timer + click)
  const wakeLockRef = useRef(null);
  const matchedRef = useRef(null); // siempre el último matched (anti stale closure en timer)

  // ─── Reloj ────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // ─── GPS watch ────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocalización no disponible');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGpsError(null);
      },
      (err) => setGpsError(err.message),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // ─── Ping ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => pingMut({ device_token: token }).catch(() => {}), 60000);
    pingMut({ device_token: token }).catch(() => {});
    return () => clearInterval(id);
  }, [token, pingMut]);

  // ─── WakeLock (mantiene pantalla encendida) ───────────────────────
  // Pattern: single in-flight guard + verificar ref antes de asignar (evita
  // double-acquire si visibilitychange + 'release' event disparan a la vez).
  useEffect(() => {
    let canceled = false;
    let acquiring = false;

    const acquire = async () => {
      if (canceled || acquiring) return;
      if (wakeLockRef.current) return; // ya tenemos uno
      if (!('wakeLock' in navigator)) return;
      acquiring = true;
      try {
        const wl = await navigator.wakeLock.request('screen');
        if (canceled || wakeLockRef.current) {
          // Mientras await: o se desmontó, o otro acquire ganó. Liberar el nuevo.
          wl.release().catch(() => {});
          return;
        }
        wakeLockRef.current = wl;
        wl.addEventListener('release', () => {
          // Solo limpiar el ref si éste sigue siendo el activo
          if (wakeLockRef.current === wl) wakeLockRef.current = null;
        });
      } catch {
        // Sin wakeLock — degrada UX pero no fatal
      } finally {
        acquiring = false;
      }
    };

    acquire();
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      canceled = true;
      document.removeEventListener('visibilitychange', onVisible);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, []);

  // ─── Init Human + cámara ─────────────────────────────────────────
  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        humanRef.current = await initHuman();
        if (canceled) return;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false,
        });
        if (canceled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setHumanReady(true);
        setState('scanning');
      } catch (e) {
        if (!canceled) setCameraError(e.message || 'Error iniciando cámara');
      }
    })();
    return () => {
      canceled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ─── Detection loop ─────────────────────────────────────────────
  // Solo corre en estado "scanning" — pausa cuando matched/confirming/result.
  useEffect(() => {
    if (state !== 'scanning' || !humanReady || !empleadosCtx) return;

    const tick = async (ts) => {
      if (ts - lastDetectionMs.current >= DETECTION_MS) {
        lastDetectionMs.current = ts;
        if (videoRef.current?.readyState === 4 && humanRef.current && !matchInFlightRef.current) {
          try {
            const det = await detectFace(humanRef.current, videoRef.current);

            // Multi-face guard (HARDENING — wrong-person auto-confirm)
            if (det.faceCount > 1) {
              setMultipleFaces(true);
              stabilityCountRef.current = 0;
              rafRef.current = requestAnimationFrame(tick);
              return;
            }
            if (multipleFaces) setMultipleFaces(false);

            if (det.face && det.embedding && det.quality >= MIN_QUALITY_KIOSKO) {
              const livenessPassive = det.antispoof > 0 ? det.antispoof : 1;
              if (livenessPassive < MIN_LIVENESS_PASSIVE) {
                stabilityCountRef.current = 0;
              } else {
                stabilityCountRef.current++;
                if (stabilityCountRef.current >= STABILITY_FRAMES) {
                  // Tiramos al server pa' matchear (cliente NO tiene embeddings)
                  matchInFlightRef.current = true;
                  try {
                    const matchRes = await matchFacialMut({
                      device_token: token,
                      embedding: det.embedding,
                    });
                    // Re-check state después del await — usuario pudo haber transicionado
                    if (state !== 'scanning') {
                      matchInFlightRef.current = false;
                      return;
                    }
                    if (matchRes?.empleado_id && empleadosCtx) {
                      const empMeta = empleadosCtx.empleados.find(
                        (e) => e._id === matchRes.empleado_id,
                      );
                      if (empMeta) {
                        const tipoSugerido = autoDetectTipoMarca(
                          matchRes.empleado_id,
                          stateCtx?.jornadasHoy,
                          stateCtx?.horariosVigentes,
                        );
                        setMatched({
                          empleado: empMeta,
                          score: matchRes.score,
                          embedding: det.embedding,
                          liveness: det.liveness > 0 ? det.liveness : det.antispoof,
                          tipoSugerido,
                        });
                        setState('matched');
                        matchInFlightRef.current = false;
                        return;
                      }
                    }
                    // No match → reset y seguir scanning
                    stabilityCountRef.current = 0;
                  } catch {
                    stabilityCountRef.current = 0;
                  } finally {
                    matchInFlightRef.current = false;
                  }
                }
              }
            } else {
              stabilityCountRef.current = 0;
            }
          } catch {
            // ignore frame error
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [state, humanReady, empleadosCtx, stateCtx, multipleFaces, matchFacialMut, token]);

  // Mantener ref sincronizado con state (anti stale closure en timer)
  useEffect(() => {
    matchedRef.current = matched;
  }, [matched]);

  // ─── Auto-confirm timer ──────────────────────────────────────────
  useEffect(() => {
    if (state !== 'matched' || !matched || !empleadosCtx) return;
    const secs = empleadosCtx.zona.auto_confirm_segundos ?? 3;
    if (secs <= 0) return;
    autoConfirmTimerRef.current = setTimeout(() => {
      // Lee del ref pa' agarrar el último matched aunque haya cambiado durante el timer
      const m = matchedRef.current;
      if (m) handleConfirm(m.tipoSugerido);
    }, secs * 1000);
    return () => clearTimeout(autoConfirmTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, matched, empleadosCtx]);

  // ─── Confirmar marcación ────────────────────────────────────────
  const handleConfirm = useCallback(
    async (tipoMarca) => {
      // Anti double-submit (auto-timer + click manual race)
      if (confirmInFlightRef.current) return;
      confirmInFlightRef.current = true;
      clearTimeout(autoConfirmTimerRef.current);
      const m = matchedRef.current;
      if (!m || !videoRef.current) {
        confirmInFlightRef.current = false;
        return;
      }

      // ─── MODO PRUEBA ─── no llama backend, simula success
      if (testMode) {
        setState('confirming');
        await new Promise((r) => setTimeout(r, 400)); // pequeño delay pa' feel realista
        setResult({
          ok: true,
          tipo_marca: tipoMarca,
          empleado_nombre: `${m.empleado.nombre} ${m.empleado.apellido}`,
          timestamp: Date.now(),
          score: m.score,
          _test: true, // flag pa' UI
        });
        setState('result');
        confirmInFlightRef.current = false;
        return;
      }

      // ─── PRODUCCIÓN ─── flow real
      if (!gps) {
        confirmInFlightRef.current = false;
        return;
      }
      setState('confirming');
      try {
        const session = await startSessionMut({ device_token: token });
        const blob = await captureFrame(videoRef.current);
        const uploadUrl = await uploadUrlMut({ device_token: token });
        const storageId = await uploadBlobToConvex(uploadUrl, blob);
        const res = await marcarFacialMut({
          device_token: token,
          session_nonce: session.nonce,
          empleado_id: m.empleado._id,
          embedding_actual: m.embedding,
          liveness_score: m.liveness,
          tipo_marca: tipoMarca,
          gps_lat: gps.lat,
          gps_lng: gps.lng,
          gps_accuracy: gps.accuracy,
          foto_storage_id: storageId,
        });
        setResult(res);
        setState('result');
      } catch (e) {
        setResult({ ok: false, error: 'client_error', detalle: e.message });
        setState('result');
      } finally {
        confirmInFlightRef.current = false;
      }
    },
    [gps, marcarFacialMut, uploadUrlMut, startSessionMut, token, testMode],
  );

  const handleCancel = useCallback(() => {
    clearTimeout(autoConfirmTimerRef.current);
    setMatched(null);
    stabilityCountRef.current = 0;
    setState('scanning');
  }, []);

  const handleResultDismiss = useCallback(() => {
    setResult(null);
    setMatched(null);
    stabilityCountRef.current = 0;
    setState('scanning');
  }, []);

  // ─── Render guards ──────────────────────────────────────────────
  if (!token) {
    return <ErrorScreen title="Token faltante" message="URL inválida. Debe incluir ?token=XXX" />;
  }
  if (empleadosCtx === undefined) {
    return <LoadingScreen msg="Validando kiosko…" />;
  }
  if (empleadosCtx === null) {
    return <ErrorScreen title="Kiosko no autorizado" message="Token inválido, expirado o kiosko inactivo." />;
  }
  if (cameraError) {
    return <ErrorScreen title="Error de cámara" message={cameraError} />;
  }

  return (
    <div className={`kiosko ${testMode ? 'kiosko--test' : ''}`}>
      {testMode && (
        <div className="kiosko__test-banner">
          🧪 MODO PRUEBA — sin guardar marcaciones. Loop infinito pa' training.
        </div>
      )}
      <header className="kiosko__header">
        <div className="kiosko__logo">RMP</div>
        <div className="kiosko__zone">
          <div className="kiosko__zone-name">{empleadosCtx.zona.nombre}</div>
          {empleadosCtx.zona.direccion && <div className="kiosko__zone-addr">{empleadosCtx.zona.direccion}</div>}
        </div>
        <div className="kiosko__header-right">
          <div className="kiosko__clock-mini">
            {clock.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}
          </div>
          {!testMode && <GpsIndicator gps={gps} gpsError={gpsError} zona={empleadosCtx.zona} />}
        </div>
      </header>

      <main className="kiosko__main">
        <div className="kiosko__camera-stage">
          <video ref={videoRef} playsInline muted className="kiosko__video" />
          <div className="kiosko__face-guide" data-state={state} />
          {!humanReady && <div className="kiosko__loading-overlay"><div className="kiosko-spinner" /><p>Cargando reconocimiento facial…</p></div>}
          {multipleFaces && state === 'scanning' && (
            <div className="kiosko__loading-overlay kiosko__loading-overlay--warn">
              <p>⚠️ Varias caras detectadas — solo una persona a la vez</p>
            </div>
          )}
        </div>

        {gpsError && !testMode && (
          <div className="kiosko__status-card kiosko__status-card--warn">
            <h2>GPS requerido</h2>
            <p>{gpsError}. Activa ubicación pa' marcar.</p>
          </div>
        )}

        {state === 'scanning' && (!gpsError || testMode) && (
          <div className="kiosko__status-card">
            <h2>{testMode ? 'Mira a la cámara (prueba)' : 'Mira a la cámara'}</h2>
            <p>
              {empleadosCtx.empleados.filter((e) => e.tiene_facial).length} empleados con rostro registrado
              {testMode && ' · cualquiera puede probar'}
            </p>
          </div>
        )}

        {state === 'matched' && matched && (
          <MatchedCard
            matched={matched}
            autoConfirmSecs={empleadosCtx.zona.auto_confirm_segundos ?? 3}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        )}

        {state === 'confirming' && (
          <div className="kiosko__status-card kiosko__status-card--working">
            <div className="kiosko-spinner" />
            <p>Registrando marcación…</p>
          </div>
        )}
      </main>

      <footer className="kiosko__footer">
        <button className="kiosko-btn kiosko-btn--ghost" onClick={() => setShowPinFallback(true)}>
          No me reconoce — usar cédula + PIN
        </button>
      </footer>

      {showPinFallback && (
        <PinFallbackModal
          token={token}
          gps={gps}
          marcarPinMut={marcarPinMut}
          onClose={() => setShowPinFallback(false)}
          onResult={(r) => { setResult(r); setShowPinFallback(false); setState('result'); }}
        />
      )}

      {result && state === 'result' && (
        <ResultOverlay
          result={result}
          onDismiss={handleResultDismiss}
          autoDismissMs={testMode ? 1500 : 3500}
        />
      )}
    </div>
  );
};

// ─── Sub-componentes ────────────────────────────────────────────────

const MatchedCard = ({ matched, autoConfirmSecs, onConfirm, onCancel }) => {
  const [secsLeft, setSecsLeft] = useState(autoConfirmSecs);
  const [paused, setPaused] = useState(false); // pause timer si user interactúa

  useEffect(() => {
    if (autoConfirmSecs <= 0 || paused) return;
    if (secsLeft <= 0) return;
    const id = setInterval(() => setSecsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [autoConfirmSecs, paused, secsLeft]);

  const showCountdown = autoConfirmSecs > 0 && !paused && secsLeft > 0;

  return (
    <div className="kiosko__match-card">
      <div className="kiosko__match-greeting">
        <span>Hola,</span>
        <strong>{matched.empleado.nombre} {matched.empleado.apellido}</strong>
        <span className="kiosko__match-score">match {(matched.score * 100).toFixed(0)}%</span>
      </div>

      <p className="kiosko__match-hint">
        {showCountdown
          ? `Marcando ${TIPO_MARCA_LABELS[matched.tipoSugerido]} en ${secsLeft}s — toca otro si no es:`
          : 'Elige el tipo de marcación:'}
      </p>

      <div className="kiosko__match-tipos kiosko__match-tipos--grid">
        {Object.entries(TIPO_MARCA_LABELS).map(([k, label]) => {
          const isSuggested = k === matched.tipoSugerido;
          return (
            <button
              key={k}
              className={`kiosko-btn kiosko-btn--lg ${isSuggested ? 'kiosko-btn--primary kiosko-btn--suggested' : ''}`}
              onClick={() => onConfirm(k)}
              onMouseEnter={() => setPaused(true)}
              onTouchStart={() => setPaused(true)}
            >
              <span className="kiosko-btn__label">{label}</span>
              {isSuggested && showCountdown && (
                <span className="kiosko-countdown-badge">{secsLeft}s</span>
              )}
              {isSuggested && !showCountdown && (
                <span className="kiosko-suggested-badge">sugerido</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="kiosko__match-extras">
        <button className="kiosko-btn kiosko-btn--ghost" onClick={onCancel}>
          No soy yo
        </button>
      </div>
    </div>
  );
};

const PinFallbackModal = ({ token, gps, marcarPinMut, onClose, onResult }) => {
  const [cedula, setCedula] = useState('');
  const [pin, setPin] = useState('');
  const [tipoMarca, setTipoMarca] = useState('entrada');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = cedula.trim().length > 0 && /^\d{4}$/.test(pin) && gps && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await marcarPinMut({
        device_token: token,
        cedula: cedula.trim(),
        pin,
        tipo_marca: tipoMarca,
        gps_lat: gps.lat,
        gps_lng: gps.lng,
        gps_accuracy: gps.accuracy,
      });
      onResult(res);
    } catch (e) {
      onResult({ ok: false, error: 'client_error', detalle: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="kiosko-modal" onClick={onClose}>
      <div className="kiosko-modal__panel" onClick={(e) => e.stopPropagation()}>
        <h2>Marcar con cédula + PIN</h2>
        <label className="kiosko-modal__field">
          <span>Cédula</span>
          <input
            className="kiosko-modal__input"
            inputMode="numeric"
            placeholder="8-123-456"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            autoFocus
          />
        </label>
        <label className="kiosko-modal__field">
          <span>PIN (4 dígitos)</span>
          <input
            className="kiosko-modal__input kiosko-modal__input--pin"
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
        </label>
        <fieldset className="kiosko-modal__tipos">
          <legend>Tipo de marcación</legend>
          {Object.entries(TIPO_MARCA_LABELS).map(([key, label]) => (
            <label key={key} className={`kiosko-modal__tipo ${tipoMarca === key ? 'is-active' : ''}`}>
              <input type="radio" name="tipo_marca" value={key} checked={tipoMarca === key} onChange={(e) => setTipoMarca(e.target.value)} />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        <div className="kiosko-modal__actions">
          <button className="kiosko-btn" onClick={onClose}>Cancelar</button>
          <button className="kiosko-btn kiosko-btn--primary" disabled={!canSubmit} onClick={handleSubmit}>
            {submitting ? 'Marcando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};

const GpsIndicator = ({ gps, gpsError, zona }) => {
  if (gpsError) return <div className="kiosko__gps kiosko__gps--error" title={gpsError}>GPS error</div>;
  if (!gps) return <div className="kiosko__gps kiosko__gps--loading">GPS…</div>;
  const dist = distanceMeters(gps.lat, gps.lng, zona.latitud, zona.longitud);
  const inside = dist <= zona.radio;
  return (
    <div className={`kiosko__gps ${inside ? 'kiosko__gps--ok' : 'kiosko__gps--out'}`}>
      {inside ? `${Math.round(dist)}m` : `${Math.round(dist)}m ✗`}
    </div>
  );
};

const LoadingScreen = ({ msg = 'Cargando…' }) => (
  <div className="kiosko-loading">
    <div className="kiosko-spinner" />
    <p>{msg}</p>
  </div>
);

const ErrorScreen = ({ title, message }) => (
  <div className="kiosko-error">
    <h1>{title}</h1>
    <p>{message}</p>
  </div>
);

const ERROR_MESSAGES = {
  kiosko_invalido: 'Kiosko no autorizado',
  kiosko_inactivo: 'Kiosko desactivado por admin',
  tipo_marca_invalido: 'Tipo de marcación inválido para tu jornada',
  empleado_no_existe: 'Empleado no registrado en esta organización',
  empleado_inactivo: 'Empleado inactivo o no habilitado',
  pin_no_configurado: 'Empleado sin PIN. Contacta al admin.',
  pin_fail: 'PIN incorrecto',
  pin_locked: 'PIN bloqueado por intentos fallidos. Espera 5 minutos.',
  empleado_no_zone: 'No estás asignado a esta zona',
  geofence_fail: 'Estás fuera del radio de marcación',
  zona_no_encontrada: 'Error de configuración: zona no encontrada',
  facial_low_score: 'No te reconozco con suficiente confianza',
  liveness_fail: 'No se detecta cara real',
  facial_no_enrolled: 'Empleado sin rostro registrado',
  facial_invalid_shape: 'Error de embedding facial',
  facial_invalid_norm: 'Embedding facial mal normalizado (intenta de nuevo)',
  facial_locked: 'Reconocimiento facial bloqueado 15 min por intentos fallidos. Usa PIN.',
  session_invalid: 'Sesión facial inválida o expirada. Mira de nuevo a la cámara.',
  client_error: 'Error del cliente',
};

const ResultOverlay = ({ result, onDismiss, autoDismissMs = 3500 }) => {
  useEffect(() => {
    const id = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(id);
  }, [onDismiss, autoDismissMs]);

  if (result.ok) {
    return (
      <div className={`kiosko-result kiosko-result--ok ${result._test ? 'kiosko-result--test' : ''}`} onClick={onDismiss}>
        <div className="kiosko-result__icon">{result._test ? '🧪' : '✓'}</div>
        <h2>
          {result._test && <span className="kiosko-result__test-badge">PRUEBA</span>}
          {TIPO_MARCA_LABELS[result.tipo_marca]} {result._test ? '(simulada)' : 'registrada'}
        </h2>
        <p>{result.empleado_nombre}</p>
        <p className="kiosko-result__time">
          {new Date(result.timestamp).toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
        {result.score !== undefined && (
          <p className="kiosko-result__meta">facial {(result.score * 100).toFixed(0)}%</p>
        )}
      </div>
    );
  }

  let msg = ERROR_MESSAGES[result.error] ?? result.error ?? 'Error desconocido';
  if (result.error === 'geofence_fail' && result.distancia_m !== undefined) {
    msg = `Estás a ${result.distancia_m}m (precisión ±${result.accuracy_m ?? 0}m). Radio: ${result.radio_m}m.`;
  }
  if (result.error === 'pin_fail' && result.intentos_restantes !== undefined) {
    msg = `PIN incorrecto. ${result.intentos_restantes} intento(s) antes del bloqueo.`;
  }
  if (result.error === 'tipo_marca_invalido' && result.detalle) {
    msg = result.detalle;
  }
  if (result.error === 'facial_low_score' && result.score !== undefined) {
    msg = `Match insuficiente: ${(result.score * 100).toFixed(0)}% (mínimo ${(result.threshold * 100).toFixed(0)}%). Usa PIN.`;
  }

  return (
    <div className="kiosko-result kiosko-result--fail" onClick={onDismiss}>
      <div className="kiosko-result__icon">✕</div>
      <h2>Marcación rechazada</h2>
      <p>{msg}</p>
    </div>
  );
};

// ─── Helpers ────────────────────────────────────────────────────────

// Auto-detección del tipo de marca según jornada + hora del horario vigente.
// Devuelve string: "entrada" | "salida_almuerzo" | "regreso_almuerzo" | "salida"
function autoDetectTipoMarca(empId, jornadasHoy, horariosVigentes) {
  const j = jornadasHoy?.[empId] ?? {};
  const h = horariosVigentes?.[empId];
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  if (!j.entrada) return 'entrada';
  if (j.salida_almuerzo && !j.regreso_almuerzo) return 'regreso_almuerzo';

  // Almuerzo: si hora actual cerca de hora_almuerzo_inicio (±60min)
  if (h?.hora_almuerzo_inicio && !j.salida_almuerzo) {
    const [hh, mm] = h.hora_almuerzo_inicio.split(':').map(Number);
    const alm = hh * 60 + mm;
    if (Math.abs(nowMin - alm) <= 60) return 'salida_almuerzo';
  }

  // Salida final
  if (h?.hora_salida) {
    const [hh, mm] = h.hora_salida.split(':').map(Number);
    const sal = hh * 60 + mm;
    if (nowMin >= sal - 60) return 'salida';
  }

  // Fallback: si entró y no hay info clara, sugerir salida
  if (j.entrada && !j.salida) return 'salida';
  return 'entrada';
}

function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default KioskoApp;
