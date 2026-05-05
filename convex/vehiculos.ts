import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getScopedProjectId, getScopedOrgId, getAuthScope, requireOrgAccess } from "./lib/auth";

// List all vehicles.
// - Super_admin: ve todos (o filtra si pasa organizacion_id).
// - Admin: ve todos los vehículos de su organización.
// - Conductor: ve la flota de su organización.
// - Enterprise: solo veh. con asignación en_progreso en su proyecto (live).
export const list = query({
  args: { proyecto_id: v.optional(v.id("proyectos")) },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) {
      return await ctx.db.query("vehiculos").collect();
    }
    if (scope.isAdmin || scope.isConductor) {
      if (!scope.organizacionId) return [];
      // Filtrar por organización (defensa en profundidad)
      const all = await ctx.db.query("vehiculos").collect();
      return all.filter(
        (v) => !v.organizacion_id || v.organizacion_id === scope.organizacionId
      );
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

// List vehicles with minimal fields (for map view)
// This reduces bandwidth by 60-80% by only sending essential GPS data
export const listMinimal = query({
  handler: async (ctx) => {
    const vehicles = await ctx.db.query("vehiculos").collect();

    // Only return fields needed for map markers
    return vehicles.map((v) => ({
      _id: v._id,
      placa: v.placa,
      nombre: v.nombre,
      estado: v.estado,
      tipo_servicio: v.tipo_servicio,
      gps_latitud: v.gps_latitud,
      gps_longitud: v.gps_longitud,
      // Omit: marca, modelo, capacidad_carga, etc.
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
          estado: v.estado,
          tipo_servicio: v.tipo_servicio,
          tipo_vehiculo: v.tipo_vehiculo,
          gps_latitud: v.gps_latitud,
          gps_longitud: v.gps_longitud,
          gps_velocidad: v.gps_velocidad,
          gps_rumbo: v.gps_rumbo,
          gps_ultima_actualizacion: v.gps_ultima_actualizacion,
          gps_conectado: v.gps_conectado,
          gps_en_linea: v.gps_en_linea,
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
      ? allVehiclesRaw.filter((v) => !v.organizacion_id || v.organizacion_id === scopedOrg)
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
        estado: v.estado,
        tipo_servicio: v.tipo_servicio,
        tipo_vehiculo: v.tipo_vehiculo,
        gps_latitud: v.gps_latitud,
        gps_longitud: v.gps_longitud,
        gps_velocidad: v.gps_velocidad,
        gps_rumbo: v.gps_rumbo,
        gps_ultima_actualizacion: v.gps_ultima_actualizacion,
        gps_conectado: v.gps_conectado,
        gps_en_linea: v.gps_en_linea,
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

// Get vehicles by estado
export const getByEstado = query({
  args: { estado: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vehiculos")
      .withIndex("by_estado", (q) => q.eq("estado", args.estado))
      .collect();
  },
});

// Get vehicle by placa
export const getByPlaca = query({
  args: { placa: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vehiculos")
      .withIndex("by_placa", (q) => q.eq("placa", args.placa))
      .first();
  },
});

// Get vehicle by ID
export const getById = query({
  args: { id: v.id("vehiculos") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
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
    // Normalizar campos (frontend usa camelCase, DB usa snake_case)
    const anio = args.anio;
    const tipo_servicio = args.tipoServicio || args.tipo_servicio;
    const tipo_vehiculo = args.tipoVehiculo;
    const safetag_device_id = args.safetagDeviceId || args.gps_imei;
    const safetag_device_name = args.safetagDeviceName;

    return await ctx.db.insert("vehiculos", {
      nombre: args.nombre,
      placa: args.placa,
      marca: args.marca,
      modelo: args.modelo,
      anio,
      tipo: args.tipo || tipo_vehiculo || "camion",
      tipo_servicio: tipo_servicio || "limpieza",
      tipo_vehiculo, // Guardar tipo de vehículo específico
      capacidad_carga: args.capacidad_carga,
      proyecto_asignado_id: args.proyecto_asignado_id,
      estado: "disponible",
      combustible_nivel: 100,
      kilometraje: 0,
      // GPS SafeTag
      safetag_device_id,
      safetag_device_name,
      gps_imei: safetag_device_id, // Usar el IMEI de SafeTag
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
    combustible_nivel: v.optional(v.number()),
    kilometraje: v.optional(v.number()),
    proyecto_asignado_id: v.optional(v.id("proyectos")),
    // Campos GPS
    safetag_device_id: v.optional(v.string()),
    safetag_device_name: v.optional(v.string()),
    gps_imei: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const veh = await ctx.db.get(id);
    if (!veh) throw new Error("Vehículo no encontrado");
    if (veh.organizacion_id) await requireOrgAccess(ctx, veh.organizacion_id);

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

// Update GPS position (single vehicle)
export const updateGPS = mutation({
  args: {
    id: v.id("vehiculos"),
    gps_latitud: v.number(),
    gps_longitud: v.number(),
  },
  handler: async (ctx, args) => {
    const { id, gps_latitud, gps_longitud } = args;
    return await ctx.db.patch(id, { gps_latitud, gps_longitud });
  },
});

// BATCHED: Update GPS position for multiple vehicles at once
// This reduces network overhead and triggers only ONE subscription update
export const batchUpdateGPS = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("vehiculos"),
        gps_latitud: v.number(),
        gps_longitud: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Update all vehicles in parallel within a single transaction
    const results = await Promise.all(
      args.updates.map((update) =>
        ctx.db.patch(update.id, {
          gps_latitud: update.gps_latitud,
          gps_longitud: update.gps_longitud,
        })
      )
    );

    return {
      success: true,
      updated: results.length,
    };
  },
});

// Update estado
export const updateEstado = mutation({
  args: {
    id: v.id("vehiculos"),
    estado: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, { estado: args.estado });
  },
});

// Update combustible
export const updateCombustible = mutation({
  args: {
    id: v.id("vehiculos"),
    combustible_nivel: v.number(),
  },
  handler: async (ctx, args) => {
    const veh = await ctx.db.get(args.id);
    if (!veh) throw new Error("Vehículo no encontrado");
    if (veh.organizacion_id) await requireOrgAccess(ctx, veh.organizacion_id);
    return await ctx.db.patch(args.id, { combustible_nivel: args.combustible_nivel });
  },
});

// Update kilometraje
export const updateKilometraje = mutation({
  args: {
    id: v.id("vehiculos"),
    kilometraje: v.number(),
  },
  handler: async (ctx, args) => {
    const veh = await ctx.db.get(args.id);
    if (!veh) throw new Error("Vehículo no encontrado");
    if (veh.organizacion_id) await requireOrgAccess(ctx, veh.organizacion_id);
    return await ctx.db.patch(args.id, { kilometraje: args.kilometraje });
  },
});

// Delete vehicle
export const remove = mutation({
  args: { id: v.id("vehiculos") },
  handler: async (ctx, args) => {
    const veh = await ctx.db.get(args.id);
    if (!veh) throw new Error("Vehículo no encontrado");
    if (veh.organizacion_id) await requireOrgAccess(ctx, veh.organizacion_id);
    return await ctx.db.delete(args.id);
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
      vehicles = all.filter((v) => !v.organizacion_id || v.organizacion_id === scope.organizacionId);
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
