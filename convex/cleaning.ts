import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope, getScopedProjectId, requireProjectAccess, requireWriteRole, requireOrgAccess } from "./lib/auth";
import { incrementOrgStorage } from "./organizaciones";
import { requireModulo } from "./lib/modules";

// ========== SALAS ==========
export const listSalas = query({
  args: { proyecto_id: v.optional(v.id("proyectos")) },
  handler: async (ctx, args) => {
    const scoped = await getScopedProjectId(ctx, args.proyecto_id ?? null);
    if (scoped) {
      return await ctx.db
        .query("salas")
        .withIndex("by_proyecto", (q) => q.eq("proyecto_id", scoped))
        .filter((q) => q.eq(q.field("activo"), true))
        .collect();
    }
    const scope = await getAuthScope(ctx);
    const all = await ctx.db
      .query("salas")
      .withIndex("by_activo", (q) => q.eq("activo", true))
      .collect();
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) return all;
    if (!scope.organizacionId) return [];
    return all.filter((s) => s.organizacion_id === scope.organizacionId);
  },
});

export const addSala = mutation({
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
    await requireModulo(ctx, "LIM");
    await requireProjectAccess(ctx, args.proyecto_id);
    // Persistir organizacion_id derivada del proyecto.
    const proyecto = await ctx.db.get(args.proyecto_id);
    const organizacion_id = proyecto?.organizacion_id;
    return await ctx.db.insert("salas", {
      ...args,
      activo: true,
      ...(organizacion_id && { organizacion_id }),
    });
  },
});

export const updateSala = mutation({
  args: {
    id: v.id("salas"),
    nombre: v.optional(v.string()),
    descripcion: v.optional(v.string()),
    latitud: v.optional(v.number()),
    longitud: v.optional(v.number()),
    activo: v.optional(v.boolean()),
    foto_storage_id: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "LIM");
    const sala = await ctx.db.get(args.id);
    if (!sala) throw new Error("Sala no encontrada");
    if (sala.proyecto_id) await requireProjectAccess(ctx, sala.proyecto_id);
    else if (sala.organizacion_id) await requireOrgAccess(ctx, sala.organizacion_id);
    else throw new Error("Sala sin organización — requiere migración");

    const { id, ...updates } = args;
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }
    return await ctx.db.patch(id, cleanUpdates);
  },
});

export const deleteSala = mutation({
  args: { id: v.id("salas") },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "LIM");
    const sala = await ctx.db.get(args.id);
    if (!sala) throw new Error("Sala no encontrada");
    if (sala.proyecto_id) await requireProjectAccess(ctx, sala.proyecto_id);
    else if (sala.organizacion_id) await requireOrgAccess(ctx, sala.organizacion_id);
    else throw new Error("Sala sin organización — requiere migración");
    return await ctx.db.patch(args.id, { activo: false });
  },
});

// ========== AREAS ==========
// Areas se asocian a salas; salas tienen proyecto_id+organizacion_id.
// Filtramos áreas por scope vía sala.proyecto_id.
export const listAreas = query({
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    const areas = await ctx.db.query("areas").collect();
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) return areas;
    if (!scope.organizacionId) return [];
    const salas = await ctx.db.query("salas").collect();
    const salasOk = new Set(
      salas
        .filter((s) => s.organizacion_id === scope.organizacionId)
        .map((s) => s._id)
    );
    return areas.filter((a) => salasOk.has(a.sala_id));
  },
});

export const getAreasBySala = query({
  args: { sala_id: v.id("salas") },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      const sala = await ctx.db.get(args.sala_id);
      if (!sala) return [];
      if (sala.proyecto_id) await requireProjectAccess(ctx, sala.proyecto_id);
      else if (sala.organizacion_id) {
        if (!scope.organizacionId || scope.organizacionId !== sala.organizacion_id) throw new Error("Acceso denegado");
      }
    }
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
    await requireWriteRole(ctx);
    await requireModulo(ctx, "LIM");
    const sala = await ctx.db.get(args.sala_id);
    if (!sala) throw new Error("Sala no encontrada");
    if (sala.proyecto_id) await requireProjectAccess(ctx, sala.proyecto_id);
    else if (sala.organizacion_id) await requireOrgAccess(ctx, sala.organizacion_id);
    else throw new Error("Sala sin proyecto ni organización — requiere migración");
    return await ctx.db.insert("areas", {
      ...args,
      activo: true,
    });
  },
});

// ========== CLEANING ASSIGNMENTS ==========
export const listAssignments = query({
  args: { proyecto_id: v.optional(v.id("proyectos")) },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    const scoped = await getScopedProjectId(ctx, args.proyecto_id ?? null);
    if (scoped) {
      return await ctx.db
        .query("cleaning_assignments")
        .withIndex("by_proyecto_fecha", (q) => q.eq("proyecto_id", scoped))
        .collect();
    }
    // scoped===null: super_admin/cross-org ven todo; admin solo su org.
    const all = await ctx.db.query("cleaning_assignments").collect();
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) return all;
    if (!scope.organizacionId) return [];
    return all.filter((a) => a.organizacion_id === scope.organizacionId);
  },
});

// Devuelve assignment con sala/area + fotos (URLs resueltas) — usado por
// modales de detalle de Cronograma y otros consumidores que necesitan
// el shape enriquecido que espera Cleaning/ReportDetailModal.
export const getAssignmentByIdEnriched = query({
  args: { id: v.id("cleaning_assignments") },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.id);
    if (!assignment) return null;
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      if (!scope.organizacionId) return null;
      if (assignment.organizacion_id !== scope.organizacionId) return null;
    }

    const sala = assignment.sala_id ? await ctx.db.get(assignment.sala_id) : null;
    const area = assignment.area_id ? await ctx.db.get(assignment.area_id) : null;

    const photos = await ctx.db
      .query("cleaning_photos")
      .withIndex("by_assignment", (q) => q.eq("assignment_id", args.id))
      .collect();
    const photosWithUrls = await Promise.all(
      photos.map(async (p) => ({
        ...p,
        url: await ctx.storage.getUrl(p.storage_id),
      }))
    );

    return {
      ...assignment,
      lugar: sala
        ? { _id: sala._id, nombre: sala.nombre, latitud: sala.latitud, longitud: sala.longitud }
        : null,
      area: area ? { _id: area._id, nombre: area.nombre } : null,
      fotos: photosWithUrls,
    };
  },
});

export const addAssignment = mutation({
  args: {
    sala_id: v.id("salas"),
    area_id: v.optional(v.id("areas")),
    fecha: v.string(),
    hora: v.string(),
    notas: v.optional(v.string()),
    created_by: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "LIM");
    const sala = await ctx.db.get(args.sala_id);
    if (!sala) throw new Error("Sala no encontrada");
    if (!sala.proyecto_id) throw new Error("Sala sin proyecto_id; ejecuta migración");
    await requireProjectAccess(ctx, sala.proyecto_id);
    // Persistir organizacion_id desde la sala (que la heredó del proyecto).
    return await ctx.db.insert("cleaning_assignments", {
      ...args,
      proyecto_id: sala.proyecto_id,
      estado: "pendiente",
      ...(sala.organizacion_id && { organizacion_id: sala.organizacion_id }),
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
    await requireWriteRole(ctx);
    await requireModulo(ctx, "LIM");
    const assignment = await ctx.db.get(args.id);
    if (!assignment) throw new Error("Asignación no encontrada");
    if (assignment.proyecto_id) await requireProjectAccess(ctx, assignment.proyecto_id);
    else if (assignment.organizacion_id) await requireOrgAccess(ctx, assignment.organizacion_id);
    else throw new Error("Asignación sin proyecto ni organización — requiere migración");
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

export const deleteAssignment = mutation({
  args: { id: v.id("cleaning_assignments") },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    // NO gateamos por módulo: cleanup debe funcionar aunque LIM esté apagado.
    // Si no, las fotos quedan huérfanas y storage_bytes_used drift hasta el
    // próximo cron recomputeStorageDaily (~6h). Cleanup = siempre permitido.
    const assignment = await ctx.db.get(args.id);
    if (!assignment) throw new Error("Asignación no encontrada");
    if (assignment.proyecto_id) await requireProjectAccess(ctx, assignment.proyecto_id);
    else if (assignment.organizacion_id) await requireOrgAccess(ctx, assignment.organizacion_id);
    else throw new Error("Asignación sin proyecto ni organización — requiere migración");

    // Cleanup: borrar fotos asociadas (DB + storage) para evitar leaks
    const photos = await ctx.db
      .query("cleaning_photos")
      .withIndex("by_assignment", (q) => q.eq("assignment_id", args.id))
      .collect();
    const orgId = assignment.organizacion_id;
    for (const photo of photos) {
      try {
        await ctx.storage.delete(photo.storage_id);
      } catch (err) {
        console.warn(`No se pudo borrar storage ${photo.storage_id}`, err);
      }
      // Storage counter — decrement por org en cascada
      if (orgId && photo.file_size && photo.file_size > 0) {
        await incrementOrgStorage(ctx, orgId, -photo.file_size);
      }
      await ctx.db.delete(photo._id);
    }

    return await ctx.db.delete(args.id);
  },
});

// ========== CLEANING PHOTOS ==========
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
    await requireWriteRole(ctx);
    await requireModulo(ctx, "LIM");
    const assignment = await ctx.db.get(args.assignment_id);
    if (!assignment) throw new Error("Asignación no encontrada");
    if (assignment.proyecto_id) await requireProjectAccess(ctx, assignment.proyecto_id);
    else if (assignment.organizacion_id) await requireOrgAccess(ctx, assignment.organizacion_id);
    else throw new Error("Asignación sin proyecto ni organización — requiere migración");
    const photoId = await ctx.db.insert("cleaning_photos", args);
    // Storage counter — delta tracking per org
    const orgId = assignment.organizacion_id;
    if (orgId && args.file_size && args.file_size > 0) {
      await incrementOrgStorage(ctx, orgId, args.file_size);
    }
    return photoId;
  },
});

// ========== CLEANING REPORTS ==========
// Query para obtener reportes con fotos para generacion de PDF
export const listReportsWithPhotos = query({
  args: {
    fecha_inicio: v.optional(v.string()),
    fecha_fin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const scoped = await getScopedProjectId(ctx, null);
    let reports = await ctx.db
      .query("cleaning_reports")
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
          const photo: any = await ctx.db.get(photoId);
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
    assignment_id: v.id("cleaning_assignments"),
    sala_id: v.id("salas"),
    area_id: v.optional(v.id("areas")),
    sala_nombre: v.string(),
    area_nombre: v.optional(v.string()),
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
    await requireWriteRole(ctx);
    await requireModulo(ctx, "LIM");
    // Derivar proyecto_id desde la sala
    const sala = await ctx.db.get(args.sala_id);
    if (!sala) throw new Error("Sala no encontrada");
    if (sala.proyecto_id) await requireProjectAccess(ctx, sala.proyecto_id);
    else if (sala.organizacion_id) await requireOrgAccess(ctx, sala.organizacion_id);
    else throw new Error("Sala sin proyecto ni organización — requiere migración");
    const proyecto_id = sala?.proyecto_id;
    const payload: any = { ...args, proyecto_id };
    if (sala.organizacion_id) payload.organizacion_id = sala.organizacion_id;
    return await ctx.db.insert("cleaning_reports", payload);
  },
});

// One-shot: backfill organizacion_id en salas, cleaning_assignments y cleaning_reports.
export const _migrationBackfillOrganizacionId = mutation({
  args: {},
  handler: async (ctx) => {
    let salas_fixed = 0;
    let assignments_fixed = 0;
    let reports_fixed = 0;

    const salas = await ctx.db.query("salas").collect();
    for (const sala of salas) {
      if (sala.organizacion_id != null) continue;
      if (!sala.proyecto_id) continue;
      const proyecto = await ctx.db.get(sala.proyecto_id);
      if (!proyecto?.organizacion_id) continue;
      await ctx.db.patch(sala._id, { organizacion_id: proyecto.organizacion_id });
      salas_fixed++;
    }

    const assignments = await ctx.db.query("cleaning_assignments").collect();
    for (const a of assignments) {
      if (a.organizacion_id != null) continue;
      let orgId = null;
      if (a.proyecto_id) {
        const p = await ctx.db.get(a.proyecto_id);
        orgId = p?.organizacion_id ?? null;
      }
      if (!orgId && a.sala_id) {
        const s = await ctx.db.get(a.sala_id);
        orgId = s?.organizacion_id ?? null;
      }
      if (!orgId) continue;
      await ctx.db.patch(a._id, { organizacion_id: orgId });
      assignments_fixed++;
    }

    const reports = await ctx.db.query("cleaning_reports").collect();
    for (const r of reports) {
      if (r.organizacion_id != null) continue;
      let orgId = null;
      if (r.proyecto_id) {
        const p = await ctx.db.get(r.proyecto_id);
        orgId = p?.organizacion_id ?? null;
      }
      if (!orgId && r.sala_id) {
        const s = await ctx.db.get(r.sala_id);
        orgId = s?.organizacion_id ?? null;
      }
      if (!orgId) continue;
      await ctx.db.patch(r._id, { organizacion_id: orgId });
      reports_fixed++;
    }

    return { salas_fixed, assignments_fixed, reports_fixed };
  },
});

// ============================================================
// SEED PARA DEMO — crea cleaning_assignment + cleaning_report
// con prefix [TEST-DEMO] pa' visualizar feed multi-servicio.
//
// Uso (admin/super_admin):
//   Convex dashboard → Functions → cleaning:seedTestCompleted → Run
//
// Limpieza:
//   cleaning:removeTestData
// ============================================================

export const seedTestCompleted = mutation({
  args: {
    proyecto_id: v.optional(v.id("proyectos")),
  },
  handler: async (ctx, args) => {
    const scope = await requireWriteRole(ctx);
    await requireModulo(ctx, "LIM");

    const orgId = scope.organizacionId;
    if (!orgId && !scope.isSuperAdmin) {
      throw new Error("Sin organización asignada — no se puede seedear");
    }

    // 1. Encontrar o crear sala [TEST-DEMO]
    let testSala: any = null;
    if (orgId) {
      const salas = await ctx.db
        .query("salas")
        .withIndex("by_organizacion", (q) => q.eq("organizacion_id", orgId))
        .collect();
      testSala = salas.find((s) => s.nombre.startsWith("[TEST-DEMO]"));
    }

    if (!testSala) {
      const salaId = await ctx.db.insert("salas", {
        nombre: "[TEST-DEMO] Sala de prueba",
        descripcion: "Sala generada por seedTestCompleted — borrar con removeTestData",
        latitud: 8.983333,
        longitud: -79.51667,
        activo: true,
        ...(args.proyecto_id && { proyecto_id: args.proyecto_id }),
        ...(orgId && { organizacion_id: orgId }),
      });
      testSala = await ctx.db.get(salaId);
    }

    if (!testSala) throw new Error("No se pudo crear sala test");

    // Derivar proyecto_id si no se pasó (usar de la sala)
    const proyecto_id = args.proyecto_id ?? testSala.proyecto_id;

    // 2. Crear cleaning_assignment estado='completado'
    const now = new Date();
    const fechaHoy = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const horaAhora = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const assignmentId = await ctx.db.insert("cleaning_assignments", {
      sala_id: testSala._id,
      fecha: fechaHoy,
      hora: horaAhora,
      estado: "completado",
      notas: "[TEST-DEMO] Asignación de prueba pa' validar activity feed",
      ...(proyecto_id && { proyecto_id }),
      ...(orgId && { organizacion_id: orgId }),
    });

    // 3. Crear cleaning_report
    const isoNow = new Date().toISOString();
    const reportId = await ctx.db.insert("cleaning_reports", {
      assignment_id: assignmentId,
      sala_id: testSala._id,
      sala_nombre: testSala.nombre,
      latitud: testSala.latitud,
      longitud: testSala.longitud,
      fecha: fechaHoy,
      hora_inicio: horaAhora,
      hora_fin: `${String((now.getHours() + 1) % 24).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      duracion_minutos: 60,
      fotos_antes_ids: [],
      fotos_durante_ids: [],
      fotos_despues_ids: [],
      observaciones: "[TEST-DEMO] Reporte generado por seed",
      usuario_completo: "[TEST-DEMO] Seed User",
      fecha_completacion: isoNow,
      ...(proyecto_id && { proyecto_id }),
      ...(orgId && { organizacion_id: orgId }),
    });

    return {
      success: true,
      sala_id: testSala._id,
      assignment_id: assignmentId,
      report_id: reportId,
      mensaje: "Test data creado. Refrescá el dashboard Monitoreo pa' ver 'Limpieza Completada' en el feed.",
    };
  },
});

export const removeTestData = mutation({
  args: {},
  handler: async (ctx) => {
    const scope = await requireWriteRole(ctx);
    await requireModulo(ctx, "LIM");

    const orgId = scope.organizacionId;
    if (!orgId && !scope.isSuperAdmin) {
      throw new Error("Sin organización asignada");
    }

    let deletedReports = 0;
    let deletedAssignments = 0;
    let deletedSalas = 0;

    // 1. Borrar cleaning_reports con observaciones [TEST-DEMO]
    const reports = orgId
      ? await ctx.db
          .query("cleaning_reports")
          .withIndex("by_organizacion", (q) => q.eq("organizacion_id", orgId))
          .collect()
      : await ctx.db.query("cleaning_reports").collect();
    for (const r of reports) {
      if (r.observaciones?.startsWith("[TEST-DEMO]") || r.usuario_completo?.startsWith("[TEST-DEMO]")) {
        await ctx.db.delete(r._id);
        deletedReports++;
      }
    }

    // 2. Borrar cleaning_assignments con notas [TEST-DEMO]
    const assignments = orgId
      ? await ctx.db
          .query("cleaning_assignments")
          .withIndex("by_organizacion", (q) => q.eq("organizacion_id", orgId))
          .collect()
      : await ctx.db.query("cleaning_assignments").collect();
    for (const a of assignments) {
      if (a.notas?.startsWith("[TEST-DEMO]")) {
        await ctx.db.delete(a._id);
        deletedAssignments++;
      }
    }

    // 3. Borrar salas [TEST-DEMO]
    const salas = orgId
      ? await ctx.db
          .query("salas")
          .withIndex("by_organizacion", (q) => q.eq("organizacion_id", orgId))
          .collect()
      : await ctx.db.query("salas").collect();
    for (const s of salas) {
      if (s.nombre.startsWith("[TEST-DEMO]")) {
        await ctx.db.delete(s._id);
        deletedSalas++;
      }
    }

    return {
      success: true,
      deletedReports,
      deletedAssignments,
      deletedSalas,
    };
  },
});
