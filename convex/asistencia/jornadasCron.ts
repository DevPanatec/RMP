// Asistencia — Cron diario cierre de jornadas.
// Módulo: ASI
//
// Lógica:
// 1. Para cada empleado activo + puede_marcar + con asignación de horario vigente HOY:
//    a. Buscar jornada del día. Si no existe → crear si hoy era laboral (o marcar ausente).
//    b. Si existe, calcular minutos_trabajados desde timestamps (entrada→salida_almuerzo + regreso→salida).
//    c. Calcular minutos_tarde (entrada > hora_entrada + tolerancia).
//    d. Calcular minutos_ausente si no marcó entrada (= horas_diarias × 60).
// 2. Permisos aprobados pa' la fecha → estado="permiso" (no ausente).
// 3. Cambios turno aprobados → evaluar contra horario del otro empleado.
//
// Idempotente: re-ejecutar mismo día = mismos resultados.
// Procesamiento por chunks de 50 empleados pa' no exceder timeout mutation.

import { internalMutation, mutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { requireAdminWrite } from "../lib/auth";
import { requireModulo } from "../lib/modules";

const CHUNK = 50;

// Cron principal — cierra jornadas del día previo (ayer). Corre al final del día Panamá.
export const cerrarJornadasDelDia = internalMutation({
  args: { fecha: v.optional(v.string()) }, // opcional: re-ejecutar día específico
  handler: async (ctx, args) => {
    const fecha = args.fecha ?? ayerISO();
    return await procesarFechaChunk(ctx, fecha, 0);
  },
});

// Helper recursivo — procesa CHUNK empleados, se reagenda si quedan más.
async function procesarFechaChunk(ctx: any, fecha: string, offset: number): Promise<any> {
  const todosEmpleados = await ctx.db
    .query("empleados")
    .withIndex("by_activo", (q: any) => q.eq("activo", true))
    .collect();
  const empleados = todosEmpleados.filter(
    (e: any) => e.puede_marcar !== false && !!e.organizacion_id,
  );
  const slice = empleados.slice(offset, offset + CHUNK);

  let processed = 0;
  let creadas = 0;
  let actualizadas = 0;
  let ausentes = 0;

  for (const emp of slice) {
    const result = await procesarEmpleado(ctx, emp, fecha);
    processed++;
    if (result === "creada") creadas++;
    if (result === "actualizada") actualizadas++;
    if (result === "ausente") ausentes++;
  }

  const remaining = empleados.length - (offset + slice.length);
  if (remaining > 0) {
    // Reagendar pa' siguiente chunk en 5 segundos
    // @ts-ignore — deep type instantiation, ok at runtime
    await ctx.scheduler.runAfter(5000, internal.asistencia.jornadasCron.cerrarJornadasDelDia, { fecha });
  }

  return {
    fecha,
    offset,
    chunk_processed: processed,
    chunk_creadas: creadas,
    chunk_actualizadas: actualizadas,
    chunk_ausentes: ausentes,
    remaining,
  };
}

async function procesarEmpleado(ctx: any, emp: any, fecha: string): Promise<string> {
  // 1. Horario del empleado en esa fecha (calendario override → asignacion default)
  const { plantilla: horario, isOff } = await getHorarioEnFecha(ctx, emp._id, fecha);

  // Override calendario explícito = OFF → empleado libre, no laborable, no ausente
  if (isOff) {
    return "off_calendario";
  }

  if (!horario) {
    // Sin horario asignado → ignorar
    return "sin_horario";
  }

  // 2. Verificar si hubo cambio de turno aprobado (usa horario del otro empleado)
  const horarioEfectivo = await aplicarSwap(ctx, emp._id, fecha, horario);

  // 3. Día laborable según plantilla (1=lun, 0=dom)
  const dow = new Date(fecha + "T12:00:00Z").getUTCDay(); // 0=Sun..6=Sat
  const esLaborable = horarioEfectivo.dias_laborables.includes(dow);

  // 4. Buscar jornada existente
  const existing = await ctx.db
    .query("jornadas_asistencia")
    .withIndex("by_empleado_fecha", (q: any) => q.eq("empleado_id", emp._id).eq("fecha", fecha))
    .first();

  // 5. ¿Permiso aprobado vigente?
  const permiso = await getPermisoVigente(ctx, emp._id, fecha);

  // Caso A: no laborable Y sin marcaciones → skip
  if (!esLaborable && !existing) {
    return "sin_horario";
  }

  const calc = calcularJornada(existing, horarioEfectivo);

  // Estado final:
  let estado = "completa";
  if (permiso) {
    estado = "permiso";
  } else if (!existing || !existing.entrada_timestamp) {
    if (esLaborable) {
      estado = "ausente";
      calc.minutos_ausente = horarioEfectivo.horas_diarias * 60;
      calc.minutos_trabajados = 0;
    } else {
      // Día no laborable sin entrada → no es ausente
      return "no_laborable";
    }
  } else if (!existing.salida_timestamp) {
    estado = "incompleta";
  }

  // Upsert
  const patchData = {
    minutos_trabajados: calc.minutos_trabajados,
    minutos_tarde: calc.minutos_tarde,
    minutos_ausente: calc.minutos_ausente,
    estado,
  };

  if (existing) {
    await ctx.db.patch(existing._id, patchData);
    return "actualizada";
  } else {
    await ctx.db.insert("jornadas_asistencia", {
      empleado_id: emp._id,
      fecha,
      organizacion_id: emp.organizacion_id,
      proyecto_id: emp.proyecto_id,
      ...patchData,
    });
    return estado === "ausente" ? "ausente" : "creada";
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function ayerISO(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Resolución horario con override calendario.
// 1. turnos_calendario[empleado, fecha] → override (puede ser OFF explícito)
// 2. asignacion_horario_historico vigente → default
//
// Devuelve { plantilla, isOff } donde:
//   isOff=true → empleado OFF explícito (no laboral, no ausente)
//   plantilla=null → sin horario asignado (skip)
async function getHorarioEnFecha(ctx: any, empleadoId: string, fecha: string): Promise<{ plantilla: any | null; isOff: boolean }> {
  // Check override calendario
  const override = await ctx.db
    .query("turnos_calendario")
    .withIndex("by_empleado_fecha", (q: any) => q.eq("empleado_id", empleadoId).eq("fecha", fecha))
    .first();
  if (override) {
    if (!override.horario_plantilla_id) {
      return { plantilla: null, isOff: true };
    }
    const plantilla = await ctx.db.get(override.horario_plantilla_id);
    return { plantilla: plantilla ?? null, isOff: false };
  }
  // Fallback asignacion default
  const asignaciones = await ctx.db
    .query("asignacion_horario_historico")
    .withIndex("by_empleado", (q: any) => q.eq("empleado_id", empleadoId))
    .collect();
  const vigente = asignaciones.find(
    (a: any) =>
      a.vigencia_desde <= fecha && (!a.vigencia_hasta || a.vigencia_hasta >= fecha),
  );
  if (!vigente) return { plantilla: null, isOff: false };
  const plantilla = await ctx.db.get(vigente.horario_plantilla_id);
  return { plantilla: plantilla ?? null, isOff: false };
}

async function aplicarSwap(ctx: any, empleadoId: string, fecha: string, horarioActual: any): Promise<any> {
  const swaps = await ctx.db
    .query("cambios_turno")
    .withIndex("by_fecha", (q: any) => q.eq("fecha", fecha))
    .collect();
  const swap = swaps.find(
    (s: any) =>
      s.estado === "aprobado" &&
      (s.empleado_a_id === empleadoId || s.empleado_b_id === empleadoId),
  );
  if (!swap) return horarioActual;
  const otroId = swap.empleado_a_id === empleadoId ? swap.empleado_b_id : swap.empleado_a_id;
  const { plantilla: horarioOtro } = await getHorarioEnFecha(ctx, otroId, fecha);
  return horarioOtro ?? horarioActual;
}

async function getPermisoVigente(ctx: any, empleadoId: string, fecha: string): Promise<any | null> {
  const permisos = await ctx.db
    .query("permisos")
    .withIndex("by_empleado", (q: any) => q.eq("empleado_id", empleadoId))
    .collect();
  return permisos.find(
    (p: any) =>
      p.estado === "aprobado" && p.fecha_desde <= fecha && p.fecha_hasta >= fecha,
  ) ?? null;
}

// Calcula minutos_trabajados, minutos_tarde, minutos_ausente desde timestamps + horario.
function calcularJornada(
  jornada: any | undefined,
  horario: any,
): { minutos_trabajados: number; minutos_tarde: number; minutos_ausente: number } {
  if (!jornada) return { minutos_trabajados: 0, minutos_tarde: 0, minutos_ausente: 0 };

  // Minutos trabajados = (sal_almuerzo - entrada) + (salida - reg_almuerzo)
  // Si no marcó almuerzo, asumir continuo: salida - entrada.
  let trab = 0;
  if (jornada.entrada_timestamp) {
    if (jornada.salida_almuerzo_timestamp && jornada.regreso_almuerzo_timestamp) {
      const am = Math.max(0, jornada.salida_almuerzo_timestamp - jornada.entrada_timestamp);
      const pm = jornada.salida_timestamp
        ? Math.max(0, jornada.salida_timestamp - jornada.regreso_almuerzo_timestamp)
        : 0;
      trab = Math.floor((am + pm) / 60000);
    } else if (jornada.salida_timestamp) {
      // Sin almuerzo registrado: descontar 1h estimada si horario indica almuerzo
      let bruto = Math.floor((jornada.salida_timestamp - jornada.entrada_timestamp) / 60000);
      if (horario.hora_almuerzo_inicio && horario.hora_almuerzo_fin) {
        const [hi, mi] = horario.hora_almuerzo_inicio.split(":").map(Number);
        const [hf, mf] = horario.hora_almuerzo_fin.split(":").map(Number);
        const alm = (hf * 60 + mf) - (hi * 60 + mi);
        bruto = Math.max(0, bruto - alm);
      }
      trab = bruto;
    }
  }

  // Minutos tarde = entrada actual vs hora_entrada planificada + tolerancia
  let tarde = 0;
  if (jornada.entrada_timestamp && horario.hora_entrada) {
    const entradaDate = new Date(jornada.entrada_timestamp);
    const [hh, mm] = horario.hora_entrada.split(":").map(Number);
    const planificada = new Date(entradaDate);
    planificada.setHours(hh, mm + (horario.tolerancia_entrada_min ?? 10), 0, 0);
    const diff = jornada.entrada_timestamp - planificada.getTime();
    if (diff > 0) tarde = Math.floor(diff / 60000);
  }

  return { minutos_trabajados: trab, minutos_tarde: tarde, minutos_ausente: 0 };
}

// ─── Mutations admin (manual) ───────────────────────────────────────

export const recalcularDia = mutation({
  args: { fecha: v.string() },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    return await procesarFechaChunk(ctx, args.fecha, 0);
  },
});

export const recalcularJornada = mutation({
  args: { jornada_id: v.id("jornadas_asistencia") },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const jornada = await ctx.db.get(args.jornada_id);
    if (!jornada) throw new Error("Jornada no encontrada");
    const emp = await ctx.db.get(jornada.empleado_id);
    if (!emp) throw new Error("Empleado no encontrado");
    const result = await procesarEmpleado(ctx, emp, jornada.fecha);
    return { result, jornada_id: args.jornada_id };
  },
});
