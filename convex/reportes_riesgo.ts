import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("reportes_riesgo")
      .withIndex("by_fecha", (q) => q)
      .order("desc")
      .collect();
  },
});

export const getBySeveridad = query({
  args: { nivel_severidad: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reportes_riesgo")
      .withIndex("by_severidad", (q) => q.eq("nivel_severidad", args.nivel_severidad))
      .collect();
  },
});

export const add = mutation({
  args: {
    titulo: v.string(),
    descripcion: v.string(),
    tipo_riesgo: v.string(),
    nivel_severidad: v.string(),
    ubicacion: v.optional(v.string()),
    gps_latitud: v.optional(v.number()),
    gps_longitud: v.optional(v.number()),
    empleado_reporta_id: v.optional(v.id("empleados")),
    proyecto_id: v.optional(v.id("proyectos")),
    vehiculo_id: v.optional(v.id("vehiculos")),
    ruta_id: v.optional(v.id("rutas")),
    prioridad: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("reportes_riesgo", {
      ...args,
      fecha_reporte: new Date().toISOString(),
      estado: "abierto",
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("reportes_riesgo"),
    titulo: v.optional(v.string()),
    descripcion: v.optional(v.string()),
    estado: v.optional(v.string()),
    nivel_severidad: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("reportes_riesgo") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});
