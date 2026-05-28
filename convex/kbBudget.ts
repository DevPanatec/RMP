import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope } from "./lib/auth";

// Defaults conservadores. Override por org via organizaciones.custom_caps.
export const DEFAULT_DAILY_CAP_USD = 5;
export const DEFAULT_CALL_CAPS: Record<string, number> = {
  nhtsa: 10000,
  wikidata: 5000,
  doe_afdc: 1000,
  oem_http: 100,
  vincario: 100,
  claude_sonnet: 200,
  claude_opus: 50,
  claude_haiku: 1000,
};

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// Internal: obtiene budget de hoy (crea si no existe).
export const getTodayBudget = internalMutation({
  args: { organizacion_id: v.optional(v.id("organizaciones")) },
  handler: async (ctx, args) => {
    const date_utc = todayUtc();
    const existing = await ctx.db
      .query("kb_budget")
      .withIndex("by_organizacion_date", q =>
        q.eq("organizacion_id", args.organizacion_id).eq("date_utc", date_utc)
      )
      .first();
    if (existing) return existing;
    const newId = await ctx.db.insert("kb_budget", {
      date_utc,
      total_usd_spent: 0,
      total_calls: 0,
      by_provider: {},
      daily_cap_usd: DEFAULT_DAILY_CAP_USD,
      daily_call_caps: DEFAULT_CALL_CAPS,
      organizacion_id: args.organizacion_id,
    });
    return await ctx.db.get(newId);
  },
});

// Internal: check si task puede ejecutar (no excede caps).
// Returns { allowed: bool, reason?: string, remaining: { ... } }
export const canExecute = internalMutation({
  args: {
    provider: v.string(),
    cost_usd_estimate: v.optional(v.number()),
    organizacion_id: v.optional(v.id("organizaciones")),
  },
  handler: async (ctx, args) => {
    const date_utc = todayUtc();
    const budget = await ctx.db
      .query("kb_budget")
      .withIndex("by_organizacion_date", q =>
        q.eq("organizacion_id", args.organizacion_id).eq("date_utc", date_utc)
      )
      .first();
    if (!budget) {
      // No budget yet, create
      await ctx.db.insert("kb_budget", {
        date_utc,
        total_usd_spent: 0,
        total_calls: 0,
        by_provider: {},
        daily_cap_usd: DEFAULT_DAILY_CAP_USD,
        daily_call_caps: DEFAULT_CALL_CAPS,
        organizacion_id: args.organizacion_id,
      });
      return { allowed: true as const, reason: null };
    }

    const cost = args.cost_usd_estimate ?? 0;
    if (budget.total_usd_spent + cost > budget.daily_cap_usd) {
      return {
        allowed: false as const,
        reason: `Daily USD cap excedido: ${budget.total_usd_spent.toFixed(4)} + ${cost.toFixed(4)} > ${budget.daily_cap_usd}`,
      };
    }

    const providerStats = budget.by_provider?.[args.provider] ?? { calls: 0, usd: 0 };
    const callCap = budget.daily_call_caps?.[args.provider];
    if (callCap !== undefined && providerStats.calls >= callCap) {
      return {
        allowed: false as const,
        reason: `Cap ${args.provider} excedido: ${providerStats.calls}/${callCap}`,
      };
    }

    return { allowed: true as const, reason: null };
  },
});

// Internal: registra gasto después de task ejecutado.
export const recordSpend = internalMutation({
  args: {
    provider: v.string(),
    cost_usd: v.optional(v.number()),
    organizacion_id: v.optional(v.id("organizaciones")),
  },
  handler: async (ctx, args) => {
    const date_utc = todayUtc();
    let budget = await ctx.db
      .query("kb_budget")
      .withIndex("by_organizacion_date", q =>
        q.eq("organizacion_id", args.organizacion_id).eq("date_utc", date_utc)
      )
      .first();
    if (!budget) {
      const id = await ctx.db.insert("kb_budget", {
        date_utc,
        total_usd_spent: 0,
        total_calls: 0,
        by_provider: {},
        daily_cap_usd: DEFAULT_DAILY_CAP_USD,
        daily_call_caps: DEFAULT_CALL_CAPS,
        organizacion_id: args.organizacion_id,
      });
      budget = await ctx.db.get(id);
    }
    if (!budget) return;

    const cost = args.cost_usd ?? 0;
    const stats = { ...(budget.by_provider ?? {}) };
    const cur = stats[args.provider] ?? { calls: 0, usd: 0 };
    stats[args.provider] = {
      calls: cur.calls + 1,
      usd: cur.usd + cost,
    };
    await ctx.db.patch(budget._id, {
      total_usd_spent: budget.total_usd_spent + cost,
      total_calls: budget.total_calls + 1,
      by_provider: stats,
    });
  },
});

// Public query — UI dashboard
export const getTodayStatus = query({
  args: { organizacion_id: v.optional(v.id("organizaciones")) },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return null;
    const targetOrg = scope.isSuperAdmin ? args.organizacion_id : scope.organizacionId;
    const date_utc = todayUtc();
    const budget = await ctx.db
      .query("kb_budget")
      .withIndex("by_organizacion_date", q =>
        q.eq("organizacion_id", targetOrg ?? undefined).eq("date_utc", date_utc)
      )
      .first();
    return budget;
  },
});
