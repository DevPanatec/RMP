import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { DEMO_SCHEDULE_ASSIGNMENTS, DEMO_ROUTES, DEMO_VEHICLES, mergeDemoData } from '../utils/demoData';
import { useDemoMode } from '../hooks/useDemoMode';

const SupabaseScheduleContext = createContext();

export const useSupabaseSchedule = () => {
  const context = useContext(SupabaseScheduleContext);
  if (!context) {
    throw new Error('useSupabaseSchedule must be used within SupabaseScheduleProvider');
  }
  return context;
};

export const SupabaseScheduleProvider = ({ children }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isDemoMode } = useDemoMode();

  const fetchAssignments = async (startDate = null, endDate = null) => {
    try {
      setLoading(true);
      let query = supabase
        .from('asignaciones_rutas')
        .select(`
          *,
          ruta:rutas(id, nombre, tipo_servicio, paradas, hora_inicio, hora_fin),
          vehiculo:vehiculos(id, placa, nombre, tipo_servicio)
        `)
        .order('created_at', { ascending: false });

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      console.log('📊 DEBUG Schedule - Asignaciones cargadas desde BD:', data);
      console.log('📊 DEBUG Schedule - Cantidad:', data?.length || 0);

      // Mezclar con datos demo si el modo demo está activo
      const finalAssignments = isDemoMode ? mergeDemoData(data || [], DEMO_SCHEDULE_ASSIGNMENTS) : (data || []);
      console.log('📊 DEBUG Schedule - isDemoMode:', isDemoMode);
      console.log('📊 DEBUG Schedule - Asignaciones finales:', finalAssignments.length);

      setAssignments(finalAssignments);
      setError(null);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addAssignment = async (assignmentData) => {
    try {
      if (isDemoMode) {
        const route = DEMO_ROUTES.find(r => r.id === assignmentData.ruta_id);
        const vehicle = DEMO_VEHICLES.find(v => v.id === assignmentData.vehiculo_id);

        const newAssignment = {
          ...assignmentData,
          id: `demo-schedule-new-${Date.now()}`,
          ruta: route ? {
            id: route.id,
            nombre: route.nombre,
            tipo_servicio: route.tipo_servicio,
            paradas: route.paradas,
            hora_inicio: route.hora_inicio,
            hora_fin: route.hora_fin
          } : null,
          vehiculo: vehicle ? {
            id: vehicle.id,
            placa: vehicle.placa,
            nombre: vehicle.nombre,
            tipo_servicio: vehicle.tipo_servicio
          } : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        setAssignments(prev => [newAssignment, ...prev]);
        return { success: true, data: newAssignment };
      }

      const { data, error: insertError } = await supabase
        .from('asignaciones_rutas')
        .insert([assignmentData])
        .select(`
          *,
          ruta:rutas(id, nombre, tipo_servicio, paradas, hora_inicio, hora_fin),
          vehiculo:vehiculos(id, placa, nombre, tipo_servicio)
        `);

      if (insertError) throw insertError;

      setAssignments(prev => [...prev, ...data]);
      return { success: true, data: data[0] };
    } catch (err) {
      console.error('Error adding assignment:', err);
      return { success: false, error: err.message };
    }
  };

  const updateAssignment = async (id, updates) => {
    try {
      if (isDemoMode) {
        const updatedAssignment = {
          ...assignments.find(a => a.id === id),
          ...updates,
          updated_at: new Date().toISOString()
        };

        setAssignments(prev =>
          prev.map(assignment => (assignment.id === id ? updatedAssignment : assignment))
        );
        return { success: true, data: updatedAssignment };
      }

      const { data, error: updateError } = await supabase
        .from('asignaciones_rutas')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          ruta:rutas(id, nombre, tipo_servicio, paradas, hora_inicio, hora_fin),
          vehiculo:vehiculos(id, placa, nombre, tipo_servicio)
        `);

      if (updateError) throw updateError;

      setAssignments(prev =>
        prev.map(assignment => (assignment.id === id ? data[0] : assignment))
      );
      return { success: true, data: data[0] };
    } catch (err) {
      console.error('Error updating assignment:', err);
      return { success: false, error: err.message };
    }
  };

  const deleteAssignment = async (id) => {
    try {
      if (isDemoMode) {
        setAssignments(prev => prev.filter(assignment => assignment.id !== id));
        return { success: true };
      }

      const { error: deleteError } = await supabase
        .from('asignaciones_rutas')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setAssignments(prev => prev.filter(assignment => assignment.id !== id));
      return { success: true };
    } catch (err) {
      console.error('Error deleting assignment:', err);
      return { success: false, error: err.message };
    }
  };

  const getDayNameFromDate = (date) => {
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const d = new Date(date + 'T12:00:00'); // Evitar problemas de timezone
    return dayNames[d.getDay()];
  };

  // Helper: calcular el lunes de la semana de una fecha dada
  const getStartOfWeekFromDate = (dateString) => {
    const date = new Date(dateString + 'T12:00:00');
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Si es domingo, retroceder 6 días
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    return monday.toISOString().split('T')[0];
  };

  const getAssignmentsByDate = (fecha) => {
    const dayName = getDayNameFromDate(fecha);
    const startOfWeek = getStartOfWeekFromDate(fecha);

    return assignments.filter(a => {
      // Debe ser la misma semana (misma fecha de inicio)
      if (a.fecha !== startOfWeek) return false;

      // Y debe incluir este día de la semana
      if (a.dias_semana && Array.isArray(a.dias_semana)) {
        return a.dias_semana.includes(dayName);
      }
      return false;
    });
  };

  const getAssignmentsByConductor = (conductorNombre) => {
    return assignments.filter(a => a.conductor_nombre === conductorNombre);
  };

  const getAssignmentsByVehicle = (vehiculoId) => {
    return assignments.filter(a => a.vehiculo_id === vehiculoId);
  };

  const getAssignmentsByRoute = (rutaId) => {
    return assignments.filter(a => a.ruta_id === rutaId);
  };

  useEffect(() => {
    fetchAssignments();
  }, [isDemoMode]);

  const value = {
    assignments,
    loading,
    error,
    fetchAssignments,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    getAssignmentsByDate,
    getAssignmentsByConductor,
    getAssignmentsByVehicle,
    getAssignmentsByRoute,
    getDayNameFromDate,
    getStartOfWeekFromDate
  };

  return (
    <SupabaseScheduleContext.Provider value={value}>
      {children}
    </SupabaseScheduleContext.Provider>
  );
};
