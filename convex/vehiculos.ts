import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getScopedProjectId, getScopedOrgId, getAuthScope, requireOrgAccess, requireWriteRole } from "./lib/auth";
import { getMotionState } from "./lib/gps";

// List all vehicles.
// - Super_admin: ve todos (o filtra si pasa organizacion_id).
// - Admin: ve todos los vehículos de su organización.
// - Conductor: SOLO su vehículo asignado.
// - Enterprise: solo veh. con asignación en_progreso en su proyecto (live).
export const list = query({
  args: { proyecto_id: v.optional(v.id("proyectos")) },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) {
      return await ctx.db.query("vehiculos").collect();
    }
    if (scope.isConductor) {
      if (!scope.perfil?.vehiculo_asignado_id) return [];
      const veh = await ctx.db.get(scope.perfil.vehiculo_asignado_id);
      return veh ? [veh] : [];
    }
    if (scope.isAdmin) {
      if (!scope.organizacionId) return [];
      const all = await ctx.db.query("vehiculos").collect();
      return all.filter((v) => v.organizacion_id === scope.organizacionId);
    }
    // Enterprise
    const scoped = await getScopedProjectId(ctx, args.proyecto_id ?? null);
    if (!scoped) return [];
    const live = await ctx.db
      .query("asignaciones_rutas")
      .withIndex("by_proyecto", (q) => q.eq("proyecto_id", scoped))
      .filter((q) => q.eq(q.field("estado"), "en_progreso"))
      .collect();
    const vehiculoIds = new Set(live.map((a) => a.vehiculo_id));
    if (vehiculoIds.size === 0) return [];
    const all = await ctx.db.query("vehiculos").collect();
    return all.filter((v) => vehiculoIds.has(v._id));
  },
});

// List vehicles with minimal fields (for map view). Scope igual que list.
export const listMinimal = query({
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    let vehicles;
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) {
      vehicles = await ctx.db.query("vehiculos").collect();
    } else if (scope.isConductor) {
      if (!scope.perfil?.vehiculo_asignado_id) return [];
      const veh = await ctx.db.get(scope.perfil.vehiculo_asignado_id);
      vehicles = veh ? [veh] : [];
    } else if (scope.organizacionId) {
      const all = await ctx.db.query("vehiculos").collect();
      vehicles = all.filter((v) => v.organizacion_id === scope.organizacionId);
    } else {
      return [];
    }

    return vehicles.map((v) => ({
      _id: v._id,
      placa: v.placa,
      nombre: v.nombre,
      estado: v.estado,
      tipo_servicio: v.tipo_servicio,
      gps_latitud: v.gps_latitud,
      gps_longitud: v.gps_longitud,
      gps_velocidad: v.gps_velocidad,
      gps_ultima_motion: v.gps_ultima_motion,
      gps_state: getMotionState(v.gps_velocidad, v.gps_ultima_motion, v.gps_ultima_actualizacion),
    }));
  },
});

// List vehicles with assignment data (conductor, ruta)
// Optimized for map view with JOIN done in backend.
// Picks best assignment per vehicle with priority:
//   1. estado === 'en_progreso'  (currently running — live)
//   2. estado === 'programada'   recurring via dias_semana matching today
//   3. estado === 'programada'   nearest future fecha_asignacion (>= today)
//   No fallback to past dates — past programadas are ignored.
export const listWithAssignments = query({
  args: {
    proyecto_id: v.optional(v.id("proyectos")),
    organizacion_id: v.optional(v.id("organizaciones")),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);

    // Cross-org viewer: ve TODOS los vehículos de TODAS las orgs (como super_admin)
    const crossOrg = scope.isCrossOrgViewer;

    const scoped = crossOrg
      ? (args.proyecto_id ?? null)
      : scope.isAdmin
        ? (args.proyecto_id ?? null)
        : await getScopedProjectId(ctx, args.proyecto_id ?? null);
    const scopedOrg = crossOrg
      ? (args.organizacion_id ?? null)
      : await getScopedOrgId(ctx, args.organizacion_id ?? null);

    // ENTERPRISE: visibilidad live derivada de route_progress (no de asignaciones).
    // Esto cubre rutas recurrentes (cuya asignación queda en 'programada' aunque corra).
    if (scope.isEnterprise && !crossOrg) {
      if (!scoped) return [];
      // Tomar TODOS los progress en_progreso y filtrar por proyecto en memoria.
      // Esto es defensivo: si route_progress.proyecto_id está vacío (datos legacy),
      // se deriva de la ruta o de la asignación linkeada.
      const allLive = await ctx.db
        .query("route_progress")
        .withIndex("by_estado", (q) => q.eq("estado", "en_progreso"))
        .collect();
      const matched = [];
      for (const rp of allLive) {
        let proyectoIdEffective = rp.proyecto_id;
        if (!proyectoIdEffective && rp.asignacion_id) {
          const a = await ctx.db.get(rp.asignacion_id);
          proyectoIdEffective = a?.proyecto_id;
        }
        if (!proyectoIdEffective && rp.ruta_id) {
          const r = await ctx.db.get(rp.ruta_id);
          proyectoIdEffective = r?.proyecto_id;
        }
        if (proyectoIdEffective === scoped) matched.push(rp);
      }
      if (matched.length === 0) return [];
      const allVehicles = await ctx.db.query("vehiculos").collect();
      const vehById = new Map(allVehicles.map((v) => [v._id, v]));
      const result = [];
      for (const rp of matched) {
        const v = vehById.get(rp.vehiculo_id);
        if (!v) continue;
        const a = rp.asignacion_id ? await ctx.db.get(rp.asignacion_id) : null;
        result.push({
          _id: v._id,
          placa: v.placa,
          nombre: v.nombre,
          marca: v.marca,
          modelo: v.modelo,
          estado: v.estado,
          tipo_servicio: v.tipo_servicio,
          tipo_vehiculo: v.tipo_vehiculo,
          gps_latitud: v.gps_latitud,
          gps_longitud: v.gps_longitud,
          gps_velocidad: v.gps_velocidad,
          gps_rumbo: v.gps_rumbo,
          gps_ultima_actualizacion: v.gps_ultima_actualizacion,
          gps_ultima_motion: v.gps_ultima_motion,
          gps_conectado: v.gps_conectado,
          gps_en_linea: v.gps_en_linea,
          gps_state: getMotionState(v.gps_velocidad, v.gps_ultima_motion, v.gps_ultima_actualizacion),
          safetag_device_id: v.safetag_device_id,
          safetag_device_name: v.safetag_device_name,
          conductor_nombre: rp.conductor_nombre,
          ruta_id: rp.ruta_id,
          asignacion_id: rp.asignacion_id,
          asignacion_estado: "en_progreso",
          asignacion_fecha: a?.fecha_asignacion,
          asignacion_hora_inicio: a?.hora_inicio,
          proyecto_id: rp.proyecto_id,
        });
      }
      return result;
    }

    const allVehiclesRaw = await ctx.db.query("vehiculos").collect();
    const vehicles = scopedOrg
      ? allVehiclesRaw.filter((v) => v.organizacion_id === scopedOrg)
      : allVehiclesRaw;

    const allAssignments = await ctx.db.query("asignaciones_rutas").collect();
    const relevant = allAssignments.filter(
      (a) => {
        if (a.estado !== "en_progreso" && a.estado !== "programada") return false;
        // Enterprise/Conductor: solo asignaciones de su proyecto.
        // Admin con picker: si scoped existe, filtra por ese proyecto; si null, todos.
        if (scoped !== null && a.proyecto_id !== scoped) return false;
        return true;
      }
    );

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const todayDayName = dayNames[now.getDay()];

    // Is this assignment literally live TODAY? (tight check — reject orphans)
    // fecha_inicio must be today, so yesterday's en_progreso that never closed is rejected.
    const startedToday = (a: typeof relevant[number]) =>
      !!(a.fecha_inicio && a.fecha_inicio.startsWith(today));

    // Is programada valid for today (recurring dias_semana today OR one-off today)?
    const programadaToday = (a: typeof relevant[number]) => {
      if (Array.isArray(a.dias_semana) && a.dias_semana.includes(todayDayName)) return true;
      if (a.fecha_asignacion === today) return true;
      return false;
    };

    const pickBest = (vehiculoId: typeof vehicles[number]["_id"]) => {
      const forVehicle = relevant.filter(a => a.vehiculo_id === vehiculoId);
      if (forVehicle.length === 0) return null;

      // 1. en_progreso — only if route started TODAY
      const live = forVehicle.find(a => a.estado === 'en_progreso' && startedToday(a));
      if (live) return live;

      const programadas = forVehicle.filter(a => a.estado === 'programada');
      if (programadas.length === 0) return null;

      // 2. Programada valid today (recurring or one-off today)
      const todayProg = programadas.find(programadaToday);
      if (todayProg) return todayProg;

      // 3. Next future one-off programada
      const future = programadas
        .filter(a => (a.fecha_asignacion || '') > today)
        .sort((a, b) => (a.fecha_asignacion || '').localeCompare(b.fecha_asignacion || ''));
      if (future.length > 0) return future[0];

      return null;
    };

    const enriched = vehicles.map((v) => {
      const assignment = pickBest(v._id);

      return {
        _id: v._id,
        placa: v.placa,
        nombre: v.nombre,
        marca: v.marca,
        modelo: v.modelo,
        estado: v.estado,
        tipo_servicio: v.tipo_servicio,
        tipo_vehiculo: v.tipo_vehiculo,
        gps_latitud: v.gps_latitud,
        gps_longitud: v.gps_longitud,
        gps_velocidad: v.gps_velocidad,
        gps_rumbo: v.gps_rumbo,
        gps_ultima_actualizacion: v.gps_ultima_actualizacion,
        gps_ultima_motion: v.gps_ultima_motion,
        gps_conectado: v.gps_conectado,
        gps_en_linea: v.gps_en_linea,
        gps_state: getMotionState(v.gps_velocidad, v.gps_ultima_motion, v.gps_ultima_actualizacion),
        safetag_device_id: v.safetag_device_id,
        safetag_device_name: v.safetag_device_name,
        conductor_nombre: assignment?.conductor_nombre,
        ruta_id: assignment?.ruta_id,
        asignacion_id: assignment?._id,
        asignacion_estado: assignment?.estado,
        asignacion_fecha: assignment?.fecha_asignacion,
        asignacion_hora_inicio: assignment?.hora_inicio,
        proyecto_id: assignment?.proyecto_id,
      };
    });

    // Admin: ve todo (o filtrado por proyecto si pasó el arg).
    // Conductor: ve la flota (necesita su vehículo asignado siempre, no solo cuando la ruta arrancó).
    return enriched;
  },
});

// Add vehicle
export const add = mutation({
  args: {
    nombre: v.optional(v.string()),
    placa: v.string(),
    marca: v.optional(v.string()),
    modelo: v.optional(v.string()),
    anio: v.optional(v.number()), // Year of vehicle
    tipo: v.optional(v.string()),
    tipoServicio: v.optional(v.string()), // Frontend usa camelCase
    tipo_servicio: v.optional(v.string()), // También aceptar snake_case
    tipoVehiculo: v.optional(v.string()), // tipo_vehiculo del frontend
    capacidad_carga: v.optional(v.number()),
    proyecto_asignado_id: v.optional(v.id("proyectos")),
    // Campos GPS SafeTag
    gps_imei: v.optional(v.string()),
    gps_protocolo: v.optional(v.string()),
    safetagDeviceId: v.optional(v.string()), // IMEI del GPS SafeTag (frontend)
    safetagDeviceName: v.optional(v.string()), // Nombre del GPS SafeTag (frontend)
  },
  handler: async (ctx, args) => {
    const scope = await requireWriteRole(ctx);
    if (!scope.isSuperAdmin && !scope.isAdmin) {
      throw new Error("Acceso denegado: solo admin/super_admin pueden crear vehículos");
    }
    if (!scope.organizacionId && !scope.isSuperAdmin) {
      throw new Error("Admin sin organización asignada");
    }
    if (args.proyecto_asignado_id) {
      const proyecto = await ctx.db.get(args.proyecto_asignado_id);
      if (!proyecto) throw new Error("Proyecto no encontrado");
      if (!scope.isSuperAdmin && proyecto.organizacion_id !== scope.organizacionId) {
        throw new Error("Acceso denegado al proyecto");
      }
    }

    const anio = args.anio;
    const tipo_servicio = args.tipoServicio || args.tipo_servicio;
    const tipo_vehiculo = args.tipoVehiculo;
    const safetag_device_id = args.safetagDeviceId || args.gps_imei;
    const safetag_device_name = args.safetagDeviceName;

    // Placa uniqueness scoped a la org. Super_admin (sin org propia) requiere arg explícito;
    // sin él no enforce uniqueness — multi-org puede tener placas iguales por país.
    const placaTrim = args.placa?.trim();
    const targetOrg = scope.organizacionId ?? null;
    if (placaTrim && targetOrg) {
      const existing = await ctx.db
        .query("vehiculos")
        .withIndex("by_placa", (q) => q.eq("placa", placaTrim))
        .first();
      if (existing && existing.organizacion_id === targetOrg) {
        throw new Error(`Placa ${placaTrim} ya registrada en esta organización`);
      }
    }

    // IMEI uniqueness GLOBAL — un device GPS NO puede mapear a 2 vehículos (orphana tracking).
    if (safetag_device_id) {
      const existingDev = await ctx.db
        .query("vehiculos")
        .withIndex("by_safetag_device", (q) => q.eq("safetag_device_id", safetag_device_id))
        .first();
      if (existingDev) {
        throw new Error(`IMEI ${safetag_device_id} ya asignado a otro vehículo`);
      }
    }

    return await ctx.db.insert("vehiculos", {
      nombre: args.nombre,
      placa: args.placa,
      marca: args.marca,
      modelo: args.modelo,
      anio,
      tipo: args.tipo || tipo_vehiculo || "camion",
      tipo_servicio: tipo_servicio || "limpieza",
      tipo_vehiculo,
      capacidad_carga: args.capacidad_carga,
      proyecto_asignado_id: args.proyecto_asignado_id,
      organizacion_id: scope.organizacionId ?? undefined,
      estado: "disponible",
      kilometraje: 0,
      safetag_device_id,
      safetag_device_name,
      gps_imei: safetag_device_id,
      gps_protocolo: args.gps_protocolo,
      gps_conectado: safetag_device_id ? false : undefined,
      gps_en_linea: false,
    });
  },
});

// Update vehicle
export const update = mutation({
  args: {
    id: v.id("vehiculos"),
    nombre: v.optional(v.string()),
    placa: v.optional(v.string()),
    marca: v.optional(v.string()),
    modelo: v.optional(v.string()),
    anio: v.optional(v.number()),
    tipo: v.optional(v.string()),
    tipo_servicio: v.optional(v.string()),
    estado: v.optional(v.string()),
    capacidad_carga: v.optional(v.number()),
    kilometraje: v.optional(v.number()),
    proyecto_asignado_id: v.optional(v.id("proyectos")),
    // Campos GPS
    safetag_device_id: v.optional(v.string()),
    safetag_device_name: v.optional(v.string()),
    gps_imei: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    const { id, ...updates } = args;
    const veh = await ctx.db.get(id);
    if (!veh) throw new Error("Vehículo no encontrado");
    if (!veh.organizacion_id) throw new Error("Vehículo sin organización — requiere migración");
    await requireOrgAccess(ctx, veh.organizacion_id);

    // Placa uniqueness en update (scoped a org del vehículo).
    if (updates.placa && updates.placa.trim() !== veh.placa) {
      const placaTrim = updates.placa.trim();
      const existing = await ctx.db
        .query("vehiculos")
        .withIndex("by_placa", (q) => q.eq("placa", placaTrim))
        .first();
      if (existing && existing._id !== id && existing.organizacion_id === veh.organizacion_id) {
        throw new Error(`Placa ${placaTrim} ya registrada en esta organización`);
      }
    }
    // IMEI uniqueness en update (global).
    const newImei = updates.safetag_device_id ?? updates.gps_imei;
    if (newImei && newImei !== veh.safetag_device_id && newImei !== veh.gps_imei) {
      const existingDev = await ctx.db
        .query("vehiculos")
        .withIndex("by_safetag_device", (q) => q.eq("safetag_device_id", newImei))
        .first();
      if (existingDev && existingDev._id !== id) {
        throw new Error(`IMEI ${newImei} ya asignado a otro vehículo`);
      }
    }

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

// Update GPS position (single vehicle). Auth: solo admin del org del vehículo o super_admin.
// El path normal de GPS es vía webhook/cron — esta mutation manual es backup.
export const updateGPS = mutation({
  args: {
    id: v.id("vehiculos"),
    gps_latitud: v.number(),
    gps_longitud: v.number(),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    const veh = await ctx.db.get(args.id);
    if (!veh) throw new Error("Vehículo no encontrado");
    if (!veh.organizacion_id) throw new Error("Vehículo sin organización — requiere migración");
    await requireOrgAccess(ctx, veh.organizacion_id);
    return await ctx.db.patch(args.id, {
      gps_latitud: args.gps_latitud,
      gps_longitud: args.gps_longitud,
    });
  },
});

// Update estado. Solo admin del org del vehículo o super_admin.
export const updateEstado = mutation({
  args: {
    id: v.id("vehiculos"),
    estado: v.string(),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    const veh = await ctx.db.get(args.id);
    if (!veh) throw new Error("Vehículo no encontrado");
    if (!veh.organizacion_id) throw new Error("Vehículo sin organización — requiere migración");
    await requireOrgAccess(ctx, veh.organizacion_id);
    return await ctx.db.patch(args.id, { estado: args.estado });
  },
});


// Update kilometraje
export const updateKilometraje = mutation({
  args: {
    id: v.id("vehiculos"),
    kilometraje: v.number(),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    const veh = await ctx.db.get(args.id);
    if (!veh) throw new Error("Vehículo no encontrado");
    if (!veh.organizacion_id) throw new Error("Vehículo sin organización — requiere migración");
    await requireOrgAccess(ctx, veh.organizacion_id);
    return await ctx.db.patch(args.id, { kilometraje: args.kilometraje });
  },
});

// Delete vehicle. Block-if-children: refs activos en asignaciones/route_progress lo bloquean.
// Vehículos eliminados con assignments dejan FKs colgantes — admin debe limpiar primero.
export const remove = mutation({
  args: { id: v.id("vehiculos") },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    const veh = await ctx.db.get(args.id);
    if (!veh) throw new Error("Vehículo no encontrado");
    if (!veh.organizacion_id) throw new Error("Vehículo sin organización — requiere migración");
    await requireOrgAccess(ctx, veh.organizacion_id);

    // Block-if-children: asignaciones/progress activos previenen delete.
    const activeAsign = await ctx.db
      .query("asignaciones_rutas")
      .withIndex("by_vehiculo", (q) => q.eq("vehiculo_id", args.id))
      .filter((q) => q.or(q.eq(q.field("estado"), "asignada"), q.eq(q.field("estado"), "en_progreso"), q.eq(q.field("estado"), "programada")))
      .take(1);
    if (activeAsign.length > 0) {
      throw new Error("No se puede eliminar: vehículo tiene asignaciones activas. Cancélalas primero.");
    }
    const activeProg = await ctx.db
      .query("route_progress")
      .withIndex("by_estado", (q) => q.eq("estado", "en_progreso"))
      .filter((q) => q.eq(q.field("vehiculo_id"), args.id))
      .take(1);
    if (activeProg.length > 0) {
      throw new Error("No se puede eliminar: vehículo tiene ruta en progreso. Espera o termina la ruta.");
    }

    // Cascade cleanup: borrar geofence_state ahora (siempre poco volumen).
    // GPS location_history puede tener miles de rows (SafeTag c/minuto) — excede
    // límite de 4096 reads per function. Lo borramos en background via scheduler.
    const states = await ctx.db
      .query("vehicle_geofence_state")
      .withIndex("by_vehiculo", (q) => q.eq("vehiculo_id", args.id))
      .collect();
    for (const s of states) await ctx.db.delete(s._id);

    // Borrar primer batch de history (hasta 2000 rows pa' caber en el read limit)
    // y schedule background cleanup pa' lo que quede.
    const HISTORY_BATCH = 2000;
    const firstBatch = await ctx.db
      .query("vehicle_location_history")
      .withIndex("by_vehiculo", (q) => q.eq("vehiculo_id", args.id))
      .take(HISTORY_BATCH);
    for (const h of firstBatch) await ctx.db.delete(h._id);

    // Si llenó el batch, probablemente quedan más → cleanup async
    if (firstBatch.length === HISTORY_BATCH) {
      await ctx.scheduler.runAfter(0, internal.vehiculos._cleanupVehicleHistoryBatch, {
        vehiculoId: args.id,
      });
    }

    return await ctx.db.delete(args.id);
  },
});

// Internal mutation pa' batch cleanup recursivo del GPS history.
// Llamado por remove() cuando hay muchas filas. Se reschedule a si mismo
// hasta limpiar todo.
export const _cleanupVehicleHistoryBatch = internalMutation({
  args: { vehiculoId: v.id("vehiculos") },
  handler: async (ctx, args) => {
    const BATCH_SIZE = 2000;
    const batch = await ctx.db
      .query("vehicle_location_history")
      .withIndex("by_vehiculo", (q) => q.eq("vehiculo_id", args.vehiculoId))
      .take(BATCH_SIZE);

    for (const row of batch) {
      await ctx.db.delete(row._id);
    }

    // Si llenó el batch, quedan más — reschedule.
    if (batch.length === BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.vehiculos._cleanupVehicleHistoryBatch, args);
    }
  },
});

// Get fleet stats (scoped per organization)
export const getStats = query({
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    const all = await ctx.db.query("vehiculos").collect();
    let vehicles = all;
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      if (!scope.organizacionId) return { total: 0, disponibles: 0, en_ruta: 0, en_mantenimiento: 0 };
      vehicles = all.filter((v) => v.organizacion_id === scope.organizacionId);
    }

    const disponibles = vehicles.filter(v => v.estado === "disponible").length;
    const en_ruta = vehicles.filter(v => v.estado === "en_ruta").length;
    const en_mantenimiento = vehicles.filter(v => v.estado === "en_mantenimiento").length;

    return {
      total: vehicles.length,
      disponibles,
      en_ruta,
      en_mantenimiento,
    };
  },
});


// ============================================================
// DEBUG: diagnostica vehículos que no se pueden eliminar
// Devuelve para cada vehículo de la org del caller las razones por
// las que el delete está bloqueado (asignaciones activas / progress).
// Uso: convex dashboard → Functions → vehiculos:diagnoseBlockedDeletes → Run
// ============================================================
export const diagnoseBlockedDeletes = query({
  handler: async (ctx) => {
    // Diagnóstico read-only EXTENDIDO — chequea TODAS las FKs.
    const vehiculos = await ctx.db.query("vehiculos").collect();

    const results = [];
    for (const v of vehiculos) {
      const blockers: string[] = [];

      if (!v.organizacion_id) {
        blockers.push("Sin organizacion_id (vehículo legacy)");
      }

      const activeAsign = await ctx.db
        .query("asignaciones_rutas")
        .withIndex("by_vehiculo", (q) => q.eq("vehiculo_id", v._id))
        .filter((q) =>
          q.or(
            q.eq(q.field("estado"), "asignada"),
            q.eq(q.field("estado"), "en_progreso"),
            q.eq(q.field("estado"), "programada"),
          ),
        )
        .collect();
      if (activeAsign.length > 0) {
        blockers.push(
          `${activeAsign.length} asignacion(es) activa(s): ${activeAsign.map((a) => `${a._id} (${a.estado})`).join(", ")}`,
        );
      }

      const activeProg = await ctx.db
        .query("route_progress")
        .withIndex("by_estado", (q) => q.eq("estado", "en_progreso"))
        .filter((q) => q.eq(q.field("vehiculo_id"), v._id))
        .collect();
      if (activeProg.length > 0) {
        blockers.push(
          `${activeProg.length} ruta(s) en progreso: ${activeProg.map((p) => p._id).join(", ")}`,
        );
      }

      // Soft-related (NO bloquean remove() actualmente, pero data orphan se queda):
      const conductoresAsignados = await ctx.db
        .query("perfiles_usuarios")
        .filter((q) => q.eq(q.field("vehiculo_asignado_id"), v._id))
        .collect();

      const allAsign = await ctx.db
        .query("asignaciones_rutas")
        .withIndex("by_vehiculo", (q) => q.eq("vehiculo_id", v._id))
        .collect();

      const componentes = await ctx.db
        .query("vehicle_components")
        .withIndex("by_vehiculo", (q) => q.eq("vehiculo_id", v._id))
        .collect();

      const maintTasks = await ctx.db
        .query("maintenance_tasks")
        .filter((q) => q.eq(q.field("vehiculo_id"), v._id))
        .collect();

      results.push({
        vehiculo_id: v._id,
        placa: v.placa,
        nombre: v.nombre || "(sin nombre)",
        estado: v.estado,
        organizacion_id: v.organizacion_id || null,
        canDelete: blockers.length === 0,
        blockers,
        soft_refs: {
          conductores_asignados: conductoresAsignados.length,
          conductor_ids: conductoresAsignados.map((c) => ({ id: c._id, nombre: c.nombre_completo, tipo: c.tipo_usuario })),
          asignaciones_total: allAsign.length,
          asignaciones_por_estado: allAsign.reduce((acc, a) => {
            acc[a.estado] = (acc[a.estado] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          vehicle_components: componentes.length,
          maintenance_tasks: maintTasks.length,
        },
      });
    }

    return results;
  },
});
