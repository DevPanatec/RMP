import { createContext, useContext, useReducer, useEffect } from 'react';

// Datos iniciales desde mockData
const initialPersonnel = {
  unassigned: [
    { id: 'emp001', name: 'Juan Pérez', position: 'Conductor', rating: 8, avatar: 'JP', email: 'juan.perez@rmp.com', phone: '+507-6123-4567' },
    { id: 'emp002', name: 'María García', position: 'Ayudante', rating: 9, avatar: 'MG', email: 'maria.garcia@rmp.com', phone: '+507-6234-5678' },
    { id: 'emp003', name: 'Carlos López', position: 'Supervisor', rating: 7, avatar: 'CL', email: 'carlos.lopez@rmp.com', phone: '+507-6345-6789' },
    { id: 'emp004', name: 'Ana Rodríguez', position: 'Conductor', rating: 8.5, avatar: 'AR', email: 'ana.rodriguez@rmp.com', phone: '+507-6456-7890' },
    { id: 'emp005', name: 'Luis Martínez', position: 'Ayudante', rating: 7.8, avatar: 'LM', email: 'luis.martinez@rmp.com', phone: '+507-6567-8901' },
  ],
  morning: [
    { id: 'emp006', name: 'Pedro Sánchez', position: 'Conductor', rating: 9.2, avatar: 'PS', email: 'pedro.sanchez@rmp.com', phone: '+507-6678-9012' },
    { id: 'emp007', name: 'Sofia Torres', position: 'Ayudante', rating: 8.7, avatar: 'ST', email: 'sofia.torres@rmp.com', phone: '+507-6789-0123' },
  ],
  afternoon: [
    { id: 'emp008', name: 'Diego Morales', position: 'Supervisor', rating: 8.9, avatar: 'DM', email: 'diego.morales@rmp.com', phone: '+507-6890-1234' },
  ],
  night: [
    { id: 'emp009', name: 'Carmen Vega', position: 'Conductor', rating: 7.5, avatar: 'CV', email: 'carmen.vega@rmp.com', phone: '+507-6901-2345' },
  ]
};

// Crear el contexto
const PersonnelContext = createContext();

// Tipos de acciones
const ACTIONS = {
  SET_PERSONNEL: 'SET_PERSONNEL',
  ADD_EMPLOYEE: 'ADD_EMPLOYEE',
  UPDATE_EMPLOYEE: 'UPDATE_EMPLOYEE',
  DELETE_EMPLOYEE: 'DELETE_EMPLOYEE',
  MOVE_EMPLOYEE: 'MOVE_EMPLOYEE',
  ASSIGN_EMPLOYEE_TO_SHIFT: 'ASSIGN_EMPLOYEE_TO_SHIFT',
  LOAD_PERSONNEL: 'LOAD_PERSONNEL'
};

// Reducer para manejar el estado
const personnelReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_PERSONNEL:
      return {
        ...state,
        personnel: action.payload,
        loading: false
      };

    case ACTIONS.ADD_EMPLOYEE:
      const newEmployee = {
        ...action.payload,
        id: `emp${Date.now()}`,
        avatar: action.payload.name.split(' ').map(n => n[0]).join('').toUpperCase()
      };
      const updatedUnassigned = [...state.personnel.unassigned, newEmployee];
      const newPersonnel = {
        ...state.personnel,
        unassigned: updatedUnassigned
      };
      localStorage.setItem('rmp_personnel', JSON.stringify(newPersonnel));
      return {
        ...state,
        personnel: newPersonnel
      };

    case ACTIONS.UPDATE_EMPLOYEE:
      const { employeeId, updates } = action.payload;
      const updatedPersonnel = { ...state.personnel };
      
      // Buscar en todas las categorías
      for (const shift in updatedPersonnel) {
        const employeeIndex = updatedPersonnel[shift].findIndex(emp => emp.id === employeeId);
        if (employeeIndex !== -1) {
          updatedPersonnel[shift][employeeIndex] = {
            ...updatedPersonnel[shift][employeeIndex],
            ...updates
          };
          break;
        }
      }
      
      localStorage.setItem('rmp_personnel', JSON.stringify(updatedPersonnel));
      return {
        ...state,
        personnel: updatedPersonnel
      };

    case ACTIONS.DELETE_EMPLOYEE:
      const personnelAfterDelete = { ...state.personnel };
      for (const shift in personnelAfterDelete) {
        personnelAfterDelete[shift] = personnelAfterDelete[shift].filter(
          emp => emp.id !== action.payload
        );
      }
      localStorage.setItem('rmp_personnel', JSON.stringify(personnelAfterDelete));
      return {
        ...state,
        personnel: personnelAfterDelete
      };

    case ACTIONS.MOVE_EMPLOYEE:
      const { employeeId: moveId, fromShift, toShift } = action.payload;
      const personnelAfterMove = { ...state.personnel };
      
      // Encontrar empleado
      const employeeToMove = personnelAfterMove[fromShift].find(emp => emp.id === moveId);
      if (employeeToMove) {
        // Remover del turno origen
        personnelAfterMove[fromShift] = personnelAfterMove[fromShift].filter(emp => emp.id !== moveId);
        // Agregar al turno destino
        personnelAfterMove[toShift] = [...personnelAfterMove[toShift], employeeToMove];
      }
      
      localStorage.setItem('rmp_personnel', JSON.stringify(personnelAfterMove));
      return {
        ...state,
        personnel: personnelAfterMove
      };

    case ACTIONS.LOAD_PERSONNEL:
      return {
        ...state,
        loading: true
      };

    default:
      return state;
  }
};

// Estado inicial
const initialState = {
  personnel: initialPersonnel,
  loading: true,
  error: null
};

// Provider del contexto
export const PersonnelProvider = ({ children }) => {
  const [state, dispatch] = useReducer(personnelReducer, initialState);

  // Cargar personal al iniciar
  useEffect(() => {
    loadPersonnel();
  }, []);

  // Función para cargar personal
  const loadPersonnel = () => {
    dispatch({ type: ACTIONS.LOAD_PERSONNEL });
    
    try {
      const savedPersonnel = localStorage.getItem('rmp_personnel');
      
      if (savedPersonnel) {
        const parsedPersonnel = JSON.parse(savedPersonnel);
        dispatch({ type: ACTIONS.SET_PERSONNEL, payload: parsedPersonnel });
      } else {
        localStorage.setItem('rmp_personnel', JSON.stringify(initialPersonnel));
        dispatch({ type: ACTIONS.SET_PERSONNEL, payload: initialPersonnel });
      }
    } catch (error) {
      console.error('Error loading personnel:', error);
      dispatch({ type: ACTIONS.SET_PERSONNEL, payload: initialPersonnel });
    }
  };

  // Función para agregar empleado
  const addEmployee = (employeeData) => {
    dispatch({ type: ACTIONS.ADD_EMPLOYEE, payload: employeeData });
  };

  // Función para actualizar empleado
  const updateEmployee = (employeeId, updates) => {
    dispatch({ type: ACTIONS.UPDATE_EMPLOYEE, payload: { employeeId, updates } });
  };

  // Función para eliminar empleado
  const deleteEmployee = (employeeId) => {
    dispatch({ type: ACTIONS.DELETE_EMPLOYEE, payload: employeeId });
  };

  // Función para mover empleado entre turnos
  const moveEmployee = (employeeId, fromShift, toShift) => {
    dispatch({ type: ACTIONS.MOVE_EMPLOYEE, payload: { employeeId, fromShift, toShift } });
  };

  // Función para obtener todos los empleados
  const getAllEmployees = () => {
    const all = [];
    for (const shift in state.personnel) {
      all.push(...state.personnel[shift]);
    }
    return all;
  };

  // Función para obtener empleados por turno
  const getEmployeesByShift = (shift) => {
    return state.personnel[shift] || [];
  };

  // Función para obtener estadísticas
  const getPersonnelStats = () => {
    const all = getAllEmployees();
    const total = all.length;
    const conductors = all.filter(emp => emp.position === 'Conductor').length;
    const assistants = all.filter(emp => emp.position === 'Ayudante').length;
    const supervisors = all.filter(emp => emp.position === 'Supervisor').length;
    const avgRating = total > 0 ? (all.reduce((sum, emp) => sum + emp.rating, 0) / total).toFixed(1) : 0;
    
    const byShift = {
      unassigned: state.personnel.unassigned.length,
      morning: state.personnel.morning.length,
      afternoon: state.personnel.afternoon.length,
      night: state.personnel.night.length
    };

    return {
      total,
      conductors,
      assistants,
      supervisors,
      avgRating,
      byShift
    };
  };

  // Valor del contexto
  const value = {
    personnel: state.personnel,
    loading: state.loading,
    error: state.error,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    moveEmployee,
    getAllEmployees,
    getEmployeesByShift,
    getPersonnelStats,
    loadPersonnel
  };

  return (
    <PersonnelContext.Provider value={value}>
      {children}
    </PersonnelContext.Provider>
  );
};

// Hook para usar el contexto
export const usePersonnel = () => {
  const context = useContext(PersonnelContext);
  if (!context) {
    throw new Error('usePersonnel debe ser usado dentro de un PersonnelProvider');
  }
  return context;
};

export default PersonnelContext;