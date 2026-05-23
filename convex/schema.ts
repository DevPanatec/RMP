import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 0. Organizaciones (top-level multi-tenant)
  organizaciones: defineTable({
    nombre: v.string(),
    slug: v.string(),
    descripcion: v.optional(v.string()),
    contacto_email: v.optional(v.string()),
    contacto_telefono: v.optional(v.string()),
    logo_url: v.optional(v.string()),
    activo: v.boolean(),
    fecha_creacion: v.string(),
    // ---- Plan / Billing (super_admin manages via Plataforma panel) ----
    escala: v.optional(
      v.union(
        v.literal("S"),
        v.literal("M"),
        v.literal("L"),
        v.literal("XL"),
        v.literal("XXL"),
      ),
    ),
    modulos_activos: v.optional(v.array(v.string())), // Producción: ["REC","FUM","LIM","MTO","INV","PER","BI"] · Roadmap: ["PER-full"]
    custom_caps: v.optional(
      v.object({
        camiones: v.optional(v.number()),
        proyectos: v.optional(v.number()),
        usuarios: v.optional(v.number()),
        storage_gb: v.optional(v.number()),
      }),
    ),
    fecha_inicio_plan: v.optional(v.number()), // ms epoch
    fecha_renovacion_plan: v.optional(v.number()), // ms epoch
    setup_status: v.optional(
      v.union(v.literal("pendiente"), v.literal("pagado"), v.literal("waived")),
    ),
    discount_pct: v.optional(v.number()), // 0-15
    // ---- Storage counter (delta-tracked in photo mutations) ----
    storage_bytes_used: v.optional(v.number()),
    storage_last_recompute: v.optional(v.number()), // ms epoch — última vez que se re-sumó todo
  })
    .index("by_slug", ["slug"])
    .index("by_activo", ["activo"]),

  // 0.1 Org audit log — trazabilidad de cambios de plan/módulos/caps por super_admin
  org_audit_log: defineTable({
    organizacion_id: v.id("organizaciones"),
    changed_by_user_id: v.string(), // Clerk tokenIdentifier
    changed_by_email: v.optional(v.string()),
    action: v.string(), // "set_escala", "toggle_modulo", "set_custom_cap", "set_discount", "set_setup_status", "set_plan_fechas", "set_activo", "recompute_storage", "waive_overflow"
    field: v.optional(v.string()),
    before_value: v.optional(v.any()),
    after_value: v.optional(v.any()),
    notas: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_organizacion", ["organizacion_id"])
    .index("by_timestamp", ["timestamp"])
    .index("by_org_timestamp", ["organizacion_id", "timestamp"]),

  // 1. Perfiles de Usuarios (Auth)
  perfiles_usuarios: defineTable({
    userId: v.string(), // ID del usuario autenticado
    tipo_usuario: v.union(
      v.literal("super_admin"),
      v.literal("admin"),
      v.literal("enterprise"),
      v.literal("conductor"),
      v.literal("viewer"),
    ),
    nombre_completo: v.string(),
    email: v.string(),
    telefono: v.optional(v.string()),
    documento: v.optional(v.string()),
    foto_url: v.optional(v.string()),
    vehiculo_asignado_id: v.optional(v.id("vehiculos")),
    organizacion_id: v.optional(v.id("organizaciones")), // null para super_admin
    proyecto_id: v.optional(v.id("proyectos")),
    cross_org_viewer: v.optional(v.boolean()), // permite ver riesgos+vehículos de TODAS las orgs
    restricted_operations: v.optional(v.boolean()), // bloquea pestañas/operaciones (cliente con permisos limitados)
    activo: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_tipo", ["tipo_usuario"])
    .index("by_email", ["email"])
    .index("by_organizacion", ["organizacion_id"])
    .index("by_org_tipo", ["organizacion_id", "tipo_usuario"]),

  // 2. Proyectos
  proyectos: defineTable({
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    cliente: v.optional(v.string()),
    fecha_inicio: v.optional(v.string()),
    fecha_fin: v.optional(v.string()),
    activo: v.boolean(),
    organizacion_id: v.optional(v.id("organizaciones")), // Required runtime; optional para legacy/migración
  })
    .index("by_activo", ["activo"])
    .index("by_organizacion", ["organizacion_id"]),

  // 3. Vehículos (Fleet)
  vehiculos: defineTable({
    nombre: v.optional(v.string()), // Nombre descriptivo del vehículo
    placa: v.string(),
    marca: v.optional(v.string()),
    modelo: v.optional(v.string()),
    anio: v.optional(v.number()),
    tipo: v.optional(v.string()), // "camion", "camioneta", etc.
    tipo_servicio: v.string(), // "recoleccion", "fumigacion", "limpieza"
    tipo_vehiculo: v.optional(v.string()), // "bus", "barredora", "pickup", "cisterna", "camion_carga", "compactador", "fumigadora"
    estado: v.string(), // "disponible", "en_ruta", "en_mantenimiento"
    capacidad_carga: v.optional(v.number()),
    kilometraje: v.optional(v.number()),
    // Campos GPS
    gps_latitud: v.optional(v.number()),
    gps_longitud: v.optional(v.number()),
    gps_imei: v.optional(v.string()), // IMEI único del dispositivo GPS (15 dígitos)
    gps_protocolo: v.optional(v.string()), // "GT06", "H02", "TK103", etc.
    gps_ultima_actualizacion: v.optional(v.number()), // Timestamp última posición recibida (number para consistencia)
    gps_ultima_motion: v.optional(v.number()), // Timestamp último ping con speed > 2 kph (pa' diferenciar parado/estacionado)
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
    organizacion_id: v.optional(v.id("organizaciones")),
    km_acumulado: v.optional(v.number()), // Km totales acumulados vía GPS (Haversine delta por ping)
  })
    .index("by_estado", ["estado"])
    .index("by_placa", ["placa"])
    .index("by_gps_imei", ["gps_imei"]) // Índice para búsqueda rápida por IMEI
    .index("by_safetag_device", ["safetag_device_id"]) // Índice para búsqueda por SafeTag Device ID
    .index("by_organizacion", ["organizacion_id"]),

  // 4. Rutas
  rutas: defineTable({
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    proyecto_id: v.optional(v.id("proyectos")), // Required en runtime; optional para data legacy hasta migración
    tipo_servicio: v.string(),
    paradas: v.array(v.any()), // Array de paradas (JSONB)
    fecha_programada: v.optional(v.string()),
    hora_inicio: v.optional(v.string()),
    hora_fin: v.optional(v.string()),
    dias_operacion: v.optional(v.array(v.string())), // ["lunes", "martes", ...]
    estado: v.string(), // "pendiente", "en_progreso", "completada", "cancelada"
    distancia_total: v.optional(v.number()),
    tiempo_estimado: v.optional(v.number()), // Tiempo estimado en minutos
    combustible_estimado: v.optional(v.number()),
    observaciones: v.optional(v.string()),
    organizacion_id: v.optional(v.id("organizaciones")),
    foto_portada_storage_id: v.optional(v.id("_storage")),
    ubicacion_principal: v.optional(v.object({
      latitud: v.number(),
      longitud: v.number(),
      nombre: v.string(),
      direccion: v.optional(v.string()),
    })),
  })
    .index("by_estado", ["estado"])
    .index("by_proyecto", ["proyecto_id"])
    .index("by_proyecto_estado", ["proyecto_id", "estado"])
    .index("by_organizacion", ["organizacion_id"]),

  // 5. Asignaciones de Rutas
  asignaciones_rutas: defineTable({
    ruta_id: v.id("rutas"),
    conductor_id: v.optional(v.id("perfiles_usuarios")), // Opcional: solo si el conductor tiene usuario
    conductor_nombre: v.string(), // Nombre completo del conductor (campo principal)
    vehiculo_id: v.id("vehiculos"),
    proyecto_id: v.optional(v.id("proyectos")),
    fecha_asignacion: v.string(),
    fecha_inicio: v.optional(v.string()),
    fecha_completacion: v.optional(v.string()),
    hora_inicio: v.optional(v.string()), // Horario de inicio de la ruta
    hora_fin: v.optional(v.string()), // Horario de fin de la ruta
    estado: v.string(), // "asignada", "en_progreso", "completada", "cancelada", "programada"
    paradas_completadas: v.optional(v.array(v.any())),
    dias_semana: v.optional(v.array(v.string())),
    ayudantes: v.optional(v.array(v.any())),
    observaciones: v.optional(v.string()),
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_vehiculo", ["vehiculo_id"])
    .index("by_ruta", ["ruta_id"])
    .index("by_estado", ["estado"])
    .index("by_proyecto", ["proyecto_id"])
    .index("by_vehiculo_estado", ["vehiculo_id", "estado"])
    .index("by_vehiculo_fecha", ["vehiculo_id", "fecha_asignacion"]),

  // 6. Progreso de Rutas (Real-time tracking)
  route_progress: defineTable({
    conductor_id: v.id("perfiles_usuarios"),
    conductor_nombre: v.string(),
    ruta_id: v.id("rutas"),
    vehiculo_id: v.id("vehiculos"),
    asignacion_id: v.id("asignaciones_rutas"),
    proyecto_id: v.optional(v.id("proyectos")),
    fecha_inicio: v.string(),
    total_paradas: v.number(),
    paradas_completadas: v.optional(v.array(v.any())),
    posicion_actual: v.optional(v.any()),
    tipo_ruta: v.string(),
    estado: v.string(), // "en_progreso", "completada"
    route_report_id: v.optional(v.id("route_reports")),
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_conductor", ["conductor_nombre"])
    .index("by_conductor_id", ["conductor_id"])
    .index("by_conductor_id_estado", ["conductor_id", "estado"])
    .index("by_estado", ["estado"])
    .index("by_proyecto", ["proyecto_id"]),

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
    terminacion_anticipada: v.optional(v.boolean()),
    motivo_terminacion: v.optional(v.string()),
    proyecto_id: v.optional(v.id("proyectos")),
    organizacion_id: v.optional(v.id("organizaciones")),
    ruta_foto_portada_storage_id: v.optional(v.id("_storage")),
    ruta_ubicacion_principal: v.optional(v.object({
      latitud: v.number(),
      longitud: v.number(),
      nombre: v.string(),
      direccion: v.optional(v.string()),
    })),
  })
    .index("by_conductor", ["conductor_nombre"])
    .index("by_fecha", ["fecha_completacion"])
    .index("by_proyecto_fecha", ["proyecto_id", "fecha_completacion"])
    .index("by_organizacion", ["organizacion_id"])
    .index("by_asignacion", ["asignacion_id"]),

  // 7b. Eventos de Rutas (Activity Log)
  route_events: defineTable({
    ruta_id: v.optional(v.id("rutas")),
    asignacion_id: v.optional(v.id("asignaciones_rutas")),
    conductor_id: v.optional(v.id("perfiles_usuarios")),
    conductor_nombre: v.string(),
    vehiculo_id: v.optional(v.id("vehiculos")),
    vehiculo_placa: v.string(),
    ruta_nombre: v.string(),
    tipo_evento: v.string(), // "ruta_iniciada", "parada_llegada", "parada_salida", "parada_completada", "ruta_completada"
    parada_nombre: v.optional(v.string()),
    parada_orden: v.optional(v.number()),
    parada_index: v.optional(v.number()),
    categoria_carga: v.optional(v.string()),
    bolsas: v.optional(v.number()),
    foto_storage_id: v.optional(v.id("_storage")),
    gps_latitud: v.optional(v.number()),
    gps_longitud: v.optional(v.number()),
    detalles: v.optional(v.string()),
    timestamp: v.string(),
    proyecto_id: v.optional(v.id("proyectos")),
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_asignacion", ["asignacion_id"])
    .index("by_ruta", ["ruta_id"])
    .index("by_conductor", ["conductor_id"])
    .index("by_timestamp", ["timestamp"])
    .index("by_proyecto", ["proyecto_id"])
    .index("by_organizacion", ["organizacion_id"]),

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
    proyecto_id: v.optional(v.id("proyectos")),
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_cedula", ["cedula"])
    .index("by_activo", ["activo"])
    .index("by_organizacion", ["organizacion_id"])
    .index("by_proyecto", ["proyecto_id"]),

  // 9. Reportes de Riesgo
  reportes_riesgo: defineTable({
    titulo: v.string(),
    descripcion: v.string(),
    tipo_riesgo: v.string(), // mecanico, combustible, seguridad, mantenimiento, bloqueo_via, seguridad_ciudadana, climatico, manifestacion, accidente, operacional
    nivel_severidad: v.string(), // bajo, medio, alto, critico
    ubicacion: v.optional(v.string()),
    gps_latitud: v.optional(v.number()),
    gps_longitud: v.optional(v.number()),
    empleado_reporta_id: v.optional(v.id("empleados")),
    proyecto_id: v.optional(v.id("proyectos")),
    vehiculo_id: v.optional(v.id("vehiculos")),
    ruta_id: v.optional(v.id("rutas")),
    // Vinculación a lugar físico (FUM site, INV warehouse, MTO location)
    lugar_id: v.optional(v.id("lugares")),
    lugar_nombre: v.optional(v.string()), // Denormalizado para queries
    prioridad: v.optional(v.number()),
    fecha_reporte: v.string(),
    estado: v.optional(v.string()),
    // Campos desnormalizados para facilitar consultas
    conductor_nombre: v.optional(v.string()),
    vehiculo_placa: v.optional(v.string()),
    perfil_usuario_id: v.optional(v.id("perfiles_usuarios")),
    // Vinculación con paradas específicas
    parada_nombre: v.optional(v.string()), // Dirección/nombre de la parada
    parada_orden: v.optional(v.number()), // Orden de la parada en la ruta
    parada_index: v.optional(v.number()), // Índice de la parada (0-based)
    fotos_storage_ids: v.optional(v.array(v.id("_storage"))), // Hasta 3 fotos opcionales
    route_progress_id: v.optional(v.id("route_progress")), // Trazabilidad explícita al progreso de ruta activo
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_fecha", ["fecha_reporte"])
    .index("by_severidad", ["nivel_severidad"])
    .index("by_proyecto", ["proyecto_id"])
    .index("by_lugar", ["lugar_id"])
    .index("by_organizacion", ["organizacion_id"]),

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
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_tipo", ["tipo_articulo"])
    .index("by_organizacion", ["organizacion_id"]),

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
    proyecto_id: v.optional(v.id("proyectos")), // Required para tipo_movimiento ∈ {asignacion, consumo}; opcional para compra/ajuste
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_item", ["item_id"])
    .index("by_fecha", ["fecha"])
    .index("by_tipo", ["tipo_movimiento"])
    .index("by_item_fecha", ["item_id", "fecha"])
    .index("by_proyecto_fecha", ["proyecto_id", "fecha"]),

  // 11. Lugares/Salas (Cleaning)
  salas: defineTable({
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    latitud: v.optional(v.number()), // Coordenadas GPS de la sala
    longitud: v.optional(v.number()),
    activo: v.boolean(),
    proyecto_id: v.optional(v.id("proyectos")),
    organizacion_id: v.optional(v.id("organizaciones")),
    foto_storage_id: v.optional(v.id("_storage")),
  })
    .index("by_activo", ["activo"])
    .index("by_proyecto", ["proyecto_id"])
    .index("by_organizacion", ["organizacion_id"]),

  // 11b. Lugares (Fumigación - espacios internos y externos)
  lugares: defineTable({
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    latitud: v.optional(v.number()), // Coordenadas GPS del lugar
    longitud: v.optional(v.number()),
    activo: v.boolean(),
    proyecto_id: v.optional(v.id("proyectos")),
    organizacion_id: v.optional(v.id("organizaciones")),
    foto_storage_id: v.optional(v.id("_storage")),
  })
    .index("by_activo", ["activo"])
    .index("by_proyecto", ["proyecto_id"])
    .index("by_organizacion", ["organizacion_id"]),

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
    area_id: v.optional(v.id("areas")),
    fecha: v.string(),
    hora: v.string(),
    estado: v.string(), // "pendiente", "en_progreso", "completado", "cancelado"
    notas: v.optional(v.string()),
    created_by: v.optional(v.string()),
    proyecto_id: v.optional(v.id("proyectos")), // Derivado de salas.proyecto_id
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_fecha", ["fecha"])
    .index("by_estado", ["estado"])
    .index("by_sala", ["sala_id"])
    .index("by_proyecto_fecha", ["proyecto_id", "fecha"])
    .index("by_organizacion", ["organizacion_id"]),

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
    proyecto_id: v.optional(v.id("proyectos")), // Manual al crear, opcional (vehiculo es shared)
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_vehiculo", ["vehiculo_id"])
    .index("by_estado", ["estado"])
    .index("by_fecha", ["fecha_programada"])
    .index("by_proyecto", ["proyecto_id"])
    .index("by_organizacion", ["organizacion_id"]),

  // 16. Alertas de Mantenimiento
  maintenance_alerts: defineTable({
    task_id: v.optional(v.id("maintenance_tasks")),
    vehiculo_id: v.optional(v.id("vehiculos")),
    tipo_alerta: v.string(), // "mantenimiento_vencido", "revision_pendiente", etc.
    mensaje: v.string(),
    severidad: v.string(), // "info", "warning", "error"
    fecha_generada: v.string(),
    leida: v.boolean(),
    proyecto_id: v.optional(v.id("proyectos")),
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_vehiculo", ["vehiculo_id"])
    .index("by_leida", ["leida"])
    .index("by_proyecto", ["proyecto_id"])
    .index("by_organizacion", ["organizacion_id"]),

  // 16b. Fotos de Mantenimiento
  maintenance_photos: defineTable({
    task_id: v.id("maintenance_tasks"),
    etapa: v.string(), // "antes", "durante", "despues"
    storage_id: v.id("_storage"), // Convex file storage
    file_name: v.string(),
    file_size: v.optional(v.number()),
    mime_type: v.optional(v.string()),
  })
    .index("by_task", ["task_id"])
    .index("by_etapa", ["etapa"]),

  // 16c. Reportes de Mantenimiento Completados
  maintenance_reports: defineTable({
    task_id: v.id("maintenance_tasks"),
    vehiculo_id: v.optional(v.id("vehiculos")),
    vehiculo_placa: v.optional(v.string()),
    titulo: v.string(),
    descripcion: v.optional(v.string()),
    tipo: v.string(), // "preventivo", "correctivo", "inspección"
    prioridad: v.string(), // "baja", "media", "alta", "urgente"
    fecha_programada: v.optional(v.string()),
    fecha_completada: v.string(),
    costo: v.optional(v.number()),
    mecanico: v.optional(v.string()),
    fotos_antes_ids: v.array(v.id("maintenance_photos")),
    fotos_durante_ids: v.array(v.id("maintenance_photos")),
    fotos_despues_ids: v.array(v.id("maintenance_photos")),
    observaciones: v.optional(v.string()),
    usuario_completo: v.string(),
    fecha_reporte: v.string(),
    proyecto_id: v.optional(v.id("proyectos")),
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_fecha", ["fecha_reporte"])
    .index("by_vehiculo", ["vehiculo_id"])
    .index("by_tipo", ["tipo"])
    .index("by_proyecto", ["proyecto_id"]),

  // 16d. Presets de Volumen para Mantenimiento
  maintenance_volume_presets: defineTable({
    label: v.string(), // "Mi Preset Personalizado"
    volume_gallons: v.number(), // 4500
    cost_per_gallon: v.number(), // 0.12
    total_cost: v.number(), // 540.00
    description: v.optional(v.string()), // Optional note about preset
    is_custom: v.boolean(), // true for user-created, false for system defaults
    created_by: v.optional(v.string()), // User email/ID who created it
    created_at: v.string(), // ISO timestamp
    is_global: v.boolean(), // true = all users can use, false = only creator
  })
    .index("by_created_by", ["created_by"])
    .index("by_is_custom", ["is_custom"])
    .index("by_is_global", ["is_global"]),

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
    proyecto_id: v.optional(v.id("proyectos")), // Derivado de lugares.proyecto_id
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_fecha", ["fecha"])
    .index("by_estado", ["estado"])
    .index("by_lugar", ["lugar_id"])
    .index("by_tipo", ["tipo_fumigacion"])
    .index("by_fecha_lugar_tipo", ["fecha", "lugar_id", "tipo_fumigacion"])
    .index("by_proyecto_fecha", ["proyecto_id", "fecha"])
    .index("by_organizacion", ["organizacion_id"]),

  // 18. Fotos de Fumigación
  fumigation_photos: defineTable({
    assignment_id: v.id("fumigation_assignments"),
    etapa: v.optional(v.string()), // "antes", "durante", "despues" (opcional para compatibilidad)
    storage_id: v.id("_storage"), // Convex file storage
    file_name: v.string(),
    file_size: v.optional(v.number()),
    mime_type: v.optional(v.string()),
  })
    .index("by_assignment", ["assignment_id"]),

  // 18b. Reportes de Fumigación Completados
  fumigation_reports: defineTable({
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
    // Fotos organizadas por etapa (igual que cleaning y maintenance)
    // Opcional para compatibilidad con reportes antiguos que usaban fotos_ids
    fotos_antes_ids: v.optional(v.array(v.id("fumigation_photos"))),
    fotos_durante_ids: v.optional(v.array(v.id("fumigation_photos"))),
    fotos_despues_ids: v.optional(v.array(v.id("fumigation_photos"))),
    // Campo legacy - mantener para reportes existentes
    fotos_ids: v.optional(v.array(v.id("fumigation_photos"))),
    usuario_completo: v.string(),
    fecha_completacion: v.string(),
    proyecto_id: v.optional(v.id("proyectos")),
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_fecha", ["fecha_completacion"])
    .index("by_lugar", ["lugar_id"])
    .index("by_tipo", ["tipo_fumigacion"])
    .index("by_proyecto_fecha", ["proyecto_id", "fecha_completacion"])
    .index("by_organizacion", ["organizacion_id"]),

  // 18c. Reportes de Limpieza Completados
  cleaning_reports: defineTable({
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
    proyecto_id: v.optional(v.id("proyectos")),
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_fecha", ["fecha_completacion"])
    .index("by_sala", ["sala_id"])
    .index("by_area", ["area_id"])
    .index("by_proyecto_fecha", ["proyecto_id", "fecha_completacion"])
    .index("by_organizacion", ["organizacion_id"]),

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
    // Linked to a specific route stop (auto-generated on rutas.add/update)
    ruta_id: v.optional(v.id("rutas")),
    parada_index: v.optional(v.number()),
    auto_generada: v.optional(v.boolean()),
    proyecto_id: v.optional(v.id("proyectos")),
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_activo", ["activo"])
    .index("by_ruta", ["ruta_id"])
    .index("by_organizacion", ["organizacion_id"])
    .index("by_proyecto", ["proyecto_id"]),

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
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_vehiculo", ["vehiculo_id"])
    .index("by_geofence", ["geofence_id"])
    .index("by_viewed", ["viewed"])
    .index("by_organizacion", ["organizacion_id"]),

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
  vehicle_location_history: defineTable({
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

  // 23. Componentes de Vehículos/Máquinas (Fleet Inventory — módulo INV)
  vehicle_components: defineTable({
    vehiculo_id: v.id("vehiculos"),
    nombre: v.string(),
    tipo: v.string(),                          // "llanta", "bateria", "cepillo", etc. (free-text)
    posicion: v.optional(v.string()),          // "delantera_izq", "trasera_der", etc. para diagrama 2D
    marca: v.optional(v.string()),
    numero_serie: v.optional(v.string()),
    fecha_instalacion: v.number(),             // ms epoch
    km_instalacion: v.optional(v.number()),    // snapshot km_acumulado al instalar
    vida_util_km: v.optional(v.number()),      // ej: 40000
    vida_util_dias: v.optional(v.number()),    // ej: 90
    estado: v.union(v.literal("activo"), v.literal("reemplazado"), v.literal("vencido")),
    costo: v.optional(v.number()),
    notas: v.optional(v.string()),
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_vehiculo", ["vehiculo_id"])
    .index("by_estado", ["estado"])
    .index("by_organizacion", ["organizacion_id"]),

  // 23b. Historial de reemplazos de componentes de vehículos
  vehicle_components_history: defineTable({
    vehiculo_id: v.id("vehiculos"),
    componente_id: v.id("vehicle_components"),
    tipo: v.string(),
    km_al_cambio: v.optional(v.number()),
    dias_uso: v.number(),
    motivo: v.union(v.literal("preventivo"), v.literal("desgaste"), v.literal("falla")),
    tecnico: v.optional(v.string()),
    costo: v.optional(v.number()),
    notas: v.optional(v.string()),
    fecha_cambio: v.number(),
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_vehiculo", ["vehiculo_id"])
    .index("by_componente", ["componente_id"])
    .index("by_fecha", ["fecha_cambio"])
    .index("by_organizacion", ["organizacion_id"]),

  // 24. Activos Standalone de Flota (lámparas, mangueras, generadores — módulo INV)
  fleet_assets: defineTable({
    nombre: v.string(),
    tipo: v.string(),                          // "manguera", "lampara", "generador", etc.
    descripcion: v.optional(v.string()),
    fecha_adquisicion: v.number(),             // ms epoch — cuando se puso en servicio
    vida_util_dias: v.optional(v.number()),    // ej: 1000
    estado: v.union(v.literal("activo"), v.literal("vencido"), v.literal("dado_de_baja")),
    tiene_componentes: v.boolean(),            // si true → fleet_asset_components
    costo: v.optional(v.number()),
    notas: v.optional(v.string()),
    proyecto_id: v.optional(v.id("proyectos")),
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_estado", ["estado"])
    .index("by_tipo", ["tipo"])
    .index("by_organizacion", ["organizacion_id"]),

  // 24b. Componentes de Activos Standalone (solo días, sin km)
  fleet_asset_components: defineTable({
    asset_id: v.id("fleet_assets"),
    nombre: v.string(),
    tipo: v.string(),
    marca: v.optional(v.string()),
    fecha_instalacion: v.number(),
    vida_util_dias: v.number(),
    estado: v.union(v.literal("activo"), v.literal("reemplazado"), v.literal("vencido")),
    costo: v.optional(v.number()),
    notas: v.optional(v.string()),
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_asset", ["asset_id"])
    .index("by_estado", ["estado"])
    .index("by_organizacion", ["organizacion_id"]),

  // 24c. Historial de reemplazos de componentes de activos
  fleet_asset_components_history: defineTable({
    asset_id: v.id("fleet_assets"),
    componente_id: v.id("fleet_asset_components"),
    tipo: v.string(),
    dias_uso: v.number(),
    motivo: v.union(v.literal("preventivo"), v.literal("desgaste"), v.literal("falla")),
    tecnico: v.optional(v.string()),
    costo: v.optional(v.number()),
    notas: v.optional(v.string()),
    fecha_cambio: v.number(),
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_asset", ["asset_id"])
    .index("by_componente", ["componente_id"])
    .index("by_fecha", ["fecha_cambio"])
    .index("by_organizacion", ["organizacion_id"]),

  // 25. Componentes de Lugar (Mantenimiento — módulo MTO)
  location_components: defineTable({
    lugar_id: v.id("lugares"),
    nombre: v.string(),
    tipo: v.string(),
    marca: v.optional(v.string()),
    fecha_instalacion: v.number(),
    vida_util_dias: v.number(),
    estado: v.union(v.literal("activo"), v.literal("reemplazado"), v.literal("vencido")),
    costo: v.optional(v.number()),
    notas: v.optional(v.string()),
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_lugar", ["lugar_id"])
    .index("by_estado", ["estado"])
    .index("by_organizacion", ["organizacion_id"]),

  // 25b. Historial de reemplazos de componentes de lugar
  location_components_history: defineTable({
    lugar_id: v.id("lugares"),
    componente_id: v.id("location_components"),
    tipo: v.string(),
    dias_uso: v.number(),
    motivo: v.union(v.literal("preventivo"), v.literal("desgaste"), v.literal("falla")),
    tecnico: v.optional(v.string()),
    costo: v.optional(v.number()),
    notas: v.optional(v.string()),
    fecha_cambio: v.number(),
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_lugar", ["lugar_id"])
    .index("by_componente", ["componente_id"])
    .index("by_fecha", ["fecha_cambio"])
    .index("by_organizacion", ["organizacion_id"]),

  // 26. Diagram Templates — render genérico por clase de equipo (Motor de Diagramas, Fase 2)
  diagram_templates: defineTable({
    equipment_class: v.string(),   // "barredora", "compactador", "fumigadora", "cisterna"
    view_type: v.string(),         // "top" (vista superior) — "side" en el futuro
    render_path: v.string(),       // "/renders/barredora.svg" — asset estático
    image_width: v.number(),
    image_height: v.number(),
    label: v.string(),             // "Barredora Vial"
    is_generic: v.boolean(),       // true = render de clase, false = específico de modelo
    validated: v.boolean(),
    make: v.optional(v.string()),       // Para plantillas específicas de modelo (Fase 3)
    model_name: v.optional(v.string()),
    model_year: v.optional(v.number()),
  })
    .index("by_class", ["equipment_class"])
    .index("by_class_view", ["equipment_class", "view_type"])
    .index("by_make_model", ["make", "model_name"]),

  // 27. Diagram Zones — hotspots (polígonos transparentes sobre el render)
  diagram_zones: defineTable({
    template_id: v.id("diagram_templates"),
    nombre: v.string(),                   // "Motor", "Cepillos Laterales"
    system_key: v.string(),               // llave lógica ("motor", "tren_rodaje")
    tipo_patterns: v.array(v.string()),   // patrones de tipo de componente que pertenecen a esta zona
    polygon_points: v.string(),           // "x1% y1%, x2% y2%..." — CSS clip-path format
    display_order: v.number(),
    color_hint: v.optional(v.string()),   // color sugerido cuando no hay componentes
  })
    .index("by_template", ["template_id"]),

  // 28. PM Schedules — planes de mantenimiento preventivo recurrentes
  // Regla "cada X km / horas / dias" por vehiculo (asset)
  pm_schedules: defineTable({
    vehiculo_id: v.id("vehiculos"),
    titulo: v.string(),                       // "Cambio aceite motor"
    descripcion: v.optional(v.string()),
    categoria: v.optional(v.string()),        // "motor", "neumaticos", "frenos", etc
    tipo_intervalo: v.string(),               // "km" | "horas" | "dias"
    intervalo_valor: v.number(),              // cada cuanto (10000 km, 250 horas, 90 dias)
    advertencia_anticipada: v.optional(v.number()), // alertar X antes (km/horas/dias)
    // Base de referencia (ultima ejecucion o instalacion)
    referencia_km: v.optional(v.number()),    // km al ultimo servicio
    referencia_horas: v.optional(v.number()), // horas al ultimo servicio
    referencia_fecha: v.number(),             // timestamp ms del ultimo servicio o creacion
    ultima_task_id: v.optional(v.id("maintenance_tasks")),
    prioridad: v.optional(v.string()),        // "baja" | "media" | "alta" | "urgente"
    activo: v.boolean(),
    proyecto_id: v.optional(v.id("proyectos")),
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_vehiculo", ["vehiculo_id"])
    .index("by_activo", ["activo"])
    .index("by_organizacion", ["organizacion_id"])
    .index("by_proyecto", ["proyecto_id"]),

  // 29. Meter Readings — lecturas manuales de odometro/horometro
  // Alimentan el calculo de vida util independiente del GPS
  meter_readings: defineTable({
    vehiculo_id: v.id("vehiculos"),
    tipo: v.string(),                         // "odometro" | "horometro"
    valor: v.number(),                        // km o horas
    fecha: v.number(),                        // ms epoch
    fuente: v.string(),                       // "manual" | "gps" | "obd" | "workorder"
    usuario_id: v.optional(v.string()),       // Clerk tokenIdentifier
    task_id: v.optional(v.id("maintenance_tasks")), // si se capturo en una OT
    notas: v.optional(v.string()),
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_vehiculo", ["vehiculo_id"])
    .index("by_vehiculo_tipo", ["vehiculo_id", "tipo"])
    .index("by_fecha", ["fecha"])
    .index("by_organizacion", ["organizacion_id"]),

  // ─── Knowledge Base — Motor de Diagramas v2 (Plan v6) ─────────────

  // 30. Marcas (catalogo cross-org)
  makes: defineTable({
    nombre: v.string(),                       // "Mack", "Volvo", "Tennant"
    slug: v.string(),                         // "mack", "volvo", "tennant"
    logo_storage_id: v.optional(v.id("_storage")),
    paises_disponibles: v.optional(v.array(v.string())),
    oem_website: v.optional(v.string()),      // base URL para crawler
    validated: v.boolean(),
  })
    .index("by_slug", ["slug"])
    .index("by_validated", ["validated"])
    .searchIndex("search_nombre", { searchField: "nombre" }),

  // 31. Modelos
  models: defineTable({
    make_id: v.id("makes"),
    nombre: v.string(),                       // "Granite", "M30", "FH16"
    equipment_class: v.string(),              // "barredora", "compactador", etc
    tipo_vehiculo_default: v.optional(v.string()),
    aliases: v.optional(v.array(v.string())), // ["Mack Granite GU713"]
    validated: v.boolean(),
    visibility: v.string(),                   // "private_org" | "global"
    organizacion_id: v.optional(v.id("organizaciones")), // null si global
  })
    .index("by_make", ["make_id"])
    .index("by_class", ["equipment_class"])
    .index("by_organizacion", ["organizacion_id"])
    .index("by_visibility", ["visibility"])
    .searchIndex("search_nombre", { searchField: "nombre" }),

  // 32. Anos de modelo
  model_years: defineTable({
    model_id: v.id("models"),
    year: v.number(),
    specs: v.optional(v.object({
      engine: v.optional(v.string()),
      transmission: v.optional(v.string()),
      gvwr_kg: v.optional(v.number()),
      axle_config: v.optional(v.string()),
      wheelbase_mm: v.optional(v.number()),
      cabin_style: v.optional(v.string()),
    })),
    param_svg_overrides: v.optional(v.any()), // knobs por defecto para ParamSVGEngine
    vin_decoded_raw: v.optional(v.any()),     // raw NHTSA vPIC payload
  })
    .index("by_model", ["model_id"])
    .index("by_model_year", ["model_id", "year"]),

  // 33. KB Sources (crawler audit + provenance)
  kb_sources: defineTable({
    model_year_id: v.optional(v.id("model_years")),
    make_id: v.optional(v.id("makes")),
    source_url: v.string(),
    source_type: v.string(),                  // "nhtsa_vpic" | "wikidata" | "doe_afdc" |
                                              // "gsa_fleet" | "oem_brochure" | "datos_abiertos_pa" |
                                              // "internet_archive" | "vincario" | "marketcheck"
    fetched_at: v.number(),
    last_modified: v.optional(v.string()),
    etag: v.optional(v.string()),
    content_hash: v.string(),
    raw_storage_id: v.optional(v.id("_storage")),
    parsed_data: v.optional(v.any()),
    confidence: v.number(),                   // 0-1
    license: v.string(),                      // "public_domain" | "cc_by_sa" | "oem_public" | "commercial"
    attribution: v.optional(v.string()),
  })
    .index("by_model_year", ["model_year_id"])
    .index("by_make", ["make_id"])
    .index("by_fetched", ["fetched_at"])
    .index("by_source_type", ["source_type"]),

  // 34. Documentos uploaded por cliente
  oem_documents: defineTable({
    model_year_id: v.optional(v.id("model_years")),
    vehiculo_id: v.optional(v.id("vehiculos")),
    tipo: v.string(),                         // "service_manual" | "parts_catalog" | "operator_manual" | "brochure"
    storage_id: v.id("_storage"),
    file_name: v.string(),
    file_size: v.number(),
    page_count: v.optional(v.number()),
    uploaded_by: v.id("perfiles_usuarios"),
    source: v.string(),                       // "manual_upload" | "crawler" | "external_api"
    license_declaration: v.boolean(),         // cliente declara tener derecho
    organizacion_id: v.id("organizaciones"),
  })
    .index("by_model_year", ["model_year_id"])
    .index("by_vehiculo", ["vehiculo_id"])
    .index("by_organizacion", ["organizacion_id"]),

  // 35. Ingestion runs (procesamiento OCR + Claude)
  ingestion_runs: defineTable({
    document_id: v.optional(v.id("oem_documents")),
    model_year_id: v.optional(v.id("model_years")),
    estado: v.string(),                       // "queued" | "ocr_running" | "ocr_done" |
                                              // "vision_running" | "rendered" | "needs_review" |
                                              // "approved" | "failed"
    ocr_provider: v.optional(v.string()),     // "pdfjs" | "tesseract" | "claude_vision"
    ocr_cost_usd: v.optional(v.number()),
    vision_model: v.optional(v.string()),
    vision_cost_usd: v.optional(v.number()),
    iterations: v.optional(v.number()),
    confidence_score: v.optional(v.number()),
    comparison_score: v.optional(v.number()),
    extracted_structure: v.optional(v.any()),
    generated_svg_storage_id: v.optional(v.id("_storage")),
    human_curator_id: v.optional(v.id("perfiles_usuarios")),
    audit_log: v.array(v.object({
      timestamp: v.number(),
      event: v.string(),
      detail: v.any(),
      cost_usd: v.optional(v.number()),
    })),
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_document", ["document_id"])
    .index("by_model_year", ["model_year_id"])
    .index("by_estado", ["estado"])
    .index("by_organizacion", ["organizacion_id"]),

  // 36. Part catalog (extraido de manuales)
  part_catalog: defineTable({
    model_year_id: v.optional(v.id("model_years")),
    equipment_class: v.optional(v.string()),
    nombre: v.string(),
    numero_parte_oem: v.optional(v.string()),
    numeros_parte_alternativos: v.optional(v.array(v.string())),
    sistema: v.string(),                      // "motor", "transmision", "frenos", etc
    vida_util_default: v.optional(v.object({
      valor: v.number(),
      unidad: v.string(),                     // "km" | "horas" | "dias"
    })),
    aliases: v.optional(v.array(v.string())),
    kb_source_id: v.optional(v.id("kb_sources")),
    validated: v.boolean(),
  })
    .index("by_model_year", ["model_year_id"])
    .index("by_class", ["equipment_class"])
    .searchIndex("search_nombre", { searchField: "nombre" }),

  // 37. Vehicle photos (multi-angulo, opcional)
  vehicle_photos: defineTable({
    vehiculo_id: v.id("vehiculos"),
    storage_id: v.id("_storage"),
    angulo: v.string(),                       // "frontal" | "lateral_izq" | "lateral_der" |
                                              // "posterior" | "top"
    uploaded_by: v.id("perfiles_usuarios"),
    uploaded_at: v.number(),
    use_as_ground_truth: v.boolean(),
    organizacion_id: v.id("organizaciones"),
  })
    .index("by_vehiculo", ["vehiculo_id"])
    .index("by_organizacion", ["organizacion_id"]),

  // 38. Crawler audit log (defensa legal)
  crawler_audit_log: defineTable({
    source_url: v.string(),
    fetched_at: v.number(),
    status_code: v.number(),
    user_agent: v.string(),
    robots_txt_checked: v.boolean(),
    robots_txt_allowed: v.boolean(),
    response_size_bytes: v.number(),
    result_kb_source_id: v.optional(v.id("kb_sources")),
  })
    .index("by_url", ["source_url"])
    .index("by_fetched", ["fetched_at"]),

  // 39. Template overrides (cache de refinamientos por modelo)
  template_overrides: defineTable({
    model_year_id: v.id("model_years"),
    equipment_class: v.string(),
    template_name: v.string(),                // "compactador" | "barredora" | etc
    param_overrides: v.any(),                 // JSON con knobs
    confidence: v.number(),
    source: v.string(),                       // "claude_refinement" | "manual_curator" |
                                              // "ocr_extracted" | "kb_specs"
    approved_by: v.optional(v.id("perfiles_usuarios")),
    approved_at: v.optional(v.number()),
    last_computed: v.number(),
    visibility: v.string(),                   // "private_org" | "global"
    organizacion_id: v.optional(v.id("organizaciones")),
  })
    .index("by_model_year", ["model_year_id"])
    .index("by_organizacion", ["organizacion_id"])
    .index("by_visibility", ["visibility"]),
});
