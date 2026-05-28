"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { OEM_SEEDS } from "./integrations/oemSeeds";

// Auto-discovery: descubre nuevas marcas/modelos sistemáticamente.
// Sin user action — pobla KB en background nocturno.
//
// 3 estrategias:
//   1. Enqueue OEM seeds (todos los URLs verificados)
//   2. Enqueue NHTSA GetModelsForMake para top makes en KB
//   3. Enqueue Wikidata para modelos sin specs

const CURRENT_YEAR = new Date().getFullYear();

// Encola todos los OEM seeds (rate-limit en queue worker).
export const enqueueAllOemSeeds = internalAction({
  args: {},
  handler: async (ctx) => {
    let enqueued = 0;
    for (const seed of OEM_SEEDS) {
      try {
        await ctx.runMutation(internal.kbCrawlQueue.enqueue, {
          task_type: "oem_pdf",
          payload: seed,
          priority: 5,
          provider: "oem_http",
          cost_usd_estimate: 0,
        });
        enqueued++;
      } catch {
        // dup, skip
      }
    }
    return { enqueued, total: OEM_SEEDS.length };
  },
});

// Encola NHTSA GetModelsForMake para top makes (priorización: makes con más vehiculos).
export const enqueueNhtsaModelsForTopMakes = internalAction({
  args: { top_n: v.optional(v.number()), years: v.optional(v.array(v.number())) },
  handler: async (ctx, args) => {
    const topMakes: any[] = await ctx.runQuery(internal.kbDiscoveryQueries.listTopMakesByVehicleCount, {
      limit: args.top_n ?? 20,
    });
    const years = args.years ?? [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];
    let enqueued = 0;
    for (const make of topMakes) {
      for (const year of years) {
        try {
          await ctx.runMutation(internal.kbCrawlQueue.enqueue, {
            task_type: "nhtsa_models",
            payload: { make: make.nombre, year },
            priority: 4,
            provider: "nhtsa",
            cost_usd_estimate: 0,
          });
          enqueued++;
        } catch {
          // dup
        }
      }
    }
    return { enqueued, makes_count: topMakes.length, years };
  },
});

// Encola Wikidata para modelos sin Wikidata source.
export const enqueueWikidataForOrphanModels = internalAction({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const candidates: any[] = await ctx.runQuery(internal.crawlerQueries.listModelsNeedingEnrich, {
      limit: args.limit ?? 30,
    });
    let enqueued = 0;
    for (const c of candidates) {
      try {
        await ctx.runMutation(internal.kbCrawlQueue.enqueue, {
          task_type: "wikidata_make_query",
          payload: {
            model_label: c.model_label,
            make_label: c.make_label,
            model_id: c.model_id,
            model_year_id: c.model_year_id,
            make_id: c.make_id,
          },
          priority: 6,
          provider: "wikidata",
          cost_usd_estimate: 0,
        });
        enqueued++;
      } catch {
        // dup
      }
    }
    return { enqueued };
  },
});

// Master discovery: corre las 3 estrategias en cascada.
export const runDiscovery = internalAction({
  args: {},
  handler: async (ctx) => {
    const log: any[] = [];
    let t0 = Date.now();
    try {
      const r1 = await ctx.runAction(internal.kbDiscovery.enqueueAllOemSeeds, {});
      log.push({ step: "oem_seeds", result: r1, ms: Date.now() - t0 });
    } catch (e: any) {
      log.push({ step: "oem_seeds", error: e.message, ms: Date.now() - t0 });
    }
    t0 = Date.now();
    try {
      const r2 = await ctx.runAction(internal.kbDiscovery.enqueueNhtsaModelsForTopMakes, { top_n: 20 });
      log.push({ step: "nhtsa_models_top", result: r2, ms: Date.now() - t0 });
    } catch (e: any) {
      log.push({ step: "nhtsa_models_top", error: e.message, ms: Date.now() - t0 });
    }
    t0 = Date.now();
    try {
      const r3 = await ctx.runAction(internal.kbDiscovery.enqueueWikidataForOrphanModels, { limit: 30 });
      log.push({ step: "wikidata_orphans", result: r3, ms: Date.now() - t0 });
    } catch (e: any) {
      log.push({ step: "wikidata_orphans", error: e.message, ms: Date.now() - t0 });
    }
    return { ok: true, log };
  },
});
