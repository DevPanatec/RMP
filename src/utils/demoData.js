// Datos de demostración para presentaciones y testing
// Coordenadas reales de Ciudad de Panamá

export const DEMO_ROUTES = [
  {
    id: 'demo-ruta-1',
    nombre: 'Ruta Recolección Costa del Este',
    tipo_servicio: 'recoleccion',
    descripcion: 'Ruta de recolección residencial zona este',
    hora_inicio: '06:00',
    hora_fin: '14:00',
    dias_operacion: ['lunes', 'miercoles', 'viernes'],
    estado: 'activa',
    paradas: [
      { id: 1, nombre: 'Costa del Este Centro', latitud: 9.0320, longitud: -79.4750, orden: 1, completada: true, hora_completada: '06:15' },
      { id: 2, nombre: 'Parque Omar', latitud: 9.0180, longitud: -79.4920, orden: 2, completada: true, hora_completada: '06:45' },
      { id: 3, nombre: 'Vía Brasil Plaza', latitud: 9.0050, longitud: -79.5050, orden: 3, completada: true, hora_completada: '07:20' },
      { id: 4, nombre: 'Multiplaza Pacific', latitud: 8.9920, longitud: -79.5180, orden: 4, completada: false },
      { id: 5, nombre: 'Parque Urraca', latitud: 8.9850, longitud: -79.5280, orden: 5, completada: false },
      { id: 6, nombre: 'Cinta Costera', latitud: 8.9750, longitud: -79.5350, orden: 6, completada: false }
    ],
    distancia_km: 8.5,
    tiempo_estimado_min: 240
  },
  {
    id: 'demo-ruta-2',
    nombre: 'Ruta San Miguelito',
    tipo_servicio: 'recoleccion',
    descripcion: 'Recolección comercial San Miguelito',
    hora_inicio: '07:00',
    hora_fin: '15:00',
    dias_operacion: ['martes', 'jueves', 'sabado'],
    estado: 'activa',
    paradas: [
      { id: 1, nombre: 'Mercado San Miguelito', latitud: 9.0520, longitud: -79.4990, orden: 1, completada: true, hora_completada: '07:10' },
      { id: 2, nombre: 'Plaza Comercial', latitud: 9.0550, longitud: -79.4960, orden: 2, completada: true, hora_completada: '07:50' },
      { id: 3, nombre: 'Zona Residencial Norte', latitud: 9.0580, longitud: -79.4930, orden: 3, completada: false },
      { id: 4, nombre: 'Hospital San Miguel', latitud: 9.0610, longitud: -79.4900, orden: 4, completada: false }
    ],
    distancia_km: 6.2,
    tiempo_estimado_min: 180
  },
  {
    id: 'demo-ruta-3',
    nombre: 'Fumigación Zona Turística',
    tipo_servicio: 'fumigacion',
    descripcion: 'Fumigación preventiva Casco Antiguo y alrededores',
    hora_inicio: '05:00',
    hora_fin: '11:00',
    dias_operacion: ['lunes', 'jueves'],
    estado: 'activa',
    paradas: [
      { id: 1, nombre: 'Plaza Catedral', latitud: 8.9530, longitud: -79.5340, orden: 1, completada: true, hora_completada: '05:15' },
      { id: 2, nombre: 'Plaza Francia', latitud: 8.9495, longitud: -79.5355, orden: 2, completada: true, hora_completada: '05:45' },
      { id: 3, nombre: 'Teatro Nacional', latitud: 8.9510, longitud: -79.5325, orden: 3, completada: false },
      { id: 4, nombre: 'Mercado Público', latitud: 8.9560, longitud: -79.5380, orden: 4, completada: false },
      { id: 5, nombre: 'Plaza Herrera', latitud: 8.9580, longitud: -79.5350, orden: 5, completada: false },
      { id: 6, nombre: 'Cinta Costera 1', latitud: 8.9620, longitud: -79.5320, orden: 6, completada: false }
    ],
    distancia_km: 5.8,
    tiempo_estimado_min: 240
  }
];

export const DEMO_VEHICLES = [
  {
    id: 'demo-vehicle-1',
    nombre: 'Camión 01',
    placa: 'RMP-001',
    marca: 'Hino',
    modelo: '500',
    año: 2022,
    tipoServicio: 'recoleccion',
    tipo_servicio: 'recoleccion',
    capacidad_carga: 8000,
    estado: 'En ruta',
    lat: 9.0050,
    lng: -79.5050,
    rutaAsignada: 'demo-ruta-1',
    ruta_id: 'demo-ruta-1',
    conductorAsignado: 'demo-conductor-1',
    conductor_id: 'demo-conductor-1',
    indiceRuta: 3,
    ultimaActualizacion: Date.now(),
    horaInicio: Date.now() - (2 * 60 * 60 * 1000 + 15 * 60 * 1000), // Hace 2h 15min
    direccion: 45,
    pesoAcumulado: 2400,
    historialPosiciones: [
      { lat: 9.0320, lng: -79.4750, timestamp: new Date(Date.now() - 3600000).toISOString() },
      { lat: 9.0180, lng: -79.4920, timestamp: new Date(Date.now() - 1800000).toISOString() },
      { lat: 9.0050, lng: -79.5050, timestamp: new Date().toISOString() }
    ]
  },
  {
    id: 'demo-vehicle-2',
    nombre: 'Camión 02',
    placa: 'RMP-002',
    marca: 'Isuzu',
    modelo: 'NQR',
    año: 2021,
    tipoServicio: 'recoleccion',
    tipo_servicio: 'recoleccion',
    capacidad_carga: 6500,
    estado: 'En ruta',
    lat: 9.0550,
    lng: -79.4960,
    rutaAsignada: 'demo-ruta-2',
    ruta_id: 'demo-ruta-2',
    conductorAsignado: 'demo-conductor-2',
    conductor_id: 'demo-conductor-2',
    indiceRuta: 2,
    ultimaActualizacion: Date.now(),
    horaInicio: Date.now() - (1 * 60 * 60 * 1000 + 50 * 60 * 1000), // Hace 1h 50min
    direccion: 90,
    pesoAcumulado: 1800,
    historialPosiciones: [
      { lat: 9.0520, lng: -79.4990, timestamp: new Date(Date.now() - 2400000).toISOString() },
      { lat: 9.0535, lng: -79.4975, timestamp: new Date(Date.now() - 1200000).toISOString() },
      { lat: 9.0550, lng: -79.4960, timestamp: new Date().toISOString() }
    ]
  },
  {
    id: 'demo-vehicle-3',
    nombre: 'Fumigadora 01',
    placa: 'RMP-F01',
    marca: 'Toyota',
    modelo: 'Dyna',
    año: 2023,
    tipoServicio: 'fumigacion',
    tipo_servicio: 'fumigacion',
    capacidad_carga: 2000,
    estado: 'En ruta',
    lat: 8.9505,
    lng: -79.5340,
    rutaAsignada: 'demo-ruta-3',
    ruta_id: 'demo-ruta-3',
    conductorAsignado: 'demo-conductor-3',
    conductor_id: 'demo-conductor-3',
    indiceRuta: 5,
    paradaActual: 2,
    totalParadas: 6,
    ultimaActualizacion: Date.now(),
    horaInicio: Date.now() - (1 * 60 * 60 * 1000 + 30 * 60 * 1000), // Hace 1h 30min
    direccion: 45,
    areaFumigada: 1250,
    tipoPlaga: 'Mosquitos',
    combustible: 75,
    historialPosiciones: [
      { lat: 8.9530, lng: -79.5340, timestamp: new Date(Date.now() - 3000000).toISOString() },
      { lat: 8.9495, lng: -79.5355, timestamp: new Date(Date.now() - 1500000).toISOString() },
      { lat: 8.9505, lng: -79.5340, timestamp: new Date().toISOString() }
    ]
  },
  {
    id: 'demo-vehicle-4',
    nombre: 'Camión 03',
    placa: 'RMP-003',
    marca: 'Hino',
    modelo: '300',
    año: 2020,
    tipoServicio: 'recoleccion',
    tipo_servicio: 'recoleccion',
    capacidad_carga: 5000,
    estado: 'Disponible',
    lat: 9.0800,
    lng: -79.5200,
    rutaAsignada: null,
    ruta_id: null,
    conductorAsignado: 'demo-conductor-4',
    conductor_id: 'demo-conductor-4',
    direccion: 0
  },
  {
    id: 'demo-vehicle-5',
    nombre: 'Camión 04',
    placa: 'RMP-004',
    marca: 'Isuzu',
    modelo: 'FTR',
    año: 2019,
    tipoServicio: 'recoleccion',
    tipo_servicio: 'recoleccion',
    capacidad_carga: 7500,
    estado: 'Disponible',
    lat: 9.0950,
    lng: -79.5100,
    rutaAsignada: null,
    ruta_id: null,
    conductorAsignado: null,
    conductor_id: null,
    direccion: 0
  },
  {
    id: 'demo-vehicle-6',
    nombre: 'Fumigadora 02',
    placa: 'RMP-F02',
    marca: 'Mitsubishi',
    modelo: 'Canter',
    año: 2022,
    tipoServicio: 'fumigacion',
    tipo_servicio: 'fumigacion',
    capacidad_carga: 1800,
    estado: 'Disponible',
    lat: 8.9830,
    lng: -79.5190,
    rutaAsignada: null,
    ruta_id: null,
    conductorAsignado: 'demo-conductor-5',
    conductor_id: 'demo-conductor-5',
    velocidad: 0,
    direccion: 0
  }
];

export const DEMO_PERSONNEL = [
  {
    id: 'demo-conductor-1',
    nombre: 'Carlos Rodríguez',
    apellido: 'Mendoza',
    cargo: 'Conductor',
    departamento: 'Operaciones',
    telefono: '+507 6123-4567',
    email: 'carlos.rodriguez@rmp.com',
    fecha_contratacion: '2021-03-15',
    licencia: 'A-123456',
    estado: 'activo',
    vehiculo_asignado: 'demo-vehicle-1'
  },
  {
    id: 'demo-conductor-2',
    nombre: 'María González',
    apellido: 'Pérez',
    cargo: 'Conductor',
    departamento: 'Operaciones',
    telefono: '+507 6234-5678',
    email: 'maria.gonzalez@rmp.com',
    fecha_contratacion: '2020-11-20',
    licencia: 'A-234567',
    estado: 'activo',
    vehiculo_asignado: 'demo-vehicle-2'
  },
  {
    id: 'demo-conductor-3',
    nombre: 'José Martínez',
    apellido: 'López',
    cargo: 'Técnico Fumigación',
    departamento: 'Fumigación',
    telefono: '+507 6345-6789',
    email: 'jose.martinez@rmp.com',
    fecha_contratacion: '2022-01-10',
    licencia: 'B-345678',
    certificacion: 'Fumigación Nivel 2',
    estado: 'activo',
    vehiculo_asignado: 'demo-vehicle-3'
  },
  {
    id: 'demo-conductor-4',
    nombre: 'Ana Castillo',
    apellido: 'Ramírez',
    cargo: 'Conductor',
    departamento: 'Operaciones',
    telefono: '+507 6456-7890',
    email: 'ana.castillo@rmp.com',
    fecha_contratacion: '2021-08-05',
    licencia: 'A-456789',
    estado: 'activo',
    vehiculo_asignado: 'demo-vehicle-4'
  },
  {
    id: 'demo-conductor-5',
    nombre: 'Roberto Sánchez',
    apellido: 'Torres',
    cargo: 'Técnico Fumigación',
    departamento: 'Fumigación',
    telefono: '+507 6567-8901',
    email: 'roberto.sanchez@rmp.com',
    fecha_contratacion: '2022-06-12',
    licencia: 'B-567890',
    certificacion: 'Fumigación Nivel 1',
    estado: 'activo',
    vehiculo_asignado: 'demo-vehicle-6'
  },
  {
    id: 'demo-admin-1',
    nombre: 'Laura Fernández',
    apellido: 'Morales',
    cargo: 'Supervisor',
    departamento: 'Operaciones',
    telefono: '+507 6678-9012',
    email: 'laura.fernandez@rmp.com',
    fecha_contratacion: '2019-04-01',
    estado: 'activo'
  },
  {
    id: 'demo-admin-2',
    nombre: 'Pedro Gutiérrez',
    apellido: 'Silva',
    cargo: 'Coordinador',
    departamento: 'Logística',
    telefono: '+507 6789-0123',
    email: 'pedro.gutierrez@rmp.com',
    fecha_contratacion: '2020-02-15',
    estado: 'activo'
  }
];

export const DEMO_ALERTS = [
  {
    id: 'demo-alert-1',
    tipo: 'Obstrucción',
    descripcion: 'Vía bloqueada por trabajos de construcción en Avenida Balboa',
    ubicacion: 'Avenida Balboa, Ciudad de Panamá',
    latitud: 8.9679,
    longitud: -79.5339,
    fecha: new Date(Date.now() - 7200000).toISOString(), // Hace 2 horas
    estado: 'activa',
    prioridad: 'alta',
    reportado_por: 'demo-conductor-1',
    vehiculo_id: 'demo-vehicle-1'
  },
  {
    id: 'demo-alert-2',
    tipo: 'Derrame',
    descripcion: 'Pequeño derrame de líquidos en Vía España, requiere limpieza',
    ubicacion: 'Vía España, Ciudad de Panamá',
    latitud: 9.0010,
    longitud: -79.5200,
    fecha: new Date(Date.now() - 10800000).toISOString(), // Hace 3 horas
    estado: 'en_proceso',
    prioridad: 'media',
    reportado_por: 'demo-conductor-2',
    vehiculo_id: 'demo-vehicle-2'
  },
  {
    id: 'demo-alert-3',
    tipo: 'Contenedor dañado',
    descripcion: 'Contenedor volcado en Parque Lefevre',
    ubicacion: 'Parque Lefevre, Ciudad de Panamá',
    latitud: 9.0515,
    longitud: -79.4850,
    fecha: new Date(Date.now() - 14400000).toISOString(), // Hace 4 horas
    estado: 'resuelta',
    prioridad: 'baja',
    reportado_por: 'demo-conductor-4',
    vehiculo_id: 'demo-vehicle-4'
  }
];

export const DEMO_RECENT_ACTIVITY = [
  {
    id: 1,
    tipo: 'parada_completada',
    descripcion: 'Parada "Plaza Catedral" completada',
    vehiculo: 'RMP-F01',
    conductor: 'José Martínez',
    timestamp: new Date(Date.now() - 300000).toISOString(), // Hace 5 min
    ruta: 'Fumigación Zona Turística'
  },
  {
    id: 2,
    tipo: 'parada_completada',
    descripcion: 'Parada "Plaza Comercial" completada',
    vehiculo: 'RMP-002',
    conductor: 'María González',
    timestamp: new Date(Date.now() - 900000).toISOString(), // Hace 15 min
    ruta: 'Ruta San Miguelito'
  },
  {
    id: 3,
    tipo: 'parada_completada',
    descripcion: 'Parada "Vía Brasil Plaza" completada',
    vehiculo: 'RMP-001',
    conductor: 'Carlos Rodríguez',
    timestamp: new Date(Date.now() - 1800000).toISOString(), // Hace 30 min
    ruta: 'Ruta Recolección Costa del Este'
  },
  {
    id: 4,
    tipo: 'alerta_creada',
    descripcion: 'Nueva alerta: Vía bloqueada en Avenida Balboa',
    vehiculo: 'RMP-001',
    conductor: 'Carlos Rodríguez',
    timestamp: new Date(Date.now() - 2700000).toISOString(), // Hace 45 min
    prioridad: 'alta'
  },
  {
    id: 5,
    tipo: 'ruta_iniciada',
    descripcion: 'Ruta "Fumigación Zona Turística" iniciada',
    vehiculo: 'RMP-F01',
    conductor: 'José Martínez',
    timestamp: new Date(Date.now() - 5400000).toISOString(), // Hace 1.5 horas
    ruta: 'Fumigación Zona Turística'
  },
  {
    id: 6,
    tipo: 'parada_completada',
    descripcion: 'Parada "Mercado San Miguelito" completada',
    vehiculo: 'RMP-002',
    conductor: 'María González',
    timestamp: new Date(Date.now() - 6300000).toISOString(), // Hace 1.75 horas
    ruta: 'Ruta San Miguelito'
  },
  {
    id: 7,
    tipo: 'ruta_iniciada',
    descripcion: 'Ruta "San Miguelito" iniciada',
    vehiculo: 'RMP-002',
    conductor: 'María González',
    timestamp: new Date(Date.now() - 7200000).toISOString(), // Hace 2 horas
    ruta: 'Ruta San Miguelito'
  },
  {
    id: 8,
    tipo: 'parada_completada',
    descripcion: 'Parada "Parque Omar" completada',
    vehiculo: 'RMP-001',
    conductor: 'Carlos Rodríguez',
    timestamp: new Date(Date.now() - 8100000).toISOString(), // Hace 2.25 horas
    ruta: 'Ruta Recolección Costa del Este'
  },
  {
    id: 9,
    tipo: 'parada_completada',
    descripcion: 'Parada "Costa del Este Centro" completada',
    vehiculo: 'RMP-001',
    conductor: 'Carlos Rodríguez',
    timestamp: new Date(Date.now() - 9900000).toISOString(), // Hace 2.75 horas
    ruta: 'Ruta Recolección Costa del Este'
  },
  {
    id: 10,
    tipo: 'ruta_iniciada',
    descripcion: 'Ruta "Recolección Costa del Este" iniciada',
    vehiculo: 'RMP-001',
    conductor: 'Carlos Rodríguez',
    timestamp: new Date(Date.now() - 10800000).toISOString(), // Hace 3 horas
    ruta: 'Ruta Recolección Costa del Este'
  }
];

// Puntos de limpieza demo
export const DEMO_LUGARES = [
  {
    id: 'demo-lugar-1',
    nombre: 'Mercado de Alcalde Díaz',
    latitud: 9.1380,
    longitud: -79.4820,
    foto: '/lugares/Mercado Alcalde Diaz.jpeg',
    tipo: 'punto_limpieza',
    direccion: 'Alcalde Díaz, Panamá',
    descripcion: 'Mercado principal de la zona de Alcalde Díaz'
  },
  {
    id: 'demo-lugar-2',
    nombre: 'Mercado del Marisco',
    latitud: 8.9580,
    longitud: -79.5341,
    foto: '/lugares/mercado de mariscos.jpg',
    tipo: 'punto_limpieza',
    direccion: 'Cinta Costera, Panamá',
    descripcion: 'Mercado de pescados y mariscos frente al mar'
  },
  {
    id: 'demo-lugar-3',
    nombre: 'Mercado de Pacora',
    latitud: 9.0768,
    longitud: -79.2905,
    foto: '/lugares/Mercado de Pacora.jpg',
    tipo: 'punto_limpieza',
    direccion: 'Pacora, Panamá Este',
    descripcion: 'Mercado público de Pacora'
  },
  {
    id: 'demo-lugar-4',
    nombre: 'Mercado San Felipe Neri',
    latitud: 8.9535,
    longitud: -79.5332,
    foto: '/lugares/san felipe neri.jpeg',
    tipo: 'punto_limpieza',
    direccion: 'San Felipe, Casco Antiguo',
    descripcion: 'Mercado histórico en el Casco Antiguo'
  },
  {
    id: 'demo-lugar-5',
    nombre: 'Mercado de Pueblo Nuevo',
    latitud: 8.9950,
    longitud: -79.5250,
    foto: '/lugares/Mercado Pueblo Nuevo.jpg',
    tipo: 'punto_limpieza',
    direccion: 'Pueblo Nuevo, Panamá',
    descripcion: 'Mercado popular de Pueblo Nuevo'
  }
];

// Assignments de limpieza demo
export const DEMO_CLEANING_ASSIGNMENTS = [
  // Mercado de Alcalde Díaz
  {
    id: 'demo-cleaning-1',
    lugar_id: 'demo-lugar-1',
    fecha: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Ayer
    hora_inicio: '06:00',
    hora_fin: '08:30',
    tipo: 'recoleccion',
    estado: 'completado',
    personal_asignado: 'demo-conductor-1',
    observaciones: 'Limpieza completa realizada. Todas las áreas fueron atendidas.',
    fotos: [
      { etapa: 'antes', url: '/placeholder-before.jpg' },
      { etapa: 'despues', url: '/placeholder-after.jpg' }
    ]
  },
  {
    id: 'demo-cleaning-2',
    lugar_id: 'demo-lugar-1',
    fecha: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Hace 8 días
    hora_inicio: '06:00',
    hora_fin: '08:00',
    tipo: 'recoleccion',
    estado: 'completado',
    personal_asignado: 'demo-conductor-2',
    observaciones: 'Recolección de residuos sólidos.',
    fotos: []
  },

  // Mercado del Marisco
  {
    id: 'demo-cleaning-3',
    lugar_id: 'demo-lugar-2',
    fecha: new Date().toISOString().split('T')[0], // Hoy
    hora_inicio: '05:30',
    hora_fin: '07:45',
    tipo: 'recoleccion',
    estado: 'completado',
    personal_asignado: 'demo-conductor-3',
    observaciones: 'Limpieza especial por alta actividad del mercado. Residuos orgánicos gestionados.',
    fotos: [
      { etapa: 'antes', url: '/placeholder-before.jpg' },
      { etapa: 'durante', url: '/placeholder-during.jpg' },
      { etapa: 'despues', url: '/placeholder-after.jpg' }
    ]
  },
  {
    id: 'demo-cleaning-4',
    lugar_id: 'demo-lugar-2',
    fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Hace 2 días
    hora_inicio: '05:30',
    hora_fin: '07:30',
    tipo: 'recoleccion',
    estado: 'completado',
    personal_asignado: 'demo-conductor-1',
    observaciones: 'Recolección rutinaria de residuos del mercado.',
    fotos: []
  },

  // Mercado de Pacora
  {
    id: 'demo-cleaning-5',
    lugar_id: 'demo-lugar-3',
    fecha: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Ayer
    hora_inicio: '07:00',
    hora_fin: '09:00',
    tipo: 'recoleccion',
    estado: 'completado',
    personal_asignado: 'demo-conductor-4',
    observaciones: 'Limpieza general del área del mercado.',
    fotos: [
      { etapa: 'antes', url: '/placeholder-before.jpg' },
      { etapa: 'despues', url: '/placeholder-after.jpg' }
    ]
  },
  {
    id: 'demo-cleaning-6',
    lugar_id: 'demo-lugar-3',
    fecha: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Hace 7 días
    hora_inicio: '07:00',
    hora_fin: '08:45',
    tipo: 'recoleccion',
    estado: 'completado',
    personal_asignado: 'demo-conductor-2',
    observaciones: 'Manejo de residuos del mercado semanal.',
    fotos: []
  },

  // San Felipe Neri
  {
    id: 'demo-cleaning-7',
    lugar_id: 'demo-lugar-4',
    fecha: new Date().toISOString().split('T')[0], // Hoy
    hora_inicio: '06:30',
    hora_fin: null,
    tipo: 'recoleccion',
    estado: 'en_progreso',
    personal_asignado: 'demo-conductor-3',
    observaciones: 'Limpieza en curso en el Casco Antiguo.',
    fotos: [
      { etapa: 'antes', url: '/placeholder-before.jpg' }
    ]
  },
  {
    id: 'demo-cleaning-8',
    lugar_id: 'demo-lugar-4',
    fecha: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Hace 3 días
    hora_inicio: '06:30',
    hora_fin: '08:15',
    tipo: 'recoleccion',
    estado: 'completado',
    personal_asignado: 'demo-conductor-1',
    observaciones: 'Limpieza histórica preservando el entorno.',
    fotos: []
  },

  // Pueblo Nuevo
  {
    id: 'demo-cleaning-9',
    lugar_id: 'demo-lugar-5',
    fecha: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Mañana
    hora_inicio: '06:00',
    hora_fin: null,
    tipo: 'recoleccion',
    estado: 'pendiente',
    personal_asignado: 'demo-conductor-2',
    observaciones: 'Limpieza programada para mañana.',
    fotos: []
  },
  {
    id: 'demo-cleaning-10',
    lugar_id: 'demo-lugar-5',
    fecha: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Hace 4 días
    hora_inicio: '06:00',
    hora_fin: '08:00',
    tipo: 'recoleccion',
    estado: 'completado',
    personal_asignado: 'demo-conductor-4',
    observaciones: 'Recolección eficiente completada sin incidentes.',
    fotos: [
      { etapa: 'antes', url: '/placeholder-before.jpg' },
      { etapa: 'despues', url: '/placeholder-after.jpg' }
    ]
  }
];

// Asignaciones de calendario (schedule) demo - para esta semana
const getMonday = () => {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(today.setDate(diff));
};

export const DEMO_SCHEDULE_ASSIGNMENTS = [
  {
    id: 'demo-schedule-1',
    ruta_id: 'demo-ruta-1',
    vehiculo_id: 'demo-vehicle-1',
    conductor_id: 'demo-conductor-1',
    fecha: getMonday().toISOString().split('T')[0],
    dias_semana: ['lunes', 'miercoles', 'viernes'],
    hora_inicio: '06:00',
    hora_fin: '14:00',
    estado: 'completada',
    ruta: DEMO_ROUTES[0],
    conductor_nombre: 'Carlos Rodríguez Mendoza',
    vehiculo: { placa: 'RMP-001' }
  },
  {
    id: 'demo-schedule-2',
    ruta_id: 'demo-ruta-2',
    vehiculo_id: 'demo-vehicle-2',
    conductor_id: 'demo-conductor-2',
    fecha: getMonday().toISOString().split('T')[0],
    dias_semana: ['martes', 'jueves', 'sabado'],
    hora_inicio: '07:00',
    hora_fin: '15:00',
    estado: 'en_progreso',
    ruta: DEMO_ROUTES[1],
    conductor_nombre: 'María González Pérez',
    vehiculo: { placa: 'RMP-002' }
  },
  {
    id: 'demo-schedule-3',
    ruta_id: 'demo-ruta-3',
    vehiculo_id: 'demo-vehicle-3',
    conductor_id: 'demo-conductor-3',
    fecha: getMonday().toISOString().split('T')[0],
    dias_semana: ['lunes', 'jueves'],
    hora_inicio: '05:00',
    hora_fin: '11:00',
    estado: 'programada',
    ruta: DEMO_ROUTES[2],
    conductor_nombre: 'José Martínez López',
    vehiculo: { placa: 'RMP-F01' }
  }
];

// Tareas de mantenimiento demo
export const DEMO_MAINTENANCE_TASKS = [
  {
    id: 'demo-maint-1',
    vehiculo_id: 'demo-vehicle-1',
    vehiculo_placa: 'RMP-001',
    tipo_mantenimiento: 'preventivo',
    descripcion: 'Cambio de aceite y filtros',
    fecha_programada: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    prioridad: 'media',
    estado: 'pendiente',
    costo_estimado: 150.00,
    mecanico_asignado: 'Taller Central'
  },
  {
    id: 'demo-maint-2',
    vehiculo_id: 'demo-vehicle-2',
    vehiculo_placa: 'RMP-002',
    tipo_mantenimiento: 'correctivo',
    descripcion: 'Reparación de sistema hidráulico',
    fecha_programada: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    prioridad: 'alta',
    estado: 'en_progreso',
    costo_estimado: 450.00,
    mecanico_asignado: 'Taller Especializado'
  },
  {
    id: 'demo-maint-3',
    vehiculo_id: 'demo-vehicle-3',
    vehiculo_placa: 'RMP-F01',
    tipo_mantenimiento: 'inspeccion',
    descripcion: 'Inspección mensual de equipo de fumigación',
    fecha_programada: new Date().toISOString().split('T')[0],
    prioridad: 'alta',
    estado: 'completada',
    costo_estimado: 85.00,
    fecha_completada: new Date().toISOString().split('T')[0],
    mecanico_asignado: 'Técnico Especializado'
  },
  {
    id: 'demo-maint-4',
    vehiculo_id: 'demo-vehicle-4',
    vehiculo_placa: 'RMP-003',
    tipo_mantenimiento: 'preventivo',
    descripcion: 'Revisión de frenos y suspensión',
    fecha_programada: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    prioridad: 'media',
    estado: 'pendiente',
    costo_estimado: 280.00,
    mecanico_asignado: 'Taller Central'
  }
];

// Reportes de rutas completadas demo
export const DEMO_ROUTE_REPORTS = [
  {
    id: 'demo-report-1',
    ruta_id: 'demo-ruta-1',
    ruta_nombre: 'Ruta Recolección Costa del Este',
    tipo_ruta: 'recoleccion',
    vehiculo_id: 'demo-vehicle-1',
    vehiculo_placa: 'RMP-001',
    conductor_id: 'demo-conductor-1',
    conductor_nombre: 'Carlos Rodríguez Mendoza',
    fecha_completacion: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    hora_inicio: '06:00',
    hora_fin: '13:45',
    paradas_completadas: [
      { direccion: 'Costa del Este Centro', orden: 1, hora_completada: '06:15', peso_kg: 450 },
      { direccion: 'Parque Omar', orden: 2, hora_completada: '06:45', peso_kg: 380 },
      { direccion: 'Vía Brasil Plaza', orden: 3, hora_completada: '07:20', peso_kg: 520 },
      { direccion: 'Multiplaza Pacific', orden: 4, hora_completada: '08:10', peso_kg: 410 },
      { direccion: 'Parque Urraca', orden: 5, hora_completada: '09:15', peso_kg: 360 },
      { direccion: 'Cinta Costera', orden: 6, hora_completada: '10:30', peso_kg: 280 }
    ],
    peso_total_kg: 2400,
    distancia_recorrida_km: 8.5,
    combustible_usado_lts: 12.3,
    observaciones: 'Ruta completada sin incidentes. Todas las paradas atendidas.',
    calificacion: 5
  },
  {
    id: 'demo-report-2',
    ruta_id: 'demo-ruta-2',
    ruta_nombre: 'Ruta San Miguelito',
    tipo_ruta: 'recoleccion',
    vehiculo_id: 'demo-vehicle-2',
    vehiculo_placa: 'RMP-002',
    conductor_id: 'demo-conductor-2',
    conductor_nombre: 'María González Pérez',
    fecha_completacion: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    hora_inicio: '07:00',
    hora_fin: '14:30',
    paradas_completadas: [
      { direccion: 'Mercado San Miguelito', orden: 1, hora_completada: '07:10', peso_kg: 580 },
      { direccion: 'Plaza Comercial', orden: 2, hora_completada: '07:50', peso_kg: 420 },
      { direccion: 'Zona Residencial Norte', orden: 3, hora_completada: '09:20', peso_kg: 390 },
      { direccion: 'Hospital San Miguel', orden: 4, hora_completada: '11:15', peso_kg: 410 }
    ],
    peso_total_kg: 1800,
    distancia_recorrida_km: 6.2,
    combustible_usado_lts: 9.8,
    observaciones: 'Recolección eficiente en zona comercial.',
    calificacion: 5
  },
  {
    id: 'demo-report-3',
    ruta_id: 'demo-ruta-3',
    ruta_nombre: 'Fumigación Zona Turística',
    tipo_ruta: 'fumigacion',
    vehiculo_id: 'demo-vehicle-3',
    vehiculo_placa: 'RMP-F01',
    conductor_id: 'demo-conductor-3',
    conductor_nombre: 'José Martínez López',
    fecha_completacion: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    hora_inicio: '05:00',
    hora_fin: '10:45',
    paradas_completadas: [
      { direccion: 'Plaza Catedral', orden: 1, hora_completada: '05:15', area_m2: 420 },
      { direccion: 'Plaza Francia', orden: 2, hora_completada: '05:45', area_m2: 380 },
      { direccion: 'Teatro Nacional', orden: 3, hora_completada: '06:30', area_m2: 310 },
      { direccion: 'Mercado Público', orden: 4, hora_completada: '07:45', area_m2: 520 },
      { direccion: 'Plaza Herrera', orden: 5, hora_completada: '09:00', area_m2: 290 },
      { direccion: 'Cinta Costera 1', orden: 6, hora_completada: '10:15', area_m2: 330 }
    ],
    area_fumigada_m2: 2250,
    distancia_recorrida_km: 5.8,
    producto_usado_lts: 45,
    observaciones: 'Fumigación preventiva completada. Condiciones climáticas favorables.',
    calificacion: 5
  }
];

// Inventario demo
export const DEMO_INVENTORY = [
  {
    id: 'demo-inv-1',
    nombre: 'Combustible Diesel',
    categoria: 'combustible',
    unidad_medida: 'litros',
    cantidad_actual: 2500,
    cantidad_minima: 1000,
    cantidad_maxima: 5000,
    costo_unitario: 1.25,
    proveedor: 'Petro Panamá',
    ubicacion: 'Tanque Principal',
    estado: 'disponible',
    ultima_actualizacion: new Date().toISOString()
  },
  {
    id: 'demo-inv-2',
    nombre: 'Aceite Motor 15W40',
    categoria: 'lubricantes',
    unidad_medida: 'litros',
    cantidad_actual: 85,
    cantidad_minima: 50,
    cantidad_maxima: 200,
    costo_unitario: 8.50,
    proveedor: 'Lubricantes SA',
    ubicacion: 'Almacén A',
    estado: 'disponible',
    ultima_actualizacion: new Date().toISOString()
  },
  {
    id: 'demo-inv-3',
    nombre: 'Insecticida Concentrado',
    categoria: 'quimicos',
    unidad_medida: 'litros',
    cantidad_actual: 120,
    cantidad_minima: 80,
    cantidad_maxima: 300,
    costo_unitario: 22.00,
    proveedor: 'Químicos del Istmo',
    ubicacion: 'Almacén Químicos',
    estado: 'disponible',
    ultima_actualizacion: new Date().toISOString()
  },
  {
    id: 'demo-inv-4',
    nombre: 'Filtro de Aceite',
    categoria: 'repuestos',
    unidad_medida: 'unidades',
    cantidad_actual: 15,
    cantidad_minima: 20,
    cantidad_maxima: 50,
    costo_unitario: 18.50,
    proveedor: 'Repuestos Total',
    ubicacion: 'Almacén B',
    estado: 'bajo',
    ultima_actualizacion: new Date().toISOString()
  },
  {
    id: 'demo-inv-5',
    nombre: 'Filtro de Aire',
    categoria: 'repuestos',
    unidad_medida: 'unidades',
    cantidad_actual: 22,
    cantidad_minima: 15,
    cantidad_maxima: 40,
    costo_unitario: 25.00,
    proveedor: 'Repuestos Total',
    ubicacion: 'Almacén B',
    estado: 'disponible',
    ultima_actualizacion: new Date().toISOString()
  },
  {
    id: 'demo-inv-6',
    nombre: 'Guantes de Seguridad',
    categoria: 'epp',
    unidad_medida: 'pares',
    cantidad_actual: 45,
    cantidad_minima: 30,
    cantidad_maxima: 100,
    costo_unitario: 3.50,
    proveedor: 'Seguridad Industrial',
    ubicacion: 'Almacén EPP',
    estado: 'disponible',
    ultima_actualizacion: new Date().toISOString()
  },
  {
    id: 'demo-inv-7',
    nombre: 'Mascarillas Respiratorias',
    categoria: 'epp',
    unidad_medida: 'unidades',
    cantidad_actual: 12,
    cantidad_minima: 25,
    cantidad_maxima: 80,
    costo_unitario: 12.00,
    proveedor: 'Seguridad Industrial',
    ubicacion: 'Almacén EPP',
    estado: 'bajo',
    ultima_actualizacion: new Date().toISOString()
  },
  {
    id: 'demo-inv-8',
    nombre: 'Bolsas de Basura Industrial 100L',
    categoria: 'consumibles',
    unidad_medida: 'rollos',
    cantidad_actual: 180,
    cantidad_minima: 100,
    cantidad_maxima: 300,
    costo_unitario: 15.00,
    proveedor: 'Plásticos del Pacífico',
    ubicacion: 'Almacén General',
    estado: 'disponible',
    ultima_actualizacion: new Date().toISOString()
  }
];

// Reportes de riesgo demo adicionales
export const DEMO_RISK_REPORTS = [
  {
    id: 'demo-risk-1',
    tipo: 'interno',
    tipo_riesgo: 'mecanico',
    titulo: 'Fuga menor en sistema hidráulico',
    descripcion: 'Se detectó una pequeña fuga en el sistema hidráulico del compactador. Requiere revisión técnica.',
    conductor: 'Carlos Rodríguez Mendoza',
    conductor_id: 'demo-conductor-1',
    camion: 'RMP-001',
    vehiculo_id: 'demo-vehicle-1',
    ubicacion: 'Costa del Este Centro',
    prioridad: 'media',
    estado: 'reportado',
    categoria: 'Problemas mecánicos',
    fechaCreacion: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    fechaActualizacion: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'demo-risk-2',
    tipo: 'externo',
    tipo_riesgo: 'bloqueo_via',
    titulo: 'Manifestación bloqueando vía principal',
    descripcion: 'Grupo de manifestantes bloqueando Vía España. Se requiere ruta alterna.',
    conductor: 'María González Pérez',
    conductor_id: 'demo-conductor-2',
    camion: 'RMP-002',
    vehiculo_id: 'demo-vehicle-2',
    ubicacion: 'Vía España - Plaza Comercial',
    prioridad: 'alta',
    estado: 'en_revision',
    categoria: 'Bloqueo de vía',
    fechaCreacion: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    fechaActualizacion: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'demo-risk-3',
    tipo: 'interno',
    tipo_riesgo: 'combustible',
    titulo: 'Nivel de combustible bajo',
    descripcion: 'El vehículo tiene menos del 20% de combustible. Requiere reabastecimiento pronto.',
    conductor: 'José Martínez López',
    conductor_id: 'demo-conductor-3',
    camion: 'RMP-F01',
    vehiculo_id: 'demo-vehicle-3',
    ubicacion: 'Plaza Herrera',
    prioridad: 'baja',
    estado: 'resuelto',
    categoria: 'Combustible',
    fechaCreacion: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    fechaActualizacion: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  }
];

// Función helper para mezclar datos demo con datos reales
export const mergeDemoData = (realData, demoData) => {
  return [...(realData || []), ...demoData];
};

// Función para simular progreso de rutas en tiempo real
export const updateDemoVehiclesProgress = (vehicles, routes) => {
  return vehicles.map(vehicle => {
    if (vehicle.estado !== 'En ruta' || !vehicle.rutaAsignada) {
      return vehicle;
    }

    const route = routes.find(r => r.id === vehicle.rutaAsignada);
    if (!route || !route.paradas) {
      return vehicle;
    }

    // Simular avance gradual en la ruta
    const currentIndex = vehicle.indiceRuta || 0;
    const paradas = route.paradas;

    if (currentIndex >= paradas.length - 1) {
      // Ruta completada
      return { ...vehicle, estado: 'Disponible', indiceRuta: 0 };
    }

    // Mover al siguiente punto (simulación simple)
    const nextParada = paradas[currentIndex + 1];
    if (nextParada) {
      return {
        ...vehicle,
        lat: nextParada.latitud + (Math.random() - 0.5) * 0.001, // Pequeña variación
        lng: nextParada.longitud + (Math.random() - 0.5) * 0.001,
        indiceRuta: currentIndex + (Math.random() > 0.7 ? 1 : 0), // Avance aleatorio
        ultimaActualizacion: Date.now()
      };
    }

    return vehicle;
  });
};
