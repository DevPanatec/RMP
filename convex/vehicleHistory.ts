import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { getAuthScope } from "./lib/auth";

/**
 * Query: Obtener historial de ubicaciones de un vehículo en un rango de fechas
 */
export const getVehicleHistory = query({
  args: {
    vehiculoId: v.id("vehiculos"),
    startDate: v.optional(v.number()), // Unix timestamp (milisegundos)
    endDate: v.optional(v.number()), // Unix timestamp (milisegundos)
  },
  handler: async (ctx, args) => {
    const { vehiculoId, startDate, endDate } = args;

    // Obtener datos del vehículo
    const vehicle = await ctx.db.get(vehiculoId);
    if (!vehicle) {
      throw new Error(`Vehicle not found: ${vehiculoId}`);
    }

    // Validar acceso a este vehículo
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      if (!scope.organizacionId || vehicle.organizacion_id !== scope.organizacionId) {
        throw new Error("Acceso denegado");
      }
    }

    // Range expression EN el índice (no filter) — sino escanea todo el historial del vehículo
    const locations = await ctx.db
      .query("vehicle_location_history")
      .withIndex("by_vehiculo_timestamp", (q) => {
        let r = q.eq("vehiculo_id", vehiculoId);
        if (startDate !== undefined) r = r.gte("timestamp", startDate);
        if (endDate !== undefined) r = r.lte("timestamp", endDate);
        return r;
      })
      .collect();

    console.log(
      `📊 Historial consultado: ${vehicle.placa} (${locations.length} puntos) [${
        startDate ? new Date(startDate).toISOString() : "inicio"
      } → ${endDate ? new Date(endDate).toISOString() : "ahora"}]`
    );

    return {
      vehiculoId,
      placa: vehicle.placa,
      locations,
      totalPoints: locations.length,
      startDate: startDate || (locations.length > 0 ? locations[0].timestamp : null),
      endDate: endDate || (locations.length > 0 ? locations[locations.length - 1].timestamp : null),
    };
  },
});

/**
 * Internal query helper: Obtener historial (para uso interno)
 */
export const getVehicleHistoryInternal = internalQuery({
  args: {
    vehiculoId: v.id("vehiculos"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { vehiculoId, startDate, endDate } = args;

    // Obtener datos del vehículo
    const vehicle = await ctx.db.get(vehiculoId);
    if (!vehicle) {
      throw new Error(`Vehicle not found: ${vehiculoId}`);
    }

    // Range expression EN el índice (no filter)
    const locations = await ctx.db
      .query("vehicle_location_history")
      .withIndex("by_vehiculo_timestamp", (q) => {
        let r = q.eq("vehiculo_id", vehiculoId);
        if (startDate !== undefined) r = r.gte("timestamp", startDate);
        if (endDate !== undefined) r = r.lte("timestamp", endDate);
        return r;
      })
      .collect();

    return {
      vehiculoId,
      placa: vehicle.placa,
      locations,
      totalPoints: locations.length,
      startDate: startDate || (locations.length > 0 ? locations[0].timestamp : null),
      endDate: endDate || (locations.length > 0 ? locations[locations.length - 1].timestamp : null),
    };
  },
});

/**
 * Query: Obtener historial de ubicaciones de un día específico
 */
export const getVehicleHistoryByDay = query({
  args: {
    vehiculoId: v.id("vehiculos"),
    date: v.string(), // Fecha en formato ISO "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    const { vehiculoId, date } = args;

    // Validar acceso a este vehículo
    const vehicle = await ctx.db.get(vehiculoId);
    if (!vehicle) throw new Error(`Vehicle not found: ${vehiculoId}`);
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      if (!scope.organizacionId || vehicle.organizacion_id !== scope.organizacionId) {
        throw new Error("Acceso denegado");
      }
    }

    // Convertir fecha a rango de timestamps
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`📅 Consultando historial del día ${date} para vehículo ${vehiculoId}`);

    // Reutilizar la query de rango
    return await ctx.runQuery(internal.vehicleHistory.getVehicleHistoryInternal, {
      vehiculoId,
      startDate: startOfDay.getTime(),
      endDate: endOfDay.getTime(),
    });
  },
});

/**
 * Query: Obtener historial reciente (últimas X horas)
 */
export const getRecentHistory = query({
  args: {
    vehiculoId: v.id("vehiculos"),
    hours: v.number(), // Número de horas hacia atrás
  },
  handler: async (ctx, args) => {
    const { vehiculoId, hours } = args;

    // Validar acceso a este vehículo
    const vehicle = await ctx.db.get(vehiculoId);
    if (!vehicle) throw new Error(`Vehicle not found: ${vehiculoId}`);
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      if (!scope.organizacionId || vehicle.organizacion_id !== scope.organizacionId) {
        throw new Error("Acceso denegado");
      }
    }

    const now = Date.now();
    const startTime = now - hours * 60 * 60 * 1000;

    console.log(`⏰ Consultando últimas ${hours} horas para vehículo ${vehiculoId}`);

    return await ctx.runQuery(internal.vehicleHistory.getVehicleHistoryInternal, {
      vehiculoId,
      startDate: startTime,
      endDate: now,
    });
  },
});

/**
 * Mutation: Limpiar historial antiguo (retención de X días).
 * PAGINADO en batches de 1000 para evitar timeout/8192 doc TX limit.
 * Si quedan más, se reagenda a sí mismo via scheduler.
 */
export const cleanOldHistory = internalMutation({
  args: {
    retentionDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const retentionDays = args.retentionDays || 90;
    const cutoffTimestamp = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const BATCH_SIZE = 1000;

    const oldRecords = await ctx.db
      .query("vehicle_location_history")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", cutoffTimestamp))
      .take(BATCH_SIZE);

    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }

    // Si llenamos el batch hay más; reagendar.
    if (oldRecords.length === BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.vehicleHistory.cleanOldHistory, { retentionDays });
    }

    return {
      deletedCount: oldRecords.length,
      hasMore: oldRecords.length === BATCH_SIZE,
      cutoffDate: new Date(cutoffTimestamp).toISOString(),
    };
  },
});

/**
 * Query: Calcular distancia total recorrida
 */
export const calculateDistance = query({
  args: {
    vehiculoId: v.id("vehiculos"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validar acceso a este vehículo
    const vehicle = await ctx.db.get(args.vehiculoId);
    if (!vehicle) throw new Error(`Vehicle not found: ${args.vehiculoId}`);
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      if (!scope.organizacionId || vehicle.organizacion_id !== scope.organizacionId) {
        throw new Error("Acceso denegado");
      }
    }
    const historyData = await ctx.runQuery(internal.vehicleHistory.getVehicleHistoryInternal, args);

    if (historyData.locations.length < 2) {
      return {
        distance: 0,
        unit: "km",
      };
    }

    // Calcular distancia usando fórmula de Haversine
    let totalDistance = 0;
    const locations = historyData.locations;

    for (let i = 1; i < locations.length; i++) {
      const prev = locations[i - 1];
      const curr = locations[i];

      const distance = haversineKm(
        prev.gps_latitud,
        prev.gps_longitud,
        curr.gps_latitud,
        curr.gps_longitud
      );

      totalDistance += distance;
    }

    return {
      distance: totalDistance,
      unit: "km",
      vehiculoId: args.vehiculoId,
      startDate: args.startDate,
      endDate: args.endDate,
    };
  },
});

/**
 * Fórmula de Haversine para calcular distancia entre dos puntos GPS.
 * Retorna distancia en KILÓMETROS (R = 6371km). Para versión en metros ver `geofences.haversineMeters`.
 */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Mutation: Crear registro de ubicación desde webhook de SafeTag
 * 
 * Esta mutation es llamada por el webhook HTTP cuando SafeTag envía
 * una actualización de GPS en tiempo real
 */
export const createFromWebhook = internalMutation({
  args: {
    imei: v.string(),
    gps_latitud: v.number(),
    gps_longitud: v.number(),
    gps_velocidad: v.optional(v.number()),
    gps_rumbo: v.optional(v.number()),
    timestamp_ms: v.number(),
  },
  handler: async (ctx, args) => {
    const { imei, gps_latitud, gps_longitud, gps_velocidad, gps_rumbo, timestamp_ms } = args;

    let vehicle = await ctx.db
      .query("vehiculos")
      .withIndex("by_gps_imei", (q) => q.eq("gps_imei", imei))
      .first();

    if (!vehicle) {
      vehicle = await ctx.db
        .query("vehiculos")
        .withIndex("by_safetag_device", (q) => q.eq("safetag_device_id", imei))
        .first();
    }

    if (!vehicle) {
      return {
        success: false,
        error: `Vehicle not found for IMEI: ${imei}`,
      };
    }

    const historyId = await ctx.db.insert("vehicle_location_history", {
      vehiculo_id: vehicle._id,
      gps_latitud,
      gps_longitud,
      gps_velocidad: gps_velocidad || 0,
      gps_rumbo: gps_rumbo || 0,
      timestamp: timestamp_ms,
      safetag_timestamp: timestamp_ms,
      source: "safetag",
    });

    await ctx.db.patch(vehicle._id, {
      gps_latitud,
      gps_longitud,
      gps_velocidad: gps_velocidad || 0,
      gps_rumbo: gps_rumbo || 0,
      gps_ultima_actualizacion: timestamp_ms,
      safetag_timestamp: timestamp_ms,
      gps_conectado: true,
    });

    return {
      success: true,
      vehiculoId: vehicle._id,
      historyId,
      placa: vehicle.placa,
    };
  },
});
