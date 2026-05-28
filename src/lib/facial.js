// Human library wrapper — singleton lazy-init.
// Bundle size es ~10MB; este módulo se importa solo donde se necesita (kiosko + enrollment).
//
// Optimizaciones:
// - Singleton: solo 1 instancia Human inicializada por sesión.
// - Modelos via CDN (jsDelivr). Pa' offline-first, copiar a /public/models/ y cambiar modelBasePath.
// - WebGL backend default (GPU acelerado). Falla → WASM. Falla → CPU.
// - Detección throttled a 8 fps (configurable). Más que eso desperdicia CPU sin mejorar UX.
// - Cosine similarity precomputable: embeddings YA llegan normalizados del backend.

// Self-hosted: modelos copiados a public/models/human/. Cache via IndexedDB funciona
// solo con URLs same-origin (no CDN cross-origin). Boot 60s→2s en kioskos cellular.
// Si los modelos no existen localmente, fallback a CDN como defensa.
const MODEL_BASE_PATH = '/models/human/';
const MODEL_FALLBACK_PATH = 'https://cdn.jsdelivr.net/npm/@vladmandic/human@3.3.6/models/';

const HUMAN_CONFIG = {
  modelBasePath: MODEL_BASE_PATH,
  backend: 'webgl', // 'wasm' como fallback si WebGL no disponible
  warmup: 'face',
  cacheModels: true,
  cacheSensitivity: 0,
  face: {
    enabled: true,
    detector: {
      modelPath: 'blazeface.json',
      rotation: false,
      maxDetected: 1,           // 1 cara a la vez en kiosko
      minConfidence: 0.4,
      iouThreshold: 0.1,
      return: false,
    },
    mesh: { enabled: true, modelPath: 'facemesh.json' },
    iris: { enabled: false },
    description: {
      enabled: true,
      modelPath: 'faceres.json', // 1024D embedding
    },
    emotion: { enabled: false },
    antispoof: { enabled: true, modelPath: 'antispoof.json' },
    liveness: { enabled: true, modelPath: 'liveness.json' },
    attention: { enabled: false },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: false },
  segmentation: { enabled: false },
  filter: { enabled: false },
};

let _human = null;
let _humanPromise = null;

/**
 * Inicializa Human library una sola vez. Devuelve instancia lista para detect().
 * Cargas TFJS + modelos ocurren acá. Subsequent calls devuelven la misma instancia.
 *
 * Estrategia: intenta self-hosted (`/models/human/`). Si falla, fallback a CDN.
 */
export async function initHuman() {
  if (_human) return _human;
  if (_humanPromise) return _humanPromise;

  _humanPromise = (async () => {
    const HumanModule = await import('@vladmandic/human');
    const Human = HumanModule.Human ?? HumanModule.default ?? HumanModule;
    let human = new Human(HUMAN_CONFIG);
    try {
      await human.load();
      await human.warmup();
    } catch (e) {
      // Fallback a CDN si self-hosted falla (modelos no copiados a /public/models)
      console.warn('[facial] self-hosted models failed, falling back to CDN:', e?.message);
      human = new Human({ ...HUMAN_CONFIG, modelBasePath: MODEL_FALLBACK_PATH });
      await human.load();
      await human.warmup();
    }
    _human = human;
    return human;
  })();
  return _humanPromise;
}

/**
 * Detecta 1 cara en un video element / canvas / ImageData. Devuelve objeto procesado:
 * { face: HumanFace | null, embedding: Float32Array | null, liveness: number, antispoof: number }
 *
 * embedding viene L2-normalizado pa' que cosineSimilarity = dot product directo.
 */
export async function detectFace(human, input) {
  const result = await human.detect(input);
  if (!result.face || result.face.length === 0) {
    return { face: null, embedding: null, liveness: 0, antispoof: 0, quality: 0, faceCount: 0 };
  }
  // HARDENING: si hay múltiples caras, NO matchear (riesgo: persona equivocada confirmada)
  const faceCount = result.face.length;
  const face = result.face[0];
  const embedding = face.embedding ? l2Normalize(face.embedding) : null;
  const liveness = typeof face.live === 'number' ? face.live : 0;
  const antispoof = typeof face.real === 'number' ? face.real : 0;
  // Quality heuristic: combina confidence + tamaño box + ángulos de cabeza ~frontales
  let quality = (face.score ?? face.faceScore ?? 0) || 0;
  if (face.rotation) {
    const yaw = Math.abs(face.rotation.angle?.yaw ?? 0);
    const pitch = Math.abs(face.rotation.angle?.pitch ?? 0);
    // Penaliza más de 30° en cualquier eje
    const anglePenalty = Math.max(0, 1 - Math.max(yaw, pitch) / 0.52); // 0.52 rad ≈ 30°
    quality *= anglePenalty;
  }
  return { face, embedding, liveness, antispoof, quality, faceCount };
}

/**
 * Cosine similarity entre dos vectores normalizados = dot product.
 * Devuelve [-1, 1]; 1 = igual, 0 = ortogonal, -1 = opuesto.
 */
export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return -1;
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

/**
 * Encuentra el mejor match en una lista de empleados (cada uno con embedding_promedio).
 * Devuelve { empleado, score } o null si ningún match supera el threshold.
 * Optimizado: O(N) donde N = empleados de la zone. Para 100 empleados ~5ms.
 */
export function findBestMatch(currentEmbedding, empleados, threshold = 0.55) {
  if (!currentEmbedding) return null;
  let best = null;
  let bestScore = threshold; // gate inicial al threshold; mejora si encuentra
  for (const emp of empleados) {
    if (!emp.embedding_promedio) continue;
    const score = cosineSimilarity(currentEmbedding, emp.embedding_promedio);
    if (score > bestScore) {
      bestScore = score;
      best = emp;
    }
  }
  return best ? { empleado: best, score: bestScore } : null;
}

/**
 * L2-normalize un vector pa' que ||v|| = 1. Necesario para cosine similarity como dot product.
 */
function l2Normalize(vec) {
  const arr = Array.from(vec);
  let norm = 0;
  for (let i = 0; i < arr.length; i++) norm += arr[i] * arr[i];
  norm = Math.sqrt(norm);
  if (norm < 1e-9) return arr;
  for (let i = 0; i < arr.length; i++) arr[i] /= norm;
  return arr;
}

/**
 * Captura frame del video element como JPEG blob comprimido pa' upload.
 * Default: 480p, quality 0.7, ~30-60 KB típico.
 */
export function captureFrame(videoEl, maxWidth = 640, quality = 0.7) {
  return new Promise((resolve, reject) => {
    // Guard: video metadata aún no listo (camera attached pero sin frame) → NaN canvas
    if (!videoEl || !videoEl.videoWidth || !videoEl.videoHeight) {
      reject(new Error('Cámara no lista pa\' capturar (sin metadata)'));
      return;
    }
    const w = Math.min(videoEl.videoWidth, maxWidth);
    const h = (videoEl.videoHeight / videoEl.videoWidth) * w;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoEl, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob falló'));
      },
      'image/jpeg',
      quality,
    );
  });
}

/**
 * Sube blob al storage de Convex usando una URL pre-firmada.
 * Devuelve storage_id pa' usar en mutations.
 */
export async function uploadBlobToConvex(uploadUrl, blob) {
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': blob.type },
    body: blob,
  });
  if (!res.ok) throw new Error(`Upload falló: ${res.status}`);
  const { storageId } = await res.json();
  return storageId;
}
