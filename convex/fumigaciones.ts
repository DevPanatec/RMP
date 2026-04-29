import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getScopedProjectId, requireProjectAccess } from "./lib/auth";

// ========== LUGARES ==========
export const listLugares = query({
  args: { proyecto_id: v.optional(v.id("proyectos")) },
  handler: async (ctx, args) => {
    const scoped = await getScopedProjectId(ctx, args.proyecto_id ?? null);
    if (scoped) {
      return await ctx.db
        .query("lugares")
        .withIndex("by_proyecto", (q) => q.eq("proyecto_id", scoped))
        .filter((q) => q.eq(q.field("activo"), true))
        .collect();
    }
    return await ctx.db
      .query("lugares")
      .withIndex("by_activo", (q) => q.eq("activo", true))
      .collect();
  },
});

export const addLugar = mutation({
  args: {
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    proyecto_id: v.id("proyectos"),
  },
  handler: async (ctx, args) => {
    await requireProjectAccess(ctx, args.proyecto_id);
    return await ctx.db.insert("lugares", {
      ...args,
      activo: true,
    });
  },
});

export const updateLugar = mutation({
  args: {
    id: v.id("lugares"),
    nombre: v.optional(v.string()),
    descripcion: v.optional(v.string()),
    latitud: v.optional(v.number()),
    longitud: v.optional(v.number()),
    activo: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    // Filtrar campos undefined para no sobreescribir con undefined
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }
    return await ctx.db.patch(id, cleanUpdates);
  },
});

export const deleteLugar = mutation({
  args: { id: v.id("lugares") },
  handler: async (ctx, args) => {
    // Soft delete
    return await ctx.db.patch(args.id, { activo: false });
  },
});

// ========== FUMIGATION ASSIGNMENTS ==========
export const list = query({
  args: { proyecto_id: v.optional(v.id("proyectos")) },
  handler: async (ctx, args) => {
    const scoped = await getScopedProjectId(ctx, args.proyecto_id ?? null);
    const allRaw = await ctx.db.query("fumigation_assignments").collect();
    const assignments = scoped === null ? allRaw : allRaw.filter((a) => a.proyecto_id === scoped);

    // Join con lugares
    const assignmentsWithLugar = await Promise.all(
      assignments.map(async (assignment) => {
        const lugar = await ctx.db.get(assignment.lugar_id);
        return {
          ...assignment,
          lugar_nombre: lugar?.nombre || "Desconocido",
        };
      })
    );

    return assignmentsWithLugar;
  },
});

export const getById = query({
  args: { id: v.id("fumigation_assignments") },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.id);
    if (!assignment) return null;

    // Join con lugar
    const lugar = await ctx.db.get(assignment.lugar_id);

    // Join con fotos con URLs
    const photos = await ctx.db
      .query("fumigation_photos")
      .withIndex("by_assignment", (q) => q.eq("assignment_id", args.id))
      .collect();

    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        const url = await ctx.storage.getUrl(photo.storage_id);
        return {
          ...photo,
          url,
        };
      })
    );

    return {
      ...assignment,
      lugar_nombre: lugar?.nombre || "Desconocido",
      photos: photosWithUrls,
    };
  },
});

export const getByLugar = query({
  args: { lugar_id: v.id("lugares") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fumigation_assignments")
      .withIndex("by_lugar", (q) => q.eq("lugar_id", args.lugar_id))
      .collect();
  },
});

export const getByDateRange = query({
  args: {
    fecha_inicio: v.string(),
    fecha_fin: v.string(),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("fumigation_assignments").collect();

    // Filtrar por rango de fechas
    const filtered = all.filter((assignment) => {
      return assignment.fecha >= args.fecha_inicio && assignment.fecha <= args.fecha_fin;
    });

    // Join con lugares
    const withLugares = await Promise.all(
      filtered.map(async (assignment) => {
        const lugar = await ctx.db.get(assignment.lugar_id);
        return {
          ...assignment,
          lugar_nombre: lugar?.nombre || "Desconocido",
          lugar_tipo: lugar?.tipo || "interno",
        };
      })
    );

    return withLugares;
  },
});

export const getByEstado = query({
  args: { estado: v.union(v.literal("programada"), v.literal("realizada"), v.literal("reportada")) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fumigation_assignments")
      .withIndex("by_estado", (q) => q.eq("estado", args.estado))
      .collect();
  },
});

// Validación de duplicados: mismo tipo + lugar + fecha
export const checkDuplicate = query({
  args: {
    tipo_fumigacion: v.union(v.literal("interna"), v.literal("externa")),
    lugar_id: v.id("lugares"),
    fecha: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("fumigation_assignments")
      .withIndex("by_fecha_lugar_tipo", (q) =>
        q.eq("fecha", args.fecha).eq("lugar_id", args.lugar_id).eq("tipo_fumigacion", args.tipo_fumigacion)
      )
      .first();

    return existing !== null; // true si existe duplicado
  },
});

// Verificar cumplimiento de frecuencia
export const checkFrequencyCompliance = query({
  args: {
    tipo_fumigacion: v.union(v.literal("interna"), v.literal("externa")),
    lugar_id: v.id("lugares"),
    fecha: v.string(), // Fecha a verificar
  },
  handler: async (ctx, args) => {
    const targetDate = new Date(args.fecha);

    if (args.tipo_fumigacion === "interna") {
      // Interna: máx 1 por mes
      const mesInicio = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1).toISOString().split("T")[0];
      const mesFin = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).toISOString().split("T")[0];

      const existentes = await ctx.db
        .query("fumigation_assignments")
        .withIndex("by_lugar", (q) => q.eq("lugar_id", args.lugar_id))
        .filter((q) =>
          q.and(
            q.eq(q.field("tipo_fumigacion"), "interna"),
            q.gte(q.field("fecha"), mesInicio),
            q.lte(q.field("fecha"), mesFin)
          )
        )
        .collect();

      return {
        excedido: existentes.length >= 1,
        limite: 1,
        actual: existentes.length,
        periodo: "mes",
      };
    } else {
      // Externa: máx 3 por semana
      const diaInicio = new Date(targetDate);
      diaInicio.setDate(targetDate.getDate() - targetDate.getDay()); // Lunes de la semana
      const diaFin = new Date(diaInicio);
      diaFin.setDate(diaInicio.getDate() + 6); // Domingo de la semana

      const semanaInicio = diaInicio.toISOString().split("T")[0];
      const semanaFin = diaFin.toISOString().split("T")[0];

      const existentes = await ctx.db
        .query("fumigation_assignments")
        .withIndex("by_lugar", (q) => q.eq("lugar_id", args.lugar_id))
        .filter((q) =>
          q.and(
            q.eq(q.field("tipo_fumigacion"), "externa"),
            q.gte(q.field("fecha"), semanaInicio),
            q.lte(q.field("fecha"), semanaFin)
          )
        )
        .collect();

      return {
        excedido: existentes.length >= 3,
        limite: 3,
        actual: existentes.length,
        periodo: "semana",
      };
    }
  },
});

export const create = mutation({
  args: {
    tipo_fumigacion: v.union(v.literal("interna"), v.literal("externa")),
    lugar_id: v.id("lugares"),
    fecha: v.string(),
    horario_inicio: v.string(),
    horario_fin: v.string(),
    productos_utilizados: v.optional(v.array(v.string())),
    observaciones: v.optional(v.string()),
    created_by: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const lugar = await ctx.db.get(args.lugar_id);
    if (!lugar) throw new Error("Lugar no encontrado");
    if (!lugar.proyecto_id) throw new Error("Lugar sin proyecto_id; ejecuta migración");
    await requireProjectAccess(ctx, lugar.proyecto_id);
    return await ctx.db.insert("fumigation_assignments", {
      ...args,
      proyecto_id: lugar.proyecto_id,
      estado: "programada",
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("fumigation_assignments"),
    tipo_fumigacion: v.optional(v.union(v.literal("interna"), v.literal("externa"))),
    lugar_id: v.optional(v.id("lugares")),
    fecha: v.optional(v.string()),
    horario_inicio: v.optional(v.string()),
    horario_fin: v.optional(v.string()),
    productos_utilizados: v.optional(v.array(v.string())),
    observaciones: v.optional(v.string()),
    estado: v.optional(v.union(v.literal("programada"), v.literal("realizada"), v.literal("reportada"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

export const updateEstado = mutation({
  args: {
    id: v.id("fumigation_assignments"),
    estado: v.union(v.literal("programada"), v.literal("realizada"), v.literal("reportada")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, { estado: args.estado });
  },
});

export const deleteAssignment = mutation({
  args: { id: v.id("fumigation_assignments") },
  handler: async (ctx, args) => {
    // Eliminar fotos asociadas primero
    const photos = await ctx.db
      .query("fumigation_photos")
      .withIndex("by_assignment", (q) => q.eq("assignment_id", args.id))
      .collect();

    for (const photo of photos) {
      await ctx.db.delete(photo._id);
      // Opcional: eliminar archivo del storage
      // await ctx.storage.delete(photo.storage_id);
    }

    // Eliminar asignación
    return await ctx.db.delete(args.id);
  },
});

// ========== FUMIGATION PHOTOS ==========
export const getPhotosByAssignment = query({
  args: { assignment_id: v.id("fumigation_assignments") },
  handler: async (ctx, args) => {
    const photos = await ctx.db
      .query("fumigation_photos")
      .withIndex("by_assignment", (q) => q.eq("assignment_id", args.assignment_id))
      .collect();

    // Obtener URLs firmadas para cada foto
    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        const url = await ctx.storage.getUrl(photo.storage_id);
        return {
          ...photo,
          url,
        };
      })
    );

    return photosWithUrls;
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const savePhoto = mutation({
  args: {
    assignment_id: v.id("fumigation_assignments"),
    etapa: v.string(), // "antes", "durante", "despues"
    storage_id: v.id("_storage"),
    file_name: v.string(),
    file_size: v.optional(v.number()),
    mime_type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("fumigation_photos", args);
  },
});

export const deletePhoto = mutation({
  args: { id: v.id("fumigation_photos") },
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.id);
    if (!photo) return null;

    // Eliminar del storage
    await ctx.storage.delete(photo.storage_id);

    // Eliminar del DB
    return await ctx.db.delete(args.id);
  },
});

// ========== FUMIGATION REPORTS ==========
export const listReports = query({
  args: { proyecto_id: v.optional(v.id("proyectos")) },
  handler: async (ctx, args) => {
    const scoped = await getScopedProjectId(ctx, args.proyecto_id ?? null);
    const all = await ctx.db
      .query("fumigation_reports")
      .withIndex("by_fecha", (q) => q)
      .order("desc")
      .collect();
    if (scoped === null) return all;
    return all.filter((r) => r.proyecto_id === scoped);
  },
});

export const getReportById = query({
  args: { id: v.id("fumigation_reports") },
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

    // Manejar estructura nueva (fotos_*_ids) y legacy (fotos_ids)
    let fotosAntes: any[] = [];
    let fotosDurante: any[] = [];
    let fotosDespues: any[] = [];

    if (report.fotos_antes_ids || report.fotos_durante_ids || report.fotos_despues_ids) {
      // Nueva estructura - usar campos por etapa
      fotosAntes = await getPhotosWithUrls(report.fotos_antes_ids || []);
      fotosDurante = await getPhotosWithUrls(report.fotos_durante_ids || []);
      fotosDespues = await getPhotosWithUrls(report.fotos_despues_ids || []);
    } else if ((report as any).fotos_ids) {
      // Legacy - todas las fotos van a "durante"
      fotosDurante = await getPhotosWithUrls((report as any).fotos_ids);
    }

    return {
      ...report,
      fotos_antes: fotosAntes.filter(Boolean),
      fotos_durante: fotosDurante.filter(Boolean),
      fotos_despues: fotosDespues.filter(Boolean),
    };
  },
});

export const getReportsByLugar = query({
  args: { lugar_id: v.id("lugares") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fumigation_reports")
      .withIndex("by_lugar", (q) => q.eq("lugar_id", args.lugar_id))
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
    const all = await ctx.db.query("fumigation_reports").collect();
    return all.filter(
      (r) => r.fecha_completacion >= args.fecha_inicio && r.fecha_completacion <= args.fecha_fin
    );
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
      .query("fumigation_reports")
      .withIndex("by_fecha", (q) => q)
      .order("desc")
      .collect();

    // Filtrar por rango de fechas si se proporcionan
    if (args.fecha_inicio && args.fecha_fin) {
      reports = reports.filter(
        (r) => r.fecha_completacion >= args.fecha_inicio! && r.fecha_completacion <= args.fecha_fin!
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
        // Manejar estructura nueva (fotos_*_ids) y legacy (fotos_ids)
        let fotosAntes: any[] = [];
        let fotosDurante: any[] = [];
        let fotosDespues: any[] = [];

        if (report.fotos_antes_ids || report.fotos_durante_ids || report.fotos_despues_ids) {
          fotosAntes = await getPhotosWithUrls(report.fotos_antes_ids || []);
          fotosDurante = await getPhotosWithUrls(report.fotos_durante_ids || []);
          fotosDespues = await getPhotosWithUrls(report.fotos_despues_ids || []);
        } else if ((report as any).fotos_ids) {
          fotosDurante = await getPhotosWithUrls((report as any).fotos_ids);
        }

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
    assignment_id: v.id("fumigation_assignments"),
    tipo_fumigacion: v.union(v.literal("interna"), v.literal("externa")),
    lugar_id: v.id("lugares"),
    lugar_nombre: v.string(),
    latitud: v.optional(v.number()),
    longitud: v.optional(v.number()),
    fecha: v.string(),
    horario_inicio: v.string(),
    horario_fin: v.string(),
    duracion_minutos: v.number(),
    productos_utilizados: v.array(v.string()),
    observaciones: v.optional(v.string()),
    fotos_antes_ids: v.optional(v.array(v.id("fumigation_photos"))),
    fotos_durante_ids: v.optional(v.array(v.id("fumigation_photos"))),
    fotos_despues_ids: v.optional(v.array(v.id("fumigation_photos"))),
    usuario_completo: v.string(),
    fecha_completacion: v.string(),
  },
  handler: async (ctx, args) => {
    // Si no se pasan fotos_ids, buscar las fotos del assignment automáticamente por etapa
    let fotosAntesIds = args.fotos_antes_ids || [];
    let fotosDuranteIds = args.fotos_durante_ids || [];
    let fotosDespuesIds = args.fotos_despues_ids || [];

    // Si todos los arrays están vacíos, buscar fotos del assignment por etapa
    if (fotosAntesIds.length === 0 && fotosDuranteIds.length === 0 && fotosDespuesIds.length === 0) {
      const allPhotos = await ctx.db
        .query("fumigation_photos")
        .withIndex("by_assignment", (q) => q.eq("assignment_id", args.assignment_id))
        .collect();

      fotosAntesIds = allPhotos.filter((p) => p.etapa === "antes").map((p) => p._id);
      fotosDuranteIds = allPhotos.filter((p) => p.etapa === "durante").map((p) => p._id);
      fotosDespuesIds = allPhotos.filter((p) => p.etapa === "despues").map((p) => p._id);

      // Fotos sin etapa (legacy) van a "durante" por defecto
      const fotosLegacy = allPhotos.filter((p) => !p.etapa).map((p) => p._id);
      if (fotosLegacy.length > 0) {
        fotosDuranteIds = [...fotosDuranteIds, ...fotosLegacy];
      }

      console.log(`📸 Fumigación: encontradas ${allPhotos.length} fotos del assignment (antes: ${fotosAntesIds.length}, durante: ${fotosDuranteIds.length}, después: ${fotosDespuesIds.length})`);
    }

    const { fotos_antes_ids, fotos_durante_ids, fotos_despues_ids, ...restArgs } = args;

    // Derivar proyecto_id desde el lugar
    const lugar = await ctx.db.get(args.lugar_id);
    const proyecto_id = lugar?.proyecto_id;

    return await ctx.db.insert("fumigation_reports", {
      ...restArgs,
      proyecto_id,
      fotos_antes_ids: fotosAntesIds,
      fotos_durante_ids: fotosDuranteIds,
      fotos_despues_ids: fotosDespuesIds,
    });
  },
});
