import { action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Seed/demo reports — gated por ALLOW_E2E=1. Crea 1 reporte por módulo (REC/LIM/FUM/MTO)
// más fotos reales en Recolección + route_events con timestamps llegada/completada.
// NO es un script de producción. Pa' demoing y verificar UX del rediseño.

function assertSeedAllowed() {
  if (process.env.ALLOW_E2E !== "1") {
    throw new Error("Seed deshabilitado. Setear ALLOW_E2E=1 en Convex env vars.");
  }
}

// ============================================================
// Helper: descubre org + project a usar pa' los demos
// ============================================================
export const findContext = internalQuery({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query("organizaciones").filter((q) => q.eq(q.field("activo"), true)).collect();
    // Filtrar las orgs E2E (audit test orgs)
    const realOrgs = orgs.filter((o) => !o.nombre.startsWith("[E2E"));
    const org = realOrgs[0] || orgs[0];
    if (!org) return null;
    const proyectos = await ctx.db
      .query("proyectos")
      .withIndex("by_organizacion", (q) => q.eq("organizacion_id", org._id))
      .collect();
    const proyecto = proyectos[0];
    return {
      organizacion_id: org._id,
      organizacion_nombre: org.nombre,
      proyecto_id: proyecto?._id ?? null,
      proyecto_nombre: proyecto?.nombre ?? null,
    };
  },
});

// ============================================================
// ACTION: createDemoReports — entrypoint público
// ============================================================
export const createDemoReports = action({
  args: {
    organizacion_id: v.optional(v.id("organizaciones")),
    proyecto_id: v.optional(v.id("proyectos")),
  },
  handler: async (ctx, args): Promise<any> => {
    assertSeedAllowed();

    // Resolver contexto si no se pasaron args
    let orgId: Id<"organizaciones"> | null = args.organizacion_id ?? null;
    let projId: Id<"proyectos"> | null = args.proyecto_id ?? null;
    if (!orgId) {
      const ctxData = await ctx.runQuery(internal.seedReports.findContext, {});
      if (!ctxData) throw new Error("No hay organizaciones activas pa' usar como demo.");
      orgId = ctxData.organizacion_id;
      projId = ctxData.proyecto_id;
    }

    // Fetch placeholder images desde picsum.photos — diferentes seeds = imágenes distintas
    const imgUrls = [
      // Paradas (Recolección)
      "https://picsum.photos/seed/rmp-parada1/800/600",
      "https://picsum.photos/seed/rmp-parada2/800/600",
      "https://picsum.photos/seed/rmp-parada3/800/600",
      // Cleaning (antes, durante, despues)
      "https://picsum.photos/seed/rmp-clean-antes/800/600",
      "https://picsum.photos/seed/rmp-clean-durante/800/600",
      "https://picsum.photos/seed/rmp-clean-despues/800/600",
      // Fumigation (antes, durante, despues)
      "https://picsum.photos/seed/rmp-fum-antes/800/600",
      "https://picsum.photos/seed/rmp-fum-durante/800/600",
      "https://picsum.photos/seed/rmp-fum-despues/800/600",
      // Maintenance (antes, durante, despues)
      "https://picsum.photos/seed/rmp-mto-antes/800/600",
      "https://picsum.photos/seed/rmp-mto-durante/800/600",
      "https://picsum.photos/seed/rmp-mto-despues/800/600",
    ];

    const storageIds: Id<"_storage">[] = [];
    for (const url of imgUrls) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const id = await ctx.storage.store(blob);
        storageIds.push(id);
      } catch (err) {
        console.error(`Falló fetch ${url}:`, err);
        throw new Error(`No se pudieron descargar las imágenes demo: ${err}`);
      }
    }

    // Insertar todos los records vía internal mutation
    const result: {
      route_report_id: Id<"route_reports">;
      cleaning_report_id: Id<"cleaning_reports">;
      fumigation_report_id: Id<"fumigation_reports">;
      maintenance_report_id: Id<"maintenance_reports">;
    } = await ctx.runMutation(internal.seedReports.insertDemoData, {
      organizacion_id: orgId,
      proyecto_id: projId,
      paradaPhotoIds: storageIds.slice(0, 3),
      cleaningPhotoIds: storageIds.slice(3, 6),
      fumigationPhotoIds: storageIds.slice(6, 9),
      maintenancePhotoIds: storageIds.slice(9, 12),
    });

    return {
      organizacion_id: orgId,
      proyecto_id: projId,
      ...result,
      photos_uploaded: storageIds.length,
    };
  },
});

// ============================================================
// INTERNAL MUTATION: inserta todos los registros
// ============================================================
export const insertDemoData = internalMutation({
  args: {
    organizacion_id: v.id("organizaciones"),
    proyecto_id: v.union(v.id("proyectos"), v.null()),
    paradaPhotoIds: v.array(v.id("_storage")),
    cleaningPhotoIds: v.array(v.id("_storage")),
    fumigationPhotoIds: v.array(v.id("_storage")),
    maintenancePhotoIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    assertSeedAllowed();

    const orgId = args.organizacion_id;
    const projId = args.proyecto_id;
    const nowMs = Date.now();
    const today = new Date(nowMs).toISOString().slice(0, 10); // YYYY-MM-DD
    const isoNow = new Date(nowMs).toISOString();

    // ============ 1. CLEANING REPORT ============
    // Find or create sala
    let sala = await ctx.db
      .query("salas")
      .withIndex("by_activo", (q) => q.eq("activo", true))
      .filter((q) => q.eq(q.field("organizacion_id"), orgId))
      .first();
    if (!sala) {
      const id = await ctx.db.insert("salas", {
        nombre: "[DEMO] Oficina Central",
        descripcion: "Sala demo creada por seedReports",
        latitud: 8.983333,
        longitud: -79.516670,
        activo: true,
        proyecto_id: projId ?? undefined,
        organizacion_id: orgId,
      });
      sala = await ctx.db.get(id);
    }
    if (!sala) throw new Error("No se pudo crear sala demo");

    // Crear assignment
    const cleaningAssignmentId = await ctx.db.insert("cleaning_assignments", {
      sala_id: sala._id,
      fecha: today,
      hora: "08:00",
      estado: "completado",
      notas: "Limpieza demo completada",
      created_by: "demo-seed",
      proyecto_id: sala.proyecto_id,
      organizacion_id: orgId,
    });

    // Crear photos
    const cleaningPhotoMap = { antes: [] as Id<"cleaning_photos">[], durante: [] as Id<"cleaning_photos">[], despues: [] as Id<"cleaning_photos">[] };
    const cleaningEtapas: ("antes" | "durante" | "despues")[] = ["antes", "durante", "despues"];
    for (let i = 0; i < cleaningEtapas.length && i < args.cleaningPhotoIds.length; i++) {
      const etapa = cleaningEtapas[i];
      const photoId = await ctx.db.insert("cleaning_photos", {
        assignment_id: cleaningAssignmentId,
        etapa,
        storage_id: args.cleaningPhotoIds[i],
        file_name: `demo-cleaning-${etapa}.jpg`,
        file_size: 80000,
        mime_type: "image/jpeg",
      });
      cleaningPhotoMap[etapa].push(photoId);
    }

    const cleaningReportId = await ctx.db.insert("cleaning_reports", {
      assignment_id: cleaningAssignmentId,
      sala_id: sala._id,
      sala_nombre: sala.nombre,
      latitud: sala.latitud,
      longitud: sala.longitud,
      fecha: today,
      hora_inicio: "08:00",
      hora_fin: "09:30",
      duracion_minutos: 90,
      fotos_antes_ids: cleaningPhotoMap.antes,
      fotos_durante_ids: cleaningPhotoMap.durante,
      fotos_despues_ids: cleaningPhotoMap.despues,
      observaciones:
        "Limpieza profunda de baños, áreas comunes y oficinas. Se detectó fuga menor en lavamanos de área 2 — reportada al equipo de mantenimiento.",
      usuario_completo: "[DEMO] María González",
      fecha_completacion: isoNow,
      proyecto_id: projId ?? undefined,
      organizacion_id: orgId,
    });

    // ============ 2. FUMIGATION REPORT ============
    let lugar = await ctx.db
      .query("lugares")
      .withIndex("by_activo", (q) => q.eq("activo", true))
      .filter((q) => q.eq(q.field("organizacion_id"), orgId))
      .first();
    if (!lugar) {
      const id = await ctx.db.insert("lugares", {
        nombre: "[DEMO] Bodega Principal",
        descripcion: "Lugar demo creado por seedReports",
        latitud: 8.980000,
        longitud: -79.520000,
        activo: true,
        proyecto_id: projId ?? undefined,
        organizacion_id: orgId,
      });
      lugar = await ctx.db.get(id);
    }
    if (!lugar) throw new Error("No se pudo crear lugar demo");

    const fumigationAssignmentId = await ctx.db.insert("fumigation_assignments", {
      tipo_fumigacion: "interna",
      lugar_id: lugar._id,
      fecha: today,
      horario_inicio: "19:00",
      horario_fin: "21:30",
      productos_utilizados: ["Cipermetrina 25%", "Fipronil 5%", "Cebos gel cucaracha"],
      observaciones: "Tratamiento integral contra cucarachas y roedores. Próxima visita: 30 días.",
      estado: "reportada",
      created_by: "demo-seed",
      proyecto_id: projId ?? undefined,
      organizacion_id: orgId,
    });

    const fumiEtapas: ("antes" | "durante" | "despues")[] = ["antes", "durante", "despues"];
    const fumiPhotoMap = { antes: [] as Id<"fumigation_photos">[], durante: [] as Id<"fumigation_photos">[], despues: [] as Id<"fumigation_photos">[] };
    for (let i = 0; i < fumiEtapas.length && i < args.fumigationPhotoIds.length; i++) {
      const etapa = fumiEtapas[i];
      const photoId = await ctx.db.insert("fumigation_photos", {
        assignment_id: fumigationAssignmentId,
        etapa,
        storage_id: args.fumigationPhotoIds[i],
        file_name: `demo-fumigation-${etapa}.jpg`,
        file_size: 80000,
        mime_type: "image/jpeg",
      });
      fumiPhotoMap[etapa].push(photoId);
    }

    const fumigationReportId = await ctx.db.insert("fumigation_reports", {
      assignment_id: fumigationAssignmentId,
      tipo_fumigacion: "interna",
      lugar_id: lugar._id,
      lugar_nombre: lugar.nombre,
      latitud: lugar.latitud,
      longitud: lugar.longitud,
      fecha: today,
      horario_inicio: "19:00",
      horario_fin: "21:30",
      duracion_minutos: 150,
      productos_utilizados: ["Cipermetrina 25%", "Fipronil 5%", "Cebos gel cucaracha"],
      observaciones: "Tratamiento integral contra cucarachas y roedores. Próxima visita: 30 días.",
      fotos_antes_ids: fumiPhotoMap.antes,
      fotos_durante_ids: fumiPhotoMap.durante,
      fotos_despues_ids: fumiPhotoMap.despues,
      usuario_completo: "[DEMO] Carlos Mendoza",
      fecha_completacion: isoNow,
      proyecto_id: projId ?? undefined,
      organizacion_id: orgId,
    });

    // ============ 3. MAINTENANCE REPORT ============
    // Find a vehicle (optional)
    const vehiculo = await ctx.db
      .query("vehiculos")
      .filter((q) => q.eq(q.field("organizacion_id"), orgId))
      .first();

    const maintenanceTaskId = await ctx.db.insert("maintenance_tasks", {
      vehiculo_id: vehiculo?._id,
      titulo: "[DEMO] Cambio de aceite y revisión general",
      descripcion: "Mantenimiento preventivo a 5000 km. Cambio de aceite, filtros y revisión de frenos.",
      tipo: "preventivo",
      prioridad: "media",
      fecha_programada: today,
      fecha_completada: today,
      estado: "completada",
      costo: 185.5,
      mecanico: "[DEMO] Taller Hernández",
      notas: "Aceite cambiado, frenos revisados, sin observaciones",
      proyecto_id: projId ?? undefined,
      organizacion_id: orgId,
    });

    const mtoEtapas: ("antes" | "durante" | "despues")[] = ["antes", "durante", "despues"];
    const mtoPhotoMap = { antes: [] as Id<"maintenance_photos">[], durante: [] as Id<"maintenance_photos">[], despues: [] as Id<"maintenance_photos">[] };
    for (let i = 0; i < mtoEtapas.length && i < args.maintenancePhotoIds.length; i++) {
      const etapa = mtoEtapas[i];
      const photoId = await ctx.db.insert("maintenance_photos", {
        task_id: maintenanceTaskId,
        etapa,
        storage_id: args.maintenancePhotoIds[i],
        file_name: `demo-maintenance-${etapa}.jpg`,
        file_size: 80000,
        mime_type: "image/jpeg",
      });
      mtoPhotoMap[etapa].push(photoId);
    }

    const maintenanceReportId = await ctx.db.insert("maintenance_reports", {
      task_id: maintenanceTaskId,
      vehiculo_id: vehiculo?._id,
      vehiculo_placa: vehiculo?.placa,
      titulo: "[DEMO] Cambio de aceite y revisión general",
      descripcion: "Mantenimiento preventivo a 5000 km. Cambio de aceite, filtros y revisión de frenos.",
      tipo: "preventivo",
      prioridad: "media",
      fecha_programada: today,
      fecha_completada: today,
      costo: 185.5,
      mecanico: "[DEMO] Taller Hernández",
      fotos_antes_ids: mtoPhotoMap.antes,
      fotos_durante_ids: mtoPhotoMap.durante,
      fotos_despues_ids: mtoPhotoMap.despues,
      observaciones:
        "Cambio aceite 15W-40, Filtro de aceite reemplazado, Filtro de aire limpio, Frenos revisados sin desgaste, Refrigerante topeado",
      usuario_completo: "[DEMO] Carlos Mendoza",
      fecha_reporte: isoNow,
      proyecto_id: projId ?? undefined,
      organizacion_id: orgId,
    });

    // ============ 4. ROUTE REPORT (Recolección) — con paradas, fotos, route_events ============
    // Necesitamos ruta + asignacion + vehiculo pa' route_events. Si no hay vehiculo, route_report sin route_events.
    const paradas = [
      {
        orden: 1,
        direccion: "[DEMO] Av. Balboa 100",
        nombre: "[DEMO] Av. Balboa 100",
        lat: 8.984000,
        lng: -79.519000,
        latitud: 8.984000,
        longitud: -79.519000,
      },
      {
        orden: 2,
        direccion: "[DEMO] Calle 50, Edificio Plaza",
        nombre: "[DEMO] Calle 50, Edificio Plaza",
        lat: 8.985500,
        lng: -79.518500,
        latitud: 8.985500,
        longitud: -79.518500,
      },
      {
        orden: 3,
        direccion: "[DEMO] Vía España, esquina con Federico Boyd",
        nombre: "[DEMO] Vía España, esquina con Federico Boyd",
        lat: 8.986800,
        lng: -79.520200,
        latitud: 8.986800,
        longitud: -79.520200,
      },
    ];

    const rutaId = await ctx.db.insert("rutas", {
      nombre: "[DEMO] Ruta Centro Bancario",
      descripcion: "Ruta demo creada por seedReports",
      proyecto_id: projId ?? undefined,
      tipo_servicio: "recoleccion",
      paradas,
      fecha_programada: today,
      hora_inicio: "06:00",
      hora_fin: "10:00",
      estado: "completada",
      organizacion_id: orgId,
    });

    let asignacionId: Id<"asignaciones_rutas"> | undefined;
    if (vehiculo) {
      asignacionId = await ctx.db.insert("asignaciones_rutas", {
        ruta_id: rutaId,
        conductor_nombre: "[DEMO] Juan Pérez",
        vehiculo_id: vehiculo._id,
        proyecto_id: projId ?? undefined,
        fecha_asignacion: today,
        fecha_inicio: isoNow,
        fecha_completacion: isoNow,
        hora_inicio: "06:00",
        hora_fin: "10:00",
        estado: "completada",
        organizacion_id: orgId,
      });
    }

    // Crear route_events con timestamps separados llegada/completada
    // Ruta empieza a las 06:00. Cada parada: llegada → 15 min en sitio → completada
    const baseStart = new Date(nowMs - 4 * 60 * 60 * 1000); // 4h atrás
    baseStart.setMinutes(0, 0, 0);

    const paradasCompletadas: any[] = [];
    const cargas = ["alta", "media", "baja"];
    const bolsasArr = [8, 5, 3];

    if (asignacionId && vehiculo) {
      // ruta_iniciada
      await ctx.db.insert("route_events", {
        ruta_id: rutaId,
        asignacion_id: asignacionId,
        conductor_nombre: "[DEMO] Juan Pérez",
        vehiculo_id: vehiculo._id,
        vehiculo_placa: vehiculo.placa,
        ruta_nombre: "[DEMO] Ruta Centro Bancario",
        tipo_evento: "ruta_iniciada",
        timestamp: baseStart.toISOString(),
        proyecto_id: projId ?? undefined,
        organizacion_id: orgId,
      });

      for (let i = 0; i < paradas.length; i++) {
        const p = paradas[i];
        // Llegada: i*30min después del start
        const tsLlegada = new Date(baseStart.getTime() + i * 30 * 60 * 1000);
        // Completada: 15min después de llegada
        const tsCompletada = new Date(tsLlegada.getTime() + 15 * 60 * 1000);

        await ctx.db.insert("route_events", {
          ruta_id: rutaId,
          asignacion_id: asignacionId,
          conductor_nombre: "[DEMO] Juan Pérez",
          vehiculo_id: vehiculo._id,
          vehiculo_placa: vehiculo.placa,
          ruta_nombre: "[DEMO] Ruta Centro Bancario",
          tipo_evento: "parada_llegada",
          parada_nombre: p.direccion,
          parada_orden: p.orden,
          parada_index: i,
          gps_latitud: p.lat,
          gps_longitud: p.lng,
          timestamp: tsLlegada.toISOString(),
          proyecto_id: projId ?? undefined,
          organizacion_id: orgId,
        });

        await ctx.db.insert("route_events", {
          ruta_id: rutaId,
          asignacion_id: asignacionId,
          conductor_nombre: "[DEMO] Juan Pérez",
          vehiculo_id: vehiculo._id,
          vehiculo_placa: vehiculo.placa,
          ruta_nombre: "[DEMO] Ruta Centro Bancario",
          tipo_evento: "parada_completada",
          parada_nombre: p.direccion,
          parada_orden: p.orden,
          parada_index: i,
          categoria_carga: cargas[i],
          bolsas: bolsasArr[i],
          foto_storage_id: args.paradaPhotoIds[i],
          gps_latitud: p.lat,
          gps_longitud: p.lng,
          timestamp: tsCompletada.toISOString(),
          proyecto_id: projId ?? undefined,
          organizacion_id: orgId,
        });

        paradasCompletadas.push({
          index: i,
          parada_index: i,
          orden: p.orden,
          direccion: p.direccion,
          parada_nombre: p.direccion,
          completada: true,
          categoria_carga: cargas[i],
          bolsas: bolsasArr[i],
          foto_storage_id: args.paradaPhotoIds[i],
          timestamp_llegada: tsLlegada.toISOString(),
          timestamp_salida: tsCompletada.toISOString(),
          gps_completada: { lat: p.lat, lng: p.lng, latitud: p.lat, longitud: p.lng },
        });
      }
    } else {
      // No hay vehiculo → snapshot básico sin route_events
      for (let i = 0; i < paradas.length; i++) {
        const p = paradas[i];
        const ts = new Date(baseStart.getTime() + i * 30 * 60 * 1000).toISOString();
        paradasCompletadas.push({
          index: i,
          parada_index: i,
          orden: p.orden,
          direccion: p.direccion,
          completada: true,
          categoria_carga: cargas[i],
          bolsas: bolsasArr[i],
          foto_storage_id: args.paradaPhotoIds[i],
          timestamp_llegada: ts,
          timestamp_salida: ts,
          gps_completada: { lat: p.lat, lng: p.lng, latitud: p.lat, longitud: p.lng },
        });
      }
    }

    const tiempoTotal = paradas.length * 30 * 60 + 15 * 60; // approx

    const routeReportId = await ctx.db.insert("route_reports", {
      ruta_id: rutaId,
      asignacion_id: asignacionId,
      conductor_nombre: "[DEMO] Juan Pérez",
      vehiculo_placa: vehiculo?.placa ?? "[DEMO] AB-0001",
      vehiculo_id: vehiculo?._id,
      fecha_inicio: baseStart.toISOString(),
      fecha_completacion: isoNow,
      tiempo_total_segundos: tiempoTotal,
      paradas_completadas: paradasCompletadas,
      observaciones:
        "Ruta completada sin contratiempos. Parada 2 tuvo carga inusualmente alta — revisar frecuencia de recolección en esa zona.",
      tipo_ruta: "recoleccion",
      ruta_nombre: "[DEMO] Ruta Centro Bancario",
      ruta_paradas: paradas,
      proyecto_id: projId ?? undefined,
      organizacion_id: orgId,
    });

    return {
      route_report_id: routeReportId,
      cleaning_report_id: cleaningReportId,
      fumigation_report_id: fumigationReportId,
      maintenance_report_id: maintenanceReportId,
    };
  },
});

// ============================================================
// CLEANUP: borra todos los reportes y data demo ([DEMO] prefix)
// ============================================================
export const purgeDemoReports = internalMutation({
  args: {},
  handler: async (ctx) => {
    assertSeedAllowed();

    let deleted = { reports: 0, photos: 0, storage: 0, parents: 0 };

    // Borrar route_reports demo
    const routeReports = await ctx.db.query("route_reports").collect();
    for (const r of routeReports) {
      if (r.ruta_nombre.startsWith("[DEMO]")) {
        // Borrar fotos de paradas en storage
        for (const p of r.paradas_completadas || []) {
          if (p.foto_storage_id) {
            try { await ctx.storage.delete(p.foto_storage_id); deleted.storage++; } catch {}
          }
        }
        await ctx.db.delete(r._id);
        deleted.reports++;
      }
    }

    // route_events demo
    const events = await ctx.db.query("route_events").collect();
    for (const e of events) {
      if (e.ruta_nombre?.startsWith("[DEMO]")) {
        if (e.foto_storage_id) {
          try { await ctx.storage.delete(e.foto_storage_id); } catch {}
        }
        await ctx.db.delete(e._id);
      }
    }

    // Rutas demo
    const rutas = await ctx.db.query("rutas").collect();
    for (const r of rutas) {
      if (r.nombre.startsWith("[DEMO]")) { await ctx.db.delete(r._id); deleted.parents++; }
    }

    // Asignaciones demo (las que apuntan a rutas demo borradas — query por conductor_nombre)
    const asignaciones = await ctx.db.query("asignaciones_rutas").collect();
    for (const a of asignaciones) {
      if (a.conductor_nombre?.startsWith("[DEMO]")) { await ctx.db.delete(a._id); }
    }

    // Cleaning
    const cleanReports = await ctx.db.query("cleaning_reports").collect();
    for (const r of cleanReports) {
      if (r.sala_nombre?.startsWith("[DEMO]") || r.usuario_completo?.startsWith("[DEMO]")) {
        const photos = await ctx.db.query("cleaning_photos").withIndex("by_assignment", q => q.eq("assignment_id", r.assignment_id)).collect();
        for (const ph of photos) {
          try { await ctx.storage.delete(ph.storage_id); deleted.storage++; } catch {}
          await ctx.db.delete(ph._id);
          deleted.photos++;
        }
        await ctx.db.delete(r._id);
        deleted.reports++;
      }
    }
    const cleanAssignments = await ctx.db.query("cleaning_assignments").collect();
    for (const a of cleanAssignments) {
      if (a.notas?.includes("demo") || a.created_by === "demo-seed") { await ctx.db.delete(a._id); }
    }
    const salas = await ctx.db.query("salas").collect();
    for (const s of salas) {
      if (s.nombre.startsWith("[DEMO]")) { await ctx.db.delete(s._id); deleted.parents++; }
    }

    // Fumigation
    const fumiReports = await ctx.db.query("fumigation_reports").collect();
    for (const r of fumiReports) {
      if (r.lugar_nombre?.startsWith("[DEMO]") || r.usuario_completo?.startsWith("[DEMO]")) {
        const photos = await ctx.db.query("fumigation_photos").withIndex("by_assignment", q => q.eq("assignment_id", r.assignment_id)).collect();
        for (const ph of photos) {
          try { await ctx.storage.delete(ph.storage_id); deleted.storage++; } catch {}
          await ctx.db.delete(ph._id);
          deleted.photos++;
        }
        await ctx.db.delete(r._id);
        deleted.reports++;
      }
    }
    const fumiAssignments = await ctx.db.query("fumigation_assignments").collect();
    for (const a of fumiAssignments) {
      if (a.observaciones?.includes("Próxima visita: 30 días") || a.created_by === "demo-seed") { await ctx.db.delete(a._id); }
    }
    const lugares = await ctx.db.query("lugares").collect();
    for (const l of lugares) {
      if (l.nombre.startsWith("[DEMO]")) { await ctx.db.delete(l._id); deleted.parents++; }
    }

    // Maintenance
    const mtoReports = await ctx.db.query("maintenance_reports").collect();
    for (const r of mtoReports) {
      if (r.titulo.startsWith("[DEMO]") || r.usuario_completo?.startsWith("[DEMO]")) {
        const photos = await ctx.db.query("maintenance_photos").withIndex("by_task", q => q.eq("task_id", r.task_id)).collect();
        for (const ph of photos) {
          try { await ctx.storage.delete(ph.storage_id); deleted.storage++; } catch {}
          await ctx.db.delete(ph._id);
          deleted.photos++;
        }
        await ctx.db.delete(r._id);
        deleted.reports++;
      }
    }
    const mtoTasks = await ctx.db.query("maintenance_tasks").collect();
    for (const t of mtoTasks) {
      if (t.titulo.startsWith("[DEMO]")) { await ctx.db.delete(t._id); }
    }

    return deleted;
  },
});
