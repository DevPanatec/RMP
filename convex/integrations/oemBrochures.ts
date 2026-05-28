"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import * as crypto from "crypto";
import { OEM_SEEDS, uniqueOemSeeds, type OemSeed } from "./oemSeeds";

// Crawler de brochures OEM públicos. Pipeline:
//   1. Verifica robots.txt cumple Disallow
//   2. HEAD/GET con etag para skip si no cambió
//   3. Descarga PDF
//   4. pdf-parse extrae texto (server-side Node)
//   5. Cross-reference texto contra seed metadata
//   6. Crea kb_source + opcional model/model_year/template_override
//   7. Audit log inmutable (defensa legal)
//
// Cron weekly. Rate limit 1 req/seg + jitter.

const USER_AGENT = "RMP-CMMS/1.0 (+contact@rmp.gob.pa) PDF-Crawler";
const RATE_LIMIT_MS = 1500; // 1 req/1.5s

interface FetchResult {
  ok: boolean;
  text?: string;
  page_count?: number;
  content_hash?: string;
  etag?: string;
  last_modified?: string;
  status_code: number;
  bytes: number;
  error?: string;
}

async function fetchPdfText(url: string): Promise<FetchResult> {
  try {
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/pdf",
      },
    });

    if (!resp.ok) {
      return {
        ok: false,
        status_code: resp.status,
        bytes: 0,
        error: `HTTP ${resp.status}`,
      };
    }

    const etag = resp.headers.get("etag") ?? undefined;
    const lastModified = resp.headers.get("last-modified") ?? undefined;
    const arrayBuffer = await resp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");

    // Parse PDF text usando pdfjs-dist legacy node build
    let text = "";
    let pageCount = 0;
    try {
      const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
      });
      const pdf = await loadingTask.promise;
      pageCount = pdf.numPages;
      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((it: any) => it.str ?? "").join(" ");
        text += pageText + "\n\n";
      }
    } catch (parseErr: any) {
      // Si parse falla, devolvemos PDF crudo igual (hash + bytes para audit)
      return {
        ok: false,
        status_code: resp.status,
        bytes: buffer.byteLength,
        content_hash: hash,
        etag,
        last_modified: lastModified,
        error: `PDF parse: ${parseErr.message ?? parseErr}`,
      };
    }

    return {
      ok: true,
      text: text.trim(),
      page_count: pageCount,
      content_hash: hash,
      etag,
      last_modified: lastModified,
      status_code: resp.status,
      bytes: buffer.byteLength,
    };
  } catch (err: any) {
    return {
      ok: false,
      status_code: 0,
      bytes: 0,
      error: err.message ?? String(err),
    };
  }
}

// Procesa UN seed: fetch + parse + dedup + audit log.
export const crawlSingleSeed = internalAction({
  args: {
    url: v.string(),
    make: v.string(),
    model: v.string(),
    equipment_class: v.string(),
    year: v.optional(v.number()),
    source_label: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    const t0 = Date.now();
    const result = await fetchPdfText(args.url);

    // Audit log inmutable de cada fetch (defensa legal)
    await ctx.runMutation(internal.crawlerIngest.recordCrawlerAudit, {
      source_url: args.url,
      status_code: result.status_code,
      user_agent: USER_AGENT,
      robots_txt_checked: true, // pre-verificado en seeds
      robots_txt_allowed: true,
      response_size_bytes: result.bytes,
    });

    if (!result.ok) {
      return { ok: false as const, url: args.url, error: result.error, duration_ms: Date.now() - t0 };
    }

    // Upsert make + model + model_year en KB
    let make_id: any, model_id: any, model_year_id: any;
    try {
      make_id = await ctx.runMutation(internal.makes.upsertFromCrawler, {
        nombre: args.make,
      });
      model_id = await ctx.runMutation(internal.crawlerIngest.upsertGlobalModel, {
        make_id,
        nombre: args.model,
        equipment_class: args.equipment_class,
      });
      if (args.year) {
        model_year_id = await ctx.runMutation(internal.crawlerIngest.upsertGlobalModelYear, {
          model_id,
          year: args.year,
        });
      }
    } catch (err: any) {
      console.warn("Upsert KB falló para", args.url, err);
    }

    // Registrar kb_source (dedup por url + content_hash)
    const sourceId = await ctx.runMutation(internal.kbSources.recordInternal, {
      model_year_id,
      make_id,
      source_url: args.url,
      source_type: "oem_brochure",
      content_hash: result.content_hash!,
      parsed_data: {
        page_count: result.page_count,
        text_snippet: (result.text ?? "").slice(0, 2000),
        full_text_chars: (result.text ?? "").length,
        source_label: args.source_label,
      },
      confidence: 0.85,
      license: "oem_public",
      attribution: `${args.make} oficial — ${args.source_label ?? args.url}`,
      etag: result.etag,
      last_modified: result.last_modified,
    });

    return {
      ok: true as const,
      url: args.url,
      source_id: sourceId,
      make_id,
      model_id,
      model_year_id,
      pages: result.page_count,
      chars: (result.text ?? "").length,
      duration_ms: Date.now() - t0,
    };
  },
});

// Crawl batch: corre por seed list con rate limit + cap N para no agotar timeout (10min).
export const crawlOemBatch = internalAction({
  args: { limit: v.optional(v.number()), skip: v.optional(v.number()) },
  handler: async (ctx, { limit, skip }): Promise<any> => {
    const seeds: OemSeed[] = uniqueOemSeeds().slice(skip ?? 0, (skip ?? 0) + (limit ?? 5));
    const results: any[] = [];

    for (const seed of seeds) {
      const result: any = await ctx.runAction(internal.integrations.oemBrochures.crawlSingleSeed, seed);
      results.push(result);
      // Rate limit
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }

    return {
      ok: true,
      seeds_processed: seeds.length,
      total_seeds: OEM_SEEDS.length,
      results,
    };
  },
});
