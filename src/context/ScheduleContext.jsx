import { createContext, useContext, useMemo } from 'react';
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useProject } from './ProjectContext';
import { useOrganization } from './OrganizationContext';

const ScheduleContext = createContext();

export const ScheduleProvider = ({ children }) => {
  const { currentProjectId } = useProject();
  const { currentOrgId } = useOrganization();
  const convex = useConvex();
  const assignmentsData = useQuery(api.asignaciones.list, {
    proyecto_id: currentProjectId ?? undefined,
    organizacion_id: currentOrgId ?? undefined,
  });

  const addAssignmentMutation = useMutation(api.asignaciones.add);
  const updateAssignmentMutation = useMutation(api.asignaciones.update);
  const deleteAssignmentMutation = useMutation(api.asignaciones.remove);

  // Verifica conflictos de horario antes de crear (no bloquea, solo informa).
  // El caller debe mostrar warning al user y luego llamar addAssignment con confirmConflict=true.
  const checkConflicts = async ({ vehiculo_id, fecha, hora_inicio, hora_fin, excluir_asignacion_id }) => {
    if (!vehiculo_id || !fecha || !hora_inicio || !hora_fin) {
      return { hayConflicto: false, conflictos: [] };
    }
    return await convex.query(api.asignaciones.checkScheduleConflicts, {
      vehiculo_id,
      fecha,
      hora_inicio,
      hora_fin,
      excluir_asignacion_id,
    });
  };

  const assignments = assignmentsData || [];
  const loading = assignmentsData === undefined;

  const addAssignment = async (assignmentData) => {
    try {
      await addAssignmentMutation(assignmentData);
      return { success: true };
    } catch (error) {
      console.error('Error adding assignment:', error);
      return { success: false, error: error.message };
    }
  };

  const updateAssignment = async (id, updates) => {
    try {
      await updateAssignmentMutation({ id, ...updates });
      return { success: true };
    } catch (error) {
      console.error('Error updating assignment:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteAssignment = async (id) => {
    try {
      await deleteAssignmentMutation({ id });
      return { success: true };
    } catch (error) {
      console.error('Error deleting assignment:', error);
      return { success: false, error: error.message };
    }
  };

  // Utility functions para calendario
  const getDayNameFromDate = (dateStr) => {
    const date = new Date(dateStr + 'T12:00:00'); // Agregar hora al mediodía para evitar problemas de timezone
    const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']; // Sin acentos para consistencia
    return days[date.getDay()];
  };

  const getStartOfWeekFromDate = (dateStr) => {
    const date = new Date(dateStr + 'T12:00:00'); // Usar mediodía para evitar problemas de timezone
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Ajustar cuando es domingo
    const monday = new Date(date.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  const value = useMemo(() => ({
    assignments,
    loading,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    checkConflicts,
    getDayNameFromDate,
    getStartOfWeekFromDate,
  }), [assignments, loading]);

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
};

export const useSchedule = () => {
  const context = useContext(ScheduleContext);
  if (!context) throw new Error('useSchedule must be used within ScheduleProvider');
  return context;
};

export default ScheduleContext;
