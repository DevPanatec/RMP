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
      // Por ahora, simplemente actualizar el estado de la alerta
      // En el futuro, podría tener una mutación específica
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
      if (task.status === 'completada') return false;

      const taskDate = new Date(`${task.scheduled_date}T${task.scheduled_time || '00:00'}`);
      return taskDate >= now && taskDate <= futureDate;
    });
  };

  const getTasksByStatus = (status) => {
    if (!tasks) return [];
    return tasks.filter(task => task.status === status);
  };

  const getOperationalStats = () => {
    if (!tasks || tasks.length === 0) {
      return {
        total: 0,
        programmed: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
        completionRate: 0,
        totalDischarges: 0,
        totalCost: 0,
        highImpactCleanups: 0,
        averageWorkDuration: 0
      };
    }

    const now = new Date();
    const overdue = tasks.filter(task => {
      if (task.status === 'completada') return false;
      const taskDate = new Date(`${task.scheduled_date}T${task.scheduled_time || '00:00'}`);
      return taskDate < now;
    });

    const completed = tasks.filter(t => t.status === 'completada');
    const programmed = tasks.filter(t => t.status === 'programada');
    const inProgress = tasks.filter(t => t.status === 'en_proceso');

    // Calcular campos específicos de mantenimiento
    const totalDischarges = completed.reduce((sum, task) =>
      sum + (task.volume_discharged || 0), 0
    );

    const totalCost = completed.reduce((sum, task) =>
      sum + (task.cost || 0), 0
    );

    const highImpactCleanups = completed.filter(task =>
      task.impact === 'high' || task.priority === 'high'
    ).length;

    // Calcular duración promedio de trabajo (en horas)
    const totalDuration = completed.reduce((sum, task) => {
      if (task.work_duration) {
        return sum + parseFloat(task.work_duration);
      }
      // Si no hay work_duration, calcular desde scheduled_time y completion_time
      if (task.scheduled_time && task.completion_time) {
        const start = new Date(`${task.scheduled_date}T${task.scheduled_time}`);
        const end = new Date(`${task.completion_date || task.scheduled_date}T${task.completion_time}`);
        const hours = (end - start) / (1000 * 60 * 60);
        return sum + hours;
      }
      return sum;
    }, 0);

    const averageWorkDuration = completed.length > 0 ? totalDuration / completed.length : 0;

    return {
      total: tasks.length,
      programmed: programmed.length,
      inProgress: inProgress.length,
      completed: completed.length,
      overdue: overdue.length,
      completionRate: tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0,
      totalDischarges,
      totalCost,
      highImpactCleanups,
      averageWorkDuration
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
