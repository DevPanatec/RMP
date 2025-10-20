import { createContext, useContext, useReducer } from 'react';
import supabaseClient from '../utils/supabaseClient';

// Crear el contexto
const SupabaseReportsContext = createContext();

// Tipos de acciones
const ACTIONS = {
  SET_COMPLETED_ROUTES: 'SET_COMPLETED_ROUTES',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR'
};

// Reducer para manejar el estado
const reportsReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_COMPLETED_ROUTES:
      return {
        ...state,
        completedRoutes: action.payload,
        loading: false,
        error: null
      };

    case ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
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
  completedRoutes: [],
  loading: false,
  error: null
};

// Provider del contexto
export const SupabaseReportsProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reportsReducer, initialState);

  // Función para obtener rutas completadas  
  const getCompletedRoutes = async (dateRange) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    
    try {
      console.log('🔗 Conectando a Supabase para cargar rutas del período:', dateRange);
      
      // Usar el cliente real de Supabase
      const result = await supabaseClient.getCompletedRoutes(dateRange);
      
      // Formatear datos para la interfaz
      const formattedRoutes = (result.rows || []).map(route => {
        const paradas = Array.isArray(route.paradas) ? route.paradas : JSON.parse(route.paradas || '[]');
        
        return {
          id: route.id,
          nombre: route.nombre,
          conductor: route.conductor_nombre || 'Sin asignar',
          vehiculo: route.vehiculo_placa || route.vehiculo_info || 'Sin asignar',
          fecha_completada: route.fecha_completada ? new Date(route.fecha_completada).toLocaleDateString('es-ES') : route.fecha_programada,
          hora_inicio: route.hora_inicio || '08:00',
          hora_fin: route.hora_fin || '12:00',
          tipo_servicio: route.tipo_servicio,
          proyecto: route.proyecto_nombre,
          observaciones: route.observaciones,
          paradas: paradas.map((parada, index) => ({
            orden: parada.orden || index + 1,
            direccion: parada.direccion || `Parada ${index + 1}`,
            tipo_carga: parada.tipo_carga || 'media',
            completada: parada.completada !== false, // Default true para rutas completadas
            hora: parada.hora || `${8 + Math.floor(index * 0.5)}:${(index * 30) % 60 < 10 ? '0' : ''}${(index * 30) % 60}`
          }))
        };
      });
      
      dispatch({ type: ACTIONS.SET_COMPLETED_ROUTES, payload: formattedRoutes });
      return formattedRoutes;
    } catch (error) {
      console.error('Error loading completed routes:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Función para exportar datos a diferentes formatos
  const exportRoutes = (routes, format = 'csv') => {
    if (format === 'csv') {
      const csvData = [
        ['Ruta', 'Conductor', 'Vehículo', 'Fecha', 'Hora Inicio', 'Hora Fin', 'Tipo Servicio', 'Parada', 'Dirección', 'Tipo Carga', 'Hora Parada']
      ];
      
      routes.forEach(route => {
        route.paradas.forEach(parada => {
          csvData.push([
            route.nombre,
            route.conductor,
            route.vehiculo,
            route.fecha_completada,
            route.hora_inicio,
            route.hora_fin,
            route.tipo_servicio === 'recoleccion' ? 'Recolección' : 'Fumigación',
            parada.orden,
            parada.direccion,
            parada.tipo_carga,
            parada.hora
          ]);
        });
      });
      
      return csvData.map(row => row.join(',')).join('\n');
    }
    
    if (format === 'text') {
      let content = `HISTORIAL DE RUTAS - RMP\n`;
      content += `Fecha de generación: ${new Date().toLocaleDateString('es-ES')}\n\n`;
      
      routes.forEach(route => {
        content += `\n=== RUTA: ${route.nombre} ===\n`;
        content += `Conductor: ${route.conductor}\n`;
        content += `Vehículo: ${route.vehiculo}\n`;
        content += `Fecha: ${route.fecha_completada}\n`;
        content += `Horario: ${route.hora_inicio} - ${route.hora_fin}\n`;
        content += `Tipo de servicio: ${route.tipo_servicio === 'recoleccion' ? 'Recolección' : 'Fumigación'}\n`;
        if (route.proyecto) content += `Proyecto: ${route.proyecto}\n`;
        content += `\nParadas realizadas:\n`;
        
        route.paradas.forEach(parada => {
          content += `${parada.orden}. ${parada.direccion}\n`;
          content += `   - Tipo de carga: ${parada.tipo_carga}\n`;
          content += `   - Hora: ${parada.hora}\n`;
          content += `   - Estado: ${parada.completada ? 'Completada' : 'Pendiente'}\n`;
        });
        
        if (route.observaciones) {
          content += `\nObservaciones: ${route.observaciones}\n`;
        }
      });
      
      return content;
    }
  };

  // Función para obtener estadísticas
  const getReportsStats = (routes) => {
    const totalRoutes = routes.length;
    const totalStops = routes.reduce((sum, route) => sum + route.paradas.length, 0);

    const serviceTypes = routes.reduce((acc, route) => {
      acc[route.tipo_servicio] = (acc[route.tipo_servicio] || 0) + 1;
      return acc;
    }, {});

    const cargoTypes = routes.reduce((acc, route) => {
      route.paradas.forEach(parada => {
        acc[parada.tipo_carga] = (acc[parada.tipo_carga] || 0) + 1;
      });
      return acc;
    }, {});

    return {
      totalRoutes,
      totalStops,
      serviceTypes,
      cargoTypes,
      avgStopsPerRoute: totalRoutes > 0 ? (totalStops / totalRoutes).toFixed(1) : 0
    };
  };

  // Función para guardar resumen de ruta completada
  const saveCompletedRoute = async (routeData) => {
    try {
      console.log('💾 Guardando resumen de ruta completada:', routeData);
      const result = await supabaseClient.saveRouteCompletionReport(routeData);
      console.log('✅ Resumen guardado exitosamente:', result);
      return result;
    } catch (error) {
      console.error('❌ Error guardando resumen de ruta:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Función para obtener resúmenes de rutas completadas por conductor
  const getCompletionReportsByDriver = async (driverName) => {
    try {
      const result = await supabaseClient.getRouteCompletionReportsByDriver(driverName);
      return result.rows || [];
    } catch (error) {
      console.error('Error loading driver completion reports:', error);
      throw error;
    }
  };

  // Valor del contexto
  const value = {
    completedRoutes: state.completedRoutes,
    loading: state.loading,
    error: state.error,
    getCompletedRoutes,
    exportRoutes,
    getReportsStats,
    saveCompletedRoute,
    getCompletionReportsByDriver
  };

  return (
    <SupabaseReportsContext.Provider value={value}>
      {children}
    </SupabaseReportsContext.Provider>
  );
};

// Hook para usar el contexto
export const useSupabaseReports = () => {
  const context = useContext(SupabaseReportsContext);
  if (!context) {
    throw new Error('useSupabaseReports debe ser usado dentro de un SupabaseReportsProvider');
  }
  return context;
};

export default SupabaseReportsContext;