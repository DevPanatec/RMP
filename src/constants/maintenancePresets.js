// ========================================
// PRESETS PARA FORMULARIO DE MANTENIMIENTO
// Planta de Tratamiento - Mercado San Felipe Neri
// ========================================

export const MAINTENANCE_PRESETS = {

  // 1. PRESET DE UBICACIÓN (READ-ONLY)
  location: {
    name: 'Mercado San Felipe Neri',
    type: 'Planta de Tratamiento',
    address: 'Mercado San Felipe Neri, Panamá'
  },

  // 2. PRESET DE VOLUMEN Y COSTOS
  volumeAndCost: [
    {
      id: 'full_discharge',
      label: 'Descarga Completa (Tanque Lleno)',
      volume_gallons: 6000,
      cost_per_gallon: 0.11,
      total_cost: 660.00,
      description: 'Vaciado total del tanque - 1 camión completo'
    },
    {
      id: 'half_discharge',
      label: 'Descarga Parcial (Medio Tanque)',
      volume_gallons: 3000,
      cost_per_gallon: 0.11,
      total_cost: 330.00,
      description: 'Vaciado parcial del tanque - Medio camión'
    },
    {
      id: 'minimal_discharge',
      label: 'Descarga Mínima (Mantenimiento Ligero)',
      volume_gallons: 1500,
      cost_per_gallon: 0.11,
      total_cost: 165.00,
      description: 'Vaciado mínimo para mantenimiento preventivo'
    },
    {
      id: 'emergency_discharge',
      label: 'Descarga de Emergencia',
      volume_gallons: 6000,
      cost_per_gallon: 0.11,
      total_cost: 660.00,
      description: 'Vaciado urgente por contingencia'
    }
  ],

  // 3. PRESET DE TIPO DE MANTENIMIENTO
  maintenanceType: [
    {
      id: 'preventivo',
      label: 'Preventivo',
      description: 'Mantenimiento programado regular',
      icon: '🔧',
      color: '#34c759',
      recommendedFrequency: 'Mensual'
    },
    {
      id: 'correctivo',
      label: 'Correctivo',
      description: 'Reparación de fallas identificadas',
      icon: '⚙️',
      color: '#ff9500',
      recommendedFrequency: 'Según necesidad'
    },
    {
      id: 'contingencia',
      label: 'Contingencia',
      description: 'Emergencia o situación crítica',
      icon: '🚨',
      color: '#ff3b30',
      recommendedFrequency: 'Inmediato'
    }
  ],

  // 4. PRESET DE ACTIVIDADES / TAREAS ESTÁNDAR
  standardTasks: [
    {
      id: 'succion_total',
      label: 'Succión Total del Pozo de Bombas',
      category: 'Limpieza Principal',
      estimatedDuration: 120, // minutos
      requiresDischarge: true,
      highImpact: true,
      description: 'Vaciado completo del pozo mediante succión con camión'
    },
    {
      id: 'limpieza_paredes',
      label: 'Limpieza de Paredes Internas y Canasta',
      category: 'Limpieza Estructural',
      estimatedDuration: 90,
      requiresDischarge: true,
      highImpact: true,
      description: 'Lavado y desinfección de superficies internas'
    },
    {
      id: 'extraccion_grasa',
      label: 'Extracción de Grasa y Sedimentos',
      category: 'Limpieza Profunda',
      estimatedDuration: 60,
      requiresDischarge: true,
      highImpact: true,
      description: 'Remoción de acumulación de grasa y sólidos'
    },
    {
      id: 'revision_electrica',
      label: 'Revisión y Ajuste de Componentes Eléctricos',
      category: 'Mantenimiento Técnico',
      estimatedDuration: 45,
      requiresDischarge: false,
      highImpact: false,
      description: 'Inspección de conexiones, cables y tableros'
    },
    {
      id: 'limpieza_trampa',
      label: 'Limpieza de Trampa de Grasa',
      category: 'Limpieza Especializada',
      estimatedDuration: 30,
      requiresDischarge: false,
      highImpact: false,
      description: 'Vaciado y limpieza del sistema de trampa'
    },
    {
      id: 'inspeccion_bombas',
      label: 'Inspección de Bombas y Flotadores',
      category: 'Inspección Preventiva',
      estimatedDuration: 30,
      requiresDischarge: false,
      highImpact: false,
      description: 'Verificación de funcionamiento de equipos'
    },
    {
      id: 'desinfeccion_general',
      label: 'Desinfección General del Sistema',
      category: 'Limpieza Sanitaria',
      estimatedDuration: 45,
      requiresDischarge: false,
      highImpact: false,
      description: 'Aplicación de desinfectantes en todo el sistema'
    }
  ],

  // 5. PRESET DE PAQUETES DE MANTENIMIENTO (COMBOS)
  maintenancePackages: [
    {
      id: 'mantenimiento_completo',
      label: 'Mantenimiento Completo (Mensual)',
      type: 'preventivo',
      tasks: [
        'succion_total',
        'limpieza_paredes',
        'extraccion_grasa',
        'limpieza_trampa',
        'inspeccion_bombas'
      ],
      estimatedDuration: 360, // 6 horas
      volumePreset: 'full_discharge',
      highImpact: true,
      description: 'Mantenimiento integral con todas las tareas principales'
    },
    {
      id: 'mantenimiento_basico',
      label: 'Mantenimiento Básico (Quincenal)',
      type: 'preventivo',
      tasks: [
        'limpieza_trampa',
        'inspeccion_bombas',
        'revision_electrica'
      ],
      estimatedDuration: 120, // 2 horas
      volumePreset: 'minimal_discharge',
      highImpact: false,
      description: 'Inspección y limpieza ligera de rutina'
    },
    {
      id: 'limpieza_profunda',
      label: 'Limpieza Profunda (Trimestral)',
      type: 'preventivo',
      tasks: [
        'succion_total',
        'limpieza_paredes',
        'extraccion_grasa',
        'desinfeccion_general'
      ],
      estimatedDuration: 300, // 5 horas
      volumePreset: 'full_discharge',
      highImpact: true,
      description: 'Limpieza intensiva de toda la planta'
    },
    {
      id: 'emergencia_desborde',
      label: 'Atención de Emergencia por Desborde',
      type: 'contingencia',
      tasks: [
        'succion_total',
        'inspeccion_bombas',
        'revision_electrica'
      ],
      estimatedDuration: 180, // 3 horas
      volumePreset: 'emergency_discharge',
      highImpact: true,
      description: 'Respuesta urgente a desborde o falla crítica'
    }
  ],

  // 6. PRESET DE NIVEL DE IMPACTO
  impactLevel: [
    {
      id: 'high',
      label: 'Alto Impacto',
      description: 'Requiere descarga completa y cierre temporal',
      icon: '🔴',
      color: '#ff3b30'
    },
    {
      id: 'medium',
      label: 'Impacto Medio',
      description: 'Requiere descarga parcial o trabajo extenso',
      icon: '🟡',
      color: '#ff9500'
    },
    {
      id: 'low',
      label: 'Bajo Impacto',
      description: 'No requiere descarga, mantenimiento ligero',
      icon: '🟢',
      color: '#34c759'
    }
  ],

  // 7. PRESET DE MATERIALES / RECURSOS
  materials: [
    {
      id: 'camion_vactor',
      label: 'Camión Vactor (6,000 galones)',
      category: 'Equipo Pesado',
      required_for: ['succion_total', 'full_discharge']
    },
    {
      id: 'bomba_portatil',
      label: 'Bomba Portátil',
      category: 'Equipo Auxiliar',
      required_for: ['limpieza_trampa']
    },
    {
      id: 'desinfectante_industrial',
      label: 'Desinfectante Industrial',
      category: 'Químicos',
      required_for: ['desinfeccion_general', 'limpieza_paredes']
    },
    {
      id: 'desengrasante',
      label: 'Desengrasante Especializado',
      category: 'Químicos',
      required_for: ['extraccion_grasa', 'limpieza_trampa']
    },
    {
      id: 'herramientas_electricas',
      label: 'Herramientas Eléctricas',
      category: 'Herramientas',
      required_for: ['revision_electrica']
    },
    {
      id: 'epp_completo',
      label: 'Equipo de Protección Personal (EPP)',
      category: 'Seguridad',
      required_for: 'all' // Requerido para todas las tareas
    }
  ],

  // 8. PRESET DE FRECUENCIAS RECOMENDADAS
  recommendedFrequency: [
    {
      id: 'daily',
      label: 'Diaria',
      value: 1,
      unit: 'días',
      description: 'Inspección visual diaria'
    },
    {
      id: 'weekly',
      label: 'Semanal',
      value: 7,
      unit: 'días',
      description: 'Revisión semanal de funcionamiento'
    },
    {
      id: 'biweekly',
      label: 'Quincenal',
      value: 15,
      unit: 'días',
      description: 'Mantenimiento básico quincenal'
    },
    {
      id: 'monthly',
      label: 'Mensual',
      value: 30,
      unit: 'días',
      description: 'Mantenimiento completo mensual'
    },
    {
      id: 'quarterly',
      label: 'Trimestral',
      value: 90,
      unit: 'días',
      description: 'Limpieza profunda trimestral'
    },
    {
      id: 'as_needed',
      label: 'Según Necesidad',
      value: null,
      unit: null,
      description: 'Correctivo o por demanda'
    }
  ]
};

// ========================================
// FUNCIONES AUXILIARES PARA EL FORMULARIO
// ========================================

// Calcular costo automáticamente
export const calculateCost = (gallons, costPerGallon = 0.11) => {
  return (gallons * costPerGallon).toFixed(2);
};

// Obtener preset de volumen por ID
export const getVolumePreset = (presetId) => {
  return MAINTENANCE_PRESETS.volumeAndCost.find(p => p.id === presetId);
};

// Obtener tareas de un paquete
export const getPackageTasks = (packageId) => {
  const pkg = MAINTENANCE_PRESETS.maintenancePackages.find(p => p.id === packageId);
  if (!pkg) return [];

  return pkg.tasks.map(taskId =>
    MAINTENANCE_PRESETS.standardTasks.find(t => t.id === taskId)
  );
};

// Calcular duración total de múltiples tareas
export const calculateTotalDuration = (taskIds) => {
  return taskIds.reduce((total, taskId) => {
    const task = MAINTENANCE_PRESETS.standardTasks.find(t => t.id === taskId);
    return total + (task?.estimatedDuration || 0);
  }, 0);
};

// Determinar si requiere alto impacto
export const isHighImpact = (taskIds) => {
  return taskIds.some(taskId => {
    const task = MAINTENANCE_PRESETS.standardTasks.find(t => t.id === taskId);
    return task?.highImpact === true;
  });
};
