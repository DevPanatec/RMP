import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireWriteRole } from "./lib/auth";
import { requireModulo } from "./lib/modules";

// ─── Queries ──────────────────────────────────────────────

export const listByVehiculo = query({
  args: {
    vehiculo_id: v.id("vehiculos"),
    tipo: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { vehiculo_id, tipo, limit }) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    const veh = await ctx.db.get(vehiculo_id);
    if (!veh) return [];
    if (
      !scope.isSuperAdmin &&
      !scope.isCrossOrgViewer &&
      veh.organizacion_id !== scope.organizacionId
    ) {
      return [];
    }
    let q;
    if (tipo) {
      q = ctx.db
        .query("meter_readings")
        .withIndex("by_vehiculo_tipo", i => i.eq("vehiculo_id", vehiculo_id).eq("tipo", tipo));
    } else {
      q = ctx.db
        .query("meter_readings")
        .withIndex("by_vehiculo", i => i.eq("vehiculo_id", vehiculo_id));
    }
    const all = await q.collect();
    all.sort((a, b) => b.fecha - a.fecha);
    return limit ? all.slice(0, limit) : all;
  },
});

// Devuelve la lectura mas reciente por tipo, con fallback a km_acumulado del vehiculo.
export const latestForVehicle = query({
  args: { vehiculo_id: v.id("vehiculos") },
  handler: async (ctx, { vehiculo_id }) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return null;
    const veh = await ctx.db.get(vehiculo_id);
    if (!veh) return null;
    if (
      !scope.isSuperAdmin &&
      !scope.isCrossOrgViewer &&
      veh.organizacion_id !== scope.organizacionId
    ) {
      return null;
    }
    const all = await ctx.db
      .query("meter_readings")
      .withIndex("by_vehiculo", q => q.eq("vehiculo_id", vehiculo_id))
      .collect();
    let latest_km: any = null;
    let latest_horas: any = null;
    for (const r of all) {
      if (r.tipo === "odometro" && (!latest_km || r.fecha > latest_km.fecha)) latest_km = r;
      if (r.tipo === "horometro" && (!latest_horas || r.fecha > latest_horas.fecha)) latest_horas = r;
    }
    // Fallback al GPS si no hay lectura manual
    const fallback_km = (veh as any).km_acumulado ?? null;
    return {
      odometro: latest_km,
      horometro: latest_horas,
      km_efectivo: latest_km?.valor ?? fallback_km,
      horas_efectivo: latest_horas?.valor ?? null,
      fuente_km: latest_km ? latest_km.fuente : (fallback_km != null ? "gps" : null),
    };
  },
});

// ─── Mutations ────────────────────────────────────────────

export const record = mutation({
  args: {
    vehiculo_id: v.id("vehiculos"),
    tipo: v.string(),       // "odometro" | "horometro"
    valor: v.number(),
    fecha: v.optional(v.number()),
    fuente: v.optional(v.string()),  // default "manual"
    task_id: v.optional(v.id("maintenance_tasks")),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const scope = await requireWriteRole(ctx);
    await requireModulo(ctx, "MTO");
    if (!["odometro", "horometro"].includes(args.tipo)) {
      throw new Error("tipo debe ser odometro u horometro");
    }
    if (args.valor < 0) throw new Error("valor debe ser >= 0");

    const veh = await ctx.db.get(args.vehiculo_id);
    if (!veh) throw new Error("Vehiculo no existe");
    if (!scope.isSuperAdmin && veh.organizacion_id !== scope.organizacionId) {
      throw new Error("Acceso denegado al vehiculo");
    }
    // Conductor: solo su vehiculo asignado
    if (scope.isConductor && scope.perfil?.vehiculo_asignado_id !== args.vehiculo_id) {
      throw new Error("Conductor solo puede registrar lecturas de su vehiculo");
    }
    // Sanity check: la lectura no puede ser < la ultima (los odometros no retroceden)
    const ultimas = await ctx.db
      .query("meter_readings")
      .withIndex("by_vehiculo_tipo", q => q.eq("vehiculo_id", args.vehiculo_id).eq("tipo", args.tipo))
      .collect();
    const ultimo_valor = ultimas.reduce<number | null>((max, r) => {
      return max === null || r.valor > max ? r.valor : max;
    }, null);
    if (ultimo_valor !== null && args.valor < ultimo_valor) {
      throw new Error(`La lectura (${args.valor}) no puede ser menor que la anterior (${ultimo_valor})`);
    }

    return await ctx.db.insert("meter_readings", {
      vehiculo_id: args.vehiculo_id,
      tipo: args.tipo,
      valor: args.valor,
      fecha: args.fecha ?? Date.now(),
      fuente: args.fuente ?? "manual",
      task_id: args.task_id,
      usuario_id: scope.perfil!.userId,
      notas: args.notas,
      organizacion_id: veh.organizacion_id ?? scope.organizacionId ?? undefined,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("meter_readings") },
  handler: async (ctx, { id }) => {
    const scope = await requireWriteRole(ctx);
    const r = await ctx.db.get(id);
    if (!r) return;
    if (!scope.isSuperAdmin && r.organizacion_id !== scope.organizacionId) {
      throw new Error("Acceso denegado");
    }
    await ctx.db.delete(id);
  },
});
