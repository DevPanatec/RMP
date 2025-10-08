import { createContext, useContext, useReducer, useEffect } from 'react';
import { appData } from '../data/mockData';

// Datos iniciales de rutas
const initialRoutes = [
  { 
    id: 'route001', 
    name: 'Zona Centro', 
    type: 'recoleccion', 
    stops: ['Plaza Central', 'Banco Nacional', 'Centro Comercial', 'Hospital Central'], 
    estimatedTime: '4h', 
    color: '#22c55e', 
    status: 'active',
    description: 'Ruta principal del centro de la ciudad',
    priority: 'alta',
    vehicleAssigned: null,
    driverAssigned: null,
    dateCreated: new Date().toISOString()
  },
  { 
    id: 'route002', 
    name: 'Zona Norte', 
    type: 'recoleccion', 
    stops: ['Mercado Norte', 'Residencial Los Pinos', 'Escuela Primaria'], 
    estimatedTime: '3.5h', 
    color: '#3b82f6', 
    status: 'active',
    description: 'Cobertura de zona residencial norte',
    priority: 'media',
    vehicleAssigned: null,
    driverAssigned: null,
    dateCreated: new Date().toISOString()
  },
  { 
    id: 'route003', 
    name: 'Zona Sur', 
    type: 'fumigacion', 
    stops: ['Parque Industrial', 'Almacenes del Sur'], 
    estimatedTime: '6h', 
    color: '#f59e0b', 
    status: 'inactive',
    description: 'Fumigación de zona industrial',
    priority: 'baja',
    vehicleAssigned: null,
    driverAssigned: null,
    dateCreated: new Date().toISOString()
  },
  { 
    id: 'route004', 
    name: 'Zona Este', 
    type: 'recoleccion', 
    stops: ['Universidad', 'Centro Deportivo', 'Mall del Este', 'Terminal de Buses'], 
    estimatedTime: '5h', 
    color: '#8b5cf6', 
    status: 'active',
    description: 'Ruta educativa y comercial del este',
    priority: 'alta',
    vehicleAssigned: null,
    driverAssigned: null,
    dateCreated: new Date().toISOString()
  }
];

// Crear el contexto
const RoutesContext = createContext();

// Tipos de acciones
const ACTIONS = {
  SET_ROUTES: 'SET_ROUTES',
  ADD_ROUTE: 'ADD_ROUTE',
  UPDATE_ROUTE: 'UPDATE_ROUTE',
  DELETE_ROUTE: 'DELETE_ROUTE',
  TOGGLE_ROUTE_STATUS: 'TOGGLE_ROUTE_STATUS',
  ASSIGN_VEHICLE_TO_ROUTE: 'ASSIGN_VEHICLE_TO_ROUTE',
  ASSIGN_DRIVER_TO_ROUTE: 'ASSIGN_DRIVER_TO_ROUTE',
  UPDATE_ROUTE_PRIORITY: 'UPDATE_ROUTE_PRIORITY',
  ADD_STOP_TO_ROUTE: 'ADD_STOP_TO_ROUTE',
  REMOVE_STOP_FROM_ROUTE: 'REMOVE_STOP_FROM_ROUTE',
  REORDER_STOPS: 'REORDER_STOPS',
  LOAD_ROUTES: 'LOAD_ROUTES'
};

// Reducer para manejar el estado
const routesReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_ROUTES:
      return {
        ...state,
        routes: action.payload,
        loading: false
      };

    case ACTIONS.ADD_ROUTE:
      const newRoute = {
        id: `route${Date.now()}`,
        name: action.payload.name,
        type: action.payload.type || 'recoleccion',
        stops: action.payload.stops || [''],
        estimatedTime: action.payload.estimatedTime || '2h',
        color: action.payload.color || '#22c55e',
        status: 'active',
        description: action.payload.description || '',
        priority: action.payload.priority || 'media',
        vehicleAssigned: null,
        driverAssigned: null,
        dateCreated: new Date().toISOString(),
        ...action.payload
      };
      const updatedRoutes = [...state.routes, newRoute];
      localStorage.setItem('rmp_routes', JSON.stringify(updatedRoutes));
      return {
        ...state,
        routes: updatedRoutes
      };

    case ACTIONS.UPDATE_ROUTE:
      const { routeId, updates } = action.payload;
      const routesAfterUpdate = state.routes.map(route =>
        route.id === routeId
          ? { 
              ...route, 
              ...updates,
              dateModified: new Date().toISOString()
            }
          : route
      );
      localStorage.setItem('rmp_routes', JSON.stringify(routesAfterUpdate));
      return {
        ...state,
        routes: routesAfterUpdate
      };

    case ACTIONS.DELETE_ROUTE:
      const routesAfterDelete = state.routes.filter(route => route.id !== action.payload);
      localStorage.setItem('rmp_routes', JSON.stringify(routesAfterDelete));
      return {
        ...state,
        routes: routesAfterDelete
      };

    case ACTIONS.TOGGLE_ROUTE_STATUS:
      const routesAfterToggle = state.routes.map(route =>
        route.id === action.payload
          ? { 
              ...route, 
              status: route.status === 'active' ? 'inactive' : 'active',
              dateModified: new Date().toISOString()
            }
          : route
      );
      localStorage.setItem('rmp_routes', JSON.stringify(routesAfterToggle));
      return {
        ...state,
        routes: routesAfterToggle
      };

    case ACTIONS.ASSIGN_VEHICLE_TO_ROUTE:
      const { routeId: vehicleRouteId, vehicleId } = action.payload;
      const routesAfterVehicleAssign = state.routes.map(route =>
        route.id === vehicleRouteId
          ? { 
              ...route, 
              vehicleAssigned: vehicleId,
              dateModified: new Date().toISOString()
            }
          : route
      );
      localStorage.setItem('rmp_routes', JSON.stringify(routesAfterVehicleAssign));
      return {
        ...state,
        routes: routesAfterVehicleAssign
      };

    case ACTIONS.ASSIGN_DRIVER_TO_ROUTE:
      const { routeId: driverRouteId, driverId } = action.payload;
      const routesAfterDriverAssign = state.routes.map(route =>
        route.id === driverRouteId
          ? { 
              ...route, 
              driverAssigned: driverId,
              dateModified: new Date().toISOString()
            }
          : route
      );
      localStorage.setItem('rmp_routes', JSON.stringify(routesAfterDriverAssign));
      return {
        ...state,
        routes: routesAfterDriverAssign
      };

    case ACTIONS.UPDATE_ROUTE_PRIORITY:
      const { routeId: priorityRouteId, priority } = action.payload;
      const routesAfterPriorityUpdate = state.routes.map(route =>
        route.id === priorityRouteId
          ? { 
              ...route, 
              priority,
              dateModified: new Date().toISOString()
            }
          : route
      );
      localStorage.setItem('rmp_routes', JSON.stringify(routesAfterPriorityUpdate));
      return {
        ...state,
        routes: routesAfterPriorityUpdate
      };

    case ACTIONS.ADD_STOP_TO_ROUTE:
      const { routeId: stopRouteId, stop, index } = action.payload;
      const routesAfterStopAdd = state.routes.map(route => {
        if (route.id === stopRouteId) {
          const newStops = [...route.stops];
          if (typeof index === 'number') {
            newStops.splice(index, 0, stop);
          } else {
            newStops.push(stop);
          }
          return { 
            ...route, 
            stops: newStops,
            dateModified: new Date().toISOString()
          };
        }
        return route;
      });
      localStorage.setItem('rmp_routes', JSON.stringify(routesAfterStopAdd));
      return {
        ...state,
        routes: routesAfterStopAdd
      };

    case ACTIONS.REMOVE_STOP_FROM_ROUTE:
      const { routeId: removeStopRouteId, stopIndex } = action.payload;
      const routesAfterStopRemove = state.routes.map(route => {
        if (route.id === removeStopRouteId) {
          const newStops = route.stops.filter((_, index) => index !== stopIndex);
          return { 
            ...route, 
            stops: newStops,
            dateModified: new Date().toISOString()
          };
        }
        return route;
      });
      localStorage.setItem('rmp_routes', JSON.stringify(routesAfterStopRemove));
      return {
        ...state,
        routes: routesAfterStopRemove
      };

    case ACTIONS.REORDER_STOPS:
      const { routeId: reorderRouteId, fromIndex, toIndex } = action.payload;
      const routesAfterReorder = state.routes.map(route => {
        if (route.id === reorderRouteId) {
          const newStops = [...route.stops];
          const [movedStop] = newStops.splice(fromIndex, 1);
          newStops.splice(toIndex, 0, movedStop);
          return { 
            ...route, 
            stops: newStops,
            dateModified: new Date().toISOString()
          };
        }
        return route;
      });
      localStorage.setItem('rmp_routes', JSON.stringify(routesAfterReorder));
      return {
        ...state,
        routes: routesAfterReorder
      };

    case ACTIONS.LOAD_ROUTES:
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
  routes: [],
  loading: true,
  error: null
};

// Provider del contexto
export const RoutesProvider = ({ children }) => {
  const [state, dispatch] = useReducer(routesReducer, initialState);

  // Cargar rutas al iniciar
  useEffect(() => {
    loadRoutes();
  }, []);

  // Función para cargar rutas
  const loadRoutes = () => {
    dispatch({ type: ACTIONS.LOAD_ROUTES });
    
    try {
      const savedRoutes = localStorage.getItem('rmp_routes');
      
      if (savedRoutes) {
        const parsedRoutes = JSON.parse(savedRoutes);
        dispatch({ type: ACTIONS.SET_ROUTES, payload: parsedRoutes });
      } else {
        localStorage.setItem('rmp_routes', JSON.stringify(initialRoutes));
        dispatch({ type: ACTIONS.SET_ROUTES, payload: initialRoutes });
      }
    } catch (error) {
      console.error('Error loading routes:', error);
      dispatch({ type: ACTIONS.SET_ROUTES, payload: initialRoutes });
    }
  };

  // Función para agregar ruta
  const addRoute = (routeData) => {
    dispatch({ type: ACTIONS.ADD_ROUTE, payload: routeData });
  };

  // Función para actualizar ruta
  const updateRoute = (routeId, updates) => {
    dispatch({ type: ACTIONS.UPDATE_ROUTE, payload: { routeId, updates } });
  };

  // Función para eliminar ruta
  const deleteRoute = (routeId) => {
    dispatch({ type: ACTIONS.DELETE_ROUTE, payload: routeId });
  };

  // Función para cambiar estado de ruta
  const toggleRouteStatus = (routeId) => {
    dispatch({ type: ACTIONS.TOGGLE_ROUTE_STATUS, payload: routeId });
  };

  // Función para asignar vehículo a ruta
  const assignVehicleToRoute = (routeId, vehicleId) => {
    dispatch({ type: ACTIONS.ASSIGN_VEHICLE_TO_ROUTE, payload: { routeId, vehicleId } });
  };

  // Función para asignar conductor a ruta
  const assignDriverToRoute = (routeId, driverId) => {
    dispatch({ type: ACTIONS.ASSIGN_DRIVER_TO_ROUTE, payload: { routeId, driverId } });
  };

  // Función para actualizar prioridad de ruta
  const updateRoutePriority = (routeId, priority) => {
    dispatch({ type: ACTIONS.UPDATE_ROUTE_PRIORITY, payload: { routeId, priority } });
  };

  // Función para agregar parada a ruta
  const addStopToRoute = (routeId, stop, index = null) => {
    dispatch({ type: ACTIONS.ADD_STOP_TO_ROUTE, payload: { routeId, stop, index } });
  };

  // Función para remover parada de ruta
  const removeStopFromRoute = (routeId, stopIndex) => {
    dispatch({ type: ACTIONS.REMOVE_STOP_FROM_ROUTE, payload: { routeId, stopIndex } });
  };

  // Función para reordenar paradas
  const reorderStops = (routeId, fromIndex, toIndex) => {
    dispatch({ type: ACTIONS.REORDER_STOPS, payload: { routeId, fromIndex, toIndex } });
  };

  // Función para obtener rutas por tipo
  const getRoutesByType = (type) => {
    return state.routes.filter(route => route.type === type);
  };

  // Función para obtener rutas por estado
  const getRoutesByStatus = (status) => {
    return state.routes.filter(route => route.status === status);
  };

  // Función para obtener rutas por prioridad
  const getRoutesByPriority = (priority) => {
    return state.routes.filter(route => route.priority === priority);
  };

  // Función para obtener estadísticas de rutas
  const getRoutesStats = () => {
    const total = state.routes.length;
    const active = state.routes.filter(r => r.status === 'active').length;
    const inactive = state.routes.filter(r => r.status === 'inactive').length;
    const recoleccion = state.routes.filter(r => r.type === 'recoleccion').length;
    const fumigacion = state.routes.filter(r => r.type === 'fumigacion').length;
    const assigned = state.routes.filter(r => r.vehicleAssigned).length;
    const unassigned = total - assigned;
    
    const byPriority = {
      alta: state.routes.filter(r => r.priority === 'alta').length,
      media: state.routes.filter(r => r.priority === 'media').length,
      baja: state.routes.filter(r => r.priority === 'baja').length
    };

    return {
      total,
      active,
      inactive,
      recoleccion,
      fumigacion,
      assigned,
      unassigned,
      byPriority
    };
  };

  // Función para obtener ruta por ID
  const getRouteById = (routeId) => {
    return state.routes.find(route => route.id === routeId);
  };

  // Valor del contexto
  const value = {
    routes: state.routes,
    loading: state.loading,
    error: state.error,
    addRoute,
    updateRoute,
    deleteRoute,
    toggleRouteStatus,
    assignVehicleToRoute,
    assignDriverToRoute,
    updateRoutePriority,
    addStopToRoute,
    removeStopFromRoute,
    reorderStops,
    getRoutesByType,
    getRoutesByStatus,
    getRoutesByPriority,
    getRoutesStats,
    getRouteById,
    loadRoutes
  };

  return (
    <RoutesContext.Provider value={value}>
      {children}
    </RoutesContext.Provider>
  );
};

// Hook para usar el contexto
export const useRoutes = () => {
  const context = useContext(RoutesContext);
  if (!context) {
    throw new Error('useRoutes debe ser usado dentro de un RoutesProvider');
  }
  return context;
};

export default RoutesContext;