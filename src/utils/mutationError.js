import notify from './notify';

// Patrón backend: `Módulo "Limpieza" no contratado por la organización`
// Lo lanza convex/lib/modules.ts requireModulo().
const MODULO_RE = /Módulo "(.+?)" no contratado por la organización/;

// Mapa código → descripción humana para errores comunes.
const ROLE_PATTERNS = [
  { re: /No autenticado/i, msg: 'Tu sesión expiró. Iniciá sesión nuevamente.' },
  { re: /Sin permisos de escritura/i, msg: 'Tu cuenta no tiene permisos para esta acción (es solo lectura).' },
  { re: /Acceso denegado/i, msg: 'No tenés acceso a este recurso.' },
  { re: /Usuario sin organización/i, msg: 'Tu usuario no está asignado a una organización.' },
];

// Extrae mensaje legible de un Convex ConvexError o Error genérico.
// Convex envuelve los Error en strings tipo "[CONVEX M(...)] [Server Error] Uncaught Error: msg".
function extractMessage(err) {
  if (!err) return 'Error desconocido';
  const raw = typeof err === 'string' ? err : err.message ?? String(err);
  // Limpiar prefijos Convex
  const match = raw.match(/Uncaught Error: (.+?)(?:\n|$|\s+at\s)/);
  return match ? match[1].trim() : raw;
}

/**
 * Maneja error de mutation y muestra toast user-friendly.
 * Detecta patrones conocidos (módulo no contratado, permisos, sesión).
 *
 * @param {unknown} err - Error capturado del catch
 * @param {string} fallback - Mensaje genérico si no matchea patrón conocido
 * @returns {string} Mensaje mostrado al usuario (útil para logging)
 */
export function handleMutationError(err, fallback = 'Ocurrió un error al procesar la solicitud') {
  const msg = extractMessage(err);

  // 1) Módulo deshabilitado mid-session — caso prioritario para el plan SaaS.
  const moduloMatch = msg.match(MODULO_RE);
  if (moduloMatch) {
    const moduloNombre = moduloMatch[1];
    const friendly = `El módulo "${moduloNombre}" fue desactivado para tu organización. Contactá al administrador para reactivarlo.`;
    notify.warning(friendly, { duration: 6000 });
    return friendly;
  }

  // 2) Otros patrones conocidos
  for (const { re, msg: friendly } of ROLE_PATTERNS) {
    if (re.test(msg)) {
      notify.error(friendly);
      return friendly;
    }
  }

  // 3) Mostrar mensaje del backend tal cual si es corto + parece humano,
  // o fallback genérico si es ruido.
  const looksHuman = msg.length > 5 && msg.length < 200 && !msg.includes('[CONVEX');
  const final = looksHuman ? msg : fallback;
  notify.error(final);
  return final;
}

export default handleMutationError;
