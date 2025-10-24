import { createContext, useContext, useReducer, useEffect } from 'react';
import supabaseClient from '../utils/supabaseClient';
import { useDemoMode } from '../hooks/useDemoMode';
import { DEMO_LUGARES, DEMO_AREAS, DEMO_CLEANING_ASSIGNMENTS, mergeDemoData } from '../utils/demoData';

// Crear el contexto
const SupabaseCleaningContext = createContext();

// Tipos de acciones
const ACTIONS = {
  SET_LUGARES: 'SET_LUGARES',
  SET_AREAS: 'SET_AREAS',
  SET_ASSIGNMENTS: 'SET_ASSIGNMENTS',
  ADD_ASSIGNMENT: 'ADD_ASSIGNMENT',
  UPDATE_ASSIGNMENT: 'UPDATE_ASSIGNMENT',
  DELETE_ASSIGNMENT: 'DELETE_ASSIGNMENT',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR'
};

// Reducer para manejar el estado
const cleaningReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_LUGARES:
      return {
        ...state,
        lugares: action.payload,
        loading: false
      };

    case ACTIONS.SET_AREAS:
      return {
        ...state,
        areas: action.payload
      };

    case ACTIONS.SET_ASSIGNMENTS:
      return {
        ...state,
        assignments: action.payload,
        loading: false,
        error: null
      };

    case ACTIONS.ADD_ASSIGNMENT:
      return {
        ...state,
        assignments: [...state.assignments, action.payload]
      };

    case ACTIONS.UPDATE_ASSIGNMENT:
      return {
        ...state,
        assignments: state.assignments.map(a =>
          a.id === action.payload.id ? action.payload : a
        )
      };

    case ACTIONS.DELETE_ASSIGNMENT:
      return {
        ...state,
        assignments: state.assignments.filter(a => a.id !== action.payload)
      };

    case ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    case ACTIONS.SET_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    default:
      return state;
  }
};

// Estado inicial
const initialState = {
  lugares: [],
  areas: [],
  assignments: [],
  loading: true,
  error: null
};

// Provider del contexto
export const SupabaseCleaningProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cleaningReducer, initialState);
  const { isDemoMode } = useDemoMode();

  // Cargar lugares al iniciar y cuando cambie el modo demo
  useEffect(() => {
    loadLugares();
    loadAreas();
    loadAssignments();
  }, [isDemoMode]);

  // ⚡ OPTIMIZADO: Cargar lugares con índice
  const loadLugares = async () => {
    try {
      const { data, error } = await supabaseClient.supabase
        .from('lugares')
        .select('*')
        .eq('activo', true)
        .order('nombre', { ascending: true })
        .limit(100); // ⚡ Limitar resultados para velocidad

      if (error) throw error;

      const finalLugares = isDemoMode ? mergeDemoData(data || [], DEMO_LUGARES) : (data || []);
      dispatch({ type: ACTIONS.SET_LUGARES, payload: finalLugares });
    } catch (error) {
      console.error('Error loading lugares:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
    }
  };

  // ⚡ OPTIMIZADO: Cargar áreas con índice
  const loadAreas = async () => {
    try {
      const { data, error } = await supabaseClient.supabase
        .from('areas')
        .select('*')
        .eq('activo', true)
        .order('nombre', { ascending: true })
        .limit(100); // ⚡ Limitar resultados para velocidad

      if (error) throw error;

      const finalAreas = isDemoMode ? mergeDemoData(data || [], DEMO_AREAS) : (data || []);
      dispatch({ type: ACTIONS.SET_AREAS, payload: finalAreas });
    } catch (error) {
      console.error('Error loading areas:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
    }
  };

  // ⚡ OPTIMIZADO: Cargar asignaciones con índice y límite
  const loadAssignments = async () => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });

      const { data, error } = await supabaseClient.supabase
        .from('cleaning_assignments')
        .select(`
          *,
          lugar:lugares(id, nombre),
          area:areas(id, nombre),
          fotos:cleaning_photos(*)
        `)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })
        .limit(200); // ⚡ Limitar a los 200 más recientes

      if (error) throw error;

      const finalAssignments = isDemoMode ? mergeDemoData(data || [], DEMO_CLEANING_ASSIGNMENTS) : (data || []);
      dispatch({ type: ACTIONS.SET_ASSIGNMENTS, payload: finalAssignments });
    } catch (error) {
      console.error('Error loading assignments:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
    }
  };

  // Crear una nueva asignación
  const addAssignment = async (assignmentData) => {
    try {
      if (isDemoMode) {
        const lugar = state.lugares.find(l => l.id === assignmentData.lugar_id);
        const area = state.areas.find(a => a.id === assignmentData.area_id);

        const newAssignment = {
          id: `demo-cleaning-new-${Date.now()}`,
          lugar_id: assignmentData.lugar_id,
          area_id: assignmentData.area_id,
          fecha: assignmentData.fecha,
          hora: assignmentData.hora,
          estado: 'pendiente',
          notas: assignmentData.notas || null,
          lugar: lugar ? { id: lugar.id, nombre: lugar.nombre } : null,
          area: area ? { id: area.id, nombre: area.nombre } : null,
          fotos: [],
          created_at: new Date().toISOString()
        };

        dispatch({ type: ACTIONS.ADD_ASSIGNMENT, payload: newAssignment });
        return { success: true, data: newAssignment };
      }

      const { data, error } = await supabaseClient.supabase
        .from('cleaning_assignments')
        .insert([{
          lugar_id: assignmentData.lugar_id,
          area_id: assignmentData.area_id,
          fecha: assignmentData.fecha,
          hora: assignmentData.hora,
          estado: 'pendiente',
          notas: assignmentData.notas || null
        }])
        .select(`
          *,
          lugar:lugares(id, nombre),
          area:areas(id, nombre)
        `)
        .single();

      if (error) throw error;

      dispatch({ type: ACTIONS.ADD_ASSIGNMENT, payload: data });
      return { success: true, data };
    } catch (error) {
      console.error('Error adding assignment:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      return { success: false, error: error.message };
    }
  };

  // Actualizar una asignación
  const updateAssignment = async (id, updates) => {
    try {
      if (isDemoMode) {
        const existing = state.assignments.find(a => a.id === id);
        const updatedAssignment = {
          ...existing,
          ...updates,
          updated_at: new Date().toISOString()
        };

        dispatch({ type: ACTIONS.UPDATE_ASSIGNMENT, payload: updatedAssignment });
        return { success: true, data: updatedAssignment };
      }

      const { data, error } = await supabaseClient.supabase
        .from('cleaning_assignments')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          lugar:lugares(id, nombre),
          area:areas(id, nombre),
          fotos:cleaning_photos(*)
        `)
        .single();

      if (error) throw error;

      dispatch({ type: ACTIONS.UPDATE_ASSIGNMENT, payload: data });
      return { success: true, data };
    } catch (error) {
      console.error('Error updating assignment:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      return { success: false, error: error.message };
    }
  };

  // Eliminar una asignación
  const deleteAssignment = async (id) => {
    try {
      if (isDemoMode) {
        dispatch({ type: ACTIONS.DELETE_ASSIGNMENT, payload: id });
        return { success: true };
      }

      const { error } = await supabaseClient.supabase
        .from('cleaning_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      dispatch({ type: ACTIONS.DELETE_ASSIGNMENT, payload: id });
      return { success: true };
    } catch (error) {
      console.error('Error deleting assignment:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      return { success: false, error: error.message };
    }
  };

  // Subir una foto
  const uploadPhoto = async (assignmentId, etapa, file) => {
    try {
      if (isDemoMode) {
        const demoPhoto = {
          id: `demo-photo-${Date.now()}-${Math.random()}`,
          assignment_id: assignmentId,
          etapa,
          file_name: file.name,
          file_path: `demo-path/${file.name}`,
          url: URL.createObjectURL(file),
          file_size: file.size,
          mime_type: file.type,
          created_at: new Date().toISOString()
        };

        return { success: true, data: demoPhoto };
      }

      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${assignmentId}_${etapa}_${Date.now()}.${fileExt}`;
      const filePath = `cleaning-photos/${fileName}`;

      // Subir archivo a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseClient.supabase.storage
        .from('cleaning-evidences')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Guardar referencia en la tabla cleaning_photos
      const { data, error } = await supabaseClient.supabase
        .from('cleaning_photos')
        .insert([{
          assignment_id: assignmentId,
          etapa,
          file_name: fileName,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type
        }])
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error uploading photo:', error);
      return { success: false, error: error.message };
    }
  };

  // Obtener áreas por lugar
  const getAreasByLugar = (lugarId) => {
    return state.areas.filter(area => area.lugar_id === lugarId);
  };

  // Obtener estadísticas
  const getStats = () => {
    return {
      totalAssignments: state.assignments.length,
      pendientes: state.assignments.filter(a => a.estado === 'pendiente').length,
      completados: state.assignments.filter(a => a.estado === 'completado').length,
      enProgreso: state.assignments.filter(a => a.estado === 'en_progreso').length
    };
  };

  const value = {
    lugares: state.lugares,
    areas: state.areas,
    assignments: state.assignments,
    loading: state.loading,
    error: state.error,
    loadLugares,
    loadAreas,
    loadAssignments,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    uploadPhoto,
    getAreasByLugar,
    getStats
  };

  return (
    <SupabaseCleaningContext.Provider value={value}>
      {children}
    </SupabaseCleaningContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useSupabaseCleaning = () => {
  const context = useContext(SupabaseCleaningContext);
  if (!context) {
    throw new Error('useSupabaseCleaning must be used within a SupabaseCleaningProvider');
  }
  return context;
};

export default SupabaseCleaningContext;
