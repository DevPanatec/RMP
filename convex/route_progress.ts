import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getScopedProjectId, getScopedOrgId } from "./lib/auth";

// Cleanup admin-only: marca como 'completada' todos los route_progress 'en_progreso'.
// Útil para limpiar leaks históricos. Llamar manual una vez:
//   npx convex run route_progress:cleanupStaleInProgress
export const cleanupStaleInProgress = mutation({
  args: {},
  handler: async (ctx) => {
    const stale = await ctx.db
      .query("route_progress")
      .withIndex("by_estado", (q) => q.eq("estado", "en_progreso"))
      .collect();
    let count = 0;
    for (const sp of stale) {
      await ctx.db.patch(sp._id, { estado: "completada" });
      count++;
    }
    return { closed: count };
  },
});

export const list = query({
  args: {
    proyecto_id: v.optional(v.id("proyectos")),
    organizacion_id: v.optional(v.id("organizaciones")),
  },
  handler: async (ctx, args) => {
    const scopedProject = await getScopedProjectId(ctx, args.proyecto_id ?? null);
    if (scopedProject) {
      return await ctx.db
        .query("route_progress")
        .withIndex("by_proyecto", (q) => q.eq("proyecto_id", scopedProject))
        .collect();
    }
    const scopedOrg = await getScopedOrgId(ctx, args.organizacion_id ?? null);
    const all = await ctx.db.query("route_progress").collect();
    if (!scopedOrg) return all;
    return all.filter((rp) => !rp.organizacion_id || rp.organizacion_id === scopedOrg);
  },
});

export const getByConductor = query({
  args: { conductor_nombre: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("route_progress")
      .withIndex("by_conductor", (q) => q.eq("conductor_nombre", args.conductor_nombre))
      .collect();
  },
});

export const getActiveProgress = query({
  args: { conductor_nombre: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("route_progress")
      .withIndex("by_conductor", (q) => q.eq("conductor_nombre", args.conductor_nombre))
      .filter((q) => q.eq(q.field("estado"), "en_progreso"))
      .first();
  },
});

export const start = mutation({
  args: {
    conductor_id: v.id("perfiles_usuarios"),
    conductor_nombre: v.string(),
    ruta_id: v.id("rutas"),
    vehiculo_id: v.id("vehiculos"),
    asignacion_id: v.id("asignaciones_rutas"),
    total_paradas: v.number(),
    tipo_ruta: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Cerrar progress en_progreso huérfanos del mismo conductor o del mismo vehículo.
    // Evita leak de cientos de filas en_progreso cuando se inicia una nueva ruta sin completar la anterior.
    const stale = await ctx.db
      .query("route_progress")
      .withIndex("by_estado", (q) => q.eq("estado", "en_progreso"))
      .collect();
    for (const sp of stale) {
      if (sp.conductor_nombre === args.conductor_nombre || sp.vehiculo_id === args.vehiculo_id) {
        await ctx.db.patch(sp._id, { estado: "completada" });
      }
    }

    // Sync assignment only for one-off (non-recurring) — recurring keeps `programada`
    const assignment = await ctx.db.get(args.asignacion_id);
    const isRecurring = Array.isArray(assignment?.dias_semana) && assignment.dias_semana.length > 0;
    if (assignment && !isRecurring) {
      await ctx.db.patch(args.asignacion_id, {
        estado: "en_progreso",
        fecha_inicio: today,
      });
    }

    // Derivar proyecto_id: asignación primero, luego ruta como fallback
    let proyecto_id = assignment?.proyecto_id;
    if (!proyecto_id) {
      const ruta = await ctx.db.get(args.ruta_id);
      proyecto_id = ruta?.proyecto_id;
    }
    // Backfill: si encontramos proyecto_id pero la asignación no lo tenía, parchearla
    if (proyecto_id && assignment && !assignment.proyecto_id) {
      await ctx.db.patch(args.asignacion_id, { proyecto_id });
    }

    return await ctx.db.insert("route_progress", {
      ...args,
      proyecto_id,
      fecha_inicio: now.toISOString(),
      estado: "en_progreso",
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("route_progress"),
    paradas_completadas: v.optional(v.array(v.any())),
    posicion_actual: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

export const complete = mutation({
  args: {
    id: v.id("route_progress"),
    route_report_id: v.optional(v.id("route_reports")),
  },
  handler: async (ctx, args) => {
    const progress = await ctx.db.get(args.id);

    await ctx.db.patch(args.id, {
      estado: "completada",
      route_report_id: args.route_report_id,
    });

    // Sync assignment only for one-off (non-recurring) — recurring stays `programada`
    // so it reappears on the next matching day-of-week.
    if (progress?.asignacion_id) {
      const assignment = await ctx.db.get(progress.asignacion_id);
      const isRecurring = Array.isArray(assignment?.dias_semana) && assignment.dias_semana.length > 0;
      if (assignment && !isRecurring) {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        await ctx.db.patch(progress.asignacion_id, {
          estado: "completada",
          fecha_completacion: today,
        });
      }
    }

    return args.id;
  },
});
