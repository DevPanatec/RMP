import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    const assignments = await ctx.db.query("asignaciones_rutas").collect();

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
    return await ctx.db.insert("asignaciones_rutas", {
      ...args,
      estado: args.estado || "asignada",
    });
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
