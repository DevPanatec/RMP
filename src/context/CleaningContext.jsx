import { createContext, useContext } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useProject } from './ProjectContext';

const CleaningContext = createContext();

export const CleaningProvider = ({ children }) => {
  const { currentProjectId } = useProject();
  const salasData = useQuery(api.cleaning.listSalas, { proyecto_id: currentProjectId ?? undefined });
  const areasData = useQuery(api.cleaning.listAreas);
  const assignmentsData = useQuery(api.cleaning.listAssignments, { proyecto_id: currentProjectId ?? undefined });

  const addSalaMutation = useMutation(api.cleaning.addSala);
  const updateSalaMutation = useMutation(api.cleaning.updateSala);
  const deleteSalaMutation = useMutation(api.cleaning.deleteSala);
  const addAreaMutation = useMutation(api.cleaning.addArea);
  const addAssignmentMutation = useMutation(api.cleaning.addAssignment);
  const updateAssignmentMutation = useMutation(api.cleaning.updateAssignment);
  const deleteAssignmentMutation = useMutation(api.cleaning.deleteAssignment);
  const addPhotoMutation = useMutation(api.cleaning.addPhoto);
  const createReportMutation = useMutation(api.cleaning.createReport);
  const generateUploadUrlMutation = useMutation(api.files.generateUploadUrl);

  const lugares = salasData || [];
  const areas = areasData || [];
  const assignments = assignmentsData || [];
  const loading = salasData === undefined;

  const addSala = async (salaData) => {
    try {
      await addSalaMutation(salaData);
      return { success: true };
    } catch (error) {
      console.error('Error adding sala:', error);
      return { success: false, error: error.message };
    }
  };

  const updateSala = async (id, updates) => {
    try {
      await updateSalaMutation({ id, ...updates });
      return { success: true };
    } catch (error) {
      console.error('Error updating sala:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteSala = async (id) => {
    try {
      await deleteSalaMutation({ id });
      return { success: true };
    } catch (error) {
      console.error('Error deleting sala:', error);
      return { success: false, error: error.message };
    }
  };

  const addArea = async (areaData) => {
    try {
      await addAreaMutation(areaData);
      return { success: true };
    } catch (error) {
      console.error('Error adding area:', error);
      return { success: false, error: error.message };
    }
  };

  const addAssignment = async (assignmentData) => {
    try {
      await addAssignmentMutation(assignmentData);
      return { success: true };
    } catch (error) {
      console.error('Error adding assignment:', error);
      return { success: false, error: error.message };
    }
  };

  const updateAssignment = async (id, updates) => {
    try {
      await updateAssignmentMutation({ id, ...updates });
      return { success: true };
    } catch (error) {
      console.error('Error updating assignment:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteAssignment = async (id) => {
    try {
      await deleteAssignmentMutation({ id });
      return { success: true };
    } catch (error) {
      console.error('Error deleting assignment:', error);
      return { success: false, error: error.message };
    }
  };

  // Subir foto a Convex storage y registrar en cleaning_photos
  const uploadPhoto = async (assignmentId, etapa, file) => {
    try {
      // 1. Obtener URL de subida
      const uploadUrl = await generateUploadUrlMutation();

      // 2. Subir archivo al storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error(`Upload failed: ${result.statusText}`);
      }

      const { storageId } = await result.json();

      // 3. Registrar foto en la base de datos
      const photoId = await addPhotoMutation({
        assignment_id: assignmentId,
        etapa: etapa,
        storage_id: storageId,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      });

      console.log(`📸 Foto subida: ${etapa} - ${file.name}`, photoId);
      return { success: true, photoId, storageId };
    } catch (error) {
      console.error('Error uploading photo:', error);
      return { success: false, error: error.message };
    }
  };

  // Completar asignación y crear reporte
  const completeAssignment = async (assignmentId, reportData) => {
    try {
      // 1. Crear el reporte de limpieza
      const reportId = await createReportMutation({
        assignment_id: assignmentId,
        sala_id: reportData.sala_id,
        area_id: reportData.area_id,
        sala_nombre: reportData.sala_nombre,
        area_nombre: reportData.area_nombre,
        latitud: reportData.latitud,
        longitud: reportData.longitud,
        fecha: reportData.fecha,
        hora_inicio: reportData.hora_inicio,
        hora_fin: reportData.hora_fin,
        duracion_minutos: reportData.duracion_minutos,
        fotos_antes_ids: reportData.fotos_antes_ids || [],
        fotos_durante_ids: reportData.fotos_durante_ids || [],
        fotos_despues_ids: reportData.fotos_despues_ids || [],
        observaciones: reportData.observaciones,
        usuario_completo: reportData.usuario_completo,
        fecha_completacion: new Date().toISOString().split('T')[0],
      });

      // 2. Actualizar estado de la asignación a "completada"
      await updateAssignmentMutation({
        id: assignmentId,
        estado: 'completada'
      });

      console.log('✅ Limpieza completada, reporte creado:', reportId);
      return { success: true, reportId };
    } catch (error) {
      console.error('Error completing assignment:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    lugares,
    areas,
    assignments,
    loading,
    addSala,
    updateSala,
    deleteSala,
    addArea,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    uploadPhoto,
    completeAssignment,
  };

  return <CleaningContext.Provider value={value}>{children}</CleaningContext.Provider>;
};

export const useCleaning = () => {
  const context = useContext(CleaningContext);
  if (!context) throw new Error('useCleaning must be used within CleaningProvider');
  return context;
};

export const useSupabaseCleaning = useCleaning;
export default CleaningContext;
