// Asistencia — Horarios plantilla + asignación con vigencia.
// Módulo: ASI

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireOrgAccess, requireAdminWrite } from "../lib/auth";
import { requireModulo } from "../lib/modules";

// ─── Plantillas ─────────────────────────────────────────────────────

export const listPlantillas = query({
  args: {},
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    if (scope.isSuperAdmin) {
      return await ctx.db.query("horarios_plantilla").collect();
    }
    if (!scope.organizacionId) return [];
    return await ctx.db
      .query("horarios_plantilla")
      .withIndex("by_organizacion", (q) => q.eq("organizacion_id", scope.organizacionId!))
      .collect();
  },
});

export const getPlantillaById = query({
  args: { id: v.id("horarios_plantilla") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) return null;
    await requireOrgAccess(ctx, row.organizacion_id);
    return row;
  },
});

// Crea 4 plantillas estándar de un golpe (onboarding empresa nueva).
// Si ya existen plantillas con el mismo nombre, las salta.
export const crearTurnosDefault = mutation({
  args: { organizacion_id: v.optional(v.id("organizaciones")) },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const scope = await getAuthScope(ctx);
    const orgId = args.organizacion_id ?? scope.organizacionId;
    if (!orgId) throw new Error("Sin organización");
    await requireOrgAccess(ctx, orgId);

    const existentes = await ctx.db
      .query("horarios_plantilla")
      .withIndex("by_organizacion", (q) => q.eq("organizacion_id", orgId))
      .collect();
    const nombresExistentes = new Set(existentes.map((p) => p.nombre.toLowerCase()));

    const defaults = [
      {
        nombre: "Mañana 6:00 - 14:00",
        hora_entrada: "06:00",
        hora_salida: "14:00",
        hora_almuerzo_inicio: "10:00",
        hora_almuerzo_fin: "10:30",
        horas_diarias: 8,
        dias_laborables: [1, 2, 3, 4, 5, 6],
      },
      {
        nombre: "Tarde 14:00 - 22:00",
        hora_entrada: "14:00",
        hora_salida: "22:00",
        hora_almuerzo_inicio: "18:00",
        hora_almuerzo_fin: "18:30",
        horas_diarias: 8,
        dias_laborables: [1, 2, 3, 4, 5, 6],
      },
      {
        nombre: "Noche 22:00 - 06:00",
        hora_entrada: "22:00",
        hora_salida: "06:00",
        hora_almuerzo_inicio: "02:00",
        hora_almuerzo_fin: "02:30",
        horas_diarias: 8,
        dias_laborables: [1, 2, 3, 4, 5, 6],
      },
      {
        nombre: "Oficina 8:00 - 17:00",
        hora_entrada: "08:00",
        hora_salida: "17:00",
        hora_almuerzo_inicio: "12:00",
        hora_almuerzo_fin: "13:00",
        horas_diarias: 8,
        dias_laborables: [1, 2, 3, 4, 5],
      },
    ];

    const created: string[] = [];
    for (const d of defaults) {
      if (nombresExistentes.has(d.nombre.toLowerCase())) continue;
      await ctx.db.insert("horarios_plantilla", {
        ...d,
        tolerancia_entrada_min: 10,
        tipo: "fijo",
        activo: true,
        organizacion_id: orgId,
        created_at: Date.now(),
      });
      created.push(d.nombre);
    }
    return { created_count: created.length, created };
  },
});

export const createPlantilla = mutation({
  args: {
    nombre: v.string(),
    dias_laborables: v.array(v.number()),
    hora_entrada: v.string(),
    hora_salida: v.string(),
    hora_almuerzo_inicio: v.optional(v.string()),
    hora_almuerzo_fin: v.optional(v.string()),
    tolerancia_entrada_min: v.optional(v.number()),
    horas_diarias: v.optional(v.number()),
    tipo: v.optional(v.union(v.literal("fijo"), v.literal("rotativo"))),
    organizacion_id: v.optional(v.id("organizaciones")),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const scope = await getAuthScope(ctx);
    const orgId = args.organizacion_id ?? scope.organizacionId;
    if (!orgId) throw new Error("Sin organización para asignar plantilla");
    await requireOrgAccess(ctx, orgId);
    validateHorarioTimes(args);
    return await ctx.db.insert("horarios_plantilla", {
      nombre: args.nombre,
      dias_laborables: args.dias_laborables,
      hora_entrada: args.hora_entrada,
      hora_salida: args.hora_salida,
      hora_almuerzo_inicio: args.hora_almuerzo_inicio,
      hora_almuerzo_fin: args.hora_almuerzo_fin,
      tolerancia_entrada_min: args.tolerancia_entrada_min ?? 10,
      horas_diarias: args.horas_diarias ?? 8,
      tipo: args.tipo ?? "fijo",
      activo: true,
      organizacion_id: orgId,
      created_at: Date.now(),
    });
  },
});

export const updatePlantilla = mutation({
  args: {
    id: v.id("horarios_plantilla"),
    nombre: v.optional(v.string()),
    dias_laborables: v.optional(v.array(v.number())),
    hora_entrada: v.optional(v.string()),
    hora_salida: v.optional(v.string()),
    hora_almuerzo_inicio: v.optional(v.string()),
    hora_almuerzo_fin: v.optional(v.string()),
    tolerancia_entrada_min: v.optional(v.number()),
    horas_diarias: v.optional(v.number()),
    tipo: v.optional(v.union(v.literal("fijo"), v.literal("rotativo"))),
    activo: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Plantilla no encontrada");
    await requireOrgAccess(ctx, row.organizacion_id);
    const { id, ...updates } = args;
    validateHorarioTimes({ ...row, ...updates });
    await ctx.db.patch(id, updates);
    return id;
  },
});

export const deactivatePlantilla = mutation({
  args: { id: v.id("horarios_plantilla") },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Plantilla no encontrada");
    await requireOrgAccess(ctx, row.organizacion_id);
    await ctx.db.patch(args.id, { activo: false });
    return args.id;
  },
});

// ─── Asignaciones de horario (con vigencia) ────────────────────────

export const listAsignaciones = query({
  args: { empleado_id: v.optional(v.id("empleados")) },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    let rows: any[];
    if (args.empleado_id) {
      rows = await ctx.db
        .query("asignacion_horario_historico")
        .withIndex("by_empleado", (q) => q.eq("empleado_id", args.empleado_id!))
        .collect();
    } else if (scope.isSuperAdmin) {
      rows = await ctx.db.query("asignacion_horario_historico").collect();
    } else if (scope.organizacionId) {
      rows = await ctx.db
        .query("asignacion_horario_historico")
        .withIndex("by_organizacion", (q) => q.eq("organizacion_id", scope.organizacionId!))
        .collect();
    } else {
      rows = [];
    }
    if (!scope.isSuperAdmin && scope.organizacionId) {
      rows = rows.filter((r) => r.organizacion_id === scope.organizacionId);
    }
    return rows;
  },
});

// Devuelve la asignación vigente HOY para un empleado, o null si no tiene horario activo.
export const getAsignacionVigente = query({
  args: { empleado_id: v.id("empleados") },
  handler: async (ctx, args) => {
    const emp = await ctx.db.get(args.empleado_id);
    if (!emp) return null;
    if (emp.organizacion_id) await requireOrgAccess(ctx, emp.organizacion_id);
    const today = todayISO();
    const all = await ctx.db
      .query("asignacion_horario_historico")
      .withIndex("by_empleado", (q) => q.eq("empleado_id", args.empleado_id))
      .collect();
    const vigente = all
      .filter((a) => a.vigencia_desde <= today && (!a.vigencia_hasta || a.vigencia_hasta >= today))
      .sort((a, b) => b.vigencia_desde.localeCompare(a.vigencia_desde))[0];
    if (!vigente) return null;
    const plantilla = await ctx.db.get(vigente.horario_plantilla_id);
    return { asignacion: vigente, plantilla };
  },
});

// Cierra la asignación vigente del empleado y abre una nueva.
// Si vigencia_desde > today, no cierra la anterior aún (programación futura).
export const asignarHorario = mutation({
  args: {
    empleado_id: v.id("empleados"),
    horario_plantilla_id: v.id("horarios_plantilla"),
    vigencia_desde: v.string(),
    motivo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const emp = await ctx.db.get(args.empleado_id);
    if (!emp) throw new Error("Empleado no encontrado");
    if (!emp.organizacion_id) throw new Error("Empleado sin organización");
    await requireOrgAccess(ctx, emp.organizacion_id);

    const plantilla = await ctx.db.get(args.horario_plantilla_id);
    if (!plantilla) throw new Error("Plantilla no encontrada");
    if (plantilla.organizacion_id !== emp.organizacion_id) {
      throw new Error("Plantilla pertenece a otra organización");
    }

    // Cerrar asignación vigente (vigencia_hasta = vigencia_desde - 1 día)
    const today = todayISO();
    const vigenciaDesde = args.vigencia_desde;
    if (vigenciaDesde <= today) {
      const all = await ctx.db
        .query("asignacion_horario_historico")
        .withIndex("by_empleado", (q) => q.eq("empleado_id", args.empleado_id))
        .collect();
      const vigente = all.find(
        (a) => a.vigencia_desde <= today && (!a.vigencia_hasta || a.vigencia_hasta >= today),
      );
      if (vigente) {
        const hastaISO = isoMinusOneDay(vigenciaDesde);
        await ctx.db.patch(vigente._id, { vigencia_hasta: hastaISO });
      }
    }

    const scope = await getAuthScope(ctx);
    return await ctx.db.insert("asignacion_horario_historico", {
      empleado_id: args.empleado_id,
      horario_plantilla_id: args.horario_plantilla_id,
      vigencia_desde: vigenciaDesde,
      vigencia_hasta: undefined,
      motivo: args.motivo,
      organizacion_id: emp.organizacion_id,
      created_at: Date.now(),
      created_by: scope.perfil?._id,
    });
  },
});

// ─── Helpers ────────────────────────────────────────────────────────

function todayISO(): string {
  // YYYY-MM-DD en zona Panamá (UTC-5). Fix Fase 2: usar TZ Panamá pa' que vigencia
  // de turnos overnight (7pm-1am) no salte de día prematuramente.
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Panama" });
}

function isoMinusOneDay(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function validateHorarioTimes(h: {
  hora_entrada?: string;
  hora_salida?: string;
  hora_almuerzo_inicio?: string;
  hora_almuerzo_fin?: string;
}) {
  const re = /^\d{2}:\d{2}$/;
  if (h.hora_entrada && !re.test(h.hora_entrada)) throw new Error("hora_entrada inválida (HH:MM)");
  if (h.hora_salida && !re.test(h.hora_salida)) throw new Error("hora_salida inválida (HH:MM)");
  if (h.hora_almuerzo_inicio && !re.test(h.hora_almuerzo_inicio)) {
    throw new Error("hora_almuerzo_inicio inválida (HH:MM)");
  }
  if (h.hora_almuerzo_fin && !re.test(h.hora_almuerzo_fin)) {
    throw new Error("hora_almuerzo_fin inválida (HH:MM)");
  }
}
