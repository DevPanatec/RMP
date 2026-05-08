import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope, getScopedProjectId, requireProjectAccess, requireWriteRole, requireOrgAccess } from "./lib/auth";

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
    latitud: v.optional(v.number()),
    longitud: v.optional(v.number()),
    foto_storage_id: v.optional(v.id("_storage")),
    proyecto_id: v.id("proyectos"),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireProjectAccess(ctx, args.proyecto_id);
    const proyecto = await ctx.db.get(args.proyecto_id);
    const organizacion_id = proyecto?.organizacion_id;
    return await ctx.db.insert("lugares", {
      ...args,
      activo: true,
      ...(organizacion_id && { organizacion_id }),
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
    foto_storage_id: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    const lugar = await ctx.db.get(args.id);
    if (!lugar) throw new Error("Lugar no encontrado");
    if (lugar.proyecto_id) await requireProjectAccess(ctx, lugar.proyecto_id);
    else if (lugar.organizacion_id) await requireOrgAccess(ctx, lugar.organizacion_id);
    else throw new Error("Lugar sin proyecto ni organización — requiere migración");
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
    await requireWriteRole(ctx);
    const lugar = await ctx.db.get(args.id);
    if (!lugar) throw new Error("Lugar no encontrado");
    if (lugar.proyecto_id) await requireProjectAccess(ctx, lugar.proyecto_id);
    else if (lugar.organizacion_id) await requireOrgAccess(ctx, lugar.organizacion_id);
    else throw new Error("Lugar sin proyecto ni organización — requiere migración");
    // Soft delete
    return await ctx.db.patch(args.id, { activo: false });
  },
});

// ========== FUMIGATION ASSIGNMENTS ==========
export const list = query({
  args: { proyecto_id: v.optional(v.id("proyectos")) },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    const scoped = await getScopedProjectId(ctx, args.proyecto_id ?? null);
    const allRaw = await ctx.db.query("fumigation_assignments").collect();
    let assignments;
    if (scoped) {
      assignments = allRaw.filter((a) => a.proyecto_id === scoped);
    } else if (scope.isSuperAdmin || scope.isCrossOrgViewer) {
      assignments = allRaw;
    } else if (scope.organizacionId) {
      assignments = allRaw.filter((a) => a.organizacion_id === scope.organizacionId);
    } else {
      assignments = [];
    }

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
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      if (assignment.proyecto_id) await requireProjectAccess(ctx, assignment.proyecto_id);
      else if (assignment.organizacion_id) {
        if (!scope.organizacionId || scope.organizacionId !== assignment.organizacion_id) throw new Error("Acceso denegado");
      }
    }

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

// Validación de duplicados: mismo tipo + lugar + fecha
export const checkDuplicate = query({
  args: {
    tipo_fumigacion: v.union(v.literal("interna"), v.literal("externa")),
    lugar_id: v.id("lugares"),
    fecha: v.string(),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      const lugar = await ctx.db.get(args.lugar_id);
      if (!lugar) return false;
      if (lugar.proyecto_id) await requireProjectAccess(ctx, lugar.proyecto_id);
      else if (lugar.organizacion_id) {
        if (!scope.organizacionId || scope.organizacionId !== lugar.organizacion_id) throw new Error("Acceso denegado");
      }
    }
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
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      const lugar = await ctx.db.get(args.lugar_id);
      if (!lugar) return { excedido: false, limite: 1, actual: 0, periodo: "mes" };
      if (lugar.proyecto_id) await requireProjectAccess(ctx, lugar.proyecto_id);
      else if (lugar.organizacion_id) {
        if (!scope.organizacionId || scope.organizacionId !== lugar.organizacion_id) throw new Error("Acceso denegado");
      }
    }
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
    await requireWriteRole(ctx);
    const lugar = await ctx.db.get(args.lugar_id);
    if (!lugar) throw new Error("Lugar no encontrado");
    if (!lugar.proyecto_id) throw new Error("Lugar sin proyecto_id; ejecuta migración");
    await requireProjectAccess(ctx, lugar.proyecto_id);

    // Enforce frequency rule server-side: interna max 1/mes, externa max 3/semana.
    const targetDate = new Date(args.fecha);
    if (args.tipo_fumigacion === "interna") {
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
      if (existentes.length >= 1) {
        throw new Error("Excede límite mensual: solo 1 fumigación interna por mes en este lugar");
      }
    } else {
      const diaInicio = new Date(targetDate);
      diaInicio.setDate(targetDate.getDate() - targetDate.getDay());
      const diaFin = new Date(diaInicio);
      diaFin.setDate(diaInicio.getDate() + 6);
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
      if (existentes.length >= 3) {
        throw new Error("Excede límite semanal: máximo 3 fumigaciones externas por semana en este lugar");
      }
    }

    return await ctx.db.insert("fumigation_assignments", {
      ...args,
      proyecto_id: lugar.proyecto_id,
      estado: "programada",
      ...(lugar.organizacion_id && { organizacion_id: lugar.organizacion_id }),
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
    await requireWriteRole(ctx);
    const assignment = await ctx.db.get(args.id);
    if (!assignment) throw new Error("Asignación no encontrada");
    if (assignment.proyecto_id) await requireProjectAccess(ctx, assignment.proyecto_id);
    else if (assignment.organizacion_id) await requireOrgAccess(ctx, assignment.organizacion_id);
    else throw new Error("Asignación sin proyecto ni organización — requiere migración");
    const { id, ...updates } = args;

    // Si cambia fecha/lugar/tipo, re-enforce frequency rule (interna 1/mes, externa 3/sem).
    const newTipo = updates.tipo_fumigacion ?? assignment.tipo_fumigacion;
    const newLugar = updates.lugar_id ?? assignment.lugar_id;
    const newFecha = updates.fecha ?? assignment.fecha;
    const fechaChanged = updates.fecha && updates.fecha !== assignment.fecha;
    const lugarChanged = updates.lugar_id && updates.lugar_id !== assignment.lugar_id;
    const tipoChanged = updates.tipo_fumigacion && updates.tipo_fumigacion !== assignment.tipo_fumigacion;
    if (fechaChanged || lugarChanged || tipoChanged) {
      const targetDate = new Date(newFecha);
      if (newTipo === "interna") {
        const mesInicio = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1).toISOString().split("T")[0];
        const mesFin = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).toISOString().split("T")[0];
        const existentes = await ctx.db
          .query("fumigation_assignments")
          .withIndex("by_lugar", (q) => q.eq("lugar_id", newLugar))
          .filter((q) =>
            q.and(
              q.eq(q.field("tipo_fumigacion"), "interna"),
              q.gte(q.field("fecha"), mesInicio),
              q.lte(q.field("fecha"), mesFin)
            )
          )
          .collect();
        if (existentes.filter((e) => e._id !== id).length >= 1) {
          throw new Error("Excede límite mensual: solo 1 fumigación interna por mes en este lugar");
        }
      } else {
        const diaInicio = new Date(targetDate);
        diaInicio.setDate(targetDate.getDate() - targetDate.getDay());
        const diaFin = new Date(diaInicio);
        diaFin.setDate(diaInicio.getDate() + 6);
        const semanaInicio = diaInicio.toISOString().split("T")[0];
        const semanaFin = diaFin.toISOString().split("T")[0];
        const existentes = await ctx.db
          .query("fumigation_assignments")
          .withIndex("by_lugar", (q) => q.eq("lugar_id", newLugar))
          .filter((q) =>
            q.and(
              q.eq(q.field("tipo_fumigacion"), "externa"),
              q.gte(q.field("fecha"), semanaInicio),
              q.lte(q.field("fecha"), semanaFin)
            )
          )
          .collect();
        if (existentes.filter((e) => e._id !== id).length >= 3) {
          throw new Error("Excede límite semanal: máximo 3 fumigaciones externas por semana en este lugar");
        }
      }
    }

    return await ctx.db.patch(id, updates);
  },
});

export const updateEstado = mutation({
  args: {
    id: v.id("fumigation_assignments"),
    estado: v.union(v.literal("programada"), v.literal("realizada"), v.literal("reportada")),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    const assignment = await ctx.db.get(args.id);
    if (!assignment) throw new Error("Asignación no encontrada");
    if (assignment.proyecto_id) await requireProjectAccess(ctx, assignment.proyecto_id);
    else if (assignment.organizacion_id) await requireOrgAccess(ctx, assignment.organizacion_id);
    else throw new Error("Asignación sin proyecto ni organización — requiere migración");
    return await ctx.db.patch(args.id, { estado: args.estado });
  },
});

export const deleteAssignment = mutation({
  args: { id: v.id("fumigation_assignments") },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    const assignment = await ctx.db.get(args.id);
    if (!assignment) throw new Error("Asignación no encontrada");
    if (assignment.proyecto_id) await requireProjectAccess(ctx, assignment.proyecto_id);
    else if (assignment.organizacion_id) await requireOrgAccess(ctx, assignment.organizacion_id);
    else throw new Error("Asignación sin proyecto ni organización — requiere migración");

    // Eliminar fotos asociadas primero (DB + storage)
    const photos = await ctx.db
      .query("fumigation_photos")
      .withIndex("by_assignment", (q) => q.eq("assignment_id", args.id))
      .collect();

    for (const photo of photos) {
      try {
        await ctx.storage.delete(photo.storage_id);
      } catch (err) {
        console.warn(`No se pudo borrar storage ${photo.storage_id}`, err);
      }
      await ctx.db.delete(photo._id);
    }

    // Eliminar asignación
    return await ctx.db.delete(args.id);
  },
});

// ========== FUMIGATION PHOTOS ==========
export const getPhotosByAssignment = query({
  args: { assignment_id: v.id("fumigation_assignments") },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      const assignment = await ctx.db.get(args.assignment_id);
      if (!assignment) return [];
      if (assignment.proyecto_id) await requireProjectAccess(ctx, assignment.proyecto_id);
      else if (assignment.organizacion_id) {
        if (!scope.organizacionId || scope.organizacionId !== assignment.organizacion_id) throw new Error("Acceso denegado");
      }
    }
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
    await requireWriteRole(ctx);
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
    await requireWriteRole(ctx);
    const assignment = await ctx.db.get(args.assignment_id);
    if (!assignment) throw new Error("Asignación no encontrada");
    if (assignment.proyecto_id) await requireProjectAccess(ctx, assignment.proyecto_id);
    else if (assignment.organizacion_id) await requireOrgAccess(ctx, assignment.organizacion_id);
    else throw new Error("Asignación sin proyecto ni organización — requiere migración");
    return await ctx.db.insert("fumigation_photos", args);
  },
});

export const deletePhoto = mutation({
  args: { id: v.id("fumigation_photos") },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    const photo = await ctx.db.get(args.id);
    if (!photo) return null;

    // Validar acceso vía la asignación asociada
    const assignment = photo.assignment_id ? await ctx.db.get(photo.assignment_id) : null;
    if (!assignment) throw new Error("Asignación asociada no encontrada");
    if (assignment.proyecto_id) await requireProjectAccess(ctx, assignment.proyecto_id);
    else if (assignment.organizacion_id) await requireOrgAccess(ctx, assignment.organizacion_id);
    else throw new Error("Asignación sin proyecto ni organización — requiere migración");

    // Eliminar del storage
    await ctx.storage.delete(photo.storage_id);

    // Eliminar del DB
    return await ctx.db.delete(args.id);
  },
});

// ========== FUMIGATION REPORTS ==========
export const getReportById = query({
  args: { id: v.id("fumigation_reports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.id);
    if (!report) return null;
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      if (report.proyecto_id) await requireProjectAccess(ctx, report.proyecto_id);
      else if (report.organizacion_id) {
        if (!scope.organizacionId || scope.organizacionId !== report.organizacion_id) throw new Error("Acceso denegado");
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

// Query para obtener reportes con fotos para generacion de PDF
export const listReportsWithPhotos = query({
  args: {
    fecha_inicio: v.optional(v.string()),
    fecha_fin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const scoped = await getScopedProjectId(ctx, null);
    let reports = await ctx.db
      .query("fumigation_reports")
      .withIndex("by_fecha", (q) => q)
      .order("desc")
      .collect();

    // Scope por proyecto/org antes de resolver fotos
    if (scoped !== null) {
      reports = reports.filter((r) => r.proyecto_id === scoped);
    }

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
    await requireWriteRole(ctx);
    const assignment = await ctx.db.get(args.assignment_id);
    if (!assignment) throw new Error("Asignación no encontrada");
    if (assignment.proyecto_id) await requireProjectAccess(ctx, assignment.proyecto_id);
    else if (assignment.organizacion_id) await requireOrgAccess(ctx, assignment.organizacion_id);
    else throw new Error("Asignación sin proyecto ni organización — requiere migración");

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
    }

    const { fotos_antes_ids, fotos_durante_ids, fotos_despues_ids, ...restArgs } = args;

    // Derivar proyecto_id desde el lugar
    const lugar = await ctx.db.get(args.lugar_id);
    const proyecto_id = lugar?.proyecto_id;

    const payload: any = {
      ...restArgs,
      proyecto_id,
      fotos_antes_ids: fotosAntesIds,
      fotos_durante_ids: fotosDuranteIds,
      fotos_despues_ids: fotosDespuesIds,
    };
    if (lugar?.organizacion_id) payload.organizacion_id = lugar.organizacion_id;

    return await ctx.db.insert("fumigation_reports", payload);
  },
});

// One-shot: backfill organizacion_id en lugares, fumigation_assignments y fumigation_reports.
export const _migrationBackfillOrganizacionId = mutation({
  args: {},
  handler: async (ctx) => {
    let lugares_fixed = 0;
    let assignments_fixed = 0;
    let reports_fixed = 0;

    const lugares = await ctx.db.query("lugares").collect();
    for (const lugar of lugares) {
      if (lugar.organizacion_id != null) continue;
      if (!lugar.proyecto_id) continue;
      const proyecto = await ctx.db.get(lugar.proyecto_id);
      if (!proyecto?.organizacion_id) continue;
      await ctx.db.patch(lugar._id, { organizacion_id: proyecto.organizacion_id });
      lugares_fixed++;
    }

    const assignments = await ctx.db.query("fumigation_assignments").collect();
    for (const a of assignments) {
      if (a.organizacion_id != null) continue;
      let orgId = null;
      if (a.proyecto_id) {
        const p = await ctx.db.get(a.proyecto_id);
        orgId = p?.organizacion_id ?? null;
      }
      if (!orgId && a.lugar_id) {
        const l = await ctx.db.get(a.lugar_id);
        orgId = l?.organizacion_id ?? null;
      }
      if (!orgId) continue;
      await ctx.db.patch(a._id, { organizacion_id: orgId });
      assignments_fixed++;
    }

    const reports = await ctx.db.query("fumigation_reports").collect();
    for (const r of reports) {
      if (r.organizacion_id != null) continue;
      let orgId = null;
      if (r.proyecto_id) {
        const p = await ctx.db.get(r.proyecto_id);
        orgId = p?.organizacion_id ?? null;
      }
      if (!orgId && r.lugar_id) {
        const l = await ctx.db.get(r.lugar_id);
        orgId = l?.organizacion_id ?? null;
      }
      if (!orgId) continue;
      await ctx.db.patch(r._id, { organizacion_id: orgId });
      reports_fixed++;
    }

    return { lugares_fixed, assignments_fixed, reports_fixed };
  },
});
