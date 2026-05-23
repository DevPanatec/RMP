import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireWriteRole } from "./lib/auth";

// ─── Queries ──────────────────────────────────────────────

export const listByModel = query({
  args: { model_id: v.id("models") },
  handler: async (ctx, { model_id }) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    // Verificar acceso al modelo
    const m = await ctx.db.get(model_id);
    if (!m) return [];
    if (m.visibility === "private_org" && m.organizacion_id !== scope.organizacionId && !scope.isSuperAdmin) {
      return [];
    }
    const years = await ctx.db
      .query("model_years")
      .withIndex("by_model", q => q.eq("model_id", model_id))
      .collect();
    return years.sort((a, b) => b.year - a.year);
  },
});

export const get = query({
  args: { model_id: v.id("models"), year: v.number() },
  handler: async (ctx, { model_id, year }) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return null;
    const m = await ctx.db.get(model_id);
    if (!m) return null;
    if (m.visibility === "private_org" && m.organizacion_id !== scope.organizacionId && !scope.isSuperAdmin) {
      return null;
    }
    return await ctx.db
      .query("model_years")
      .withIndex("by_model_year", q => q.eq("model_id", model_id).eq("year", year))
      .first();
  },
});

// ─── Mutations ────────────────────────────────────────────

export const upsert = mutation({
  args: {
    model_id: v.id("models"),
    year: v.number(),
    specs: v.optional(v.object({
      engine: v.optional(v.string()),
      transmission: v.optional(v.string()),
      gvwr_kg: v.optional(v.number()),
      axle_config: v.optional(v.string()),
      wheelbase_mm: v.optional(v.number()),
      cabin_style: v.optional(v.string()),
    })),
    param_svg_overrides: v.optional(v.any()),
    vin_decoded_raw: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const scope = await requireWriteRole(ctx);
    const m = await ctx.db.get(args.model_id);
    if (!m) throw new Error("Modelo no existe");
    if (m.visibility === "private_org" && m.organizacion_id !== scope.organizacionId && !scope.isSuperAdmin) {
      throw new Error("Acceso denegado al modelo");
    }
    const existing = await ctx.db
      .query("model_years")
      .withIndex("by_model_year", q => q.eq("model_id", args.model_id).eq("year", args.year))
      .first();
    if (existing) {
      const patch: any = {};
      if (args.specs !== undefined) patch.specs = { ...existing.specs, ...args.specs };
      if (args.param_svg_overrides !== undefined) patch.param_svg_overrides = args.param_svg_overrides;
      if (args.vin_decoded_raw !== undefined) patch.vin_decoded_raw = args.vin_decoded_raw;
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("model_years", {
      model_id: args.model_id,
      year: args.year,
      specs: args.specs,
      param_svg_overrides: args.param_svg_overrides,
      vin_decoded_raw: args.vin_decoded_raw,
    });
  },
});
