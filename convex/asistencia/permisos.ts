// Asistencia — Permisos (vacaciones, médico, maternidad, etc) + workflow aprobación.
// Módulo: ASI

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireOrgAccess, requireAdminWrite } from "../lib/auth";
import { requireModulo } from "../lib/modules";

const TIPOS_VALIDOS = ["personal", "medico", "vacaciones", "maternidad", "duelo", "otro"];

export const list = query({
  args: {
    empleado_id: v.optional(v.id("empleados")),
    estado: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    let rows: any[];
    if (args.empleado_id) {
      rows = await ctx.db
        .query("permisos")
        .withIndex("by_empleado", (q) => q.eq("empleado_id", args.empleado_id!))
        .collect();
    } else if (scope.isSuperAdmin) {
      rows = await ctx.db.query("permisos").collect();
    } else if (scope.organizacionId) {
      rows = await ctx.db
        .query("permisos")
        .withIndex("by_organizacion", (q) => q.eq("organizacion_id", scope.organizacionId!))
        .collect();
    } else {
      rows = [];
    }
    if (!scope.isSuperAdmin && scope.organizacionId) {
      rows = rows.filter((r) => r.organizacion_id === scope.organizacionId);
    }
    if (args.estado) rows = rows.filter((r) => r.estado === args.estado);
    rows.sort((a, b) => b.created_at - a.created_at);
    return rows;
  },
});

export const create = mutation({
  args: {
    empleado_id: v.id("empleados"),
    tipo: v.string(),
    fecha_desde: v.string(),
    fecha_hasta: v.string(),
    motivo: v.string(),
    archivo_storage_id: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    if (!TIPOS_VALIDOS.includes(args.tipo)) {
      throw new Error(`Tipo inválido. Válidos: ${TIPOS_VALIDOS.join(", ")}`);
    }
    if (args.fecha_hasta < args.fecha_desde) {
      throw new Error("fecha_hasta debe ser >= fecha_desde");
    }
    const emp = await ctx.db.get(args.empleado_id);
    if (!emp) throw new Error("Empleado no encontrado");
    if (!emp.organizacion_id) throw new Error("Empleado sin organización");
    await requireOrgAccess(ctx, emp.organizacion_id);
    const scope = await getAuthScope(ctx);
    return await ctx.db.insert("permisos", {
      empleado_id: args.empleado_id,
      tipo: args.tipo,
      fecha_desde: args.fecha_desde,
      fecha_hasta: args.fecha_hasta,
      motivo: args.motivo,
      archivo_storage_id: args.archivo_storage_id,
      estado: "pendiente",
      organizacion_id: emp.organizacion_id,
      created_at: Date.now(),
      created_by: scope.perfil?._id,
    });
  },
});

export const aprobar = mutation({
  args: {
    id: v.id("permisos"),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Permiso no encontrado");
    await requireOrgAccess(ctx, row.organizacion_id);
    if (row.estado !== "pendiente") {
      throw new Error(`Permiso ya está ${row.estado}`);
    }
    const scope = await getAuthScope(ctx);
    await ctx.db.patch(args.id, {
      estado: "aprobado",
      aprobado_por: scope.perfil?._id,
      aprobado_en: Date.now(),
      notas_aprobacion: args.notas,
    });
    return args.id;
  },
});

export const rechazar = mutation({
  args: {
    id: v.id("permisos"),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Permiso no encontrado");
    await requireOrgAccess(ctx, row.organizacion_id);
    if (row.estado !== "pendiente") {
      throw new Error(`Permiso ya está ${row.estado}`);
    }
    const scope = await getAuthScope(ctx);
    await ctx.db.patch(args.id, {
      estado: "rechazado",
      aprobado_por: scope.perfil?._id,
      aprobado_en: Date.now(),
      notas_aprobacion: args.notas,
    });
    return args.id;
  },
});

export const remove = mutation({
  args: { id: v.id("permisos") },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Permiso no encontrado");
    await requireOrgAccess(ctx, row.organizacion_id);
    if (row.estado === "aprobado") {
      throw new Error("No se puede eliminar permiso aprobado. Rechaza primero si querés revertirlo.");
    }
    if (row.archivo_storage_id) {
      try { await ctx.storage.delete(row.archivo_storage_id); } catch { /* best effort */ }
    }
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Helper público — verifica si empleado tiene permiso aprobado vigente en una fecha (uso interno + queries).
export const tienePermisoEnFecha = query({
  args: { empleado_id: v.id("empleados"), fecha: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("permisos")
      .withIndex("by_empleado", (q) => q.eq("empleado_id", args.empleado_id))
      .collect();
    const vigente = all.find(
      (p) =>
        p.estado === "aprobado" &&
        p.fecha_desde <= args.fecha &&
        p.fecha_hasta >= args.fecha,
    );
    return vigente ?? null;
  },
});

export const generateJustificanteUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    return await ctx.storage.generateUploadUrl();
  },
});

export const getJustificanteUrl = query({
  args: { id: v.id("permisos") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row || !row.archivo_storage_id) return null;
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return null;
    if (!scope.isSuperAdmin && scope.organizacionId !== row.organizacion_id) return null;
    return await ctx.storage.getUrl(row.archivo_storage_id);
  },
});
