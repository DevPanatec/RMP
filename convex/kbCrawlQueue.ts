import { internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope } from "./lib/auth";
import { internal } from "./_generated/api";

// Persistent task queue. Worker procesa N tasks por batch respetando budget.
// Resumable: si Convex action timeout aproximándose (>8min), schedules siguiente runAfter.

const BATCH_SIZE = 5;
const TIMEOUT_GUARD_MS = 8 * 60 * 1000; // 8min de 10min Convex limit

// ─── Mutations ────────────────────────────────────────────

export const enqueue = internalMutation({
  args: {
    task_type: v.string(),
    payload: v.any(),
    priority: v.optional(v.number()),
    provider: v.string(),
    cost_usd_estimate: v.optional(v.number()),
    parent_task_id: v.optional(v.id("kb_crawl_tasks")),
  },
  handler: async (ctx, args) => {
    // Dedup: si existe task pendiente con mismo task_type + payload, no encolar otra
    const existing = await ctx.db
      .query("kb_crawl_tasks")
      .withIndex("by_estado_priority", q => q.eq("estado", "queued"))
      .collect();
    const payloadStr = JSON.stringify(args.payload);
    const dup = existing.find(
      t => t.task_type === args.task_type && JSON.stringify(t.payload) === payloadStr
    );
    if (dup) return dup._id;

    return await ctx.db.insert("kb_crawl_tasks", {
      task_type: args.task_type,
      payload: args.payload,
      priority: args.priority ?? 5,
      estado: "queued",
      attempts: 0,
      provider: args.provider,
      cost_usd_estimate: args.cost_usd_estimate,
      parent_task_id: args.parent_task_id,
      enqueued_at: Date.now(),
    });
  },
});

export const markTaskRunning = internalMutation({
  args: { task_id: v.id("kb_crawl_tasks") },
  handler: async (ctx, { task_id }) => {
    const t = await ctx.db.get(task_id);
    if (!t) return;
    await ctx.db.patch(task_id, {
      estado: "running",
      attempts: t.attempts + 1,
      last_attempt_at: Date.now(),
    });
  },
});

export const markTaskDone = internalMutation({
  args: {
    task_id: v.id("kb_crawl_tasks"),
    actual_cost_usd: v.optional(v.number()),
    result_summary: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.task_id, {
      estado: "done",
      completed_at: Date.now(),
      actual_cost_usd: args.actual_cost_usd,
      result_summary: args.result_summary,
    });
  },
});

export const markTaskFailed = internalMutation({
  args: {
    task_id: v.id("kb_crawl_tasks"),
    error: v.string(),
    retry_after_ms: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const t = await ctx.db.get(args.task_id);
    if (!t) return;
    const maxAttempts = 3;
    const willRetry = t.attempts < maxAttempts && args.retry_after_ms !== undefined;
    await ctx.db.patch(args.task_id, {
      estado: willRetry ? "queued" : "failed",
      next_retry_at: willRetry ? Date.now() + (args.retry_after_ms ?? 60000) : undefined,
      result_summary: { error: args.error, attempts: t.attempts },
    });
  },
});

export const markTaskSkippedBudget = internalMutation({
  args: { task_id: v.id("kb_crawl_tasks"), reason: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.task_id, {
      estado: "skipped_budget",
      result_summary: { skipped: args.reason },
    });
  },
});

// ─── Queries ──────────────────────────────────────────────

export const listNextBatch = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const now = Date.now();
    const all = await ctx.db
      .query("kb_crawl_tasks")
      .withIndex("by_estado_priority", q => q.eq("estado", "queued"))
      .collect();
    // Filter por next_retry_at (si está set, debe haber pasado)
    const ready = all.filter(t => !t.next_retry_at || t.next_retry_at <= now);
    // Sort por priority asc (1 first), enqueued_at asc (FIFO)
    ready.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.enqueued_at - b.enqueued_at;
    });
    return ready.slice(0, limit ?? BATCH_SIZE);
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return null;
    const all = await ctx.db.query("kb_crawl_tasks").collect();
    const byEstado: Record<string, number> = {};
    const byProvider: Record<string, number> = {};
    let totalCost = 0;
    for (const t of all) {
      byEstado[t.estado] = (byEstado[t.estado] ?? 0) + 1;
      byProvider[t.provider] = (byProvider[t.provider] ?? 0) + 1;
      totalCost += t.actual_cost_usd ?? 0;
    }
    return { byEstado, byProvider, totalCost, total: all.length };
  },
});

// ─── Worker ───────────────────────────────────────────────

// Procesa hasta BATCH_SIZE tasks. Si quedan más y aún hay tiempo, reschedule.
// Crítico: respetar budget caps antes de cada task.
export const processNextBatch = internalAction({
  args: { run_count: v.optional(v.number()) },
  handler: async (ctx, { run_count }): Promise<any> => {
    const startedAt = Date.now();
    const tasks: any[] = await ctx.runQuery(internal.kbCrawlQueue.listNextBatch, { limit: BATCH_SIZE });
    if (tasks.length === 0) {
      return { ok: true, processed: 0, message: "queue empty" };
    }

    const results: any[] = [];
    for (const task of tasks) {
      if (Date.now() - startedAt > TIMEOUT_GUARD_MS) {
        // Re-schedule continuation
        await ctx.scheduler.runAfter(0, internal.kbCrawlQueue.processNextBatch, {
          run_count: (run_count ?? 0) + 1,
        });
        return { ok: true, processed: results.length, rescheduled: true };
      }

      // Check budget
      const budget: any = await ctx.runMutation(internal.kbBudget.canExecute, {
        provider: task.provider,
        cost_usd_estimate: task.cost_usd_estimate,
      });
      if (!budget.allowed) {
        await ctx.runMutation(internal.kbCrawlQueue.markTaskSkippedBudget, {
          task_id: task._id,
          reason: budget.reason ?? "cap exceeded",
        });
        results.push({ task_id: task._id, skipped: budget.reason });
        continue;
      }

      // Mark running
      await ctx.runMutation(internal.kbCrawlQueue.markTaskRunning, { task_id: task._id });

      // Execute task según task_type
      try {
        let actualCost = 0;
        let summary: any = null;
        switch (task.task_type) {
          case "oem_pdf": {
            const r: any = await ctx.runAction(internal.integrations.oemBrochures.crawlSingleSeed, task.payload);
            summary = r;
            break;
          }
          case "nhtsa_models": {
            const r: any = await ctx.runAction((internal as any).integrations.nhtsaVpic.getModelsForMakeYear, {
              make: task.payload.make,
              year: task.payload.year,
            });
            summary = r;
            break;
          }
          case "wikidata_make_query": {
            const r: any = await ctx.runAction(internal.integrations.wikidata.fetchModelSpecs, {
              model_label: task.payload.model_label,
              make_label: task.payload.make_label,
            });
            summary = r;
            break;
          }
          case "doe_afdc_make": {
            const r: any = await ctx.runAction(internal.integrations.doeAfdc.syncMakeFromAfdc, {
              make_id: task.payload.make_id,
            });
            summary = r;
            break;
          }
          default:
            throw new Error(`task_type ${task.task_type} no implementado`);
        }

        await ctx.runMutation(internal.kbBudget.recordSpend, {
          provider: task.provider,
          cost_usd: actualCost,
        });
        await ctx.runMutation(internal.kbCrawlQueue.markTaskDone, {
          task_id: task._id,
          actual_cost_usd: actualCost,
          result_summary: summary,
        });
        results.push({ task_id: task._id, ok: true });
      } catch (err: any) {
        await ctx.runMutation(internal.kbCrawlQueue.markTaskFailed, {
          task_id: task._id,
          error: err.message ?? String(err),
          retry_after_ms: 5 * 60 * 1000, // retry 5min
        });
        results.push({ task_id: task._id, error: err.message ?? String(err) });
      }
    }

    // Schedule next batch si quedan más queued
    const remaining: any[] = await ctx.runQuery(internal.kbCrawlQueue.listNextBatch, { limit: 1 });
    if (remaining.length > 0 && Date.now() - startedAt < TIMEOUT_GUARD_MS) {
      await ctx.scheduler.runAfter(0, internal.kbCrawlQueue.processNextBatch, {
        run_count: (run_count ?? 0) + 1,
      });
    }

    return { ok: true, processed: results.length, results };
  },
});
