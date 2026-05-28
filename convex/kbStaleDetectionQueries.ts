import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Lista kb_sources tipo oem_brochure ordenados por fetched_at asc (más viejos first).
// Worker procesa estos para verificar si siguen vivos.
export const listOldestOemSources = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, { limit }) => {
    const all = await ctx.db
      .query("kb_sources")
      .withIndex("by_source_type", q => q.eq("source_type", "oem_brochure"))
      .collect();
    all.sort((a, b) => a.fetched_at - b.fetched_at);
    return all.slice(0, limit);
  },
});
