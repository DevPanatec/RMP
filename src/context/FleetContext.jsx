import { createContext, useContext } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useDemoMode } from '../hooks/useDemoMode';
import { DEMO_VEHICLES } from '../utils/demoData';

const FleetContext = createContext();

export const FleetProvider = ({ children }) => {
  const { isDemoMode } = useDemoMode();

  // Convex Queries
  const vehiclesData = useQuery(api.vehiculos.list);
  const fleetStatsData = useQuery(api.vehiculos.getStats);

  // Convex Mutations
  const addVehicleMutation = useMutation(api.vehiculos.add);
  const updateVehicleMutation = useMutation(api.vehiculos.update);
  const deleteVehicleMutation = useMutation(api.vehiculos.remove);
  const updateGPSMutation = useMutation(api.vehiculos.updateGPS);
  const updateEstadoMutation = useMutation(api.vehiculos.updateEstado);

  const vehicles = isDemoMode ? DEMO_VEHICLES : (vehiclesData || []);
  const loading = vehiclesData === undefined;

  const addVehicle = async (vehicleData) => {
    try {
      await addVehicleMutation(vehicleData);
      return { success: true };
    } catch (error) {
      console.error('Error adding vehicle:', error);
      return { success: false, error: error.message };
    }
  };

  const updateVehicle = async (id, updates) => {
    try {
      await updateVehicleMutation({ id, ...updates });
      return { success: true };
    } catch (error) {
      console.error('Error updating vehicle:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteVehicle = async (id) => {
    try {
      await deleteVehicleMutation({ id });
      return { success: true };
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      return { success: false, error: error.message };
    }
  };

  const updateVehicleLocation = async (id, lat, lng) => {
    try {
      await updateGPSMutation({ id, gps_latitud: lat, gps_longitud: lng });
      return { success: true };
    } catch (error) {
      console.error('Error updating GPS:', error);
      return { success: false, error: error.message };
    }
  };

  const updateVehicleStatus = async (id, status) => {
    try {
      await updateEstadoMutation({ id, estado: status });
      return { success: true };
    } catch (error) {
      console.error('Error updating status:', error);
      return { success: false, error: error.message };
    }
  };

  const getFleetStats = () => {
    if (isDemoMode || !fleetStatsData) {
      const disponibles = vehicles.filter(v => v.estado === "disponible" || v.estado === "Disponible").length;
      const en_ruta = vehicles.filter(v => v.estado === "en_ruta" || v.estado === "En ruta").length;
      const en_mantenimiento = vehicles.filter(v => v.estado === "en_mantenimiento" || v.estado === "Mantenimiento").length;
      return {
        total: vehicles.length,
        disponibles,
        available: disponibles,
        en_ruta,
        inRoute: en_ruta,
        en_mantenimiento,
        maintenance: en_mantenimiento,
      };
    }
    return fleetStatsData;
  };

  const value = {
    vehicles,
    loading,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    updateVehicleLocation,
    updateVehicleStatus,
    getFleetStats,
    // Backwards compatibility aliases
    updateGPS: updateVehicleLocation,
  };

  return <FleetContext.Provider value={value}>{children}</FleetContext.Provider>;
};

export const useFleet = () => {
  const context = useContext(FleetContext);
  if (!context) {
    throw new Error('useFleet must be used within FleetProvider');
  }
  return context;
};

// Backwards compatibility
export const useSupabaseFleet = useFleet;

export default FleetContext;
