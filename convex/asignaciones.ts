import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getScopedProjectId, getScopedOrgId, requireProjectAccess, requireWriteRole, requireAdminWrite, getAuthScope } from "./lib/auth";

export const list = query({
  args: {
    proyecto_id: v.optional(v.id("proyectos")),
    organizacion_id: v.optional(v.id("organizaciones")),
  },
  handler: async (ctx, args) => {
    const scopedProject = await getScopedProjectId(ctx, args.proyecto_id ?? null);
    let assignments;
    if (scopedProject) {
      assignments = await ctx.db
        .query("asignaciones_rutas")
        .withIndex("by_proyecto", (q) => q.eq("proyecto_id", scopedProject))
        .collect();
    } else {
      const scopedOrg = await getScopedOrgId(ctx, args.organizacion_id ?? null);
      const all = await ctx.db.query("asignaciones_rutas").collect();
      assignments = scopedOrg
        ? all.filter((a) => a.organizacion_id === scopedOrg)
        : all;
    }

    // JOIN con rutas y vehículos
    const assignmentsWithDetails = await Promise.all(
      assignments.map(async (assignment) => {
        const ruta = assignment.ruta_id ? await ctx.db.get(assignment.ruta_id) : null;
        const vehiculo = assignment.vehiculo_id ? await ctx.db.get(assignment.vehiculo_id) : null;

        return {
          ...assignment,
          ruta: ruta,
          vehiculo: vehiculo,
          vehiculo_placa: vehiculo?.placa,
        };
      })
    );

    return assignmentsWithDetails;
  },
});

export const add = mutation({
  args: {
    ruta_id: v.id("rutas"),
    conductor_id: v.optional(v.id("perfiles_usuarios")),
    conductor_nombre: v.string(),
    vehiculo_id: v.id("vehiculos"),
    proyecto_id: v.optional(v.id("proyectos")),
    fecha_asignacion: v.string(),
    hora_inicio: v.optional(v.string()),
    hora_fin: v.optional(v.string()),
    estado: v.optional(v.string()),
    dias_semana: v.optional(v.array(v.string())),
    ayudantes: v.optional(v.array(v.any())),
    observaciones: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Bloqueo a roles read-only (enterprise/viewer).
    await requireWriteRole(ctx);
    const scope = await getAuthScope(ctx);

    // Auto-resolve conductor_id from perfiles_usuarios if not provided
    let conductor_id = args.conductor_id;
    if (!conductor_id && args.conductor_nombre) {
      const perfiles = await ctx.db
        .query("perfiles_usuarios")
        .withIndex("by_tipo", (q) => q.eq("tipo_usuario", "conductor"))
        .collect();
      const match = perfiles.find(
        (p) => p.nombre_completo?.trim().toLowerCase() === args.conductor_nombre.trim().toLowerCase()
      );
      if (match) {
        conductor_id = match._id;
      }
    }

    // Derivar proyecto_id desde la ruta si no viene explícito
    let proyecto_id = args.proyecto_id;
    if (!proyecto_id) {
      const ruta = await ctx.db.get(args.ruta_id);
      if (!ruta) throw new Error("Ruta no encontrada");
      proyecto_id = ruta.proyecto_id;
    }
    if (!proyecto_id) throw new Error("La ruta no tiene proyecto_id; no se puede crear asignación");
    await requireProjectAccess(ctx, proyecto_id);

    // Cross-org validation: vehículo y conductor deben pertenecer a la org del caller.
    // Super_admin bypass.
    if (!scope.isSuperAdmin) {
      const vehiculo = await ctx.db.get(args.vehiculo_id);
      if (!vehiculo) throw new Error("Vehículo no encontrado");
      if (!vehiculo.organizacion_id || vehiculo.organizacion_id !== scope.organizacionId) {
        throw new Error("Acceso denegado: vehículo de otra organización");
      }
      if (conductor_id) {
        const conductor = await ctx.db.get(conductor_id);
        if (!conductor) throw new Error("Conductor no encontrado");
        if (!conductor.organizacion_id || conductor.organizacion_id !== scope.organizacionId) {
          throw new Error("Acceso denegado: conductor de otra organización");
        }
      }
    }

    // Persistir organizacion_id derivado del scope; super_admin → derivar del vehículo.
    let organizacion_id: typeof scope.organizacionId = scope.organizacionId ?? null;
    if (!organizacion_id) {
      const vehiculo = await ctx.db.get(args.vehiculo_id);
      organizacion_id = vehiculo?.organizacion_id ?? null;
    }
    return await ctx.db.insert("asignaciones_rutas", {
      ...args,
      proyecto_id,
      conductor_id,
      estado: args.estado || "asignada",
      ...(organizacion_id && { organizacion_id }),
    });
  },
});

// Validación NO BLOQUEANTE de solapamiento de horarios para un mismo vehículo.
// Devuelve { hayConflicto, conflictos[] }. El frontend muestra advertencia y permite continuar.
function toMin(hhmm?: string): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export const checkScheduleConflicts = query({
  args: {
    vehiculo_id: v.id("vehiculos"),
    fecha: v.string(), // "YYYY-MM-DD"
    hora_inicio: v.string(), // "HH:MM"
    hora_fin: v.string(),
    excluir_asignacion_id: v.optional(v.id("asignaciones_rutas")),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      const vehiculo = await ctx.db.get(args.vehiculo_id);
      if (!vehiculo) return { hayConflicto: false, conflictos: [] };
      if (!scope.organizacionId || vehiculo.organizacion_id !== scope.organizacionId) {
        throw new Error("Acceso denegado: vehículo de otra organización");
      }
    }

    const inicio = toMin(args.hora_inicio);
    const fin = toMin(args.hora_fin);
    if (inicio === null || fin === null || fin <= inicio) {
      return { hayConflicto: false, conflictos: [] };
    }

    const sameDay = await ctx.db
      .query("asignaciones_rutas")
      .withIndex("by_vehiculo_fecha", (q) =>
        q.eq("vehiculo_id", args.vehiculo_id).eq("fecha_asignacion", args.fecha)
      )
      .collect();

    const candidatos = sameDay.filter(
      (a) =>
        a._id !== args.excluir_asignacion_id &&
        a.estado !== "cancelada" &&
        a.estado !== "completada"
    );

    const conflictos = [];
    for (const a of candidatos) {
      const aInicio = toMin(a.hora_inicio);
      const aFin = toMin(a.hora_fin);
      if (aInicio === null || aFin === null) continue;
      const overlapInicio = Math.max(inicio, aInicio);
      const overlapFin = Math.min(fin, aFin);
      if (overlapFin > overlapInicio) {
        const ruta = await ctx.db.get(a.ruta_id);
        const proyecto = a.proyecto_id ? await ctx.db.get(a.proyecto_id) : null;
        const fmt = (m: number) =>
          `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
        conflictos.push({
          asignacion_id: a._id,
          ruta_id: a.ruta_id,
          ruta_nombre: ruta?.nombre || "(sin nombre)",
          proyecto_id: a.proyecto_id,
          proyecto_nombre: proyecto?.nombre || null,
          hora_inicio: a.hora_inicio,
          hora_fin: a.hora_fin,
          overlap_inicio: fmt(overlapInicio),
          overlap_fin: fmt(overlapFin),
        });
      }
    }

    return { hayConflicto: conflictos.length > 0, conflictos };
  },
});

export const update = mutation({
  args: {
    id: v.id("asignaciones_rutas"),
    ruta_id: v.optional(v.id("rutas")),
    conductor_id: v.optional(v.id("perfiles_usuarios")),
    conductor_nombre: v.optional(v.string()),
    vehiculo_id: v.optional(v.id("vehiculos")),
    fecha_asignacion: v.optional(v.string()),
    fecha_inicio: v.optional(v.string()),
    fecha_completacion: v.optional(v.string()),
    hora_inicio: v.optional(v.string()),
    hora_fin: v.optional(v.string()),
    estado: v.optional(v.string()),
    dias_semana: v.optional(v.array(v.string())),
    ayudantes: v.optional(v.array(v.any())),
    observaciones: v.optional(v.string()),
    paradas_completadas: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const scope = await requireWriteRole(ctx);
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Asignación no encontrada");
    if (existing.proyecto_id) await requireProjectAccess(ctx, existing.proyecto_id);
    // Validar que el nuevo vehículo pertenezca a la misma org
    if (updates.vehiculo_id && !scope.isSuperAdmin) {
      const vehiculo = await ctx.db.get(updates.vehiculo_id);
      if (!vehiculo || !scope.organizacionId || vehiculo.organizacion_id !== scope.organizacionId) {
        throw new Error("Acceso denegado: vehículo de otra organización");
      }
    }
    return await ctx.db.patch(id, updates);
  },
});

// State machine válido. completada/cancelada son terminales (no se reabren via update).
// Para corregir errores de admin, usar mutation directa solo super_admin.
const ESTADO_TRANSITIONS: Record<string, string[]> = {
  asignada: ["en_progreso", "cancelada", "programada"],
  programada: ["en_progreso", "cancelada", "asignada"],
  en_progreso: ["completada", "cancelada"],
  completada: [], // terminal
  cancelada: [], // terminal
};

export const updateEstado = mutation({
  args: {
    id: v.id("asignaciones_rutas"),
    estado: v.union(
      v.literal("asignada"),
      v.literal("programada"),
      v.literal("en_progreso"),
      v.literal("completada"),
      v.literal("cancelada")
    ),
  },
  handler: async (ctx, args) => {
    const scope = await requireWriteRole(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Asignación no encontrada");
    if (existing.proyecto_id) await requireProjectAccess(ctx, existing.proyecto_id);

    // State machine guard. Super_admin puede saltar (corrección manual emergencia).
    const current = existing.estado;
    if (!scope.isSuperAdmin && current !== args.estado) {
      const allowed = ESTADO_TRANSITIONS[current] ?? [];
      if (!allowed.includes(args.estado)) {
        throw new Error(`Transición inválida: ${current} → ${args.estado}`);
      }
    }
    return await ctx.db.patch(args.id, { estado: args.estado });
  },
});

export const remove = mutation({
  args: { id: v.id("asignaciones_rutas") },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Asignación no encontrada");
    if (existing.proyecto_id) await requireProjectAccess(ctx, existing.proyecto_id);

    // Cerrar cualquier route_progress asociado para evitar huérfanos.
    // Usar el index by_asignacion en lugar de filter sin index.
    const allInProgress = await ctx.db
      .query("route_progress")
      .withIndex("by_estado", (q) => q.eq("estado", "en_progreso"))
      .collect();
    for (const rp of allInProgress) {
      if (rp.asignacion_id === args.id) {
        await ctx.db.patch(rp._id, { estado: "completada" });
      }
    }
    return await ctx.db.delete(args.id);
  },
});

// One-shot migration: backfill organizacion_id on assignments that were created before
// the add mutation started persisting it. Derives org from the assignment's vehicle.
export const _migrationBackfillOrganizacionId = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("asignaciones_rutas").collect();
    let fixed = 0;
    for (const asignacion of all) {
      if (asignacion.organizacion_id != null) continue;
      const vehiculo = asignacion.vehiculo_id ? await ctx.db.get(asignacion.vehiculo_id) : null;
      if (!vehiculo?.organizacion_id) continue;
      await ctx.db.patch(asignacion._id, { organizacion_id: vehiculo.organizacion_id });
      fixed++;
    }
    return { fixed, total: all.length };
  },
});
