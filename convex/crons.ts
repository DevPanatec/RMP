import { cronJobs } from "convex/server";
import { api, internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Cron Job: Sincronizar GPS SafeTag cada 10 segundos
 *
 * Este cron job se ejecuta automáticamente cada 10 segundos para:
 * 1. Obtener datos actualizados de todos los dispositivos SafeTag
 * 2. Actualizar la posición GPS de los vehículos en la base de datos
 * 3. Mantener el tracking en tiempo real sin lag
 *
 * Intervalo ajustado a 10 segundos para aprovechar el plan de SafeTag
 * que reporta datos GPS cada 10 segundos.
 *
 * IMPORTANTE: Usamos Date.now() como timestamp en vez del last_updated
 * de SafeTag porque SafeTag NO actualiza last_updated en movimiento continuo,
 * solo en eventos "significativos" (paradas, cambios de estado).
 *
 * Ajustar intervalo según necesidades:
 * - { seconds: 10 } → Cada 10 segundos (actual - máxima frecuencia)
 * - { seconds: 30 } → Cada 30 segundos (menos frecuente)
 * - { minutes: 1 } → Cada 1 minuto (muy poco frecuente)
 */
// Bajado de 10s a 30s para no quemar Convex free tier (~520k mutations/día → ~170k).
// SafeTag reporta cada 10s pero el path principal de GPS es webhook real-time.
// Este cron es fallback por si el webhook falla o vehículo no está suscrito.
crons.interval(
  "sync-safetag-devices",
  { seconds: 30 },
  api.safetag.syncAllVehicles
);

/**
 * Cron Job: Limpiar historial GPS antiguo (diario a las 3:00 AM)
 *
 * Este cron job se ejecuta automáticamente una vez al día para:
 * 1. Eliminar registros de ubicación GPS más antiguos de 90 días
 * 2. Mantener la base de datos optimizada y sin datos obsoletos
 * 3. Liberar espacio de almacenamiento en Convex
 *
 * Retención: 90 días (configurable en vehicleHistory.cleanOldHistory)
 * Horario: 3:00 AM UTC (ajustable según zona horaria)
 */
crons.daily(
  "clean-old-gps-history",
  { hourUTC: 3, minuteUTC: 0 },
  internal.vehicleHistory.cleanOldHistory
);

/**
 * Cron Job: Detectar vehículos desconectados (cada 60 segundos)
 *
 * Marca gps_conectado=false en vehículos que no han reportado en 5 minutos.
 * Sin este job los vehículos quedan "online" para siempre aunque no envíen
 * datos. Lógica en convex/gps.ts:updateConnectionStatus (TIMEOUT_MS=5min).
 */
crons.interval(
  "update-gps-connection-status",
  { seconds: 60 },
  internal.gps.updateConnectionStatus
);

export default crons;
