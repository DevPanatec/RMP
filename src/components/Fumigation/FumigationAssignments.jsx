import { useState } from 'react';
import { Plus, MapPin, Calendar, Image as ImageIcon, Clock, Bug } from '../Icons';
import { Button, Card } from '../UI';
import { useFumigation } from '../../context/FumigationContext';
import FumigationModal from './FumigationModal';
import PhotosModal from './PhotosModal';
import './FumigationAssignments.css';

const FumigationAssignments = ({ userRole }) => {
  const { lugares, assignments, loading, createAssignment } = useFumigation();

  const [showModal, setShowModal] = useState(false);
  const [showPhotosModal, setShowPhotosModal] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);

  const handleSave = async (assignmentData) => {
    try {
      const result = await createAssignment(assignmentData);

      if (result.success) {
        alert('✅ Fumigación registrada exitosamente');
        setShowModal(false);
        return result;
      } else {
        alert(`❌ Error: ${result.error}`);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Error al registrar fumigación');
      return { success: false, error: error.message };
    }
  };

  const handleViewPhotos = (assignment) => {
    setSelectedAssignmentId(assignment._id);
    setShowPhotosModal(true);
  };

  const getTipoLabel = (tipo) => {
    return tipo === 'interna' ? '🏢 Interna (Mensual)' : '🌳 Externa (Semanal)';
  };

  if (loading) {
    return (
      <div className="fumigation-assignments">
        <Card>
          <div className="fumigation-assignments__empty">
            <p>Cargando...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fumigation-assignments">
      {/* Botón para registrar nueva fumigación */}
      <div className="fumigation-assignments__header">
        <Button
          variant="primary"
          icon={<Plus size={18} />}
          onClick={() => setShowModal(true)}
        >
          Registrar Fumigación
        </Button>
      </div>

      {/* Modal de Registro de Fumigación */}
      <FumigationModal
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
      {showPhotosModal && selectedAssignmentId && (
        <PhotosModal
          isOpen={showPhotosModal}
          onClose={() => setShowPhotosModal(false)}
          assignmentId={selectedAssignmentId}
        />
      )}

      {/* Vista agrupada por lugar */}
      <div className="fumigation-assignments__content">
        {lugares.length === 0 ? (
          <Card>
            <div className="fumigation-assignments__empty">
              <MapPin size={48} color="#ccc" />
              <p>No hay lugares registrados</p>
              <p className="fumigation-assignments__empty-hint">
                Registra lugares primero para poder asignar fumigaciones
              </p>
            </div>
          </Card>
        ) : (
          lugares.map((lugar) => {
            const lugarAssignments = assignments.filter(
              (a) => a.lugar_id === lugar._id
            );

            if (lugarAssignments.length === 0) return null;

            return (
              <Card key={lugar._id} title={`📍 ${lugar.nombre}`}>
                <div className="fumigation-assignments__lugar-header">
                  <span className="fumigation-assignments__lugar-count">
                    {lugarAssignments.length} fumigacion{lugarAssignments.length !== 1 ? 'es' : ''}
                  </span>
                </div>

                <div className="fumigation-assignments__grid">
                  {lugarAssignments.map((assignment) => (
                    <div
                      key={assignment._id}
                      className="fumigation-card"
                      onClick={() => handleViewPhotos(assignment)}
                    >
                      <div className="fumigation-card__header">
                        <span className="fumigation-card__tipo">
                          {getTipoLabel(assignment.tipo_fumigacion)}
                        </span>
                      </div>

                      <div className="fumigation-card__body">
                        <div className="fumigation-card__row">
                          <Calendar size={14} />
                          <span>{new Date(assignment.fecha).toLocaleDateString('es-ES')}</span>
                        </div>

                        <div className="fumigation-card__row">
                          <Clock size={14} />
                          <span>{assignment.horario_inicio} - {assignment.horario_fin}</span>
                        </div>

                        {assignment.observaciones && (
                          <div className="fumigation-card__observaciones">
                            {assignment.observaciones}
                          </div>
                        )}
                      </div>

                      <div className="fumigation-card__footer">
                        <ImageIcon size={14} />
                        <span>Ver evidencias</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })
        )}

        {assignments.length === 0 && lugares.length > 0 && (
          <Card>
            <div className="fumigation-assignments__empty">
              <Bug size={48} color="#ccc" />
              <p>No hay fumigaciones registradas aún</p>
              <p className="fumigation-assignments__empty-hint">
                Haz clic en "Registrar Fumigación" para comenzar
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FumigationAssignments;
