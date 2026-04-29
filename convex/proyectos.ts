import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope } from "./lib/auth";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("proyectos").collect();
  },
});

// Devuelve los proyectos accesibles según el rol del user actual.
// Admin → todos los proyectos activos.
// Enterprise/Conductor → solo el proyecto asignado en su perfil (si existe).
// Sin sesión → array vacío.
export const listAccessible = query({
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    if (scope.isAdmin) {
      return await ctx.db
        .query("proyectos")
        .withIndex("by_activo", (q) => q.eq("activo", true))
        .collect();
    }
    if (!scope.proyectoId) return [];
    const proyecto = await ctx.db.get(scope.proyectoId);
    return proyecto ? [proyecto] : [];
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
