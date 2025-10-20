import { useState } from 'react';
import { Plus, Calendar, Image as ImageIcon } from '../Icons';
import { Button, Card } from '../UI';
import { useSupabaseCleaning } from '../../context/SupabaseCleaningContext';
import PhotosModal from './PhotosModal';
import CleaningModal from './CleaningModal';
import './CleaningAssignments.css';

const CleaningAssignments = ({ userRole }) => {
  const { lugares, areas, assignments, loading, addAssignment } = useSupabaseCleaning();

  const [showModal, setShowModal] = useState(false);
  const [showPhotosModal, setShowPhotosModal] = useState(false);
  const [currentAssignmentId, setCurrentAssignmentId] = useState(null);
  const [currentAssignment, setCurrentAssignment] = useState(null);

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
      alert('Error al crear la asignación');
      return { success: false, error: error.message };
    }
  };

  const handlePhotosComplete = (photos) => {
    console.log('Fotos guardadas:', photos);
    setShowPhotosModal(false);
    setCurrentAssignmentId(null);
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
      {showPhotosModal && currentAssignmentId && (
        <PhotosModal
          isOpen={showPhotosModal}
          onClose={() => setShowPhotosModal(false)}
          onComplete={handlePhotosComplete}
          assignmentId={currentAssignmentId}
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
              {assignments.slice(0, 5).map((assignment) => (
                <div key={assignment.id} className="assignment-card">
                  <div className="assignment-card__header">
                    <span className="assignment-card__lugar">
                      {assignment.lugar?.nombre}
                    </span>
                    <span className={`assignment-card__status assignment-card__status--${assignment.estado}`}>
                      {assignment.estado}
                    </span>
                  </div>
                  <div className="assignment-card__area">
                    {assignment.area?.nombre}
                  </div>
                  <div className="assignment-card__date">
                    <Calendar size={14} />
                    <span>{new Date(assignment.fecha).toLocaleDateString('es-ES')} - {assignment.hora}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CleaningAssignments;
