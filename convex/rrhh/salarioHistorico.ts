// RRHH — Queries de salario histórico (auto-poblado por contratos + adendas).

import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireOrgAccess } from "../lib/auth";

export const listByEmpleado = query({
  args: { empleado_id: v.id("empleados") },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    const emp = await ctx.db.get(args.empleado_id);
    if (!emp || !emp.organizacion_id) return [];
    if (!scope.isSuperAdmin && scope.organizacionId !== emp.organizacion_id) return [];
    if (!scope.isSuperAdmin && !scope.isAdmin) return [];
    const rows = await ctx.db
      .query("salario_historico")
      .withIndex("by_empleado", (q) => q.eq("empleado_id", args.empleado_id))
      .collect();
    rows.sort((a, b) => b.vigencia_desde.localeCompare(a.vigencia_desde));
    return rows;
  },
});

// Pa' Fase 6 nómina: salario vigente en una fecha.
export const getVigenteEnFecha = query({
  args: { empleado_id: v.id("empleados"), fecha: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("salario_historico")
      .withIndex("by_empleado", (q) => q.eq("empleado_id", args.empleado_id))
      .collect();
    return (
      all.find(
        (h) =>
          h.vigencia_desde <= args.fecha &&
          (!h.vigencia_hasta || h.vigencia_hasta >= args.fecha),
      ) ?? null
    );
  },
});
