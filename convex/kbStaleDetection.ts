"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Re-check kb_sources tipo "oem_brochure" via HEAD request.
// Si 404/4xx → mark stale + crear kb_health_alert.
// Cron weekly. Cap N para no agotar timeout.

const USER_AGENT = "RMP-CMMS/1.0 (Stale-Check)";
const TIMEOUT_MS = 8 * 60 * 1000;
const RATE_LIMIT_MS = 2000;

export const checkStaleUrls = internalAction({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<any> => {
    const sources: any[] = await ctx.runQuery(internal.kbStaleDetectionQueries.listOldestOemSources, {
      limit: args.limit ?? 20,
    });
    const startedAt = Date.now();
    let stale = 0;
    let alive = 0;
    const results: any[] = [];

    for (const source of sources) {
      if (Date.now() - startedAt > TIMEOUT_MS) break;

      let status = 0;
      try {
        const resp = await fetch(source.source_url, {
          method: "HEAD",
          headers: { "User-Agent": USER_AGENT },
          signal: AbortSignal.timeout(10000),
        });
        status = resp.status;
      } catch {
        status = 0; // network error
      }

      if (status === 404 || status === 410 || status === 403 || status === 0) {
        await ctx.runMutation(internal.kbStaleDetectionMutations.flagStale, {
          source_id: source._id,
          status_code: status,
        });
        stale++;
        results.push({ url: source.source_url, status, action: "flagged_stale" });
      } else if (status >= 200 && status < 400) {
        // Update fetched_at para indicar verificado vivo recientemente
        await ctx.runMutation(internal.kbStaleDetectionMutations.markAlive, {
          source_id: source._id,
        });
        alive++;
      } else {
        // 5xx u otros — skip por ahora
        results.push({ url: source.source_url, status, action: "skip" });
      }

      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }

    return { ok: true, stale, alive, checked: results.length, results };
  },
});
