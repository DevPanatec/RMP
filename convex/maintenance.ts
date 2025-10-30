import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ========== MAINTENANCE TASKS ==========
export const listTasks = query({
  handler: async (ctx) => {
    return await ctx.db.query("maintenance_tasks").collect();
  },
});

export const getTasksByVehiculo = query({
  args: { vehiculo_id: v.id("vehiculos") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("maintenance_tasks")
      .withIndex("by_vehiculo", (q) => q.eq("vehiculo_id", args.vehiculo_id))
      .collect();
  },
});

export const getTasksByEstado = query({
  args: { estado: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("maintenance_tasks")
      .withIndex("by_estado", (q) => q.eq("estado", args.estado))
      .collect();
  },
});

export const addTask = mutation({
  args: {
    vehiculo_id: v.optional(v.id("vehiculos")),
    titulo: v.string(),
    descripcion: v.optional(v.string()),
    tipo: v.string(),
    prioridad: v.string(),
    fecha_programada: v.optional(v.string()),
    costo: v.optional(v.number()),
    mecanico: v.optional(v.string()),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("maintenance_tasks", {
      ...args,
      estado: "pendiente",
    });
  },
});

export const updateTask = mutation({
  args: {
    id: v.id("maintenance_tasks"),
    descripcion: v.optional(v.string()),
    estado: v.optional(v.string()),
    fecha_completada: v.optional(v.string()),
    costo: v.optional(v.number()),
    mecanico: v.optional(v.string()),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

export const deleteTask = mutation({
  args: { id: v.id("maintenance_tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

// ========== MAINTENANCE ALERTS ==========
export const listAlerts = query({
  handler: async (ctx) => {
    return await ctx.db.query("maintenance_alerts").collect();
  },
});

export const getUnreadAlerts = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("maintenance_alerts")
      .withIndex("by_leida", (q) => q.eq("leida", false))
      .collect();
  },
});

export const getAlertsByVehiculo = query({
  args: { vehiculo_id: v.id("vehiculos") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("maintenance_alerts")
      .withIndex("by_vehiculo", (q) => q.eq("vehiculo_id", args.vehiculo_id))
      .collect();
  },
});

export const addAlert = mutation({
  args: {
    task_id: v.optional(v.id("maintenance_tasks")),
    vehiculo_id: v.optional(v.id("vehiculos")),
    tipo_alerta: v.string(),
    mensaje: v.string(),
    severidad: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("maintenance_alerts", {
      ...args,
      fecha_generada: new Date().toISOString(),
      leida: false,
    });
  },
});

export const markAsRead = mutation({
  args: { id: v.id("maintenance_alerts") },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, { leida: true });
  },
});

export const deleteAlert = mutation({
  args: { id: v.id("maintenance_alerts") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});
