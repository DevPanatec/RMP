import { createContext, useContext, useReducer, useEffect } from 'react';
import supabaseClient from '../utils/supabaseClient';
import { DEMO_PERSONNEL, DEMO_VEHICLES, mergeDemoData } from '../utils/demoData';
import { useDemoMode } from '../hooks/useDemoMode';

// Crear el contexto
const SupabasePersonnelContext = createContext();

// Tipos de acciones
const ACTIONS = {
  SET_PERSONNEL: 'SET_PERSONNEL',
  ADD_EMPLOYEE: 'ADD_EMPLOYEE',
  UPDATE_EMPLOYEE: 'UPDATE_EMPLOYEE',
  DELETE_EMPLOYEE: 'DELETE_EMPLOYEE',
  LOAD_PERSONNEL: 'LOAD_PERSONNEL',
  SET_ERROR: 'SET_ERROR'
};

// Reducer para manejar el estado
const personnelReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_PERSONNEL:
      return {
        ...state,
        personnel: action.payload,
        loading: false,
        error: null
      };

    case ACTIONS.ADD_EMPLOYEE:
      return {
        ...state,
        personnel: [...state.personnel, action.payload]
      };

    case ACTIONS.UPDATE_EMPLOYEE:
      return {
        ...state,
        personnel: state.personnel.map(emp => 
          emp.id === action.payload.id ? action.payload : emp
        )
      };

    case ACTIONS.DELETE_EMPLOYEE:
      return {
        ...state,
        personnel: state.personnel.filter(emp => emp.id !== action.payload)
      };

    case ACTIONS.LOAD_PERSONNEL:
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
  personnel: [],
  loading: true,
  error: null
};

// Provider del contexto
export const SupabasePersonnelProvider = ({ children }) => {
  const [state, dispatch] = useReducer(personnelReducer, initialState);
  const { isDemoMode } = useDemoMode();

  // Cargar personal al iniciar y cuando cambie el modo demo
  useEffect(() => {
    loadPersonnel(isDemoMode);
  }, [isDemoMode]);

  // Función para cargar personal
  const loadPersonnel = async (isDemoMode = false) => {
    dispatch({ type: ACTIONS.LOAD_PERSONNEL });

    try {
      const result = await supabaseClient.getEmployees();

      const realEmployees = (result.rows || []).map(emp => {
        // Determinar el estado basado en si tiene asignación activa
        let estado = 'Inactivo';
        let asignacion = 'Sin asignar';

        if (emp.activo) {
          if (emp.vehiculo_asignado_placa) {
            estado = 'En ruta';
            asignacion = `Vehículo: ${emp.vehiculo_asignado_placa}`;
          } else {
            estado = 'Disponible';
            asignacion = 'Sin vehículo asignado';
          }
        }

        return {
          id: emp.id,
          nombre: `${emp.nombre || ''} ${emp.apellido || ''}`.trim() || 'Sin nombre',
          puesto: emp.cargo || 'Conductor',
          email: emp.email || '',
          telefono: emp.telefono || '',
          estado: estado,
          asignacion: asignacion,
          document: emp.documento,
          documentType: emp.tipo_documento,
          birthDate: emp.fecha_nacimiento,
          address: emp.direccion,
          salary: emp.salario,
          salaryType: emp.tipo_salario,
          registerDate: emp.fecha_registro,
          active: emp.activo,
          avatar: emp.foto_url || `${emp.nombre?.charAt(0) || '?'}${emp.apellido?.charAt(0) || '?'}`,
          employeeCode: emp.codigo_empleado,
          project: emp.proyecto_nombre,
          contractType: emp.tipo_contrato,
          contractStart: emp.contrato_inicio,
          contractEnd: emp.contrato_vencimiento,
          baseSalary: emp.salario_base,
          vehiculoAsignado: emp.vehiculo_asignado_placa,
          rating: 8.0
        };
      });

      // Si el modo demo está activo, agregar datos demo
      let allEmployees = realEmployees;
      if (isDemoMode) {
        const demoEmployees = DEMO_PERSONNEL.map(emp => {
          // Buscar el vehículo asignado
          const vehiculo = DEMO_VEHICLES.find(v => v.id === emp.vehiculo_asignado);
          const vehiculoPlaca = vehiculo?.placa;
          const vehiculoEnRuta = vehiculo?.estado === 'En ruta';

          let estado = 'Inactivo';
          let asignacion = 'Sin asignar';

          if (emp.estado === 'activo') {
            if (vehiculoPlaca) {
              estado = vehiculoEnRuta ? 'En ruta' : 'Disponible';
              asignacion = `Vehículo: ${vehiculoPlaca}`;
            } else {
              estado = 'Disponible';
              asignacion = 'Sin vehículo asignado';
            }
          }

          return {
            id: emp.id,
            nombre: `${emp.nombre} ${emp.apellido}`,
            puesto: emp.cargo || 'Conductor',
            email: emp.email,
            telefono: emp.telefono,
            estado: estado,
            asignacion: asignacion,
            document: emp.licencia,
            active: emp.estado === 'activo',
            avatar: `${emp.nombre.charAt(0)}${emp.apellido.charAt(0)}`,
            vehiculoAsignado: vehiculoPlaca,
            rating: 8.5
          };
        });

        allEmployees = mergeDemoData(realEmployees, demoEmployees);
      }

      dispatch({ type: ACTIONS.SET_PERSONNEL, payload: allEmployees });
    } catch (error) {
      console.error('Error loading personnel:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
    }
  };

  // Función para agregar empleado
  const addEmployee = async (employeeData) => {
    try {
      const query = `
        INSERT INTO empleados (
          nombre,
          apellido,
          email,
          telefono,
          documento,
          tipo_documento,
          fecha_nacimiento,
          direccion,
          cargo,
          salario,
          tipo_salario,
          activo
        ) VALUES (
          '${employeeData.nombre}',
          '${employeeData.apellido}',
          '${employeeData.email || ''}',
          '${employeeData.telefono || ''}',
          '${employeeData.documento}',
          '${employeeData.tipo_documento || 'CC'}',
          ${employeeData.fecha_nacimiento ? `'${employeeData.fecha_nacimiento}'` : 'NULL'},
          '${employeeData.direccion || ''}',
          '${employeeData.cargo || ''}',
          ${employeeData.salario || 'NULL'},
          '${employeeData.tipo_salario || 'mensual'}',
          true
        )
        RETURNING *;
      `;
      
      const result = await supabaseClient.executeSQL(query);
      const newEmployee = result.rows[0];
      
      // Formatear empleado para el estado
      const formattedEmployee = {
        id: newEmployee.id,
        nombre: `${newEmployee.nombre} ${newEmployee.apellido}`,
        puesto: newEmployee.cargo || 'Conductor',
        email: newEmployee.email,
        telefono: newEmployee.telefono,
        estado: 'Activo',
        document: newEmployee.documento,
        documentType: newEmployee.tipo_documento,
        avatar: `${newEmployee.nombre?.charAt(0) || ''}${newEmployee.apellido?.charAt(0) || ''}`,
        rating: 8.0
      };
      
      dispatch({ type: ACTIONS.ADD_EMPLOYEE, payload: formattedEmployee });
      return formattedEmployee;
    } catch (error) {
      console.error('Error adding employee:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Función para actualizar empleado
  const updateEmployee = async (employeeId, updates) => {
    try {
      // Construir la query de actualización dinámicamente
      const updateFields = [];
      if (updates.nombre && updates.apellido) {
        updateFields.push(`nombre = '${updates.nombre}'`);
        updateFields.push(`apellido = '${updates.apellido}'`);
      }
      if (updates.email) updateFields.push(`email = '${updates.email}'`);
      if (updates.telefono) updateFields.push(`telefono = '${updates.telefono}'`);
      if (updates.cargo) updateFields.push(`cargo = '${updates.cargo}'`);
      if (updates.salario) updateFields.push(`salario = ${updates.salario}`);
      if (updates.direccion) updateFields.push(`direccion = '${updates.direccion}'`);
      
      updateFields.push(`updated_at = now()`);
      
      const query = `
        UPDATE empleados 
        SET ${updateFields.join(', ')}
        WHERE id = '${employeeId}'
        RETURNING *;
      `;
      
      const result = await supabaseClient.executeSQL(query);
      const updatedEmployee = result.rows[0];
      
      // Formatear empleado actualizado
      const formattedEmployee = {
        id: updatedEmployee.id,
        nombre: `${updatedEmployee.nombre} ${updatedEmployee.apellido}`,
        puesto: updatedEmployee.cargo || 'Conductor',
        email: updatedEmployee.email,
        telefono: updatedEmployee.telefono,
        estado: updatedEmployee.activo ? 'Activo' : 'Inactivo',
        document: updatedEmployee.documento,
        avatar: `${updatedEmployee.nombre?.charAt(0) || ''}${updatedEmployee.apellido?.charAt(0) || ''}`,
        rating: 8.0
      };
      
      dispatch({ type: ACTIONS.UPDATE_EMPLOYEE, payload: formattedEmployee });
      return formattedEmployee;
    } catch (error) {
      console.error('Error updating employee:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Función para eliminar empleado (marcar como inactivo)
  const deleteEmployee = async (employeeId) => {
    try {
      const query = `
        UPDATE empleados 
        SET activo = false, 
            fecha_inactivacion = now(),
            updated_at = now()
        WHERE id = '${employeeId}'
        RETURNING *;
      `;
      
      await supabaseClient.executeSQL(query);
      dispatch({ type: ACTIONS.DELETE_EMPLOYEE, payload: employeeId });
    } catch (error) {
      console.error('Error deleting employee:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Función para obtener todos los empleados
  const getAllEmployees = () => {
    return state.personnel;
  };

  // Función para obtener empleados por posición
  const getEmployeesByPosition = (position) => {
    return state.personnel.filter(emp => emp.puesto === position);
  };

  // Función para obtener estadísticas
  const getPersonnelStats = () => {
    const all = getAllEmployees();
    const total = all.length;
    const conductors = all.filter(emp => emp.puesto === 'Conductor').length;
    const assistants = all.filter(emp => emp.puesto === 'Ayudante').length;
    const supervisors = all.filter(emp => emp.puesto === 'Supervisor').length;
    const active = all.filter(emp => emp.estado === 'Activo').length;
    const avgRating = total > 0 ? (all.reduce((sum, emp) => sum + emp.rating, 0) / total).toFixed(1) : 0;

    return {
      total,
      conductors,
      assistants,
      supervisors,
      avgRating,
      active,
      inactive: total - active
    };
  };

  // Función para buscar empleados
  const searchEmployees = (searchTerm) => {
    if (!searchTerm) return state.personnel;

    return state.personnel.filter(emp =>
      emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.puesto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Valor del contexto
  const value = {
    personnel: state.personnel,
    loading: state.loading,
    error: state.error,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    getAllEmployees,
    getEmployeesByPosition,
    getPersonnelStats,
    searchEmployees,
    loadPersonnel
  };

  return (
    <SupabasePersonnelContext.Provider value={value}>
      {children}
    </SupabasePersonnelContext.Provider>
  );
};

// Hook para usar el contexto
export const useSupabasePersonnel = () => {
  const context = useContext(SupabasePersonnelContext);
  if (!context) {
    throw new Error('useSupabasePersonnel debe ser usado dentro de un SupabasePersonnelProvider');
  }
  return context;
};

export default SupabasePersonnelContext;