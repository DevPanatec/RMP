// Asistencia — Horas extras (admin registra + aprueba). Tipo afecta multiplicador en nómina.
// Módulo: ASI
//
// Multiplicadores Panamá (Código Trabajo):
//   diurna     ×1.25
//   nocturna   ×1.50
//   feriado    ×1.50
//   domingo    ×2.00
// El multiplicador se aplica en convex/nomina/calculo.ts (Fase 6), no acá.

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireOrgAccess, requireAdminWrite } from "../lib/auth";
import { requireModulo } from "../lib/modules";

const TIPOS_VALIDOS = ["diurna", "nocturna", "feriado", "domingo"];

export const list = query({
  args: {
    empleado_id: v.optional(v.id("empleados")),
    estado: v.optional(v.string()),
    fecha_desde: v.optional(v.string()),
    fecha_hasta: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    let rows: any[];
    if (args.empleado_id) {
      rows = await ctx.db
        .query("horas_extras")
        .withIndex("by_empleado", (q) => q.eq("empleado_id", args.empleado_id!))
        .collect();
    } else if (scope.isSuperAdmin) {
      rows = await ctx.db.query("horas_extras").collect();
    } else if (scope.organizacionId) {
      rows = await ctx.db
        .query("horas_extras")
        .withIndex("by_organizacion", (q) => q.eq("organizacion_id", scope.organizacionId!))
        .collect();
    } else {
      rows = [];
    }
    if (!scope.isSuperAdmin && scope.organizacionId) {
      rows = rows.filter((r) => r.organizacion_id === scope.organizacionId);
    }
    if (args.estado) rows = rows.filter((r) => r.estado === args.estado);
    if (args.fecha_desde) rows = rows.filter((r) => r.fecha >= args.fecha_desde!);
    if (args.fecha_hasta) rows = rows.filter((r) => r.fecha <= args.fecha_hasta!);
    rows.sort((a, b) => b.created_at - a.created_at);
    return rows;
  },
});

export const create = mutation({
  args: {
    empleado_id: v.id("empleados"),
    fecha: v.string(),
    minutos: v.number(),
    tipo: v.string(),
    motivo: v.string(),
    jornada_id: v.optional(v.id("jornadas_asistencia")),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    if (!TIPOS_VALIDOS.includes(args.tipo)) {
      throw new Error(`Tipo inválido. Válidos: ${TIPOS_VALIDOS.join(", ")}`);
    }
    if (!Number.isInteger(args.minutos) || args.minutos <= 0) {
      throw new Error("minutos debe ser entero positivo");
    }
    if (args.minutos > 12 * 60) {
      throw new Error("minutos excede 12h (sospechoso)");
    }
    const emp = await ctx.db.get(args.empleado_id);
    if (!emp) throw new Error("Empleado no encontrado");
    if (!emp.organizacion_id) throw new Error("Empleado sin organización");
    await requireOrgAccess(ctx, emp.organizacion_id);
    const scope = await getAuthScope(ctx);
    return await ctx.db.insert("horas_extras", {
      empleado_id: args.empleado_id,
      jornada_id: args.jornada_id,
      fecha: args.fecha,
      minutos: args.minutos,
      tipo: args.tipo,
      motivo: args.motivo,
      estado: "pendiente",
      organizacion_id: emp.organizacion_id,
      created_at: Date.now(),
      created_by: scope.perfil?._id,
    });
  },
});

export const aprobar = mutation({
  args: { id: v.id("horas_extras"), notas: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Hora extra no encontrada");
    await requireOrgAccess(ctx, row.organizacion_id);
    if (row.estado !== "pendiente") {
      throw new Error(`Ya está ${row.estado}`);
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
  args: { id: v.id("horas_extras"), notas: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Hora extra no encontrada");
    await requireOrgAccess(ctx, row.organizacion_id);
    if (row.estado !== "pendiente") {
      throw new Error(`Ya está ${row.estado}`);
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
  args: { id: v.id("horas_extras") },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Hora extra no encontrada");
    await requireOrgAccess(ctx, row.organizacion_id);
    if (row.estado === "aprobado") {
      throw new Error("No se puede eliminar hora extra aprobada. Rechaza primero.");
    }
    await ctx.db.delete(args.id);
    return args.id;
  },
});
