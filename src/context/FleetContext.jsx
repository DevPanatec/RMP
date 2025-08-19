import { createContext, useContext, useReducer, useEffect } from 'react';
import { appData } from '../data/mockData';

// Crear el contexto
const FleetContext = createContext();

// Tipos de acciones
const ACTIONS = {
  SET_VEHICLES: 'SET_VEHICLES',
  ADD_VEHICLE: 'ADD_VEHICLE',
  UPDATE_VEHICLE: 'UPDATE_VEHICLE',
  DELETE_VEHICLE: 'DELETE_VEHICLE',
  UPDATE_VEHICLE_STATUS: 'UPDATE_VEHICLE_STATUS',
  UPDATE_VEHICLE_LOCATION: 'UPDATE_VEHICLE_LOCATION',
  ASSIGN_ROUTE: 'ASSIGN_ROUTE',
  ASSIGN_DRIVER: 'ASSIGN_DRIVER',
  UPDATE_FUEL: 'UPDATE_FUEL',
  LOAD_VEHICLES: 'LOAD_VEHICLES'
};

// Reducer para manejar el estado
const fleetReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_VEHICLES:
      return {
        ...state,
        vehicles: action.payload,
        loading: false
      };

    case ACTIONS.ADD_VEHICLE:
      const newVehicle = {
        id: `TR-${String(Date.now()).slice(-3)}`,
        conductor: 'Sin Asignar',
        lat: 8.983333,
        lng: -79.516670,
        estado: 'Disponible',
        rutaAsignada: null,
        tipoServicio: 'recoleccion',
        velocidad: 0,
        combustible: 100,
        ultimaActualizacion: new Date().toISOString(),
        paradaActual: 0,
        totalParadas: 0,
        pesoAcumulado: 0,
        direccion: 0,
        historialPosiciones: [],
        ...action.payload,
        fechaCreacion: new Date().toISOString()
      };
      const updatedVehicles = [...state.vehicles, newVehicle];
      localStorage.setItem('rmp_fleet', JSON.stringify(updatedVehicles));
      return {
        ...state,
        vehicles: updatedVehicles
      };

    case ACTIONS.UPDATE_VEHICLE:
      const { vehicleId, updates } = action.payload;
      const vehiclesAfterUpdate = state.vehicles.map(vehicle =>
        vehicle.id === vehicleId
          ? { 
              ...vehicle, 
              ...updates, 
              ultimaActualizacion: new Date().toISOString() 
            }
          : vehicle
      );
      localStorage.setItem('rmp_fleet', JSON.stringify(vehiclesAfterUpdate));
      return {
        ...state,
        vehicles: vehiclesAfterUpdate
      };

    case ACTIONS.DELETE_VEHICLE:
      const vehiclesAfterDelete = state.vehicles.filter(vehicle => vehicle.id !== action.payload);
      localStorage.setItem('rmp_fleet', JSON.stringify(vehiclesAfterDelete));
      return {
        ...state,
        vehicles: vehiclesAfterDelete
      };

    case ACTIONS.UPDATE_VEHICLE_STATUS:
      const { vehicleId: statusVehicleId, status } = action.payload;
      const vehiclesAfterStatusUpdate = state.vehicles.map(vehicle =>
        vehicle.id === statusVehicleId
          ? { 
              ...vehicle, 
              estado: status,
              ultimaActualizacion: new Date().toISOString()
            }
          : vehicle
      );
      localStorage.setItem('rmp_fleet', JSON.stringify(vehiclesAfterStatusUpdate));
      return {
        ...state,
        vehicles: vehiclesAfterStatusUpdate
      };

    case ACTIONS.UPDATE_VEHICLE_LOCATION:
      const { vehicleId: locationVehicleId, lat, lng, speed, direction } = action.payload;
      const vehiclesAfterLocationUpdate = state.vehicles.map(vehicle =>
        vehicle.id === locationVehicleId
          ? {
              ...vehicle,
              lat,
              lng,
              velocidad: speed || vehicle.velocidad,
              direccion: direction || vehicle.direccion,
              ultimaActualizacion: new Date().toISOString(),
              historialPosiciones: [
                ...vehicle.historialPosiciones.slice(-10), // Mantener solo últimas 10 posiciones
                {
                  lat,
                  lng,
                  timestamp: new Date().toISOString()
                }
              ]
            }
          : vehicle
      );
      localStorage.setItem('rmp_fleet', JSON.stringify(vehiclesAfterLocationUpdate));
      return {
        ...state,
        vehicles: vehiclesAfterLocationUpdate
      };

    case ACTIONS.ASSIGN_ROUTE:
      const { vehicleId: routeVehicleId, routeName } = action.payload;
      const vehiclesAfterRouteAssign = state.vehicles.map(vehicle =>
        vehicle.id === routeVehicleId
          ? {
              ...vehicle,
              rutaAsignada: routeName,
              estado: routeName ? 'En ruta' : 'Disponible',
              ultimaActualizacion: new Date().toISOString()
            }
          : vehicle
      );
      localStorage.setItem('rmp_fleet', JSON.stringify(vehiclesAfterRouteAssign));
      return {
        ...state,
        vehicles: vehiclesAfterRouteAssign
      };

    case ACTIONS.ASSIGN_DRIVER:
      const { vehicleId: driverVehicleId, driverName } = action.payload;
      const vehiclesAfterDriverAssign = state.vehicles.map(vehicle =>
        vehicle.id === driverVehicleId
          ? {
              ...vehicle,
              conductor: driverName,
              ultimaActualizacion: new Date().toISOString()
            }
          : vehicle
      );
      localStorage.setItem('rmp_fleet', JSON.stringify(vehiclesAfterDriverAssign));
      return {
        ...state,
        vehicles: vehiclesAfterDriverAssign
      };

    case ACTIONS.UPDATE_FUEL:
      const { vehicleId: fuelVehicleId, fuelLevel } = action.payload;
      const vehiclesAfterFuelUpdate = state.vehicles.map(vehicle =>
        vehicle.id === fuelVehicleId
          ? {
              ...vehicle,
              combustible: Math.max(0, Math.min(100, fuelLevel)),
              ultimaActualizacion: new Date().toISOString()
            }
          : vehicle
      );
      localStorage.setItem('rmp_fleet', JSON.stringify(vehiclesAfterFuelUpdate));
      return {
        ...state,
        vehicles: vehiclesAfterFuelUpdate
      };

    case ACTIONS.LOAD_VEHICLES:
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
  vehicles: [],
  loading: true,
  error: null
};

// Provider del contexto
export const FleetProvider = ({ children }) => {
  const [state, dispatch] = useReducer(fleetReducer, initialState);

  // Cargar flota al iniciar
  useEffect(() => {
    loadFleet();
  }, []);

  // Función para cargar flota
  const loadFleet = () => {
    dispatch({ type: ACTIONS.LOAD_VEHICLES });
    
    try {
      const savedFleet = localStorage.getItem('rmp_fleet');
      
      if (savedFleet) {
        const parsedFleet = JSON.parse(savedFleet);
        dispatch({ type: ACTIONS.SET_VEHICLES, payload: parsedFleet });
      } else {
        // Normalizar datos iniciales de mockData
        const normalizedVehicles = appData.camiones.map(camion => ({
          ...camion,
          tipoServicio: camion.tipoServicio || 'recoleccion',
          fechaCreacion: new Date().toISOString()
        }));
        localStorage.setItem('rmp_fleet', JSON.stringify(normalizedVehicles));
        dispatch({ type: ACTIONS.SET_VEHICLES, payload: normalizedVehicles });
      }
    } catch (error) {
      console.error('Error loading fleet:', error);
      const normalizedVehicles = appData.camiones.map(camion => ({
        ...camion,
        tipoServicio: camion.tipoServicio || 'recoleccion',
        fechaCreacion: new Date().toISOString()
      }));
      dispatch({ type: ACTIONS.SET_VEHICLES, payload: normalizedVehicles });
    }
  };

  // Función para agregar vehículo
  const addVehicle = (vehicleData) => {
    dispatch({ type: ACTIONS.ADD_VEHICLE, payload: vehicleData });
  };

  // Función para actualizar vehículo
  const updateVehicle = (vehicleId, updates) => {
    dispatch({ type: ACTIONS.UPDATE_VEHICLE, payload: { vehicleId, updates } });
  };

  // Función para eliminar vehículo
  const deleteVehicle = (vehicleId) => {
    dispatch({ type: ACTIONS.DELETE_VEHICLE, payload: vehicleId });
  };

  // Función para actualizar estado del vehículo
  const updateVehicleStatus = (vehicleId, status) => {
    dispatch({ type: ACTIONS.UPDATE_VEHICLE_STATUS, payload: { vehicleId, status } });
  };

  // Función para actualizar ubicación del vehículo
  const updateVehicleLocation = (vehicleId, lat, lng, speed = null, direction = null) => {
    dispatch({ type: ACTIONS.UPDATE_VEHICLE_LOCATION, payload: { vehicleId, lat, lng, speed, direction } });
  };

  // Función para asignar ruta
  const assignRoute = (vehicleId, routeName) => {
    dispatch({ type: ACTIONS.ASSIGN_ROUTE, payload: { vehicleId, routeName } });
  };

  // Función para asignar conductor
  const assignDriver = (vehicleId, driverName) => {
    dispatch({ type: ACTIONS.ASSIGN_DRIVER, payload: { vehicleId, driverName } });
  };

  // Función para actualizar combustible
  const updateFuel = (vehicleId, fuelLevel) => {
    dispatch({ type: ACTIONS.UPDATE_FUEL, payload: { vehicleId, fuelLevel } });
  };

  // Función para obtener vehículos por estado
  const getVehiclesByStatus = (status) => {
    return state.vehicles.filter(vehicle => vehicle.estado === status);
  };

  // Función para obtener vehículos por tipo de servicio
  const getVehiclesByService = (serviceType) => {
    return state.vehicles.filter(vehicle => vehicle.tipoServicio === serviceType);
  };

  // Función para obtener estadísticas de la flota
  const getFleetStats = () => {
    const total = state.vehicles.length;
    const available = state.vehicles.filter(v => v.estado === 'Disponible').length;
    const inRoute = state.vehicles.filter(v => v.estado === 'En ruta').length;
    const maintenance = state.vehicles.filter(v => v.estado === 'Mantenimiento').length;
    const recoleccion = state.vehicles.filter(v => v.tipoServicio === 'recoleccion').length;
    const fumigacion = state.vehicles.filter(v => v.tipoServicio === 'fumigacion').length;
    
    const avgFuel = total > 0 
      ? (state.vehicles.reduce((sum, v) => sum + v.combustible, 0) / total).toFixed(1)
      : 0;
    
    const lowFuel = state.vehicles.filter(v => v.combustible < 30).length;

    return {
      total,
      available,
      inRoute,
      maintenance,
      recoleccion,
      fumigacion,
      avgFuel,
      lowFuel
    };
  };

  // Función para obtener vehículo por ID
  const getVehicleById = (vehicleId) => {
    return state.vehicles.find(vehicle => vehicle.id === vehicleId);
  };

  // Valor del contexto
  const value = {
    vehicles: state.vehicles,
    loading: state.loading,
    error: state.error,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    updateVehicleStatus,
    updateVehicleLocation,
    assignRoute,
    assignDriver,
    updateFuel,
    getVehiclesByStatus,
    getVehiclesByService,
    getFleetStats,
    getVehicleById,
    loadFleet
  };

  return (
    <FleetContext.Provider value={value}>
      {children}
    </FleetContext.Provider>
  );
};

// Hook para usar el contexto
export const useFleet = () => {
  const context = useContext(FleetContext);
  if (!context) {
    throw new Error('useFleet debe ser usado dentro de un FleetProvider');
  }
  return context;
};

export default FleetContext;