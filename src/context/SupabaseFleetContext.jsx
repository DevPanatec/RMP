import { createContext, useContext, useReducer, useEffect } from 'react';
import supabaseClient from '../utils/supabaseClient';

// Crear el contexto
const SupabaseFleetContext = createContext();

// Tipos de acciones
const ACTIONS = {
  SET_VEHICLES: 'SET_VEHICLES',
  ADD_VEHICLE: 'ADD_VEHICLE',
  UPDATE_VEHICLE: 'UPDATE_VEHICLE',
  DELETE_VEHICLE: 'DELETE_VEHICLE',
  LOAD_VEHICLES: 'LOAD_VEHICLES',
  SET_ERROR: 'SET_ERROR'
};

// Reducer para manejar el estado
const fleetReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_VEHICLES:
      return {
        ...state,
        vehicles: action.payload,
        loading: false,
        error: null
      };

    case ACTIONS.ADD_VEHICLE:
      return {
        ...state,
        vehicles: [...state.vehicles, action.payload]
      };

    case ACTIONS.UPDATE_VEHICLE:
      return {
        ...state,
        vehicles: state.vehicles.map(vehicle =>
          vehicle.id === action.payload.id ? action.payload : vehicle
        )
      };

    case ACTIONS.DELETE_VEHICLE:
      return {
        ...state,
        vehicles: state.vehicles.filter(vehicle => vehicle.id !== action.payload)
      };

    case ACTIONS.LOAD_VEHICLES:
      return {
        ...state,
        loading: true,
        error: null
      };

    case ACTIONS.SET_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    default:
      return state;
  }
};

// Estado inicial
const initialState = {
  vehicles: [],
  loading: true,
  error: null
};

// Provider del contexto
export const SupabaseFleetProvider = ({ children }) => {
  const [state, dispatch] = useReducer(fleetReducer, initialState);

  // Cargar vehículos al iniciar
  useEffect(() => {
    loadVehicles();
  }, []);

  // Función para cargar vehículos
  const loadVehicles = async () => {
    dispatch({ type: ACTIONS.LOAD_VEHICLES });
    
    try {
      const result = await supabaseClient.getVehicles();
      
      // Formatear datos para que coincidan con la estructura esperada
      const formattedVehicles = (result.rows || []).map(vehicle => ({
        id: vehicle.id,
        placa: vehicle.placa,
        marca: vehicle.marca,
        modelo: vehicle.modelo,
        año: vehicle.año,
        tipo: vehicle.tipo,
        tipoServicio: vehicle.tipo_servicio || (vehicle.tipo === 'camion' ? 'recoleccion' : 'fumigacion'),
        tipo_servicio: vehicle.tipo_servicio,
        estado: vehicle.estado === 'en_uso' ? 'En ruta' :
               vehicle.estado === 'disponible' ? 'Disponible' :
               vehicle.estado === 'mantenimiento' ? 'Mantenimiento' : 'Fuera de servicio',
        conductor: vehicle.conductor_nombre || 'Sin asignar',
        conductorId: vehicle.conductor_actual_id,
        proyecto: vehicle.proyecto_nombre,
        proyectoId: vehicle.proyecto_asignado_id,
        capacidadCarga: parseFloat(vehicle.capacidad_carga) || 0,
        nivelCombustible: vehicle.combustible_nivel || 100,
        combustible: vehicle.combustible_nivel || 100,
        kilometraje: vehicle.kilometraje || 0,
        lat: parseFloat(vehicle.gps_latitud) || 4.6097100,
        lng: parseFloat(vehicle.gps_longitud) || -74.0817500,
        velocidad: 0,
        ultimaActualizacion: vehicle.updated_at,
        // Campos adicionales para compatibilidad con MapComponent
        historialPosiciones: vehicle.gps_latitud && vehicle.gps_longitud ? [
          { lat: parseFloat(vehicle.gps_latitud), lng: parseFloat(vehicle.gps_longitud), timestamp: new Date().toISOString() }
        ] : []
      }));
      
      dispatch({ type: ACTIONS.SET_VEHICLES, payload: formattedVehicles });
    } catch (error) {
      console.error('Error loading vehicles:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
    }
  };

  // Función para agregar vehículo
  const addVehicle = async (vehicleData) => {
    try {
      const query = `
        INSERT INTO vehiculos (
          nombre,
          placa,
          marca,
          modelo,
          año,
          tipo,
          tipo_servicio,
          estado,
          capacidad_carga,
          combustible_nivel
        ) VALUES (
          '${vehicleData.nombre}',
          '${vehicleData.placa}',
          '${vehicleData.marca}',
          '${vehicleData.modelo}',
          ${vehicleData.año},
          '${vehicleData.tipo || 'camion'}',
          '${vehicleData.tipoServicio}',
          '${vehicleData.estado || 'disponible'}',
          ${vehicleData.capacidadCarga || 0},
          ${vehicleData.combustible || 100}
        )
        RETURNING *;
      `;
      
      const result = await supabaseClient.executeSQL(query);
      const newVehicle = result.rows[0];
      
      const formattedVehicle = {
        id: newVehicle.id,
        nombre: newVehicle.nombre,
        placa: newVehicle.placa,
        marca: newVehicle.marca,
        modelo: newVehicle.modelo,
        año: newVehicle.año,
        tipoServicio: newVehicle.tipo_servicio,
        estado: newVehicle.estado === 'disponible' ? 'Disponible' : newVehicle.estado,
        conductor: 'Sin asignar',
        nivelCombustible: newVehicle.combustible_nivel,
        lat: 8.9997,
        lng: -79.5178,
        velocidad: 0
      };
      
      dispatch({ type: ACTIONS.ADD_VEHICLE, payload: formattedVehicle });
      await loadVehicles();
      return formattedVehicle;
    } catch (error) {
      console.error('Error adding vehicle:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Función para actualizar vehículo
  const updateVehicle = async (vehicleId, updates) => {
    try {
      const updateFields = [];
      
      if (updates.estado) {
        const dbEstado = updates.estado === 'En ruta' ? 'en_ruta' :
                        updates.estado === 'Disponible' ? 'disponible' :
                        updates.estado === 'Mantenimiento' ? 'en_mantenimiento' : 'fuera_servicio';
        updateFields.push(`estado = '${dbEstado}'`);
      }
      if (updates.combustible) updateFields.push(`combustible_nivel = ${updates.combustible}`);
      if (updates.conductor_id) updateFields.push(`conductor_actual_id = '${updates.conductor_id}'`);
      if (updates.lat && updates.lng) {
        updateFields.push(`gps_latitud = ${updates.lat}`);
        updateFields.push(`gps_longitud = ${updates.lng}`);
      }
      
      updateFields.push(`updated_at = now()`);
      
      const query = `
        UPDATE vehiculos 
        SET ${updateFields.join(', ')}
        WHERE id = '${vehicleId}'
        RETURNING *;
      `;
      
      const result = await supabaseClient.executeSQL(query);
      const updatedVehicle = result.rows[0];
      
      // Formatear vehículo actualizado
      const formattedVehicle = {
        id: updatedVehicle.id,
        estado: updatedVehicle.estado === 'en_uso' ? 'En ruta' : 
                updatedVehicle.estado === 'disponible' ? 'Disponible' :
                updatedVehicle.estado === 'mantenimiento' ? 'Mantenimiento' : 'Fuera de servicio',
        nivelCombustible: updatedVehicle.combustible_nivel,
        lat: updatedVehicle.gps_latitud,
        lng: updatedVehicle.gps_longitud
      };
      
      dispatch({ type: ACTIONS.UPDATE_VEHICLE, payload: formattedVehicle });
      return formattedVehicle;
    } catch (error) {
      console.error('Error updating vehicle:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Función para eliminar vehículo (marcar como inactivo)
  const deleteVehicle = async (vehicleId) => {
    try {
      const query = `
        UPDATE vehiculos 
        SET estado = 'fuera_servicio', updated_at = now()
        WHERE id = '${vehicleId}'
        RETURNING *;
      `;
      
      await supabaseClient.executeSQL(query);
      dispatch({ type: ACTIONS.DELETE_VEHICLE, payload: vehicleId });
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Función para asignar ruta
  const assignRoute = async (vehicleId, routeId) => {
    try {
      if (!routeId) {
        // Desasignar ruta del vehículo
        const query = `
          UPDATE rutas 
          SET vehiculo_id = NULL, updated_at = now()
          WHERE vehiculo_id = ${vehicleId}
          RETURNING *;
        `;
        await supabaseClient.executeSQL(query);
        return;
      }

      // Primero, desasignar cualquier ruta previa de este vehículo
      await supabaseClient.executeSQL(`
        UPDATE rutas 
        SET vehiculo_id = NULL, updated_at = now()
        WHERE vehiculo_id = ${vehicleId}
      `);

      // Asignar nueva ruta al vehículo
      const query = `
        UPDATE rutas 
        SET vehiculo_id = ${vehicleId}, updated_at = now()
        WHERE id = ${routeId}
        RETURNING *;
      `;
      
      const result = await supabaseClient.executeSQL(query);
      
      if (result.rows && result.rows.length > 0) {
        console.log('Ruta asignada exitosamente:', result.rows[0]);
        // Recargar vehículos para reflejar cambios
        await loadVehicles();
      }
    } catch (error) {
      console.error('Error assigning route:', error);
      throw error;
    }
  };

  // Función para asignar conductor
  const assignDriver = async (vehicleId, driverId) => {
    try {
      const query = `
        UPDATE vehiculos 
        SET conductor_actual_id = ${driverId ? `${driverId}` : 'NULL'}, updated_at = now()
        WHERE id = ${vehicleId}
        RETURNING *;
      `;
      
      await supabaseClient.executeSQL(query);
      await loadVehicles(); // Recargar para obtener los datos actualizados
    } catch (error) {
      console.error('Error assigning driver:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Función para obtener estadísticas
  const getFleetStats = () => {
    const total = state.vehicles.length;
    const enRuta = state.vehicles.filter(v => v.estado === 'En ruta').length;
    const disponibles = state.vehicles.filter(v => v.estado === 'Disponible').length;
    const mantenimiento = state.vehicles.filter(v => v.estado === 'Mantenimiento').length;
    
    const recoleccion = state.vehicles.filter(v => v.tipoServicio === 'recoleccion').length;
    const fumigacion = state.vehicles.filter(v => v.tipoServicio === 'fumigacion').length;
    
    const avgCombustible = total > 0 ? 
      (state.vehicles.reduce((sum, v) => sum + (v.nivelCombustible || 0), 0) / total).toFixed(1) : 0;

    return {
      total,
      enRuta,
      disponibles,
      mantenimiento,
      recoleccion,
      fumigacion,
      avgCombustible
    };
  };

  const getVehicleHistory = async (vehicleId) => {
    try {
      const query = `
        SELECT 
          hv.*,
          p.nombre as conductor_nombre,
          r.nombre as ruta_nombre
        FROM historial_vehiculos hv
        LEFT JOIN personal p ON hv.conductor_id = p.id
        LEFT JOIN rutas r ON hv.ruta_id = r.id
        WHERE hv.vehiculo_id = '${vehicleId}'
        ORDER BY hv.fecha DESC, hv.hora_inicio DESC;
      `;
      
      const result = await supabaseClient.executeSQL(query);
      return result.rows || [];
    } catch (error) {
      console.error('Error getting vehicle history:', error);
      throw error;
    }
  };

  const addVehicleHistoryEntry = async (historyData) => {
    try {
      const query = `
        INSERT INTO historial_vehiculos (
          vehiculo_id,
          conductor_id,
          ruta_id,
          fecha,
          hora_inicio,
          hora_fin,
          kilometraje
        ) VALUES (
          '${historyData.vehiculo_id}',
          ${historyData.conductor_id ? `'${historyData.conductor_id}'` : 'NULL'},
          ${historyData.ruta_id ? `'${historyData.ruta_id}'` : 'NULL'},
          '${historyData.fecha}',
          '${historyData.hora_inicio}',
          ${historyData.hora_fin ? `'${historyData.hora_fin}'` : 'NULL'},
          ${historyData.kilometraje || 0}
        )
        RETURNING *;
      `;
      
      const result = await supabaseClient.executeSQL(query);
      return result.rows[0];
    } catch (error) {
      console.error('Error adding vehicle history entry:', error);
      throw error;
    }
  };

  // Valor del contexto
  const value = {
    vehicles: state.vehicles,
    loading: state.loading,
    error: state.error,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    assignRoute,
    assignDriver,
    getFleetStats,
    loadVehicles,
    getVehicleHistory,
    addVehicleHistoryEntry
  };

  return (
    <SupabaseFleetContext.Provider value={value}>
      {children}
    </SupabaseFleetContext.Provider>
  );
};

// Hook para usar el contexto
export const useSupabaseFleet = () => {
  const context = useContext(SupabaseFleetContext);
  if (!context) {
    throw new Error('useSupabaseFleet debe ser usado dentro de un SupabaseFleetProvider');
  }
  return context;
};

export default SupabaseFleetContext;