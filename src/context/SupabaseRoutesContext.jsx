import { createContext, useContext, useReducer, useEffect } from 'react';
import supabaseClient from '../utils/supabaseClient';

// Crear el contexto
const SupabaseRoutesContext = createContext();

// Tipos de acciones
const ACTIONS = {
  SET_ROUTES: 'SET_ROUTES',
  ADD_ROUTE: 'ADD_ROUTE',
  UPDATE_ROUTE: 'UPDATE_ROUTE',
  DELETE_ROUTE: 'DELETE_ROUTE',
  TOGGLE_ROUTE_STATUS: 'TOGGLE_ROUTE_STATUS',
  LOAD_ROUTES: 'LOAD_ROUTES',
  SET_ERROR: 'SET_ERROR'
};

// Reducer para manejar el estado
const routesReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_ROUTES:
      return {
        ...state,
        routes: action.payload,
        loading: false,
        error: null
      };

    case ACTIONS.ADD_ROUTE:
      return {
        ...state,
        routes: [...state.routes, action.payload]
      };

    case ACTIONS.UPDATE_ROUTE:
      return {
        ...state,
        routes: state.routes.map(route =>
          route.id === action.payload.id ? action.payload : route
        )
      };

    case ACTIONS.DELETE_ROUTE:
      return {
        ...state,
        routes: state.routes.filter(route => route.id !== action.payload)
      };

    case ACTIONS.TOGGLE_ROUTE_STATUS:
      return {
        ...state,
        routes: state.routes.map(route =>
          route.id === action.payload.routeId
            ? { ...route, status: action.payload.newStatus }
            : route
        )
      };

    case ACTIONS.LOAD_ROUTES:
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
  routes: [],
  loading: true,
  error: null
};

// Provider del contexto
export const SupabaseRoutesProvider = ({ children }) => {
  const [state, dispatch] = useReducer(routesReducer, initialState);

  // Cargar rutas al iniciar
  useEffect(() => {
    loadRoutes();
  }, []);

  // Función para cargar rutas
  const loadRoutes = async () => {
    dispatch({ type: ACTIONS.LOAD_ROUTES });
    
    try {
      const result = await supabaseClient.getRoutes();
      
      // Formatear datos para que coincidan con la estructura esperada
      const formattedRoutes = (result.rows || []).map(route => {
        const paradas = Array.isArray(route.paradas) ? route.paradas : JSON.parse(route.paradas || '[]');
        
        // Convertir paradas a coordenadas para compatibilidad con MapComponent
        const coordenadasCompletas = paradas
          .filter(parada => parada.latitud && parada.longitud)
          .map(parada => [parseFloat(parada.latitud), parseFloat(parada.longitud)]);

        return {
          id: route.id,
          name: route.nombre,
          nombre: route.nombre,
          descripcion: route.descripcion,
          type: route.tipo_servicio,
          tipoServicio: route.tipo_servicio,
          stops: paradas,
          paradas: paradas,
          coordenadasCompletas: coordenadasCompletas,
          distanciaTotal: route.distancia_total || 0,
          tiempoEstimado: route.tiempo_estimado || 0,
          estimatedTime: route.tiempo_estimado ? `${Math.ceil(route.tiempo_estimado / 60)}h` : '1h',
          color: route.color || '#22c55e',
          status: route.estado === 'programada' ? 'active' : 'inactive',
          estado: route.estado,
          fecha_programada: route.fecha_programada,
          hora_inicio: route.hora_inicio,
          hora_fin: route.hora_fin,
          proyecto: route.proyecto_nombre,
          proyectoId: route.proyecto_id,
          createdAt: route.created_at,
          updatedAt: route.updated_at
        };
      });
      
      dispatch({ type: ACTIONS.SET_ROUTES, payload: formattedRoutes });
    } catch (error) {
      console.error('Error loading routes:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
    }
  };

  // Función para agregar ruta
  const addRoute = async (routeData) => {
    try {
      // Usar las paradas directamente si ya tienen el formato correcto
      const paradas = Array.isArray(routeData.paradas) && routeData.paradas.length > 0 
        ? routeData.paradas
        : (routeData.stops || []).map((stop, index) => ({
            orden: index + 1,
            direccion: typeof stop === 'string' ? stop : stop.direccion,
            direccion_completa: typeof stop === 'object' ? stop.direccion_completa : null,
            latitud: typeof stop === 'object' && stop.latitud ? stop.latitud : 4.6097100 + (Math.random() - 0.5) * 0.1,
            longitud: typeof stop === 'object' && stop.longitud ? stop.longitud : -74.0817500 + (Math.random() - 0.5) * 0.1,
            completada: false
          }));
      
      const { data, error } = await supabaseClient.client
        .from('rutas')
        .insert([{
          nombre: routeData.name || routeData.nombre,
          descripcion: routeData.descripcion || '',
          tipo_servicio: routeData.type || routeData.tipoServicio || 'recoleccion',
          paradas: JSON.stringify(paradas),
          distancia_total: routeData.distanciaTotal || 10,
          tiempo_estimado: routeData.tiempoEstimado || (paradas.length * 30) || 60,
          color: routeData.color || '#22c55e',
          estado: routeData.estado || 'programada',
          fecha_programada: routeData.fechaProgramada || new Date().toISOString().split('T')[0]
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      // Formatear para el estado  
      const formattedRoute = {
        id: data.id,
        name: data.nombre,
        nombre: data.nombre,
        descripcion: data.descripcion,
        type: data.tipo_servicio,
        tipoServicio: data.tipo_servicio,
        stops: routeData.stops || [],
        paradas: JSON.parse(data.paradas || '[]'),
        coordenadasCompletas: paradas.map(p => [p.latitud, p.longitud]),
        distanciaTotal: data.distancia_total || 0,
        tiempoEstimado: data.tiempo_estimado || 0,
        estimatedTime: `${Math.ceil((data.tiempo_estimado || 60) / 60)}h`,
        color: data.color || '#22c55e',
        status: data.estado === 'programada' ? 'active' : 'inactive',
        estado: data.estado,
        fecha_programada: data.fecha_programada,
        hora_inicio: data.hora_inicio,
        hora_fin: data.hora_fin,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      dispatch({ type: ACTIONS.ADD_ROUTE, payload: formattedRoute });
      return formattedRoute;
    } catch (error) {
      console.error('Error adding route:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Función para actualizar ruta
  const updateRoute = async (routeId, updates) => {
    try {
      const updateData = {};
      
      if (updates.name || updates.nombre) updateData.nombre = updates.name || updates.nombre;
      if (updates.descripcion) updateData.descripcion = updates.descripcion;
      if (updates.type || updates.tipoServicio) updateData.tipo_servicio = updates.type || updates.tipoServicio;
      
      if (updates.stops || updates.paradas) {
        // Usar las paradas directamente si ya tienen el formato correcto
        const paradas = Array.isArray(updates.paradas) && updates.paradas.length > 0
          ? updates.paradas
          : (updates.stops || []).map((stop, index) => {
              if (typeof stop === 'string') {
                return {
                  orden: index + 1,
                  direccion: stop,
                  latitud: 4.6097100 + (Math.random() - 0.5) * 0.1,
                  longitud: -74.0817500 + (Math.random() - 0.5) * 0.1,
                  completada: false
                };
              }
              return {
                ...stop,
                orden: index + 1
              };
            });
        updateData.paradas = JSON.stringify(paradas);
      }
      
      if (updates.distanciaTotal !== undefined) updateData.distancia_total = updates.distanciaTotal;
      if (updates.tiempoEstimado !== undefined) updateData.tiempo_estimado = updates.tiempoEstimado;
      if (updates.color) updateData.color = updates.color;
      if (updates.status) {
        updateData.estado = updates.status === 'active' ? 'programada' : 'cancelada';
      }
      
      updateData.updated_at = new Date().toISOString();
      
      const { data, error } = await supabaseClient.client
        .from('rutas')
        .update(updateData)
        .eq('id', routeId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Formatear ruta actualizada
      const paradas = JSON.parse(data.paradas || '[]');
      const formattedRoute = {
        id: data.id,
        name: data.nombre,
        nombre: data.nombre,
        descripcion: data.descripcion,
        type: data.tipo_servicio,
        tipoServicio: data.tipo_servicio,
        stops: updates.stops || paradas.map(p => p.direccion),
        paradas: paradas,
        coordenadasCompletas: paradas.map(p => [p.latitud, p.longitud]),
        distanciaTotal: data.distancia_total || 0,
        tiempoEstimado: data.tiempo_estimado || 0,
        estimatedTime: `${Math.ceil((data.tiempo_estimado || 60) / 60)}h`,
        color: data.color || '#22c55e',
        status: data.estado === 'programada' ? 'active' : 'inactive',
        estado: data.estado,
        fecha_programada: data.fecha_programada,
        hora_inicio: data.hora_inicio,
        hora_fin: data.hora_fin,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      dispatch({ type: ACTIONS.UPDATE_ROUTE, payload: formattedRoute });
      return formattedRoute;
    } catch (error) {
      console.error('Error updating route:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Función para eliminar ruta (marcar como inactiva)
  const deleteRoute = async (routeId) => {
    try {
      const query = `
        UPDATE rutas 
        SET activa = false, updated_at = now()
        WHERE id = '${routeId}'
        RETURNING *;
      `;
      
      await supabaseClient.executeSQL(query);
      dispatch({ type: ACTIONS.DELETE_ROUTE, payload: routeId });
    } catch (error) {
      console.error('Error deleting route:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Función para cambiar estado de ruta
  const toggleRouteStatus = async (routeId) => {
    try {
      const route = state.routes.find(r => r.id === routeId);
      if (!route) return;
      
      const newStatus = route.status === 'active' ? 'inactive' : 'active';
      const newEstado = newStatus === 'active' ? 'programada' : 'cancelada';
      
      const query = `
        UPDATE rutas 
        SET estado = '${newEstado}', updated_at = now()
        WHERE id = '${routeId}'
        RETURNING *;
      `;
      
      await supabaseClient.executeSQL(query);
      dispatch({ 
        type: ACTIONS.TOGGLE_ROUTE_STATUS, 
        payload: { routeId, newStatus } 
      });
    } catch (error) {
      console.error('Error toggling route status:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Función para obtener estadísticas
  const getRoutesStats = () => {
    const total = state.routes.length;
    const active = state.routes.filter(r => r.status === 'active').length;
    const inactive = state.routes.filter(r => r.status === 'inactive').length;
    
    const recoleccion = state.routes.filter(r => r.type === 'recoleccion').length;
    const fumigacion = state.routes.filter(r => r.type === 'fumigacion').length;
    
    const totalStops = state.routes.reduce((sum, r) => sum + (r.stops?.length || 0), 0);

    return {
      total,
      active,
      inactive,
      recoleccion,
      fumigacion,
      totalStops
    };
  };

  // Función para buscar rutas
  const searchRoutes = (searchTerm, serviceType = 'all') => {
    let filteredRoutes = state.routes;
    
    if (serviceType !== 'all') {
      filteredRoutes = filteredRoutes.filter(r => r.type === serviceType);
    }
    
    if (searchTerm) {
      filteredRoutes = filteredRoutes.filter(route =>
        route.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        route.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        route.stops?.some(stop => 
          stop.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    return filteredRoutes;
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
    getRoutesStats,
    searchRoutes,
    loadRoutes
  };

  return (
    <SupabaseRoutesContext.Provider value={value}>
      {children}
    </SupabaseRoutesContext.Provider>
  );
};

// Hook para usar el contexto
export const useSupabaseRoutes = () => {
  const context = useContext(SupabaseRoutesContext);
  if (!context) {
    throw new Error('useSupabaseRoutes debe ser usado dentro de un SupabaseRoutesProvider');
  }
  return context;
};

export default SupabaseRoutesContext;