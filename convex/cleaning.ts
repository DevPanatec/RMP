import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ========== SALAS ==========
export const listSalas = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("salas")
      .withIndex("by_activo", (q) => q.eq("activo", true))
      .collect();
  },
});

export const addSala = mutation({
  args: {
    nombre: v.string(),
    descripcion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("salas", {
      ...args,
      activo: true,
    });
  },
});

// ========== AREAS ==========
export const listAreas = query({
  handler: async (ctx) => {
    return await ctx.db.query("areas").collect();
  },
});

export const getAreasBySala = query({
  args: { sala_id: v.id("salas") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("areas")
      .withIndex("by_sala", (q) => q.eq("sala_id", args.sala_id))
      .filter((q) => q.eq(q.field("activo"), true))
      .collect();
  },
});

export const addArea = mutation({
  args: {
    sala_id: v.id("salas"),
    nombre: v.string(),
    descripcion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("areas", {
      ...args,
      activo: true,
    });
  },
});

// ========== CLEANING ASSIGNMENTS ==========
export const listAssignments = query({
  handler: async (ctx) => {
    return await ctx.db.query("cleaning_assignments").collect();
  },
});

export const getAssignmentsByFecha = query({
  args: { fecha: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cleaning_assignments")
      .withIndex("by_fecha", (q) => q.eq("fecha", args.fecha))
      .collect();
  },
});

export const getAssignmentsByEstado = query({
  args: { estado: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cleaning_assignments")
      .withIndex("by_estado", (q) => q.eq("estado", args.estado))
      .collect();
  },
});

export const addAssignment = mutation({
  args: {
    sala_id: v.id("salas"),
    area_id: v.id("areas"),
    fecha: v.string(),
    hora: v.string(),
    notas: v.optional(v.string()),
    created_by: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("cleaning_assignments", {
      ...args,
      estado: "pendiente",
    });
  },
});

export const updateAssignment = mutation({
  args: {
    id: v.id("cleaning_assignments"),
    estado: v.optional(v.string()),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

export const deleteAssignment = mutation({
  args: { id: v.id("cleaning_assignments") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

// ========== CLEANING PHOTOS ==========
export const getPhotosByAssignment = query({
  args: { assignment_id: v.id("cleaning_assignments") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cleaning_photos")
      .withIndex("by_assignment", (q) => q.eq("assignment_id", args.assignment_id))
      .collect();
  },
});

export const addPhoto = mutation({
  args: {
    assignment_id: v.id("cleaning_assignments"),
    etapa: v.string(),
    storage_id: v.id("_storage"),
    file_name: v.string(),
    file_size: v.optional(v.number()),
    mime_type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("cleaning_photos", args);
  },
});

// ========== CLEANING REPORTS ==========
export const listReports = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("cleaning_reports")
      .withIndex("by_fecha", (q) => q)
      .order("desc")
      .collect();
  },
});

export const getReportById = query({
  args: { id: v.id("cleaning_reports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.id);
    if (!report) return null;

    // Obtener fotos con URLs
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

export const getReportsBySala = query({
  args: { sala_id: v.id("salas") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cleaning_reports")
      .withIndex("by_sala", (q) => q.eq("sala_id", args.sala_id))
      .order("desc")
      .collect();
  },
});

export const getReportsByDateRange = query({
  args: {
    fecha_inicio: v.string(),
    fecha_fin: v.string(),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("cleaning_reports").collect();
    return all.filter(
      (r) => r.fecha_completacion >= args.fecha_inicio && r.fecha_completacion <= args.fecha_fin
    );
  },
});

export const createReport = mutation({
  args: {
    assignment_id: v.id("cleaning_assignments"),
    sala_id: v.id("salas"),
    area_id: v.id("areas"),
    sala_nombre: v.string(),
    area_nombre: v.string(),
    latitud: v.optional(v.number()),
    longitud: v.optional(v.number()),
    fecha: v.string(),
    hora_inicio: v.string(),
    hora_fin: v.string(),
    duracion_minutos: v.number(),
    fotos_antes_ids: v.array(v.id("cleaning_photos")),
    fotos_durante_ids: v.array(v.id("cleaning_photos")),
    fotos_despues_ids: v.array(v.id("cleaning_photos")),
    observaciones: v.optional(v.string()),
    usuario_completo: v.string(),
    fecha_completacion: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("cleaning_reports", args);
  },
});
