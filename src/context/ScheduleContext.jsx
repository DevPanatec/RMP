import { createContext, useContext } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const ScheduleContext = createContext();

export const ScheduleProvider = ({ children }) => {
  const assignmentsData = useQuery(api.asignaciones.list);

  const addAssignmentMutation = useMutation(api.asignaciones.add);
  const updateAssignmentMutation = useMutation(api.asignaciones.update);
  const deleteAssignmentMutation = useMutation(api.asignaciones.remove);

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
    const date = new Date(dateStr + 'T00:00:00'); // Agregar hora para evitar problemas de zona horaria
    const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    return days[date.getDay()];
  };

  const getStartOfWeekFromDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Ajustar cuando es domingo
    const monday = new Date(date.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  const value = {
    assignments,
    loading,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    getDayNameFromDate,
    getStartOfWeekFromDate,
  };

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
};

export const useSchedule = () => {
  const context = useContext(ScheduleContext);
  if (!context) throw new Error('useSchedule must be used within ScheduleProvider');
  return context;
};

export const useSupabaseSchedule = useSchedule;
export default ScheduleContext;
