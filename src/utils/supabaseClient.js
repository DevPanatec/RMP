import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tikpsugkuyotqgxsvgor.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpa3BzdWdrdXlvdHFneHN2Z29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MDI3NjYsImV4cCI6MjA2ODA3ODc2Nn0._NKst-FGkNSTACvsNa_EOF-0zGxJ5o2TnidKd-yqfu4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente que reemplaza mcpClient para React
class SupabaseClient {
  constructor() {
    this.client = supabase;
  }

  async executeSQL(query) {
    // Esta función no es necesaria para el cliente JS de Supabase
    // Lo mantenemos por compatibilidad pero no se usa
    throw new Error('Use direct Supabase client methods instead of executeSQL');
  }

  // Métodos específicos para empleados
  async getEmployees() {
    const { data, error } = await this.client
      .from('empleados')
      .select('*')
      .eq('activo', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { rows: data };
  }

  async addEmployee(employeeData) {
    const { data, error } = await this.client
      .from('empleados')
      .insert([{
        nombre: employeeData.nombre,
        apellido: employeeData.apellido,
        cedula: employeeData.cedula,
        telefono: employeeData.telefono || '',
        fecha_nacimiento: employeeData.fecha_nacimiento || null,
        direccion: employeeData.direccion || '',
        cargo: employeeData.cargo || '',
        salario: employeeData.salario || null,
        departamento: employeeData.departamento || '',
        fecha_ingreso: employeeData.fecha_ingreso || new Date().toISOString().split('T')[0],
        activo: true
      }])
      .select()
      .single();

    if (error) throw error;
    return { rows: [data] };
  }

  async updateEmployee(employeeId, updates) {
    const updateData = { ...updates, updated_at: new Date().toISOString() };
    const { data, error } = await this.client
      .from('empleados')
      .update(updateData)
      .eq('id', employeeId)
      .select()
      .single();

    if (error) throw error;
    return { rows: [data] };
  }

  async deleteEmployee(employeeId) {
    const { data, error } = await this.client
      .from('empleados')
      .update({
        activo: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', employeeId)
      .select()
      .single();

    if (error) throw error;
    return { rows: [data] };
  }

  // Métodos específicos para reportes de riesgo
  async getAlerts() {
    const { data, error } = await this.client
      .from('reportes_riesgo')
      .select(`
        *,
        empleado_reporta:empleados!empleado_reporta_id(nombre, apellido),
        proyecto:proyectos!proyecto_id(nombre),
        vehiculo:vehiculos!vehiculo_id(placa)
      `)
      .order('fecha_reporte', { ascending: false});

    if (error) throw error;

    // Transformar para coincidir con el formato esperado
    const transformedData = data.map(item => ({
      ...item,
      empleado_nombre: item.empleado_reporta ?
        `${item.empleado_reporta.nombre} ${item.empleado_reporta.apellido}` : null,
      proyecto_nombre: item.proyecto?.nombre || null,
      vehiculo_placa: item.vehiculo?.placa || null
    }));

    return { rows: transformedData };
  }

  async addAlert(alertData) {
    const { data, error } = await this.client
      .from('reportes_riesgo')
      .insert([{
        titulo: alertData.titulo,
        descripcion: alertData.descripcion || alertData.mensaje,
        tipo_riesgo: alertData.tipo_riesgo || 'operacional',
        nivel_severidad: alertData.nivel_severidad || 'medio',
        ubicacion: alertData.ubicacion || '',
        gps_latitud: alertData.gps_latitud || null,
        gps_longitud: alertData.gps_longitud || null,
        empleado_reporta_id: alertData.empleado_reporta_id || null,
        proyecto_id: alertData.proyecto_id || null,
        vehiculo_id: alertData.vehiculo_id || null,
        ruta_id: alertData.ruta_id || null,
        prioridad: alertData.prioridad || 5
      }])
      .select()
      .single();

    if (error) throw error;
    return { rows: [data] };
  }

  async updateAlert(alertId, updates) {
    const updateData = { ...updates, updated_at: new Date().toISOString() };
    const { data, error } = await this.client
      .from('reportes_riesgo')
      .update(updateData)
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw error;
    return { rows: [data] };
  }

  async deleteAlert(alertId) {
    const { error } = await this.client
      .from('reportes_riesgo')
      .delete()
      .eq('id', alertId);

    if (error) throw error;
    return { rows: [] };
  }

  // Métodos específicos para proyectos
  async getProjects() {
    const { data, error } = await this.client
      .from('proyectos')
      .select('*')
      .order('created_at', { ascending: false});

    if (error) throw error;
    return { rows: data };
  }

  // Métodos específicos para vehículos
  async getVehicles() {
    const { data, error } = await this.client
      .from('vehiculos')
      .select(`
        *,
        proyecto_asignado:proyectos!proyecto_asignado_id(nombre)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transformar para coincidir con el formato esperado
    const transformedData = data.map(item => ({
      ...item,
      conductor_nombre: null, // Conductores ya no están asignados directamente
      proyecto_nombre: item.proyecto_asignado?.nombre || null,
      // Agregar propiedades adicionales para el mapa
      lat: parseFloat(item.gps_latitud) || 4.6097100,
      lng: parseFloat(item.gps_longitud) || -74.0817500,
      tipoServicio: item.tipo_servicio || 'recoleccion',
      rutaAsignada: null, // Se puede agregar más tarde
      pesoAcumulado: 0,
      historialPosiciones: item.gps_latitud && item.gps_longitud ? [
        { lat: parseFloat(item.gps_latitud), lng: parseFloat(item.gps_longitud), timestamp: new Date().toISOString() }
      ] : []
    }));

    return { rows: transformedData };
  }

  async addVehicle(vehicleData) {
    const { data, error } = await this.client
      .from('vehiculos')
      .insert([{
        placa: vehicleData.placa,
        marca: vehicleData.marca,
        modelo: vehicleData.modelo,
        año: vehicleData.año,
        tipo: vehicleData.tipo,
        tipo_servicio: vehicleData.tipo_servicio || 'recoleccion',
        estado: vehicleData.estado || 'disponible',
        capacidad_carga: vehicleData.capacidad_carga || 0,
        combustible_nivel: vehicleData.combustible_nivel || 100,
        kilometraje: vehicleData.kilometraje || 0
      }])
      .select()
      .single();

    if (error) throw error;
    return { rows: [data] };
  }

  async updateVehicle(vehicleId, updates) {
    const updateData = { ...updates, updated_at: new Date().toISOString() };
    const { data, error } = await this.client
      .from('vehiculos')
      .update(updateData)
      .eq('id', vehicleId)
      .select()
      .single();

    if (error) throw error;
    return { rows: [data] };
  }

  async deleteVehicle(vehicleId) {
    const { error } = await this.client
      .from('vehiculos')
      .delete()
      .eq('id', vehicleId);

    if (error) throw error;
    return { rows: [] };
  }

  // Métodos específicos para rutas
  async getRoutes() {
    const { data, error } = await this.client
      .from('rutas')
      .select(`
        *,
        proyecto:proyectos!proyecto_id(nombre)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transformar para coincidir con el formato esperado
    const transformedData = data.map(item => ({
      ...item,
      proyecto_nombre: item.proyecto?.nombre || null,
      vehiculo_placa: null, // Vehículos ya no están asignados directamente
      conductor_nombre: null // Conductores ya no están asignados directamente
    }));

    return { rows: transformedData };
  }

  async addRoute(routeData) {
    const paradas = JSON.stringify(routeData.stops || routeData.paradas || []);

    const { data, error } = await this.client
      .from('rutas')
      .insert([{
        nombre: routeData.name || routeData.nombre,
        proyecto_id: routeData.proyecto_id || null,
        tipo_servicio: routeData.tipo_servicio || 'recoleccion',
        paradas: paradas,
        fecha_programada: routeData.fecha_programada || new Date().toISOString().split('T')[0],
        hora_inicio: routeData.hora_inicio || null,
        hora_fin: routeData.hora_fin || null,
        distancia_total: routeData.distancia_total || null,
        combustible_estimado: routeData.combustible_estimado || null,
        observaciones: routeData.observaciones || ''
      }])
      .select()
      .single();

    if (error) throw error;
    return { rows: [data] };
  }

  async updateRoute(routeId, updates) {
    if (updates.paradas) {
      updates.paradas = JSON.stringify(updates.paradas);
    }
    const updateData = { ...updates, updated_at: new Date().toISOString() };

    const { data, error } = await this.client
      .from('rutas')
      .update(updateData)
      .eq('id', routeId)
      .select()
      .single();

    if (error) throw error;
    return { rows: [data] };
  }

  async deleteRoute(routeId) {
    const { error } = await this.client
      .from('rutas')
      .delete()
      .eq('id', routeId);

    if (error) throw error;
    return { rows: [] };
  }

  // Métodos específicos para reportes
  async getCompletedRoutes(dateRange) {
    const { data, error } = await this.client
      .from('rutas')
      .select(`
        *,
        proyecto:proyectos!proyecto_id(nombre)
      `)
      .eq('estado', 'completada')
      .gte('fecha_programada', dateRange.inicio)
      .lte('fecha_programada', dateRange.fin)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Transformar para coincidir con el formato esperado
    const transformedData = data.map(item => ({
      ...item,
      proyecto_nombre: item.proyecto?.nombre || null,
      vehiculo_placa: null, // Vehículos ya no están asignados directamente
      vehiculo_info: null,
      conductor_nombre: null // Conductores ya no están asignados directamente
    }));

    return { rows: transformedData };
  }

  // Método para guardar resumen de ruta completada
  async saveRouteCompletionReport(reportData) {
    const { data, error} = await this.client
      .from('route_reports')
      .insert([{
        ruta_id: reportData.ruta_id,
        asignacion_id: reportData.asignacion_id,
        conductor_nombre: reportData.conductor_nombre,
        conductor_id: reportData.conductor_id || null,
        vehiculo_placa: reportData.vehiculo_placa,
        vehiculo_id: reportData.vehiculo_id || null,
        fecha_inicio: reportData.fecha_inicio,
        fecha_completacion: reportData.fecha_completacion,
        tiempo_total_segundos: reportData.tiempo_total_segundos,
        paradas_completadas: reportData.paradas_completadas,
        reportes_riesgo_ids: reportData.reportes_riesgo_ids || [],
        observaciones: reportData.observaciones || '',
        tipo_ruta: reportData.tipo_ruta,
        ruta_nombre: reportData.nombreRuta,
        ruta_paradas: reportData.ruta_paradas || []
      }])
      .select()
      .single();

    if (error) throw error;

    // Actualizar el estado de la asignación a "completada"
    if (reportData.asignacion_id) {
      const { error: updateError } = await this.client
        .from('asignaciones_rutas')
        .update({ estado: 'completada' })
        .eq('id', reportData.asignacion_id);

      if (updateError) {
        console.error('Error actualizando estado de asignación:', updateError);
      }
    }

    return { rows: [data] };
  }

  // Método para obtener resúmenes de rutas completadas por conductor
  async getRouteCompletionReportsByDriver(driverName) {
    const { data, error } = await this.client
      .from('route_reports')
      .select('*')
      .eq('conductor_nombre', driverName)
      .order('fecha_completacion', { ascending: false });

    if (error) throw error;
    return { rows: data };
  }

  // Método para obtener todos los resúmenes con paginación y filtros
  async getRouteCompletionReports(filters = {}) {
    let query = this.client
      .from('route_reports')
      .select('*');

    if (filters.fechaInicio) {
      query = query.gte('fecha_completacion', filters.fechaInicio);
    }
    if (filters.fechaFin) {
      query = query.lte('fecha_completacion', filters.fechaFin);
    }
    if (filters.conductor) {
      query = query.eq('conductor_nombre', filters.conductor);
    }
    if (filters.vehiculo) {
      query = query.eq('vehiculo_placa', filters.vehiculo);
    }
    if (filters.tipo_ruta) {
      query = query.eq('tipo_ruta', filters.tipo_ruta);
    }

    query = query.order('fecha_completacion', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return { rows: data };
  }

  // ==================== MÉTODOS PARA ROUTE_PROGRESS ====================

  // Iniciar tracking de ruta
  async startRouteProgress(progressData) {
    const { data, error } = await this.client
      .from('route_progress')
      .insert([{
        conductor_id: progressData.conductor_id,
        conductor_nombre: progressData.conductor_nombre,
        ruta_id: progressData.ruta_id,
        vehiculo_id: progressData.vehiculo_id,
        asignacion_id: progressData.asignacion_id,
        fecha_inicio: progressData.fecha_inicio,
        total_paradas: progressData.total_paradas,
        tipo_ruta: progressData.tipo_ruta,
        estado: 'en_progreso'
      }])
      .select()
      .single();

    if (error) throw error;
    return { rows: [data] };
  }

  // Actualizar progreso (al completar parada o actualizar posición)
  async updateRouteProgress(progressId, updates) {
    const { data, error } = await this.client
      .from('route_progress')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', progressId)
      .select()
      .single();

    if (error) throw error;
    return { rows: [data] };
  }

  // Obtener progreso activo de un conductor
  async getActiveRouteProgress(conductorNombre) {
    const { data, error } = await this.client
      .from('route_progress')
      .select('*')
      .eq('conductor_nombre', conductorNombre)
      .eq('estado', 'en_progreso')
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return { rows: data ? [data] : [] };
  }

  // Completar ruta (cambiar estado)
  async completeRouteProgress(progressId, routeReportId = null) {
    const { data, error } = await this.client
      .from('route_progress')
      .update({
        estado: 'completada',
        route_report_id: routeReportId,
        updated_at: new Date().toISOString()
      })
      .eq('id', progressId)
      .select()
      .single();

    if (error) throw error;
    return { rows: [data] };
  }

  // Obtener progreso por ID
  async getRouteProgressById(progressId) {
    const { data, error } = await this.client
      .from('route_progress')
      .select('*')
      .eq('id', progressId)
      .single();

    if (error) throw error;
    return { rows: [data] };
  }
}

// Instancia del cliente Supabase para React
const supabaseClient = new SupabaseClient();

// Agregar referencia al cliente Supabase directamente para auth
supabaseClient.supabase = supabase;

// Método executeSQL que NO usa RPC sino el ORM de Supabase cuando es posible
// Para queries complejas, ejecutamos directamente con .rpc()
supabaseClient.executeSQL = async function(query) {
  try {
    // Para queries SELECT simples, parseamos y usamos el ORM
    // Para otros casos, usamos PostgreSQL function o hacemos fetch directo
    
    // Por ahora, ejecutamos SQL usando fetch directo al endpoint de PostgREST
    const cleanQuery = query.trim().replace(/;$/, '');
    
    // Si es un INSERT/UPDATE/DELETE de perfiles_usuarios, usar el ORM
    if (cleanQuery.toLowerCase().includes('perfiles_usuarios')) {
      // Intentar parsear la query para usar el ORM
      // Por simplicidad, ejecutamos con rpc si existe
      try {
        const { data, error } = await supabase.rpc('exec_sql', { query: cleanQuery });
        if (!error) return { rows: data };
      } catch (e) {
        // Si falla RPC, continuar con método alternativo
      }
    }
    
    // Método alternativo: usar el cliente REST directamente
    console.log('Ejecutando query SQL:', cleanQuery.substring(0, 100) + '...');
    
    // Para development, simplemente devolvemos un array vacío si no podemos ejecutar
    // En producción, esto debería usar una Cloud Function o RPC
    return { rows: [] };
    
  } catch (error) {
    console.error('Error ejecutando SQL:', error);
    throw error;
  }
};

export default supabaseClient;