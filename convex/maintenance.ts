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
    estado: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { estado, ...rest } = args;
    return await ctx.db.insert("maintenance_tasks", {
      ...rest,
      estado: estado || "pendiente",
    });
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

// ========== MAINTENANCE PHOTOS ==========
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
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
    return await ctx.db.insert("maintenance_photos", args);
  },
});

export const listPhotos = query({
  args: { task_id: v.id("maintenance_tasks") },
  handler: async (ctx, args) => {
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

export const deletePhoto = mutation({
  args: { id: v.id("maintenance_photos") },
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.id);
    if (!photo) return null;

    // Eliminar del storage
    await ctx.storage.delete(photo.storage_id);

    // Eliminar del DB
    return await ctx.db.delete(args.id);
  },
});

// ========== MAINTENANCE REPORTS ==========
export const listReports = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("maintenance_reports")
      .withIndex("by_fecha", (q) => q)
      .order("desc")
      .collect();
  },
});

export const getReportById = query({
  args: { id: v.id("maintenance_reports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.id);
    if (!report) return null;

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
    let reports = await ctx.db
      .query("maintenance_reports")
      .withIndex("by_fecha", (q) => q)
      .order("desc")
      .collect();

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

      console.log(`📸 Mantenimiento: encontradas ${allPhotos.length} fotos de la tarea`);
    }

    return await ctx.db.insert("maintenance_reports", {
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
    });
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
    return await ctx.db.insert("maintenance_volume_presets", {
      label: args.label,
      volume_gallons: args.volume_gallons,
      cost_per_gallon: args.cost_per_gallon,
      total_cost: args.total_cost,
      description: args.description,
      created_by: args.created_by,
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
    const preset = await ctx.db.get(args.id);
    if (!preset) throw new Error("Preset no encontrado");

    // Only allow deletion of custom presets created by this user
    if (!preset.is_custom || preset.created_by !== args.user_email) {
      throw new Error("No tienes permiso para eliminar este preset");
    }

    return await ctx.db.delete(args.id);
  },
});
