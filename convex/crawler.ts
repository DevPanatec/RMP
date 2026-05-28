"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Orchestrator: corre todas las fuentes en cascada por dia.
// Diseno: cada fuente es un sub-action que se encola si falla.
// Cron 2am Panama dispara runDailyCrawl.

export const runDailyCrawl = internalAction({
  args: {},
  handler: async (ctx) => {
    const log: { source: string; result: any; duration_ms: number }[] = [];

    // 1. NHTSA vPIC makes sync
    let t0 = Date.now();
    try {
      const nhtsaResult = await ctx.runAction(internal.integrations.nhtsaVpic.bulkSyncMakes, {
        limit: 200,
      });
      log.push({ source: "nhtsa_vpic_makes", result: nhtsaResult, duration_ms: Date.now() - t0 });
    } catch (err: any) {
      log.push({ source: "nhtsa_vpic_makes", result: { error: err.message }, duration_ms: Date.now() - t0 });
    }

    // 2. Wikidata enrichment para modelos sin specs
    t0 = Date.now();
    try {
      const enrichResult = await ctx.runAction(internal.crawler.enrichUnvalidatedModels, { limit: 20 });
      log.push({ source: "wikidata_enrich", result: enrichResult, duration_ms: Date.now() - t0 });
    } catch (err: any) {
      log.push({ source: "wikidata_enrich", result: { error: err.message }, duration_ms: Date.now() - t0 });
    }

    // 3. DOE AFDC sync para makes validadas
    t0 = Date.now();
    try {
      const afdcResult = await ctx.runAction(internal.crawler.syncDoeAfdcForKnownMakes, { limit: 10 });
      log.push({ source: "doe_afdc", result: afdcResult, duration_ms: Date.now() - t0 });
    } catch (err: any) {
      log.push({ source: "doe_afdc", result: { error: err.message }, duration_ms: Date.now() - t0 });
    }

    // 4. OEM brochures (rate-limited, cap 5 por daily run pa' no agotar timeout 10min).
    //    Cron weekly procesa más en lote. Pero daily sigue procesando 5 para reciclar URLs viejos.
    t0 = Date.now();
    try {
      const oemResult = await ctx.runAction(internal.integrations.oemBrochures.crawlOemBatch, { limit: 5 });
      log.push({ source: "oem_brochures", result: oemResult, duration_ms: Date.now() - t0 });
    } catch (err: any) {
      log.push({ source: "oem_brochures", result: { error: err.message }, duration_ms: Date.now() - t0 });
    }

    // 5. Internet Archive enrichment (1 make per daily run)
    t0 = Date.now();
    try {
      const archiveResult = await ctx.runAction(internal.crawler.syncOneMakeFromArchive, {});
      log.push({ source: "internet_archive", result: archiveResult, duration_ms: Date.now() - t0 });
    } catch (err: any) {
      log.push({ source: "internet_archive", result: { error: err.message }, duration_ms: Date.now() - t0 });
    }

    return {
      ok: true,
      timestamp: Date.now(),
      log,
    };
  },
});

// Sync 1 make rotativa desde Internet Archive (rate-limit polite).
// Selección: make con menos hits archive_search en kb_sources.
export const syncOneMakeFromArchive = internalAction({
  args: {},
  handler: async (ctx): Promise<any> => {
    const candidates: any[] = await ctx.runQuery(internal.crawlerQueries.listMakesNeedingArchive, { limit: 1 });
    if (candidates.length === 0) return { ok: false as const, error: "no candidates" };
    const r: any = await ctx.runAction(internal.integrations.internetArchive.syncMakeFromArchive, {
      make_id: candidates[0]._id,
    });
    return r;
  },
});

// Sync DOE AFDC para makes que ya existen en KB. Cap N para no agotar timeout.
export const syncDoeAfdcForKnownMakes = internalAction({
  args: { limit: v.number() },
  handler: async (ctx, { limit }) => {
    const makes: any[] = await ctx.runQuery(internal.crawlerQueries.listMakesNeedingAfdc, { limit });
    let total_created = 0;
    let failed = 0;
    for (const m of makes) {
      try {
        const r: any = await ctx.runAction(internal.integrations.doeAfdc.syncMakeFromAfdc, { make_id: m._id });
        if (r?.ok) total_created += r.created ?? 0;
        else failed++;
      } catch {
        failed++;
      }
    }
    return { total_created, failed, makes_processed: makes.length };
  },
});

// Enriquece N modelos sin Wikidata source. Cap N para no agotar timeout (10min).
export const enrichUnvalidatedModels = internalAction({
  args: { limit: v.number() },
  handler: async (ctx, { limit }) => {
    const candidates: any[] = await ctx.runQuery(internal.crawlerQueries.listModelsNeedingEnrich, { limit });
    let enriched = 0;
    let failed = 0;
    for (const c of candidates) {
      try {
        const result: any = await ctx.runAction((internal as any).integrations.wikidata.syncModelSpecs, {
          model_id: c.model_id,
          model_year_id: c.model_year_id,
          make_id: c.make_id,
          model_label: c.model_label,
          make_label: c.make_label,
        });
        if (result.ok) enriched++; else failed++;
      } catch {
        failed++;
      }
    }
    return { enriched, failed, total: candidates.length };
  },
});
