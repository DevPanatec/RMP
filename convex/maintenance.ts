import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getScopedProjectId, getAuthScope, requireOrgAccess, requireProjectAccess, requireWriteRole } from "./lib/auth";
import { incrementOrgStorage } from "./organizaciones";
import { requireModulo } from "./lib/modules";

// ========== MAINTENANCE TASKS ==========
// Admin: ve todas. Enterprise: ve las de su proyecto + las globales (proyecto_id null).
export const listTasks = query({
  args: { proyecto_id: v.optional(v.id("proyectos")) },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) {
      if (args.proyecto_id) {
        return await ctx.db
          .query("maintenance_tasks")
          .withIndex("by_proyecto", (q) => q.eq("proyecto_id", args.proyecto_id))
          .collect();
      }
      return await ctx.db.query("maintenance_tasks").collect();
    }
    if (scope.isAdmin) {
      if (!scope.organizacionId) return [];
      const orgTasks = await ctx.db
        .query("maintenance_tasks")
        .withIndex("by_organizacion", (q) => q.eq("organizacion_id", scope.organizacionId!))
        .collect();
      if (args.proyecto_id) return orgTasks.filter((t) => t.proyecto_id === args.proyecto_id);
      return orgTasks;
    }
    // Enterprise/conductor/viewer: scoped a su proyecto + globales (sin proyecto_id) de su org.
    if (!scope.organizacionId) return [];
    const orgTasks = await ctx.db
      .query("maintenance_tasks")
      .withIndex("by_organizacion", (q) => q.eq("organizacion_id", scope.organizacionId!))
      .collect();
    if (!scope.proyectoId) return orgTasks.filter((t) => !t.proyecto_id);
    return orgTasks.filter((t) => !t.proyecto_id || t.proyecto_id === scope.proyectoId);
  },
});

// Tareas atrasadas (overdue): fecha_programada pasada y estado != completada/cancelada.
// Server-side computa, así UI y backend no divergen.
export const getOverdueTasks = query({
  args: { proyecto_id: v.optional(v.id("proyectos")) },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    const today = new Date().toISOString().split("T")[0];

    let tasks: any[] = [];
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) {
      tasks = args.proyecto_id
        ? await ctx.db
            .query("maintenance_tasks")
            .withIndex("by_proyecto", (q) => q.eq("proyecto_id", args.proyecto_id))
            .collect()
        : await ctx.db.query("maintenance_tasks").collect();
    } else if (scope.organizacionId) {
      tasks = await ctx.db
        .query("maintenance_tasks")
        .withIndex("by_organizacion", (q) => q.eq("organizacion_id", scope.organizacionId!))
        .collect();
      if (args.proyecto_id) tasks = tasks.filter((t) => t.proyecto_id === args.proyecto_id);
    }
    return tasks.filter(
      (t) =>
        t.fecha_programada &&
        t.fecha_programada < today &&
        t.estado !== "completada" &&
        t.estado !== "cancelada"
    );
  },
});

export const getTasksByVehiculo = query({
  args: { vehiculo_id: v.id("vehiculos") },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    // Verificar que el vehículo pertenece a la org del caller; si no, []
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      const vehiculo = await ctx.db.get(args.vehiculo_id);
      if (!vehiculo) return [];
      if (!scope.organizacionId || vehiculo.organizacion_id !== scope.organizacionId) {
        return [];
      }
    }
    return await ctx.db
      .query("maintenance_tasks")
      .withIndex("by_vehiculo", (q) => q.eq("vehiculo_id", args.vehiculo_id))
      .collect();
  },
});

export const getTasksByEstado = query({
  args: { estado: v.string() },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    const all = await ctx.db
      .query("maintenance_tasks")
      .withIndex("by_estado", (q) => q.eq("estado", args.estado))
      .collect();
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) return all;
    if (!scope.organizacionId) return [];
    // Filtrar por org del vehículo asociado (o por organizacion_id de la tarea si existe).
    const filtered: typeof all = [];
    for (const t of all) {
      if (t.organizacion_id) {
        if (t.organizacion_id === scope.organizacionId) filtered.push(t);
        continue;
      }
      if (t.vehiculo_id) {
        const veh = await ctx.db.get(t.vehiculo_id);
        if (veh?.organizacion_id === scope.organizacionId) filtered.push(t);
      }
    }
    return filtered;
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
    estado: v.optional(v.string()),
    proyecto_id: v.optional(v.id("proyectos")),
  },
  handler: async (ctx, args) => {
    const scope = await requireWriteRole(ctx);
    await requireModulo(ctx, "MTO");
    if (args.proyecto_id) await requireProjectAccess(ctx, args.proyecto_id);
    if (!scope.isSuperAdmin && !scope.organizacionId) {
      throw new Error("Sin organización asignada");
    }
    // Conductor solo puede reportar tareas para su vehículo asignado.
    if (scope.isConductor) {
      if (!args.vehiculo_id) throw new Error("Conductor debe especificar su vehículo");
      if (scope.perfil?.vehiculo_asignado_id !== args.vehiculo_id) {
        throw new Error("Acceso denegado: conductor solo puede reportar tareas de su vehículo asignado");
      }
    }
    const { estado, ...rest } = args;
    const payload: any = {
      ...rest,
      estado: estado || "pendiente",
    };
    // Derivar org_id: scope first, fallback al vehículo (super_admin sin org current).
    let orgId = scope.organizacionId;
    if (!orgId && args.vehiculo_id) {
      const veh = await ctx.db.get(args.vehiculo_id);
      orgId = veh?.organizacion_id ?? null;
    }
    if (!orgId && !scope.isSuperAdmin) {
      throw new Error("No se puede crear tarea sin organización");
    }
    if (orgId) payload.organizacion_id = orgId;
    return await ctx.db.insert("maintenance_tasks", payload);
  },
});

export const updateTask = mutation({
  args: {
    id: v.id("maintenance_tasks"),
    vehiculo_id: v.optional(v.id("vehiculos")),
    titulo: v.optional(v.string()),
    descripcion: v.optional(v.string()),
    tipo: v.optional(v.string()),
    prioridad: v.optional(v.string()),
    estado: v.optional(v.string()),
    fecha_programada: v.optional(v.string()),
    fecha_completada: v.optional(v.string()),
    costo: v.optional(v.number()),
    mecanico: v.optional(v.string()),
    notas: v.optional(v.string()),
    proyecto_id: v.optional(v.id("proyectos")),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "MTO");
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Tarea no encontrada");
    if (task.organizacion_id) await requireOrgAccess(ctx, task.organizacion_id);
    else if (task.proyecto_id) await requireProjectAccess(ctx, task.proyecto_id);
    else throw new Error("Tarea sin proyecto ni organización — requiere migración");
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

export const deleteTask = mutation({
  args: { id: v.id("maintenance_tasks") },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "MTO");
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Tarea no encontrada");
    if (task.organizacion_id) await requireOrgAccess(ctx, task.organizacion_id);
    else if (task.proyecto_id) await requireProjectAccess(ctx, task.proyecto_id);
    else throw new Error("Tarea sin proyecto ni organización — requiere migración");
    return await ctx.db.delete(args.id);
  },
});

// ========== MAINTENANCE ALERTS ==========
export const listAlerts = query({
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    const all = await ctx.db.query("maintenance_alerts").collect();
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) return all;
    if (!scope.organizacionId) return [];
    return all.filter((a) => a.organizacion_id === scope.organizacionId);
  },
});

export const getUnreadAlerts = query({
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    const all = await ctx.db
      .query("maintenance_alerts")
      .withIndex("by_leida", (q) => q.eq("leida", false))
      .collect();
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) return all;
    if (!scope.organizacionId) return [];
    return all.filter((a) => a.organizacion_id === scope.organizacionId);
  },
});

export const getAlertsByVehiculo = query({
  args: { vehiculo_id: v.id("vehiculos") },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    // Verificar que el vehículo pertenece a la org del caller; si no, []
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      const vehiculo = await ctx.db.get(args.vehiculo_id);
      if (!vehiculo) return [];
      if (!scope.organizacionId || vehiculo.organizacion_id !== scope.organizacionId) {
        return [];
      }
    }
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
    const scope = await requireWriteRole(ctx);
    await requireModulo(ctx, "MTO");
    if (!scope.isSuperAdmin && !scope.organizacionId) {
      throw new Error("Sin organización asignada");
    }
    const payload: any = {
      ...args,
      fecha_generada: new Date().toISOString(),
      leida: false,
    };
    if (scope.organizacionId) payload.organizacion_id = scope.organizacionId;
    return await ctx.db.insert("maintenance_alerts", payload);
  },
});

export const markAsRead = mutation({
  args: { id: v.id("maintenance_alerts") },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "MTO");
    const alert = await ctx.db.get(args.id);
    if (!alert) throw new Error("Alerta no encontrada");
    if (!alert.organizacion_id) throw new Error("Alerta sin organización — requiere migración");
    await requireOrgAccess(ctx, alert.organizacion_id);
    return await ctx.db.patch(args.id, { leida: true });
  },
});

export const deleteAlert = mutation({
  args: { id: v.id("maintenance_alerts") },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "MTO");
    const alert = await ctx.db.get(args.id);
    if (!alert) throw new Error("Alerta no encontrada");
    if (!alert.organizacion_id) throw new Error("Alerta sin organización — requiere migración");
    await requireOrgAccess(ctx, alert.organizacion_id);
    return await ctx.db.delete(args.id);
  },
});

// ========== MAINTENANCE PHOTOS ==========
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    await requireWriteRole(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const savePhoto = mutation({
  args: {
    task_id: v.id("maintenance_tasks"),
    etapa: v.string(),
    storage_id: v.id("_storage"),
    file_name: v.string(),
    file_size: v.optional(v.number()),
    mime_type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "MTO");
    const task = await ctx.db.get(args.task_id);
    if (!task) throw new Error("Tarea no encontrada");
    if (task.organizacion_id) await requireOrgAccess(ctx, task.organizacion_id);
    else if (task.proyecto_id) await requireProjectAccess(ctx, task.proyecto_id);
    else throw new Error("Tarea sin proyecto ni organización — requiere migración");
    const photoId = await ctx.db.insert("maintenance_photos", args);
    const orgId = task.organizacion_id;
    if (orgId && args.file_size && args.file_size > 0) {
      await incrementOrgStorage(ctx, orgId, args.file_size);
    }
    return photoId;
  },
});

export const listPhotos = query({
  args: { task_id: v.id("maintenance_tasks") },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      const task = await ctx.db.get(args.task_id);
      if (!task) return [];
      if (task.organizacion_id) {
        if (!scope.organizacionId || scope.organizacionId !== task.organizacion_id) throw new Error("Acceso denegado");
      } else if (task.proyecto_id) {
        await requireProjectAccess(ctx, task.proyecto_id);
      }
    }
    const photos = await ctx.db
      .query("maintenance_photos")
      .withIndex("by_task", (q) => q.eq("task_id", args.task_id))
      .collect();

    // Generar URLs para cada foto
    return await Promise.all(
      photos.map(async (photo) => ({
        ...photo,
        url: await ctx.storage.getUrl(photo.storage_id),
      }))
    );
  },
});

export const getPhotosByEtapa = query({
  args: {
    task_id: v.id("maintenance_tasks"),
    etapa: v.string(),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      const task = await ctx.db.get(args.task_id);
      if (!task) return [];
      if (task.organizacion_id) {
        if (!scope.organizacionId || scope.organizacionId !== task.organizacion_id) throw new Error("Acceso denegado");
      } else if (task.proyecto_id) {
        await requireProjectAccess(ctx, task.proyecto_id);
      }
    }
    const photos = await ctx.db
      .query("maintenance_photos")
      .withIndex("by_task", (q) => q.eq("task_id", args.task_id))
      .filter((q) => q.eq(q.field("etapa"), args.etapa))
      .collect();

    return await Promise.all(
      photos.map(async (photo) => ({
        ...photo,
        url: await ctx.storage.getUrl(photo.storage_id),
      }))
    );
  },
});

// NOTA: deletePhoto NO está gateado por requireModulo("MTO").
// Cleanup debe funcionar aunque MTO esté apagado para evitar drift en
// storage_bytes_used (counter delta queda inflado hasta el cron diario).
export const deletePhoto = mutation({
  args: { id: v.id("maintenance_photos") },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    const photo = await ctx.db.get(args.id);
    if (!photo) return null;

    // Validar acceso vía la tarea asociada
    const task = photo.task_id ? await ctx.db.get(photo.task_id) : null;
    if (!task) throw new Error("Tarea asociada no encontrada");
    if (task.organizacion_id) await requireOrgAccess(ctx, task.organizacion_id);
    else if (task.proyecto_id) await requireProjectAccess(ctx, task.proyecto_id);
    else throw new Error("Tarea sin proyecto ni organización — requiere migración");

    // Eliminar del storage
    await ctx.storage.delete(photo.storage_id);

    // Storage counter — decrement por org
    const orgId = task.organizacion_id;
    if (orgId && photo.file_size && photo.file_size > 0) {
      await incrementOrgStorage(ctx, orgId, -photo.file_size);
    }

    // Eliminar del DB
    return await ctx.db.delete(args.id);
  },
});

// ========== MAINTENANCE REPORTS ==========
// Admin: ve todos. Enterprise: ve los de su proyecto + los globales.
export const listReports = query({
  args: { proyecto_id: v.optional(v.id("proyectos")) },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    const all = await ctx.db
      .query("maintenance_reports")
      .withIndex("by_fecha", (q) => q)
      .order("desc")
      .collect();
    if (scope.isAdmin) {
      if (args.proyecto_id) return all.filter((r) => r.proyecto_id === args.proyecto_id);
      return all;
    }
    if (!scope.proyectoId) return all.filter((r) => !r.proyecto_id);
    return all.filter((r) => !r.proyecto_id || r.proyecto_id === scope.proyectoId);
  },
});

export const getReportById = query({
  args: { id: v.id("maintenance_reports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.id);
    if (!report) return null;
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      if (report.organizacion_id) {
        if (!scope.organizacionId || scope.organizacionId !== report.organizacion_id) throw new Error("Acceso denegado");
      } else if (report.proyecto_id) {
        await requireProjectAccess(ctx, report.proyecto_id);
      }
    }

    // Función helper para obtener fotos con URLs
    const getPhotosWithUrls = async (photoIds: any[]) => {
      return await Promise.all(
        (photoIds || []).map(async (photoId) => {
          const photo = await ctx.db.get(photoId);
          if (!photo) return null;
          const url = await ctx.storage.getUrl(photo.storage_id);
          return {
            ...photo,
            url,
          };
        })
      );
    };

    const fotosAntes = await getPhotosWithUrls(report.fotos_antes_ids);
    const fotosDurante = await getPhotosWithUrls(report.fotos_durante_ids);
    const fotosDespues = await getPhotosWithUrls(report.fotos_despues_ids);

    return {
      ...report,
      fotos_antes: fotosAntes.filter(Boolean),
      fotos_durante: fotosDurante.filter(Boolean),
      fotos_despues: fotosDespues.filter(Boolean),
    };
  },
});

export const getReportsByVehiculo = query({
  args: { vehiculo_id: v.id("vehiculos") },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      const vehiculo = await ctx.db.get(args.vehiculo_id);
      if (!vehiculo) return [];
      if (!scope.organizacionId || scope.organizacionId !== vehiculo.organizacion_id) throw new Error("Acceso denegado");
    }
    return await ctx.db
      .query("maintenance_reports")
      .withIndex("by_vehiculo", (q) => q.eq("vehiculo_id", args.vehiculo_id))
      .order("desc")
      .collect();
  },
});

// Query para obtener reportes con fotos para generacion de PDF
export const listReportsWithPhotos = query({
  args: {
    fecha_inicio: v.optional(v.string()),
    fecha_fin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    let reports = await ctx.db
      .query("maintenance_reports")
      .withIndex("by_fecha", (q) => q)
      .order("desc")
      .collect();

    // Scope por org primero, luego por proyecto.
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      if (!scope.organizacionId) {
        reports = [];
      } else {
        reports = reports.filter((r) => r.organizacion_id === scope.organizacionId);
        if (scope.proyectoId) {
          reports = reports.filter((r) => !r.proyecto_id || r.proyecto_id === scope.proyectoId);
        }
      }
    }

    // Filtrar por rango de fechas si se proporcionan
    if (args.fecha_inicio && args.fecha_fin) {
      reports = reports.filter(
        (r) => r.fecha_reporte >= args.fecha_inicio! && r.fecha_reporte <= args.fecha_fin!
      );
    }

    // Funcion helper para obtener fotos con URLs
    const getPhotosWithUrls = async (photoIds: any[]) => {
      return await Promise.all(
        (photoIds || []).map(async (photoId) => {
          const photo = await ctx.db.get(photoId);
          if (!photo) return null;
          const url = await ctx.storage.getUrl(photo.storage_id);
          return {
            id: photo._id,
            etapa: photo.etapa,
            file_name: photo.file_name,
            url,
          };
        })
      );
    };

    // Procesar cada reporte con sus fotos
    const reportsWithPhotos = await Promise.all(
      reports.map(async (report) => {
        const fotosAntes = await getPhotosWithUrls(report.fotos_antes_ids);
        const fotosDurante = await getPhotosWithUrls(report.fotos_durante_ids);
        const fotosDespues = await getPhotosWithUrls(report.fotos_despues_ids);

        return {
          ...report,
          fotos_antes: fotosAntes.filter(Boolean),
          fotos_durante: fotosDurante.filter(Boolean),
          fotos_despues: fotosDespues.filter(Boolean),
        };
      })
    );

    return reportsWithPhotos;
  },
});

export const createReport = mutation({
  args: {
    task_id: v.id("maintenance_tasks"),
    vehiculo_id: v.optional(v.id("vehiculos")),
    vehiculo_placa: v.optional(v.string()),
    titulo: v.string(),
    descripcion: v.optional(v.string()),
    tipo: v.string(),
    prioridad: v.string(),
    fecha_programada: v.optional(v.string()),
    fecha_completada: v.string(),
    costo: v.optional(v.number()),
    mecanico: v.optional(v.string()),
    fotos_antes_ids: v.optional(v.array(v.id("maintenance_photos"))),
    fotos_durante_ids: v.optional(v.array(v.id("maintenance_photos"))),
    fotos_despues_ids: v.optional(v.array(v.id("maintenance_photos"))),
    observaciones: v.optional(v.string()),
    usuario_completo: v.string(),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "MTO");
    const task = await ctx.db.get(args.task_id);
    if (!task) throw new Error("Tarea no encontrada");
    if (task.organizacion_id) await requireOrgAccess(ctx, task.organizacion_id);
    else if (task.proyecto_id) await requireProjectAccess(ctx, task.proyecto_id);
    else throw new Error("Tarea sin proyecto ni organización — requiere migración");

    // Si no se pasan fotos_ids, buscar las fotos de la tarea automáticamente
    let fotosAntesIds = args.fotos_antes_ids || [];
    let fotosDuranteIds = args.fotos_durante_ids || [];
    let fotosDespuesIds = args.fotos_despues_ids || [];

    // Si todos los arrays están vacíos, buscar fotos de la tarea por etapa
    if (fotosAntesIds.length === 0 && fotosDuranteIds.length === 0 && fotosDespuesIds.length === 0) {
      const allPhotos = await ctx.db
        .query("maintenance_photos")
        .withIndex("by_task", (q) => q.eq("task_id", args.task_id))
        .collect();

      fotosAntesIds = allPhotos.filter((p) => p.etapa === "antes").map((p) => p._id);
      fotosDuranteIds = allPhotos.filter((p) => p.etapa === "durante").map((p) => p._id);
      fotosDespuesIds = allPhotos.filter((p) => p.etapa === "despues").map((p) => p._id);
    }

    const reportPayload: any = {
      task_id: args.task_id,
      vehiculo_id: args.vehiculo_id,
      vehiculo_placa: args.vehiculo_placa,
      titulo: args.titulo,
      descripcion: args.descripcion,
      tipo: args.tipo,
      prioridad: args.prioridad,
      fecha_programada: args.fecha_programada,
      fecha_completada: args.fecha_completada,
      costo: args.costo,
      mecanico: args.mecanico,
      fotos_antes_ids: fotosAntesIds,
      fotos_durante_ids: fotosDuranteIds,
      fotos_despues_ids: fotosDespuesIds,
      observaciones: args.observaciones,
      usuario_completo: args.usuario_completo,
      fecha_reporte: new Date().toISOString().split("T")[0],
    };
    if (task.organizacion_id) reportPayload.organizacion_id = task.organizacion_id;
    if (task.proyecto_id) reportPayload.proyecto_id = task.proyecto_id;
    return await ctx.db.insert("maintenance_reports", reportPayload);
  },
});

// ========== MAINTENANCE VOLUME PRESETS ==========

// List all presets (system + user's custom presets)
export const listVolumePresets = query({
  args: {
    user_email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const allPresets = await ctx.db.query("maintenance_volume_presets").collect();

    // Filter: system presets (is_custom=false) + global custom + user's own custom
    return allPresets.filter(preset =>
      !preset.is_custom ||                          // System presets
      preset.is_global ||                           // Global custom presets
      preset.created_by === args.user_email         // User's own presets
    );
  },
});

// Create new custom preset
export const createVolumePreset = mutation({
  args: {
    label: v.string(),
    volume_gallons: v.number(),
    cost_per_gallon: v.number(),
    total_cost: v.number(),
    description: v.optional(v.string()),
    created_by: v.string(),
    is_global: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const scope = await requireWriteRole(ctx);
    // Forzar created_by al email del perfil autenticado (no confiar en arg)
    const ownerEmail = scope.perfil?.email ?? args.created_by;
    return await ctx.db.insert("maintenance_volume_presets", {
      label: args.label,
      volume_gallons: args.volume_gallons,
      cost_per_gallon: args.cost_per_gallon,
      total_cost: args.total_cost,
      description: args.description,
      created_by: ownerEmail,
      is_custom: true,
      is_global: args.is_global || false,
      created_at: new Date().toISOString(),
    });
  },
});

// Delete custom preset (only if created by user or admin)
export const deleteVolumePreset = mutation({
  args: {
    id: v.id("maintenance_volume_presets"),
    user_email: v.string(),
  },
  handler: async (ctx, args) => {
    const scope = await requireWriteRole(ctx);
    const preset = await ctx.db.get(args.id);
    if (!preset) throw new Error("Preset no encontrado");

    // Solo super_admin puede borrar cualquier preset; demás solo los suyos.
    const callerEmail = scope.perfil?.email;
    const isOwner = preset.is_custom && preset.created_by === callerEmail;
    if (!scope.isSuperAdmin && !isOwner) {
      throw new Error("No tienes permiso para eliminar este preset");
    }

    return await ctx.db.delete(args.id);
  },
});

// One-shot: backfill organizacion_id en maintenance_tasks y maintenance_alerts derivado de vehiculos.
export const _migrationBackfillOrganizacionId = mutation({
  args: {},
  handler: async (ctx) => {
    let tasks_fixed = 0;
    let alerts_fixed = 0;

    const tasks = await ctx.db.query("maintenance_tasks").collect();
    for (const t of tasks) {
      if (t.organizacion_id != null) continue;
      if (!t.vehiculo_id) continue;
      const veh = await ctx.db.get(t.vehiculo_id);
      if (!veh?.organizacion_id) continue;
      await ctx.db.patch(t._id, { organizacion_id: veh.organizacion_id });
      tasks_fixed++;
    }

    const alerts = await ctx.db.query("maintenance_alerts").collect();
    for (const a of alerts) {
      if (a.organizacion_id != null) continue;
      if (!a.vehiculo_id) continue;
      const veh = await ctx.db.get(a.vehiculo_id);
      if (!veh?.organizacion_id) continue;
      await ctx.db.patch(a._id, { organizacion_id: veh.organizacion_id });
      alerts_fixed++;
    }

    return { tasks_fixed, alerts_fixed };
  },
});
