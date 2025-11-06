import { createContext, useContext } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const FumigationContext = createContext();

export const FumigationProvider = ({ children }) => {
  // Queries
  const lugaresData = useQuery(api.fumigaciones.listLugares);
  const assignmentsData = useQuery(api.fumigaciones.list);

  // Mutations
  const addLugarMutation = useMutation(api.fumigaciones.addLugar);
  const updateLugarMutation = useMutation(api.fumigaciones.updateLugar);
  const deleteLugarMutation = useMutation(api.fumigaciones.deleteLugar);

  const createAssignmentMutation = useMutation(api.fumigaciones.create);
  const updateAssignmentMutation = useMutation(api.fumigaciones.update);
  const updateEstadoMutation = useMutation(api.fumigaciones.updateEstado);
  const deleteAssignmentMutation = useMutation(api.fumigaciones.deleteAssignment);

  const generateUploadUrlMutation = useMutation(api.fumigaciones.generateUploadUrl);
  const savePhotoMutation = useMutation(api.fumigaciones.savePhoto);
  const deletePhotoMutation = useMutation(api.fumigaciones.deletePhoto);

  // Data
  const lugares = lugaresData || [];
  const assignments = assignmentsData || [];
  const loading = lugaresData === undefined;

  // ========== LUGARES ==========
  const addLugar = async (lugarData) => {
    try {
      const id = await addLugarMutation(lugarData);
      return { success: true, id };
    } catch (error) {
      console.error('❌ Error adding lugar:', error);
      return { success: false, error: error.message };
    }
  };

  const updateLugar = async (id, updates) => {
    try {
      await updateLugarMutation({ id, ...updates });
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating lugar:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteLugar = async (id) => {
    try {
      await deleteLugarMutation({ id });
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting lugar:', error);
      return { success: false, error: error.message };
    }
  };

  // ========== ASSIGNMENTS ==========
  const createAssignment = async (assignmentData) => {
    try {
      const id = await createAssignmentMutation(assignmentData);
      return { success: true, id };
    } catch (error) {
      console.error('❌ Error creating fumigation assignment:', error);
      return { success: false, error: error.message };
    }
  };

  const updateAssignment = async (id, updates) => {
    try {
      await updateAssignmentMutation({ id, ...updates });
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating fumigation assignment:', error);
      return { success: false, error: error.message };
    }
  };

  const updateEstado = async (id, estado) => {
    try {
      await updateEstadoMutation({ id, estado });
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating fumigation estado:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteAssignment = async (id) => {
    try {
      await deleteAssignmentMutation({ id });
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting fumigation assignment:', error);
      return { success: false, error: error.message };
    }
  };

  // ========== PHOTOS ==========
  const uploadPhoto = async (file, assignmentId) => {
    try {
      // 1. Generar URL de upload
      const uploadUrl = await generateUploadUrlMutation();

      // 2. Subir archivo
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error("Failed to upload file");
      }

      const { storageId } = await result.json();

      // 3. Guardar metadata en DB
      await savePhotoMutation({
        assignment_id: assignmentId,
        storage_id: storageId,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      });

      return { success: true, storageId };
    } catch (error) {
      console.error('❌ Error uploading photo:', error);
      return { success: false, error: error.message };
    }
  };

  const deletePhoto = async (photoId) => {
    try {
      await deletePhotoMutation({ id: photoId });
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting photo:', error);
      return { success: false, error: error.message };
    }
  };

  // ========== HELPERS ==========
  const getAssignmentsByEstado = (estado) => {
    return assignments.filter(assignment => assignment.estado === estado);
  };

  const getAssignmentsByLugar = (lugarId) => {
    return assignments.filter(assignment => assignment.lugar_id === lugarId);
  };

  // ========== ESTADÍSTICAS ==========
  const getStats = () => {
    const total = assignments.length;
    const programadas = assignments.filter(a => a.estado === 'programada').length;
    const realizadas = assignments.filter(a => a.estado === 'realizada').length;
    const reportadas = assignments.filter(a => a.estado === 'reportada').length;

    const internas = assignments.filter(a => a.tipo_fumigacion === 'interna').length;
    const externas = assignments.filter(a => a.tipo_fumigacion === 'externa').length;

    return {
      total,
      programadas,
      realizadas,
      reportadas,
      internas,
      externas,
      lugaresActivos: lugares.length,
    };
  };

  const value = {
    // Data
    lugares,
    assignments,
    loading,

    // Lugares CRUD
    addLugar,
    updateLugar,
    deleteLugar,

    // Assignments CRUD
    createAssignment,
    updateAssignment,
    updateEstado,
    deleteAssignment,

    // Photos
    uploadPhoto,
    deletePhoto,

    // Helpers
    getAssignmentsByEstado,
    getAssignmentsByLugar,
    getStats,
  };

  return <FumigationContext.Provider value={value}>{children}</FumigationContext.Provider>;
};

export const useFumigation = () => {
  const context = useContext(FumigationContext);
  if (!context) {
    throw new Error('useFumigation must be used within FumigationProvider');
  }
  return context;
};

export default FumigationContext;
