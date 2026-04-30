import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getScopedProjectId, getScopedOrgId } from "./lib/auth";

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
    let proyecto_id;
    if (args.asignacion_id) {
      const a = await ctx.db.get(args.asignacion_id);
      proyecto_id = a?.proyecto_id;
    }
    if (!proyecto_id && args.ruta_id) {
      const r = await ctx.db.get(args.ruta_id);
      proyecto_id = r?.proyecto_id;
    }
    const eventData: any = {
      ...args,
      proyecto_id,
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

// Get recent events (for activity feed). Scoped por proyecto/org según user.
export const getRecent = query({
  args: {
    limit: v.optional(v.float64()),
    proyecto_id: v.optional(v.id("proyectos")),
    organizacion_id: v.optional(v.id("organizaciones")),
  },
  handler: async (ctx, args) => {
    const scopedProject = await getScopedProjectId(ctx, args.proyecto_id ?? null);
    const limit = args.limit || 50;
    if (scopedProject) {
      return await ctx.db
        .query("route_events")
        .withIndex("by_proyecto", (q) => q.eq("proyecto_id", scopedProject))
        .order("desc")
        .take(limit);
    }
    const scopedOrg = await getScopedOrgId(ctx, args.organizacion_id ?? null);
    if (scopedOrg) {
      const all = await ctx.db
        .query("route_events")
        .order("desc")
        .take(limit * 4);
      return all
        .filter((e) => !e.organizacion_id || e.organizacion_id === scopedOrg)
        .slice(0, limit);
    }
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
