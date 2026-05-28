import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireAdminWrite } from "./lib/auth";

// ─── Queries ──────────────────────────────────────────────

export const list = query({
  args: {
    limit: v.optional(v.number()),
    entity_type: v.optional(v.string()),
    source: v.optional(v.string()),
    organizacion_id: v.optional(v.id("organizaciones")),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];

    let q;
    if (args.source) {
      q = ctx.db
        .query("kb_audit_log")
        .withIndex("by_source", i => i.eq("source", args.source!));
    } else if (args.entity_type) {
      q = ctx.db.query("kb_audit_log").filter(f => f.eq(f.field("entity_type"), args.entity_type!));
    } else if (args.organizacion_id) {
      q = ctx.db
        .query("kb_audit_log")
        .withIndex("by_organizacion", i => i.eq("organizacion_id", args.organizacion_id));
    } else {
      q = ctx.db.query("kb_audit_log");
    }
    const all = await q.collect();
    // Scope filter
    const filtered = scope.isSuperAdmin
      ? all
      : all.filter(r => !r.organizacion_id || r.organizacion_id === scope.organizacionId);
    filtered.sort((a, b) => b.timestamp - a.timestamp);
    return filtered.slice(0, args.limit ?? 100);
  },
});

export const getById = query({
  args: { id: v.id("kb_audit_log") },
  handler: async (ctx, { id }) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return null;
    const r = await ctx.db.get(id);
    if (!r) return null;
    if (!scope.isSuperAdmin && r.organizacion_id && r.organizacion_id !== scope.organizacionId) {
      return null;
    }
    return r;
  },
});

// ─── Mutations ────────────────────────────────────────────

// Internal: usada por otros modulos para registrar cambios.
export const record = internalMutation({
  args: {
    event: v.string(),
    entity_type: v.string(),
    entity_id: v.string(),
    before_state: v.optional(v.any()),
    after_state: v.optional(v.any()),
    user_id: v.optional(v.string()),
    source: v.string(),
    cost_usd: v.optional(v.number()),
    confidence: v.optional(v.number()),
    organizacion_id: v.optional(v.id("organizaciones")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("kb_audit_log", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

// Public: revertir una decision IA o cambio manual reversible.
// Solo super_admin o admin de la org dueña pueden rollback.
export const rollback = mutation({
  args: { id: v.id("kb_audit_log") },
  handler: async (ctx, { id }) => {
    const scope = await requireAdminWrite(ctx);
    const audit = await ctx.db.get(id);
    if (!audit) throw new Error("Audit log no existe");
    if (audit.rolled_back_at) throw new Error("Ya fue revertido");
    if (audit.source === "rollback") throw new Error("No se puede revertir un rollback");
    if (!scope.isSuperAdmin && audit.organizacion_id && audit.organizacion_id !== scope.organizacionId) {
      throw new Error("Acceso denegado");
    }

    // Aplicar reverse según event
    const beforeState = audit.before_state as any;
    const afterState = audit.after_state as any;

    if (audit.event === "template_override.create" && afterState?._id) {
      // Borrar el template_override creado
      try {
        await ctx.db.delete(afterState._id as any);
      } catch {
        /* ya no existe */
      }
    } else if (audit.event === "promote_to_global" && beforeState) {
      // Restaurar visibility a private_org
      try {
        await ctx.db.patch(audit.entity_id as any, {
          visibility: beforeState.visibility,
          organizacion_id: beforeState.organizacion_id,
        });
      } catch (err: any) {
        throw new Error(`Rollback falló: ${err.message ?? err}`);
      }
    } else if (audit.event === "model_year.upsert" && beforeState) {
      try {
        await ctx.db.patch(audit.entity_id as any, beforeState);
      } catch (err: any) {
        throw new Error(`Rollback falló: ${err.message ?? err}`);
      }
    } else if (audit.event === "model.upsert" && beforeState) {
      try {
        await ctx.db.patch(audit.entity_id as any, beforeState);
      } catch (err: any) {
        throw new Error(`Rollback falló: ${err.message ?? err}`);
      }
    } else {
      throw new Error(`Evento "${audit.event}" no soporta rollback automático`);
    }

    // Marcar audit como rolled back
    await ctx.db.patch(id, {
      rolled_back_at: Date.now(),
      rolled_back_by: scope.perfil!._id,
    });

    // Registrar evento de rollback
    await ctx.db.insert("kb_audit_log", {
      event: "rollback",
      entity_type: audit.entity_type,
      entity_id: audit.entity_id,
      before_state: audit.after_state,
      after_state: audit.before_state,
      user_id: scope.perfil!.userId,
      source: "rollback",
      timestamp: Date.now(),
      organizacion_id: audit.organizacion_id,
    });

    return { ok: true };
  },
});

// Cost analytics: suma cost_usd agregado por org/mes.
export const costSummary = query({
  args: {
    organizacion_id: v.optional(v.id("organizaciones")),
    days: v.optional(v.number()),               // default 30
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return null;
    const days = args.days ?? 30;
    const cutoff = Date.now() - days * 86400000;

    let entries: any[];
    if (args.organizacion_id) {
      if (!scope.isSuperAdmin && args.organizacion_id !== scope.organizacionId) {
        throw new Error("Acceso denegado");
      }
      entries = await ctx.db
        .query("kb_audit_log")
        .withIndex("by_organizacion", i => i.eq("organizacion_id", args.organizacion_id))
        .collect();
    } else if (scope.isSuperAdmin) {
      entries = await ctx.db.query("kb_audit_log").collect();
    } else {
      entries = await ctx.db
        .query("kb_audit_log")
        .withIndex("by_organizacion", i => i.eq("organizacion_id", scope.organizacionId ?? undefined))
        .collect();
    }

    entries = entries.filter(e => e.timestamp >= cutoff && e.cost_usd && e.cost_usd > 0);

    let total_usd = 0;
    const by_source: Record<string, number> = {};
    const by_day: Record<string, number> = {};
    for (const e of entries) {
      total_usd += e.cost_usd ?? 0;
      by_source[e.source] = (by_source[e.source] ?? 0) + (e.cost_usd ?? 0);
      const day = new Date(e.timestamp).toISOString().slice(0, 10);
      by_day[day] = (by_day[day] ?? 0) + (e.cost_usd ?? 0);
    }
    return {
      total_usd,
      entries_count: entries.length,
      by_source,
      by_day,
      window_days: days,
    };
  },
});
