import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getScopedProjectId, getScopedOrgId, requireProjectAccess } from "./lib/auth";

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
        ? all.filter((a) => !a.organizacion_id || a.organizacion_id === scopedOrg)
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

export const getByConductor = query({
  args: { conductor_nombre: v.string() },
  handler: async (ctx, args) => {
    const allAssignments = await ctx.db.query("asignaciones_rutas").collect();
    return allAssignments.filter(a => a.conductor_nombre === args.conductor_nombre);
  },
});

export const getByVehiculo = query({
  args: { vehiculo_id: v.id("vehiculos") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("asignaciones_rutas")
      .withIndex("by_vehiculo", (q) => q.eq("vehiculo_id", args.vehiculo_id))
      .collect();
  },
});

export const getByRuta = query({
  args: { ruta_id: v.id("rutas") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("asignaciones_rutas")
      .withIndex("by_ruta", (q) => q.eq("ruta_id", args.ruta_id))
      .collect();
  },
});

export const getByEstado = query({
  args: { estado: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("asignaciones_rutas")
      .withIndex("by_estado", (q) => q.eq("estado", args.estado))
      .collect();
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

    return await ctx.db.insert("asignaciones_rutas", {
      ...args,
      proyecto_id,
      conductor_id,
      estado: args.estado || "asignada",
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
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

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
    return await ctx.db.patch(args.id, { estado: args.estado });
  },
});

export const remove = mutation({
  args: { id: v.id("asignaciones_rutas") },
  handler: async (ctx, args) => {
    // Cerrar cualquier route_progress asociado para evitar huérfanos.
    const linked = await ctx.db
      .query("route_progress")
      .filter((q) => q.eq(q.field("asignacion_id"), args.id))
      .collect();
    for (const rp of linked) {
      if (rp.estado === "en_progreso") {
        await ctx.db.patch(rp._id, { estado: "completada" });
      }
    }
    return await ctx.db.delete(args.id);
  },
});
