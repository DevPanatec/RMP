import { createContext, useContext, useMemo } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const PersonnelContext = createContext();

export const PersonnelProvider = ({ children }) => {
  const employeesData = useQuery(api.empleados.listActive);

  const addEmployeeMutation = useMutation(api.empleados.add);
  const updateEmployeeMutation = useMutation(api.empleados.update);
  const deactivateEmployeeMutation = useMutation(api.empleados.deactivate);

  const allEmployees = employeesData || [];
  const loading = employeesData === undefined;

  const addEmployee = async (employeeData) => {
    try {
      await addEmployeeMutation(employeeData);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updateEmployee = async (employeeId, updates) => {
    try {
      await updateEmployeeMutation({ id: employeeId, ...updates });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const deleteEmployee = async (employeeId) => {
    try {
      await deactivateEmployeeMutation({ id: employeeId });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const getAllEmployees = () => allEmployees;

  const personnelStats = useMemo(() => {
    const total = allEmployees.length;
    const activos = allEmployees.filter(e => e.activo !== false).length;
    const inactivos = total - activos;
    const norm = (s) => (s || '').toLowerCase();
    const conductors = allEmployees.filter(e => norm(e.cargo).includes('conductor')).length;
    const assistants = allEmployees.filter(e => norm(e.cargo).includes('ayudante')).length;
    const supervisors = allEmployees.filter(e => norm(e.cargo).includes('supervisor')).length;

    const byDepartment = allEmployees.reduce((acc, e) => {
      const dept = e.departamento || 'Sin departamento';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});

    return {
      total,
      activos,
      inactivos,
      conductors,
      assistants,
      supervisors,
      byDepartment,
    };
  }, [allEmployees]);

  const getPersonnelStats = () => personnelStats;

  const value = useMemo(() => ({
    employees: allEmployees,
    loading,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    getAllEmployees,
    personnelStats,
    getPersonnelStats,
  }), [allEmployees, loading, personnelStats]);

  return <PersonnelContext.Provider value={value}>{children}</PersonnelContext.Provider>;
};

export const usePersonnel = () => {
  const context = useContext(PersonnelContext);
  if (!context) throw new Error('usePersonnel must be used within PersonnelProvider');
  return context;
};

export default PersonnelContext;
