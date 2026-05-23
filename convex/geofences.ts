import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthScope, requireOrgAccess, requireWriteRole } from "./lib/auth";
import { tryEmitParadaEvent } from "./route_events";

/**
 * Calcular distancia entre dos puntos GPS usando fórmula Haversine.
 * Retorna distancia en METROS (R = 6371000m). Para versión en km ver `vehicleHistory.haversineKm`.
 */
function haversineMeters(
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
 * - Super admin/cross-org viewer: todas.
 * - Admin: todas las de su org.
 * - Enterprise: solo las geofences ligadas a rutas de su proyecto.
 *   Las geofences manuales (sin ruta_id) NO las ve, ya que no podemos atribuirlas a un proyecto.
 * - Conductor: todas las de su org (necesita paradas/zonas activas para su trabajo, scoped a su org).
 */
export const list = query({
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    const all = await ctx.db
      .query("geofences")
      .withIndex("by_activo", (q) => q.eq("activo", true))
      .collect();

    if (scope.isSuperAdmin || scope.isCrossOrgViewer) return all;
    if (!scope.organizacionId) return [];

    // Strict scope a la org del caller
    const inOrg = all.filter((g) => g.organizacion_id === scope.organizacionId);

    if (!scope.isEnterprise) return inOrg; // admin + conductor: todas las de su org

    if (!scope.proyectoId) return [];

    // Enterprise: solo las ligadas a rutas de su proyecto
    const rutas = await ctx.db
      .query("rutas")
      .withIndex("by_proyecto", (q) => q.eq("proyecto_id", scope.proyectoId!))
      .collect();
    const rutaIds = new Set(rutas.map((r) => r._id));

    return inOrg.filter((g) => g.ruta_id && rutaIds.has(g.ruta_id));
  },
});

/**
 * Query: Obtener todos los geofences (incluyendo inactivos), scoped por org del usuario.
 */
export const listAll = query({
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    const all = await ctx.db.query("geofences").collect();
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) return all;
    if (!scope.organizacionId) return [];
    return all.filter((g) => g.organizacion_id === scope.organizacionId);
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
    const scope = await requireWriteRole(ctx);
    if (!scope.isSuperAdmin && !scope.organizacionId) {
      throw new Error("Sin organización asignada");
    }
    const payload: any = {
      nombre: args.nombre,
      descripcion: args.descripcion,
      latitud: args.latitud,
      longitud: args.longitud,
      radio: args.radio,
      color: args.color || "#ef4444",
      tipo: args.tipo || "ambos",
      activo: true,
      created_at: Date.now(),
    };
    if (scope.organizacionId) payload.organizacion_id = scope.organizacionId;
    const geofenceId = await ctx.db.insert("geofences", payload);

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
    await requireWriteRole(ctx);
    const geofence = await ctx.db.get(args.id);
    if (!geofence) throw new Error("Geofence no encontrado");
    if (!geofence.organizacion_id) throw new Error("Geofence sin organización — requiere migración");
    await requireOrgAccess(ctx, geofence.organizacion_id);
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
    await requireWriteRole(ctx);
    const geofence = await ctx.db.get(args.id);
    if (!geofence) throw new Error("Geofence no encontrado");
    if (!geofence.organizacion_id) throw new Error("Geofence sin organización — requiere migración");
    await requireOrgAccess(ctx, geofence.organizacion_id);

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
 * Helper: filtra alertas a las que el caller tiene acceso (vehículo de su org).
 */
async function filterAlertsByScope(ctx: any, alerts: any[]) {
  const scope = await getAuthScope(ctx);
  if (scope.isSuperAdmin || scope.isCrossOrgViewer) return alerts;
  if (!scope.organizacionId) return [];
  // Cargar vehículos para mapear org. Usamos cache simple por id.
  const vehCache = new Map<string, any>();
  const filtered: any[] = [];
  for (const alert of alerts) {
    let veh = vehCache.get(alert.vehiculo_id as string);
    if (!veh) {
      veh = await ctx.db.get(alert.vehiculo_id);
      vehCache.set(alert.vehiculo_id as string, veh);
    }
    if (veh && veh.organizacion_id === scope.organizacionId) {
      filtered.push(alert);
    }
  }
  return filtered;
}

/**
 * Query: Obtener alertas no vistas (scoped por org del vehículo).
 */
export const getUnviewedAlerts = query({
  handler: async (ctx) => {
    const alerts = await ctx.db
      .query("geofence_alerts")
      .withIndex("by_viewed", (q) => q.eq("viewed", false))
      .order("desc")
      .take(200); // Más amplio antes de filtrar por scope.

    const scoped = await filterAlertsByScope(ctx, alerts);
    const limited = scoped.slice(0, 50);

    return await Promise.all(
      limited.map(async (alert) => {
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
  },
});

/**
 * Query: Obtener alertas recientes (scoped por org del vehículo).
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
      .take(Math.max(100, limit * 5));

    const scoped = await filterAlertsByScope(ctx, alerts);
    const limited = scoped.slice(0, limit);

    return await Promise.all(
      limited.map(async (alert) => {
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
  },
});

/**
 * Mutation: Marcar alerta como vista. Auth: vehículo debe pertenecer a la org del caller.
 */
export const markAlertViewed = mutation({
  args: {
    alertId: v.id("geofence_alerts"),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    const alert = await ctx.db.get(args.alertId);
    if (!alert) throw new Error("Alerta no encontrada");
    const veh = await ctx.db.get(alert.vehiculo_id);
    if (!veh) throw new Error("Vehículo no encontrado");
    if (!veh.organizacion_id) throw new Error("Vehículo sin organización — requiere migración");
    await requireOrgAccess(ctx, veh.organizacion_id);
    await ctx.db.patch(args.alertId, { viewed: true });
    return { success: true };
  },
});

/**
 * Mutation: Marcar todas las alertas (de la org del caller) como vistas.
 */
export const markAllAlertsViewed = mutation({
  handler: async (ctx) => {
    const scope = await requireWriteRole(ctx);
    const unviewed = await ctx.db
      .query("geofence_alerts")
      .withIndex("by_viewed", (q) => q.eq("viewed", false))
      .collect();

    const filtered = scope.isSuperAdmin
      ? unviewed
      : await filterAlertsByScope(ctx, unviewed);

    for (const alert of filtered) {
      await ctx.db.patch(alert._id, { viewed: true });
    }

    return { success: true, count: filtered.length };
  },
});

/**
 * Mutation: Verificar geofences para un vehículo
 * Esta función se llama cuando se actualiza la posición GPS de un vehículo
 */
export const checkVehicleGeofences = internalMutation({
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
      const distance = haversineMeters(
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

      // Si no hay estado previo, asumimos wasInside=isInside para evitar
      // emitir alertas espurias en el primer check (no podemos saber si
      // realmente cruzó el borde — solo creamos el row de estado).
      const wasInside = previousState?.inside ?? isInside;

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

          alerts.push({
            alertId,
            geofenceId: geofence._id,
            tipoEvento,
          });
        }

        // Auto-emit parada event si el geofence es auto-generado por una ruta.
        // Solo si tiene ruta_id + parada_index (sembrado por rutas.syncParadaGeofences).
        // tryEmitParadaEvent verifica route_progress activo + idempotency interna.
        if (
          geofence.auto_generada &&
          geofence.ruta_id &&
          geofence.parada_index !== undefined &&
          geofence.parada_index !== null
        ) {
          try {
            await tryEmitParadaEvent(ctx, {
              vehiculo_id: vehiculoId,
              ruta_id: geofence.ruta_id,
              parada_index: geofence.parada_index,
              tipo_evento: isInside ? "parada_llegada" : "parada_salida",
              latitud,
              longitud,
            });
          } catch (err) {
            // Auto-emit es best-effort. No bloquear el flow de geofence si falla.
            console.warn("tryEmitParadaEvent failed:", err);
          }
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
