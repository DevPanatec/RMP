// Asistencia — Reportes y exports.
// Módulo: ASI

import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireOrgAccess } from "../lib/auth";

// Reporte horas por empleado en rango — cliente convierte a CSV (action no necesaria).
// Devuelve filas con empleado_id, nombre, minutos_trabajados, minutos_tarde, minutos_ausente,
// extras_aprobados_min (por tipo), permisos_count.
export const reporteHoras = query({
  args: {
    fecha_desde: v.string(),
    fecha_hasta: v.string(),
    proyecto_id: v.optional(v.id("proyectos")),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];

    // Empleados de la org
    let empleados;
    if (scope.isSuperAdmin) {
      empleados = await ctx.db.query("empleados").collect();
    } else if (scope.organizacionId) {
      empleados = await ctx.db
        .query("empleados")
        .withIndex("by_organizacion", (q) => q.eq("organizacion_id", scope.organizacionId!))
        .collect();
    } else {
      return [];
    }
    if (args.proyecto_id) {
      empleados = empleados.filter((e) => e.proyecto_id === args.proyecto_id);
    }

    const result = [];
    for (const emp of empleados) {
      // Jornadas en rango
      const jornadas = (
        await ctx.db
          .query("jornadas_asistencia")
          .withIndex("by_empleado_fecha", (q) => q.eq("empleado_id", emp._id))
          .collect()
      ).filter((j) => j.fecha >= args.fecha_desde && j.fecha <= args.fecha_hasta);

      const trabajados = jornadas.reduce((s, j) => s + (j.minutos_trabajados ?? 0), 0);
      const tarde = jornadas.reduce((s, j) => s + (j.minutos_tarde ?? 0), 0);
      const ausente = jornadas.reduce((s, j) => s + (j.minutos_ausente ?? 0), 0);
      const dias_completos = jornadas.filter((j) => j.estado === "completa").length;
      const dias_ausente = jornadas.filter((j) => j.estado === "ausente").length;
      const dias_permiso = jornadas.filter((j) => j.estado === "permiso").length;

      // Horas extras aprobadas en rango por tipo
      const extras = (
        await ctx.db
          .query("horas_extras")
          .withIndex("by_empleado", (q) => q.eq("empleado_id", emp._id))
          .collect()
      ).filter(
        (h) => h.estado === "aprobado" && h.fecha >= args.fecha_desde && h.fecha <= args.fecha_hasta,
      );
      const extras_diurna = extras.filter((e) => e.tipo === "diurna").reduce((s, e) => s + e.minutos, 0);
      const extras_nocturna = extras.filter((e) => e.tipo === "nocturna").reduce((s, e) => s + e.minutos, 0);
      const extras_feriado = extras.filter((e) => e.tipo === "feriado").reduce((s, e) => s + e.minutos, 0);
      const extras_domingo = extras.filter((e) => e.tipo === "domingo").reduce((s, e) => s + e.minutos, 0);

      // Permisos aprobados en rango
      const permisos = (
        await ctx.db
          .query("permisos")
          .withIndex("by_empleado", (q) => q.eq("empleado_id", emp._id))
          .collect()
      ).filter(
        (p) =>
          p.estado === "aprobado" &&
          !(p.fecha_hasta < args.fecha_desde || p.fecha_desde > args.fecha_hasta),
      );

      result.push({
        empleado_id: emp._id,
        nombre: `${emp.nombre} ${emp.apellido}`,
        cedula: emp.cedula,
        cargo: emp.cargo ?? "",
        proyecto_id: emp.proyecto_id ?? null,
        organizacion_id: emp.organizacion_id,
        dias_completos,
        dias_ausente,
        dias_permiso,
        minutos_trabajados: trabajados,
        horas_trabajadas: +(trabajados / 60).toFixed(2),
        minutos_tarde: tarde,
        minutos_ausente: ausente,
        extras_diurna_min: extras_diurna,
        extras_nocturna_min: extras_nocturna,
        extras_feriado_min: extras_feriado,
        extras_domingo_min: extras_domingo,
        permisos_count: permisos.length,
      });
    }

    if (!scope.isSuperAdmin && scope.organizacionId) {
      return result.filter((r) => r.organizacion_id === scope.organizacionId);
    }
    return result;
  },
});
