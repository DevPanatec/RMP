import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all vehicles
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("vehiculos").collect();
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
// Optimized for map view with JOIN done in backend
export const listWithAssignments = query({
  handler: async (ctx) => {
    const vehicles = await ctx.db.query("vehiculos").collect();

    // Get active assignments (programada or en_progreso)
    const allAssignments = await ctx.db.query("asignaciones_rutas").collect();
    const activeAssignments = allAssignments.filter(
      a => a.estado === 'en_progreso' || a.estado === 'programada'
    );

    // JOIN vehicles with assignments
    return vehicles.map((v) => {
      const assignment = activeAssignments.find(a => a.vehiculo_id === v._id);

      return {
        _id: v._id,
        placa: v.placa,
        nombre: v.nombre,
        estado: v.estado,
        tipo_servicio: v.tipo_servicio,
        tipo_vehiculo: v.tipo_vehiculo,
        // GPS data
        gps_latitud: v.gps_latitud,
        gps_longitud: v.gps_longitud,
        gps_velocidad: v.gps_velocidad,
        gps_rumbo: v.gps_rumbo,
        gps_ultima_actualizacion: v.gps_ultima_actualizacion,
        gps_conectado: v.gps_conectado,
        gps_en_linea: v.gps_en_linea,
        // Assignment data (null if no active assignment)
        conductor_nombre: assignment?.conductor_nombre,
        ruta_id: assignment?.ruta_id,
        asignacion_id: assignment?._id,
      };
    });
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
    return await ctx.db.patch(args.id, { kilometraje: args.kilometraje });
  },
});

// Delete vehicle
export const remove = mutation({
  args: { id: v.id("vehiculos") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

// Get fleet stats
export const getStats = query({
  handler: async (ctx) => {
    const vehicles = await ctx.db.query("vehiculos").collect();

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
