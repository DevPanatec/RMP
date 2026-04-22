import { createContext, useContext } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const RoutesContext = createContext();

export const RoutesProvider = ({ children }) => {
  const routesData = useQuery(api.rutas.list);

  const addRouteMutation = useMutation(api.rutas.add);
  const updateRouteMutation = useMutation(api.rutas.update);
  const deleteRouteMutation = useMutation(api.rutas.remove);

  const routes = routesData || [];
  const loading = routesData === undefined;

  const addRoute = async (routeData) => {
    try {
      const id = await addRouteMutation(routeData);
      return id;
    } catch (error) {
      console.error('Error adding route:', error);
      throw error;
    }
  };

  const updateRoute = async (routeId, updates) => {
    try {
      await updateRouteMutation({ id: routeId, ...updates });
      return { success: true };
    } catch (error) {
      console.error('Error updating route:', error);
      throw error;
    }
  };

  const deleteRoute = async (routeId) => {
    try {
      await deleteRouteMutation({ id: routeId });
      return { success: true };
    } catch (error) {
      console.error('Error deleting route:', error);
      return { success: false, error: error.message };
    }
  };

  const getRoutesByType = (type) => {
    return routes.filter(route => route.tipo_servicio === type);
  };

  const getRoutesByStatus = (status) => {
    return routes.filter(route => route.estado === status);
  };

  const getRoutesStats = () => {
    const total = routes.length;
    const programada = routes.filter(r => r.estado === 'programada').length;
    const enProgreso = routes.filter(r => r.estado === 'en_progreso').length;
    const completada = routes.filter(r => r.estado === 'completada').length;
    const cancelada = routes.filter(r => r.estado === 'cancelada').length;
    const recoleccion = routes.filter(r => r.tipo_servicio === 'recoleccion').length;
    const fumigacion = routes.filter(r => r.tipo_servicio === 'fumigacion').length;

    return {
      total,
      programada,
      enProgreso,
      completada,
      cancelada,
      recoleccion,
      fumigacion,
      // Backwards compatibility
      active: enProgreso,
      inactive: cancelada,
    };
  };

  const getRouteById = (routeId) => {
    return routes.find(route => route._id === routeId || route.id === routeId);
  };

  const value = {
    routes,
    loading,
    addRoute,
    updateRoute,
    deleteRoute,
    getRoutesByType,
    getRoutesByStatus,
    getRoutesStats,
    getRouteById,
  };

  return <RoutesContext.Provider value={value}>{children}</RoutesContext.Provider>;
};

export const useRoutes = () => {
  const context = useContext(RoutesContext);
  if (!context) throw new Error('useRoutes must be used within RoutesProvider');
  return context;
};

export const useSupabaseRoutes = useRoutes;
export default RoutesContext;
