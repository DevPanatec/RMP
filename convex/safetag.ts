import { v } from "convex/values";
import { query, mutation, action, internalAction, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getAuthScope, requireAdminWrite, requireOrgAccess } from "./lib/auth";

// Configuración
const SAFETAG_API_BASE = "https://api.safetagtracking.com/api/v1";

// Type definitions basados en la documentación de SafeTag
interface SafeTagDevice {
  _id: string; // IMEI/Serial
  prefs: {
    name: string;
  };
  status: {
    coords: {
      lat: number;
      lon: number;
    };
    location: string; // String format: "lat,lon"
    speed: number; // KPH
    course: number; // Heading (0-359 degrees)
    last_updated: string; // ISO timestamp
    battery?: number; // Battery percentage
    signal?: number; // Signal strength
    charge?: boolean; // Charging status
  };
}

/**
 * Action para obtener devices desde SafeTag API
 * Hace fetch externo a la API de SafeTag
 */
export const fetchDevices = internalAction({
  args: {},
  handler: async (ctx): Promise<SafeTagDevice[]> => {
    const apiKey = process.env.SAFETAG_API_KEY;
    const username = process.env.SAFETAG_USERNAME;

    if (!apiKey || !username) {
      throw new Error(
        "SafeTag API credentials not configured. Set SAFETAG_API_KEY and SAFETAG_USERNAME in Convex environment variables."
      );
    }

    console.log("🔑 Calling SafeTag API for user:", username);

    const response = await fetch(`${SAFETAG_API_BASE}/devices/${username}`, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ SafeTag API error:", response.status, error);
      throw new Error(`SafeTag API error: ${response.status} ${error}`);
    }

    const data = await response.json();

    console.log("📦 Raw API response type:", typeof data);
    console.log("📦 Is array?", Array.isArray(data));
    console.log("📦 Raw data keys:", data ? Object.keys(data).join(", ") : "null");
    console.log("📦 Full response (first 500 chars):", JSON.stringify(data).substring(0, 500));

    // SafeTag API puede devolver un objeto o un array
    let devices: SafeTagDevice[] = [];

    if (Array.isArray(data)) {
      // Si es un array, usar directamente
      devices = data;
      console.log("✅ Parseado como array");
    } else if (data && typeof data === 'object') {
      // Si es un objeto único, ponerlo en array
      if (data._id) {
        // Es un dispositivo único
        console.log("✅ Parseado como dispositivo único");
        devices = [data];
      } else {
        // Es un objeto con múltiples dispositivos, convertir a array
        console.log("✅ Parseado como objeto con múltiples devices");
        const values = Object.values(data);
        console.log("   Valores encontrados:", values.length);
        devices = values.filter(v => v && typeof v === 'object' && '_id' in v);
        console.log("   Devices válidos después de filtrar:", devices.length);
      }
    }

    console.log("✅ SafeTag devices fetched:", devices.length);

    if (devices.length > 0) {
      console.log("📋 Device IDs:", devices.map(d => d._id).join(", "));
      console.log("📍 First device:", devices[0]._id, "-", devices[0].prefs?.name);
    } else {
      console.error("❌ NO SE ENCONTRARON DEVICES. Revisa el formato de respuesta arriba.");
    }

    return devices;
  },
});

/**
 * Internal mutation: actualizar vehículo con datos de SafeTag.
 * Solo callable desde la action syncAllVehicles (cron) — no expuesta al cliente.
 */
export const updateVehicleFromSafeTag = internalMutation({
  args: {
    vehiculoId: v.id("vehiculos"),
    deviceData: v.object({
      _id: v.string(),
      name: v.string(),
      latitude: v.number(),
      longitude: v.number(),
      speed: v.number(),
      course: v.number(),
      last_updated: v.string(),
      battery: v.optional(v.number()),
      signal: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const { vehiculoId, deviceData } = args;

    // Obtener datos actuales del vehículo
    const currentVehicle = await ctx.db.get(vehiculoId);
    if (!currentVehicle) {
      console.error("❌ Vehículo no encontrado:", vehiculoId);
      return;
    }

    const currentLat = currentVehicle.gps_latitud;
    const currentLng = currentVehicle.gps_longitud;
    const newLat = deviceData.latitude;
    const newLng = deviceData.longitude;

    // Calcular si el vehículo se movió (diferencia > 0.0001 grados ≈ 11 metros)
    const MOVEMENT_THRESHOLD = 0.0001;
    const hasMoved = 
      currentLat === undefined || 
      currentLng === undefined ||
      Math.abs(newLat - currentLat) > MOVEMENT_THRESHOLD ||
      Math.abs(newLng - currentLng) > MOVEMENT_THRESHOLD ||
      deviceData.speed > 0;

    // Solo actualizar timestamp si el vehículo SE MOVIÓ
    const timestamp = hasMoved ? Date.now() : (currentVehicle.gps_ultima_actualizacion || Date.now());
    
    // Log para debug
    if (hasMoved) {
      console.log(`🚗 ${deviceData.name} SE MOVIÓ - Actualizando timestamp`);
    } else {
      console.log(`⏸️  ${deviceData.name} SIN MOVIMIENTO - Manteniendo timestamp anterior`);
    }

    // Timestamp original de SafeTag
    const safetagTimestamp = new Date(deviceData.last_updated).getTime();

    // Verificar si el dato de SafeTag es reciente (< 5 minutos)
    const now = Date.now();
    const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos
    const isConnected = (now - safetagTimestamp) < TIMEOUT_MS;

    await ctx.db.patch(vehiculoId, {
      safetag_device_id: deviceData._id,
      safetag_device_name: deviceData.name,
      gps_latitud: deviceData.latitude,
      gps_longitud: deviceData.longitude,
      gps_velocidad: deviceData.speed,
      gps_rumbo: deviceData.course,
      gps_ultima_actualizacion: timestamp, // ← SOLO actualiza si se movió
      safetag_timestamp: safetagTimestamp, // Timestamp original de SafeTag
      gps_bateria: deviceData.battery,
      gps_senal: deviceData.signal,
      gps_en_linea: isConnected,
      gps_conectado: isConnected, // ← Ahora depende de si el dato es fresco
    });

    // Solo guardar en historial si el vehículo SE MOVIÓ (evitar duplicados)
    if (hasMoved) {
      await ctx.db.insert("vehicle_location_history", {
        vehiculo_id: vehiculoId,
        timestamp, // ← Timestamp NUESTRO para orden correcto
        gps_latitud: deviceData.latitude,
        gps_longitud: deviceData.longitude,
        gps_velocidad: deviceData.speed,
        gps_rumbo: deviceData.course,
        source: "safetag",
        safetag_timestamp: safetagTimestamp,
      });
      console.log(`✅ Vehículo ${vehiculoId} actualizado + historial guardado`);
    } else {
      console.log(`✅ Vehículo ${vehiculoId} actualizado (sin movimiento, sin historial)`);
    }

    // Verificar geofences (se hace siempre, no solo cuando hay movimiento)
    // Esto se hace en el action principal para evitar anidación de mutations

    return { success: true };
  },
});

/**
 * Action principal: Sincronizar todos los vehículos con SafeTag
 * Esta función se ejecuta automáticamente cada minuto vía cron job
 */
export const syncAllVehicles = action({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Iniciando sincronización SafeTag...");

    try {
      // 1. Obtener devices desde SafeTag API
      const devices = await ctx.runAction(internal.safetag.fetchDevices);

      // 2. Obtener vehículos con SafeTag configurado
      const vehiculos = await ctx.runQuery(api.safetag.getVehiclesWithSafeTag);

      if (vehiculos.length === 0) {
        console.log(
          "⚠️ No hay vehículos con SafeTag configurado. Vincular devices primero."
        );
        return [];
      }

      console.log(`📋 Vehículos a sincronizar: ${vehiculos.length}`);
      console.log(`🛰️ Devices disponibles en SafeTag: ${devices.length}`);

      const results = [];

      // 3. Actualizar cada vehículo
      for (const vehiculo of vehiculos) {
        try {
          console.log(`🔍 Buscando device ${vehiculo.safetag_device_id} para vehículo ${vehiculo.placa}`);

          // Buscar device correspondiente
          const device = devices.find(
            (d) => d._id === vehiculo.safetag_device_id
          );

          if (!device) {
            console.warn(
              `⚠️ Device ${vehiculo.safetag_device_id} NOT found in SafeTag`
            );
            console.warn(
              `🔍 Devices disponibles:`,
              devices.map(d => `${d._id} (${d.prefs?.name})`).join(", ")
            );
            results.push({
              vehiculoId: vehiculo._id,
              placa: vehiculo.placa,
              success: false,
              error: "Device not found in SafeTag",
            });
            continue;
          }

          // Actualizar vehículo con datos del device
          await ctx.runMutation(internal.safetag.updateVehicleFromSafeTag, {
            vehiculoId: vehiculo._id,
            deviceData: {
              _id: device._id,
              name: device.prefs.name,
              latitude: device.status.coords.lat,
              longitude: device.status.coords.lon,
              speed: device.status.speed,
              course: device.status.course,
              last_updated: device.status.last_updated,
              battery: device.status.battery,
              signal: device.status.signal,
            },
          });

          // Verificar geofences para este vehículo
          try {
            await ctx.runMutation(internal.geofences.checkVehicleGeofences, {
              vehiculoId: vehiculo._id,
              latitud: device.status.coords.lat,
              longitud: device.status.coords.lon,
            });
          } catch (geoError) {
            console.warn(`⚠️ Error verificando geofences para ${vehiculo.placa}:`, geoError);
          }

          results.push({
            vehiculoId: vehiculo._id,
            placa: vehiculo.placa,
            success: true,
            location: {
              lat: device.status.coords.lat,
              lng: device.status.coords.lon,
            },
          });
        } catch (error: any) {
          console.error(
            `❌ Error actualizando vehículo ${vehiculo.placa}:`,
            error
          );
          results.push({
            vehiculoId: vehiculo._id,
            placa: vehiculo.placa,
            success: false,
            error: error.message,
          });
        }
      }

      const successful = results.filter((r) => r.success).length;
      console.log(
        `✅ Sincronización completa: ${successful}/${results.length} exitosos`
      );

      return results;
    } catch (error: any) {
      console.error("❌ Error en sincronización SafeTag:", error);
      throw error;
    }
  },
});

/**
 * Query: Obtener vehículos con SafeTag configurado
 */
export const getVehiclesWithSafeTag = query({
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    const vehicles = await ctx.db
      .query("vehiculos")
      .filter((q) => q.neq(q.field("safetag_device_id"), undefined))
      .collect();
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) return vehicles;
    if (!scope.organizacionId) return [];
    return vehicles.filter((v) => v.organizacion_id === scope.organizacionId);
  },
});

/**
 * Query: Estado de sincronización
 */
export const getSyncStatus = query({
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    let vehiculos = await ctx.db
      .query("vehiculos")
      .filter((q) => q.neq(q.field("safetag_device_id"), undefined))
      .collect();
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      if (!scope.organizacionId) return [];
      vehiculos = vehiculos.filter((v) => v.organizacion_id === scope.organizacionId);
    }

    return vehiculos.map((v) => ({
      vehiculoId: v._id,
      placa: v.placa,
      marca: v.marca,
      modelo: v.modelo,
      safetagDeviceId: v.safetag_device_id,
      safetagDeviceName: v.safetag_device_name,
      posicion: {
        lat: v.gps_latitud,
        lng: v.gps_longitud,
      },
      velocidad: v.gps_velocidad,
      rumbo: v.gps_rumbo,
      bateria: v.gps_bateria,
      senal: v.gps_senal,
      enLinea: v.gps_en_linea,
      ultimaActualizacion: v.gps_ultima_actualizacion,
    }));
  },
});

/**
 * Mutation: Asociar device SafeTag con vehículo. Auth: admin de la org del vehículo o super_admin.
 */
export const linkDeviceToVehicle = mutation({
  args: {
    vehiculoId: v.id("vehiculos"),
    safetagDeviceId: v.string(),
    deviceName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    const veh = await ctx.db.get(args.vehiculoId);
    if (!veh) throw new Error("Vehículo no encontrado");
    if (!veh.organizacion_id) throw new Error("Vehículo sin organización — requiere migración");
    await requireOrgAccess(ctx, veh.organizacion_id);

    await ctx.db.patch(args.vehiculoId, {
      safetag_device_id: args.safetagDeviceId,
      safetag_device_name: args.deviceName,
    });

    return { success: true };
  },
});

/**
 * Action: Obtener historial de ubicaciones con rango de fechas
 */
export const fetchLocationHistory = action({
  args: {
    deviceId: v.string(),
    startDate: v.optional(v.string()), // ISO timestamp
    endDate: v.optional(v.string()), // ISO timestamp
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No autenticado");
    const apiKey = process.env.SAFETAG_API_KEY;
    const username = process.env.SAFETAG_USERNAME;

    console.log("🔧 fetchLocationHistory called with:", {
      deviceId: args.deviceId,
      startDate: args.startDate,
      endDate: args.endDate,
    });

    if (!apiKey || !username) {
      console.error("❌ SafeTag credentials missing!");
      throw new Error("SafeTag API credentials not configured");
    }

    console.log("🔑 Using credentials - Username:", username, "API Key length:", apiKey.length);

    // Construir URL con parámetros opcionales
    let url = `${SAFETAG_API_BASE}/locations/range/${username}/${args.deviceId}`;
    const params = new URLSearchParams();

    if (args.startDate) {
      params.append('start', args.startDate);
    }
    if (args.endDate) {
      params.append('end', args.endDate);
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    console.log("📍 Fetching location history:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ SafeTag history error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Error SafeTag API (${response.status}): ${errorText || response.statusText}`);
    }

    const locations = await response.json();
    const distance = response.headers.get("Distance"); // Total KM

    console.log(`✅ Fetched ${Array.isArray(locations) ? locations.length : 0} location points`);

    if (!Array.isArray(locations)) {
      console.error("❌ Response is not an array:", typeof locations, JSON.stringify(locations).substring(0, 200));
    }

    if (Array.isArray(locations) && locations.length > 0) {
      console.log("📍 First location point:", locations[0]);
      console.log("📍 Last location point:", locations[locations.length - 1]);
    } else {
      console.warn("⚠️ No location points returned for device", args.deviceId);
    }

    return {
      locations: Array.isArray(locations) ? locations : [],
      totalDistance: distance ? parseFloat(distance) : null,
      deviceId: args.deviceId,
      startDate: args.startDate,
      endDate: args.endDate,
    };
  },
});

/**
 * Action: Obtener historial del día actual (simplificado)
 */
export const fetchTodayHistory = action({
  args: {
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No autenticado");
    // Obtener inicio y fin del día actual (UTC)
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    console.log("📅 Fetching today's history:", {
      deviceId: args.deviceId,
      start: startOfDay.toISOString(),
      end: endOfDay.toISOString(),
    });

    return await ctx.runAction(api.safetag.fetchLocationHistory, {
      deviceId: args.deviceId,
      startDate: startOfDay.toISOString(),
      endDate: endOfDay.toISOString(),
    });
  },
});
