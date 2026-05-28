// RRHH — Adendas al contrato (cambios sin perder original).
//
// Lógica:
// - Crear adenda con cambios {salario_base?, cargo?, fecha_fin?} aplicables desde fecha_efectiva.
// - Si salario_base cambia: cerrar salario_historico vigente (vigencia_hasta = fecha_efectiva - 1)
//   e insertar nuevo registro con vigencia_desde = fecha_efectiva. Sync empleados.salario.
// - Si cargo cambia: sync empleados.cargo.
// - Si fecha_fin cambia: patch contrato.fecha_fin.
// - El contrato_id sigue siendo el mismo — adenda no crea contrato nuevo.

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireOrgAccess, requireAdminWrite } from "../lib/auth";
import { requireModulo } from "../lib/modules";

export const list = query({
  args: {
    contrato_id: v.optional(v.id("contratos")),
    empleado_id: v.optional(v.id("empleados")),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    let rows: any[];
    if (args.contrato_id) {
      rows = await ctx.db
        .query("contrato_adendas")
        .withIndex("by_contrato", (q) => q.eq("contrato_id", args.contrato_id!))
        .collect();
    } else if (args.empleado_id) {
      rows = await ctx.db
        .query("contrato_adendas")
        .withIndex("by_empleado", (q) => q.eq("empleado_id", args.empleado_id!))
        .collect();
    } else if (scope.isSuperAdmin) {
      rows = await ctx.db.query("contrato_adendas").collect();
    } else if (scope.organizacionId) {
      rows = await ctx.db
        .query("contrato_adendas")
        .withIndex("by_organizacion", (q) => q.eq("organizacion_id", scope.organizacionId!))
        .collect();
    } else {
      rows = [];
    }
    if (!scope.isSuperAdmin && scope.organizacionId) {
      rows = rows.filter((r) => r.organizacion_id === scope.organizacionId);
    }
    rows.sort((a, b) => b.fecha_efectiva.localeCompare(a.fecha_efectiva));
    return rows;
  },
});

export const create = mutation({
  args: {
    contrato_id: v.id("contratos"),
    numero: v.string(),
    fecha_efectiva: v.string(),
    motivo: v.string(),
    cambios: v.any(),                          // { salario_base?: number, cargo?: string, fecha_fin?: string }
    archivo_storage_id: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "RRHH");
    const contrato = await ctx.db.get(args.contrato_id);
    if (!contrato) throw new Error("Contrato no encontrado");
    await requireOrgAccess(ctx, contrato.organizacion_id);
    if (contrato.estado !== "vigente") {
      throw new Error(`No se puede agregar adenda a contrato ${contrato.estado}`);
    }
    if (args.fecha_efectiva < contrato.fecha_inicio) {
      throw new Error("fecha_efectiva debe ser >= fecha_inicio del contrato");
    }
    const cambios = args.cambios ?? {};
    if (cambios.salario_base !== undefined) {
      if (!Number.isFinite(cambios.salario_base) || cambios.salario_base <= 0) {
        throw new Error("salario_base inválido");
      }
    }
    if (cambios.fecha_fin !== undefined && cambios.fecha_fin < args.fecha_efectiva) {
      throw new Error("fecha_fin debe ser >= fecha_efectiva");
    }

    const scope = await getAuthScope(ctx);
    const adendaId = await ctx.db.insert("contrato_adendas", {
      contrato_id: args.contrato_id,
      empleado_id: contrato.empleado_id,
      numero: args.numero,
      fecha_efectiva: args.fecha_efectiva,
      motivo: args.motivo,
      cambios,
      archivo_storage_id: args.archivo_storage_id,
      organizacion_id: contrato.organizacion_id,
      created_at: Date.now(),
      created_by: scope.perfil?._id,
    });

    // Aplicar cambios
    const contratoPatch: any = {};
    if (cambios.fecha_fin !== undefined) contratoPatch.fecha_fin = cambios.fecha_fin;
    if (cambios.cargo !== undefined) contratoPatch.cargo = cambios.cargo;
    // El salario en `contratos.salario_base` es el original — no se sobrescribe.
    if (Object.keys(contratoPatch).length > 0) {
      await ctx.db.patch(args.contrato_id, contratoPatch);
    }

    // Si cambia salario: cerrar histórico vigente + insertar nuevo + sync empleado
    if (cambios.salario_base !== undefined) {
      const histVigente = (
        await ctx.db
          .query("salario_historico")
          .withIndex("by_contrato", (q) => q.eq("contrato_id", args.contrato_id))
          .collect()
      ).find((h) => !h.vigencia_hasta);
      if (histVigente) {
        await ctx.db.patch(histVigente._id, {
          vigencia_hasta: isoMinusOneDay(args.fecha_efectiva),
        });
      }
      await ctx.db.insert("salario_historico", {
        empleado_id: contrato.empleado_id,
        contrato_id: args.contrato_id,
        adenda_id: adendaId,
        salario_base: cambios.salario_base,
        vigencia_desde: args.fecha_efectiva,
        vigencia_hasta: undefined,
        organizacion_id: contrato.organizacion_id,
        created_at: Date.now(),
      });
      await ctx.db.patch(contrato.empleado_id, { salario: cambios.salario_base });
    }

    // Sync cargo en empleados (denorm)
    if (cambios.cargo !== undefined) {
      await ctx.db.patch(contrato.empleado_id, { cargo: cambios.cargo });
    }

    return adendaId;
  },
});

export const remove = mutation({
  args: { id: v.id("contrato_adendas") },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "RRHH");
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Adenda no encontrada");
    await requireOrgAccess(ctx, row.organizacion_id);
    // Solo permitir eliminar la última adenda (anti-rebuild histórico)
    const todas = await ctx.db
      .query("contrato_adendas")
      .withIndex("by_contrato", (q) => q.eq("contrato_id", row.contrato_id))
      .collect();
    const ultima = todas.sort((a, b) => b.fecha_efectiva.localeCompare(a.fecha_efectiva))[0];
    if (ultima._id !== row._id) {
      throw new Error("Solo se puede eliminar la última adenda (preserva linealidad histórica)");
    }
    // Revertir salario_historico: borrar fila de esta adenda + reabrir la previa
    const hist = (
      await ctx.db
        .query("salario_historico")
        .withIndex("by_contrato", (q) => q.eq("contrato_id", row.contrato_id))
        .collect()
    ).sort((a, b) => a.vigencia_desde.localeCompare(b.vigencia_desde));
    const histAdenda = hist.find((h) => h.adenda_id === row._id);
    if (histAdenda) {
      await ctx.db.delete(histAdenda._id);
      // Reabrir el previo (último que no fue de esta adenda)
      const previo = hist.filter((h) => h._id !== histAdenda._id).pop();
      if (previo && previo.vigencia_hasta) {
        await ctx.db.patch(previo._id, { vigencia_hasta: undefined });
        // Re-sync empleado.salario al valor previo
        await ctx.db.patch(row.empleado_id, { salario: previo.salario_base });
      }
    }
    if (row.archivo_storage_id) {
      try { await ctx.storage.delete(row.archivo_storage_id); } catch { /* best effort */ }
    }
    await ctx.db.delete(args.id);
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

function isoMinusOneDay(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
