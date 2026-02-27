import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create route event
export const add = mutation({
  args: {
    ruta_id: v.optional(v.id("rutas")),
    asignacion_id: v.optional(v.id("asignaciones_rutas")),
    conductor_id: v.optional(v.id("perfiles_usuarios")),
    conductor_nombre: v.string(),
    vehiculo_id: v.optional(v.id("vehiculos")),
    vehiculo_placa: v.string(),
    ruta_nombre: v.string(),
    tipo_evento: v.union(
      v.literal("ruta_iniciada"),
      v.literal("parada_llegada"),
      v.literal("parada_salida"),
      v.literal("parada_completada"),
      v.literal("ruta_completada"),
      v.literal("ruta_pausada"),
      v.literal("ruta_reanudada"),
      v.literal("ruta_terminada_anticipadamente")
    ),
    parada_nombre: v.optional(v.string()),
    parada_orden: v.optional(v.float64()),
    parada_index: v.optional(v.float64()),
    categoria_carga: v.optional(v.string()),
    gps_latitud: v.optional(v.float64()),
    gps_longitud: v.optional(v.float64()),
    detalles: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const eventData: any = {
      ...args,
      timestamp: new Date().toISOString(),
    };

    return await ctx.db.insert("route_events", eventData);
  },
});

// Get events for a specific route/assignment
export const getByAssignment = query({
  args: { asignacion_id: v.id("asignaciones_rutas") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("route_events")
      .filter((q) => q.eq(q.field("asignacion_id"), args.asignacion_id))
      .order("desc")
      .collect();
  },
});

// Get events for a specific route
export const getByRoute = query({
  args: { ruta_id: v.id("rutas") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("route_events")
      .filter((q) => q.eq(q.field("ruta_id"), args.ruta_id))
      .order("desc")
      .collect();
  },
});

// Get recent events (for activity feed)
export const getRecent = query({
  args: { limit: v.optional(v.float64()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("route_events")
      .order("desc")
      .take(limit);
  },
});

// Get events by conductor
export const getByConductor = query({
  args: { conductor_id: v.id("perfiles_usuarios") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("route_events")
      .filter((q) => q.eq(q.field("conductor_id"), args.conductor_id))
      .order("desc")
      .collect();
  },
});

// Get events for today
export const getToday = query({
  handler: async (ctx) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    return await ctx.db
      .query("route_events")
      .filter((q) => q.gte(q.field("timestamp"), todayISO))
      .order("desc")
      .collect();
  },
});
