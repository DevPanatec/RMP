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
 * - { seconds: 10 } → Cada 10 segundos (matches SafeTag plan)
 * - { seconds: 11 } → Cada 11s — offset intencional pa' no chocar con SafeTag cycle
 * - { seconds: 30 } → Cada 30 segundos (ahorra quota Convex)
 * - { minutes: 1 } → Cada 1 minuto (fallback puro, depende de webhook)
 */
// 11s para acercarse al plan SafeTag (10s) sin alinearse exacto.
// Cuesta ~3x más mutations que 30s. Considerar bajar a 60s una vez que webhook funcione
// — el webhook hace el trabajo real-time y cron es solo fallback.
crons.interval(
  "sync-safetag-devices",
  { seconds: 11 },
  // @ts-ignore — deep type instantiation, ok at runtime
  api.safetag.syncAllVehicles,
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
  (internal as any).vehicleHistory.cleanOldHistory,
  {}
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

/**
 * Cron Job: Recomputar storage_bytes_used por org (diario 4:00 UTC)
 *
 * El contador delta (incrementOrgStorage en cada subida/borrado de foto) puede
 * driftear si alguna mutation cascade se olvida del decrement. Este cron re-suma
 * los file_size de cleaning_photos/fumigation_photos/maintenance_photos por org
 * y corrige el contador. Procesa CHUNK=5 orgs por ejecución y se reagenda hasta
 * vaciar la cola de stale. Resultados parciales NO persisten (ver helper).
 */
crons.daily(
  "recompute-org-storage",
  { hourUTC: 4, minuteUTC: 0 },
  internal.organizaciones.recomputeStorageDaily
);

/**
 * Cron Job: Multi-aggregator crawler diario (Plan v6 Fase C)
 *
 * Sincroniza KB de marcas/modelos desde fuentes públicas:
 * - NHTSA vPIC makes
 * - Wikidata (lazy, solo cuando hay modelos sin specs)
 * - OEM brochures (futuro)
 *
 * Horario: 2:00 AM UTC (después del backup, antes del rush operacional).
 */
crons.daily(
  "kb-crawler-daily",
  { hourUTC: 7, minuteUTC: 0 }, // 2am Panama time (UTC-5)
  internal.crawler.runDailyCrawl
);

/**
 * Fase D — Integrity checks.
 * Crons defensivos: detectan huecos en KB, marcan alerts, calculan coverage.
 */
crons.daily(
  "kb-integrity-orphan-vehicles",
  { hourUTC: 8, minuteUTC: 0 }, // 3am Panama
  internal.kbIntegrity.detectOrphanVehicles
);

crons.weekly(
  "kb-integrity-stale-sources",
  { dayOfWeek: "sunday", hourUTC: 9, minuteUTC: 0 }, // 4am Panama sundays
  internal.kbIntegrity.detectStaleSources,
  {}
);

crons.daily(
  "kb-integrity-low-confidence-templates",
  { hourUTC: 9, minuteUTC: 0 }, // 4am Panama
  internal.kbIntegrity.flagLowConfidenceTemplates,
  {}
);

crons.interval(
  "kb-coverage-snapshot",
  { hours: 6 },
  internal.kbIntegrity.computeCoverageStats
);

/**
 * Fase F — OEM brochures weekly full batch.
 * Daily corre 5 brochures (round-robin). Weekly procesa lote completo (todo OEM_SEEDS).
 * Sundays 5am Panama (UTC-5) = 10am UTC.
 */
crons.weekly(
  "kb-oem-brochures-weekly",
  { dayOfWeek: "sunday", hourUTC: 10, minuteUTC: 0 },
  internal.integrations.oemBrochures.crawlOemBatch,
  { limit: 100 }
);

/**
 * Fase F — Queue worker nocturnal.
 * Cada 30min UTC 4-11 = 11pm-6am Panama (UTC-5). Procesa BATCH_SIZE tasks por iter.
 * Respeta budget caps. Self-reschedule via scheduler.runAfter cuando hay más.
 */
crons.cron(
  "kb-queue-nocturnal-1",
  "0 4-11 * * *", // 11pm, 12am, 1am, 2am, 3am, 4am, 5am, 6am Panama
  internal.kbCrawlQueue.processNextBatch,
  {}
);
crons.cron(
  "kb-queue-nocturnal-2",
  "30 4-11 * * *", // medias hora pa' doble frecuencia
  internal.kbCrawlQueue.processNextBatch,
  {}
);

/**
 * Fase F — Discovery weekly. Encola tareas auto-discovery (OEM seeds + NHTSA top makes + Wikidata orphans).
 * Sundays 8am UTC = 3am Panama.
 */
crons.weekly(
  "kb-discovery-weekly",
  { dayOfWeek: "sunday", hourUTC: 8, minuteUTC: 0 },
  internal.kbDiscovery.runDiscovery
);

/**
 * Fase F — Conflict detection cross-source. Daily 5am Panama.
 */
crons.daily(
  "kb-conflict-detection",
  { hourUTC: 10, minuteUTC: 0 },
  internal.kbConflicts.detectConflicts
);

/**
 * Fase F+ — Stale URL detection. Weekly Monday 6am Panama.
 * HEAD request a kb_sources oem_brochure. 4xx → kb_health_alert "stale_url".
 */
crons.weekly(
  "kb-stale-urls-weekly",
  { dayOfWeek: "monday", hourUTC: 11, minuteUTC: 0 },
  internal.kbStaleDetection.checkStaleUrls,
  { limit: 30 }
);

/**
 * ASI Fase 4 — Cierre diario de jornadas.
 *
 * Cierra el día previo: calcula minutos_trabajados/tarde/ausente por empleado activo
 * con horario asignado vigente. Aplica permisos aprobados (skip ausente) y cambios
 * de turno aprobados (usa horario del otro empleado).
 *
 * Horario: 05:00 UTC = 00:00 Panamá (UTC-5) → cierra el día que acaba de terminar.
 * Procesa chunks de 50 empleados, se reagenda si quedan más.
 */
crons.daily(
  "asi-cerrar-jornadas-diario",
  { hourUTC: 5, minuteUTC: 0 },
  internal.asistencia.jornadasCron.cerrarJornadasDelDia,
  {}
);

/**
 * ASI Fase 2 — Retention crons (data hygiene).
 *  - marcacion_intentos > 90 días → purge (incl. foto storage).
 *  - facial_sessions expirados > 1h → purge.
 */
crons.daily(
  "asi-purge-intentos-90d",
  { hourUTC: 6, minuteUTC: 0 }, // 1am Panamá
  internal.asistencia.retention.purgeOldIntentos,
  {}
);
crons.interval(
  "asi-purge-facial-sessions",
  { minutes: 15 },
  internal.asistencia.retention.purgeExpiredFacialSessions
);

export default crons;
