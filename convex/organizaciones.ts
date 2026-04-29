import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireSuperAdmin, requireOrgAccess } from "./lib/auth";

// Lista todas las orgs activas (solo super_admin)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin) return [];
    return await ctx.db
      .query("organizaciones")
      .withIndex("by_activo", (q) => q.eq("activo", true))
      .collect();
  },
});

// Lista orgs accesibles según el rol del user
// Super_admin → todas las activas
// Otros → solo la propia (si tienen)
export const listAccessible = query({
  args: {},
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    if (scope.isSuperAdmin) {
      return await ctx.db
        .query("organizaciones")
        .withIndex("by_activo", (q) => q.eq("activo", true))
        .collect();
    }
    if (!scope.organizacionId) return [];
    const org = await ctx.db.get(scope.organizacionId);
    return org ? [org] : [];
  },
});

export const getById = query({
  args: { id: v.id("organizaciones") },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.id);
    return await ctx.db.get(args.id);
  },
});

export const add = mutation({
  args: {
    nombre: v.string(),
    slug: v.string(),
    descripcion: v.optional(v.string()),
    contacto_email: v.optional(v.string()),
    contacto_telefono: v.optional(v.string()),
    logo_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const existing = await ctx.db
      .query("organizaciones")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) throw new Error(`Ya existe una organización con slug "${args.slug}"`);
    return await ctx.db.insert("organizaciones", {
      ...args,
      activo: true,
      fecha_creacion: new Date().toISOString(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("organizaciones"),
    nombre: v.optional(v.string()),
    slug: v.optional(v.string()),
    descripcion: v.optional(v.string()),
    contacto_email: v.optional(v.string()),
    contacto_telefono: v.optional(v.string()),
    logo_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const { id, ...updates } = args;
    if (updates.slug) {
      const existing = await ctx.db
        .query("organizaciones")
        .withIndex("by_slug", (q) => q.eq("slug", updates.slug!))
        .first();
      if (existing && existing._id !== id) {
        throw new Error(`Ya existe otra organización con slug "${updates.slug}"`);
      }
    }
    return await ctx.db.patch(id, updates);
  },
});

export const setActive = mutation({
  args: { id: v.id("organizaciones"), activo: v.boolean() },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    return await ctx.db.patch(args.id, { activo: args.activo });
  },
});
