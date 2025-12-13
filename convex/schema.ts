import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 1. Perfiles de Usuarios (Auth)
  perfiles_usuarios: defineTable({
    userId: v.string(), // ID del usuario autenticado
    tipo_usuario: v.union(v.literal("admin"), v.literal("enterprise"), v.literal("conductor")),
    nombre_completo: v.string(),
    email: v.string(),
    telefono: v.optional(v.string()),
    documento: v.optional(v.string()),
    foto_url: v.optional(v.string()),
    vehiculo_asignado_id: v.optional(v.id("vehiculos")),
    proyecto_id: v.optional(v.id("proyectos")),
    activo: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_tipo", ["tipo_usuario"])
    .index("by_email", ["email"]),

  // 2. Proyectos
  proyectos: defineTable({
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    cliente: v.optional(v.string()),
    fecha_inicio: v.optional(v.string()),
    fecha_fin: v.optional(v.string()),
    activo: v.boolean(),
  }).index("by_activo", ["activo"]),

  // 3. Vehículos (Fleet)
  vehiculos: defineTable({
    nombre: v.optional(v.string()), // Nombre descriptivo del vehículo
    placa: v.string(),
    marca: v.optional(v.string()),
    modelo: v.optional(v.string()),
    anio: v.optional(v.number()),
    tipo: v.optional(v.string()), // "camion", "camioneta", etc.
    tipo_servicio: v.string(), // "recoleccion", "fumigacion"
    estado: v.string(), // "disponible", "en_ruta", "en_mantenimiento"
    capacidad_carga: v.optional(v.number()),
    combustible_nivel: v.optional(v.number()),
    kilometraje: v.optional(v.number()),
    // Campos GPS
    gps_latitud: v.optional(v.number()),
    gps_longitud: v.optional(v.number()),
    gps_imei: v.optional(v.string()), // IMEI único del dispositivo GPS (15 dígitos)
    gps_protocolo: v.optional(v.string()), // "GT06", "H02", "TK103", etc.
    gps_ultima_actualizacion: v.optional(v.number()), // Timestamp última posición recibida (number para consistencia)
    safetag_timestamp: v.optional(v.number()), // Timestamp original de SafeTag (para referencia)
    gps_conectado: v.optional(v.boolean()), // Estado de conexión GPS (true si reportó en últimos 5 min)
    gps_velocidad: v.optional(v.number()), // Velocidad actual en km/h
    gps_rumbo: v.optional(v.number()), // Dirección del movimiento en grados (0-359)
    gps_altitud: v.optional(v.number()), // Altitud en metros sobre nivel del mar
    gps_precision: v.optional(v.number()), // Precisión GPS (HDOP - Horizontal Dilution of Precision)
    gps_satelites: v.optional(v.number()), // Número de satélites GPS en uso
    // SafeTag Integration
    safetag_device_id: v.optional(v.string()), // IMEI/Serial del GPS SafeTag
    safetag_device_name: v.optional(v.string()), // Nombre amigable del dispositivo SafeTag
    gps_bateria: v.optional(v.number()), // % batería del GPS
    gps_senal: v.optional(v.number()), // Señal GSM
    gps_en_linea: v.optional(v.boolean()), // Online status
    proyecto_asignado_id: v.optional(v.id("proyectos")),
  })
    .index("by_estado", ["estado"])
    .index("by_placa", ["placa"])
    .index("by_gps_imei", ["gps_imei"]) // Índice para búsqueda rápida por IMEI
    .index("by_safetag_device", ["safetag_device_id"]), // Índice para búsqueda por SafeTag Device ID

  // 4. Rutas
  rutas: defineTable({
    nombre: v.string(),
    proyecto_id: v.optional(v.id("proyectos")),
    tipo_servicio: v.string(),
    paradas: v.array(v.any()), // Array de paradas (JSONB)
    fecha_programada: v.optional(v.string()),
    hora_inicio: v.optional(v.string()),
    hora_fin: v.optional(v.string()),
    estado: v.string(), // "pendiente", "en_progreso", "completada", "cancelada"
    distancia_total: v.optional(v.number()),
    combustible_estimado: v.optional(v.number()),
    observaciones: v.optional(v.string()),
  })
    .index("by_estado", ["estado"])
    .index("by_proyecto", ["proyecto_id"]),

  // 5. Asignaciones de Rutas
  asignaciones_rutas: defineTable({
    ruta_id: v.id("rutas"),
    conductor_id: v.id("perfiles_usuarios"),
    vehiculo_id: v.id("vehiculos"),
    proyecto_id: v.optional(v.id("proyectos")),
    fecha_asignacion: v.string(),
    fecha_inicio: v.optional(v.string()),
    fecha_completacion: v.optional(v.string()),
    estado: v.string(), // "asignada", "en_progreso", "completada", "cancelada"
    paradas_completadas: v.optional(v.array(v.any())),
    dias_semana: v.optional(v.array(v.string())),
    ayudantes: v.optional(v.array(v.any())),
  })
    .index("by_conductor", ["conductor_id"])
    .index("by_vehiculo", ["vehiculo_id"])
    .index("by_ruta", ["ruta_id"])
    .index("by_estado", ["estado"]),

  // 6. Progreso de Rutas (Real-time tracking)
  route_progress: defineTable({
    conductor_id: v.id("perfiles_usuarios"),
    conductor_nombre: v.string(),
    ruta_id: v.id("rutas"),
    vehiculo_id: v.id("vehiculos"),
    asignacion_id: v.id("asignaciones_rutas"),
    fecha_inicio: v.string(),
    total_paradas: v.number(),
    paradas_completadas: v.optional(v.array(v.any())),
    posicion_actual: v.optional(v.any()),
    tipo_ruta: v.string(),
    estado: v.string(), // "en_progreso", "completada"
    route_report_id: v.optional(v.id("route_reports")),
  })
    .index("by_conductor", ["conductor_nombre"])
    .index("by_estado", ["estado"]),

  // 7. Reportes de Rutas Completadas
  route_reports: defineTable({
    ruta_id: v.optional(v.id("rutas")),
    asignacion_id: v.optional(v.id("asignaciones_rutas")),
    conductor_nombre: v.string(),
    conductor_id: v.optional(v.id("perfiles_usuarios")),
    vehiculo_placa: v.string(),
    vehiculo_id: v.optional(v.id("vehiculos")),
    fecha_inicio: v.string(),
    fecha_completacion: v.string(),
    tiempo_total_segundos: v.number(),
    paradas_completadas: v.array(v.any()),
    reportes_riesgo_ids: v.optional(v.array(v.string())),
    observaciones: v.optional(v.string()),
    tipo_ruta: v.string(),
    ruta_nombre: v.string(),
    ruta_paradas: v.optional(v.array(v.any())),
  })
    .index("by_conductor", ["conductor_nombre"])
    .index("by_fecha", ["fecha_completacion"]),

  // 8. Empleados
  empleados: defineTable({
    nombre: v.string(),
    apellido: v.string(),
    cedula: v.string(),
    telefono: v.optional(v.string()),
    fecha_nacimiento: v.optional(v.string()),
    direccion: v.optional(v.string()),
    cargo: v.optional(v.string()),
    salario: v.optional(v.number()),
    departamento: v.optional(v.string()),
    fecha_ingreso: v.optional(v.string()),
    activo: v.boolean(),
  })
    .index("by_cedula", ["cedula"])
    .index("by_activo", ["activo"]),

  // 9. Reportes de Riesgo
  reportes_riesgo: defineTable({
    titulo: v.string(),
    descripcion: v.string(),
    tipo_riesgo: v.string(), // "seguridad", "operacional", "ambiental", "equipo"
    nivel_severidad: v.string(), // "bajo", "medio", "alto", "crítico"
    ubicacion: v.optional(v.string()),
    gps_latitud: v.optional(v.number()),
    gps_longitud: v.optional(v.number()),
    empleado_reporta_id: v.optional(v.id("empleados")),
    proyecto_id: v.optional(v.id("proyectos")),
    vehiculo_id: v.optional(v.id("vehiculos")),
    ruta_id: v.optional(v.id("rutas")),
    prioridad: v.optional(v.number()),
    fecha_reporte: v.string(),
    estado: v.optional(v.string()),
  })
    .index("by_fecha", ["fecha_reporte"])
    .index("by_severidad", ["nivel_severidad"]),

  // 10. Inventario
  inventario: defineTable({
    codigo: v.optional(v.string()), // Código único auto-generado (MAT-001, MAT-002, etc.)
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    tipo_articulo: v.string(), // "herramienta", "insumo", "equipo", "uniforme"
    cantidad_minima: v.optional(v.number()),
    cantidad_maxima: v.optional(v.number()),
    unidad_medida: v.optional(v.string()),
    precio_unitario: v.optional(v.number()),
    proveedor: v.optional(v.string()),
    // Legacy field - mantener para compatibilidad con datos antiguos
    cantidad_disponible: v.optional(v.number()),
  })
    .index("by_tipo", ["tipo_articulo"]),

  // 10b. Inventario por Ubicación (distribuye items en múltiples lugares)
  inventario_ubicaciones: defineTable({
    item_id: v.id("inventario"),
    lugar_id: v.id("lugares"),
    cantidad: v.number(),
  })
    .index("by_item", ["item_id"])
    .index("by_lugar", ["lugar_id"])
    .index("by_item_lugar", ["item_id", "lugar_id"]),

  // 10c. Movimientos de Inventario (para tracking histórico y costos)
  inventario_movimientos: defineTable({
    item_id: v.id("inventario"),
    tipo_movimiento: v.string(), // "compra", "asignacion", "consumo", "ajuste"
    cantidad: v.number(),
    precio_unitario: v.optional(v.number()),
    costo_total: v.optional(v.number()),
    lugar_origen_id: v.optional(v.id("lugares")),
    lugar_destino_id: v.optional(v.id("lugares")),
    usuario_id: v.optional(v.id("perfiles_usuarios")),
    notas: v.optional(v.string()),
    fecha: v.number(), // timestamp
  })
    .index("by_item", ["item_id"])
    .index("by_fecha", ["fecha"])
    .index("by_tipo", ["tipo_movimiento"])
    .index("by_item_fecha", ["item_id", "fecha"]),

  // 11. Lugares/Salas (Cleaning)
  salas: defineTable({
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    activo: v.boolean(),
  }).index("by_activo", ["activo"]),

  // 11b. Lugares (Fumigación - espacios internos y externos)
  lugares: defineTable({
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    activo: v.boolean(),
  })
    .index("by_activo", ["activo"]),

  // 12. Áreas (Cleaning)
  areas: defineTable({
    sala_id: v.id("salas"),
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    activo: v.boolean(),
  })
    .index("by_sala", ["sala_id"])
    .index("by_activo", ["activo"]),

  // 13. Asignaciones de Limpieza
  cleaning_assignments: defineTable({
    sala_id: v.id("salas"),
    area_id: v.id("areas"),
    fecha: v.string(),
    hora: v.string(),
    estado: v.string(), // "pendiente", "en_progreso", "completado", "cancelado"
    notas: v.optional(v.string()),
    created_by: v.optional(v.string()),
  })
    .index("by_fecha", ["fecha"])
    .index("by_estado", ["estado"])
    .index("by_sala", ["sala_id"]),

  // 14. Fotos de Limpieza
  cleaning_photos: defineTable({
    assignment_id: v.id("cleaning_assignments"),
    etapa: v.string(), // "antes", "durante", "despues"
    storage_id: v.id("_storage"), // Convex file storage
    file_name: v.string(),
    file_size: v.optional(v.number()),
    mime_type: v.optional(v.string()),
  })
    .index("by_assignment", ["assignment_id"])
    .index("by_etapa", ["etapa"]),

  // 15. Tareas de Mantenimiento
  maintenance_tasks: defineTable({
    vehiculo_id: v.optional(v.id("vehiculos")),
    titulo: v.string(),
    descripcion: v.optional(v.string()),
    tipo: v.string(), // "preventivo", "correctivo", "inspección"
    prioridad: v.string(), // "baja", "media", "alta", "urgente"
    fecha_programada: v.optional(v.string()),
    fecha_completada: v.optional(v.string()),
    estado: v.string(), // "pendiente", "en_progreso", "completada", "cancelada"
    costo: v.optional(v.number()),
    mecanico: v.optional(v.string()),
    notas: v.optional(v.string()),
  })
    .index("by_vehiculo", ["vehiculo_id"])
    .index("by_estado", ["estado"])
    .index("by_fecha", ["fecha_programada"]),

  // 16. Alertas de Mantenimiento
  maintenance_alerts: defineTable({
    task_id: v.optional(v.id("maintenance_tasks")),
    vehiculo_id: v.optional(v.id("vehiculos")),
    tipo_alerta: v.string(), // "mantenimiento_vencido", "revision_pendiente", etc.
    mensaje: v.string(),
    severidad: v.string(), // "info", "warning", "error"
    fecha_generada: v.string(),
    leida: v.boolean(),
  })
    .index("by_vehiculo", ["vehiculo_id"])
    .index("by_leida", ["leida"]),

  // 17. Asignaciones de Fumigación
  fumigation_assignments: defineTable({
    tipo_fumigacion: v.union(v.literal("interna"), v.literal("externa")),
    lugar_id: v.id("lugares"), // Referencia a tabla de lugares (internos/externos)
    fecha: v.string(),
    horario_inicio: v.string(), // Preset "19:00" (7:00 PM)
    horario_fin: v.string(), // Preset "23:00" (11:00 PM)
    productos_utilizados: v.optional(v.array(v.string())),
    observaciones: v.optional(v.string()),
    estado: v.union(
      v.literal("programada"),
      v.literal("realizada"),
      v.literal("reportada")
    ),
    created_by: v.optional(v.string()),
  })
    .index("by_fecha", ["fecha"])
    .index("by_estado", ["estado"])
    .index("by_lugar", ["lugar_id"])
    .index("by_tipo", ["tipo_fumigacion"])
    .index("by_fecha_lugar_tipo", ["fecha", "lugar_id", "tipo_fumigacion"]),

  // 18. Fotos de Fumigación
  fumigation_photos: defineTable({
    assignment_id: v.id("fumigation_assignments"),
    storage_id: v.id("_storage"), // Convex file storage
    file_name: v.string(),
    file_size: v.optional(v.number()),
    mime_type: v.optional(v.string()),
  })
    .index("by_assignment", ["assignment_id"]),

  // 19. Geofences (Zonas de monitoreo)
  geofences: defineTable({
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    latitud: v.number(), // Centro de la zona
    longitud: v.number(),
    radio: v.number(), // Radio en metros
    color: v.optional(v.string()), // Color para visualización
    tipo: v.optional(v.string()), // "entrada", "salida", "ambos"
    activo: v.boolean(),
    created_at: v.number(),
  })
    .index("by_activo", ["activo"]),

  // 20. Alertas de Geofence
  geofence_alerts: defineTable({
    geofence_id: v.optional(v.id("geofences")),
    vehiculo_id: v.id("vehiculos"),
    device_id: v.optional(v.string()),
    tipo_evento: v.string(), // "entrada", "salida"
    timestamp: v.number(),
    category: v.optional(v.string()), // Para compatibilidad con SafeTag
    alert_title: v.optional(v.string()),
    alert_body: v.optional(v.string()),
    location: v.optional(v.string()),
    speed: v.optional(v.number()),
    viewed: v.boolean(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_vehiculo", ["vehiculo_id"])
    .index("by_geofence", ["geofence_id"])
    .index("by_viewed", ["viewed"]),

  // 21. Estado de vehículos en geofences (para detectar entrada/salida)
  vehicle_geofence_state: defineTable({
    vehiculo_id: v.id("vehiculos"),
    geofence_id: v.id("geofences"),
    inside: v.boolean(), // true = dentro, false = fuera
    last_check: v.number(), // timestamp
  })
    .index("by_vehiculo", ["vehiculo_id"])
    .index("by_geofence", ["geofence_id"])
    .index("by_vehiculo_geofence", ["vehiculo_id", "geofence_id"]),

  // 22. Historial de Ubicaciones GPS
  vehicleHistory: defineTable({
    vehiculo_id: v.id("vehiculos"),
    timestamp: v.number(), // Unix timestamp (milisegundos) - cuando NOSOTROS recibimos el dato
    gps_latitud: v.number(),
    gps_longitud: v.number(),
    gps_velocidad: v.optional(v.number()), // km/h
    gps_rumbo: v.optional(v.number()), // Dirección 0-359 grados
    gps_altitud: v.optional(v.number()), // Metros sobre nivel del mar
    gps_precision: v.optional(v.number()), // HDOP
    gps_satelites: v.optional(v.number()), // Número de satélites
    source: v.optional(v.string()), // "safetag", "obd", "manual"
    safetag_timestamp: v.optional(v.number()), // Timestamp original de SafeTag (para debugging/comparación)
  })
    .index("by_vehiculo", ["vehiculo_id"])
    .index("by_timestamp", ["timestamp"])
    .index("by_vehiculo_timestamp", ["vehiculo_id", "timestamp"]),
});
