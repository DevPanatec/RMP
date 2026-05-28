import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Queries usadas por crawler.ts (que es "use node"). Quedan separadas porque
// queries no se pueden definir en archivos node-runtime.

// Lista makes que aun no tienen sources DOE AFDC. Cap N.
export const listMakesNeedingAfdc = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, { limit }) => {
    const allMakes = await ctx.db.query("makes").collect();
    const candidates: any[] = [];
    for (const m of allMakes) {
      if (candidates.length >= limit) break;
      const sources = await ctx.db
        .query("kb_sources")
        .withIndex("by_make", q => q.eq("make_id", m._id))
        .collect();
      if (sources.some(s => s.source_type === "doe_afdc")) continue;
      candidates.push(m);
    }
    return candidates;
  },
});

// Lista makes sin sources Internet Archive. Round-robin daily.
export const listMakesNeedingArchive = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, { limit }) => {
    const allMakes = await ctx.db.query("makes").collect();
    const candidates: any[] = [];
    for (const m of allMakes) {
      if (candidates.length >= limit) break;
      const sources = await ctx.db
        .query("kb_sources")
        .withIndex("by_make", q => q.eq("make_id", m._id))
        .collect();
      if (sources.some(s => s.source_type === "internet_archive")) continue;
      candidates.push(m);
    }
    return candidates;
  },
});

export const listModelsNeedingEnrich = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, { limit }) => {
    // Modelos sin kb_source de tipo "wikidata" — candidatos a enrich.
    const allModels = await ctx.db.query("models").collect();
    const candidates: any[] = [];
    for (const m of allModels) {
      if (candidates.length >= limit) break;
      // Buscar si tiene wikidata source via model_years
      const years = await ctx.db
        .query("model_years")
        .withIndex("by_model", q => q.eq("model_id", m._id))
        .collect();
      // Skip si todos los anos tienen wikidata source
      let needsEnrich = years.length === 0;
      if (years.length > 0) {
        for (const y of years) {
          const sources = await ctx.db
            .query("kb_sources")
            .withIndex("by_model_year", q => q.eq("model_year_id", y._id))
            .collect();
          if (!sources.some(s => s.source_type === "wikidata")) {
            needsEnrich = true;
            break;
          }
        }
      }
      if (!needsEnrich) continue;

      const make = await ctx.db.get(m.make_id);
      candidates.push({
        model_id: m._id,
        model_year_id: years[0]?._id,
        make_id: m.make_id,
        model_label: m.nombre,
        make_label: make?.nombre,
      });
    }
    return candidates;
  },
});
