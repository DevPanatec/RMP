import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireAdminWrite } from "./lib/auth";

// ─── Queries ──────────────────────────────────────────────

export const listByModelYear = query({
  args: { model_year_id: v.id("model_years") },
  handler: async (ctx, { model_year_id }) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    return await ctx.db
      .query("kb_sources")
      .withIndex("by_model_year", q => q.eq("model_year_id", model_year_id))
      .collect();
  },
});

export const listByMake = query({
  args: { make_id: v.id("makes") },
  handler: async (ctx, { make_id }) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    return await ctx.db
      .query("kb_sources")
      .withIndex("by_make", q => q.eq("make_id", make_id))
      .collect();
  },
});

export const recentBySource = query({
  args: { source_type: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { source_type, limit }) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    const all = await ctx.db
      .query("kb_sources")
      .withIndex("by_source_type", q => q.eq("source_type", source_type))
      .collect();
    all.sort((a, b) => b.fetched_at - a.fetched_at);
    return all.slice(0, limit ?? 50);
  },
});

// ─── Mutations ────────────────────────────────────────────

// Internal: usada por actions del crawler para registrar fuentes scraped.
export const recordInternal = internalMutation({
  args: {
    model_year_id: v.optional(v.id("model_years")),
    make_id: v.optional(v.id("makes")),
    source_url: v.string(),
    source_type: v.string(),
    content_hash: v.string(),
    parsed_data: v.optional(v.any()),
    confidence: v.number(),
    license: v.string(),
    attribution: v.optional(v.string()),
    last_modified: v.optional(v.string()),
    etag: v.optional(v.string()),
    raw_storage_id: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    // Dedup por content_hash + source_url
    const existing = await ctx.db
      .query("kb_sources")
      .withIndex("by_source_type", q => q.eq("source_type", args.source_type))
      .collect();
    const match = existing.find(s =>
      s.source_url === args.source_url && s.content_hash === args.content_hash
    );
    if (match) {
      // Solo actualiza fetched_at
      await ctx.db.patch(match._id, { fetched_at: Date.now() });
      return match._id;
    }
    return await ctx.db.insert("kb_sources", {
      ...args,
      fetched_at: Date.now(),
    });
  },
});

// Public: admin puede borrar fuentes manualmente
export const remove = mutation({
  args: { id: v.id("kb_sources") },
  handler: async (ctx, { id }) => {
    await requireAdminWrite(ctx);
    await ctx.db.delete(id);
  },
});
