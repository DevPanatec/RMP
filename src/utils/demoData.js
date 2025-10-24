// Datos de demostración para presentaciones y testing
// Coordenadas reales de Ciudad de Panamá

export const DEMO_ROUTES = [
  {
    id: 'demo-ruta-1',
    nombre: 'Mercado de Mariscos',
    tipo_servicio: 'recoleccion',
    descripcion: 'Ruta de recolección: Mercado de Mariscos y traslado a Cerro Patacón',
    hora_inicio: '06:00',
    hora_fin: '18:00',
    dias_operacion: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
    estado: 'activa',
    paradas: [
      { id: 1, nombre: 'Estacionamiento Diana Morán 2066', latitud: 8.9720, longitud: -79.5380, orden: 1, completada: true, hora_completada: '06:00', tipo: 'inicio' },
      { id: 2, nombre: 'Mercado de Mariscos', latitud: 8.9580, longitud: -79.5341, orden: 2, completada: true, hora_completada: '06:45' },
      { id: 3, nombre: 'Cerro Patacón', latitud: 9.0450, longitud: -79.4650, orden: 3, completada: true, hora_completada: '09:30' },
      { id: 4, nombre: 'Regreso Diana Morán', latitud: 8.9720, longitud: -79.5380, orden: 4, completada: false, tipo: 'regreso' }
    ],
    distancia_km: 18.5,
    tiempo_estimado_min: 720,
    contenedores: 24,
    equipamiento: ['1 hidrolavadora', 'escobas', 'palas', 'rastrillo', 'recogedores']
  },
  {
    id: 'demo-ruta-2',
    nombre: 'San Felipe Neri',
    tipo_servicio: 'recoleccion',
    descripcion: 'Ruta de recolección: San Felipe Neri (Casco Antiguo) y traslado a Cerro Patacón',
    hora_inicio: '23:00',
    hora_fin: '06:00',
    dias_operacion: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'],
    estado: 'activa',
    paradas: [
      { id: 1, nombre: 'Estacionamiento Diana Morán 2066', latitud: 8.9720, longitud: -79.5380, orden: 1, completada: true, hora_completada: '23:00', tipo: 'inicio' },
      { id: 2, nombre: 'Mercado San Felipe Neri', latitud: 8.9535, longitud: -79.5332, orden: 2, completada: true, hora_completada: '23:30' },
      { id: 3, nombre: 'Cerro Patacón', latitud: 9.0450, longitud: -79.4650, orden: 3, completada: false },
      { id: 4, nombre: 'Regreso Diana Morán', latitud: 8.9720, longitud: -79.5380, orden: 4, completada: false, tipo: 'regreso' }
    ],
    distancia_km: 16.8,
    tiempo_estimado_min: 420,
    contenedores: 18,
    equipamiento: ['escobas', 'palas', 'recogedores', 'bolsas industriales']
  },
  {
    id: 'demo-ruta-3',
    nombre: 'Alcalde Díaz',
    tipo_servicio: 'recoleccion',
    descripcion: 'Ruta de recolección: Mercado de Alcalde Díaz y traslado a Cerro Patacón',
    hora_inicio: '19:00',
    hora_fin: '23:00',
    dias_operacion: ['lunes', 'miercoles', 'viernes'],
    estado: 'activa',
    paradas: [
      { id: 1, nombre: 'Estacionamiento Diana Morán 2066', latitud: 8.9720, longitud: -79.5380, orden: 1, completada: false, tipo: 'inicio' },
      { id: 2, nombre: 'Mercado de Alcalde Díaz', latitud: 9.1380, longitud: -79.4820, orden: 2, completada: false },
      { id: 3, nombre: 'Cerro Patacón', latitud: 9.0450, longitud: -79.4650, orden: 3, completada: false },
      { id: 4, nombre: 'Regreso Diana Morán', latitud: 8.9720, longitud: -79.5380, orden: 4, completada: false, tipo: 'regreso' }
    ],
    distancia_km: 22.4,
    tiempo_estimado_min: 240,
    contenedores: 20,
    equipamiento: ['escobas', 'palas', 'rastrillo', 'recogedores']
  },
  {
    id: 'demo-ruta-4',
    nombre: 'Mercado de Pacora',
    tipo_servicio: 'recoleccion',
    descripcion: 'Ruta de recolección: Mercado de Pacora y traslado a Cerro Patacón',
    hora_inicio: '19:00',
    hora_fin: '23:00',
    dias_operacion: ['martes', 'jueves', 'sabado'],
    estado: 'activa',
    paradas: [
      { id: 1, nombre: 'Estacionamiento Diana Morán 2066', latitud: 8.9720, longitud: -79.5380, orden: 1, completada: false, tipo: 'inicio' },
      { id: 2, nombre: 'Mercado de Pacora', latitud: 9.0768, longitud: -79.2905, orden: 2, completada: false },
      { id: 3, nombre: 'Cerro Patacón', latitud: 9.0450, longitud: -79.4650, orden: 3, completada: false },
      { id: 4, nombre: 'Regreso Diana Morán', latitud: 8.9720, longitud: -79.5380, orden: 4, completada: false, tipo: 'regreso' }
    ],
    distancia_km: 28.6,
    tiempo_estimado_min: 240,
    contenedores: 22,
    equipamiento: ['escobas', 'palas', 'recogedores', 'bolsas industriales']
  },
  {
    id: 'demo-ruta-5',
    nombre: 'Mi Pueblito',
    tipo_servicio: 'recoleccion',
    descripcion: 'Ruta de recolección: Mi Pueblito y traslado a Cerro Patacón',
    hora_inicio: '19:00',
    hora_fin: '23:00',
    dias_operacion: ['lunes', 'miercoles', 'viernes', 'sabado'],
    estado: 'activa',
    paradas: [
      { id: 1, nombre: 'Estacionamiento Diana Morán 2066', latitud: 8.9720, longitud: -79.5380, orden: 1, completada: false, tipo: 'inicio' },
      { id: 2, nombre: 'Mi Pueblito', latitud: 8.9650, longitud: -79.5520, orden: 2, completada: false },
      { id: 3, nombre: 'Cerro Patacón', latitud: 9.0450, longitud: -79.4650, orden: 3, completada: false },
      { id: 4, nombre: 'Regreso Diana Morán', latitud: 8.9720, longitud: -79.5380, orden: 4, completada: false, tipo: 'regreso' }
    ],
    distancia_km: 19.2,
    tiempo_estimado_min: 240,
    contenedores: 15,
    equipamiento: ['escobas', 'palas', 'recogedores']
  },
  {
    id: 'demo-ruta-6',
    nombre: 'Pueblo Nuevo',
    tipo_servicio: 'recoleccion',
    descripcion: 'Ruta de recolección: Mercado de Pueblo Nuevo y traslado a Cerro Patacón',
    hora_inicio: '19:00',
    hora_fin: '23:00',
    dias_operacion: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
    estado: 'activa',
    paradas: [
      { id: 1, nombre: 'Estacionamiento Diana Morán 2066', latitud: 8.9720, longitud: -79.5380, orden: 1, completada: false, tipo: 'inicio' },
      { id: 2, nombre: 'Mercado de Pueblo Nuevo', latitud: 8.9950, longitud: -79.5250, orden: 2, completada: false },
      { id: 3, nombre: 'Cerro Patacón', latitud: 9.0450, longitud: -79.4650, orden: 3, completada: false },
      { id: 4, nombre: 'Regreso Diana Morán', latitud: 8.9720, longitud: -79.5380, orden: 4, completada: false, tipo: 'regreso' }
    ],
    distancia_km: 17.3,
    tiempo_estimado_min: 240,
    contenedores: 19,
    equipamiento: ['escobas', 'palas', 'recogedores', 'bolsas industriales']
  }
];

export const DEMO_VEHICLES = [
  // ========== LIMPIEZA (9 vehículos) ==========
  
  // Buses de 25 pasajeros (2)
  {
    id: 'demo-vehicle-1',
    nombre: 'Bus Personal Limpieza BPL-001',
    placa: 'RMP-BPL01',
    marca: 'Mercedes-Benz',
    modelo: 'Sprinter 516',
    año: 2022,
    tipoServicio: 'limpieza',
    tipo_servicio: 'limpieza',
    tipoVehiculo: 'bus',
    tipo_vehiculo: 'bus',
    capacidad_pasajeros: 25,
    capacidad_carga: 1500,
    estado: 'En ruta',
    lat: 9.0050,
    lng: -79.5050,
    rutaAsignada: 'demo-ruta-1',
    ruta_id: 'demo-ruta-1',
    conductorAsignado: 'demo-conductor-1',
    conductor_id: 'demo-conductor-1',
    indiceRuta: 3,
    ultimaActualizacion: Date.now(),
    horaInicio: Date.now() - (2 * 60 * 60 * 1000 + 15 * 60 * 1000),
    direccion: 45,
    combustible: 85,
    historialPosiciones: [
      { lat: 9.0320, lng: -79.4750, timestamp: new Date(Date.now() - 3600000).toISOString() },
      { lat: 9.0180, lng: -79.4920, timestamp: new Date(Date.now() - 1800000).toISOString() },
      { lat: 9.0050, lng: -79.5050, timestamp: new Date().toISOString() }
    ]
  },
  {
    id: 'demo-vehicle-2',
    nombre: 'Bus Personal Limpieza BPL-002',
    placa: 'RMP-BPL02',
    marca: 'Mercedes-Benz',
    modelo: 'Sprinter 516',
    año: 2023,
    tipoServicio: 'limpieza',
    tipo_servicio: 'limpieza',
    tipoVehiculo: 'bus',
    tipo_vehiculo: 'bus',
    capacidad_pasajeros: 25,
    capacidad_carga: 1500,
    estado: 'Disponible',
    lat: 9.0550,
    lng: -79.4960,
    rutaAsignada: null,
    ruta_id: null,
    conductorAsignado: null,
    conductor_id: null,
    combustible: 92,
    direccion: 0
  },
  
  // Barredora (1)
  {
    id: 'demo-vehicle-3',
    nombre: 'Barredora Mecánica BAR-001',
    placa: 'RMP-BAR01',
    marca: 'Dulevo',
    modelo: '5000 Evolution',
    año: 2023,
    tipoServicio: 'limpieza',
    tipo_servicio: 'limpieza',
    tipoVehiculo: 'barredora',
    tipo_vehiculo: 'barredora',
    capacidad_carga: 3500,
    estado: 'En ruta',
    lat: 9.0320,
    lng: -79.4980,
    rutaAsignada: 'demo-ruta-2',
    ruta_id: 'demo-ruta-2',
    conductorAsignado: 'demo-conductor-3',
    conductor_id: 'demo-conductor-3',
    indiceRuta: 2,
    ultimaActualizacion: Date.now(),
    horaInicio: Date.now() - (1 * 60 * 60 * 1000 + 30 * 60 * 1000),
    combustible: 76,
    direccion: 90,
    historialPosiciones: [
      { lat: 9.0280, lng: -79.5020, timestamp: new Date(Date.now() - 2400000).toISOString() },
      { lat: 9.0300, lng: -79.5000, timestamp: new Date(Date.now() - 1200000).toISOString() },
      { lat: 9.0320, lng: -79.4980, timestamp: new Date().toISOString() }
    ]
  },
  
  // Pickups (2)
  {
    id: 'demo-vehicle-4',
    nombre: 'Pickup Limpieza PKL-001',
    placa: 'RMP-PKL01',
    marca: 'Ford',
    modelo: 'F-150 XLT',
    año: 2022,
    tipoServicio: 'limpieza',
    tipo_servicio: 'limpieza',
    tipoVehiculo: 'pickup',
    tipo_vehiculo: 'pickup',
    capacidad_carga: 1200,
    estado: 'Disponible',
    lat: 9.0800,
    lng: -79.5200,
    rutaAsignada: null,
    ruta_id: null,
    conductorAsignado: null,
    conductor_id: null,
    combustible: 88,
    direccion: 0
  },
  {
    id: 'demo-vehicle-5',
    nombre: 'Pickup Limpieza PKL-002',
    placa: 'RMP-PKL02',
    marca: 'Toyota',
    modelo: 'Hilux 4x4',
    año: 2023,
    tipoServicio: 'limpieza',
    tipo_servicio: 'limpieza',
    tipoVehiculo: 'pickup',
    tipo_vehiculo: 'pickup',
    capacidad_carga: 1000,
    estado: 'En ruta',
    lat: 8.9900,
    lng: -79.5050,
    rutaAsignada: 'demo-ruta-5',
    ruta_id: 'demo-ruta-5',
    conductorAsignado: 'demo-conductor-4',
    conductor_id: 'demo-conductor-4',
    indiceRuta: 2,
    paradaActual: 3,
    totalParadas: 4,
    ultimaActualizacion: Date.now(),
    horaInicio: Date.now() - (2 * 60 * 60 * 1000),
    direccion: 30,
    combustible: 68,
    historialPosiciones: [
      { lat: 8.9720, lng: -79.5380, timestamp: new Date(Date.now() - 7200000).toISOString() },
      { lat: 8.9535, lng: -79.5332, timestamp: new Date(Date.now() - 3600000).toISOString() },
      { lat: 8.9900, lng: -79.5050, timestamp: new Date().toISOString() }
    ]
  },
  
  // Cisternas (2)
  {
    id: 'demo-vehicle-6',
    nombre: 'Cisterna Limpieza CIS-001',
    placa: 'RMP-CIS01',
    marca: 'Isuzu',
    modelo: 'FVR 34P',
    año: 2022,
    tipoServicio: 'limpieza',
    tipo_servicio: 'limpieza',
    tipoVehiculo: 'cisterna',
    tipo_vehiculo: 'cisterna',
    capacidad_carga: 10000,
    capacidad_agua: 10000,
    estado: 'En ruta',
    lat: 8.9830,
    lng: -79.5190,
    rutaAsignada: 'demo-ruta-1',
    ruta_id: 'demo-ruta-1',
    conductorAsignado: 'demo-conductor-5',
    conductor_id: 'demo-conductor-5',
    indiceRuta: 1,
    ultimaActualizacion: Date.now(),
    horaInicio: Date.now() - (3 * 60 * 60 * 1000),
    combustible: 62,
    direccion: 180
  },
  {
    id: 'demo-vehicle-7',
    nombre: 'Cisterna Limpieza CIS-002',
    placa: 'RMP-CIS02',
    marca: 'Hino',
    modelo: '700 Series',
    año: 2023,
    tipoServicio: 'limpieza',
    tipo_servicio: 'limpieza',
    tipoVehiculo: 'cisterna',
    tipo_vehiculo: 'cisterna',
    capacidad_carga: 12000,
    capacidad_agua: 12000,
    estado: 'Disponible',
    lat: 9.0100,
    lng: -79.5300,
    rutaAsignada: null,
    ruta_id: null,
    conductorAsignado: null,
    conductor_id: null,
    combustible: 95,
    direccion: 0
  },
  
  // Camiones de carga liviana (2)
  {
    id: 'demo-vehicle-8',
    nombre: 'Camión Carga Liviana CCL-001',
    placa: 'RMP-CCL01',
    marca: 'Isuzu',
    modelo: 'NQR 75L',
    año: 2022,
    tipoServicio: 'limpieza',
    tipo_servicio: 'limpieza',
    tipoVehiculo: 'camion_carga',
    tipo_vehiculo: 'camion_carga',
    capacidad_carga: 5000,
    estado: 'Disponible',
    lat: 9.0650,
    lng: -79.5050,
    rutaAsignada: null,
    ruta_id: null,
    conductorAsignado: null,
    conductor_id: null,
    combustible: 78,
    direccion: 0
  },
  {
    id: 'demo-vehicle-9',
    nombre: 'Camión Carga Liviana CCL-002',
    placa: 'RMP-CCL02',
    marca: 'Hino',
    modelo: '300 Series',
    año: 2023,
    tipoServicio: 'limpieza',
    tipo_servicio: 'limpieza',
    tipoVehiculo: 'camion_carga',
    tipo_vehiculo: 'camion_carga',
    capacidad_carga: 4500,
    estado: 'En mantenimiento',
    lat: 9.0420,
    lng: -79.5280,
    rutaAsignada: null,
    ruta_id: null,
    conductorAsignado: null,
    conductor_id: null,
    combustible: 45,
    direccion: 0
  },
  
  // ========== RECOLECCIÓN (4 vehículos) ==========
  
  // Compactadores (4)
  {
    id: 'demo-vehicle-10',
    nombre: 'Compactador Recolección CMP-001',
    placa: 'RMP-CMP01',
    marca: 'Mercedes-Benz',
    modelo: 'Econic 2630',
    año: 2023,
    tipoServicio: 'recoleccion',
    tipo_servicio: 'recoleccion',
    tipoVehiculo: 'compactador',
    tipo_vehiculo: 'compactador',
    capacidad_carga: 12000,
    capacidad_volumen: 16,
    estado: 'En ruta',
    lat: 9.0085,
    lng: -79.5015,
    rutaAsignada: 'demo-ruta-3',
    ruta_id: 'demo-ruta-3',
    conductorAsignado: 'demo-conductor-6',
    conductor_id: 'demo-conductor-6',
    indiceRuta: 3,
    paradaActual: 4,
    totalParadas: 4,
    ultimaActualizacion: Date.now(),
    horaInicio: Date.now() - (4 * 60 * 60 * 1000),
    direccion: 225,
    pesoAcumulado: 4800,
    contenedoresRecogidos: 24,
    combustible: 58,
    historialPosiciones: [
      { lat: 8.9720, lng: -79.5380, timestamp: new Date(Date.now() - 12000000).toISOString() },
      { lat: 8.9670, lng: -79.5350, timestamp: new Date(Date.now() - 9000000).toISOString() },
      { lat: 9.0450, lng: -79.4650, timestamp: new Date(Date.now() - 3000000).toISOString() },
      { lat: 9.0085, lng: -79.5015, timestamp: new Date().toISOString() }
    ]
  },
  {
    id: 'demo-vehicle-11',
    nombre: 'Compactador Recolección CMP-002',
    placa: 'RMP-CMP02',
    marca: 'Volvo',
    modelo: 'FE 280',
    año: 2022,
    tipoServicio: 'recoleccion',
    tipo_servicio: 'recoleccion',
    tipoVehiculo: 'compactador',
    tipo_vehiculo: 'compactador',
    capacidad_carga: 14000,
    capacidad_volumen: 18,
    estado: 'Disponible',
    lat: 9.0250,
    lng: -79.5100,
    rutaAsignada: null,
    ruta_id: null,
    conductorAsignado: null,
    conductor_id: null,
    combustible: 82,
    direccion: 0
  },
  {
    id: 'demo-vehicle-12',
    nombre: 'Compactador Recolección CMP-003',
    placa: 'RMP-CMP03',
    marca: 'Hino',
    modelo: '500 Series',
    año: 2023,
    tipoServicio: 'recoleccion',
    tipo_servicio: 'recoleccion',
    tipoVehiculo: 'compactador',
    tipo_vehiculo: 'compactador',
    capacidad_carga: 13000,
    capacidad_volumen: 17,
    estado: 'En ruta',
    lat: 8.9680,
    lng: -79.5420,
    rutaAsignada: 'demo-ruta-2',
    ruta_id: 'demo-ruta-2',
    conductorAsignado: 'demo-conductor-7',
    conductor_id: 'demo-conductor-7',
    indiceRuta: 1,
    paradaActual: 2,
    totalParadas: 4,
    ultimaActualizacion: Date.now(),
    horaInicio: Date.now() - (1 * 60 * 60 * 1000 + 15 * 60 * 1000),
    direccion: 135,
    pesoAcumulado: 2100,
    contenedoresRecogidos: 8,
    combustible: 71,
    historialPosiciones: [
      { lat: 8.9750, lng: -79.5380, timestamp: new Date(Date.now() - 4500000).toISOString() },
      { lat: 8.9680, lng: -79.5420, timestamp: new Date().toISOString() }
    ]
  },
  {
    id: 'demo-vehicle-13',
    nombre: 'Compactador Recolección CMP-004',
    placa: 'RMP-CMP04',
    marca: 'Freightliner',
    modelo: 'M2 106',
    año: 2022,
    tipoServicio: 'recoleccion',
    tipo_servicio: 'recoleccion',
    tipoVehiculo: 'compactador',
    tipo_vehiculo: 'compactador',
    capacidad_carga: 15000,
    capacidad_volumen: 20,
    estado: 'Disponible',
    lat: 9.0580,
    lng: -79.4920,
    rutaAsignada: null,
    ruta_id: null,
    conductorAsignado: null,
    conductor_id: null,
    combustible: 90,
    direccion: 0
  }
];

export const DEMO_PERSONNEL = [
  // 3 Supervisores
  {
    id: 'demo-supervisor-1',
    nombre: 'Patricia',
    apellido: 'Mendoza',
    cargo: 'Supervisor de Ruta',
    departamento: 'Recolección',
    telefono: '+507 6901-2345',
    email: 'patricia.mendoza@rmp.com',
    fecha_contratacion: '2019-11-05',
    estado: 'activo',
    certificaciones: ['Manejo de Personal', 'Seguridad Industrial']
  },
  {
    id: 'demo-supervisor-2',
    nombre: 'Ricardo',
    apellido: 'Domínguez',
    cargo: 'Supervisor de Ruta',
    departamento: 'Recolección',
    telefono: '+507 6902-3456',
    email: 'ricardo.dominguez@rmp.com',
    fecha_contratacion: '2020-02-18',
    estado: 'activo',
    certificaciones: ['Gestión Operativa', 'Seguridad Industrial']
  },
  {
    id: 'demo-supervisor-3',
    nombre: 'Sofía',
    apellido: 'Ramírez',
    cargo: 'Supervisor de Ruta',
    departamento: 'Recolección',
    telefono: '+507 6903-4567',
    email: 'sofia.ramirez@rmp.com',
    fecha_contratacion: '2020-08-10',
    estado: 'activo',
    certificaciones: ['Coordinación Logística', 'Manejo de Personal']
  },
  
  // 3 Conductores
  {
    id: 'demo-conductor-1',
    nombre: 'Carlos Rodríguez',
    apellido: 'Mendoza',
    cargo: 'Conductor',
    departamento: 'Recolección',
    telefono: '+507 6123-4567',
    email: 'carlos.rodriguez@rmp.com',
    fecha_contratacion: '2021-03-15',
    licencia: 'A-123456',
    estado: 'activo',
    vehiculo_asignado: 'demo-vehicle-12'
  },
  {
    id: 'demo-conductor-2',
    nombre: 'María González',
    apellido: 'Pérez',
    cargo: 'Conductor',
    departamento: 'Recolección',
    telefono: '+507 6234-5678',
    email: 'maria.gonzalez@rmp.com',
    fecha_contratacion: '2020-11-20',
    licencia: 'A-234567',
    estado: 'activo',
    vehiculo_asignado: 'demo-vehicle-13'
  },
  {
    id: 'demo-conductor-3',
    nombre: 'Luis Hernández',
    apellido: 'Vargas',
    cargo: 'Conductor',
    departamento: 'Recolección',
    telefono: '+507 6678-9012',
    email: 'luis.hernandez@rmp.com',
    fecha_contratacion: '2020-03-15',
    licencia: 'A-678901',
    estado: 'activo',
    vehiculo_asignado: 'demo-vehicle-10'
  },
  
  // 10 Recolectores
  {
    id: 'demo-recolector-1',
    nombre: 'Miguel Ángel',
    apellido: 'Sánchez',
    cargo: 'Recolector',
    departamento: 'Recolección',
    telefono: '+507 6789-0123',
    email: 'miguel.sanchez@rmp.com',
    fecha_contratacion: '2021-06-10',
    estado: 'activo'
  },
  {
    id: 'demo-recolector-2',
    nombre: 'Fernando',
    apellido: 'Jiménez',
    cargo: 'Recolector',
    departamento: 'Recolección',
    telefono: '+507 6890-1234',
    email: 'fernando.jimenez@rmp.com',
    fecha_contratacion: '2021-08-22',
    estado: 'activo'
  },
  {
    id: 'demo-recolector-3',
    nombre: 'Diego',
    apellido: 'Castro',
    cargo: 'Recolector',
    departamento: 'Recolección',
    telefono: '+507 6890-2345',
    email: 'diego.castro@rmp.com',
    fecha_contratacion: '2022-01-15',
    estado: 'activo'
  },
  {
    id: 'demo-recolector-4',
    nombre: 'Andrés',
    apellido: 'Moreno',
    cargo: 'Recolector',
    departamento: 'Recolección',
    telefono: '+507 6890-3456',
    email: 'andres.moreno@rmp.com',
    fecha_contratacion: '2022-03-20',
    estado: 'activo'
  },
  {
    id: 'demo-recolector-5',
    nombre: 'Gabriel',
    apellido: 'Torres',
    cargo: 'Recolector',
    departamento: 'Recolección',
    telefono: '+507 6890-4567',
    email: 'gabriel.torres@rmp.com',
    fecha_contratacion: '2022-05-12',
    estado: 'activo'
  },
  {
    id: 'demo-recolector-6',
    nombre: 'Javier',
    apellido: 'Díaz',
    cargo: 'Recolector',
    departamento: 'Recolección',
    telefono: '+507 6890-5678',
    email: 'javier.diaz@rmp.com',
    fecha_contratacion: '2022-07-08',
    estado: 'activo'
  },
  {
    id: 'demo-recolector-7',
    nombre: 'Oscar',
    apellido: 'Vega',
    cargo: 'Recolector',
    departamento: 'Recolección',
    telefono: '+507 6890-6789',
    email: 'oscar.vega@rmp.com',
    fecha_contratacion: '2022-09-14',
    estado: 'activo'
  },
  {
    id: 'demo-recolector-8',
    nombre: 'Manuel',
    apellido: 'Ortiz',
    cargo: 'Recolector',
    departamento: 'Recolección',
    telefono: '+507 6890-7890',
    email: 'manuel.ortiz@rmp.com',
    fecha_contratacion: '2023-01-10',
    estado: 'activo'
  },
  {
    id: 'demo-recolector-9',
    nombre: 'Raúl',
    apellido: 'Gutiérrez',
    cargo: 'Recolector',
    departamento: 'Recolección',
    telefono: '+507 6890-8901',
    email: 'raul.gutierrez@rmp.com',
    fecha_contratacion: '2023-03-15',
    estado: 'activo'
  },
  {
    id: 'demo-recolector-10',
    nombre: 'Jorge',
    apellido: 'Herrera',
    cargo: 'Recolector',
    departamento: 'Recolección',
    telefono: '+507 6890-9012',
    email: 'jorge.herrera@rmp.com',
    fecha_contratacion: '2023-05-20',
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
    fecha: new Date(Date.now() - 600000).toISOString(), // Hace 10 minutos
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
    fecha: new Date(Date.now() - 1800000).toISOString(), // Hace 30 minutos
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
    fecha: new Date(Date.now() - 3600000).toISOString(), // Hace 1 hora
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
    descripcion: 'Parada "Casa de la Municipalidad" completada',
    vehiculo: 'RMP-F01',
    conductor: 'José Martínez',
    timestamp: new Date(Date.now() - 300000).toISOString(), // Hace 5 min
    ruta: 'Fumigación Edificios Municipales'
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
    descripcion: 'Ruta "Fumigación Edificios Municipales" iniciada',
    vehiculo: 'RMP-F01',
    conductor: 'José Martínez',
    timestamp: new Date(Date.now() - 5400000).toISOString(), // Hace 1.5 horas
    ruta: 'Fumigación Edificios Municipales'
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

// Áreas demo para limpieza
export const DEMO_AREAS = [
  { id: 'demo-area-1', nombre: 'Zona de Carga y Descarga', lugar_id: 'demo-lugar-1', activo: true },
  { id: 'demo-area-2', nombre: 'Área de Venta Principal', lugar_id: 'demo-lugar-1', activo: true },
  { id: 'demo-area-3', nombre: 'Muelle de Pescadores', lugar_id: 'demo-lugar-2', activo: true },
  { id: 'demo-area-4', nombre: 'Zona de Limpieza de Pescado', lugar_id: 'demo-lugar-2', activo: true },
  { id: 'demo-area-5', nombre: 'Plaza Central', lugar_id: 'demo-lugar-3', activo: true },
  { id: 'demo-area-6', nombre: 'Estacionamiento', lugar_id: 'demo-lugar-3', activo: true },
  { id: 'demo-area-7', nombre: 'Entrada Principal', lugar_id: 'demo-lugar-4', activo: true },
  { id: 'demo-area-8', nombre: 'Patio Interior', lugar_id: 'demo-lugar-4', activo: true },
  { id: 'demo-area-9', nombre: 'Zona de Frutas y Verduras', lugar_id: 'demo-lugar-5', activo: true },
  { id: 'demo-area-10', nombre: 'Área de Carnes', lugar_id: 'demo-lugar-5', activo: true }
];

// Assignments de limpieza demo con estructura completa
export const DEMO_CLEANING_ASSIGNMENTS = [
  // Mercado de Alcalde Díaz
  {
    id: 'demo-cleaning-1',
    lugar_id: 'demo-lugar-1',
    area_id: 'demo-area-1',
    lugar: { id: 'demo-lugar-1', nombre: 'Mercado de Alcalde Díaz' },
    area: { id: 'demo-area-1', nombre: 'Zona de Carga y Descarga' },
    fecha: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Ayer
    hora: '06:00',
    estado: 'completado',
    notas: 'Limpieza completa realizada. Todas las áreas fueron atendidas. Recolección de 250kg de residuos.',
    fotos: [
      { id: 'demo-photo-1', etapa: 'antes', url: 'https://via.placeholder.com/800x600/808080/FFFFFF?text=Antes+-+Mercado+Alcalde+Diaz', file_name: 'antes_1.jpg' },
      { id: 'demo-photo-2', etapa: 'despues', url: 'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=Despues+-+Area+Limpia', file_name: 'despues_1.jpg' }
    ],
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'demo-cleaning-2',
    lugar_id: 'demo-lugar-1',
    area_id: 'demo-area-2',
    lugar: { id: 'demo-lugar-1', nombre: 'Mercado de Alcalde Díaz' },
    area: { id: 'demo-area-2', nombre: 'Área de Venta Principal' },
    fecha: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Hace 8 días
    hora: '06:00',
    estado: 'completado',
    notas: 'Recolección de residuos sólidos. Coordinación con vendedores.',
    fotos: [
      { id: 'demo-photo-3', etapa: 'antes', url: 'https://via.placeholder.com/800x600/808080/FFFFFF?text=Antes+-+Zona+de+Ventas', file_name: 'antes_2.jpg' },
      { id: 'demo-photo-4', etapa: 'durante', url: 'https://via.placeholder.com/800x600/FFA726/FFFFFF?text=Durante+-+Limpieza', file_name: 'durante_2.jpg' },
      { id: 'demo-photo-5', etapa: 'despues', url: 'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=Despues+-+Limpio', file_name: 'despues_2.jpg' }
    ],
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  },

  // Mercado del Marisco
  {
    id: 'demo-cleaning-3',
    lugar_id: 'demo-lugar-2',
    area_id: 'demo-area-3',
    lugar: { id: 'demo-lugar-2', nombre: 'Mercado del Marisco' },
    area: { id: 'demo-area-3', nombre: 'Muelle de Pescadores' },
    fecha: new Date().toISOString().split('T')[0], // Hoy
    hora: '05:30',
    estado: 'completado',
    notas: 'Limpieza especial por alta actividad del mercado. Residuos orgánicos gestionados. 380kg recolectados.',
    fotos: [
      { id: 'demo-photo-6', etapa: 'antes', url: 'https://via.placeholder.com/800x600/808080/FFFFFF?text=Antes+-+Muelle+Pescadores', file_name: 'antes_3.jpg' },
      { id: 'demo-photo-7', etapa: 'durante', url: 'https://via.placeholder.com/800x600/FFA726/FFFFFF?text=Durante+-+Proceso', file_name: 'durante_3.jpg' },
      { id: 'demo-photo-8', etapa: 'despues', url: 'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=Despues+-+Completo', file_name: 'despues_3.jpg' }
    ],
    created_at: new Date().toISOString()
  },
  {
    id: 'demo-cleaning-4',
    lugar_id: 'demo-lugar-2',
    area_id: 'demo-area-4',
    lugar: { id: 'demo-lugar-2', nombre: 'Mercado del Marisco' },
    area: { id: 'demo-area-4', nombre: 'Zona de Limpieza de Pescado' },
    fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Hace 2 días
    hora: '05:30',
    estado: 'completado',
    notas: 'Recolección rutinaria de residuos del mercado. Limpieza profunda de área de procesamiento.',
    fotos: [
      { id: 'demo-photo-9', etapa: 'antes', url: 'https://via.placeholder.com/800x600/808080/FFFFFF?text=Antes+-+Zona+Limpieza', file_name: 'antes_4.jpg' },
      { id: 'demo-photo-10', etapa: 'despues', url: 'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=Despues+-+Sanitizado', file_name: 'despues_4.jpg' }
    ],
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },

  // Mercado de Pacora
  {
    id: 'demo-cleaning-5',
    lugar_id: 'demo-lugar-3',
    area_id: 'demo-area-5',
    lugar: { id: 'demo-lugar-3', nombre: 'Mercado de Pacora' },
    area: { id: 'demo-area-5', nombre: 'Plaza Central' },
    fecha: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Ayer
    hora: '07:00',
    estado: 'completado',
    notas: 'Limpieza general del área del mercado. Barrido y lavado de plaza.',
    fotos: [
      { id: 'demo-photo-11', etapa: 'antes', url: 'https://via.placeholder.com/800x600/808080/FFFFFF?text=Antes+-+Plaza+Pacora', file_name: 'antes_5.jpg' },
      { id: 'demo-photo-12', etapa: 'durante', url: 'https://via.placeholder.com/800x600/FFA726/FFFFFF?text=Durante+-+Lavado', file_name: 'durante_5.jpg' },
      { id: 'demo-photo-13', etapa: 'despues', url: 'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=Despues+-+Plaza+Limpia', file_name: 'despues_5.jpg' }
    ],
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'demo-cleaning-6',
    lugar_id: 'demo-lugar-3',
    area_id: 'demo-area-6',
    lugar: { id: 'demo-lugar-3', nombre: 'Mercado de Pacora' },
    area: { id: 'demo-area-6', nombre: 'Estacionamiento' },
    fecha: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Hace 7 días
    hora: '07:00',
    estado: 'completado',
    notas: 'Manejo de residuos del mercado semanal. Limpieza de estacionamiento.',
    fotos: [
      { id: 'demo-photo-14', etapa: 'antes', url: 'https://via.placeholder.com/800x600/808080/FFFFFF?text=Antes+-+Estacionamiento', file_name: 'antes_6.jpg' },
      { id: 'demo-photo-15', etapa: 'despues', url: 'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=Despues+-+Ordenado', file_name: 'despues_6.jpg' }
    ],
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },

  // San Felipe Neri
  {
    id: 'demo-cleaning-7',
    lugar_id: 'demo-lugar-4',
    area_id: 'demo-area-7',
    lugar: { id: 'demo-lugar-4', nombre: 'Mercado San Felipe Neri' },
    area: { id: 'demo-area-7', nombre: 'Entrada Principal' },
    fecha: new Date().toISOString().split('T')[0], // Hoy
    hora: '06:30',
    estado: 'en_progreso',
    notas: 'Limpieza en curso en el Casco Antiguo. Preservación del patrimonio histórico.',
    fotos: [
      { id: 'demo-photo-16', etapa: 'antes', url: 'https://via.placeholder.com/800x600/808080/FFFFFF?text=Antes+-+Entrada+Principal', file_name: 'antes_7.jpg' },
      { id: 'demo-photo-17', etapa: 'durante', url: 'https://via.placeholder.com/800x600/FFA726/FFFFFF?text=Durante+-+En+Proceso', file_name: 'durante_7.jpg' }
    ],
    created_at: new Date().toISOString()
  },
  {
    id: 'demo-cleaning-8',
    lugar_id: 'demo-lugar-4',
    area_id: 'demo-area-8',
    lugar: { id: 'demo-lugar-4', nombre: 'Mercado San Felipe Neri' },
    area: { id: 'demo-area-8', nombre: 'Patio Interior' },
    fecha: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Hace 3 días
    hora: '06:30',
    estado: 'completado',
    notas: 'Limpieza histórica preservando el entorno. Uso de productos eco-amigables.',
    fotos: [
      { id: 'demo-photo-18', etapa: 'antes', url: 'https://via.placeholder.com/800x600/808080/FFFFFF?text=Antes+-+Patio+Interior', file_name: 'antes_8.jpg' },
      { id: 'demo-photo-19', etapa: 'durante', url: 'https://via.placeholder.com/800x600/FFA726/FFFFFF?text=Durante+-+Limpieza+Detallada', file_name: 'durante_8.jpg' },
      { id: 'demo-photo-20', etapa: 'despues', url: 'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=Despues+-+Restaurado', file_name: 'despues_8.jpg' }
    ],
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },

  // Pueblo Nuevo
  {
    id: 'demo-cleaning-9',
    lugar_id: 'demo-lugar-5',
    area_id: 'demo-area-9',
    lugar: { id: 'demo-lugar-5', nombre: 'Mercado de Pueblo Nuevo' },
    area: { id: 'demo-area-9', nombre: 'Zona de Frutas y Verduras' },
    fecha: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Mañana
    hora: '06:00',
    estado: 'pendiente',
    notas: 'Limpieza programada para mañana. Coordinación con vendedores confirmada.',
    fotos: [],
    created_at: new Date().toISOString()
  },
  {
    id: 'demo-cleaning-10',
    lugar_id: 'demo-lugar-5',
    area_id: 'demo-area-10',
    lugar: { id: 'demo-lugar-5', nombre: 'Mercado de Pueblo Nuevo' },
    area: { id: 'demo-area-10', nombre: 'Área de Carnes' },
    fecha: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Hace 4 días
    hora: '06:00',
    estado: 'completado',
    notas: 'Recolección eficiente completada sin incidentes. Sanitización profunda realizada. 195kg procesados.',
    fotos: [
      { id: 'demo-photo-21', etapa: 'antes', url: 'https://via.placeholder.com/800x600/808080/FFFFFF?text=Antes+-+Area+Carnes', file_name: 'antes_10.jpg' },
      { id: 'demo-photo-22', etapa: 'durante', url: 'https://via.placeholder.com/800x600/FFA726/FFFFFF?text=Durante+-+Sanitizacion', file_name: 'durante_10.jpg' },
      { id: 'demo-photo-23', etapa: 'despues', url: 'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=Despues+-+Sanitizado', file_name: 'despues_10.jpg' }
    ],
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
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
    vehiculo_id: 'demo-vehicle-10',
    conductor_id: 'demo-conductor-6',
    fecha: getMonday().toISOString().split('T')[0],
    dias_semana: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
    hora_inicio: '06:00',
    hora_fin: '18:00',
    estado: 'programada',
    viajes_diarios: 2,
    observaciones: 'Recolección y transporte de desechos dentro del horario diurno.',
    ruta: DEMO_ROUTES[0],
    conductor_nombre: 'Luis Hernández Vargas',
    vehiculo: { placa: 'RMP-CMP01', nombre: 'Compactador Recolección CMP-001' }
  },
  {
    id: 'demo-schedule-2',
    ruta_id: 'demo-ruta-2',
    vehiculo_id: 'demo-vehicle-11',
    conductor_id: 'demo-conductor-7',
    fecha: getMonday().toISOString().split('T')[0],
    dias_semana: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'],
    hora_inicio: '23:00',
    hora_fin: '06:00',
    estado: 'programada',
    viajes_diarios: 1,
    observaciones: 'Se realiza de noche para no interferir con la operación del mercado.',
    ruta: DEMO_ROUTES[1],
    conductor_nombre: 'Eduardo Pérez Santos',
    vehiculo: { placa: 'RMP-CMP02', nombre: 'Compactador Recolección CMP-002' }
  },
  {
    id: 'demo-schedule-3',
    ruta_id: 'demo-ruta-3',
    vehiculo_id: 'demo-vehicle-12',
    conductor_id: 'demo-conductor-1',
    fecha: getMonday().toISOString().split('T')[0],
    dias_semana: ['lunes', 'miercoles', 'viernes'],
    hora_inicio: '19:00',
    hora_fin: '23:00',
    estado: 'programada',
    viajes_diarios: 1,
    observaciones: 'Fuera del horario de atención al público.',
    ruta: DEMO_ROUTES[2],
    conductor_nombre: 'Carlos Rodríguez Mendoza',
    vehiculo: { placa: 'RMP-CMP03', nombre: 'Compactador Recolección CMP-003' }
  },
  {
    id: 'demo-schedule-4',
    ruta_id: 'demo-ruta-6',
    vehiculo_id: 'demo-vehicle-13',
    conductor_id: 'demo-conductor-2',
    fecha: getMonday().toISOString().split('T')[0],
    dias_semana: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
    hora_inicio: '19:00',
    hora_fin: '23:00',
    estado: 'programada',
    viajes_diarios: 1,
    observaciones: 'Servicio nocturno para garantizar limpieza de áreas comunes.',
    ruta: DEMO_ROUTES[5],
    conductor_nombre: 'María González Pérez',
    vehiculo: { placa: 'RMP-CMP04', nombre: 'Compactador Recolección CMP-004' }
  },
  {
    id: 'demo-schedule-5',
    ruta_id: 'demo-ruta-4',
    vehiculo_id: 'demo-vehicle-1',
    conductor_id: 'demo-conductor-3',
    fecha: getMonday().toISOString().split('T')[0],
    dias_semana: ['martes', 'jueves', 'sabado'],
    hora_inicio: '19:00',
    hora_fin: '23:00',
    estado: 'programada',
    viajes_diarios: 1,
    observaciones: 'Recolección nocturna, incluye barrido de zona externa.',
    ruta: DEMO_ROUTES[3],
    conductor_nombre: 'José Martínez López',
    vehiculo: { placa: 'RMP-BPL01', nombre: 'Bus Personal Limpieza BPL-001' }
  },
  {
    id: 'demo-schedule-6',
    ruta_id: 'demo-ruta-5',
    vehiculo_id: 'demo-vehicle-5',
    conductor_id: 'demo-conductor-4',
    fecha: getMonday().toISOString().split('T')[0],
    dias_semana: ['lunes', 'miercoles', 'viernes', 'sabado'],
    hora_inicio: '19:00',
    hora_fin: '23:00',
    estado: 'programada',
    viajes_diarios: 1,
    observaciones: 'Servicio fuera del horario público, manejo de residuos turísticos.',
    ruta: DEMO_ROUTES[4],
    conductor_nombre: 'Roberto Silva Morales',
    vehiculo: { placa: 'RMP-PKL02', nombre: 'Pickup Limpieza PKL-002' }
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
    ruta_nombre: 'Fumigación Edificios Municipales',
    tipo_ruta: 'fumigacion',
    vehiculo_id: 'demo-vehicle-3',
    vehiculo_placa: 'RMP-F01',
    conductor_id: 'demo-conductor-3',
    conductor_nombre: 'José Martínez López',
    fecha_completacion: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    hora_inicio: '05:00',
    hora_fin: '11:30',
    paradas_completadas: [
      { direccion: 'Almacén Central del MINSA', orden: 1, hora_completada: '05:20', area_m2: 850 },
      { direccion: 'Casa de la Municipalidad', orden: 2, hora_completada: '06:15', area_m2: 620 },
      { direccion: 'Casa Góngora', orden: 3, hora_completada: '07:30', area_m2: 450 },
      { direccion: 'Centro de Recaudación Magna Corp.', orden: 4, hora_completada: '08:45', area_m2: 780 },
      { direccion: 'Complejo Turístico Mi Pueblito', orden: 5, hora_completada: '10:00', area_m2: 920 },
      { direccion: 'Edificio Hatillo', orden: 6, hora_completada: '11:15', area_m2: 680 }
    ],
    area_fumigada_m2: 4300,
    distancia_recorrida_km: 8.2,
    producto_usado_lts: 62,
    observaciones: 'Fumigación preventiva de edificios municipales completada. Todas las áreas administrativas atendidas. Condiciones climáticas favorables.',
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
