/**
 * Helpers consistentes para formateo de fechas en RMP.
 * Locale es-PA (Panamá). Todos aceptan Date | string ISO | number (ms).
 */

const DAYS_ES_FULL = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

const toDate = (input) => {
  if (input instanceof Date) return input;
  if (typeof input === 'number') return new Date(input);
  if (typeof input === 'string') return new Date(input);
  return null;
};

/** "7 may", "8 may 2026" si es de otro año */
export const formatShort = (input) => {
  const d = toDate(input);
  if (!d || isNaN(d)) return '';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('es-PA', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
};

/** "7 de mayo de 2026, 14:30" */
export const formatFull = (input) => {
  const d = toDate(input);
  if (!d || isNaN(d)) return '';
  return d.toLocaleString('es-PA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

/** "Hace 5 min", "Hace 2 h", "Ayer", "7 may" */
export const formatRelative = (input) => {
  const d = toDate(input);
  if (!d || isNaN(d)) return '';
  const now = Date.now();
  const diff = now - d.getTime();

  if (diff < 60_000) return 'Hace menos de 1 min';
  if (diff < 3_600_000) return `Hace ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `Hace ${Math.floor(diff / 3_600_000)} h`;
  if (diff < 172_800_000) return 'Ayer';
  if (diff < 604_800_000) return `Hace ${Math.floor(diff / 86_400_000)} días`;
  return formatShort(d);
};

/** "14:30" — solo hora */
export const formatTime = (input) => {
  const d = toDate(input);
  if (!d || isNaN(d)) return '';
  return d.toLocaleTimeString('es-PA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

/** "lunes" — nombre del día */
export const formatDayName = (input) => {
  const d = toDate(input);
  if (!d || isNaN(d)) return '';
  return DAYS_ES_FULL[d.getDay()];
};

/** "2026-05-07" — ISO date sin hora (para inputs date) */
export const formatISODate = (input) => {
  const d = toDate(input);
  if (!d || isNaN(d)) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Despachador único: formatDate(d, 'short' | 'full' | 'relative' | 'time' | 'day' | 'iso')
 */
export const formatDate = (input, kind = 'short') => {
  switch (kind) {
    case 'full':     return formatFull(input);
    case 'relative': return formatRelative(input);
    case 'time':     return formatTime(input);
    case 'day':      return formatDayName(input);
    case 'iso':      return formatISODate(input);
    case 'short':
    default:         return formatShort(input);
  }
};

export default formatDate;
