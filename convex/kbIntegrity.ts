import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireAdminWrite } from "./lib/auth";

// ─── Queries ──────────────────────────────────────────────

export const listUnresolvedAlerts = query({
  args: {
    tipo: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];

    let alerts;
    if (args.tipo) {
      alerts = await ctx.db
        .query("kb_health_alerts")
        .withIndex("by_tipo", q => q.eq("tipo", args.tipo!))
        .collect();
    } else {
      alerts = await ctx.db.query("kb_health_alerts").collect();
    }
    const filtered = alerts.filter(a =>
      !a.resolved_at &&
      (scope.isSuperAdmin || !a.organizacion_id || a.organizacion_id === scope.organizacionId)
    );
    filtered.sort((a, b) => b.detected_at - a.detected_at);
    return filtered.slice(0, args.limit ?? 50);
  },
});

export const latestCoverageSnapshot = query({
  args: { organizacion_id: v.optional(v.id("organizaciones")) },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return null;
    const orgId = scope.isSuperAdmin ? (args.organizacion_id ?? undefined) : scope.organizacionId ?? undefined;

    const snapshots = await ctx.db
      .query("kb_coverage_snapshots")
      .withIndex("by_organizacion", q => q.eq("organizacion_id", orgId))
      .collect();
    if (snapshots.length === 0) return null;
    snapshots.sort((a, b) => b.snapshot_at - a.snapshot_at);
    return snapshots[0];
  },
});

export const coverageHistory = query({
  args: { organizacion_id: v.optional(v.id("organizaciones")), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    const orgId = scope.isSuperAdmin ? (args.organizacion_id ?? undefined) : scope.organizacionId ?? undefined;
    const days = args.days ?? 30;
    const cutoff = Date.now() - days * 86400000;

    const snapshots = await ctx.db
      .query("kb_coverage_snapshots")
      .withIndex("by_organizacion", q => q.eq("organizacion_id", orgId))
      .collect();
    return snapshots.filter(s => s.snapshot_at >= cutoff).sort((a, b) => a.snapshot_at - b.snapshot_at);
  },
});

// ─── Mutations (admin) ────────────────────────────────────────

export const resolveAlert = mutation({
  args: { id: v.id("kb_health_alerts") },
  handler: async (ctx, { id }) => {
    const scope = await requireAdminWrite(ctx);
    const alert = await ctx.db.get(id);
    if (!alert) throw new Error("Alert no existe");
    if (!scope.isSuperAdmin && alert.organizacion_id && alert.organizacion_id !== scope.organizacionId) {
      throw new Error("Acceso denegado");
    }
    await ctx.db.patch(id, {
      resolved_at: Date.now(),
      resolved_by: scope.perfil!._id,
    });
  },
});

// ─── Internal: usadas por crons ───────────────────────────

// Helper: dedup alert. Si ya existe alert no resuelta para mismo entity+tipo, no inserta otra.
async function alertOnce(
  ctx: any,
  tipo: string,
  severity: string,
  mensaje: string,
  entity_type?: string,
  entity_id?: string,
  organizacion_id?: any,
  detail?: any
) {
  const existing = await ctx.db
    .query("kb_health_alerts")
    .withIndex("by_tipo", (q: any) => q.eq("tipo", tipo))
    .collect();
  const dup = existing.find((a: any) =>
    !a.resolved_at &&
    a.entity_id === entity_id &&
    a.entity_type === entity_type
  );
  if (dup) return null;
  return await ctx.db.insert("kb_health_alerts", {
    tipo,
    severity,
    entity_type,
    entity_id,
    mensaje,
    detail,
    detected_at: Date.now(),
    organizacion_id,
  });
}

// Cron: detecta vehiculos con marca/modelo pero sin model_year en KB.
export const detectOrphanVehicles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const vehicles = await ctx.db.query("vehiculos").collect();
    let flagged = 0;
    for (const veh of vehicles) {
      if (!veh.marca || !veh.modelo) continue;
      // Buscar make
      const slug = veh.marca.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const make = await ctx.db
        .query("makes")
        .withIndex("by_slug", q => q.eq("slug", slug))
        .first();
      let needsAlert = false;
      if (!make) {
        needsAlert = true;
      } else {
        const models = await ctx.db
          .query("models")
          .withIndex("by_make", q => q.eq("make_id", make._id))
          .collect();
        const matchModel = models.find(m =>
          m.nombre.toLowerCase().trim() === veh.modelo!.toLowerCase().trim()
        );
        if (!matchModel) {
          needsAlert = true;
        } else if (veh.anio) {
          const my = await ctx.db
            .query("model_years")
            .withIndex("by_model_year", q => q.eq("model_id", matchModel._id).eq("year", veh.anio!))
            .first();
          if (!my) needsAlert = true;
        }
      }
      if (needsAlert) {
        const inserted = await alertOnce(
          ctx,
          "orphan_vehicle",
          "warn",
          `Vehiculo ${veh.placa} (${veh.marca} ${veh.modelo} ${veh.anio ?? ""}) no tiene match en KB`,
          "vehiculo",
          veh._id as unknown as string,
          veh.organizacion_id,
          { marca: veh.marca, modelo: veh.modelo, anio: veh.anio, placa: veh.placa }
        );
        if (inserted) flagged++;
      }
    }
    return { flagged, total_checked: vehicles.length };
  },
});

// Cron: detecta kb_sources con fetched_at > 30 dias sin refresh.
export const detectStaleSources = internalMutation({
  args: { stale_days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const days = args.stale_days ?? 30;
    const cutoff = Date.now() - days * 86400000;
    const sources = await ctx.db.query("kb_sources").collect();
    let flagged = 0;
    for (const s of sources) {
      if (s.fetched_at >= cutoff) continue;
      const inserted = await alertOnce(
        ctx,
        "stale_source",
        "info",
        `Source ${s.source_type} stale (${Math.floor((Date.now() - s.fetched_at) / 86400000)} días)`,
        "kb_source",
        s._id as unknown as string,
        undefined,
        { source_url: s.source_url, fetched_at: s.fetched_at }
      );
      if (inserted) flagged++;
    }
    return { flagged, total_checked: sources.length };
  },
});

// Cron: flag template_overrides con confidence < threshold.
export const flagLowConfidenceTemplates = internalMutation({
  args: { threshold: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const threshold = args.threshold ?? 0.7;
    const overrides = await ctx.db.query("template_overrides").collect();
    let flagged = 0;
    for (const t of overrides) {
      if (t.confidence >= threshold) continue;
      if (t.approved_by) continue; // si curador aprobo manual, no alert
      const inserted = await alertOnce(
        ctx,
        "low_confidence_template",
        "warn",
        `Template override ${t.template_name} (model_year ${t.model_year_id}) confianza ${t.confidence.toFixed(2)} < ${threshold}`,
        "template_override",
        t._id as unknown as string,
        t.organizacion_id,
        { template_name: t.template_name, confidence: t.confidence, source: t.source }
      );
      if (inserted) flagged++;
    }
    return { flagged, total_checked: overrides.length };
  },
});

// Cron: computa stats de cobertura y escribe snapshot.
// Hace un snapshot global (org=null) + uno por cada org activa.
export const computeCoverageStats = internalMutation({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query("organizaciones").collect();
    const allVehicles = await ctx.db.query("vehiculos").collect();
    const allOverrides = await ctx.db.query("template_overrides").collect();

    async function snapshotForOrg(orgId: any) {
      const vehicles = orgId === null
        ? allVehicles
        : allVehicles.filter(v => v.organizacion_id === orgId);
      const total = vehicles.length;
      if (total === 0) return null;

      let level_1 = 0;
      let level_2 = 0;
      let level_3 = 0;
      const missing: Record<string, { count: number; make: string | undefined }> = {};

      for (const veh of vehicles) {
        if (!veh.marca || !veh.modelo) {
          level_3++;
          continue;
        }
        const slug = veh.marca.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const make = await ctx.db.query("makes").withIndex("by_slug", q => q.eq("slug", slug)).first();
        if (!make) { level_3++; continue; }
        const models = await ctx.db.query("models").withIndex("by_make", q => q.eq("make_id", make._id)).collect();
        const matchModel = models.find(m => m.nombre.toLowerCase().trim() === veh.modelo!.toLowerCase().trim());
        if (!matchModel) {
          level_3++;
          const key = `${veh.marca}|${veh.modelo}`;
          missing[key] = { count: (missing[key]?.count ?? 0) + 1, make: veh.marca };
          continue;
        }
        // Tiene match. Buscar override
        const my = veh.anio
          ? await ctx.db.query("model_years")
              .withIndex("by_model_year", q => q.eq("model_id", matchModel._id).eq("year", veh.anio!))
              .first()
          : null;
        if (my) {
          const override = allOverrides.find(o => o.model_year_id === my._id);
          if (override) level_1++;
          else level_2++;
        } else {
          level_2++;
        }
      }

      const top_missing = Object.entries(missing)
        .map(([key, val]) => {
          const [make_name, model_name] = key.split("|");
          return { model_name, make_name, count: val.count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return await ctx.db.insert("kb_coverage_snapshots", {
        snapshot_at: Date.now(),
        organizacion_id: orgId ?? undefined,
        total_vehicles: total,
        level_1_count: level_1,
        level_2_count: level_2,
        level_3_count: level_3,
        coverage_pct: total > 0 ? (level_1 + level_2) / total : 0,
        top_missing_models: top_missing,
      });
    }

    const created: any[] = [];
    const globalId = await snapshotForOrg(null);
    if (globalId) created.push(globalId);
    for (const o of orgs) {
      const id = await snapshotForOrg(o._id);
      if (id) created.push(id);
    }
    return { snapshots_created: created.length };
  },
});
