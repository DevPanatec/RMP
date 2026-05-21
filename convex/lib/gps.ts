// Helper para derivar estado de movimiento de un vehículo a partir de su GPS.
// Usado por queries de vehículos pa' pintar markers del mapa con colores correctos.
//
// 3 estados:
//   - en_movimiento: speed > MOTION_SPEED_THRESHOLD (kph)
//   - parado: speed = 0 + última motion hace < PARADO_WINDOW_MS
//   - estacionado: speed = 0 + sin motion > PARADO_WINDOW_MS (o GPS desconectado / sin data)
//
// Importante: si el GPS lleva días sin reportar, queda como "estacionado" en su última
// posición conocida. No se filtra. Trade-off aceptado en producción (asumimos GPS confiable).

export type MotionState = "en_movimiento" | "parado" | "estacionado";

// Velocidad mínima pa' considerar "en movimiento" — filtra jitter de GPS estacionario.
export const MOTION_SPEED_THRESHOLD = 2;

// Ventana pa' considerar una parada "técnica" (semáforo, carga corta) vs estacionamiento.
export const PARADO_WINDOW_MS = 5 * 60 * 1000;

// Si el último ping del GPS es más viejo que esto, la velocidad cacheada NO es confiable.
// SafeTag devuelve `speed` cached pa' devices desconectados — sin esta guarda un device
// muerto con `speed=30` cached aparecería como "en movimiento" eternamente.
export const STALE_PING_WINDOW_MS = 5 * 60 * 1000;

// Haversine distance in km between two GPS coordinates.
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getMotionState(
  speed?: number | null,
  ultimaMotion?: number | null,
  ultimaActualizacion?: number | null,
  now: number = Date.now(),
): MotionState {
  // Si el GPS no reportó hace rato, la speed cacheada miente. Caer a motion timestamp.
  const isFresh =
    !!ultimaActualizacion && now - ultimaActualizacion < STALE_PING_WINDOW_MS;

  if (isFresh && (speed ?? 0) > MOTION_SPEED_THRESHOLD) return "en_movimiento";
  if (!ultimaMotion) return "estacionado";
  return now - ultimaMotion < PARADO_WINDOW_MS ? "parado" : "estacionado";
}
