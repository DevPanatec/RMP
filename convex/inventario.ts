import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("inventario").collect();
  },
});

export const getByTipo = query({
  args: { tipo_articulo: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("inventario")
      .withIndex("by_tipo", (q) => q.eq("tipo_articulo", args.tipo_articulo))
      .collect();
  },
});

export const add = mutation({
  args: {
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    tipo_articulo: v.string(),
    cantidad_disponible: v.number(),
    cantidad_minima: v.optional(v.number()),
    cantidad_maxima: v.optional(v.number()),
    unidad_medida: v.optional(v.string()),
    ubicacion: v.optional(v.string()),
    precio_unitario: v.optional(v.number()),
    proveedor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("inventario", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("inventario"),
    nombre: v.optional(v.string()),
    descripcion: v.optional(v.string()),
    cantidad_disponible: v.optional(v.number()),
    cantidad_minima: v.optional(v.number()),
    cantidad_maxima: v.optional(v.number()),
    ubicacion: v.optional(v.string()),
    precio_unitario: v.optional(v.number()),
    proveedor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

export const updateCantidad = mutation({
  args: {
    id: v.id("inventario"),
    cantidad_disponible: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, { cantidad_disponible: args.cantidad_disponible });
  },
});

export const remove = mutation({
  args: { id: v.id("inventario") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});
