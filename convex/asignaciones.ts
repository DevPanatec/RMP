import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("asignaciones_rutas").collect();
  },
});

export const getByConductor = query({
  args: { conductor_id: v.id("perfiles_usuarios") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("asignaciones_rutas")
      .withIndex("by_conductor", (q) => q.eq("conductor_id", args.conductor_id))
      .collect();
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
    conductor_id: v.id("perfiles_usuarios"),
    vehiculo_id: v.id("vehiculos"),
    proyecto_id: v.optional(v.id("proyectos")),
    fecha_asignacion: v.string(),
    dias_semana: v.optional(v.array(v.string())),
    ayudantes: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("asignaciones_rutas", {
      ...args,
      estado: "asignada",
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("asignaciones_rutas"),
    fecha_inicio: v.optional(v.string()),
    fecha_completacion: v.optional(v.string()),
    estado: v.optional(v.string()),
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
    estado: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, { estado: args.estado });
  },
});

export const remove = mutation({
  args: { id: v.id("asignaciones_rutas") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});
