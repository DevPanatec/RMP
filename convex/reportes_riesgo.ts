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

export const listWithDetails = query({
  handler: async (ctx) => {
    const reportes = await ctx.db
      .query("reportes_riesgo")
      .withIndex("by_fecha", (q) => q)
      .order("desc")
      .collect();

    // Hacer JOIN manual con empleados, vehiculos y rutas
    const reportesConDetalles = await Promise.all(
      reportes.map(async (reporte) => {
        // Usar campos desnormalizados si existen, sino hacer JOIN
        let conductor = reporte.conductor_nombre || "Desconocido";
        let camion = reporte.vehiculo_placa || "N/A";
        let rutaNombre = "N/A";

        // Solo hacer JOIN si no hay datos desnormalizados
        if (!reporte.conductor_nombre && reporte.empleado_reporta_id) {
          const empleado = await ctx.db.get(reporte.empleado_reporta_id);
          if (empleado) {
            conductor = `${empleado.nombre} ${empleado.apellido}`;
          }
        }

        if (!reporte.vehiculo_placa && reporte.vehiculo_id) {
          const vehiculo = await ctx.db.get(reporte.vehiculo_id);
          if (vehiculo) {
            camion = vehiculo.placa || "N/A";
          }
        }

        if (reporte.ruta_id) {
          const ruta = await ctx.db.get(reporte.ruta_id);
          if (ruta) {
            rutaNombre = ruta.nombre || "N/A";
          }
        }

        return {
          ...reporte,
          // Campos adicionales para la UI
          conductor,
          camion,
          rutaNombre,
          // Mapear campos para compatibilidad con RiskComponent
          id: reporte._id,
          tipo: reporte.tipo_riesgo === 'mecanico' || reporte.tipo_riesgo === 'combustible' ||
                reporte.tipo_riesgo === 'seguridad' || reporte.tipo_riesgo === 'mantenimiento'
                ? 'interno' : 'externo',
          categoria: reporte.tipo_riesgo,
          prioridad: reporte.nivel_severidad === 'critico' ? 'critica' :
                     reporte.nivel_severidad === 'alto' ? 'alta' :
                     reporte.nivel_severidad === 'medio' ? 'media' : 'baja',
          fechaCreacion: reporte.fecha_reporte,
          fechaActualizacion: reporte.fecha_reporte
        };
      })
    );

    return reportesConDetalles;
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
    conductor_nombre: v.optional(v.string()),
    vehiculo_placa: v.optional(v.string()),
    perfil_usuario_id: v.optional(v.id("perfiles_usuarios")),
    // Vinculación con paradas específicas
    parada_nombre: v.optional(v.string()),
    parada_orden: v.optional(v.number()),
    parada_index: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("reportes_riesgo", {
      ...args,
      fecha_reporte: new Date().toISOString(),
      estado: "reportado",
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
