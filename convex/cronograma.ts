import { query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope, getScopedOrgId, getScopedProjectId } from "./lib/auth";
import { Id } from "./_generated/dataModel";

// ============================================================
// CRONOGRAMA — Unified Gantt + Heatmap across 4 operational modules
// ============================================================
//
// Merges past (completed reports) + future (scheduled assignments) for:
//   REC (rutas), LIM (limpieza), FUM (fumigación), MTO (mantenimiento)
//
// Two modes:
//   - 'detail'  → returns CronogramaEvent[] (used by Semana view + cell drill-down)
//   - 'summary' → returns SummaryCell[] aggregated by day×module (used by Mes view)

export type CronogramaModule = "rec" | "lim" | "fum" | "mto";
export type CronogramaStatus = "completed" | "scheduled" | "in_progress" | "overdue";

export type CronogramaEvent = {
  id: string;
  module: CronogramaModule;
  status: CronogramaStatus;
  timestamp: number;
  endTimestamp?: number;
  label: string;
  sublabel?: string;
  metadata?: Record<string, any>;
};

export type SummaryCell = {
  day: string; // "YYYY-MM-DD"
  module: CronogramaModule;
  total: number;
  byStatus: {
    completed: number;
    scheduled: number;
    in_progress: number;
    overdue: number;
  };
};

const DAYS_ES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

const pad2 = (n: number) => String(n).padStart(2, "0");

const dateStrFromMs = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const toMs = (fecha: string, hora?: string): number => {
  if (!fecha) return 0;
  if (fecha.includes("T")) {
    const parsed = Date.parse(fecha);
    return isNaN(parsed) ? 0 : parsed;
  }
  const hhmm = hora && /^\d{1,2}:\d{2}/.test(hora) ? hora.slice(0, 5) : "00:00";
  const iso = `${fecha}T${hhmm}:00`;
  const parsed = Date.parse(iso);
  return isNaN(parsed) ? 0 : parsed;
};

const inRangeStr = (fecha: string, startStr: string, endStr: string): boolean => {
  if (!fecha) return false;
  const f = fecha.length > 10 ? fecha.slice(0, 10) : fecha;
  return f >= startStr && f <= endStr;
};

// ============================================================
// Internal: build normalized events for arbitrary range
// ============================================================

async function buildEvents(
  ctx: QueryCtx,
  args: {
    rangeStart: number;
    rangeEnd: number;
    organizacion_id?: Id<"organizaciones"> | undefined;
    proyecto_id?: Id<"proyectos"> | undefined;
    modules?: CronogramaModule[];
  }
): Promise<CronogramaEvent[]> {
  const scope = await getAuthScope(ctx);
  const scopedOrg = await getScopedOrgId(ctx, args.organizacion_id ?? null);
  const scopedProject = await getScopedProjectId(ctx, args.proyecto_id ?? null);
  const isUnscoped = scope.isSuperAdmin || scope.isCrossOrgViewer;

  if (!isUnscoped && !scopedOrg) return [];

  const startStr = dateStrFromMs(args.rangeStart);
  const endStr = dateStrFromMs(args.rangeEnd);
  const todayStr = dateStrFromMs(Date.now());

  const wantModule = (m: CronogramaModule) =>
    !args.modules || args.modules.length === 0 || args.modules.includes(m);

  const matchesOrg = (row: { organizacion_id?: any }) =>
    isUnscoped || row.organizacion_id === scopedOrg;
  const matchesProject = (row: { proyecto_id?: any }) =>
    !scopedProject || row.proyecto_id === scopedProject;
  const matchesScope = (row: { organizacion_id?: any; proyecto_id?: any }) =>
    matchesOrg(row) && matchesProject(row);

  const events: CronogramaEvent[] = [];

  // ============ 1. ROUTE REPORTS (REC completed) ============
  const completedAsignacionIds = new Set<string>();
  if (wantModule("rec")) {
    const routeReports = await ctx.db
      .query("route_reports")
      .withIndex("by_fecha")
      .order("desc")
      .take(2000);
    const inRange = routeReports.filter(
      (r) => matchesScope(r) && inRangeStr(r.fecha_completacion, startStr, endStr)
    );
    for (const r of inRange) {
      if (r.asignacion_id) completedAsignacionIds.add(r.asignacion_id as unknown as string);
      events.push({
        id: r._id,
        module: "rec",
        status: "completed",
        timestamp: toMs(r.fecha_completacion),
        label: r.ruta_nombre || "Ruta",
        sublabel: r.conductor_nombre
          ? `${r.conductor_nombre}${r.vehiculo_placa ? ` · ${r.vehiculo_placa}` : ""}`
          : r.vehiculo_placa,
        metadata: {
          source: "report",
          tipo_ruta: r.tipo_ruta,
          paradas: Array.isArray(r.paradas_completadas) ? r.paradas_completadas.length : 0,
          tiempo_total_segundos: r.tiempo_total_segundos,
          asignacion_id: r.asignacion_id,
        },
      });
    }
  }

  // ============ 2. ASIGNACIONES_RUTAS (REC scheduled + in_progress) ============
  if (wantModule("rec")) {
    const allAsignaciones = await ctx.db.query("asignaciones_rutas").collect();
    const asignacionesScoped = allAsignaciones.filter(matchesScope);

    const rutaIds = new Set(asignacionesScoped.map((a) => a.ruta_id));
    const vehiculoIds = new Set(asignacionesScoped.map((a) => a.vehiculo_id));
    const rutaMap = new Map<string, any>();
    for (const id of rutaIds) {
      const r = await ctx.db.get(id);
      if (r) rutaMap.set(id as unknown as string, r);
    }
    const vehiculoMap = new Map<string, any>();
    for (const id of vehiculoIds) {
      const v = await ctx.db.get(id);
      if (v) vehiculoMap.set(id as unknown as string, v);
    }

    const buildAsignacionEvent = (
      a: any,
      fecha: string,
      indexSuffix: string,
    ): CronogramaEvent | null => {
      if (a._id && completedAsignacionIds.has(a._id as string) && fecha === todayStr) {
        return null;
      }
      const ruta = rutaMap.get(a.ruta_id as unknown as string);
      const vehiculo = vehiculoMap.get(a.vehiculo_id as unknown as string);
      const ts = toMs(fecha, a.hora_inicio);
      const endTs = a.hora_fin ? toMs(fecha, a.hora_fin) : undefined;
      let status: CronogramaStatus = "scheduled";
      if (a.estado === "en_progreso") status = "in_progress";
      else if (a.estado === "completada") status = "completed";
      else if (fecha < todayStr) status = "overdue";
      return {
        id: `${a._id}-${indexSuffix}`,
        module: "rec",
        status,
        timestamp: ts,
        endTimestamp: endTs,
        label: ruta?.nombre || "Ruta",
        sublabel: a.conductor_nombre
          ? `${a.conductor_nombre}${vehiculo?.placa ? ` · ${vehiculo.placa}` : ""}`
          : vehiculo?.placa,
        metadata: {
          source: "assignment",
          asignacion_id: a._id,
          hora_inicio: a.hora_inicio,
          hora_fin: a.hora_fin,
          estado: a.estado,
        },
      };
    };

    for (const a of asignacionesScoped) {
      if (a.estado === "cancelada") continue;

      const recurring = Array.isArray(a.dias_semana) && a.dias_semana.length > 0;
      if (recurring) {
        for (let ms = args.rangeStart; ms <= args.rangeEnd; ms += 86_400_000) {
          const d = new Date(ms);
          const dayName = DAYS_ES[d.getDay()];
          if (a.dias_semana!.includes(dayName)) {
            const fecha = dateStrFromMs(ms);
            const ev = buildAsignacionEvent(a, fecha, fecha);
            if (ev) events.push(ev);
          }
        }
      } else if (inRangeStr(a.fecha_asignacion, startStr, endStr)) {
        const ev = buildAsignacionEvent(a, a.fecha_asignacion, "single");
        if (ev) events.push(ev);
      }
    }
  }

  // ============ 3. CLEANING REPORTS (LIM completed) ============
  const completedCleaningAssignmentIds = new Set<string>();
  if (wantModule("lim")) {
    const cleaningReports = await ctx.db
      .query("cleaning_reports")
      .withIndex("by_fecha")
      .order("desc")
      .take(2000);
    const inRange = cleaningReports.filter(
      (r) => matchesScope(r) && inRangeStr(r.fecha_completacion, startStr, endStr)
    );
    for (const r of inRange) {
      if (r.assignment_id) completedCleaningAssignmentIds.add(r.assignment_id as unknown as string);
      const label = r.area_nombre ? `${r.sala_nombre} · ${r.area_nombre}` : r.sala_nombre;
      events.push({
        id: r._id,
        module: "lim",
        status: "completed",
        timestamp: toMs(r.fecha_completacion),
        endTimestamp: r.fecha ? toMs(r.fecha, r.hora_fin) : undefined,
        label,
        sublabel: r.usuario_completo,
        metadata: {
          source: "report",
          duracion_minutos: r.duracion_minutos,
          assignment_id: r.assignment_id,
        },
      });
    }
  }

  // ============ 4. CLEANING ASSIGNMENTS (LIM scheduled) ============
  if (wantModule("lim")) {
    const cleaningAssignments = await ctx.db.query("cleaning_assignments").collect();
    const cleaningAssignmentsScoped = cleaningAssignments.filter(
      (a) => matchesScope(a) && inRangeStr(a.fecha, startStr, endStr) && a.estado !== "cancelado"
    );
    const salaIds = new Set(cleaningAssignmentsScoped.map((a) => a.sala_id));
    const salaMap = new Map<string, any>();
    for (const id of salaIds) {
      const s = await ctx.db.get(id);
      if (s) salaMap.set(id as unknown as string, s);
    }
    for (const a of cleaningAssignmentsScoped) {
      if (completedCleaningAssignmentIds.has(a._id as string)) continue;
      const sala = salaMap.get(a.sala_id as unknown as string);
      let status: CronogramaStatus = "scheduled";
      if (a.estado === "en_progreso") status = "in_progress";
      else if (a.estado === "completado") status = "completed";
      else if (a.fecha < todayStr) status = "overdue";
      events.push({
        id: a._id,
        module: "lim",
        status,
        timestamp: toMs(a.fecha, a.hora),
        label: sala?.nombre || "Limpieza",
        sublabel: a.hora,
        metadata: {
          source: "assignment",
          assignment_id: a._id,
          estado: a.estado,
        },
      });
    }
  }

  // ============ 5. FUMIGATION REPORTS (FUM completed) ============
  const completedFumigationAssignmentIds = new Set<string>();
  if (wantModule("fum")) {
    const fumigationReports = await ctx.db
      .query("fumigation_reports")
      .withIndex("by_fecha")
      .order("desc")
      .take(2000);
    const inRange = fumigationReports.filter(
      (r) => matchesScope(r) && inRangeStr(r.fecha_completacion, startStr, endStr)
    );
    for (const r of inRange) {
      if (r.assignment_id) completedFumigationAssignmentIds.add(r.assignment_id as unknown as string);
      events.push({
        id: r._id,
        module: "fum",
        status: "completed",
        timestamp: toMs(r.fecha_completacion),
        endTimestamp: r.fecha ? toMs(r.fecha, r.horario_fin) : undefined,
        label: r.lugar_nombre,
        sublabel: `${r.tipo_fumigacion} · ${r.usuario_completo}`,
        metadata: {
          source: "report",
          tipo_fumigacion: r.tipo_fumigacion,
          duracion_minutos: r.duracion_minutos,
          assignment_id: r.assignment_id,
        },
      });
    }
  }

  // ============ 6. FUMIGATION ASSIGNMENTS (FUM scheduled) ============
  if (wantModule("fum")) {
    const fumigationAssignments = await ctx.db.query("fumigation_assignments").collect();
    const fumigationAssignmentsScoped = fumigationAssignments.filter(
      (a) => matchesScope(a) && inRangeStr(a.fecha, startStr, endStr)
    );
    const lugarIds = new Set(fumigationAssignmentsScoped.map((a) => a.lugar_id));
    const lugarMap = new Map<string, any>();
    for (const id of lugarIds) {
      const l = await ctx.db.get(id);
      if (l) lugarMap.set(id as unknown as string, l);
    }
    for (const a of fumigationAssignmentsScoped) {
      if (completedFumigationAssignmentIds.has(a._id as string)) continue;
      if (a.estado === "reportada" || a.estado === "realizada") continue;
      const lugar = lugarMap.get(a.lugar_id as unknown as string);
      const status: CronogramaStatus = a.fecha < todayStr ? "overdue" : "scheduled";
      events.push({
        id: a._id,
        module: "fum",
        status,
        timestamp: toMs(a.fecha, a.horario_inicio),
        endTimestamp: toMs(a.fecha, a.horario_fin),
        label: lugar?.nombre || "Fumigación",
        sublabel: `${a.tipo_fumigacion} · ${a.horario_inicio}`,
        metadata: {
          source: "assignment",
          assignment_id: a._id,
          tipo_fumigacion: a.tipo_fumigacion,
          estado: a.estado,
        },
      });
    }
  }

  // ============ 7. MAINTENANCE REPORTS (MTO completed) ============
  const completedTaskIds = new Set<string>();
  if (wantModule("mto")) {
    const maintenanceReports = await ctx.db
      .query("maintenance_reports")
      .withIndex("by_fecha")
      .order("desc")
      .take(2000);
    const inRange = maintenanceReports.filter(
      (r) => matchesScope(r) && inRangeStr(r.fecha_reporte, startStr, endStr)
    );
    for (const r of inRange) {
      if (r.task_id) completedTaskIds.add(r.task_id as unknown as string);
      events.push({
        id: r._id,
        module: "mto",
        status: "completed",
        timestamp: toMs(r.fecha_reporte),
        label: r.titulo,
        sublabel: r.vehiculo_placa
          ? `${r.tipo} · ${r.vehiculo_placa}`
          : r.tipo,
        metadata: {
          source: "report",
          tipo: r.tipo,
          prioridad: r.prioridad,
          costo: r.costo,
          task_id: r.task_id,
        },
      });
    }
  }

  // ============ 8. MAINTENANCE TASKS (MTO scheduled / overdue) ============
  if (wantModule("mto")) {
    const maintenanceTasks = await ctx.db.query("maintenance_tasks").collect();
    const maintenanceTasksScoped = maintenanceTasks.filter(
      (t) =>
        matchesScope(t) &&
        t.fecha_programada &&
        inRangeStr(t.fecha_programada, startStr, endStr) &&
        t.estado !== "cancelada" &&
        t.estado !== "completada"
    );
    const taskVehiculoIds = new Set(
      maintenanceTasksScoped.map((t) => t.vehiculo_id).filter(Boolean) as any[]
    );
    const taskVehiculoMap = new Map<string, any>();
    for (const id of taskVehiculoIds) {
      const v = await ctx.db.get(id);
      if (v) taskVehiculoMap.set(id as unknown as string, v);
    }
    for (const t of maintenanceTasksScoped) {
      if (completedTaskIds.has(t._id as string)) continue;
      const veh = t.vehiculo_id
        ? taskVehiculoMap.get(t.vehiculo_id as unknown as string)
        : null;
      let status: CronogramaStatus = "scheduled";
      if (t.estado === "en_progreso") status = "in_progress";
      else if (t.fecha_programada! < todayStr) status = "overdue";
      events.push({
        id: t._id,
        module: "mto",
        status,
        timestamp: toMs(t.fecha_programada!),
        label: t.titulo,
        sublabel: veh?.placa ? `${t.tipo} · ${veh.placa}` : t.tipo,
        metadata: {
          source: "assignment",
          task_id: t._id,
          tipo: t.tipo,
          prioridad: t.prioridad,
          estado: t.estado,
        },
      });
    }
  }

  // LIM/FUM/MTO se registran post-facto (no se programan ahead-of-time como REC).
  // Cronograma solo muestra eventos completados para esos 3 módulos; scheduled/
  // in_progress/overdue quedaba como ruido de asignaciones huérfanas.
  const cleaned = events.filter(
    (e) => e.module === "rec" || e.status === "completed"
  );

  cleaned.sort((a, b) => a.timestamp - b.timestamp);
  return cleaned;
}

// ============================================================
// Aggregate events → SummaryCell[] (day×module buckets)
// ============================================================

function aggregateToSummary(
  events: CronogramaEvent[],
  bucket: "day" | "month" = "day"
): SummaryCell[] {
  const buckets = new Map<string, SummaryCell>();
  for (const e of events) {
    const dayStr = dateStrFromMs(e.timestamp);
    // For month bucket: trim "YYYY-MM-DD" → "YYYY-MM"
    const key = bucket === "month" ? dayStr.slice(0, 7) : dayStr;
    const bucketKey = `${key}|${e.module}`;
    let cell = buckets.get(bucketKey);
    if (!cell) {
      cell = {
        day: key,
        module: e.module,
        total: 0,
        byStatus: { completed: 0, scheduled: 0, in_progress: 0, overdue: 0 },
      };
      buckets.set(bucketKey, cell);
    }
    cell.total += 1;
    cell.byStatus[e.status] += 1;
  }
  return Array.from(buckets.values()).sort((a, b) =>
    a.day === b.day ? a.module.localeCompare(b.module) : a.day.localeCompare(b.day)
  );
}

// ============================================================
// Public queries
// ============================================================

const MODULE_VALIDATOR = v.union(
  v.literal("rec"),
  v.literal("lim"),
  v.literal("fum"),
  v.literal("mto")
);

export const getRange = query({
  args: {
    rangeStart: v.number(),
    rangeEnd: v.number(),
    mode: v.union(v.literal("detail"), v.literal("summary")),
    bucket: v.optional(v.union(v.literal("day"), v.literal("month"))),
    organizacion_id: v.optional(v.id("organizaciones")),
    proyecto_id: v.optional(v.id("proyectos")),
    modules: v.optional(v.array(MODULE_VALIDATOR)),
  },
  handler: async (ctx, args) => {
    const events = await buildEvents(ctx, args);
    if (args.mode === "summary") {
      return {
        mode: "summary" as const,
        summary: aggregateToSummary(events, args.bucket ?? "day"),
      };
    }
    return { mode: "detail" as const, events };
  },
});
