// Nómina — CRUD de períodos (quincenal/mensual).
// Módulo: NOM (requiere ASI + RRHH activos en la org).

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireOrgAccess, requireAdminWrite } from "../lib/auth";
import { requireModulo, hasModulo } from "../lib/modules";

const TIPOS = ["quincenal", "mensual"];

// NOM requiere ASI+RRHH adicionales — gate compuesto.
async function requireNomina(ctx: any) {
  await requireModulo(ctx, "NOM");
  const scope = await getAuthScope(ctx);
  if (scope.isSuperAdmin) return;
  if (!scope.organizacionId) throw new Error("Sin organización");
  const org = await ctx.db.get(scope.organizacionId);
  const activos = (org as any)?.modulos_activos as string[] | undefined;
  if (!hasModulo(activos, "ASI")) {
    throw new Error("Nómina requiere módulo Asistencia (ASI) activo");
  }
  if (!hasModulo(activos, "RRHH")) {
    throw new Error("Nómina requiere módulo RRHH activo");
  }
}

export const list = query({
  args: { estado: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    let rows: any[];
    if (scope.isSuperAdmin) {
      rows = await ctx.db.query("nomina_periodos").collect();
    } else if (scope.organizacionId) {
      rows = await ctx.db
        .query("nomina_periodos")
        .withIndex("by_organizacion", (q) => q.eq("organizacion_id", scope.organizacionId!))
        .collect();
    } else {
      rows = [];
    }
    if (!scope.isSuperAdmin && scope.organizacionId) {
      rows = rows.filter((r) => r.organizacion_id === scope.organizacionId);
    }
    if (args.estado) rows = rows.filter((r) => r.estado === args.estado);
    rows.sort((a, b) => b.fecha_desde.localeCompare(a.fecha_desde));
    return rows;
  },
});

export const getById = query({
  args: { id: v.id("nomina_periodos") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) return null;
    await requireOrgAccess(ctx, row.organizacion_id);
    return row;
  },
});

export const create = mutation({
  args: {
    nombre: v.string(),
    tipo: v.string(),
    fecha_desde: v.string(),
    fecha_hasta: v.string(),
    dias_laborables_mes: v.optional(v.number()),
    organizacion_id: v.optional(v.id("organizaciones")), // super_admin pasa explícito
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireNomina(ctx);
    if (!TIPOS.includes(args.tipo)) throw new Error(`Tipo inválido. Válidos: ${TIPOS.join(", ")}`);
    if (args.fecha_hasta < args.fecha_desde) throw new Error("fecha_hasta debe ser >= fecha_desde");
    const dlm = args.dias_laborables_mes ?? 22;
    if (dlm < 15 || dlm > 31) throw new Error("dias_laborables_mes fuera de rango razonable");

    const scope = await getAuthScope(ctx);
    const orgId = args.organizacion_id ?? scope.organizacionId;
    if (!orgId) throw new Error("Sin organización (super_admin debe seleccionar org)");
    await requireOrgAccess(ctx, orgId);

    // Anti-overlap: no permitir 2 periodos abiertos/calculados con rango solapado
    const existing = await ctx.db
      .query("nomina_periodos")
      .withIndex("by_organizacion", (q) => q.eq("organizacion_id", orgId))
      .collect();
    const overlap = existing.find(
      (p) =>
        p.estado !== "cerrado" &&
        !(p.fecha_hasta < args.fecha_desde || p.fecha_desde > args.fecha_hasta),
    );
    if (overlap) {
      throw new Error(`Solapa con período ${overlap.nombre} (${overlap.fecha_desde} a ${overlap.fecha_hasta})`);
    }

    return await ctx.db.insert("nomina_periodos", {
      nombre: args.nombre,
      tipo: args.tipo,
      fecha_desde: args.fecha_desde,
      fecha_hasta: args.fecha_hasta,
      estado: "abierto",
      dias_laborables_mes: dlm,
      organizacion_id: orgId,
      created_at: Date.now(),
      created_by: scope.perfil?._id,
    });
  },
});

export const cerrar = mutation({
  args: { id: v.id("nomina_periodos") },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireNomina(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Período no encontrado");
    await requireOrgAccess(ctx, row.organizacion_id);
    if (row.estado !== "calculado") {
      throw new Error(`Solo se cierra un período calculado (actual: ${row.estado})`);
    }
    const scope = await getAuthScope(ctx);
    await ctx.db.patch(args.id, {
      estado: "cerrado",
      cerrado_por: scope.perfil?._id,
      cerrado_en: Date.now(),
    });
    return args.id;
  },
});

export const reabrir = mutation({
  args: { id: v.id("nomina_periodos") },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireNomina(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Período no encontrado");
    await requireOrgAccess(ctx, row.organizacion_id);
    if (row.estado !== "calculado" && row.estado !== "cerrado") {
      throw new Error(`No se puede reabrir período ${row.estado}`);
    }
    await ctx.db.patch(args.id, { estado: "abierto", cerrado_por: undefined, cerrado_en: undefined });
    return args.id;
  },
});

export const remove = mutation({
  args: { id: v.id("nomina_periodos") },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireNomina(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Período no encontrado");
    await requireOrgAccess(ctx, row.organizacion_id);
    if (row.estado === "cerrado") {
      throw new Error("No se puede eliminar período cerrado");
    }
    // Borrar líneas asociadas
    const lineas = await ctx.db
      .query("nomina_lineas")
      .withIndex("by_periodo", (q) => q.eq("periodo_id", args.id))
      .collect();
    for (const l of lineas) {
      await ctx.db.delete(l._id);
    }
    await ctx.db.delete(args.id);
    return args.id;
  },
});
