import { createContext, useContext, useState, useEffect } from 'react';
import supabaseClient from '../utils/supabaseClient';
import { DEMO_MAINTENANCE_TASKS, mergeDemoData } from '../utils/demoData';
import { useDemoMode } from '../hooks/useDemoMode';

const SupabaseMaintenanceContext = createContext();

export const SupabaseMaintenanceProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isDemoMode } = useDemoMode();

  // Cargar tareas
  const loadTasks = async () => {
    try {
      const { data, error } = await supabaseClient.supabase
        .from('maintenance_tasks')
        .select(`
          *,
          lugar:lugares(id, nombre, latitud, longitud)
        `)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      // Mezclar con datos demo si el modo demo está activo
      const finalTasks = isDemoMode ? mergeDemoData(data || [], DEMO_MAINTENANCE_TASKS) : (data || []);
      setTasks(finalTasks);
    } catch (error) {
      console.error('Error loading maintenance tasks:', error);
    }
  };

  // Cargar alertas
  const loadAlerts = async () => {
    try {
      const { data, error } = await supabaseClient.supabase
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
  const createTaskAlert = async (task) => {
    const scheduledDate = new Date(`${task.scheduled_date}T${task.scheduled_time}`);
    const alertDate = new Date(scheduledDate);
    alertDate.setDate(alertDate.getDate() - 1); // 1 día antes

    const alert = {
      task_id: task.id,
      type: 'task_reminder',
      message: `Recordatorio: Mantenimiento ${task.type} programado para mañana`,
      scheduled_date: alertDate.toISOString(),
      status: 'active',
      severity: 'warning'
    };

    await supabaseClient.supabase.from('maintenance_alerts').insert([alert]);
  };

  // Crear tarea
  const createTask = async (taskData) => {
    try {
      const { data: session } = await supabaseClient.supabase.auth.getSession();
      if (!session?.session?.user) throw new Error('User not authenticated');

      const newTask = {
        ...taskData,
        created_by: session.session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabaseClient.supabase
        .from('maintenance_tasks')
        .insert([newTask])
        .select()
        .single();

      if (error) throw error;

      // Crear alerta automática
      await createTaskAlert(data);

      await loadTasks();
      await loadAlerts();
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  };

  // Actualizar tarea
  const updateTask = async (id, updates) => {
    try {
      const { error } = await supabaseClient.supabase
        .from('maintenance_tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  // Eliminar tarea
  const deleteTask = async (id) => {
    try {
      // Eliminar alertas asociadas
      await supabaseClient.supabase.from('maintenance_alerts').delete().eq('task_id', id);

      const { error } = await supabaseClient.supabase
        .from('maintenance_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadTasks();
      await loadAlerts();
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  // Completar tarea
  const completeTask = async (id, operationalData, images) => {
    try {
      const { error } = await supabaseClient.supabase
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
      await supabaseClient.supabase
        .from('maintenance_alerts')
        .update({ status: 'dismissed' })
        .eq('task_id', id);

      await loadTasks();
      await loadAlerts();
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    }
  };

  // Descartar alerta
  const dismissAlert = async (id) => {
    try {
      const { error } = await supabaseClient.supabase
        .from('maintenance_alerts')
        .update({ status: 'dismissed' })
        .eq('id', id);

      if (error) throw error;
      await loadAlerts();
    } catch (error) {
      console.error('Error dismissing alert:', error);
      throw error;
    }
  };

  // Obtener tareas próximas
  const getUpcomingTasks = (days) => {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return tasks.filter(task => {
      const taskDate = new Date(`${task.scheduled_date}T${task.scheduled_time}`);
      return taskDate >= now && taskDate <= futureDate && task.status !== 'completada';
    });
  };

  // Obtener tareas por estado
  const getTasksByStatus = (status) => {
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

    initialize();

    // Suscripción en tiempo real
    const tasksSubscription = supabaseClient.supabase
      .channel('maintenance_tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_tasks' }, () => {
        loadTasks();
      })
      .subscribe();

    const alertsSubscription = supabaseClient.supabase
      .channel('maintenance_alerts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_alerts' }, () => {
        loadAlerts();
      })
      .subscribe();

    return () => {
      tasksSubscription.unsubscribe();
      alertsSubscription.unsubscribe();
    };
  }, [isDemoMode]);

  return (
    <SupabaseMaintenanceContext.Provider
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
    </SupabaseMaintenanceContext.Provider>
  );
};

export const useSupabaseMaintenance = () => {
  const context = useContext(SupabaseMaintenanceContext);
  if (!context) {
    throw new Error('useSupabaseMaintenance must be used within SupabaseMaintenanceProvider');
  }
  return context;
};
