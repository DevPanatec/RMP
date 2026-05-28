import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminWrite, requireWriteRole } from "./lib/auth";

// ─── Internal: usadas por ingestion.ts (que es "use node") ────────

export const markRunFailed = internalMutation({
  args: { run_id: v.id("ingestion_runs"), error: v.string() },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.run_id);
    if (!run) return;
    await ctx.db.patch(args.run_id, {
      estado: "failed",
      audit_log: [
        ...run.audit_log,
        { timestamp: Date.now(), event: "failed", detail: { error: args.error } },
      ],
    });
  },
});

export const completeRun = internalMutation({
  args: {
    run_id: v.id("ingestion_runs"),
    extracted_structure: v.any(),
    confidence: v.number(),
    cost_usd: v.number(),
    vision_model: v.string(),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.run_id);
    if (!run) return;

    await ctx.db.patch(args.run_id, {
      estado: args.confidence >= 0.85 ? "approved" : "needs_review",
      vision_model: args.vision_model,
      vision_cost_usd: args.cost_usd,
      confidence_score: args.confidence,
      extracted_structure: args.extracted_structure,
      audit_log: [
        ...run.audit_log,
        {
          timestamp: Date.now(),
          event: "claude_complete",
          detail: { confidence: args.confidence, model: args.vision_model },
          cost_usd: args.cost_usd,
        },
      ],
    });

    // Audit log global
    await ctx.db.insert("kb_audit_log", {
      event: "ingestion.complete",
      entity_type: "ingestion_run",
      entity_id: args.run_id as unknown as string,
      after_state: { confidence: args.confidence },
      source: "claude_ai",
      cost_usd: args.cost_usd,
      confidence: args.confidence,
      timestamp: Date.now(),
      organizacion_id: run.organizacion_id,
    });

    // Si confianza alta + tenemos model_year_id → crear template_override directo
    if (args.confidence >= 0.85 && run.model_year_id && args.extracted_structure?.param_overrides) {
      const specs = args.extracted_structure.specs ?? {};
      const params = args.extracted_structure.param_overrides ?? {};

      // Resolver equipment_class del model_year
      const my = await ctx.db.get(run.model_year_id);
      if (my) {
        const model = await ctx.db.get(my.model_id);
        if (model) {
          await ctx.db.insert("template_overrides", {
            model_year_id: run.model_year_id,
            equipment_class: model.equipment_class,
            template_name: model.equipment_class,
            param_overrides: params,
            confidence: args.confidence,
            source: "ocr_extracted",
            version_label: `Manual OCR — conf ${(args.confidence * 100).toFixed(0)}%`,
            last_computed: Date.now(),
            visibility: "private_org",
            organizacion_id: run.organizacion_id,
          });
        }
      }

      // Insertar part_catalog items
      if (Array.isArray(args.extracted_structure.parts)) {
        for (const p of args.extracted_structure.parts.slice(0, 30)) {
          if (!p.nombre) continue;
          await ctx.db.insert("part_catalog", {
            model_year_id: run.model_year_id,
            nombre: p.nombre,
            numero_parte_oem: p.numero_parte_oem ?? undefined,
            sistema: p.sistema ?? "otros",
            vida_util_default: p.vida_util_km
              ? { valor: p.vida_util_km, unidad: "km" }
              : p.vida_util_horas
                ? { valor: p.vida_util_horas, unidad: "horas" }
                : p.vida_util_dias
                  ? { valor: p.vida_util_dias, unidad: "dias" }
                  : undefined,
            kb_source_id: undefined,
            validated: false,
          });
        }
      }
    }
  },
});

// ─── Public: curator actions ─────────────────────────────

export const approveRun = mutation({
  args: { run_id: v.id("ingestion_runs") },
  handler: async (ctx, { run_id }) => {
    const scope = await requireAdminWrite(ctx);
    const run = await ctx.db.get(run_id);
    if (!run) throw new Error("Run no existe");
    if (!scope.isSuperAdmin && run.organizacion_id !== scope.organizacionId) {
      throw new Error("Acceso denegado");
    }
    await ctx.db.patch(run_id, {
      estado: "approved",
      human_curator_id: scope.perfil!._id,
      audit_log: [
        ...run.audit_log,
        { timestamp: Date.now(), event: "human_approved", detail: { by: scope.perfil!._id } },
      ],
    });
  },
});

export const rejectRun = mutation({
  args: { run_id: v.id("ingestion_runs"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const scope = await requireAdminWrite(ctx);
    const run = await ctx.db.get(args.run_id);
    if (!run) throw new Error("Run no existe");
    if (!scope.isSuperAdmin && run.organizacion_id !== scope.organizacionId) {
      throw new Error("Acceso denegado");
    }
    await ctx.db.patch(args.run_id, {
      estado: "failed",
      human_curator_id: scope.perfil!._id,
      audit_log: [
        ...run.audit_log,
        { timestamp: Date.now(), event: "human_rejected", detail: { reason: args.reason } },
      ],
    });
  },
});

// Lista runs pendientes de curación
import { query } from "./_generated/server";
import { getAuthScope } from "./lib/auth";

export const listPendingReview = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    const runs = await ctx.db
      .query("ingestion_runs")
      .withIndex("by_estado", q => q.eq("estado", "needs_review"))
      .collect();
    const filtered = scope.isSuperAdmin
      ? runs
      : runs.filter(r => r.organizacion_id === scope.organizacionId);
    filtered.sort((a, b) => b._creationTime - a._creationTime);
    return filtered.slice(0, args.limit ?? 50);
  },
});
