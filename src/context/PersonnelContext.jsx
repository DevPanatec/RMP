import { createContext, useContext } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const PersonnelContext = createContext();

export const PersonnelProvider = ({ children }) => {
  const employeesData = useQuery(api.empleados.list);

  const addEmployeeMutation = useMutation(api.empleados.add);
  const updateEmployeeMutation = useMutation(api.empleados.update);
  const deleteEmployeeMutation = useMutation(api.empleados.remove);

  const allEmployees = employeesData || [];
  const loading = employeesData === undefined;

  // Organize employees by shift (backwards compatibility)
  const personnel = {
    unassigned: allEmployees.filter(emp => !emp.turno || emp.turno === 'unassigned'),
    morning: allEmployees.filter(emp => emp.turno === 'morning'),
    afternoon: allEmployees.filter(emp => emp.turno === 'afternoon'),
    night: allEmployees.filter(emp => emp.turno === 'night'),
  };

  const addEmployee = async (employeeData) => {
    try {
      await addEmployeeMutation(employeeData);
      return { success: true };
    } catch (error) {
      console.error('Error adding employee:', error);
      return { success: false, error: error.message };
    }
  };

  const updateEmployee = async (employeeId, updates) => {
    try {
      await updateEmployeeMutation({ id: employeeId, ...updates });
      return { success: true };
    } catch (error) {
      console.error('Error updating employee:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteEmployee = async (employeeId) => {
    try {
      await deleteEmployeeMutation({ id: employeeId });
      return { success: true };
    } catch (error) {
      console.error('Error deleting employee:', error);
      return { success: false, error: error.message };
    }
  };

  const moveEmployee = async (employeeId, fromShift, toShift) => {
    return updateEmployee(employeeId, { turno: toShift });
  };

  const getAllEmployees = () => {
    return allEmployees;
  };

  const getEmployeesByShift = (shift) => {
    return personnel[shift] || [];
  };

  const getPersonnelStats = () => {
    const total = allEmployees.length;
    const conductors = allEmployees.filter(emp => emp.cargo === 'Conductor' || emp.cargo === 'conductor').length;
    const assistants = allEmployees.filter(emp => emp.cargo === 'Ayudante' || emp.cargo === 'ayudante').length;
    const supervisors = allEmployees.filter(emp => emp.cargo === 'Supervisor' || emp.cargo === 'supervisor').length;
    const avgRating = total > 0 ? (allEmployees.reduce((sum, emp) => sum + (emp.rating || 0), 0) / total).toFixed(1) : 0;

    const byShift = {
      unassigned: personnel.unassigned.length,
      morning: personnel.morning.length,
      afternoon: personnel.afternoon.length,
      night: personnel.night.length
    };

    return {
      total,
      conductors,
      assistants,
      supervisors,
      avgRating,
      byShift
    };
  };

  const value = {
    personnel,
    loading,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    moveEmployee,
    getAllEmployees,
    getEmployeesByShift,
    getPersonnelStats,
  };

  return <PersonnelContext.Provider value={value}>{children}</PersonnelContext.Provider>;
};

export const usePersonnel = () => {
  const context = useContext(PersonnelContext);
  if (!context) throw new Error('usePersonnel must be used within PersonnelProvider');
  return context;
};

export const useSupabasePersonnel = usePersonnel;
export default PersonnelContext;
