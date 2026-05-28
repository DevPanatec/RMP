import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const flagStale = internalMutation({
  args: { source_id: v.id("kb_sources"), status_code: v.number() },
  handler: async (ctx, args) => {
    const src = await ctx.db.get(args.source_id);
    if (!src) return;

    // Dedup alert
    const existing = await ctx.db
      .query("kb_health_alerts")
      .withIndex("by_tipo", q => q.eq("tipo", "stale_url"))
      .collect();
    const dup = existing.find(a =>
      !a.resolved_at && a.entity_id === (args.source_id as unknown as string)
    );
    if (dup) return;

    await ctx.db.insert("kb_health_alerts", {
      tipo: "stale_url",
      severity: "warn",
      entity_type: "kb_source",
      entity_id: args.source_id as unknown as string,
      mensaje: `URL ${src.source_url} retornó HTTP ${args.status_code}. Posible cambio de URL OEM.`,
      detail: {
        source_url: src.source_url,
        source_type: src.source_type,
        status_code: args.status_code,
        last_alive: src.fetched_at,
      },
      detected_at: Date.now(),
    });
  },
});

export const markAlive = internalMutation({
  args: { source_id: v.id("kb_sources") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.source_id, { fetched_at: Date.now() });
  },
});
