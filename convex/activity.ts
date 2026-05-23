import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope, getScopedOrgId } from "./lib/auth";

// ============================================================
// MERGED ACTIVITY FEED — route_events + cleaning + fumigation
// ============================================================
//
// Patrón: el dashboard Monitoreo necesita un feed unificado de actividad
// operacional. Antes solo route_events (REC) alimentaba el feed; ahora
// merge con cleaning_reports + fumigation_reports.
//
// Cada item normalizado a la forma `RealtimeActivity` consume:
//   { id, tipo, descripcion, vehiculo?, conductor?, timestamp, ruta? }
//
// Tipos soportados:
//   - 'ruta_iniciada' | 'parada_completada' | 'ruta_completada' (REC)
//   - 'limpieza_completada' (LIM)
//   - 'fumigacion_completada' (FUM)
//
// Scoped por org (super_admin ve todas). limit aplica DESPUÉS del merge —
// devuelve los N más recientes del merge global.

const DEFAULT_LIMIT = 50;
const PER_SOURCE_LIMIT = 100; // Trae más por source y luego corta tras merge

export const getRecentMerged = query({
  args: {
    limit: v.optional(v.number()),
    organizacion_id: v.optional(v.id("organizaciones")),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? DEFAULT_LIMIT;
    const scope = await getAuthScope(ctx);
    const scopedOrg = await getScopedOrgId(ctx, args.organizacion_id ?? null);
    const isUnscoped = scope.isSuperAdmin || scope.isCrossOrgViewer;

    // -------- 1. route_events (REC) --------
    let routeEvents: any[] = [];
    if (isUnscoped) {
      routeEvents = await ctx.db
        .query("route_events")
        .withIndex("by_timestamp")
        .order("desc")
        .take(PER_SOURCE_LIMIT);
    } else if (scopedOrg) {
      const all = await ctx.db
        .query("route_events")
        .withIndex("by_timestamp")
        .order("desc")
        .take(PER_SOURCE_LIMIT * 3);
      routeEvents = all.filter((e) => e.organizacion_id === scopedOrg).slice(0, PER_SOURCE_LIMIT);
    }

    // -------- 2. cleaning_reports (LIM) --------
    let cleaningReports: any[] = [];
    if (isUnscoped) {
      cleaningReports = await ctx.db
        .query("cleaning_reports")
        .withIndex("by_fecha")
        .order("desc")
        .take(PER_SOURCE_LIMIT);
    } else if (scopedOrg) {
      cleaningReports = await ctx.db
        .query("cleaning_reports")
        .withIndex("by_organizacion", (q) => q.eq("organizacion_id", scopedOrg))
        .collect();
      cleaningReports.sort((a, b) =>
        (b.fecha_completacion || "").localeCompare(a.fecha_completacion || ""),
      );
      cleaningReports = cleaningReports.slice(0, PER_SOURCE_LIMIT);
    }

    // -------- 3. fumigation_reports (FUM) --------
    let fumigationReports: any[] = [];
    if (isUnscoped) {
      fumigationReports = await ctx.db
        .query("fumigation_reports")
        .withIndex("by_fecha")
        .order("desc")
        .take(PER_SOURCE_LIMIT);
    } else if (scopedOrg) {
      fumigationReports = await ctx.db
        .query("fumigation_reports")
        .withIndex("by_organizacion", (q) => q.eq("organizacion_id", scopedOrg))
        .collect();
      fumigationReports.sort((a, b) =>
        (b.fecha_completacion || "").localeCompare(a.fecha_completacion || ""),
      );
      fumigationReports = fumigationReports.slice(0, PER_SOURCE_LIMIT);
    }

    // -------- Normalize all sources to unified shape --------
    type Item = {
      id: string;
      tipo: string;
      descripcion: string;
      vehiculo?: string;
      conductor?: string;
      timestamp: string;
      ruta?: string;
      source: "rec" | "lim" | "fum";
    };

    const items: Item[] = [];

    // REC: route_events
    for (const e of routeEvents) {
      // Solo eventos relevantes pa' feed (skip pausada/reanudada/terminada_anticipada)
      const relevantes = new Set([
        "ruta_iniciada",
        "parada_llegada",
        "parada_completada",
        "ruta_completada",
      ]);
      if (!relevantes.has(e.tipo_evento)) continue;

      let descripcion = "";
      switch (e.tipo_evento) {
        case "ruta_iniciada":
          descripcion = `Ruta "${e.ruta_nombre}" iniciada`;
          break;
        case "parada_llegada":
          descripcion = e.parada_nombre
            ? `Llegada a "${e.parada_nombre}"`
            : "Llegada a parada";
          break;
        case "parada_completada":
          descripcion = e.parada_nombre
            ? `Parada "${e.parada_nombre}" completada`
            : "Parada completada";
          break;
        case "ruta_completada":
          descripcion = `Ruta "${e.ruta_nombre}" completada`;
          break;
      }

      items.push({
        id: e._id,
        tipo: e.tipo_evento,
        descripcion,
        vehiculo: e.vehiculo_placa,
        conductor: e.conductor_nombre,
        ruta: e.ruta_nombre,
        timestamp: e.timestamp,
        source: "rec",
      });
    }

    // LIM: cleaning_reports
    for (const r of cleaningReports) {
      const ubicacion = r.area_nombre
        ? `${r.sala_nombre} (${r.area_nombre})`
        : r.sala_nombre;
      items.push({
        id: r._id,
        tipo: "limpieza_completada",
        descripcion: `Limpieza completada en "${ubicacion}"`,
        conductor: r.usuario_completo,
        timestamp: r.fecha_completacion,
        source: "lim",
      });
    }

    // FUM: fumigation_reports
    for (const r of fumigationReports) {
      items.push({
        id: r._id,
        tipo: "fumigacion_completada",
        descripcion: `Fumigación ${r.tipo_fumigacion} en "${r.lugar_nombre}"`,
        conductor: r.usuario_completo,
        timestamp: r.fecha_completacion,
        source: "fum",
      });
    }

    // -------- Sort merged + limit --------
    items.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
    return items.slice(0, limit);
  },
});
