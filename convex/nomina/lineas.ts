// Nómina — Queries de líneas + totales por período.
// Módulo: NOM

import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireOrgAccess } from "../lib/auth";

export const listByPeriodo = query({
  args: { periodo_id: v.id("nomina_periodos") },
  handler: async (ctx, args) => {
    const periodo = await ctx.db.get(args.periodo_id);
    if (!periodo) return [];
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    if (!scope.isSuperAdmin && scope.organizacionId !== periodo.organizacion_id) return [];
    if (!scope.isSuperAdmin && !scope.isAdmin) return [];
    const rows = await ctx.db
      .query("nomina_lineas")
      .withIndex("by_periodo", (q) => q.eq("periodo_id", args.periodo_id))
      .collect();
    rows.sort((a, b) => a.empleado_nombre.localeCompare(b.empleado_nombre));
    return rows;
  },
});

export const totalesPorPeriodo = query({
  args: { periodo_id: v.id("nomina_periodos") },
  handler: async (ctx, args) => {
    const periodo = await ctx.db.get(args.periodo_id);
    if (!periodo) return null;
    await requireOrgAccess(ctx, periodo.organizacion_id);
    const lineas = await ctx.db
      .query("nomina_lineas")
      .withIndex("by_periodo", (q) => q.eq("periodo_id", args.periodo_id))
      .collect();
    return {
      empleados: lineas.length,
      total_base: lineas.reduce((s, l) => s + l.salario_base_periodo, 0),
      total_extras: lineas.reduce((s, l) => s + l.monto_extras, 0),
      total_ausencias: lineas.reduce((s, l) => s + l.monto_ausencias, 0),
      bruto_total: lineas.reduce((s, l) => s + l.bruto_total, 0),
    };
  },
});
