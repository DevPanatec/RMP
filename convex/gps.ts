import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Mutation: Actualizar posición GPS de un vehículo
 *
 * Esta función es llamada por el endpoint HTTP cuando el GPS tracker
 * envía una actualización de posición.
 */
export const updateVehicleGPS = mutation({
  args: {
    imei: v.string(),
    lat: v.number(),
    lng: v.number(),
    speed: v.optional(v.number()),
    heading: v.optional(v.number()),
    altitude: v.optional(v.number()),
    precision: v.optional(v.number()),
    satellites: v.optional(v.number()),
    timestamp: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Buscar vehículo por IMEI
    const vehicle = await ctx.db
      .query("vehiculos")
      .withIndex("by_gps_imei", (q) => q.eq("gps_imei", args.imei))
      .first();

    if (!vehicle) {
      console.warn(`⚠️ No se encontró vehículo con IMEI: ${args.imei}`);
      return {
        success: false,
        error: `Vehicle not found for IMEI ${args.imei}`,
      };
    }

    const timestamp = args.timestamp
      ? new Date(args.timestamp).getTime()
      : Date.now();

    // Actualizar posición y datos GPS
    await ctx.db.patch(vehicle._id, {
      gps_latitud: args.lat,
      gps_longitud: args.lng,
      gps_velocidad: args.speed,
      gps_rumbo: args.heading,
      gps_altitud: args.altitude,
      gps_precision: args.precision,
      gps_satelites: args.satellites,
      gps_ultima_actualizacion: args.timestamp || new Date().toISOString(),
      gps_conectado: true,
    });

    // Guardar en historial de ubicaciones
    await ctx.db.insert("vehicle_location_history", {
      vehiculo_id: vehicle._id,
      timestamp,
      gps_latitud: args.lat,
      gps_longitud: args.lng,
      gps_velocidad: args.speed,
      gps_rumbo: args.heading,
      gps_altitud: args.altitude,
      gps_precision: args.precision,
      gps_satelites: args.satellites,
      source: "obd", // GPS tracker OBD directo
    });

    console.log(
      `✅ GPS actualizado: ${vehicle.placa} (IMEI ${args.imei}) -> [${args.lat}, ${args.lng}] @ ${args.speed || 0} km/h`
    );

    return {
      success: true,
      vehicleId: vehicle._id,
      placa: vehicle.placa,
    };
  },
});

/**
 * Mutation: Actualizar manualmente posición GPS de un vehículo
 * (Para uso desde el frontend)
 */
export const updateManualGPS = mutation({
  args: {
    vehicleId: v.id("vehiculos"),
    lat: v.number(),
    lng: v.number(),
    speed: v.optional(v.number()),
    heading: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { vehicleId, lat, lng, speed, heading } = args;

    const timestamp = Date.now();

    await ctx.db.patch(vehicleId, {
      gps_latitud: lat,
      gps_longitud: lng,
      gps_velocidad: speed,
      gps_rumbo: heading,
      gps_ultima_actualizacion: new Date().toISOString(),
      gps_conectado: true,
    });

    // Guardar en historial
    await ctx.db.insert("vehicle_location_history", {
      vehiculo_id: vehicleId,
      timestamp,
      gps_latitud: lat,
      gps_longitud: lng,
      gps_velocidad: speed,
      gps_rumbo: heading,
      source: "manual",
    });

    console.log(`📍 Posición GPS actualizada manualmente: ${vehicleId} -> [${lat}, ${lng}]`);

    return { success: true };
  },
});

/**
 * Mutation: Configurar dispositivo GPS en un vehículo
 */
export const configureGPS = mutation({
  args: {
    vehicleId: v.id("vehiculos"),
    imei: v.string(),
    protocolo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { vehicleId, imei, protocolo } = args;

    // Verificar que no exista otro vehículo con el mismo IMEI
    const existingVehicle = await ctx.db
      .query("vehiculos")
      .withIndex("by_gps_imei", (q) => q.eq("gps_imei", imei))
      .first();

    if (existingVehicle && existingVehicle._id !== vehicleId) {
      return {
        success: false,
        error: `IMEI ${imei} ya está asignado al vehículo ${existingVehicle.placa}`,
      };
    }

    await ctx.db.patch(vehicleId, {
      gps_imei: imei,
      gps_protocolo: protocolo || "GT06", // Protocolo por defecto
      gps_conectado: false, // Inicia como desconectado hasta recibir primer dato
    });

    console.log(`🔧 GPS configurado: Vehículo ${vehicleId} -> IMEI ${imei} (${protocolo || "GT06"})`);

    return { success: true };
  },
});

/**
 * Mutation: Limpiar coordenadas GPS (mantiene configuración IMEI)
 */
export const clearGPSCoordinates = mutation({
  args: {
    vehicleId: v.id("vehiculos"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.vehicleId, {
      gps_latitud: undefined,
      gps_longitud: undefined,
      gps_conectado: false,
      gps_ultima_actualizacion: undefined,
      gps_velocidad: undefined,
      gps_rumbo: undefined,
      gps_altitud: undefined,
      gps_precision: undefined,
      gps_satelites: undefined,
    });

    console.log(`🧹 Coordenadas GPS limpiadas del vehículo ${args.vehicleId}`);

    return { success: true };
  },
});

/**
 * Mutation: Remover configuración GPS de un vehículo
 */
export const removeGPS = mutation({
  args: {
    vehicleId: v.id("vehiculos"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.vehicleId, {
      gps_imei: undefined,
      gps_protocolo: undefined,
      gps_conectado: false,
      gps_ultima_actualizacion: undefined,
      gps_velocidad: undefined,
      gps_rumbo: undefined,
      gps_altitud: undefined,
      gps_precision: undefined,
      gps_satelites: undefined,
    });

    console.log(`🔌 GPS removido del vehículo ${args.vehicleId}`);

    return { success: true };
  },
});

/**
 * Query: Obtener vehículos con GPS activo
 */
export const getVehiclesWithGPS = query({
  handler: async (ctx) => {
    const vehicles = await ctx.db
      .query("vehiculos")
      .filter((q) => q.neq(q.field("gps_imei"), undefined))
      .collect();

    return vehicles.map((v) => ({
      _id: v._id,
      placa: v.placa,
      marca: v.marca,
      modelo: v.modelo,
      gps_imei: v.gps_imei,
      gps_protocolo: v.gps_protocolo,
      gps_conectado: v.gps_conectado,
      gps_ultima_actualizacion: v.gps_ultima_actualizacion,
      gps_latitud: v.gps_latitud,
      gps_longitud: v.gps_longitud,
      gps_velocidad: v.gps_velocidad,
    }));
  },
});

/**
 * Query: Obtener estado de conexión GPS de todos los vehículos
 */
export const getGPSStatus = query({
  handler: async (ctx) => {
    const vehicles = await ctx.db.query("vehiculos").collect();

    const now = Date.now();
    const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos

    return vehicles
      .filter((v) => v.gps_imei) // Solo vehículos con GPS configurado
      .map((v) => {
        const lastUpdate = v.gps_ultima_actualizacion
          ? new Date(v.gps_ultima_actualizacion).getTime()
          : 0;

        const isConnected = lastUpdate > 0 && now - lastUpdate < TIMEOUT_MS;

        return {
          vehicleId: v._id,
          placa: v.placa,
          gps_imei: v.gps_imei,
          gps_conectado: isConnected,
          gps_ultima_actualizacion: v.gps_ultima_actualizacion,
          minutesSinceLastUpdate: lastUpdate > 0 ? Math.floor((now - lastUpdate) / 60000) : null,
          posicion: v.gps_latitud && v.gps_longitud
            ? { lat: v.gps_latitud, lng: v.gps_longitud }
            : null,
          velocidad: v.gps_velocidad,
          satelites: v.gps_satelites,
        };
      });
  },
});

/**
 * Query: Obtener vehículos sin señal GPS (desconectados)
 */
export const getDisconnectedVehicles = query({
  handler: async (ctx) => {
    const vehicles = await ctx.db
      .query("vehiculos")
      .filter((q) => q.neq(q.field("gps_imei"), undefined))
      .collect();

    const now = Date.now();
    const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos

    return vehicles
      .filter((v) => {
        const lastUpdate = v.gps_ultima_actualizacion
          ? new Date(v.gps_ultima_actualizacion).getTime()
          : 0;

        return lastUpdate === 0 || now - lastUpdate >= TIMEOUT_MS;
      })
      .map((v) => ({
        vehicleId: v._id,
        placa: v.placa,
        gps_imei: v.gps_imei,
        gps_ultima_actualizacion: v.gps_ultima_actualizacion,
      }));
  },
});

/**
 * Mutation: Marcar vehículos como desconectados si no han reportado en 5 minutos
 * (Esta función puede ser llamada periódicamente por un cron job)
 */
export const updateConnectionStatus = mutation({
  handler: async (ctx) => {
    const vehicles = await ctx.db
      .query("vehiculos")
      .filter((q) => q.neq(q.field("gps_imei"), undefined))
      .collect();

    const now = Date.now();
    const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos

    let disconnectedCount = 0;

    for (const vehicle of vehicles) {
      const lastUpdate = vehicle.gps_ultima_actualizacion
        ? new Date(vehicle.gps_ultima_actualizacion).getTime()
        : 0;

      const isConnected = lastUpdate > 0 && now - lastUpdate < TIMEOUT_MS;

      if (vehicle.gps_conectado !== isConnected) {
        await ctx.db.patch(vehicle._id, {
          gps_conectado: isConnected,
        });

        if (!isConnected) {
          disconnectedCount++;
          console.log(`⚠️ GPS desconectado: ${vehicle.placa} (IMEI ${vehicle.gps_imei})`);
        }
      }
    }

    return {
      checked: vehicles.length,
      disconnected: disconnectedCount,
    };
  },
});
