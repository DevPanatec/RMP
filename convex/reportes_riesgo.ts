import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope, getScopedProjectId, getScopedOrgId, requireOrgAccess, requireProjectAccess, requireWriteRole } from "./lib/auth";

// Internal: problemas del operador/vehiculo. Externo: entorno (afecta al cliente)
const TIPOS_INTERNOS = new Set(["mecanico", "combustible", "seguridad", "mantenimiento"]);
const isExterno = (tipo: string | undefined) => !tipo || !TIPOS_INTERNOS.has(tipo);

const tipoRiesgoValidator = v.union(
  v.literal("mecanico"),
  v.literal("combustible"),
  v.literal("seguridad"),
  v.literal("mantenimiento"),
  v.literal("bloqueo_via"),
  v.literal("seguridad_ciudadana"),
  v.literal("climatico"),
  v.literal("manifestacion"),
  v.literal("accidente"),
  v.literal("operacional"),
  v.literal("ambiental"),
  v.literal("equipo"),
);

const nivelSeveridadValidator = v.union(
  v.literal("bajo"),
  v.literal("medio"),
  v.literal("alto"),
  v.literal("critico"),
);

const estadoValidator = v.union(
  v.literal("reportado"),
  v.literal("en_revision"),
  v.literal("resuelto"),
  v.literal("pendiente"),
);

export const list = query({
  args: {
    proyecto_id: v.optional(v.id("proyectos")),
    organizacion_id: v.optional(v.id("organizaciones")),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);

    // Cross-org viewer: ve TODOS los riesgos (internos+externos) de TODAS las orgs
    if (scope.isCrossOrgViewer) {
      return await ctx.db
        .query("reportes_riesgo")
        .withIndex("by_fecha", (q) => q)
        .order("desc")
        .collect();
    }

    const scopedProject = await getScopedProjectId(ctx, args.proyecto_id ?? null);
    const scopedOrg = await getScopedOrgId(ctx, args.organizacion_id ?? null);
    let rows;
    if (scopedProject === null) {
      rows = await ctx.db
        .query("reportes_riesgo")
        .withIndex("by_fecha", (q) => q)
        .order("desc")
        .collect();
    } else {
      rows = await ctx.db
        .query("reportes_riesgo")
        .withIndex("by_proyecto", (q) => q.eq("proyecto_id", scopedProject))
        .collect();
      rows.sort((a, b) => (b.fecha_reporte || "").localeCompare(a.fecha_reporte || ""));
    }
    if (scopedProject === null && scopedOrg) {
      rows = rows.filter((r) => r.organizacion_id === scopedOrg);
    }
    if (scope.isEnterprise || scope.isViewer) {
      rows = rows.filter((r) => isExterno(r.tipo_riesgo));
    }
    return rows;
  },
});

export const listWithDetails = query({
  args: {
    proyecto_id: v.optional(v.id("proyectos")),
    organizacion_id: v.optional(v.id("organizaciones")),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    const crossOrg = scope.isCrossOrgViewer;

    let reportes;
    if (crossOrg) {
      reportes = await ctx.db
        .query("reportes_riesgo")
        .withIndex("by_fecha", (q) => q)
        .order("desc")
        .collect();
    } else {
      const scopedProject = await getScopedProjectId(ctx, args.proyecto_id ?? null);
      const scopedOrg = await getScopedOrgId(ctx, args.organizacion_id ?? null);
      if (scopedProject === null) {
        reportes = await ctx.db
          .query("reportes_riesgo")
          .withIndex("by_fecha", (q) => q)
          .order("desc")
          .collect();
      } else {
        reportes = await ctx.db
          .query("reportes_riesgo")
          .withIndex("by_proyecto", (q) => q.eq("proyecto_id", scopedProject))
          .collect();
        reportes.sort((a, b) => (b.fecha_reporte || "").localeCompare(a.fecha_reporte || ""));
      }

      if (scopedProject === null && scopedOrg) {
        reportes = reportes.filter((r) => r.organizacion_id === scopedOrg);
      }

      if (scope.isEnterprise || scope.isViewer) {
        reportes = reportes.filter((r) => isExterno(r.tipo_riesgo));
      }
    }

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
          tipo: isExterno(reporte.tipo_riesgo) ? 'externo' : 'interno',
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
  args: { nivel_severidad: nivelSeveridadValidator },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    const all = await ctx.db
      .query("reportes_riesgo")
      .withIndex("by_severidad", (q) => q.eq("nivel_severidad", args.nivel_severidad))
      .collect();
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) return all;
    if (!scope.organizacionId) return [];
    return all.filter((r) => r.organizacion_id === scope.organizacionId);
  },
});

export const add = mutation({
  args: {
    titulo: v.string(),
    descripcion: v.string(),
    tipo_riesgo: tipoRiesgoValidator,
    nivel_severidad: nivelSeveridadValidator,
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
    fotos_storage_ids: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const scope = await requireWriteRole(ctx);
    if (args.proyecto_id) await requireProjectAccess(ctx, args.proyecto_id);
    if (!scope.isSuperAdmin && !scope.organizacionId) {
      throw new Error("Sin organización asignada");
    }
    const payload: any = {
      ...args,
      fecha_reporte: new Date().toISOString(),
      estado: "reportado",
    };
    // Derivar org: scope → proyecto → vehículo (super_admin sin org).
    let orgId = scope.organizacionId;
    if (!orgId && args.proyecto_id) {
      const p = await ctx.db.get(args.proyecto_id);
      orgId = p?.organizacion_id ?? null;
    }
    if (!orgId && args.vehiculo_id) {
      const v = await ctx.db.get(args.vehiculo_id);
      orgId = v?.organizacion_id ?? null;
    }
    if (!orgId && !scope.isSuperAdmin) {
      throw new Error("No se puede crear reporte sin organización");
    }
    if (orgId) payload.organizacion_id = orgId;
    return await ctx.db.insert("reportes_riesgo", payload);
  },
});

export const update = mutation({
  args: {
    id: v.id("reportes_riesgo"),
    titulo: v.optional(v.string()),
    descripcion: v.optional(v.string()),
    estado: v.optional(estadoValidator),
    nivel_severidad: v.optional(nivelSeveridadValidator),
    tipo_riesgo: v.optional(tipoRiesgoValidator),
    ubicacion: v.optional(v.string()),
    gps_latitud: v.optional(v.number()),
    gps_longitud: v.optional(v.number()),
    prioridad: v.optional(v.number()),
    parada_nombre: v.optional(v.string()),
    parada_orden: v.optional(v.number()),
    parada_index: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    const reporte = await ctx.db.get(args.id);
    if (!reporte) throw new Error("Reporte no encontrado");
    if (reporte.organizacion_id) await requireOrgAccess(ctx, reporte.organizacion_id);
    else if (reporte.proyecto_id) await requireProjectAccess(ctx, reporte.proyecto_id);
    else throw new Error("Reporte sin proyecto ni organización — requiere migración");
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("reportes_riesgo") },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    const reporte = await ctx.db.get(args.id);
    if (!reporte) throw new Error("Reporte no encontrado");
    if (reporte.organizacion_id) await requireOrgAccess(ctx, reporte.organizacion_id);
    else if (reporte.proyecto_id) await requireProjectAccess(ctx, reporte.proyecto_id);
    else throw new Error("Reporte sin proyecto ni organización — requiere migración");
    return await ctx.db.delete(args.id);
  },
});

// One-shot: backfill organizacion_id derivando de proyecto, luego vehiculo.
export const _migrationBackfillOrganizacionId = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("reportes_riesgo").collect();
    let fixed = 0;
    for (const r of all) {
      if (r.organizacion_id != null) continue;
      let orgId = null;
      if (r.proyecto_id) {
        const p = await ctx.db.get(r.proyecto_id);
        orgId = p?.organizacion_id ?? null;
      }
      if (!orgId && r.vehiculo_id) {
        const v = await ctx.db.get(r.vehiculo_id);
        orgId = v?.organizacion_id ?? null;
      }
      if (!orgId) continue;
      await ctx.db.patch(r._id, { organizacion_id: orgId });
      fixed++;
    }
    return { fixed, total: all.length };
  },
});
