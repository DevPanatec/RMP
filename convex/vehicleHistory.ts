import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

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

    // Construir query con índice
    let query = ctx.db
      .query("vehicle_location_history")
      .withIndex("by_vehiculo_timestamp", (q) => q.eq("vehiculo_id", vehiculoId));

    // Si hay startDate, filtrar desde esa fecha
    if (startDate) {
      query = query.filter((q) => q.gte(q.field("timestamp"), startDate));
    }

    // Si hay endDate, filtrar hasta esa fecha
    if (endDate) {
      query = query.filter((q) => q.lte(q.field("timestamp"), endDate));
    }

    // Ordenar por timestamp ascendente
    const locations = await query.collect();

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

    // Construir query con índice
    let query = ctx.db
      .query("vehicle_location_history")
      .withIndex("by_vehiculo_timestamp", (q) => q.eq("vehiculo_id", vehiculoId));

    // Si hay startDate, filtrar desde esa fecha
    if (startDate) {
      query = query.filter((q) => q.gte(q.field("timestamp"), startDate));
    }

    // Si hay endDate, filtrar hasta esa fecha
    if (endDate) {
      query = query.filter((q) => q.lte(q.field("timestamp"), endDate));
    }

    // Ordenar por timestamp ascendente
    const locations = await query.collect();

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
 * Query: Obtener estadísticas de almacenamiento
 */
export const getStorageStats = query({
  handler: async (ctx) => {
    // Obtener todos los registros de historial
    const allHistory = await ctx.db.query("vehicle_location_history").collect();

    // Agrupar por vehículo
    const byVehicle: Record<string, number> = {};
    for (const record of allHistory) {
      const vehicleId = record.vehiculo_id;
      byVehicle[vehicleId] = (byVehicle[vehicleId] || 0) + 1;
    }

    // Obtener timestamp más antiguo y más reciente
    const timestamps = allHistory.map((r) => r.timestamp);
    const oldestTimestamp = timestamps.length > 0 ? Math.min(...timestamps) : null;
    const newestTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : null;

    return {
      totalRecords: allHistory.length,
      recordsByVehicle: byVehicle,
      oldestRecord: oldestTimestamp ? new Date(oldestTimestamp).toISOString() : null,
      newestRecord: newestTimestamp ? new Date(newestTimestamp).toISOString() : null,
      storageSpanDays: oldestTimestamp && newestTimestamp
        ? Math.ceil((newestTimestamp - oldestTimestamp) / (1000 * 60 * 60 * 24))
        : 0,
    };
  },
});

/**
 * Mutation: Limpiar historial antiguo (retención de X días)
 */
export const cleanOldHistory = mutation({
  args: {
    retentionDays: v.optional(v.number()), // Mantener últimos X días (default: 90)
  },
  handler: async (ctx, args) => {
    const retentionDays = args.retentionDays || 90; // Default 90 días

    const cutoffTimestamp = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    console.log(
      `🧹 Iniciando limpieza de historial GPS (retención: ${retentionDays} días, cutoff: ${new Date(
        cutoffTimestamp
      ).toISOString()})`
    );

    // Obtener registros antiguos
    const oldRecords = await ctx.db
      .query("vehicle_location_history")
      .withIndex("by_timestamp")
      .filter((q) => q.lt(q.field("timestamp"), cutoffTimestamp))
      .collect();

    console.log(`🗑️ Eliminando ${oldRecords.length} registros antiguos...`);

    // Eliminar registros
    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }

    console.log(`✅ Limpieza completada: ${oldRecords.length} registros eliminados`);

    return {
      deletedCount: oldRecords.length,
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

      const distance = calculateHaversine(
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
 * Fórmula de Haversine para calcular distancia entre dos puntos GPS
 */
function calculateHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
export const createFromWebhook = mutation({
  args: {
    imei: v.string(),
    gps_latitud: v.number(),
    gps_longitud: v.number(),
    gps_velocidad: v.optional(v.number()),
    gps_rumbo: v.optional(v.number()),
    timestamp: v.string(), // ISO string
  },
  handler: async (ctx, args) => {
    const { imei, gps_latitud, gps_longitud, gps_velocidad, gps_rumbo, timestamp } = args;

    console.log(`🔔 [Webhook] Procesando datos GPS para IMEI: ${imei}`);

    // Buscar el vehículo por IMEI (busca en gps_imei o safetag_device_id)
    let vehicle = await ctx.db
      .query("vehiculos")
      .withIndex("by_gps_imei", (q) => q.eq("gps_imei", imei))
      .first();

    // Si no se encuentra por gps_imei, buscar por safetag_device_id
    if (!vehicle) {
      vehicle = await ctx.db
        .query("vehiculos")
        .withIndex("by_safetag_device", (q) => q.eq("safetag_device_id", imei))
        .first();
    }

    if (!vehicle) {
      console.warn(`⚠️ [Webhook] Vehículo no encontrado para IMEI: ${imei}`);
      return {
        success: false,
        error: `Vehicle not found for IMEI: ${imei}`,
      };
    }

    // Convertir timestamp ISO a milisegundos
    const timestampMs = new Date(timestamp).getTime();

    // Crear registro en vehicle_location_history
    const historyId = await ctx.db.insert("vehicle_location_history", {
      vehiculo_id: vehicle._id,
      gps_latitud,
      gps_longitud,
      gps_velocidad: gps_velocidad || 0,
      gps_rumbo: gps_rumbo || 0,
      timestamp: timestampMs,
      source: "safetag_webhook",
    });

    // Actualizar la posición actual del vehículo en la tabla vehiculos
    await ctx.db.patch(vehicle._id, {
      gps_latitud,
      gps_longitud,
      gps_velocidad: gps_velocidad || 0,
      gps_rumbo: gps_rumbo || 0,
      ultima_actualizacion_gps: timestampMs,
    });

    console.log(
      `✅ [Webhook] GPS actualizado: ${vehicle.placa} -> [${gps_latitud.toFixed(5)}, ${gps_longitud.toFixed(5)}] @ ${new Date(timestampMs).toLocaleTimeString()}`
    );

    return {
      success: true,
      vehiculoId: vehicle._id,
      historyId,
      placa: vehicle.placa,
    };
  },
});
