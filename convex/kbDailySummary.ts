import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope } from "./lib/auth";

// Snapshot últimas 24h: actividad crawler + KB additions + alerts + cost.
// Sin tabla persistente — computa on-demand desde tablas existentes.
export const last24h = query({
  args: { organizacion_id: v.optional(v.id("organizaciones")) },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return null;
    const since = Date.now() - 24 * 60 * 60 * 1000;

    // Crawler tasks done last 24h
    const tasks = await ctx.db.query("kb_crawl_tasks").collect();
    const recentTasks = tasks.filter(t =>
      t.completed_at && t.completed_at >= since
    );
    const tasksByProvider: Record<string, number> = {};
    const tasksByEstado: Record<string, number> = {};
    let totalTaskCost = 0;
    for (const t of recentTasks) {
      tasksByProvider[t.provider] = (tasksByProvider[t.provider] ?? 0) + 1;
      tasksByEstado[t.estado] = (tasksByEstado[t.estado] ?? 0) + 1;
      totalTaskCost += t.actual_cost_usd ?? 0;
    }

    // KB sources nuevos
    const newSources = (await ctx.db.query("kb_sources").collect())
      .filter(s => s.fetched_at >= since);

    // Models nuevos
    const newModels = (await ctx.db.query("models").collect())
      .filter(m => m._creationTime >= since);

    // Model years nuevos
    const newYears = (await ctx.db.query("model_years").collect())
      .filter(my => my._creationTime >= since);

    // Template overrides nuevos
    const newOverrides = (await ctx.db.query("template_overrides").collect())
      .filter(o => o._creationTime >= since);

    // Alerts nuevas
    const newAlerts = (await ctx.db.query("kb_health_alerts").collect())
      .filter(a => a.detected_at >= since);
    const alertsByType: Record<string, number> = {};
    for (const a of newAlerts) {
      alertsByType[a.tipo] = (alertsByType[a.tipo] ?? 0) + 1;
    }

    // Audit cost last 24h
    const auditEntries = (await ctx.db.query("kb_audit_log").collect())
      .filter(e => e.timestamp >= since && e.cost_usd && e.cost_usd > 0);
    let totalAuditCost = 0;
    for (const e of auditEntries) totalAuditCost += e.cost_usd ?? 0;

    return {
      window_hours: 24,
      since_timestamp: since,
      crawler: {
        tasks_completed: recentTasks.length,
        by_provider: tasksByProvider,
        by_estado: tasksByEstado,
        total_cost_usd: totalTaskCost,
      },
      kb_additions: {
        sources: newSources.length,
        models: newModels.length,
        model_years: newYears.length,
        template_overrides: newOverrides.length,
      },
      alerts: {
        new_count: newAlerts.length,
        by_type: alertsByType,
      },
      total_ai_cost_usd: totalAuditCost,
    };
  },
});
