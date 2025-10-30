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
      await addRouteMutation(routeData);
      return { success: true };
    } catch (error) {
      console.error('Error adding route:', error);
      return { success: false, error: error.message };
    }
  };

  const updateRoute = async (routeId, updates) => {
    try {
      await updateRouteMutation({ id: routeId, ...updates });
      return { success: true };
    } catch (error) {
      console.error('Error updating route:', error);
      return { success: false, error: error.message };
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

  const toggleRouteStatus = async (routeId) => {
    const route = routes.find(r => r._id === routeId);
    if (route) {
      const newStatus = route.estado === 'activa' ? 'inactiva' : 'activa';
      return updateRoute(routeId, { estado: newStatus });
    }
  };

  const assignVehicleToRoute = async (routeId, vehicleId) => {
    return updateRoute(routeId, { vehiculo_id: vehicleId });
  };

  const assignDriverToRoute = async (routeId, driverId) => {
    return updateRoute(routeId, { conductor_id: driverId });
  };

  const updateRoutePriority = async (routeId, priority) => {
    return updateRoute(routeId, { prioridad: priority });
  };

  const getRoutesByType = (type) => {
    return routes.filter(route => route.tipo === type);
  };

  const getRoutesByStatus = (status) => {
    return routes.filter(route => route.estado === status);
  };

  const getRoutesByPriority = (priority) => {
    return routes.filter(route => route.prioridad === priority);
  };

  const getRoutesStats = () => {
    const total = routes.length;
    const active = routes.filter(r => r.estado === 'activa').length;
    const inactive = routes.filter(r => r.estado === 'inactiva').length;
    const recoleccion = routes.filter(r => r.tipo === 'recoleccion').length;
    const fumigacion = routes.filter(r => r.tipo === 'fumigacion').length;
    const assigned = routes.filter(r => r.vehiculo_id).length;
    const unassigned = total - assigned;

    const byPriority = {
      alta: routes.filter(r => r.prioridad === 'alta').length,
      media: routes.filter(r => r.prioridad === 'media').length,
      baja: routes.filter(r => r.prioridad === 'baja').length
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

  const getRouteById = (routeId) => {
    return routes.find(route => route._id === routeId);
  };

  const value = {
    routes,
    loading,
    addRoute,
    updateRoute,
    deleteRoute,
    toggleRouteStatus,
    assignVehicleToRoute,
    assignDriverToRoute,
    updateRoutePriority,
    getRoutesByType,
    getRoutesByStatus,
    getRoutesByPriority,
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
