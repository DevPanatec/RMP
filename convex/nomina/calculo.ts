// Nómina — Cálculo bruto del período (multiplicadores Panamá).
//
// Fórmula:
//   salario_dia = salario_mensual_vigente / dias_laborables_mes (default 22)
//   salario_hora = salario_dia / horas_diarias_plantilla (default 8)
//   monto_extras = Σ (minutos / 60 × salario_hora × multiplicador) por tipo:
//     diurna  × 1.25  | nocturna × 1.50  | feriado × 1.50  | domingo × 2.00
//   monto_ausencias = (minutos_ausente / 60) × salario_hora
//   bruto_total = salario_base_periodo + monto_extras - monto_ausencias
//
// Idempotente: re-correr borra líneas previas e inserta nuevas.
// Chunks de 50 empleados para evitar timeout mutation.

import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { getAuthScope, requireOrgAccess, requireAdminWrite } from "../lib/auth";
import { requireModulo, hasModulo } from "../lib/modules";

const MULT = {
  diurna: 1.25,
  nocturna: 1.5,
  feriado: 1.5,
  domingo: 2.0,
} as const;

const CHUNK = 50;

async function requireNomina(ctx: any) {
  await requireModulo(ctx, "NOM");
  const scope = await getAuthScope(ctx);
  if (scope.isSuperAdmin) return;
  if (!scope.organizacionId) throw new Error("Sin organización");
  const org = await ctx.db.get(scope.organizacionId);
  const activos = (org as any)?.modulos_activos as string[] | undefined;
  if (!hasModulo(activos, "ASI")) throw new Error("Nómina requiere módulo ASI activo");
  if (!hasModulo(activos, "RRHH")) throw new Error("Nómina requiere módulo RRHH activo");
}

export const calcularPeriodo = mutation({
  args: { periodo_id: v.id("nomina_periodos") },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireNomina(ctx);
    const periodo = await ctx.db.get(args.periodo_id);
    if (!periodo) throw new Error("Período no encontrado");
    await requireOrgAccess(ctx, periodo.organizacion_id);
    if (periodo.estado === "cerrado") {
      throw new Error("No se puede recalcular período cerrado. Reabre primero.");
    }

    // Borrar líneas previas (re-cálculo idempotente)
    const previas = await ctx.db
      .query("nomina_lineas")
      .withIndex("by_periodo", (q) => q.eq("periodo_id", args.periodo_id))
      .collect();
    for (const l of previas) await ctx.db.delete(l._id);

    return await procesarChunk(ctx, periodo, 0);
  },
});

async function procesarChunk(ctx: any, periodo: any, offset: number): Promise<any> {
  const empleados = (
    await ctx.db
      .query("empleados")
      .withIndex("by_organizacion", (q: any) => q.eq("organizacion_id", periodo.organizacion_id))
      .collect()
  ).filter((e: any) => e.activo);

  const slice = empleados.slice(offset, offset + CHUNK);
  let creadas = 0;
  let bruto_total = 0;

  for (const emp of slice) {
    const linea = await calcularLineaEmpleado(ctx, periodo, emp);
    if (linea) {
      await ctx.db.insert("nomina_lineas", linea);
      creadas++;
      bruto_total += linea.bruto_total;
    }
  }

  const remaining = empleados.length - (offset + slice.length);
  if (remaining > 0) {
    await ctx.scheduler.runAfter(2000, (internal as any).nomina.calculo._continuarChunk, {
      periodo_id: periodo._id,
      offset: offset + CHUNK,
    });
    return { partial: true, offset, creadas, bruto_total, remaining };
  }

  // Marcar período como calculado
  await ctx.db.patch(periodo._id, {
    estado: "calculado",
    calculado_en: Date.now(),
  });
  return { partial: false, offset, creadas, bruto_total, remaining: 0 };
}

export const _continuarChunk = mutation({
  args: { periodo_id: v.id("nomina_periodos"), offset: v.number() },
  handler: async (ctx, args) => {
    const periodo = await ctx.db.get(args.periodo_id);
    if (!periodo) return { error: "periodo no existe" };
    return await procesarChunk(ctx, periodo, args.offset);
  },
});

async function calcularLineaEmpleado(ctx: any, periodo: any, emp: any): Promise<any | null> {
  const dlm = periodo.dias_laborables_mes ?? 22;

  // 1. Salario vigente al INICIO del período (regla común: usa el del corte)
  const histAll = await ctx.db
    .query("salario_historico")
    .withIndex("by_empleado", (q: any) => q.eq("empleado_id", emp._id))
    .collect();
  const vigente = histAll.find(
    (h: any) =>
      h.vigencia_desde <= periodo.fecha_desde &&
      (!h.vigencia_hasta || h.vigencia_hasta >= periodo.fecha_desde),
  );
  const salarioMensual = vigente?.salario_base ?? emp.salario ?? 0;
  if (salarioMensual <= 0) {
    // Empleado sin salario configurado → skip
    return null;
  }

  // 2. Horario vigente pa' obtener horas_diarias
  const asignaciones = await ctx.db
    .query("asignacion_horario_historico")
    .withIndex("by_empleado", (q: any) => q.eq("empleado_id", emp._id))
    .collect();
  const asigVigente = asignaciones.find(
    (a: any) =>
      a.vigencia_desde <= periodo.fecha_desde &&
      (!a.vigencia_hasta || a.vigencia_hasta >= periodo.fecha_desde),
  );
  let horasDia = 8;
  if (asigVigente) {
    const plantilla = await ctx.db.get(asigVigente.horario_plantilla_id);
    if (plantilla) horasDia = plantilla.horas_diarias ?? 8;
  }
  const salarioDia = salarioMensual / dlm;
  const salarioHora = salarioDia / horasDia;

  // 3. Días del período (calendario)
  const diasPeriodo = diasEntreISO(periodo.fecha_desde, periodo.fecha_hasta);

  // 4. Salario base proporcional:
  //   Quincenal → mensual / 2 (práctica Panamá)
  //   Mensual   → mensual completo
  //   Cualquier otro rango → salario_dia × dias_periodo (fallback)
  let salarioBasePeriodo = 0;
  if (periodo.tipo === "quincenal") {
    salarioBasePeriodo = salarioMensual / 2;
  } else if (periodo.tipo === "mensual") {
    salarioBasePeriodo = salarioMensual;
  } else {
    salarioBasePeriodo = salarioDia * diasPeriodo;
  }

  // 5. Jornadas del período → minutos_trabajados, minutos_ausente, dias_completos, dias_permiso
  const jornadas = (
    await ctx.db
      .query("jornadas_asistencia")
      .withIndex("by_empleado_fecha", (q: any) => q.eq("empleado_id", emp._id))
      .collect()
  ).filter((j: any) => j.fecha >= periodo.fecha_desde && j.fecha <= periodo.fecha_hasta);

  const minutos_trabajados = jornadas.reduce((s: number, j: any) => s + (j.minutos_trabajados ?? 0), 0);
  const minutos_ausente = jornadas.reduce((s: number, j: any) => s + (j.minutos_ausente ?? 0), 0);
  const dias_completos = jornadas.filter((j: any) => j.estado === "completa").length;
  const dias_permiso = jornadas.filter((j: any) => j.estado === "permiso").length;

  // 6. Ausencias = minutos_ausente × salario_minuto
  const monto_ausencias = (minutos_ausente / 60) * salarioHora;

  // 7. Horas extras aprobadas en el período
  const extras = (
    await ctx.db
      .query("horas_extras")
      .withIndex("by_empleado", (q: any) => q.eq("empleado_id", emp._id))
      .collect()
  ).filter(
    (h: any) =>
      h.estado === "aprobado" && h.fecha >= periodo.fecha_desde && h.fecha <= periodo.fecha_hasta,
  );

  const sumPorTipo = (tipo: string) =>
    extras.filter((e: any) => e.tipo === tipo).reduce((s: number, e: any) => s + e.minutos, 0);
  const minutos_extra_diurna = sumPorTipo("diurna");
  const minutos_extra_nocturna = sumPorTipo("nocturna");
  const minutos_extra_feriado = sumPorTipo("feriado");
  const minutos_extra_domingo = sumPorTipo("domingo");

  const monto_extras =
    (minutos_extra_diurna / 60) * salarioHora * MULT.diurna +
    (minutos_extra_nocturna / 60) * salarioHora * MULT.nocturna +
    (minutos_extra_feriado / 60) * salarioHora * MULT.feriado +
    (minutos_extra_domingo / 60) * salarioHora * MULT.domingo;

  const bruto_total = round2(salarioBasePeriodo + monto_extras - monto_ausencias);

  return {
    periodo_id: periodo._id,
    empleado_id: emp._id,
    empleado_nombre: `${emp.nombre} ${emp.apellido}`,
    empleado_cedula: emp.cedula,
    cargo: emp.cargo,
    salario_mensual: round2(salarioMensual),
    salario_dia: round2(salarioDia),
    salario_base_periodo: round2(salarioBasePeriodo),
    minutos_trabajados,
    dias_completos,
    minutos_ausente,
    monto_ausencias: round2(monto_ausencias),
    minutos_extra_diurna,
    minutos_extra_nocturna,
    minutos_extra_feriado,
    minutos_extra_domingo,
    monto_extras: round2(monto_extras),
    dias_permiso,
    bruto_total,
    detalle: {
      multiplicadores: MULT,
      dias_laborables_mes: dlm,
      horas_diarias: horasDia,
      salario_hora: round4(salarioHora),
      dias_periodo: diasPeriodo,
    },
    organizacion_id: periodo.organizacion_id,
    calculado_en: Date.now(),
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function diasEntreISO(desde: string, hasta: string): number {
  const a = new Date(desde + "T00:00:00Z").getTime();
  const b = new Date(hasta + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400000) + 1;
}
