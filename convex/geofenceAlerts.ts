import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Query: Obtener alertas de geofence recientes
 */
export const getRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    const alerts = await ctx.db
      .query("geofence_alerts")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);

    return alerts;
  },
});

/**
 * Query: Obtener alertas por vehículo
 */
export const getByVehicle = query({
  args: {
    vehiculoId: v.id("vehiculos"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    const alerts = await ctx.db
      .query("geofence_alerts")
      .withIndex("by_vehiculo")
      .filter((q) => q.eq(q.field("vehiculo_id"), args.vehiculoId))
      .order("desc")
      .take(limit);

    return alerts;
  },
});

/**
 * Mutation: Crear alerta desde webhook de SafeTag
 * 
 * Llamada desde http.ts cuando llega webhook con categoría de geofence
 */
export const createFromWebhook = mutation({
  args: {
    device_id: v.string(),
    timestamp: v.string(),
    category: v.string(),
    alert: v.object({
      title: v.string(),
      body: v.optional(v.string()),
      location: v.optional(v.string()),
      speed: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    console.log(`🚨 [Geofence Alert] Procesando alerta: ${args.category}`);

    // Buscar el vehículo por IMEI
    const vehicle = await ctx.db
      .query("vehiculos")
      .withIndex("by_gps_imei", (q) => q.eq("gps_imei", args.device_id))
      .first();

    if (!vehicle) {
      // Intentar buscar por safetag_device_id
      const vehicleByDeviceId = await ctx.db
        .query("vehiculos")
        .withIndex("by_safetag_device", (q) => q.eq("safetag_device_id", args.device_id))
        .first();

      if (!vehicleByDeviceId) {
        console.warn(`⚠️ [Geofence Alert] Vehículo no encontrado para IMEI: ${args.device_id}`);
        return {
          success: false,
          error: `Vehicle not found for device_id: ${args.device_id}`,
        };
      }

      // Crear alerta con vehicleByDeviceId
      const alertId = await ctx.db.insert("geofence_alerts", {
        vehiculo_id: vehicleByDeviceId._id,
        device_id: args.device_id,
        timestamp: new Date(args.timestamp).getTime(),
        category: args.category,
        alert_title: args.alert.title,
        alert_body: args.alert.body,
        location: args.alert.location,
        speed: args.alert.speed,
        viewed: false,
      });

      console.log(`✅ [Geofence Alert] Alerta creada: ${vehicleByDeviceId.placa} - ${args.category}`);

      return {
        success: true,
        alertId,
        vehiculoId: vehicleByDeviceId._id,
      };
    }

    // Crear alerta
    const alertId = await ctx.db.insert("geofence_alerts", {
      vehiculo_id: vehicle._id,
      device_id: args.device_id,
      timestamp: new Date(args.timestamp).getTime(),
      category: args.category,
      alert_title: args.alert.title,
      alert_body: args.alert.body,
      location: args.alert.location,
      speed: args.alert.speed,
      viewed: false,
    });

    console.log(`✅ [Geofence Alert] Alerta creada: ${vehicle.placa} - ${args.category}`);

    return {
      success: true,
      alertId,
      vehiculoId: vehicle._id,
    };
  },
});

/**
 * Mutation: Marcar alerta como vista
 */
export const markAsViewed = mutation({
  args: {
    alertId: v.id("geofence_alerts"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, {
      viewed: true,
    });

    return { success: true };
  },
});
