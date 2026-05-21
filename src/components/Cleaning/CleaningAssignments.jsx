import { useState } from 'react';
import { Plus, Calendar, Image as ImageIcon, CheckCircle, Camera } from '../Icons';
import { Button, Card } from '../UI';
import { useCleaning } from '../../context/CleaningContext';
import { useAuth } from '../../context/AuthContext';
import PhotosModal from './PhotosModal';
import CleaningModal from './CleaningModal';
import { handleMutationError } from '../../utils/mutationError';
import './CleaningAssignments.css';

const CleaningAssignments = ({ userRole }) => {
  const { lugares, assignments, loading, addAssignment, completeAssignment } = useCleaning();
  const { user } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [showPhotosModal, setShowPhotosModal] = useState(false);
  const [currentAssignmentId, setCurrentAssignmentId] = useState(null);
  const [currentAssignment, setCurrentAssignment] = useState(null);
  const [completionStartTime, setCompletionStartTime] = useState(null);

  const handleSave = async (assignmentData) => {
    try {
      const result = await addAssignment(assignmentData);

      if (result.success) {
        alert(`Asignación creada exitosamente`);
        setShowModal(false);
        return result;
      } else {
        alert(`Error al crear asignación: ${result.error}`);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error:', error);
      handleMutationError(error, 'Error al crear la asignación');
      return { success: false, error: error.message };
    }
  };

  // Iniciar proceso de completar asignación
  const handleStartComplete = (assignment) => {
    setCurrentAssignment(assignment);
    setCurrentAssignmentId(assignment._id);
    setCompletionStartTime(new Date().toTimeString().slice(0, 5)); // HH:MM
    setShowPhotosModal(true);
  };

  // Completar asignación después de subir fotos
  const handlePhotosComplete = async (result) => {
    if (!result.success) {
      console.error('Error al subir fotos');
      return;
    }

    // Buscar datos de la sala y área
    const assignment = currentAssignment;
    const sala = lugares.find(l => l._id === assignment.sala_id);

    const horaFin = new Date().toTimeString().slice(0, 5);

    // Calcular duración en minutos
    const [hInicio, mInicio] = completionStartTime.split(':').map(Number);
    const [hFin, mFin] = horaFin.split(':').map(Number);
    const duracionMinutos = (hFin * 60 + mFin) - (hInicio * 60 + mInicio);

    try {
      const reportResult = await completeAssignment(assignment._id, {
        sala_id: assignment.sala_id,
        sala_nombre: sala?.nombre || 'Sala desconocida',
        latitud: sala?.latitud,
        longitud: sala?.longitud,
        fecha: assignment.fecha,
        hora_inicio: completionStartTime,
        hora_fin: horaFin,
        duracion_minutos: Math.max(1, duracionMinutos),
        fotos_antes_ids: result.fotos_antes_ids || [],
        fotos_durante_ids: result.fotos_durante_ids || [],
        fotos_despues_ids: result.fotos_despues_ids || [],
        observaciones: assignment.notas,
        usuario_completo: user?.nombre_completo || user?.email || 'Usuario',
      });

      if (reportResult.success) {
        alert('✅ Limpieza completada y reporte generado exitosamente');
      } else {
        alert(`Error al completar: ${reportResult.error}`);
      }
    } catch (error) {
      console.error('Error al completar asignación:', error);
      handleMutationError(error, 'Error al completar la asignación');
    }

    setShowPhotosModal(false);
    setCurrentAssignmentId(null);
    setCurrentAssignment(null);
    setCompletionStartTime(null);
  };

  if (loading) {
    return (
      <div className="cleaning-assignments">
        <Card>
          <div className="cleaning-assignments__empty">
            <p>Cargando...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="cleaning-assignments">
      {/* Botón para crear nueva asignación */}
      <div className="cleaning-assignments__header">
        <Button
          variant="primary"
          icon={<Plus size={18} />}
          onClick={() => setShowModal(true)}
        >
          Nueva Asignación
        </Button>
      </div>

      {/* Modal de Nueva Asignación */}
      <CleaningModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setCurrentAssignment(null);
        }}
        assignment={currentAssignment}
        onSave={handleSave}
        isEditing={!!currentAssignment}
      />

      {/* Modal de Fotos */}
      {showPhotosModal && currentAssignmentId && currentAssignment && (
        <PhotosModal
          isOpen={showPhotosModal}
          onClose={() => {
            setShowPhotosModal(false);
            setCurrentAssignmentId(null);
            setCurrentAssignment(null);
            setCompletionStartTime(null);
          }}
          onComplete={handlePhotosComplete}
          assignmentId={currentAssignmentId}
          assignmentData={{
            sala: lugares.find(l => l._id === currentAssignment.sala_id)?.nombre || 'Sala',
          }}
        />
      )}

      {/* Lista de asignaciones existentes */}
      <div className="cleaning-assignments__list">
        <Card title="Asignaciones Recientes">
          {assignments.length === 0 ? (
            <div className="cleaning-assignments__empty">
              <ImageIcon size={48} color="#ccc" />
              <p>No hay asignaciones creadas aún</p>
              <p className="cleaning-assignments__empty-hint">
                Haz clic en "Nueva Asignación" para comenzar
              </p>
            </div>
          ) : (
            <div className="cleaning-assignments__grid">
              {assignments.slice(0, 10).map((assignment) => {
                const sala = lugares.find(l => l._id === assignment.sala_id);

                return (
                  <div key={assignment._id} className="assignment-card">
                    <div className="assignment-card__header">
                      <span className="assignment-card__lugar">
                        {sala?.nombre || 'Sin sala'}
                      </span>
                      <span className={`assignment-card__status assignment-card__status--${assignment.estado}`}>
                        {assignment.estado}
                      </span>
                    </div>
                    <div className="assignment-card__date">
                      <Calendar size={14} />
                      <span>{new Date(assignment.fecha).toLocaleDateString('es-ES')} - {assignment.hora}</span>
                    </div>

                    {/* Botón para completar si está pendiente */}
                    {assignment.estado === 'pendiente' && (
                      <button
                        className="assignment-card__complete-btn"
                        onClick={() => handleStartComplete(assignment)}
                      >
                        <Camera size={16} />
                        Completar con Fotos
                      </button>
                    )}

                    {/* Indicador si ya está completada */}
                    {assignment.estado === 'completada' && (
                      <div className="assignment-card__completed">
                        <CheckCircle size={16} />
                        Completada
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CleaningAssignments;
