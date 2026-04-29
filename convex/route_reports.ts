import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getScopedProjectId } from "./lib/auth";

export const list = query({
  args: { proyecto_id: v.optional(v.id("proyectos")) },
  handler: async (ctx, args) => {
    const scoped = await getScopedProjectId(ctx, args.proyecto_id ?? null);
    const all = await ctx.db
      .query("route_reports")
      .withIndex("by_fecha", (q) => q)
      .order("desc")
      .collect();
    if (scoped === null) return all;
    return all.filter((r) => r.proyecto_id === scoped);
  },
});

export const getByConductor = query({
  args: { conductor_nombre: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("route_reports")
      .withIndex("by_conductor", (q) => q.eq("conductor_nombre", args.conductor_nombre))
      .order("desc")
      .collect();
  },
});

export const getByFecha = query({
  args: {
    fecha_inicio: v.string(),
    fecha_fin: v.string(),
  },
  handler: async (ctx, args) => {
    const allReports = await ctx.db.query("route_reports").collect();
    return allReports.filter(
      (r) => r.fecha_completacion >= args.fecha_inicio && r.fecha_completacion <= args.fecha_fin
    );
  },
});

export const add = mutation({
  args: {
    ruta_id: v.optional(v.id("rutas")),
    asignacion_id: v.optional(v.id("asignaciones_rutas")),
    conductor_nombre: v.string(),
    conductor_id: v.optional(v.id("perfiles_usuarios")),
    vehiculo_placa: v.string(),
    vehiculo_id: v.optional(v.id("vehiculos")),
    fecha_inicio: v.string(),
    fecha_completacion: v.string(),
    tiempo_total_segundos: v.number(),
    paradas_completadas: v.array(v.any()),
    reportes_riesgo_ids: v.optional(v.array(v.string())),
    observaciones: v.optional(v.string()),
    tipo_ruta: v.string(),
    ruta_nombre: v.string(),
    ruta_paradas: v.optional(v.array(v.any())),
    terminacion_anticipada: v.optional(v.boolean()),
    motivo_terminacion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Derivar proyecto_id desde la asignación o ruta
    let proyecto_id;
    if (args.asignacion_id) {
      const a = await ctx.db.get(args.asignacion_id);
      proyecto_id = a?.proyecto_id;
    }
    if (!proyecto_id && args.ruta_id) {
      const r = await ctx.db.get(args.ruta_id);
      proyecto_id = r?.proyecto_id;
    }
    return await ctx.db.insert("route_reports", { ...args, proyecto_id });
  },
});
