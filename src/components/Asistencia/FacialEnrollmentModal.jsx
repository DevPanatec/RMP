import { useEffect, useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Camera, Check, X, AlertTriangle, RefreshCw } from '../Icons';
import toast from 'react-hot-toast';
import './FacialEnrollmentModal.css';

// Dynamic import — no traer Human (~10MB) al admin bundle por defecto.
// Cargado solo cuando se abre el modal de enrollment.
let _facialLib = null;
async function loadFacialLib() {
  if (_facialLib) return _facialLib;
  _facialLib = await import('../../lib/facial');
  return _facialLib;
}

const POSES = [
  { id: 'frente', label: 'Mira al frente', instruction: 'Cara centrada, mirando directo a la cámara' },
  { id: 'izquierda', label: 'Gira a la izquierda', instruction: 'Gira la cabeza ~20° a tu izquierda' },
  { id: 'derecha', label: 'Gira a la derecha', instruction: 'Gira la cabeza ~20° a tu derecha' },
  { id: 'arriba', label: 'Mira ligeramente arriba', instruction: 'Inclina la cabeza un poco hacia arriba' },
  { id: 'sonrisa', label: 'Sonríe naturalmente', instruction: 'Cara al frente, expresión relajada' },
];

const MIN_QUALITY = 0.45;
const MIN_ANTISPOOF = 0.5;
// Re-export pa' compartir constante con KioskoApp (mantenibilidad)
export const ENROLLMENT_MIN_QUALITY = MIN_QUALITY;

const FacialEnrollmentModal = ({ empleado, onClose, onComplete }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const humanRef = useRef(null);
  const rafRef = useRef(null);

  const [phase, setPhase] = useState('init'); // init | ready | capturing | uploading | done | error
  const [errorMsg, setErrorMsg] = useState('');
  const [currentPoseIdx, setCurrentPoseIdx] = useState(0);
  const [captured, setCaptured] = useState([]); // [{ pose, embedding, blob, quality }]
  const [liveScore, setLiveScore] = useState(null); // live detection feedback
  const [enrolling, setEnrolling] = useState(false);

  const enrollMut = useMutation(api.asistencia.facial.enrollEmpleado);
  const uploadUrlMut = useMutation(api.asistencia.facial.generateEnrollmentUploadUrl);
  const deleteOrphanMut = useMutation(api.asistencia.facial.deleteOrphanStorage);

  const [retryNonce, setRetryNonce] = useState(0); // pa' re-disparar init en reintento

  // Init: cargar Human (dynamic import) + cámara
  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        setPhase('init');
        setErrorMsg('');
        const lib = await loadFacialLib();
        humanRef.current = await lib.initHuman();
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
          // play() puede fallar sin user-gesture en iOS Safari — capturar y mostrar retry
          await videoRef.current.play();
        }
        setPhase('ready');
      } catch (e) {
        if (canceled) return;
        setErrorMsg(e.message || 'No se pudo iniciar la cámara');
        setPhase('error');
      }
    })();
    return () => {
      canceled = true;
      stopCamera();
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryNonce]);

  // Live detection loop — solo pa' UX feedback (quality bar, cara detectada)
  useEffect(() => {
    if (phase !== 'ready' && phase !== 'capturing') return;
    let lastDetection = 0;
    const TARGET_FPS = 6;
    const FRAME_MS = 1000 / TARGET_FPS;

    const tick = async (ts) => {
      if (ts - lastDetection > FRAME_MS && humanRef.current && videoRef.current?.readyState === 4) {
        lastDetection = ts;
        try {
          const lib = await loadFacialLib();
          const det = await lib.detectFace(humanRef.current, videoRef.current);
          setLiveScore({
            quality: det.quality,
            antispoof: det.antispoof,
            hasFace: !!det.face,
            multipleFaces: det.faceCount > 1,
          });
        } catch {
          // ignore — siguiente frame
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const handleCapture = async () => {
    if (!humanRef.current || !videoRef.current) return;
    setPhase('capturing');
    try {
      const lib = await loadFacialLib();
      const det = await lib.detectFace(humanRef.current, videoRef.current);
      if (det.faceCount > 1) {
        toast.error('Varias caras detectadas. Solo una persona.');
        setPhase('ready');
        return;
      }
      if (!det.face || !det.embedding) {
        toast.error('No detecté tu cara. Intenta de nuevo.');
        setPhase('ready');
        return;
      }
      if (det.quality < MIN_QUALITY) {
        toast.error(`Calidad baja (${(det.quality * 100).toFixed(0)}%). Acércate o mejora la luz.`);
        setPhase('ready');
        return;
      }
      if (det.antispoof > 0 && det.antispoof < MIN_ANTISPOOF) {
        toast.error('No se detecta cara real. Sin pantallas o fotos impresas.');
        setPhase('ready');
        return;
      }
      const blob = await lib.captureFrame(videoRef.current);
      const newCapture = {
        pose: POSES[currentPoseIdx].id,
        embedding: det.embedding,
        blob,
        quality: det.quality,
      };
      const nextCaptured = [...captured, newCapture];
      setCaptured(nextCaptured);
      if (currentPoseIdx + 1 < POSES.length) {
        setCurrentPoseIdx(currentPoseIdx + 1);
        setPhase('ready');
      } else {
        // Completo todas las poses → upload + enroll
        await finishEnrollment(nextCaptured);
      }
    } catch (e) {
      toast.error(e.message || 'Error al capturar');
      setPhase('ready');
    }
  };

  const finishEnrollment = async (allCaptured) => {
    setPhase('uploading');
    setEnrolling(true);
    let successfulIds = [];
    try {
      const lib = await loadFacialLib();
      // Uploads paralelos con allSettled — si 1 falla, los otros NO quedan huérfanos
      const results = await Promise.allSettled(
        allCaptured.map(async ({ blob }) => {
          const url = await uploadUrlMut({});
          return lib.uploadBlobToConvex(url, blob);
        }),
      );
      const failed = results.filter((r) => r.status === 'rejected');
      successfulIds = results
        .filter((r) => r.status === 'fulfilled')
        .map((r) => r.value);
      if (failed.length > 0) {
        // Cleanup blobs huérfanos antes de bailar
        if (successfulIds.length > 0) {
          await deleteOrphanMut({ storage_ids: successfulIds }).catch(() => {});
        }
        throw new Error(`${failed.length} foto(s) fallaron al subir`);
      }
      const embeddings = allCaptured.map((c) => c.embedding);
      const qualityScores = allCaptured.map((c) => c.quality);
      const res = await enrollMut({
        empleado_id: empleado._id,
        embeddings,
        foto_storage_ids: successfulIds,
        quality_scores: qualityScores,
      });
      if (!res.ok) {
        // enrollMut falló post-upload → limpiar blobs subidos
        await deleteOrphanMut({ storage_ids: successfulIds }).catch(() => {});
        throw new Error('Enrollment falló');
      }
      toast.success(`Rostro registrado (${res.n_embeddings} fotos)`);
      setPhase('done');
      setTimeout(() => {
        stopCamera();
        onComplete?.();
      }, 1500);
    } catch (e) {
      toast.error(e.message || 'Error al guardar');
      // Reset captured pa' evitar pose-6 bug si reintenta (antes acumulaba duplicados)
      setCaptured([]);
      setCurrentPoseIdx(0);
      setPhase('ready');
    } finally {
      setEnrolling(false);
    }
  };

  const handleReset = () => {
    setCaptured([]);
    setCurrentPoseIdx(0);
    setPhase('ready');
  };

  const currentPose = POSES[currentPoseIdx];
  const progress = (captured.length / POSES.length) * 100;

  return (
    <div className="facial-modal" onClick={onClose}>
      <div className="facial-modal__panel" onClick={(e) => e.stopPropagation()}>
        <header className="facial-modal__header">
          <div>
            <h2>Registrar rostro</h2>
            <p>{empleado.nombre} {empleado.apellido}</p>
          </div>
          <button className="facial-btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        {phase === 'init' && (
          <div className="facial-modal__status">
            <div className="facial-spinner" />
            <p>Cargando modelos de reconocimiento (primera vez ~10MB)…</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="facial-modal__error">
            <AlertTriangle size={32} />
            <p>{errorMsg}</p>
            <button className="facial-btn facial-btn--primary" onClick={() => setRetryNonce((n) => n + 1)}>
              <RefreshCw size={16} /> Reintentar
            </button>
          </div>
        )}

        {(phase === 'ready' || phase === 'capturing' || phase === 'uploading') && (
          <>
            <div className="facial-modal__camera">
              <video ref={videoRef} playsInline muted />
              <div className="facial-modal__overlay">
                <div className="facial-modal__face-box" />
              </div>
              <div className="facial-modal__feedback">
                {liveScore?.hasFace ? (
                  <div className={`facial-quality ${liveScore.quality >= MIN_QUALITY ? 'is-ok' : 'is-low'}`}>
                    Calidad {(liveScore.quality * 100).toFixed(0)}%
                    {liveScore.antispoof > 0 && (
                      <span> · Real {(liveScore.antispoof * 100).toFixed(0)}%</span>
                    )}
                  </div>
                ) : (
                  <div className="facial-quality is-low">No detecto cara</div>
                )}
              </div>
            </div>

            <div className="facial-modal__progress">
              <div className="facial-progress__bar">
                <div className="facial-progress__fill" style={{ width: `${progress}%` }} />
              </div>
              <span>{captured.length} / {POSES.length}</span>
            </div>

            <div className="facial-modal__pose">
              <h3>{currentPose.label}</h3>
              <p>{currentPose.instruction}</p>
            </div>

            <footer className="facial-modal__actions">
              {captured.length > 0 && (
                <button className="facial-btn" onClick={handleReset} disabled={enrolling}>
                  Reiniciar
                </button>
              )}
              <button
                className="facial-btn facial-btn--primary"
                onClick={handleCapture}
                disabled={
                  phase === 'capturing' ||
                  phase === 'uploading' ||
                  !liveScore?.hasFace ||
                  (liveScore?.quality ?? 0) < MIN_QUALITY
                }
              >
                <Camera size={18} />
                {phase === 'capturing' && 'Capturando…'}
                {phase === 'uploading' && 'Subiendo…'}
                {phase === 'ready' && (captured.length < POSES.length - 1 ? 'Capturar foto' : 'Capturar y guardar')}
              </button>
            </footer>
          </>
        )}

        {phase === 'done' && (
          <div className="facial-modal__status facial-modal__status--ok">
            <Check size={48} />
            <p>Rostro registrado correctamente</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacialEnrollmentModal;
