import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthScope } from "./lib/auth";

/**
 * Calcular distancia entre dos puntos GPS usando fórmula Haversine
 * Retorna distancia en metros
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Query: Obtener geofences activos.
 * - Admin: todas.
 * - Enterprise: solo las geofences ligadas a rutas de su proyecto.
 *   Las geofences manuales (sin ruta_id) NO las ve, ya que no podemos atribuirlas a un proyecto.
 * - Conductor: todas (necesita las paradas/zonas activas para su trabajo).
 */
export const list = query({
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    const all = await ctx.db
      .query("geofences")
      .withIndex("by_activo", (q) => q.eq("activo", true))
      .collect();

    if (!scope.isEnterprise) return all;
    if (!scope.proyectoId) return [];

    // Construir set de ruta_ids del proyecto del enterprise
    const rutas = await ctx.db
      .query("rutas")
      .withIndex("by_proyecto", (q) => q.eq("proyecto_id", scope.proyectoId!))
      .collect();
    const rutaIds = new Set(rutas.map((r) => r._id));

    return all.filter((g) => g.ruta_id && rutaIds.has(g.ruta_id));
  },
});

/**
 * Query: Obtener todos los geofences (incluyendo inactivos)
 */
export const listAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("geofences").collect();
  },
});

/**
 * Mutation: Crear nuevo geofence
 */
export const create = mutation({
  args: {
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    latitud: v.number(),
    longitud: v.number(),
    radio: v.number(), // en metros
    color: v.optional(v.string()),
    tipo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const geofenceId = await ctx.db.insert("geofences", {
      nombre: args.nombre,
      descripcion: args.descripcion,
      latitud: args.latitud,
      longitud: args.longitud,
      radio: args.radio,
      color: args.color || "#ef4444",
      tipo: args.tipo || "ambos",
      activo: true,
      created_at: Date.now(),
    });

    console.log(`✅ Geofence creado: ${args.nombre} (radio: ${args.radio}m)`);

    return { success: true, geofenceId };
  },
});

/**
 * Mutation: Actualizar geofence
 */
export const update = mutation({
  args: {
    id: v.id("geofences"),
    nombre: v.optional(v.string()),
    descripcion: v.optional(v.string()),
    latitud: v.optional(v.number()),
    longitud: v.optional(v.number()),
    radio: v.optional(v.number()),
    color: v.optional(v.string()),
    tipo: v.optional(v.string()),
    activo: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return { success: true };
  },
});

/**
 * Mutation: Eliminar geofence
 */
export const remove = mutation({
  args: {
    id: v.id("geofences"),
  },
  handler: async (ctx, args) => {
    // Eliminar estados relacionados
    const states = await ctx.db
      .query("vehicle_geofence_state")
      .withIndex("by_geofence", (q) => q.eq("geofence_id", args.id))
      .collect();
    
    for (const state of states) {
      await ctx.db.delete(state._id);
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Query: Obtener alertas no vistas
 */
export const getUnviewedAlerts = query({
  handler: async (ctx) => {
    const alerts = await ctx.db
      .query("geofence_alerts")
      .withIndex("by_viewed", (q) => q.eq("viewed", false))
      .order("desc")
      .take(50);

    // Enriquecer con datos del vehículo y geofence
    const enrichedAlerts = await Promise.all(
      alerts.map(async (alert) => {
        const vehicle = await ctx.db.get(alert.vehiculo_id);
        const geofence = alert.geofence_id ? await ctx.db.get(alert.geofence_id) : null;

        return {
          ...alert,
          vehiculo_placa: vehicle?.placa || "Desconocido",
          vehiculo_marca: vehicle?.marca,
          vehiculo_modelo: vehicle?.modelo,
          geofence_nombre: geofence?.nombre || alert.alert_title || "Zona",
        };
      })
    );

    return enrichedAlerts;
  },
});

/**
 * Query: Obtener alertas recientes (vistas y no vistas)
 */
export const getRecentAlerts = query({
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

    // Enriquecer con datos del vehículo y geofence
    const enrichedAlerts = await Promise.all(
      alerts.map(async (alert) => {
        const vehicle = await ctx.db.get(alert.vehiculo_id);
        const geofence = alert.geofence_id ? await ctx.db.get(alert.geofence_id) : null;

        return {
          ...alert,
          vehiculo_placa: vehicle?.placa || "Desconocido",
          vehiculo_marca: vehicle?.marca,
          vehiculo_modelo: vehicle?.modelo,
          geofence_nombre: geofence?.nombre || alert.alert_title || "Zona",
        };
      })
    );

    return enrichedAlerts;
  },
});

/**
 * Mutation: Marcar alerta como vista
 */
export const markAlertViewed = mutation({
  args: {
    alertId: v.id("geofence_alerts"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, { viewed: true });
    return { success: true };
  },
});

/**
 * Mutation: Marcar todas las alertas como vistas
 */
export const markAllAlertsViewed = mutation({
  handler: async (ctx) => {
    const unviewed = await ctx.db
      .query("geofence_alerts")
      .withIndex("by_viewed", (q) => q.eq("viewed", false))
      .collect();

    for (const alert of unviewed) {
      await ctx.db.patch(alert._id, { viewed: true });
    }

    return { success: true, count: unviewed.length };
  },
});

/**
 * Mutation: Verificar geofences para un vehículo
 * Esta función se llama cuando se actualiza la posición GPS de un vehículo
 */
export const checkVehicleGeofences = mutation({
  args: {
    vehiculoId: v.id("vehiculos"),
    latitud: v.number(),
    longitud: v.number(),
  },
  handler: async (ctx, args) => {
    const { vehiculoId, latitud, longitud } = args;

    // Obtener vehículo para logs
    const vehicle = await ctx.db.get(vehiculoId);
    if (!vehicle) return { success: false, error: "Vehicle not found" };

    // Obtener todos los geofences activos
    const geofences = await ctx.db
      .query("geofences")
      .withIndex("by_activo", (q) => q.eq("activo", true))
      .collect();

    const alerts: any[] = [];

    for (const geofence of geofences) {
      // Calcular distancia al centro del geofence
      const distance = haversineDistance(
        latitud,
        longitud,
        geofence.latitud,
        geofence.longitud
      );

      const isInside = distance <= geofence.radio;

      // Obtener estado anterior
      const previousState = await ctx.db
        .query("vehicle_geofence_state")
        .withIndex("by_vehiculo_geofence", (q) =>
          q.eq("vehiculo_id", vehiculoId).eq("geofence_id", geofence._id)
        )
        .first();

      const wasInside = previousState?.inside ?? false;

      // Detectar cambio de estado
      if (isInside !== wasInside) {
        const tipoEvento = isInside ? "entrada" : "salida";
        
        // Solo alertar si el tipo de geofence lo permite
        const shouldAlert =
          geofence.tipo === "ambos" ||
          (geofence.tipo === "entrada" && isInside) ||
          (geofence.tipo === "salida" && !isInside);

        if (shouldAlert) {
          // Crear alerta
          const alertId = await ctx.db.insert("geofence_alerts", {
            geofence_id: geofence._id,
            vehiculo_id: vehiculoId,
            tipo_evento: tipoEvento,
            timestamp: Date.now(),
            category: isInside ? "geofence_enter" : "geofence_exit",
            alert_title: geofence.nombre,
            alert_body: `${vehicle.placa} ha ${isInside ? "entrado a" : "salido de"} ${geofence.nombre}`,
            location: `${latitud},${longitud}`,
            speed: vehicle.gps_velocidad,
            viewed: false,
          });

          console.log(
            `🚨 [Geofence] ${vehicle.placa} ${tipoEvento.toUpperCase()} → ${geofence.nombre}`
          );

          alerts.push({
            alertId,
            geofenceId: geofence._id,
            geofenceName: geofence.nombre,
            tipoEvento,
            vehiculoPlaca: vehicle.placa,
          });
        }
      }

      // Actualizar estado
      if (previousState) {
        await ctx.db.patch(previousState._id, {
          inside: isInside,
          last_check: Date.now(),
        });
      } else {
        await ctx.db.insert("vehicle_geofence_state", {
          vehiculo_id: vehiculoId,
          geofence_id: geofence._id,
          inside: isInside,
          last_check: Date.now(),
        });
      }
    }

    return { success: true, alerts };
  },
});
