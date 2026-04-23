import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("route_progress").collect();
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

    // Sync assignment only for one-off (non-recurring) — recurring keeps `programada`
    const assignment = await ctx.db.get(args.asignacion_id);
    const isRecurring = Array.isArray(assignment?.dias_semana) && assignment.dias_semana.length > 0;
    if (assignment && !isRecurring) {
      await ctx.db.patch(args.asignacion_id, {
        estado: "en_progreso",
        fecha_inicio: today,
      });
    }

    return await ctx.db.insert("route_progress", {
      ...args,
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
