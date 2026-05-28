// Asistencia — Attendance zones (sitios físicos) + asignación a empleados.
// Módulo: ASI

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireOrgAccess, requireAdminWrite } from "../lib/auth";
import { requireModulo } from "../lib/modules";

// ─── Zonas ─────────────────────────────────────────────────────────

export const list = query({
  args: { activo: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    let rows: any[];
    if (scope.isSuperAdmin) {
      rows = await ctx.db.query("attendance_zones").collect();
    } else if (scope.organizacionId) {
      rows = await ctx.db
        .query("attendance_zones")
        .withIndex("by_organizacion", (q) => q.eq("organizacion_id", scope.organizacionId!))
        .collect();
    } else {
      rows = [];
    }
    if (args.activo !== undefined) {
      rows = rows.filter((z) => z.activo === args.activo);
    }
    return rows;
  },
});

export const getById = query({
  args: { id: v.id("attendance_zones") },
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
    latitud: v.number(),
    longitud: v.number(),
    radio: v.optional(v.number()),
    proyecto_id: v.optional(v.id("proyectos")),
    direccion: v.optional(v.string()),
    organizacion_id: v.optional(v.id("organizaciones")),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const scope = await getAuthScope(ctx);
    const orgId = args.organizacion_id ?? scope.organizacionId;
    if (!orgId) throw new Error("Sin organización para asignar zona");
    await requireOrgAccess(ctx, orgId);
    validateLatLng(args.latitud, args.longitud);
    if (args.proyecto_id) {
      const p = await ctx.db.get(args.proyecto_id);
      if (!p) throw new Error("Proyecto no encontrado");
      if (p.organizacion_id !== orgId) throw new Error("Proyecto pertenece a otra organización");
    }
    return await ctx.db.insert("attendance_zones", {
      nombre: args.nombre,
      latitud: args.latitud,
      longitud: args.longitud,
      radio: args.radio ?? 100,
      proyecto_id: args.proyecto_id,
      direccion: args.direccion,
      activo: true,
      organizacion_id: orgId,
      created_at: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("attendance_zones"),
    nombre: v.optional(v.string()),
    latitud: v.optional(v.number()),
    longitud: v.optional(v.number()),
    radio: v.optional(v.number()),
    proyecto_id: v.optional(v.id("proyectos")),
    direccion: v.optional(v.string()),
    activo: v.optional(v.boolean()),
    // Fase 2 facial config (admin tuning per zone)
    facial_threshold: v.optional(v.number()),    // [0.5, 0.8] — server clamps
    liveness_mode: v.optional(v.string()),       // "passive_first" | "always_active"
    auto_confirm_segundos: v.optional(v.number()), // [0, 10]
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Zona no encontrada");
    await requireOrgAccess(ctx, row.organizacion_id);
    if (args.latitud !== undefined || args.longitud !== undefined) {
      validateLatLng(args.latitud ?? row.latitud, args.longitud ?? row.longitud);
    }
    if (args.proyecto_id) {
      const p = await ctx.db.get(args.proyecto_id);
      if (!p) throw new Error("Proyecto no encontrado");
      if (p.organizacion_id !== row.organizacion_id) {
        throw new Error("Proyecto pertenece a otra organización");
      }
    }
    // Sanity-clamp facial config
    if (args.facial_threshold !== undefined) {
      if (args.facial_threshold < 0.5 || args.facial_threshold > 0.85) {
        throw new Error("facial_threshold fuera de rango [0.5, 0.85]");
      }
    }
    if (args.liveness_mode !== undefined) {
      if (!["passive_first", "always_active"].includes(args.liveness_mode)) {
        throw new Error("liveness_mode debe ser passive_first | always_active");
      }
    }
    if (args.auto_confirm_segundos !== undefined) {
      if (args.auto_confirm_segundos < 0 || args.auto_confirm_segundos > 10) {
        throw new Error("auto_confirm_segundos fuera de rango [0, 10]");
      }
    }
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("attendance_zones") },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Zona no encontrada");
    await requireOrgAccess(ctx, row.organizacion_id);
    // Verificar que no haya kioscos activos linkeados
    const kioscos = await ctx.db
      .query("kioscos")
      .withIndex("by_zone", (q) => q.eq("attendance_zone_id", args.id))
      .collect();
    const activos = kioscos.filter((k) => k.activo);
    if (activos.length > 0) {
      throw new Error(`No se puede eliminar: ${activos.length} kiosko(s) activo(s) en esta zona`);
    }
    await ctx.db.patch(args.id, { activo: false });
    return args.id;
  },
});

// ─── Asignaciones empleado ↔ zona ──────────────────────────────────

export const listAsignaciones = query({
  args: { empleado_id: v.optional(v.id("empleados")) },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    let rows: any[];
    if (args.empleado_id) {
      rows = await ctx.db
        .query("asignacion_zona_historico")
        .withIndex("by_empleado", (q) => q.eq("empleado_id", args.empleado_id!))
        .collect();
    } else if (scope.isSuperAdmin) {
      rows = await ctx.db.query("asignacion_zona_historico").collect();
    } else if (scope.organizacionId) {
      rows = await ctx.db
        .query("asignacion_zona_historico")
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

export const getZonasVigentes = query({
  args: { empleado_id: v.id("empleados") },
  handler: async (ctx, args) => {
    const emp = await ctx.db.get(args.empleado_id);
    if (!emp) return [];
    if (emp.organizacion_id) await requireOrgAccess(ctx, emp.organizacion_id);
    const today = todayISO();
    const all = await ctx.db
      .query("asignacion_zona_historico")
      .withIndex("by_empleado", (q) => q.eq("empleado_id", args.empleado_id))
      .collect();
    const vigentes = all.filter(
      (a) => a.vigencia_desde <= today && (!a.vigencia_hasta || a.vigencia_hasta >= today),
    );
    const zonas = await Promise.all(
      vigentes.map(async (a) => {
        const z = await ctx.db.get(a.attendance_zone_id);
        return z ? { asignacion: a, zona: z } : null;
      }),
    );
    return zonas.filter((x) => x !== null);
  },
});

export const asignarZona = mutation({
  args: {
    empleado_id: v.id("empleados"),
    attendance_zone_id: v.id("attendance_zones"),
    vigencia_desde: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const emp = await ctx.db.get(args.empleado_id);
    if (!emp) throw new Error("Empleado no encontrado");
    if (!emp.organizacion_id) throw new Error("Empleado sin organización");
    await requireOrgAccess(ctx, emp.organizacion_id);
    const zona = await ctx.db.get(args.attendance_zone_id);
    if (!zona) throw new Error("Zona no encontrada");
    if (zona.organizacion_id !== emp.organizacion_id) {
      throw new Error("Zona pertenece a otra organización");
    }
    const scope = await getAuthScope(ctx);
    return await ctx.db.insert("asignacion_zona_historico", {
      empleado_id: args.empleado_id,
      attendance_zone_id: args.attendance_zone_id,
      vigencia_desde: args.vigencia_desde,
      vigencia_hasta: undefined,
      organizacion_id: emp.organizacion_id,
      created_at: Date.now(),
      created_by: scope.perfil?._id,
    });
  },
});

export const cerrarAsignacionZona = mutation({
  args: {
    id: v.id("asignacion_zona_historico"),
    vigencia_hasta: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Asignación no encontrada");
    await requireOrgAccess(ctx, row.organizacion_id);
    await ctx.db.patch(args.id, { vigencia_hasta: args.vigencia_hasta });
    return args.id;
  },
});

// ─── Helpers ───────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Panama" });
}

function validateLatLng(lat: number, lng: number) {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error("Latitud inválida");
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) throw new Error("Longitud inválida");
}
