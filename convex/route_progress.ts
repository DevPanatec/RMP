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
    return await ctx.db.insert("route_progress", {
      ...args,
      fecha_inicio: new Date().toISOString(),
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
    return await ctx.db.patch(args.id, {
      estado: "completada",
      route_report_id: args.route_report_id,
    });
  },
});
