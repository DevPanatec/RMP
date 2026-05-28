import { internalMutation, internalQuery, query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireAdminWrite } from "./lib/auth";

// ─── Queries ──────────────────────────────────────────────

export const list = query({
  args: { validated_only: v.optional(v.boolean()) },
  handler: async (ctx, { validated_only }) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    if (validated_only) {
      return await ctx.db
        .query("makes")
        .withIndex("by_validated", q => q.eq("validated", true))
        .collect();
    }
    return await ctx.db.query("makes").collect();
  },
});

export const search = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { query, limit }) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    if (!query || query.length < 1) return [];
    const results = await ctx.db
      .query("makes")
      .withSearchIndex("search_nombre", q => q.search("nombre", query))
      .take(limit ?? 10);
    return results;
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("makes")
      .withIndex("by_slug", q => q.eq("slug", slug))
      .first();
  },
});

// ─── Mutations ────────────────────────────────────────────

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export const create = mutation({
  args: {
    nombre: v.string(),
    oem_website: v.optional(v.string()),
    paises_disponibles: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const scope = await requireAdminWrite(ctx);
    const slug = slugify(args.nombre);
    const existing = await ctx.db
      .query("makes")
      .withIndex("by_slug", q => q.eq("slug", slug))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("makes", {
      nombre: args.nombre,
      slug,
      oem_website: args.oem_website,
      paises_disponibles: args.paises_disponibles,
      validated: scope.isSuperAdmin, // super_admin valida directo
    });
  },
});

export const upsert = mutation({
  args: {
    nombre: v.string(),
    oem_website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    const slug = slugify(args.nombre);
    const existing = await ctx.db
      .query("makes")
      .withIndex("by_slug", q => q.eq("slug", slug))
      .first();
    if (existing) {
      if (args.oem_website && !existing.oem_website) {
        await ctx.db.patch(existing._id, { oem_website: args.oem_website });
      }
      return existing._id;
    }
    return await ctx.db.insert("makes", {
      nombre: args.nombre,
      slug,
      oem_website: args.oem_website,
      validated: false,
    });
  },
});

export const validate = mutation({
  args: { id: v.id("makes") },
  handler: async (ctx, { id }) => {
    const scope = await requireAdminWrite(ctx);
    if (!scope.isSuperAdmin) {
      throw new Error("Solo super_admin puede validar marcas globales");
    }
    await ctx.db.patch(id, { validated: true });
  },
});

// Internal getter (sin auth) — usado por actions del crawler/enrichment.
export const getInternal = internalQuery({
  args: { id: v.id("makes") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Internal: usada por crawler. Upsert sin auth check (caller debe estar autenticado upstream).
export const upsertFromCrawler = internalMutation({
  args: {
    nombre: v.string(),
    oem_website: v.optional(v.string()),
    paises_disponibles: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const slug = slugify(args.nombre);
    const existing = await ctx.db
      .query("makes")
      .withIndex("by_slug", q => q.eq("slug", slug))
      .first();
    if (existing) {
      if (args.oem_website && !existing.oem_website) {
        await ctx.db.patch(existing._id, { oem_website: args.oem_website });
      }
      return existing._id;
    }
    return await ctx.db.insert("makes", {
      nombre: args.nombre,
      slug,
      oem_website: args.oem_website,
      paises_disponibles: args.paises_disponibles,
      validated: false, // crawler-sourced no es validated por default
    });
  },
});
