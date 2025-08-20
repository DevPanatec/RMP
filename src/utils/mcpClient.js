// Cliente MCP para interactuar con Supabase
class MCPClient {
  constructor() {
    this.isAvailable = false;
    this.checkAvailability();
  }

  checkAvailability() {
    this.isAvailable = typeof window !== 'undefined' && 
                      window.claude && 
                      window.claude.mcp;
    
    if (!this.isAvailable) {
      console.warn('MCP client not available. Using mock data for development.');
    }
  }

  async executeSQL(query) {
    if (!this.isAvailable) {
      throw new Error('MCP client not available');
    }

    try {
      return await window.claude.mcp.execute_sql({ query });
    } catch (error) {
      console.error('MCP SQL Error:', error);
      throw error;
    }
  }


  async applyMigration(name, query) {
    if (!this.isAvailable) {
      throw new Error('MCP client not available');
    }

    try {
      return await window.claude.mcp.apply_migration({ name, query });
    } catch (error) {
      console.error('MCP Migration Error:', error);
      throw error;
    }
  }

  async listTables() {
    if (!this.isAvailable) {
      throw new Error('MCP client not available');
    }

    try {
      return await window.claude.mcp.list_tables();
    } catch (error) {
      console.error('MCP List Tables Error:', error);
      throw error;
    }
  }

  // Métodos específicos para empleados
  async getEmployees() {
    const query = `
      SELECT 
        e.id,
        e.nombre,
        e.apellido,
        e.cedula,
        e.telefono,
        e.fecha_nacimiento,
        e.direccion,
        e.cargo,
        e.salario,
        e.departamento,
        e.fecha_ingreso,
        e.activo,
        e.created_at,
        e.updated_at
      FROM empleados e
      WHERE e.activo = true
      ORDER BY e.created_at DESC;
    `;
    
    return await this.executeSQL(query);
  }

  async addEmployee(employeeData) {
    const query = `
      INSERT INTO empleados (
        nombre,
        apellido,
        cedula,
        telefono,
        fecha_nacimiento,
        direccion,
        cargo,
        salario,
        departamento,
        fecha_ingreso,
        activo
      ) VALUES (
        '${employeeData.nombre}',
        '${employeeData.apellido}',
        '${employeeData.cedula}',
        '${employeeData.telefono || ''}',
        ${employeeData.fecha_nacimiento ? `'${employeeData.fecha_nacimiento}'` : 'NULL'},
        '${employeeData.direccion || ''}',
        '${employeeData.cargo || ''}',
        ${employeeData.salario || 'NULL'},
        '${employeeData.departamento || ''}',
        '${employeeData.fecha_ingreso || new Date().toISOString().split('T')[0]}',
        true
      )
      RETURNING *;
    `;
    
    return await this.executeSQL(query);
  }

  async updateEmployee(employeeId, updates) {
    const updateFields = [];
    
    if (updates.nombre) updateFields.push(`nombre = '${updates.nombre}'`);
    if (updates.apellido) updateFields.push(`apellido = '${updates.apellido}'`);
    if (updates.cedula) updateFields.push(`cedula = '${updates.cedula}'`);
    if (updates.telefono) updateFields.push(`telefono = '${updates.telefono}'`);
    if (updates.cargo) updateFields.push(`cargo = '${updates.cargo}'`);
    if (updates.salario) updateFields.push(`salario = ${updates.salario}`);
    if (updates.direccion) updateFields.push(`direccion = '${updates.direccion}'`);
    if (updates.departamento) updateFields.push(`departamento = '${updates.departamento}'`);
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    const query = `
      UPDATE empleados 
      SET ${updateFields.join(', ')}
      WHERE id = ${employeeId}
      RETURNING *;
    `;
    
    return await this.executeSQL(query);
  }

  async deleteEmployee(employeeId) {
    const query = `
      UPDATE empleados 
      SET activo = false, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${employeeId}
      RETURNING *;
    `;
    
    return await this.executeSQL(query);
  }

  // Métodos específicos para reportes de riesgo
  async getAlerts() {
    const query = `
      SELECT 
        r.id,
        r.titulo,
        r.descripcion,
        r.tipo_riesgo,
        r.nivel_severidad,
        r.ubicacion,
        r.gps_latitud,
        r.gps_longitud,
        r.empleado_reporta_id,
        r.proyecto_id,
        r.vehiculo_id,
        r.ruta_id,
        r.estado,
        r.fecha_reporte,
        r.fecha_resolucion,
        r.acciones_tomadas,
        r.costo_estimado,
        r.responsable_id,
        r.prioridad,
        r.evidencias,
        e.nombre || ' ' || e.apellido as empleado_nombre,
        p.nombre as proyecto_nombre,
        v.placa as vehiculo_placa
      FROM reportes_riesgo r
      LEFT JOIN empleados e ON r.empleado_reporta_id = e.id
      LEFT JOIN proyectos p ON r.proyecto_id = p.id
      LEFT JOIN vehiculos v ON r.vehiculo_id = v.id
      ORDER BY r.fecha_reporte DESC;
    `;
    
    return await this.executeSQL(query);
  }

  async addAlert(alertData) {
    const query = `
      INSERT INTO reportes_riesgo (
        titulo,
        descripcion,
        tipo_riesgo,
        nivel_severidad,
        ubicacion,
        gps_latitud,
        gps_longitud,
        empleado_reporta_id,
        proyecto_id,
        vehiculo_id,
        ruta_id,
        prioridad
      ) VALUES (
        '${alertData.titulo}',
        '${alertData.descripcion || alertData.mensaje}',
        '${alertData.tipo_riesgo || 'operacional'}',
        '${alertData.nivel_severidad || 'medio'}',
        '${alertData.ubicacion || ''}',
        ${alertData.gps_latitud || 'NULL'},
        ${alertData.gps_longitud || 'NULL'},
        ${alertData.empleado_reporta_id || 'NULL'},
        ${alertData.proyecto_id || 'NULL'},
        ${alertData.vehiculo_id || 'NULL'},
        ${alertData.ruta_id || 'NULL'},
        ${alertData.prioridad || 5}
      )
      RETURNING *;
    `;
    
    return await this.executeSQL(query);
  }

  async updateAlert(alertId, updates) {
    const updateFields = [];
    
    if (updates.titulo) updateFields.push(`titulo = '${updates.titulo}'`);
    if (updates.descripcion) updateFields.push(`descripcion = '${updates.descripcion}'`);
    if (updates.estado) updateFields.push(`estado = '${updates.estado}'`);
    if (updates.acciones_tomadas) updateFields.push(`acciones_tomadas = '${updates.acciones_tomadas}'`);
    if (updates.responsable_id) updateFields.push(`responsable_id = ${updates.responsable_id}`);
    if (updates.fecha_resolucion) updateFields.push(`fecha_resolucion = '${updates.fecha_resolucion}'`);
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    const query = `
      UPDATE reportes_riesgo 
      SET ${updateFields.join(', ')}
      WHERE id = ${alertId}
      RETURNING *;
    `;
    
    return await this.executeSQL(query);
  }

  async deleteAlert(alertId) {
    const query = `DELETE FROM reportes_riesgo WHERE id = ${alertId};`;
    return await this.executeSQL(query);
  }

  // Métodos específicos para proyectos
  async getProjects() {
    const query = `
      SELECT 
        p.*
      FROM proyectos p
      ORDER BY p.created_at DESC;
    `;
    
    return await this.executeSQL(query);
  }


  // Métodos específicos para vehículos
  async getVehicles() {
    const query = `
      SELECT 
        v.*,
        e.nombre || ' ' || e.apellido as conductor_nombre,
        p.nombre as proyecto_nombre
      FROM vehiculos v
      LEFT JOIN empleados e ON v.conductor_actual_id = e.id
      LEFT JOIN proyectos p ON v.proyecto_asignado_id = p.id
      ORDER BY v.created_at DESC;
    `;
    
    return await this.executeSQL(query);
  }

  async addVehicle(vehicleData) {
    const query = `
      INSERT INTO vehiculos (
        placa,
        marca,
        modelo,
        año,
        tipo,
        estado,
        capacidad_carga,
        combustible_nivel,
        kilometraje
      ) VALUES (
        '${vehicleData.placa}',
        '${vehicleData.marca}',
        '${vehicleData.modelo}',
        ${vehicleData.año},
        '${vehicleData.tipo}',
        '${vehicleData.estado || 'disponible'}',
        ${vehicleData.capacidad_carga || 0},
        ${vehicleData.combustible_nivel || 100},
        ${vehicleData.kilometraje || 0}
      )
      RETURNING *;
    `;
    
    return await this.executeSQL(query);
  }

  async updateVehicle(vehicleId, updates) {
    const updateFields = [];
    
    if (updates.estado) updateFields.push(`estado = '${updates.estado}'`);
    if (updates.combustible_nivel) updateFields.push(`combustible_nivel = ${updates.combustible_nivel}`);
    if (updates.conductor_actual_id) updateFields.push(`conductor_actual_id = ${updates.conductor_actual_id}`);
    if (updates.gps_latitud && updates.gps_longitud) {
      updateFields.push(`gps_latitud = ${updates.gps_latitud}`);
      updateFields.push(`gps_longitud = ${updates.gps_longitud}`);
    }
    if (updates.kilometraje) updateFields.push(`kilometraje = ${updates.kilometraje}`);
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    const query = `
      UPDATE vehiculos 
      SET ${updateFields.join(', ')}
      WHERE id = ${vehicleId}
      RETURNING *;
    `;
    
    return await this.executeSQL(query);
  }

  async deleteVehicle(vehicleId) {
    const query = `
      DELETE FROM vehiculos 
      WHERE id = ${vehicleId}
      RETURNING *;
    `;
    
    return await this.executeSQL(query);
  }

  // Métodos específicos para rutas
  async getRoutes() {
    const query = `
      SELECT 
        r.*,
        p.nombre as proyecto_nombre,
        v.placa as vehiculo_placa,
        e.nombre || ' ' || e.apellido as conductor_nombre
      FROM rutas r
      LEFT JOIN proyectos p ON r.proyecto_id = p.id
      LEFT JOIN vehiculos v ON r.vehiculo_id = v.id
      LEFT JOIN empleados e ON r.conductor_id = e.id
      ORDER BY r.created_at DESC;
    `;
    
    return await this.executeSQL(query);
  }

  async addRoute(routeData) {
    const paradas = JSON.stringify(routeData.stops || routeData.paradas || []);
    
    const query = `
      INSERT INTO rutas (
        nombre,
        proyecto_id,
        vehiculo_id,
        conductor_id,
        tipo_servicio,
        paradas,
        fecha_programada,
        hora_inicio,
        distancia_total,
        combustible_estimado,
        observaciones
      ) VALUES (
        '${routeData.name || routeData.nombre}',
        ${routeData.proyecto_id || 'NULL'},
        ${routeData.vehiculo_id || 'NULL'},
        ${routeData.conductor_id || 'NULL'},
        '${routeData.tipo_servicio || 'recoleccion'}',
        '${paradas}',
        '${routeData.fecha_programada || new Date().toISOString().split('T')[0]}',
        ${routeData.hora_inicio ? `'${routeData.hora_inicio}'` : 'NULL'},
        ${routeData.distancia_total || 'NULL'},
        ${routeData.combustible_estimado || 'NULL'},
        '${routeData.observaciones || ''}'
      )
      RETURNING *;
    `;
    
    return await this.executeSQL(query);
  }

  async updateRoute(routeId, updates) {
    const updateFields = [];
    
    if (updates.nombre) updateFields.push(`nombre = '${updates.nombre}'`);
    if (updates.tipo_servicio) updateFields.push(`tipo_servicio = '${updates.tipo_servicio}'`);
    if (updates.paradas) {
      const paradas = JSON.stringify(updates.paradas);
      updateFields.push(`paradas = '${paradas}'`);
    }
    if (updates.estado) updateFields.push(`estado = '${updates.estado}'`);
    if (updates.vehiculo_id) updateFields.push(`vehiculo_id = ${updates.vehiculo_id}`);
    if (updates.conductor_id) updateFields.push(`conductor_id = ${updates.conductor_id}`);
    if (updates.fecha_programada) updateFields.push(`fecha_programada = '${updates.fecha_programada}'`);
    if (updates.observaciones) updateFields.push(`observaciones = '${updates.observaciones}'`);
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    const query = `
      UPDATE rutas 
      SET ${updateFields.join(', ')}
      WHERE id = ${routeId}
      RETURNING *;
    `;
    
    return await this.executeSQL(query);
  }

  async deleteRoute(routeId) {
    const query = `
      DELETE FROM rutas 
      WHERE id = ${routeId}
      RETURNING *;
    `;
    
    return await this.executeSQL(query);
  }
}

// Instancia singleton del cliente MCP
const mcpClient = new MCPClient();

export default mcpClient;