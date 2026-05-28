import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireProjectAccess, requireWriteRole } from "./lib/auth";
import { requireModulo } from "./lib/modules";

// ─── Helpers ──────────────────────────────────────────────

// Calcula el estado "vencido / proximo / al_dia" comparando lectura actual vs proxima ejecucion.
// Devuelve tambien el "pct" para coloreado (>=1 vencido, 0.8-1 proximo, <0.8 al_dia).
function evaluateSchedule(
  pm: any,
  km_actual: number | null,
  horas_actual: number | null,
): {
  estado: "al_dia" | "proximo" | "vencido" | "indefinido";
  pct: number;
  remaining: number | null;
  unidad: string;
  proximo_valor: number | null;
} {
  const advance = pm.advertencia_anticipada ?? 0;
  if (pm.tipo_intervalo === "km") {
    if (km_actual == null || pm.referencia_km == null) {
      return { estado: "indefinido", pct: 0, remaining: null, unidad: "km", proximo_valor: null };
    }
    const proximo = pm.referencia_km + pm.intervalo_valor;
    const remaining = proximo - km_actual;
    const pct = (km_actual - pm.referencia_km) / pm.intervalo_valor;
    if (remaining <= 0) return { estado: "vencido", pct, remaining, unidad: "km", proximo_valor: proximo };
    if (advance > 0 && remaining <= advance) return { estado: "proximo", pct, remaining, unidad: "km", proximo_valor: proximo };
    if (pct >= 0.8) return { estado: "proximo", pct, remaining, unidad: "km", proximo_valor: proximo };
    return { estado: "al_dia", pct, remaining, unidad: "km", proximo_valor: proximo };
  }
  if (pm.tipo_intervalo === "horas") {
    if (horas_actual == null || pm.referencia_horas == null) {
      return { estado: "indefinido", pct: 0, remaining: null, unidad: "horas", proximo_valor: null };
    }
    const proximo = pm.referencia_horas + pm.intervalo_valor;
    const remaining = proximo - horas_actual;
    const pct = (horas_actual - pm.referencia_horas) / pm.intervalo_valor;
    if (remaining <= 0) return { estado: "vencido", pct, remaining, unidad: "horas", proximo_valor: proximo };
    if (advance > 0 && remaining <= advance) return { estado: "proximo", pct, remaining, unidad: "horas", proximo_valor: proximo };
    if (pct >= 0.8) return { estado: "proximo", pct, remaining, unidad: "horas", proximo_valor: proximo };
    return { estado: "al_dia", pct, remaining, unidad: "horas", proximo_valor: proximo };
  }
  if (pm.tipo_intervalo === "dias") {
    const ahora = Date.now();
    const proximo = pm.referencia_fecha + pm.intervalo_valor * 86400000;
    const remaining_ms = proximo - ahora;
    const remaining_dias = Math.floor(remaining_ms / 86400000);
    const pct = (ahora - pm.referencia_fecha) / (pm.intervalo_valor * 86400000);
    if (remaining_ms <= 0) return { estado: "vencido", pct, remaining: remaining_dias, unidad: "dias", proximo_valor: proximo };
    if (advance > 0 && remaining_dias <= advance) return { estado: "proximo", pct, remaining: remaining_dias, unidad: "dias", proximo_valor: proximo };
    if (pct >= 0.8) return { estado: "proximo", pct, remaining: remaining_dias, unidad: "dias", proximo_valor: proximo };
    return { estado: "al_dia", pct, remaining: remaining_dias, unidad: "dias", proximo_valor: proximo };
  }
  return { estado: "indefinido", pct: 0, remaining: null, unidad: pm.tipo_intervalo, proximo_valor: null };
}

// Devuelve la lectura mas reciente de odometro/horometro para un vehiculo.
async function getLatestReadings(ctx: any, vehiculo_id: string) {
  const all = await ctx.db
    .query("meter_readings")
    .withIndex("by_vehiculo", (q: any) => q.eq("vehiculo_id", vehiculo_id))
    .collect();
  let latest_km: number | null = null;
  let latest_horas: number | null = null;
  let fecha_km: number | null = null;
  let fecha_horas: number | null = null;
  for (const r of all) {
    if (r.tipo === "odometro" && (fecha_km === null || r.fecha > fecha_km)) {
      latest_km = r.valor;
      fecha_km = r.fecha;
    }
    if (r.tipo === "horometro" && (fecha_horas === null || r.fecha > fecha_horas)) {
      latest_horas = r.valor;
      fecha_horas = r.fecha;
    }
  }
  return { latest_km, latest_horas };
}

// ─── Queries ──────────────────────────────────────────────

export const listByVehiculo = query({
  args: { vehiculo_id: v.id("vehiculos") },
  handler: async (ctx, { vehiculo_id }) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    const vehiculo = await ctx.db.get(vehiculo_id);
    if (!vehiculo) return [];
    if (
      !scope.isSuperAdmin &&
      !scope.isCrossOrgViewer &&
      vehiculo.organizacion_id !== scope.organizacionId
    ) {
      return [];
    }
    const pms = await ctx.db
      .query("pm_schedules")
      .withIndex("by_vehiculo", q => q.eq("vehiculo_id", vehiculo_id))
      .collect();
    // Lecturas actuales del vehiculo (manual + GPS odometro)
    const { latest_km, latest_horas } = await getLatestReadings(ctx, vehiculo_id);
    // Fallback: si no hay lectura manual, usa km_acumulado del vehiculo (GPS)
    const km_use = latest_km ?? (vehiculo as any).km_acumulado ?? null;
    return pms.map(pm => ({
      ...pm,
      evaluacion: evaluateSchedule(pm, km_use, latest_horas),
      lectura_km: km_use,
      lectura_horas: latest_horas,
    }));
  },
});

// Panel "vencido y proximo": agrega todos los PMs activos del scope.
export const listDueOrUpcoming = query({
  args: { proyecto_id: v.optional(v.id("proyectos")) },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    let pms: any[] = [];
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) {
      pms = await ctx.db.query("pm_schedules").collect();
    } else if (scope.organizacionId) {
      pms = await ctx.db
        .query("pm_schedules")
        .withIndex("by_organizacion", q => q.eq("organizacion_id", scope.organizacionId!))
        .collect();
    }
    pms = pms.filter(p => p.activo);
    if (args.proyecto_id) pms = pms.filter(p => p.proyecto_id === args.proyecto_id);
    // Conductor: solo ve PMs de su vehiculo asignado
    if (scope.isConductor && scope.perfil.vehiculo_asignado_id) {
      pms = pms.filter(p => p.vehiculo_id === scope.perfil.vehiculo_asignado_id);
    } else if (scope.isConductor) {
      return [];
    }

    // Cachear lecturas por vehiculo
    const cache: Record<string, { km: number | null; horas: number | null; vehiculo: any | null }> = {};
    const result: any[] = [];
    for (const pm of pms) {
      const key = pm.vehiculo_id;
      if (!cache[key]) {
        const veh = await ctx.db.get(pm.vehiculo_id);
        const { latest_km, latest_horas } = await getLatestReadings(ctx, pm.vehiculo_id);
        cache[key] = {
          km: latest_km ?? (veh as any)?.km_acumulado ?? null,
          horas: latest_horas,
          vehiculo: veh,
        };
      }
      const c = cache[key];
      const eval_ = evaluateSchedule(pm, c.km, c.horas);
      if (eval_.estado === "vencido" || eval_.estado === "proximo") {
        result.push({
          ...pm,
          evaluacion: eval_,
          vehiculo_placa: c.vehiculo?.placa ?? null,
          vehiculo_nombre: c.vehiculo?.nombre ?? null,
          lectura_km: c.km,
          lectura_horas: c.horas,
        });
      }
    }
    // Orden: vencidos primero (pct desc), luego proximos
    result.sort((a, b) => {
      if (a.evaluacion.estado === b.evaluacion.estado) return b.evaluacion.pct - a.evaluacion.pct;
      return a.evaluacion.estado === "vencido" ? -1 : 1;
    });
    return result;
  },
});

// ─── Mutations ────────────────────────────────────────────

export const create = mutation({
  args: {
    vehiculo_id: v.id("vehiculos"),
    titulo: v.string(),
    descripcion: v.optional(v.string()),
    categoria: v.optional(v.string()),
    tipo_intervalo: v.string(),
    intervalo_valor: v.number(),
    advertencia_anticipada: v.optional(v.number()),
    referencia_km: v.optional(v.number()),
    referencia_horas: v.optional(v.number()),
    referencia_fecha: v.optional(v.number()),
    prioridad: v.optional(v.string()),
    proyecto_id: v.optional(v.id("proyectos")),
  },
  handler: async (ctx, args) => {
    const scope = await requireWriteRole(ctx);
    await requireModulo(ctx, "MTO");
    if (args.proyecto_id) await requireProjectAccess(ctx, args.proyecto_id);
    if (!["km", "horas", "dias"].includes(args.tipo_intervalo)) {
      throw new Error("tipo_intervalo debe ser km, horas o dias");
    }
    if (args.intervalo_valor <= 0) throw new Error("intervalo_valor debe ser > 0");

    const veh = await ctx.db.get(args.vehiculo_id);
    if (!veh) throw new Error("Vehiculo no existe");
    if (!scope.isSuperAdmin && veh.organizacion_id !== scope.organizacionId) {
      throw new Error("Acceso denegado al vehiculo");
    }

    const payload: any = {
      vehiculo_id: args.vehiculo_id,
      titulo: args.titulo,
      descripcion: args.descripcion,
      categoria: args.categoria,
      tipo_intervalo: args.tipo_intervalo,
      intervalo_valor: args.intervalo_valor,
      advertencia_anticipada: args.advertencia_anticipada,
      referencia_km: args.referencia_km,
      referencia_horas: args.referencia_horas,
      referencia_fecha: args.referencia_fecha ?? Date.now(),
      prioridad: args.prioridad ?? "media",
      activo: true,
      proyecto_id: args.proyecto_id,
      organizacion_id: veh.organizacion_id ?? scope.organizacionId ?? undefined,
    };
    return await ctx.db.insert("pm_schedules", payload);
  },
});

export const update = mutation({
  args: {
    id: v.id("pm_schedules"),
    titulo: v.optional(v.string()),
    descripcion: v.optional(v.string()),
    categoria: v.optional(v.string()),
    tipo_intervalo: v.optional(v.string()),
    intervalo_valor: v.optional(v.number()),
    advertencia_anticipada: v.optional(v.number()),
    referencia_km: v.optional(v.number()),
    referencia_horas: v.optional(v.number()),
    referencia_fecha: v.optional(v.number()),
    prioridad: v.optional(v.string()),
    activo: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const scope = await requireWriteRole(ctx);
    const pm = await ctx.db.get(args.id);
    if (!pm) throw new Error("PM no existe");
    if (!scope.isSuperAdmin && pm.organizacion_id !== scope.organizacionId) {
      throw new Error("Acceso denegado");
    }
    const { id, ...rest } = args;
    const patch: any = {};
    for (const [k, val] of Object.entries(rest)) {
      if (val !== undefined) patch[k] = val;
    }
    await ctx.db.patch(id, patch);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("pm_schedules") },
  handler: async (ctx, { id }) => {
    const scope = await requireWriteRole(ctx);
    const pm = await ctx.db.get(id);
    if (!pm) return;
    if (!scope.isSuperAdmin && pm.organizacion_id !== scope.organizacionId) {
      throw new Error("Acceso denegado");
    }
    await ctx.db.delete(id);
  },
});

// Marca el PM como "ejecutado": actualiza referencia_fecha + referencia_km/horas y enlaza task.
export const markExecuted = mutation({
  args: {
    id: v.id("pm_schedules"),
    task_id: v.optional(v.id("maintenance_tasks")),
    nueva_referencia_km: v.optional(v.number()),
    nueva_referencia_horas: v.optional(v.number()),
    fecha_ejecucion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const scope = await requireWriteRole(ctx);
    const pm = await ctx.db.get(args.id);
    if (!pm) throw new Error("PM no existe");
    if (!scope.isSuperAdmin && pm.organizacion_id !== scope.organizacionId) {
      throw new Error("Acceso denegado");
    }
    const patch: any = {
      referencia_fecha: args.fecha_ejecucion ?? Date.now(),
      ultima_task_id: args.task_id,
    };
    if (args.nueva_referencia_km !== undefined) patch.referencia_km = args.nueva_referencia_km;
    if (args.nueva_referencia_horas !== undefined) patch.referencia_horas = args.nueva_referencia_horas;
    await ctx.db.patch(args.id, patch);
    return args.id;
  },
});
