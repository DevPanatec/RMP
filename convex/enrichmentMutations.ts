import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Upsert template_override de fuente auto (no requiere auth — caller es internal).
// Dedup por (model_year_id + source): si ya existe con source igual, actualiza si confidence sube.
export const upsertOverride = internalMutation({
  args: {
    model_year_id: v.id("model_years"),
    equipment_class: v.string(),
    template_name: v.string(),
    param_overrides: v.any(),
    confidence: v.number(),
    source: v.string(),
    version_label: v.optional(v.string()),
    organizacion_id: v.optional(v.id("organizaciones")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("template_overrides")
      .withIndex("by_model_year", q => q.eq("model_year_id", args.model_year_id))
      .collect();
    const dup = existing.find(o => o.source === args.source);

    if (dup) {
      // Solo update si nueva confidence >= existente
      if (args.confidence >= dup.confidence) {
        await ctx.db.patch(dup._id, {
          param_overrides: args.param_overrides,
          confidence: args.confidence,
          version_label: args.version_label,
          last_computed: Date.now(),
        });
      }
      return dup._id;
    }

    const newId = await ctx.db.insert("template_overrides", {
      model_year_id: args.model_year_id,
      equipment_class: args.equipment_class,
      template_name: args.template_name,
      param_overrides: args.param_overrides,
      confidence: args.confidence,
      source: args.source,
      version_label: args.version_label,
      last_computed: Date.now(),
      visibility: "global", // overrides auto-sourced son globales
      organizacion_id: args.organizacion_id,
    });

    // Audit log
    await ctx.db.insert("kb_audit_log", {
      event: "template_override.create",
      entity_type: "template_override",
      entity_id: newId as unknown as string,
      after_state: { _id: newId, source: args.source, confidence: args.confidence },
      source: args.source.startsWith("auto") || args.source === "wikidata" || args.source === "nhtsa" || args.source === "doe_afdc"
        ? "crawler"
        : "claude_ai",
      confidence: args.confidence,
      timestamp: Date.now(),
      organizacion_id: args.organizacion_id,
    });

    return newId;
  },
});
