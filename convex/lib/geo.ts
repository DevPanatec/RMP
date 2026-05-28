// Geo + time utilities reusable across modules (geofences, attendance, etc).

/**
 * Distancia Haversine entre dos puntos GPS, en METROS.
 * R = 6371000m (radio Tierra).
 */
export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** True si `point` está dentro del radio (m) centrado en `center`. */
export function isWithinRadius(
  pointLat: number,
  pointLng: number,
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
): boolean {
  return haversineMeters(pointLat, pointLng, centerLat, centerLng) <= radiusMeters;
}

/**
 * Fecha YYYY-MM-DD en timezone America/Panama (UTC-5, sin DST).
 * Crítico para jornadas: turnos overnight 7pm-1am Panamá cruzan medianoche UTC
 * y rompían las queries `by_empleado_fecha` cuando usamos `new Date().toISOString()`.
 */
export function getPanamaFecha(d: Date = new Date()): string {
  // en-CA produce "YYYY-MM-DD" (locale ISO-like).
  return d.toLocaleDateString("en-CA", { timeZone: "America/Panama" });
}
