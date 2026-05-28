import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getScopedProjectId, requireProjectAccess, requireWriteRole, getAuthScope } from "./lib/auth";
import { requireModulo } from "./lib/modules";

function assertPurgeAllowed() {
  if (process.env.ALLOW_PURGE !== "1") {
    throw new Error("purge disabled. Set ALLOW_PURGE=1 in Convex env to enable.");
  }
}

export const list = query({
  args: { proyecto_id: v.optional(v.id("proyectos")) },
  handler: async (ctx, args) => {
    const scoped = await getScopedProjectId(ctx, args.proyecto_id ?? null);
    const all = await ctx.db
      .query("route_reports")
      .withIndex("by_fecha", (q) => q)
      .order("desc")
      .collect();
    if (scoped !== null) return all.filter((r) => r.proyecto_id === scoped);
    // scoped === null: super_admin ve todo; demás filtran por su org.
    const scope = await getAuthScope(ctx);
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) return all;
    if (!scope.organizacionId) return [];
    return all.filter((r) => r.organizacion_id === scope.organizacionId);
  },
});

export const getById = query({
  args: { id: v.id("route_reports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.id);
    if (!report) return null;
    const scope = await getAuthScope(ctx);
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) return report;
    if (!scope.organizacionId) return null;
    if (report.organizacion_id !== scope.organizacionId) return null;
    return report;
  },
});

export const add = mutation({
  args: {
    ruta_id: v.optional(v.id("rutas")),
    asignacion_id: v.optional(v.id("asignaciones_rutas")),
    conductor_nombre: v.string(),
    conductor_id: v.optional(v.id("perfiles_usuarios")),
    vehiculo_placa: v.string(),
    vehiculo_id: v.optional(v.id("vehiculos")),
    fecha_inicio: v.string(),
    fecha_completacion: v.string(),
    tiempo_total_segundos: v.number(),
    paradas_completadas: v.array(v.any()),
    reportes_riesgo_ids: v.optional(v.array(v.string())),
    observaciones: v.optional(v.string()),
    tipo_ruta: v.string(),
    ruta_nombre: v.string(),
    ruta_paradas: v.optional(v.array(v.any())),
    terminacion_anticipada: v.optional(v.boolean()),
    motivo_terminacion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const scope = await requireWriteRole(ctx);
    await requireModulo(ctx, "REC");
    // Derivar proyecto_id desde la asignación o ruta + denormalizar foto/ubicación de la ruta
    let proyecto_id;
    let ruta = null;
    let asignacion = null;
    if (args.asignacion_id) {
      asignacion = await ctx.db.get(args.asignacion_id);
      proyecto_id = asignacion?.proyecto_id;
    }
    if (args.ruta_id) {
      ruta = await ctx.db.get(args.ruta_id);
      if (!proyecto_id) proyecto_id = ruta?.proyecto_id;
    }
    if (proyecto_id) await requireProjectAccess(ctx, proyecto_id);

    if (args.asignacion_id) {
      const existing = await ctx.db
        .query("route_reports")
        .withIndex("by_asignacion", (q) => q.eq("asignacion_id", args.asignacion_id))
        .first();
      if (existing) {
        return existing._id;
      }
    }

    // Auto-attach organizacion_id desde la fuente más confiable (ruta/asignación/scope)
    const orgId =
      asignacion?.organizacion_id ??
      ruta?.organizacion_id ??
      scope.organizacionId ??
      undefined;

    const payload: any = {
      ...args,
      proyecto_id,
      ruta_foto_portada_storage_id: ruta?.foto_portada_storage_id,
      ruta_ubicacion_principal: ruta?.ubicacion_principal,
    };
    if (orgId) payload.organizacion_id = orgId;
    return await ctx.db.insert("route_reports", payload);
  },
});

// ──────────────────────────────────────────────────────────────────────────────
// PURGE — borra TODOS los route_reports de TODAS las organizaciones.
// Gated por env ALLOW_PURGE=1. Sin auth (CLI). Defense in depth: env gate.
// Limpia refs en route_progress.route_report_id antes de borrar (evita
// referencias colgantes).
// ──────────────────────────────────────────────────────────────────────────────
export const countAll = internalQuery({
  args: {},
  handler: async (ctx) => {
    assertPurgeAllowed();
    const all = await ctx.db.query("route_reports").collect();
    const byOrg = new Map<string, number>();
    for (const r of all) {
      const k = String(r.organizacion_id ?? "(sin_org)");
      byOrg.set(k, (byOrg.get(k) ?? 0) + 1);
    }
    return {
      total: all.length,
      por_organizacion: Object.fromEntries(byOrg),
    };
  },
});

export const purgeAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    assertPurgeAllowed();

    const reports = await ctx.db.query("route_reports").collect();
    const reportIds = new Set(reports.map((r) => r._id));

    // 1) Null out route_progress.route_report_id refs apuntando a estos.
    const progresses = await ctx.db.query("route_progress").collect();
    let progressesPatched = 0;
    for (const p of progresses) {
      if (p.route_report_id && reportIds.has(p.route_report_id)) {
        await ctx.db.patch(p._id, { route_report_id: undefined });
        progressesPatched++;
      }
    }

    // 2) Delete all route_reports.
    let deleted = 0;
    for (const r of reports) {
      await ctx.db.delete(r._id);
      deleted++;
    }

    return { deleted, progressesPatched };
  },
});
