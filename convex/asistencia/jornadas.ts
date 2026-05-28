// Asistencia — Queries de jornadas y log de intentos (admin views).
// Módulo: ASI

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireOrgAccess, requireAdminWrite } from "../lib/auth";
import { requireModulo } from "../lib/modules";
import { getPanamaFecha } from "../lib/geo";

// Lista jornadas filtradas por fecha + opcional empleado/proyecto.
export const list = query({
  args: {
    fecha_desde: v.optional(v.string()), // YYYY-MM-DD
    fecha_hasta: v.optional(v.string()),
    empleado_id: v.optional(v.id("empleados")),
    proyecto_id: v.optional(v.id("proyectos")),
    estado: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];

    let rows: any[];
    if (args.empleado_id) {
      rows = await ctx.db
        .query("jornadas_asistencia")
        .withIndex("by_empleado_fecha", (q) => q.eq("empleado_id", args.empleado_id!))
        .collect();
    } else if (args.proyecto_id) {
      rows = await ctx.db
        .query("jornadas_asistencia")
        .withIndex("by_proyecto_fecha", (q) => q.eq("proyecto_id", args.proyecto_id))
        .collect();
    } else if (scope.isSuperAdmin) {
      rows = await ctx.db.query("jornadas_asistencia").collect();
    } else if (scope.organizacionId) {
      rows = await ctx.db
        .query("jornadas_asistencia")
        .withIndex("by_organizacion_fecha", (q) =>
          q.eq("organizacion_id", scope.organizacionId!),
        )
        .collect();
    } else {
      rows = [];
    }

    // Filter by org for safety
    if (!scope.isSuperAdmin && scope.organizacionId) {
      rows = rows.filter((r) => r.organizacion_id === scope.organizacionId);
    }
    if (args.fecha_desde) rows = rows.filter((r) => r.fecha >= args.fecha_desde!);
    if (args.fecha_hasta) rows = rows.filter((r) => r.fecha <= args.fecha_hasta!);
    if (args.estado) rows = rows.filter((r) => r.estado === args.estado);

    // Sort desc por fecha
    rows.sort((a, b) => b.fecha.localeCompare(a.fecha));
    return rows;
  },
});

// Jornada de hoy de un empleado (uso en kiosko pa' UI auto-detect tipo de marca).
export const getHoyByEmpleado = query({
  args: { empleado_id: v.id("empleados") },
  handler: async (ctx, args) => {
    const today = getPanamaFecha();
    const rows = await ctx.db
      .query("jornadas_asistencia")
      .withIndex("by_empleado_fecha", (q) =>
        q.eq("empleado_id", args.empleado_id).eq("fecha", today),
      )
      .collect();
    return rows[0] ?? null;
  },
});

// Log de intentos (admin auditoría) — paginado simple.
export const listIntentos = query({
  args: {
    desde_timestamp: v.optional(v.number()),
    hasta_timestamp: v.optional(v.number()),
    resultado: v.optional(v.string()),
    kiosko_id: v.optional(v.id("kioscos")),
    empleado_id: v.optional(v.id("empleados")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    const limit = Math.min(args.limit ?? 100, 500);

    let rows: any[];
    if (args.kiosko_id) {
      rows = await ctx.db
        .query("marcacion_intentos")
        .withIndex("by_kiosko_timestamp", (q) => q.eq("kiosko_id", args.kiosko_id!))
        .order("desc")
        .take(limit);
    } else if (args.empleado_id) {
      rows = await ctx.db
        .query("marcacion_intentos")
        .withIndex("by_empleado_timestamp", (q) => q.eq("empleado_id", args.empleado_id))
        .order("desc")
        .take(limit);
    } else if (scope.isSuperAdmin) {
      rows = await ctx.db
        .query("marcacion_intentos")
        .order("desc")
        .take(limit);
    } else if (scope.organizacionId) {
      rows = await ctx.db
        .query("marcacion_intentos")
        .withIndex("by_org_timestamp", (q) => q.eq("organizacion_id", scope.organizacionId!))
        .order("desc")
        .take(limit);
    } else {
      rows = [];
    }

    if (!scope.isSuperAdmin && scope.organizacionId) {
      rows = rows.filter((r) => r.organizacion_id === scope.organizacionId);
    }
    if (args.resultado) rows = rows.filter((r) => r.resultado === args.resultado);
    if (args.desde_timestamp) rows = rows.filter((r) => r.timestamp >= args.desde_timestamp!);
    if (args.hasta_timestamp) rows = rows.filter((r) => r.timestamp <= args.hasta_timestamp!);

    return rows;
  },
});

// Stats resumen — total marcaciones, intentos fallidos, ausencias, etc. (Fase 1 básico)
export const getStats = query({
  args: {
    fecha_desde: v.optional(v.string()),
    fecha_hasta: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return null;

    const desde = args.fecha_desde ?? getPanamaFecha();
    const hasta = args.fecha_hasta ?? desde;

    let jornadas: any[];
    if (scope.isSuperAdmin) {
      jornadas = await ctx.db.query("jornadas_asistencia").collect();
    } else if (scope.organizacionId) {
      jornadas = await ctx.db
        .query("jornadas_asistencia")
        .withIndex("by_organizacion_fecha", (q) =>
          q.eq("organizacion_id", scope.organizacionId!),
        )
        .collect();
    } else {
      jornadas = [];
    }
    jornadas = jornadas.filter((j) => j.fecha >= desde && j.fecha <= hasta);

    const total_jornadas = jornadas.length;
    const completas = jornadas.filter((j) => j.estado === "completa").length;
    const en_curso = jornadas.filter((j) => j.estado === "en_curso").length;
    const ausentes = jornadas.filter((j) => j.estado === "ausente").length;

    return {
      total_jornadas,
      completas,
      en_curso,
      ausentes,
    };
  },
});

// ─── Edición admin de marcaciones (corrección manual) ──────────────
//
// Admin puede editar timestamps de una jornada (corregir errores) o borrarla.
// Cada cambio loguea metodo="manual_admin" + corrige el estado derivado.

const TIPOS = ["entrada", "salida_almuerzo", "regreso_almuerzo", "salida"] as const;

// Recalcula estado según qué marcas existen.
function deriveEstado(j: any): string {
  if (j.salida_timestamp) return "completa";
  if (j.entrada_timestamp) return "en_curso";
  return "incompleta";
}

/**
 * Editar timestamps de una jornada. Recibe objeto con los 4 tipos opcionales
 * (ms epoch o null para borrar esa marca). Marca metodo="manual_admin".
 */
export const editarJornada = mutation({
  args: {
    jornada_id: v.id("jornadas_asistencia"),
    entrada_timestamp: v.optional(v.union(v.number(), v.null())),
    salida_almuerzo_timestamp: v.optional(v.union(v.number(), v.null())),
    regreso_almuerzo_timestamp: v.optional(v.union(v.number(), v.null())),
    salida_timestamp: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const jornada = await ctx.db.get(args.jornada_id);
    if (!jornada) throw new Error("Jornada no encontrada");
    await requireOrgAccess(ctx, jornada.organizacion_id);

    const scope = await getAuthScope(ctx);
    const patch: any = {};
    for (const tipo of TIPOS) {
      const key = `${tipo}_timestamp`;
      const val = (args as any)[key];
      if (val === undefined) continue; // no tocar
      if (val === null) {
        // Borrar esta marca + sus metadatos asociados
        patch[key] = undefined;
        patch[`${tipo}_metodo`] = undefined;
        patch[`${tipo}_score`] = undefined;
        patch[`${tipo}_kiosko_id`] = undefined;
        patch[`${tipo}_gps`] = undefined;
        patch[`${tipo}_foto_storage_id`] = undefined;
      } else {
        patch[key] = val;
        patch[`${tipo}_metodo`] = "manual_admin";
      }
    }

    const merged = { ...jornada, ...patch };
    patch.estado = deriveEstado(merged);
    // Resetear minutos calculados — el cron los recomputará
    patch.minutos_trabajados = undefined;
    patch.minutos_tarde = undefined;
    patch.minutos_ausente = undefined;

    await ctx.db.patch(args.jornada_id, patch);

    // Log auditoría
    await ctx.db.insert("marcacion_intentos", {
      empleado_id: jornada.empleado_id,
      kiosko_id: jornada.entrada_kiosko_id ?? jornada.salida_kiosko_id,
      timestamp: Date.now(),
      resultado: "edicion_admin",
      metodo: "manual_admin",
      detalle: `Editado por ${scope.perfil?.nombre_completo ?? scope.perfil?.email ?? "admin"}`,
      organizacion_id: jornada.organizacion_id,
    } as any);

    return { ok: true, estado: patch.estado };
  },
});

/** Borrar una jornada completa (corrección de duplicado / error). */
export const eliminarJornada = mutation({
  args: { jornada_id: v.id("jornadas_asistencia") },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const jornada = await ctx.db.get(args.jornada_id);
    if (!jornada) throw new Error("Jornada no encontrada");
    await requireOrgAccess(ctx, jornada.organizacion_id);

    const scope = await getAuthScope(ctx);
    // Borrar fotos asociadas (best-effort)
    for (const tipo of TIPOS) {
      const sid = (jornada as any)[`${tipo}_foto_storage_id`];
      if (sid) {
        try { await ctx.storage.delete(sid); } catch { /* ignore */ }
      }
    }

    await ctx.db.insert("marcacion_intentos", {
      empleado_id: jornada.empleado_id,
      kiosko_id: jornada.entrada_kiosko_id ?? jornada.salida_kiosko_id,
      timestamp: Date.now(),
      resultado: "eliminacion_admin",
      metodo: "manual_admin",
      detalle: `Jornada ${jornada.fecha} eliminada por ${scope.perfil?.nombre_completo ?? scope.perfil?.email ?? "admin"}`,
      organizacion_id: jornada.organizacion_id,
    } as any);

    await ctx.db.delete(args.jornada_id);
    return { ok: true };
  },
});
