import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("proyectos").collect();
  },
});

export const listActive = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("proyectos")
      .withIndex("by_activo", (q) => q.eq("activo", true))
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("proyectos") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const add = mutation({
  args: {
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    cliente: v.optional(v.string()),
    fecha_inicio: v.optional(v.string()),
    fecha_fin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("proyectos", {
      ...args,
      activo: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("proyectos"),
    nombre: v.optional(v.string()),
    descripcion: v.optional(v.string()),
    cliente: v.optional(v.string()),
    fecha_inicio: v.optional(v.string()),
    fecha_fin: v.optional(v.string()),
    activo: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("proyectos") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});
