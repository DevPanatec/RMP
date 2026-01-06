import { createContext, useContext } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const MaintenanceContext = createContext();

export const MaintenanceProvider = ({ children }) => {
  const tasksData = useQuery(api.maintenance.listTasks);
  const alertsData = useQuery(api.maintenance.listAlerts);

  const addTaskMutation = useMutation(api.maintenance.addTask);
  const updateTaskMutation = useMutation(api.maintenance.updateTask);
  const deleteTaskMutation = useMutation(api.maintenance.deleteTask);
  const addAlertMutation = useMutation(api.maintenance.addAlert);
  const markAsReadMutation = useMutation(api.maintenance.markAsRead);

  const tasks = tasksData || [];
  const alerts = alertsData || [];
  const loading = tasksData === undefined;

  const addTask = async (taskData) => {
    try {
      await addTaskMutation(taskData);
      return { success: true };
    } catch (error) {
      console.error('Error adding task:', error);
      return { success: false, error: error.message };
    }
  };

  const updateTask = async (id, updates) => {
    try {
      await updateTaskMutation({ id, ...updates });
      return { success: true };
    } catch (error) {
      console.error('Error updating task:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteTask = async (id) => {
    try {
      await deleteTaskMutation({ id });
      return { success: true };
    } catch (error) {
      console.error('Error deleting task:', error);
      return { success: false, error: error.message };
    }
  };

  const addAlert = async (alertData) => {
    try {
      await addAlertMutation(alertData);
      return { success: true };
    } catch (error) {
      console.error('Error adding alert:', error);
      return { success: false, error: error.message };
    }
  };

  const dismissAlert = async (id) => {
    try {
      await markAsReadMutation({ id });
      return { success: true };
    } catch (error) {
      console.error('Error dismissing alert:', error);
      return { success: false, error: error.message };
    }
  };

  // Helper functions
  const getUpcomingTasks = (days = 7) => {
    if (!tasks || tasks.length === 0) return [];

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return tasks.filter(task => {
      if (task.estado === 'completada') return false;
      if (!task.fecha_programada) return false;

      const taskDate = new Date(task.fecha_programada);
      return taskDate >= now && taskDate <= futureDate;
    });
  };

  const getTasksByStatus = (estado) => {
    if (!tasks) return [];
    return tasks.filter(task => task.estado === estado);
  };

  const getOperationalStats = () => {
    if (!tasks || tasks.length === 0) {
      return {
        total: 0,
        pendiente: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
        completionRate: 0,
        totalCost: 0,
        highPriorityTasks: 0
      };
    }

    const now = new Date();
    const overdue = tasks.filter(task => {
      if (task.estado === 'completada') return false;
      if (!task.fecha_programada) return false;
      const taskDate = new Date(task.fecha_programada);
      return taskDate < now;
    });

    const completed = tasks.filter(t => t.estado === 'completada');
    const pendiente = tasks.filter(t => t.estado === 'pendiente');
    const inProgress = tasks.filter(t => t.estado === 'en_progreso');

    // Calcular costo total de tareas completadas
    const totalCost = completed.reduce((sum, task) =>
      sum + (task.costo || 0), 0
    );

    // Contar tareas de alta prioridad
    const highPriorityTasks = tasks.filter(task =>
      task.prioridad === 'alta' || task.prioridad === 'urgente'
    ).length;

    return {
      total: tasks.length,
      pendiente: pendiente.length,
      inProgress: inProgress.length,
      completed: completed.length,
      overdue: overdue.length,
      completionRate: tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0,
      totalCost,
      highPriorityTasks
    };
  };

  const value = {
    tasks,
    alerts,
    loading,
    addTask,
    updateTask,
    deleteTask,
    addAlert,
    dismissAlert,
    getUpcomingTasks,
    getTasksByStatus,
    getOperationalStats,
  };

  return <MaintenanceContext.Provider value={value}>{children}</MaintenanceContext.Provider>;
};

export const useMaintenance = () => {
  const context = useContext(MaintenanceContext);
  if (!context) throw new Error('useMaintenance must be used within MaintenanceProvider');
  return context;
};

export const useSupabaseMaintenance = useMaintenance;
export default MaintenanceContext;
