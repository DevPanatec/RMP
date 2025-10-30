import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all rutas
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("rutas").collect();
  },
});

// Get by estado
export const getByEstado = query({
  args: { estado: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rutas")
      .withIndex("by_estado", (q) => q.eq("estado", args.estado))
      .collect();
  },
});

// Get by proyecto
export const getByProyecto = query({
  args: { proyecto_id: v.id("proyectos") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rutas")
      .withIndex("by_proyecto", (q) => q.eq("proyecto_id", args.proyecto_id))
      .collect();
  },
});

// Get by ID
export const getById = query({
  args: { id: v.id("rutas") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Add ruta
export const add = mutation({
  args: {
    nombre: v.string(),
    proyecto_id: v.optional(v.id("proyectos")),
    tipo_servicio: v.string(),
    paradas: v.array(v.any()),
    fecha_programada: v.optional(v.string()),
    hora_inicio: v.optional(v.string()),
    hora_fin: v.optional(v.string()),
    distancia_total: v.optional(v.number()),
    combustible_estimado: v.optional(v.number()),
    observaciones: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("rutas", {
      ...args,
      estado: "pendiente",
    });
  },
});

// Update ruta
export const update = mutation({
  args: {
    id: v.id("rutas"),
    nombre: v.optional(v.string()),
    paradas: v.optional(v.array(v.any())),
    fecha_programada: v.optional(v.string()),
    hora_inicio: v.optional(v.string()),
    hora_fin: v.optional(v.string()),
    estado: v.optional(v.string()),
    distancia_total: v.optional(v.number()),
    combustible_estimado: v.optional(v.number()),
    observaciones: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

// Update estado
export const updateEstado = mutation({
  args: {
    id: v.id("rutas"),
    estado: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, { estado: args.estado });
  },
});

// Delete ruta
export const remove = mutation({
  args: { id: v.id("rutas") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

// Get stats
export const getStats = query({
  handler: async (ctx) => {
    const rutas = await ctx.db.query("rutas").collect();

    const pendientes = rutas.filter(r => r.estado === "pendiente").length;
    const en_progreso = rutas.filter(r => r.estado === "en_progreso").length;
    const completadas = rutas.filter(r => r.estado === "completada").length;

    return {
      total: rutas.length,
      pendientes,
      en_progreso,
      completadas,
    };
  },
});
