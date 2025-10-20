import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface OperationalData {
  volume_discharged?: number;
  cost_per_gallon?: number;
  total_estimated_cost?: number;
  cleanup_type?: string;
  work_duration?: number;
  technical_observations?: string;
}

export interface MaintenanceTask {
  id: string;
  type: 'preventivo' | 'correctivo' | 'contingencia';
  scheduled_date: string;
  scheduled_time: string;
  observations: string;
  operational_data?: OperationalData;
  status: 'programada' | 'en_proceso' | 'completada';
  images_before?: string[];
  images_during?: string[];
  images_after?: string[];
  completed_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceAlert {
  id: string;
  task_id?: string;
  equipment_id?: string;
  type: 'task_reminder' | 'equipment_maintenance';
  message: string;
  scheduled_date: string;
  status: 'active' | 'dismissed';
  severity: 'info' | 'warning' | 'critical';
  created_at: string;
}

interface MaintenanceContextType {
  tasks: MaintenanceTask[];
  alerts: MaintenanceAlert[];
  loading: boolean;
  createTask: (task: Omit<MaintenanceTask, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<MaintenanceTask>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string, operationalData: OperationalData, images: { before?: string[], during?: string[], after?: string[] }) => Promise<void>;
  dismissAlert: (id: string) => Promise<void>;
  getUpcomingTasks: (days: number) => MaintenanceTask[];
  getTasksByStatus: (status: MaintenanceTask['status']) => MaintenanceTask[];
  getOperationalStats: () => {
    totalDischarges: number;
    totalCost: number;
    highImpactCleanups: number;
    averageWorkDuration: number;
  };
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export const useMaintenanceContext = () => {
  const context = useContext(MaintenanceContext);
  if (!context) {
    throw new Error('useMaintenanceContext must be used within MaintenanceProvider');
  }
  return context;
};

export const MaintenanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar tareas
  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_tasks')
        .select('*')
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading maintenance tasks:', error);
    }
  };

  // Cargar alertas
  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_alerts')
        .select('*')
        .eq('status', 'active')
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error loading maintenance alerts:', error);
    }
  };

  // Crear alerta automática para una tarea
  const createTaskAlert = async (task: MaintenanceTask) => {
    const scheduledDate = new Date(`${task.scheduled_date}T${task.scheduled_time}`);
    const alertDate = new Date(scheduledDate);
    alertDate.setDate(alertDate.getDate() - 1); // 1 día antes

    const alert: Omit<MaintenanceAlert, 'id' | 'created_at'> = {
      task_id: task.id,
      type: 'task_reminder',
      message: `Recordatorio: Mantenimiento ${task.type} programado para mañana`,
      scheduled_date: alertDate.toISOString(),
      status: 'active',
      severity: 'warning'
    };

    await supabase.from('maintenance_alerts').insert([alert]);
  };

  // Crear tarea
  const createTask = async (taskData: Omit<MaintenanceTask, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    if (!user) throw new Error('User not authenticated');

    const newTask = {
      ...taskData,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('maintenance_tasks')
      .insert([newTask])
      .select()
      .single();

    if (error) throw error;

    // Crear alerta automática
    await createTaskAlert(data);

    await loadTasks();
    await loadAlerts();
  };

  // Actualizar tarea
  const updateTask = async (id: string, updates: Partial<MaintenanceTask>) => {
    const { error } = await supabase
      .from('maintenance_tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    await loadTasks();
  };

  // Eliminar tarea
  const deleteTask = async (id: string) => {
    // Eliminar alertas asociadas
    await supabase.from('maintenance_alerts').delete().eq('task_id', id);

    const { error } = await supabase
      .from('maintenance_tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await loadTasks();
    await loadAlerts();
  };

  // Completar tarea
  const completeTask = async (
    id: string,
    operationalData: OperationalData,
    images: { before?: string[], during?: string[], after?: string[] }
  ) => {
    const { error } = await supabase
      .from('maintenance_tasks')
      .update({
        status: 'completada',
        operational_data: operationalData,
        images_before: images.before,
        images_during: images.during,
        images_after: images.after,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    // Descartar alertas relacionadas
    await supabase
      .from('maintenance_alerts')
      .update({ status: 'dismissed' })
      .eq('task_id', id);

    await loadTasks();
    await loadAlerts();
  };

  // Descartar alerta
  const dismissAlert = async (id: string) => {
    const { error } = await supabase
      .from('maintenance_alerts')
      .update({ status: 'dismissed' })
      .eq('id', id);

    if (error) throw error;
    await loadAlerts();
  };

  // Obtener tareas próximas
  const getUpcomingTasks = (days: number): MaintenanceTask[] => {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return tasks.filter(task => {
      const taskDate = new Date(`${task.scheduled_date}T${task.scheduled_time}`);
      return taskDate >= now && taskDate <= futureDate && task.status !== 'completada';
    });
  };

  // Obtener tareas por estado
  const getTasksByStatus = (status: MaintenanceTask['status']): MaintenanceTask[] => {
    return tasks.filter(task => task.status === status);
  };

  // Obtener estadísticas operativas
  const getOperationalStats = () => {
    const completedTasks = tasks.filter(t => t.status === 'completada' && t.operational_data);

    return {
      totalDischarges: completedTasks.reduce((sum, t) => sum + (t.operational_data?.volume_discharged || 0), 0),
      totalCost: completedTasks.reduce((sum, t) => sum + (t.operational_data?.total_estimated_cost || 0), 0),
      highImpactCleanups: completedTasks.filter(t => t.operational_data?.cleanup_type === 'alto impacto').length,
      averageWorkDuration: completedTasks.length > 0
        ? completedTasks.reduce((sum, t) => sum + (t.operational_data?.work_duration || 0), 0) / completedTasks.length
        : 0
    };
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await Promise.all([loadTasks(), loadAlerts()]);
      setLoading(false);
    };

    if (user) {
      initialize();
    }
  }, [user]);

  // Suscripción en tiempo real
  useEffect(() => {
    if (!user) return;

    const tasksSubscription = supabase
      .channel('maintenance_tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_tasks' }, () => {
        loadTasks();
      })
      .subscribe();

    const alertsSubscription = supabase
      .channel('maintenance_alerts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_alerts' }, () => {
        loadAlerts();
      })
      .subscribe();

    return () => {
      tasksSubscription.unsubscribe();
      alertsSubscription.unsubscribe();
    };
  }, [user]);

  return (
    <MaintenanceContext.Provider
      value={{
        tasks,
        alerts,
        loading,
        createTask,
        updateTask,
        deleteTask,
        completeTask,
        dismissAlert,
        getUpcomingTasks,
        getTasksByStatus,
        getOperationalStats
      }}
    >
      {children}
    </MaintenanceContext.Provider>
  );
};
