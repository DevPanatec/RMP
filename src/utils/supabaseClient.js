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
      .order('fecha_reporte', { ascending: false });
    
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
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { rows: data };
  }

  // Métodos específicos para vehículos
  async getVehicles() {
    const { data, error } = await this.client
      .from('vehiculos')
      .select(`
        *,
        conductor_actual:empleados!conductor_actual_id(nombre, apellido),
        proyecto_asignado:proyectos!proyecto_asignado_id(nombre)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Transformar para coincidir con el formato esperado
    const transformedData = data.map(item => ({
      ...item,
      conductor_nombre: item.conductor_actual ? 
        `${item.conductor_actual.nombre} ${item.conductor_actual.apellido}` : null,
      proyecto_nombre: item.proyecto_asignado?.nombre || null,
      // Agregar propiedades adicionales para el mapa
      lat: parseFloat(item.gps_latitud) || 4.6097100,
      lng: parseFloat(item.gps_longitud) || -74.0817500,
      tipoServicio: item.tipo === 'camion' ? 'recoleccion' : 'fumigacion',
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
        proyecto:proyectos!proyecto_id(nombre),
        vehiculo:vehiculos!vehiculo_id(placa),
        conductor:empleados!conductor_id(nombre, apellido)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Transformar para coincidir con el formato esperado
    const transformedData = data.map(item => ({
      ...item,
      proyecto_nombre: item.proyecto?.nombre || null,
      vehiculo_placa: item.vehiculo?.placa || null,
      conductor_nombre: item.conductor ? 
        `${item.conductor.nombre} ${item.conductor.apellido}` : null
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
        vehiculo_id: routeData.vehiculo_id || null,
        conductor_id: routeData.conductor_id || null,
        tipo_servicio: routeData.tipo_servicio || 'recoleccion',
        paradas: paradas,
        fecha_programada: routeData.fecha_programada || new Date().toISOString().split('T')[0],
        hora_inicio: routeData.hora_inicio || null,
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
}

// Instancia del cliente Supabase para React
const supabaseClient = new SupabaseClient();

export default supabaseClient;