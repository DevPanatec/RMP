import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all vehicles
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("vehiculos").collect();
  },
});

// Get vehicles by estado
export const getByEstado = query({
  args: { estado: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vehiculos")
      .withIndex("by_estado", (q) => q.eq("estado", args.estado))
      .collect();
  },
});

// Get vehicle by placa
export const getByPlaca = query({
  args: { placa: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vehiculos")
      .withIndex("by_placa", (q) => q.eq("placa", args.placa))
      .first();
  },
});

// Get vehicle by ID
export const getById = query({
  args: { id: v.id("vehiculos") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Add vehicle
export const add = mutation({
  args: {
    nombre: v.optional(v.string()),
    placa: v.string(),
    marca: v.optional(v.string()),
    modelo: v.optional(v.string()),
    anio: v.optional(v.number()),
    tipo: v.optional(v.string()),
    tipo_servicio: v.string(),
    capacidad_carga: v.optional(v.number()),
    proyecto_asignado_id: v.optional(v.id("proyectos")),
    // Campos GPS opcionales
    gps_imei: v.optional(v.string()),
    gps_protocolo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("vehiculos", {
      ...args,
      tipo: args.tipo || "camion", // Tipo por defecto si no se especifica
      estado: "disponible",
      combustible_nivel: 100,
      kilometraje: 0,
      // Inicializar GPS como desconectado hasta recibir primer dato
      gps_conectado: args.gps_imei ? false : undefined,
    });
  },
});

// Update vehicle
export const update = mutation({
  args: {
    id: v.id("vehiculos"),
    placa: v.optional(v.string()),
    marca: v.optional(v.string()),
    modelo: v.optional(v.string()),
    anio: v.optional(v.number()),
    tipo: v.optional(v.string()),
    tipo_servicio: v.optional(v.string()),
    estado: v.optional(v.string()),
    capacidad_carga: v.optional(v.number()),
    combustible_nivel: v.optional(v.number()),
    kilometraje: v.optional(v.number()),
    proyecto_asignado_id: v.optional(v.id("proyectos")),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

// Update GPS position
export const updateGPS = mutation({
  args: {
    id: v.id("vehiculos"),
    gps_latitud: v.number(),
    gps_longitud: v.number(),
  },
  handler: async (ctx, args) => {
    const { id, gps_latitud, gps_longitud } = args;
    return await ctx.db.patch(id, { gps_latitud, gps_longitud });
  },
});

// Update estado
export const updateEstado = mutation({
  args: {
    id: v.id("vehiculos"),
    estado: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, { estado: args.estado });
  },
});

// Update combustible
export const updateCombustible = mutation({
  args: {
    id: v.id("vehiculos"),
    combustible_nivel: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, { combustible_nivel: args.combustible_nivel });
  },
});

// Delete vehicle
export const remove = mutation({
  args: { id: v.id("vehiculos") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

// Get fleet stats
export const getStats = query({
  handler: async (ctx) => {
    const vehicles = await ctx.db.query("vehiculos").collect();

    const disponibles = vehicles.filter(v => v.estado === "disponible").length;
    const en_ruta = vehicles.filter(v => v.estado === "en_ruta").length;
    const en_mantenimiento = vehicles.filter(v => v.estado === "en_mantenimiento").length;

    return {
      total: vehicles.length,
      disponibles,
      en_ruta,
      en_mantenimiento,
    };
  },
});
