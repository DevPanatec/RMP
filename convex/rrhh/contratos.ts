// RRHH — Contratos laborales (módulo RRHH, independiente de ASI).
//
// Reglas:
// - Solo 1 contrato "vigente" por empleado a la vez. Crear nuevo → cierra el anterior (estado="vencido").
// - Insertar contrato vigente sincroniza denorm en empleados.salario y empleados.cargo.
// - Inserta también una fila en salario_historico (vigencia_desde = fecha_inicio del contrato).
// - Eliminar contrato vigente → borrado lógico vía rescindir (no hard delete).

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireOrgAccess, requireAdminWrite } from "../lib/auth";
import { requireModulo } from "../lib/modules";

const TIPOS = ["indefinido", "definido", "obra"];

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
        .query("contratos")
        .withIndex("by_empleado", (q) => q.eq("empleado_id", args.empleado_id!))
        .collect();
    } else if (scope.isSuperAdmin) {
      rows = await ctx.db.query("contratos").collect();
    } else if (scope.organizacionId) {
      rows = await ctx.db
        .query("contratos")
        .withIndex("by_organizacion", (q) => q.eq("organizacion_id", scope.organizacionId!))
        .collect();
    } else {
      rows = [];
    }
    if (!scope.isSuperAdmin && scope.organizacionId) {
      rows = rows.filter((r) => r.organizacion_id === scope.organizacionId);
    }
    if (args.estado) rows = rows.filter((r) => r.estado === args.estado);
    rows.sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));
    return rows;
  },
});

export const getById = query({
  args: { id: v.id("contratos") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) return null;
    await requireOrgAccess(ctx, row.organizacion_id);
    return row;
  },
});

export const getVigente = query({
  args: { empleado_id: v.id("empleados") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("contratos")
      .withIndex("by_empleado_estado", (q) =>
        q.eq("empleado_id", args.empleado_id).eq("estado", "vigente"),
      )
      .collect();
    return rows[0] ?? null;
  },
});

export const create = mutation({
  args: {
    empleado_id: v.id("empleados"),
    numero: v.string(),
    tipo: v.string(),
    fecha_inicio: v.string(),
    fecha_fin: v.optional(v.string()),
    salario_base: v.number(),
    cargo: v.string(),
    proyecto_id: v.optional(v.id("proyectos")),
    archivo_storage_id: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "RRHH");
    if (!TIPOS.includes(args.tipo)) {
      throw new Error(`Tipo inválido. Válidos: ${TIPOS.join(", ")}`);
    }
    if (args.tipo === "definido" && !args.fecha_fin) {
      throw new Error("Contrato definido requiere fecha_fin");
    }
    if (args.fecha_fin && args.fecha_fin < args.fecha_inicio) {
      throw new Error("fecha_fin debe ser >= fecha_inicio");
    }
    if (!Number.isFinite(args.salario_base) || args.salario_base <= 0) {
      throw new Error("salario_base debe ser positivo");
    }
    const emp = await ctx.db.get(args.empleado_id);
    if (!emp) throw new Error("Empleado no encontrado");
    if (!emp.organizacion_id) throw new Error("Empleado sin organización");
    await requireOrgAccess(ctx, emp.organizacion_id);

    // Cerrar contrato vigente previo (si existe)
    const previos = await ctx.db
      .query("contratos")
      .withIndex("by_empleado_estado", (q) =>
        q.eq("empleado_id", args.empleado_id).eq("estado", "vigente"),
      )
      .collect();
    for (const prev of previos) {
      await ctx.db.patch(prev._id, { estado: "vencido" });
      // Cerrar salario_historico vigente del contrato previo
      const histPrevios = await ctx.db
        .query("salario_historico")
        .withIndex("by_contrato", (q) => q.eq("contrato_id", prev._id))
        .collect();
      for (const h of histPrevios) {
        if (!h.vigencia_hasta) {
          await ctx.db.patch(h._id, { vigencia_hasta: isoMinusOneDay(args.fecha_inicio) });
        }
      }
    }

    const scope = await getAuthScope(ctx);
    const contratoId = await ctx.db.insert("contratos", {
      empleado_id: args.empleado_id,
      numero: args.numero,
      tipo: args.tipo,
      fecha_inicio: args.fecha_inicio,
      fecha_fin: args.fecha_fin,
      salario_base: args.salario_base,
      cargo: args.cargo,
      estado: "vigente",
      proyecto_id: args.proyecto_id,
      archivo_storage_id: args.archivo_storage_id,
      organizacion_id: emp.organizacion_id,
      created_at: Date.now(),
      created_by: scope.perfil?._id,
    });

    // Insert salario_historico (sin vigencia_hasta)
    await ctx.db.insert("salario_historico", {
      empleado_id: args.empleado_id,
      contrato_id: contratoId,
      adenda_id: undefined,
      salario_base: args.salario_base,
      vigencia_desde: args.fecha_inicio,
      vigencia_hasta: undefined,
      organizacion_id: emp.organizacion_id,
      created_at: Date.now(),
    });

    // Sync denorm en empleados
    await ctx.db.patch(args.empleado_id, {
      salario: args.salario_base,
      cargo: args.cargo,
      proyecto_id: args.proyecto_id ?? emp.proyecto_id,
    });

    return contratoId;
  },
});

export const update = mutation({
  args: {
    id: v.id("contratos"),
    numero: v.optional(v.string()),
    archivo_storage_id: v.optional(v.id("_storage")),
    // NO permitimos cambiar salario/cargo/fechas acá — eso es vía adenda
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "RRHH");
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Contrato no encontrado");
    await requireOrgAccess(ctx, row.organizacion_id);
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});

export const rescindir = mutation({
  args: {
    id: v.id("contratos"),
    motivo: v.string(),
    fecha_rescision: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "RRHH");
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Contrato no encontrado");
    await requireOrgAccess(ctx, row.organizacion_id);
    if (row.estado !== "vigente") {
      throw new Error(`Contrato no vigente (estado actual: ${row.estado})`);
    }
    await ctx.db.patch(args.id, {
      estado: "rescindido",
      motivo_rescision: args.motivo,
      fecha_rescision: args.fecha_rescision,
    });
    // Cerrar salario_historico vigente
    const hist = await ctx.db
      .query("salario_historico")
      .withIndex("by_contrato", (q) => q.eq("contrato_id", args.id))
      .collect();
    for (const h of hist) {
      if (!h.vigencia_hasta) {
        await ctx.db.patch(h._id, { vigencia_hasta: args.fecha_rescision });
      }
    }
    return args.id;
  },
});

export const generateArchivoUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "RRHH");
    return await ctx.storage.generateUploadUrl();
  },
});

export const getArchivoUrl = query({
  args: { id: v.id("contratos") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row || !row.archivo_storage_id) return null;
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return null;
    if (!scope.isSuperAdmin && scope.organizacionId !== row.organizacion_id) return null;
    return await ctx.storage.getUrl(row.archivo_storage_id);
  },
});

// ─── Helpers ────────────────────────────────────────────────────────

function isoMinusOneDay(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
