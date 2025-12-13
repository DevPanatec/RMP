import { createContext, useContext } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const CleaningContext = createContext();

export const CleaningProvider = ({ children }) => {
  const salasData = useQuery(api.cleaning.listSalas);
  const areasData = useQuery(api.cleaning.listAreas);
  const assignmentsData = useQuery(api.cleaning.listAssignments);

  const addSalaMutation = useMutation(api.cleaning.addSala);
  const addAreaMutation = useMutation(api.cleaning.addArea);
  const addAssignmentMutation = useMutation(api.cleaning.addAssignment);
  const updateAssignmentMutation = useMutation(api.cleaning.updateAssignment);
  const deleteAssignmentMutation = useMutation(api.cleaning.deleteAssignment);

  const lugares = salasData || [];
  const areas = areasData || [];
  const assignments = assignmentsData || [];
  const loading = salasData === undefined;

  const addSala = async (salaData) => {
    try {
      await addSalaMutation(salaData);
      return { success: true };
    } catch (error) {
      console.error('Error adding sala:', error);
      return { success: false, error: error.message };
    }
  };

  const addArea = async (areaData) => {
    try {
      await addAreaMutation(areaData);
      return { success: true };
    } catch (error) {
      console.error('Error adding area:', error);
      return { success: false, error: error.message };
    }
  };

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

  const value = {
    lugares,
    areas,
    assignments,
    loading,
    addSala,
    addArea,
    addAssignment,
    updateAssignment,
    deleteAssignment,
  };

  return <CleaningContext.Provider value={value}>{children}</CleaningContext.Provider>;
};

export const useCleaning = () => {
  const context = useContext(CleaningContext);
  if (!context) throw new Error('useCleaning must be used within CleaningProvider');
  return context;
};

export const useSupabaseCleaning = useCleaning;
export default CleaningContext;
