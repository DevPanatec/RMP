import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

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
        .order('fecha', { ascending: true })
        .order('hora_inicio', { ascending: true });

      if (startDate) {
        query = query.gte('fecha', startDate);
      }
      if (endDate) {
        query = query.lte('fecha', endDate);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setAssignments(data || []);
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

  const checkConflicts = (conductorNombre, vehiculoId, fecha, horaInicio, horaFin, excludeId = null) => {
    const conflicts = assignments.filter(assignment => {
      if (excludeId && assignment.id === excludeId) return false;
      if (assignment.fecha !== fecha) return false;

      const conductorConflict = assignment.conductor_nombre === conductorNombre;
      const vehiculoConflict = assignment.vehiculo_id === vehiculoId;

      if (!conductorConflict && !vehiculoConflict) return false;

      const existingStart = assignment.hora_inicio;
      const existingEnd = assignment.hora_fin;

      const timeOverlap =
        (horaInicio >= existingStart && horaInicio < existingEnd) ||
        (horaFin > existingStart && horaFin <= existingEnd) ||
        (horaInicio <= existingStart && horaFin >= existingEnd);

      return timeOverlap && (conductorConflict || vehiculoConflict);
    });

    return {
      hasConflict: conflicts.length > 0,
      conflicts: conflicts.map(c => ({
        id: c.id,
        ruta: c.ruta?.nombre,
        conductor: c.conductor_nombre,
        vehiculo: c.vehiculo?.placa,
        hora: `${c.hora_inicio} - ${c.hora_fin}`,
        type: c.conductor_nombre === conductorNombre ? 'conductor' : 'vehiculo'
      }))
    };
  };

  const getAssignmentsByDate = (fecha) => {
    return assignments.filter(a => a.fecha === fecha);
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

  const getAssignmentsForWeek = (startDate) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    return assignments.filter(a => {
      const assignmentDate = new Date(a.fecha);
      return assignmentDate >= start && assignmentDate < end;
    });
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const value = {
    assignments,
    loading,
    error,
    fetchAssignments,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    checkConflicts,
    getAssignmentsByDate,
    getAssignmentsByConductor,
    getAssignmentsByVehicle,
    getAssignmentsByRoute,
    getAssignmentsForWeek
  };

  return (
    <SupabaseScheduleContext.Provider value={value}>
      {children}
    </SupabaseScheduleContext.Provider>
  );
};
