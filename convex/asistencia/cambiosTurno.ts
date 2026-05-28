// Asistencia — Cambios de turno (swap entre 2 empleados de la misma org en una fecha).
// Módulo: ASI
//
// Efecto del swap aprobado: el día indicado, A toma el horario de B y viceversa.
// La marcacion.ts NO necesita lógica especial — el cron de cierre de jornada (Fase 4)
// es quien aplica el swap al evaluar minutos_tarde/minutos_ausente.

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireOrgAccess, requireAdminWrite } from "../lib/auth";
import { requireModulo } from "../lib/modules";

export const list = query({
  args: {
    estado: v.optional(v.string()),
    fecha_desde: v.optional(v.string()),
    fecha_hasta: v.optional(v.string()),
    empleado_id: v.optional(v.id("empleados")),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    let rows: any[];
    if (scope.isSuperAdmin) {
      rows = await ctx.db.query("cambios_turno").collect();
    } else if (scope.organizacionId) {
      rows = await ctx.db
        .query("cambios_turno")
        .withIndex("by_organizacion", (q) => q.eq("organizacion_id", scope.organizacionId!))
        .collect();
    } else {
      rows = [];
    }
    if (!scope.isSuperAdmin && scope.organizacionId) {
      rows = rows.filter((r) => r.organizacion_id === scope.organizacionId);
    }
    if (args.empleado_id) {
      rows = rows.filter(
        (r) => r.empleado_a_id === args.empleado_id || r.empleado_b_id === args.empleado_id,
      );
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
    empleado_a_id: v.id("empleados"),
    empleado_b_id: v.id("empleados"),
    fecha: v.string(),
    motivo: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    if (args.empleado_a_id === args.empleado_b_id) {
      throw new Error("No puedes intercambiar el turno de un empleado consigo mismo");
    }
    const empA = await ctx.db.get(args.empleado_a_id);
    const empB = await ctx.db.get(args.empleado_b_id);
    if (!empA || !empB) throw new Error("Empleado no encontrado");
    if (!empA.organizacion_id || !empB.organizacion_id) {
      throw new Error("Empleados sin organización");
    }
    if (empA.organizacion_id !== empB.organizacion_id) {
      throw new Error("Empleados de organizaciones distintas — swap inválido");
    }
    await requireOrgAccess(ctx, empA.organizacion_id);

    // Anti-duplicado: no permitir 2 swaps pendientes/aprobados pa' los mismos empleados+fecha
    const existing = await ctx.db
      .query("cambios_turno")
      .withIndex("by_fecha", (q) => q.eq("fecha", args.fecha))
      .collect();
    const dup = existing.find(
      (s) =>
        s.estado !== "rechazado" &&
        ((s.empleado_a_id === args.empleado_a_id && s.empleado_b_id === args.empleado_b_id) ||
          (s.empleado_a_id === args.empleado_b_id && s.empleado_b_id === args.empleado_a_id)),
    );
    if (dup) {
      throw new Error(`Ya existe un cambio de turno ${dup.estado} para esos empleados en ${args.fecha}`);
    }

    const scope = await getAuthScope(ctx);
    return await ctx.db.insert("cambios_turno", {
      empleado_a_id: args.empleado_a_id,
      empleado_b_id: args.empleado_b_id,
      fecha: args.fecha,
      motivo: args.motivo,
      estado: "pendiente",
      organizacion_id: empA.organizacion_id,
      created_at: Date.now(),
      created_by: scope.perfil?._id,
    });
  },
});

export const aprobar = mutation({
  args: { id: v.id("cambios_turno"), notas: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Cambio de turno no encontrado");
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
  args: { id: v.id("cambios_turno"), notas: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Cambio de turno no encontrado");
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
  args: { id: v.id("cambios_turno") },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Cambio de turno no encontrado");
    await requireOrgAccess(ctx, row.organizacion_id);
    if (row.estado === "aprobado") {
      throw new Error("No se puede eliminar swap aprobado. Rechaza primero.");
    }
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Helper: dado empleado + fecha, devuelve el OTRO empleado si hay swap aprobado, o null.
// Usado en Fase 4 cron de cierre de jornadas pa' aplicar swap al evaluar horarios.
export const getSwapVigente = query({
  args: { empleado_id: v.id("empleados"), fecha: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("cambios_turno")
      .withIndex("by_fecha", (q) => q.eq("fecha", args.fecha))
      .collect();
    const swap = all.find(
      (s) =>
        s.estado === "aprobado" &&
        (s.empleado_a_id === args.empleado_id || s.empleado_b_id === args.empleado_id),
    );
    if (!swap) return null;
    const otroId = swap.empleado_a_id === args.empleado_id ? swap.empleado_b_id : swap.empleado_a_id;
    return { swap_id: swap._id, otro_empleado_id: otroId };
  },
});
