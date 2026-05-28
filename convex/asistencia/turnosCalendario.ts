// Asistencia — Turnos calendario (override por día) + bulk patterns rotativos.
// Módulo: ASI
//
// Modelo:
// - asignacion_horario_historico = base/default (vigencia continua).
// - turnos_calendario = override por día específico.
//
// Resolución: turnos_calendario primero, fallback a asignacion. Si turno calendario
// existe con horario_plantilla_id=null/undefined → empleado OFF ese día (no laboral).

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireOrgAccess, requireAdminWrite } from "../lib/auth";
import { requireModulo } from "../lib/modules";

// ─── Helper público: resolución horario para fecha específica ───────
// Devuelve plantilla aplicable. null = empleado OFF ese día (override explícito).
// undefined = sin asignación (fallback a comportamiento previo: si día laborable de
// asignacion default, marca laboral; si no, libre).
export const getHorarioParaFecha = query({
  args: { empleado_id: v.id("empleados"), fecha: v.string() },
  handler: async (ctx, args) => {
    const override = await ctx.db
      .query("turnos_calendario")
      .withIndex("by_empleado_fecha", (q) =>
        q.eq("empleado_id", args.empleado_id).eq("fecha", args.fecha),
      )
      .first();
    if (override) {
      if (!override.horario_plantilla_id) {
        return { source: "calendario_off", plantilla: null };
      }
      const plantilla = await ctx.db.get(override.horario_plantilla_id);
      return { source: "calendario", plantilla };
    }
    // Fallback: asignacion vigente
    const asignaciones = await ctx.db
      .query("asignacion_horario_historico")
      .withIndex("by_empleado", (q) => q.eq("empleado_id", args.empleado_id))
      .collect();
    const vigente = asignaciones.find(
      (a) =>
        a.vigencia_desde <= args.fecha &&
        (!a.vigencia_hasta || a.vigencia_hasta >= args.fecha),
    );
    if (!vigente) return { source: "none", plantilla: null };
    const plantilla = await ctx.db.get(vigente.horario_plantilla_id);
    return { source: "asignacion", plantilla };
  },
});

// ─── Vista semanal admin ────────────────────────────────────────────
// Devuelve grid: empleados × fechas (7 días) con horario resuelto por celda.
export const getSemana = query({
  args: {
    fecha_lunes: v.string(),                  // ISO YYYY-MM-DD del lunes de la semana
    proyecto_id: v.optional(v.id("proyectos")),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return null;
    const orgId = scope.organizacionId;
    if (!orgId && !scope.isSuperAdmin) return null;

    // Fechas de la semana
    const fechas: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(args.fecha_lunes + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + i);
      fechas.push(d.toISOString().slice(0, 10));
    }

    // Empleados de la org (filtrados por proyecto opcional)
    let empleados;
    if (scope.isSuperAdmin && !orgId) {
      empleados = await ctx.db.query("empleados").collect();
    } else {
      empleados = await ctx.db
        .query("empleados")
        .withIndex("by_organizacion", (q) => q.eq("organizacion_id", orgId!))
        .collect();
    }
    empleados = empleados.filter((e) => e.activo && e.puede_marcar !== false);
    if (args.proyecto_id) {
      empleados = empleados.filter((e) => e.proyecto_id === args.proyecto_id);
    }

    // Por empleado: cargar overrides de la semana + asignacion vigente
    const filas = await Promise.all(
      empleados.map(async (emp) => {
        const overrides = (
          await ctx.db
            .query("turnos_calendario")
            .withIndex("by_empleado_fecha", (q) => q.eq("empleado_id", emp._id))
            .collect()
        ).filter((t) => fechas.includes(t.fecha));

        const overrideMap = new Map<string, any>();
        for (const o of overrides) {
          overrideMap.set(o.fecha, o);
        }

        // Asignacion default
        const asignaciones = await ctx.db
          .query("asignacion_horario_historico")
          .withIndex("by_empleado", (q) => q.eq("empleado_id", emp._id))
          .collect();
        const defaultAsig = asignaciones.find(
          (a) =>
            a.vigencia_desde <= fechas[6] && (!a.vigencia_hasta || a.vigencia_hasta >= fechas[0]),
        );
        const defaultPlantillaId = defaultAsig?.horario_plantilla_id ?? null;

        return {
          empleado: {
            _id: emp._id,
            nombre: emp.nombre,
            apellido: emp.apellido,
            cargo: emp.cargo,
          },
          default_plantilla_id: defaultPlantillaId,
          overrides: Object.fromEntries(
            fechas.map((f) => {
              const o = overrideMap.get(f);
              return [
                f,
                o
                  ? {
                      _id: o._id,
                      horario_plantilla_id: o.horario_plantilla_id ?? null,
                      motivo: o.motivo,
                    }
                  : null,
              ];
            }),
          ),
        };
      }),
    );

    // Plantillas únicas usadas en la semana (pa' frontend mostrar nombres)
    const plantillaIds = new Set<string>();
    for (const fila of filas) {
      if (fila.default_plantilla_id) plantillaIds.add(fila.default_plantilla_id as string);
      for (const o of Object.values(fila.overrides) as any[]) {
        if (o?.horario_plantilla_id) plantillaIds.add(o.horario_plantilla_id as string);
      }
    }
    const plantillas = await Promise.all(
      Array.from(plantillaIds).map((pid) => ctx.db.get(pid as any)),
    );

    return {
      fechas,
      filas,
      plantillas: plantillas
        .filter((p) => p !== null)
        .map((p: any) => ({
          _id: p._id,
          nombre: p.nombre,
          hora_entrada: p.hora_entrada,
          hora_salida: p.hora_salida,
        })),
    };
  },
});

// ─── Set / clear override individual ────────────────────────────────

export const setTurno = mutation({
  args: {
    empleado_id: v.id("empleados"),
    fecha: v.string(),
    horario_plantilla_id: v.optional(v.id("horarios_plantilla")), // null/undefined = OFF
    motivo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const emp = await ctx.db.get(args.empleado_id);
    if (!emp) throw new Error("Empleado no encontrado");
    if (!emp.organizacion_id) throw new Error("Empleado sin organización");
    await requireOrgAccess(ctx, emp.organizacion_id);

    if (args.horario_plantilla_id) {
      const plantilla = await ctx.db.get(args.horario_plantilla_id);
      if (!plantilla) throw new Error("Plantilla no encontrada");
      if (plantilla.organizacion_id !== emp.organizacion_id) {
        throw new Error("Plantilla de otra organización");
      }
    }

    // Upsert: 1 override por (empleado, fecha)
    const existing = await ctx.db
      .query("turnos_calendario")
      .withIndex("by_empleado_fecha", (q) =>
        q.eq("empleado_id", args.empleado_id).eq("fecha", args.fecha),
      )
      .first();

    const scope = await getAuthScope(ctx);
    if (existing) {
      await ctx.db.patch(existing._id, {
        horario_plantilla_id: args.horario_plantilla_id,
        motivo: args.motivo,
      });
      return existing._id;
    }
    return await ctx.db.insert("turnos_calendario", {
      empleado_id: args.empleado_id,
      fecha: args.fecha,
      horario_plantilla_id: args.horario_plantilla_id,
      motivo: args.motivo,
      organizacion_id: emp.organizacion_id,
      created_at: Date.now(),
      created_by: scope.perfil?._id,
    });
  },
});

// Borrar override → vuelve a fallback de asignacion default
export const clearTurno = mutation({
  args: { id: v.id("turnos_calendario") },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const row = await ctx.db.get(args.id);
    if (!row) return null;
    await requireOrgAccess(ctx, row.organizacion_id);
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// ─── Bulk patrón rotativo ──────────────────────────────────────────
//
// Genera N días de turnos siguiendo un ciclo. Ej: ciclo ["M","T","N","off"] de 4 días
// desde 2026-06-01 por 28 días → genera 28 registros (7 ciclos).
// Cada plantilla_id en ciclo puede ser undefined → genera OFF ese día.

export const generarPatron = mutation({
  args: {
    empleado_id: v.id("empleados"),
    fecha_inicio: v.string(),
    dias_total: v.number(),                   // cuántos días a generar
    // v.array no acepta v.optional. Pa' "off" mandar undefined → cliente filtra, server trata vacíos como off.
    ciclo: v.array(v.union(v.id("horarios_plantilla"), v.null())),
    motivo: v.optional(v.string()),           // default "rotación"
    overwrite: v.optional(v.boolean()),       // si true, sobrescribe overrides existentes
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const emp = await ctx.db.get(args.empleado_id);
    if (!emp || !emp.organizacion_id) throw new Error("Empleado inválido");
    await requireOrgAccess(ctx, emp.organizacion_id);
    if (args.ciclo.length === 0) throw new Error("Ciclo vacío");
    if (args.dias_total < 1 || args.dias_total > 366) {
      throw new Error("dias_total fuera de rango [1, 366]");
    }

    // Validar plantillas pertenecen a la org
    const plantillaIds = args.ciclo.filter((p): p is any => !!p);
    for (const pid of plantillaIds) {
      const p: any = await ctx.db.get(pid);
      if (!p) throw new Error("Plantilla no encontrada");
      if (p.organizacion_id !== emp.organizacion_id) {
        throw new Error("Plantilla de otra organización");
      }
    }

    const scope = await getAuthScope(ctx);
    const batchId = `pat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const motivo = args.motivo ?? "rotación";
    let created = 0;
    let skipped = 0;

    const base = new Date(args.fecha_inicio + "T00:00:00Z");
    for (let i = 0; i < args.dias_total; i++) {
      const d = new Date(base);
      d.setUTCDate(d.getUTCDate() + i);
      const fecha = d.toISOString().slice(0, 10);
      const plantillaId = args.ciclo[i % args.ciclo.length] ?? undefined;

      const existing = await ctx.db
        .query("turnos_calendario")
        .withIndex("by_empleado_fecha", (q) =>
          q.eq("empleado_id", args.empleado_id).eq("fecha", fecha),
        )
        .first();

      if (existing && !args.overwrite) {
        skipped++;
        continue;
      }
      if (existing && args.overwrite) {
        await ctx.db.patch(existing._id, {
          horario_plantilla_id: plantillaId,
          motivo,
          pattern_batch_id: batchId,
        });
        created++;
        continue;
      }
      await ctx.db.insert("turnos_calendario", {
        empleado_id: args.empleado_id,
        fecha,
        horario_plantilla_id: plantillaId,
        motivo,
        pattern_batch_id: batchId,
        organizacion_id: emp.organizacion_id,
        created_at: Date.now(),
        created_by: scope.perfil?._id,
      });
      created++;
    }

    return { batch_id: batchId, created, skipped, total_requested: args.dias_total };
  },
});

// Rollback patrón completo via batch_id
export const rollbackPatron = mutation({
  args: { pattern_batch_id: v.string() },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const rows = await ctx.db
      .query("turnos_calendario")
      .withIndex("by_pattern_batch", (q) => q.eq("pattern_batch_id", args.pattern_batch_id))
      .collect();
    if (rows.length === 0) return { deleted: 0 };
    await requireOrgAccess(ctx, rows[0].organizacion_id);
    for (const r of rows) {
      await ctx.db.delete(r._id);
    }
    return { deleted: rows.length };
  },
});
