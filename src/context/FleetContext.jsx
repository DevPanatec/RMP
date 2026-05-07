import { createContext, useContext, useMemo } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useDemoMode } from '../hooks/useDemoMode';
import { DEMO_VEHICLES } from '../utils/demoData';
import { useProject } from './ProjectContext';
import { useOrganization } from './OrganizationContext';

const FleetContext = createContext();

export const FleetProvider = ({ children }) => {
  const { isDemoMode } = useDemoMode();
  const { currentProjectId } = useProject();
  const { currentOrgId } = useOrganization();

  // Convex Queries
  // Using listWithAssignments for optimized JOIN with assignments (conductor, ruta)
  const vehiclesData = useQuery(api.vehiculos.listWithAssignments, {
    proyecto_id: currentProjectId ?? undefined,
    organizacion_id: currentOrgId ?? undefined,
  });
  const fleetStatsData = useQuery(api.vehiculos.getStats);

  // Convex Mutations
  const addVehicleMutation = useMutation(api.vehiculos.add);
  const updateVehicleMutation = useMutation(api.vehiculos.update);
  const deleteVehicleMutation = useMutation(api.vehiculos.remove);
  const updateGPSMutation = useMutation(api.vehiculos.updateGPS);
  const updateEstadoMutation = useMutation(api.vehiculos.updateEstado);
  const updateKilometrajeMutation = useMutation(api.vehiculos.updateKilometraje);

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

  // Update kilometraje (odometer)
  // NOTE: Available but not currently used in UI - could be added to maintenance forms
  // or calculated automatically from GPS history
  const updateVehicleKilometraje = async (id, kilometraje) => {
    try {
      await updateKilometrajeMutation({ id, kilometraje });
      return { success: true };
    } catch (error) {
      console.error('Error updating kilometraje:', error);
      return { success: false, error: error.message };
    }
  };

  // Memoized stats — recomputed only when vehicles or backend stats change.
  const fleetStats = useMemo(() => {
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
  }, [vehicles, fleetStatsData, isDemoMode]);

  // Backwards-compat function alias.
  const getFleetStats = () => fleetStats;

  const value = useMemo(() => ({
    vehicles,
    loading,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    updateVehicleLocation,
    updateVehicleStatus,
    updateVehicleKilometraje,
    fleetStats,
    getFleetStats,
    // Backwards compatibility aliases
    updateGPS: updateVehicleLocation,
  }), [vehicles, loading, fleetStats]);

  return <FleetContext.Provider value={value}>{children}</FleetContext.Provider>;
};

export const useFleet = () => {
  const context = useContext(FleetContext);
  if (!context) {
    throw new Error('useFleet must be used within FleetProvider');
  }
  return context;
};

export default FleetContext;
