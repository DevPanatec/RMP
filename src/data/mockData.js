export const appData = {
  usuarios: [
    {"id": 1, "usuario": "admin", "password": "admin123", "tipo": "admin", "nombre": "Administrador"},
    {"id": 2, "usuario": "empresa1", "password": "emp123", "tipo": "enterprise", "nombre": "Empresa Demo"},
    {"id": 3, "usuario": "conductor1", "password": "cond123", "tipo": "conductor", "nombre": "Juan Pérez", "camionAsignado": "TR-001"}
  ],
  camiones: [
    {
      "id": "TR-001", 
      "conductor": "Juan Pérez", 
      "lat": 8.983333, 
      "lng": -79.516670, 
      "estado": "En ruta", 
      "rutaAsignada": "Ruta Centro",
      "velocidad": 25, // km/h
      "combustible": 75, // %
      "ultimaActualizacion": new Date().toISOString(),
      "paradaActual": 3,
      "totalParadas": 10,
      "pesoAcumulado": 450, // kg
      "direccion": 45, // grados
      "historialPosiciones": [
        { lat: 8.980000, lng: -79.520000, timestamp: new Date(Date.now() - 10 * 60000).toISOString() },
        { lat: 8.981000, lng: -79.518000, timestamp: new Date(Date.now() - 8 * 60000).toISOString() },
        { lat: 8.982000, lng: -79.517000, timestamp: new Date(Date.now() - 5 * 60000).toISOString() },
        { lat: 8.983333, lng: -79.516670, timestamp: new Date().toISOString() }
      ]
    },
    {
      "id": "TR-002", 
      "conductor": "María García", 
      "lat": 8.993333, 
      "lng": -79.526670, 
      "estado": "Disponible", 
      "rutaAsignada": null,
      "velocidad": 0,
      "combustible": 90,
      "ultimaActualizacion": new Date().toISOString(),
      "paradaActual": 0,
      "totalParadas": 0,
      "pesoAcumulado": 0,
      "direccion": 0,
      "historialPosiciones": [
        { lat: 8.993333, lng: -79.526670, timestamp: new Date().toISOString() }
      ]
    },
    {
      "id": "TR-003", 
      "conductor": "Carlos López", 
      "lat": 8.973333, 
      "lng": -79.506670, 
      "estado": "En ruta", 
      "rutaAsignada": "Ruta Norte",
      "velocidad": 30,
      "combustible": 60,
      "ultimaActualizacion": new Date().toISOString(),
      "paradaActual": 7,
      "totalParadas": 10,
      "pesoAcumulado": 680,
      "direccion": 120,
      "historialPosiciones": [
        { lat: 8.970000, lng: -79.510000, timestamp: new Date(Date.now() - 15 * 60000).toISOString() },
        { lat: 8.971000, lng: -79.508000, timestamp: new Date(Date.now() - 12 * 60000).toISOString() },
        { lat: 8.972000, lng: -79.507000, timestamp: new Date(Date.now() - 8 * 60000).toISOString() },
        { lat: 8.973333, lng: -79.506670, timestamp: new Date().toISOString() }
      ]
    },
    {
      "id": "TR-004", 
      "conductor": "Ana Martín", 
      "lat": 8.963333, 
      "lng": -79.536670, 
      "estado": "Disponible", 
      "rutaAsignada": null,
      "velocidad": 0,
      "combustible": 85,
      "ultimaActualizacion": new Date().toISOString(),
      "paradaActual": 0,
      "totalParadas": 0,
      "pesoAcumulado": 0,
      "direccion": 0,
      "historialPosiciones": [
        { lat: 8.963333, lng: -79.536670, timestamp: new Date().toISOString() }
      ]
    },
    {
      "id": "TR-005", 
      "conductor": "Luis Rodríguez", 
      "lat": 8.953333, 
      "lng": -79.546670, 
      "estado": "En mantenimiento", 
      "rutaAsignada": null,
      "velocidad": 0,
      "combustible": 40,
      "ultimaActualizacion": new Date().toISOString(),
      "paradaActual": 0,
      "totalParadas": 0,
      "pesoAcumulado": 0,
      "direccion": 0,
      "historialPosiciones": [
        { lat: 8.953333, lng: -79.546670, timestamp: new Date().toISOString() }
      ]
    }
  ],
  rutas: [
    {
      "id": "ruta-centro", 
      "nombre": "Ruta Centro", 
      "paradas": [
        { 
          nombre: "Plaza Catedral", 
          lat: 8.952574, 
          lng: -79.534755, 
          estimado: "08:00",
          direccion: "Plaza de la Catedral, Casco Viejo",
          tipo: "turistico",
          pesoRecolectado: 45,
          horaLlegada: "08:02",
          horaSalida: "08:15"
        },
        { 
          nombre: "Av. Central", 
          lat: 8.954574, 
          lng: -79.532755, 
          estimado: "08:30",
          direccion: "Avenida Central, Centro",
          tipo: "comercial",
          pesoRecolectado: 38,
          horaLlegada: "08:28",
          horaSalida: "08:40"
        },
        { 
          nombre: "Plaza Francia", 
          lat: 8.956574, 
          lng: -79.530755, 
          estimado: "09:00",
          direccion: "Plaza Francia, Casco Viejo",
          tipo: "turistico",
          pesoRecolectado: 52,
          horaLlegada: "08:58",
          horaSalida: "09:12"
        },
        { 
          nombre: "Mercado Central", 
          lat: 8.958574, 
          lng: -79.528755, 
          estimado: "09:30",
          direccion: "Mercado Central, Santa Ana",
          tipo: "comercial",
          pesoRecolectado: 78,
          horaLlegada: "09:25",
          horaSalida: "09:45"
        },
        { 
          nombre: "Hospital Santo Tomás", 
          lat: 8.960574, 
          lng: -79.526755, 
          estimado: "10:00",
          direccion: "Hospital Santo Tomás, Ancón",
          tipo: "residencial",
          pesoRecolectado: 42,
          horaLlegada: "09:58",
          horaSalida: "10:08"
        },
        { 
          nombre: "Universidad de Panamá", 
          lat: 8.962574, 
          lng: -79.524755, 
          estimado: "10:30",
          direccion: "Universidad de Panamá, Octavio Méndez Pereira",
          tipo: "residencial",
          pesoRecolectado: 65,
          horaLlegada: "10:32",
          horaSalida: "10:48"
        },
        { 
          nombre: "Estadio Nacional", 
          lat: 8.964574, 
          lng: -79.522755, 
          estimado: "11:00",
          direccion: "Estadio Nacional Rod Carew, Parque Omar",
          tipo: "comercial",
          pesoRecolectado: 35,
          horaLlegada: "11:05",
          horaSalida: "11:15"
        },
        { 
          nombre: "Albrook Mall", 
          lat: 8.966574, 
          lng: -79.520755, 
          estimado: "11:30",
          direccion: "Albrook Mall, Albrook",
          tipo: "comercial",
          pesoRecolectado: 89,
          horaLlegada: "11:28",
          horaSalida: "11:50"
        },
        { 
          nombre: "Corredor Sur", 
          lat: 8.968574, 
          lng: -79.518755, 
          estimado: "12:00",
          direccion: "Corredor Sur, vía hacia Tocumen",
          tipo: "residencial",
          pesoRecolectado: 56,
          horaLlegada: "12:02",
          horaSalida: "12:18"
        },
        { 
          nombre: "Relleno Sanitario", 
          lat: 8.970574, 
          lng: -79.516755, 
          estimado: "12:30",
          direccion: "Relleno Sanitario Cerro Patacón",
          tipo: "inicio",
          pesoRecolectado: 0,
          horaLlegada: "12:35",
          horaSalida: "12:45"
        }
      ],
      "distanciaTotal": 25.5,
      "tiempoEstimado": 270
    },
    {
      "id": "ruta-2", 
      "nombre": "Ruta Norte", 
      "paradas": [
        { nombre: "Río Abajo", lat: 9.000000, lng: -79.500000, estimado: "08:00" },
        { nombre: "Pedregal", lat: 9.002000, lng: -79.502000, estimado: "08:30" },
        { nombre: "Juan Díaz", lat: 9.004000, lng: -79.504000, estimado: "09:00" },
        { nombre: "Parque Lefevre", lat: 9.006000, lng: -79.506000, estimado: "09:30" },
        { nombre: "San Miguelito", lat: 9.008000, lng: -79.508000, estimado: "10:00" },
        { nombre: "Villa Lucre", lat: 9.010000, lng: -79.510000, estimado: "10:30" },
        { nombre: "Tocumen", lat: 9.012000, lng: -79.512000, estimado: "11:00" },
        { nombre: "Las Mañanitas", lat: 9.014000, lng: -79.514000, estimado: "11:30" },
        { nombre: "Guadalupe", lat: 9.016000, lng: -79.516000, estimado: "12:00" },
        { nombre: "Relleno Sanitario", lat: 9.018000, lng: -79.518000, estimado: "12:30" }
      ],
      "distanciaTotal": 30.2,
      "tiempoEstimado": 300
    },
    {
      "id": "ruta-3", 
      "nombre": "Ruta Sur", 
      "paradas": [
        { nombre: "Chorrera", lat: 8.880000, lng: -79.780000, estimado: "08:00" },
        { nombre: "Arraijan", lat: 8.882000, lng: -79.782000, estimado: "08:30" },
        { nombre: "Vacamonte", lat: 8.884000, lng: -79.784000, estimado: "09:00" },
        { nombre: "Nueva Arraijan", lat: 8.886000, lng: -79.786000, estimado: "09:30" },
        { nombre: "Veracruz", lat: 8.888000, lng: -79.788000, estimado: "10:00" },
        { nombre: "Vista Alegre", lat: 8.890000, lng: -79.790000, estimado: "10:30" },
        { nombre: "Howard", lat: 8.892000, lng: -79.792000, estimado: "11:00" },
        { nombre: "Amador", lat: 8.894000, lng: -79.794000, estimado: "11:30" },
        { nombre: "Balboa", lat: 8.896000, lng: -79.796000, estimado: "12:00" },
        { nombre: "Relleno Sanitario", lat: 8.898000, lng: -79.798000, estimado: "12:30" }
      ],
      "distanciaTotal": 35.8,
      "tiempoEstimado": 330
    }
  ],
  pesosCarga: {
    "baja": 100,
    "media": 400, 
    "alta": 700,
    "otra": 0
  },
  historialRecolecciones: [
    {"camion": "TR-001", "fecha": "2025-07-02", "kgTotal": 850, "duracion": 240, "paradas": 10, "rutaCompletada": 100, "eficiencia": 85},
    {"camion": "TR-001", "fecha": "2025-07-01", "kgTotal": 920, "duracion": 260, "paradas": 10, "rutaCompletada": 100, "eficiencia": 90},
    {"camion": "TR-003", "fecha": "2025-07-02", "kgTotal": 750, "duracion": 220, "paradas": 10, "rutaCompletada": 100, "eficiencia": 80},
    {"camion": "TR-002", "fecha": "2025-07-01", "kgTotal": 680, "duracion": 200, "paradas": 10, "rutaCompletada": 90, "eficiencia": 75}
  ],
  // Nuevos datos para funcionalidades avanzadas
  alertas: [
    { id: 1, tipo: "combustible", camion: "TR-005", mensaje: "Combustible bajo (40%)", timestamp: new Date(), prioridad: "alta" },
    { id: 2, tipo: "mantenimiento", camion: "TR-005", mensaje: "Mantenimiento programado", timestamp: new Date(), prioridad: "media" },
    { id: 3, tipo: "ruta", camion: "TR-003", mensaje: "Retraso en ruta Norte", timestamp: new Date(), prioridad: "baja" }
  ],
  estadisticasOperativas: {
    totalKgHoy: 2450,
    rutasCompletadas: 15,
    tiempoPromedioRuta: 245,
    eficienciaPromedio: 83,
    combustiblePromedio: 72,
    alertasActivas: 3
  },
  // Ubicaciones reales en Ciudad de Panamá
  ubicacionesReales: {
    centroDistribucion: { lat: 8.9833, lng: -79.5167, nombre: "Centro de Distribución - Pedregal" },
    cocoDelMar: { lat: 8.9686, lng: -79.5185, nombre: "Coco del Mar" },
    puntalPacifica: { lat: 8.9500, lng: -79.5300, nombre: "Punta Pacífica" },
    sanFrancisco: { lat: 8.9950, lng: -79.5100, nombre: "San Francisco" },
    elCangrejo: { lat: 8.9875, lng: -79.5263, nombre: "El Cangrejo" },
    cascoBiejo: { lat: 8.9547, lng: -79.5320, nombre: "Casco Viejo" },
    albrook: { lat: 8.9722, lng: -79.5556, nombre: "Albrook" },
    condado: { lat: 8.9847, lng: -79.5081, nombre: "Condado del Rey" },
    bethania: { lat: 8.9700, lng: -79.5450, nombre: "Bethania" },
    bellavista: { lat: 8.9792, lng: -79.5347, nombre: "Bella Vista" },
    elDorado: { lat: 9.0200, lng: -79.5100, nombre: "El Dorado" },
    transistmica: { lat: 9.0300, lng: -79.4800, nombre: "Vía Transístmica" },
    pedregal: { lat: 8.9800, lng: -79.5200, nombre: "Pedregal" },
    viaEspana: { lat: 8.9900, lng: -79.5250, nombre: "Vía España" },
    multiplaza: { lat: 8.9950, lng: -79.5180, nombre: "Multiplaza" }
  },
  // Rutas con coordenadas reales y waypoints calculados
  rutas: [
    {
      id: 'ruta-norte',
      nombre: 'Ruta Norte',
      descripcion: 'Recorrido por sectores norte de la ciudad',
      distanciaTotal: 25.6,
      tiempoEstimado: 180, // minutos
      coordenadasCompletas: [
        [8.9833, -79.5167], // Centro de distribución
        [8.9840, -79.5160], // Salida del centro
        [8.9850, -79.5150], // Vía principal
        [8.9870, -79.5140], // Intersección
        [8.9890, -79.5130], // Avenida Balboa
        [8.9900, -79.5120], // Continuación
        [8.9920, -79.5110], // Hacia El Dorado
        [8.9950, -79.5100], // Llegada a San Francisco
        [8.9970, -79.5090], // Calle secundaria
        [9.0000, -79.5080], // Intersección importante
        [9.0050, -79.5070], // Subiendo hacia el norte
        [9.0100, -79.5060], // Calle residencial
        [9.0150, -79.5050], // Continuación
        [9.0200, -79.5100], // El Dorado
        [9.0250, -79.5000], // Hacia Transístmica
        [9.0280, -79.4900], // Vía principal
        [9.0300, -79.4800] // Vía Transístmica
      ],
      paradas: [
        { 
          lat: 8.9833, lng: -79.5167, 
          nombre: "Centro de Distribución", 
          estimado: "06:00", 
          tipo: "inicio",
          direccion: "Pedregal, Centro Logístico Principal"
        },
        { 
          lat: 8.9950, lng: -79.5100, 
          nombre: "Residencial San Francisco", 
          estimado: "06:45", 
          tipo: "residencial",
          direccion: "Calle 78 Este, San Francisco"
        },
        { 
          lat: 8.9950, lng: -79.5180, 
          nombre: "Multiplaza Pacific", 
          estimado: "07:30", 
          tipo: "comercial",
          direccion: "Multiplaza Pacific, Punta Pacífica"
        },
        { 
          lat: 9.0200, lng: -79.5100, 
          nombre: "Urbanización El Dorado", 
          estimado: "08:15", 
          tipo: "residencial",
          direccion: "El Dorado, Sector Norte"
        },
        { 
          lat: 9.0300, lng: -79.4800, 
          nombre: "Vía Transístmica", 
          estimado: "09:00", 
          tipo: "comercial",
          direccion: "Vía Transístmica, Zona Industrial"
        }
      ]
    },
    {
      id: 'ruta-centro',
      nombre: 'Ruta Centro',
      descripcion: 'Recorrido por el centro histórico y financiero',
      distanciaTotal: 18.3,
      tiempoEstimado: 150,
      coordenadasCompletas: [
        [8.9833, -79.5167], // Centro de distribución
        [8.9820, -79.5180], // Salida sur
        [8.9800, -79.5200], // Pedregal local
        [8.9790, -79.5220], // Hacia Bella Vista
        [8.9792, -79.5347], // Bella Vista
        [8.9800, -79.5360], // Calle principal
        [8.9820, -79.5380], // Hacia El Cangrejo
        [8.9875, -79.5263], // El Cangrejo
        [8.9880, -79.5270], // Vía España
        [8.9900, -79.5250], // Vía España principal
        [8.9920, -79.5280], // Intersección
        [8.9940, -79.5300], // Hacia Casco
        [8.9600, -79.5350], // Descendiendo
        [8.9547, -79.5320] // Casco Viejo
      ],
      paradas: [
        { 
          lat: 8.9833, lng: -79.5167, 
          nombre: "Centro de Distribución", 
          estimado: "08:00", 
          tipo: "inicio",
          direccion: "Pedregal, Centro Logístico Principal"
        },
        { 
          lat: 8.9792, lng: -79.5347, 
          nombre: "Bella Vista Centro", 
          estimado: "08:30", 
          tipo: "residencial",
          direccion: "Bella Vista, Edificios Residenciales"
        },
        { 
          lat: 8.9875, lng: -79.5263, 
          nombre: "El Cangrejo", 
          estimado: "09:15", 
          tipo: "comercial",
          direccion: "El Cangrejo, Zona Rosa"
        },
        { 
          lat: 8.9900, lng: -79.5250, 
          nombre: "Vía España", 
          estimado: "10:00", 
          tipo: "comercial",
          direccion: "Vía España, Centros Comerciales"
        },
        { 
          lat: 8.9547, lng: -79.5320, 
          nombre: "Casco Viejo", 
          estimado: "10:45", 
          tipo: "turistico",
          direccion: "Casco Viejo, Zona Histórica"
        }
      ]
    },
    {
      id: 'ruta-sur',
      nombre: 'Ruta Sur',
      descripcion: 'Recorrido por sectores sur y costa',
      distanciaTotal: 22.1,
      tiempoEstimado: 165,
      coordenadasCompletas: [
        [8.9833, -79.5167], // Centro de distribución
        [8.9800, -79.5180], // Salida hacia costa
        [8.9750, -79.5200], // Calle local
        [8.9700, -79.5450], // Bethania
        [8.9680, -79.5460], // Continuación
        [8.9650, -79.5480], // Hacia Albrook
        [8.9722, -79.5556], // Albrook
        [8.9700, -79.5600], // Zona Albrook
        [8.9650, -79.5650], // Hacia costa
        [8.9600, -79.5700], // Calle costera
        [8.9686, -79.5185], // Hacia Coco del Mar
        [8.9500, -79.5300] // Punta Pacífica
      ],
      paradas: [
        { 
          lat: 8.9833, lng: -79.5167, 
          nombre: "Centro de Distribución", 
          estimado: "10:00", 
          tipo: "inicio",
          direccion: "Pedregal, Centro Logístico Principal"
        },
        { 
          lat: 8.9700, lng: -79.5450, 
          nombre: "Bethania", 
          estimado: "10:30", 
          tipo: "residencial",
          direccion: "Bethania, Sector Residencial"
        },
        { 
          lat: 8.9722, lng: -79.5556, 
          nombre: "Albrook Mall", 
          estimado: "11:15", 
          tipo: "comercial",
          direccion: "Albrook, Centro Comercial"
        },
        { 
          lat: 8.9686, lng: -79.5185, 
          nombre: "Coco del Mar", 
          estimado: "12:00", 
          tipo: "residencial",
          direccion: "Coco del Mar, Torres Residenciales"
        },
        { 
          lat: 8.9500, lng: -79.5300, 
          nombre: "Punta Pacífica", 
          estimado: "12:45", 
          tipo: "comercial",
          direccion: "Punta Pacífica, Distrito Financiero"
        }
      ]
    }
  ],
  // Camiones actualizados con posiciones y rutas reales
  camiones: [
    {
      id: 'CAM-001',
      conductor: 'Carlos Mendez',
      estado: 'En ruta',
      lat: 8.9950, // Actualmente en San Francisco
      lng: -79.5100,
      velocidad: 25,
      combustible: 78,
      pesoAcumulado: 450,
      direccion: 45,
      rutaAsignada: 'Ruta Norte',
      paradaActual: 2,
      totalParadas: 5,
      ultimaActualizacion: new Date().toISOString(),
      historialPosiciones: [
        { lat: 8.9833, lng: -79.5167, timestamp: new Date(Date.now() - 3600000).toISOString() },
        { lat: 8.9900, lng: -79.5130, timestamp: new Date(Date.now() - 1800000).toISOString() },
        { lat: 8.9950, lng: -79.5100, timestamp: new Date().toISOString() }
      ]
    },
    {
      id: 'CAM-002',
      conductor: 'Ana Rodriguez',
      estado: 'En ruta',
      lat: 8.9875, // Actualmente en El Cangrejo
      lng: -79.5263,
      velocidad: 15,
      combustible: 92,
      pesoAcumulado: 320,
      direccion: 180,
      rutaAsignada: 'Ruta Centro',
      paradaActual: 3,
      totalParadas: 5,
      ultimaActualizacion: new Date().toISOString(),
      historialPosiciones: [
        { lat: 8.9833, lng: -79.5167, timestamp: new Date(Date.now() - 7200000).toISOString() },
        { lat: 8.9792, lng: -79.5347, timestamp: new Date(Date.now() - 3600000).toISOString() },
        { lat: 8.9875, lng: -79.5263, timestamp: new Date().toISOString() }
      ]
    },
    {
      id: 'CAM-003',
      conductor: 'Miguel Torres',
      estado: 'En ruta',
      lat: 8.9722, // Actualmente en Albrook
      lng: -79.5556,
      velocidad: 30,
      combustible: 65,
      pesoAcumulado: 580,
      direccion: 225,
      rutaAsignada: 'Ruta Sur',
      paradaActual: 3,
      totalParadas: 5,
      ultimaActualizacion: new Date().toISOString(),
      historialPosiciones: [
        { lat: 8.9833, lng: -79.5167, timestamp: new Date(Date.now() - 5400000).toISOString() },
        { lat: 8.9700, lng: -79.5450, timestamp: new Date(Date.now() - 2700000).toISOString() },
        { lat: 8.9722, lng: -79.5556, timestamp: new Date().toISOString() }
      ]
    },
    {
      id: 'CAM-004',
      conductor: 'Sofia Martinez',
      estado: 'Disponible',
      lat: 8.9833, // En el centro de distribución
      lng: -79.5167,
      velocidad: 0,
      combustible: 100,
      pesoAcumulado: 0,
      direccion: 0,
      rutaAsignada: null,
      paradaActual: 0,
      totalParadas: 0,
      ultimaActualizacion: new Date().toISOString(),
      historialPosiciones: [
        { lat: 8.9833, lng: -79.5167, timestamp: new Date().toISOString() }
      ]
    },
    {
      id: 'CAM-005',
      conductor: 'Roberto Vega',
      estado: 'En mantenimiento',
      lat: 8.9800, // En el taller cerca del centro
      lng: -79.5200,
      velocidad: 0,
      combustible: 45,
      pesoAcumulado: 0,
      direccion: 0,
      rutaAsignada: null,
      paradaActual: 0,
      totalParadas: 0,
      ultimaActualizacion: new Date().toISOString(),
      historialPosiciones: [
        { lat: 8.9800, lng: -79.5200, timestamp: new Date().toISOString() }
      ]
    }
  ],
  // Alertas del sistema
  alertas: [
    {
      id: 'alerta-001',
      tipo: 'combustible',
      camion: 'CAM-005',
      mensaje: 'Nivel de combustible bajo (45%)',
      prioridad: 'media',
      timestamp: new Date().toISOString()
    },
    {
      id: 'alerta-002',
      tipo: 'mantenimiento',
      camion: 'CAM-005',
      mensaje: 'Vehículo en mantenimiento preventivo',
      prioridad: 'baja',
      timestamp: new Date().toISOString()
    },
    {
      id: 'alerta-003',
      tipo: 'eficiencia',
      camion: 'CAM-003',
      mensaje: 'Excelente eficiencia de recolección (580kg)',
      prioridad: 'baja',
      timestamp: new Date().toISOString()
    }
  ],
  // Estadísticas operativas
  estadisticas: {
    vehiculosActivos: 3,
    vehiculosDisponibles: 1,
    vehiculosMantenimiento: 1,
    rutasActivas: 3,
    paradasCompletadas: 8,
    paradasPendientes: 7,
    pesoTotalRecolectado: 1350,
    eficienciaPromedio: 85,
    combustiblePromedio: 76,
    tiempoPromedioParada: 15
  }
};

// Función para obtener ruta real usando OSRM
export const calcularRutaReal = async (inicio, fin) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${inicio.lng},${inicio.lat};${fin.lng},${fin.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.routes && data.routes[0]?.geometry) {
      // Convertir coordenadas de OSRM [lng, lat] a Leaflet [lat, lng]
      return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    }
  } catch (error) {
    console.warn('Error calculando ruta OSRM, usando fallback:', error);
  }
  
  // Fallback: interpolación con más puntos para rutas más suaves
  const deltaLat = (fin.lat - inicio.lat) / 20;
  const deltaLng = (fin.lng - inicio.lng) / 20;
  
  const waypoints = [];
  for (let i = 0; i <= 20; i++) {
    // Añadir algo de curvatura para simular calles
    const factor = i / 20;
    const curvatura = Math.sin(factor * Math.PI) * 0.002; // Pequeña desviación
    waypoints.push([
      inicio.lat + (deltaLat * i) + curvatura,
      inicio.lng + (deltaLng * i) + curvatura
    ]);
  }
  
  return waypoints;
};

// Función para calcular ruta completa con todas las paradas
export const calcularRutaCompleta = async (paradas) => {
  const rutaCompleta = [];
  
  for (let i = 0; i < paradas.length - 1; i++) {
    const segmento = await calcularRutaReal(paradas[i], paradas[i + 1]);
    if (rutaCompleta.length > 0) {
      // Evitar puntos duplicados
      segmento.shift();
    }
    rutaCompleta.push(...segmento);
  }
  
  return rutaCompleta;
};

// Función para simular actualizaciones de posición en tiempo real
export const simularMovimientoReal = (camion, ruta) => {
  if (!ruta || !ruta.coordenadasCompletas) return camion;
  
  const coordenadas = ruta.coordenadasCompletas;
  const progreso = camion.paradaActual / camion.totalParadas;
  const indiceActual = Math.floor(progreso * (coordenadas.length - 1));
  
  if (indiceActual < coordenadas.length - 1) {
    // Interpolar entre puntos para movimiento suave
    const puntoActual = coordenadas[indiceActual];
    const puntoSiguiente = coordenadas[indiceActual + 1];
    const factor = Math.random() * 0.3; // Movimiento aleatorio dentro del segmento
    
    return {
      ...camion,
      lat: puntoActual[0] + (puntoSiguiente[0] - puntoActual[0]) * factor,
      lng: puntoActual[1] + (puntoSiguiente[1] - puntoActual[1]) * factor,
      velocidad: Math.max(0, camion.velocidad + (Math.random() - 0.5) * 10),
      direccion: Math.atan2(
        puntoSiguiente[1] - puntoActual[1],
        puntoSiguiente[0] - puntoActual[0]
      ) * 180 / Math.PI
    };
  }
  
  return camion;
};

export default appData; 