import { useState } from 'react';
import { Plus, MapPin, Calendar, Image as ImageIcon, Clock, Bug, Edit3, Trash2, CheckCircle, Building, Leaf } from '../Icons';
import { Button, Card, SkeletonList } from '../UI';
import { useFumigation } from '../../context/FumigationContext';
import FumigationModal from './FumigationModal';
import PhotosModal from './PhotosModal';
import toast from 'react-hot-toast';
import './FumigationAssignments.css';

const ESTADO_LABELS = {
  programada: { label: 'Programada', cls: 'fumigation-card__estado--programada' },
  realizada:  { label: 'Realizada',  cls: 'fumigation-card__estado--realizada'  },
  reportada:  { label: 'Reportada',  cls: 'fumigation-card__estado--reportada'  },
};

const FumigationAssignments = ({ userRole }) => {
  const { lugares, assignments, loading, createAssignment, updateAssignment, updateEstado, deleteAssignment } = useFumigation();

  const [showModal, setShowModal]           = useState(false);
  const [showPhotosModal, setShowPhotosModal] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);

  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  const handleSave = async (assignmentData) => {
    try {
      let result;
      if (currentAssignment) {
        result = await updateAssignment(currentAssignment._id, assignmentData);
        if (result.success) {
          toast.success('Fumigación actualizada');
          setShowModal(false);
          setCurrentAssignment(null);
        } else {
          toast.error(result.error || 'Error al actualizar');
        }
      } else {
        result = await createAssignment(assignmentData);
        if (result.success) {
          toast.success('Fumigación registrada exitosamente');
          setShowModal(false);
        } else {
          toast.error(result.error || 'Error al registrar fumigación');
        }
      }
      return result;
    } catch (error) {
      console.error('Error guardando fumigación:', error);
      toast.error('Error al guardar fumigación');
      return { success: false, error: error.message };
    }
  };

  const handleEdit = (e, assignment) => {
    e.stopPropagation();
    setCurrentAssignment(assignment);
    setShowModal(true);
  };

  const handleMarkRealizada = async (e, assignment) => {
    e.stopPropagation();
    const result = await updateEstado(assignment._id, 'realizada');
    if (result.success) {
      toast.success('Marcada como realizada');
    } else {
      toast.error(result.error || 'Error al actualizar estado');
    }
  };

  const handleDelete = async (e, assignment) => {
    e.stopPropagation();
    if (!window.confirm(`¿Eliminar fumigación del ${new Date(assignment.fecha).toLocaleDateString('es-ES')}?`)) return;
    const result = await deleteAssignment(assignment._id);
    if (result.success) {
      toast.success('Fumigación eliminada');
    } else {
      toast.error(result.error || 'Error al eliminar');
    }
  };

  const handleViewPhotos = (assignment) => {
    setSelectedAssignmentId(assignment._id);
    setShowPhotosModal(true);
  };

  const getTipoLabel = (tipo) => tipo === 'interna' ? (
    <>
      <Building size={14} aria-hidden="true" /> Interna (Mensual)
    </>
  ) : (
    <>
      <Leaf size={14} aria-hidden="true" /> Externa (Semanal)
    </>
  );

  if (loading) {
    return (
      <div className="fumigation-assignments">
        <SkeletonList count={3} itemHeight={120} />
      </div>
    );
  }

  return (
    <div className="fumigation-assignments">
      <div className="fumigation-assignments__header">
        <Button variant="primary" icon={<Plus size={18} />} onClick={() => { setCurrentAssignment(null); setShowModal(true); }}>
          Registrar Fumigación
        </Button>
      </div>

      <FumigationModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setCurrentAssignment(null); }}
        assignment={currentAssignment}
        onSave={handleSave}
        isEditing={!!currentAssignment}
      />

      {showPhotosModal && selectedAssignmentId && (
        <PhotosModal
          isOpen={showPhotosModal}
          onClose={() => setShowPhotosModal(false)}
          assignmentId={selectedAssignmentId}
        />
      )}

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
            const lugarAssignments = assignments.filter((a) => a.lugar_id === lugar._id);
            if (lugarAssignments.length === 0) return null;

            return (
              <Card
                key={lugar._id}
                title={
                  <span className="card-title-with-icon">
                    <MapPin size={16} aria-hidden="true" /> {lugar.nombre}
                  </span>
                }
              >
                <div className="fumigation-assignments__lugar-header">
                  <span className="fumigation-assignments__lugar-count">
                    {lugarAssignments.length} fumigacion{lugarAssignments.length !== 1 ? 'es' : ''}
                  </span>
                </div>

                <div className="fumigation-assignments__grid">
                  {lugarAssignments.map((assignment) => {
                    const estadoInfo = ESTADO_LABELS[assignment.estado] || ESTADO_LABELS.programada;
                    return (
                      <div key={assignment._id} className="fumigation-card" onClick={() => handleViewPhotos(assignment)}>
                        <div className="fumigation-card__header">
                          <span className="fumigation-card__tipo">{getTipoLabel(assignment.tipo_fumigacion)}</span>
                          <span className={`fumigation-card__estado ${estadoInfo.cls}`}>{estadoInfo.label}</span>
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
                            <div className="fumigation-card__observaciones">{assignment.observaciones}</div>
                          )}
                        </div>

                        <div className="fumigation-card__footer">
                          <div className="fumigation-card__footer-left">
                            <ImageIcon size={14} />
                            <span>Ver evidencias</span>
                          </div>
                          {isAdmin && (
                            <div className="fumigation-card__actions" onClick={(e) => e.stopPropagation()}>
                              {assignment.estado === 'programada' && (
                                <button
                                  className="fumigation-card__action-btn fumigation-card__action-btn--realizada"
                                  onClick={(e) => handleMarkRealizada(e, assignment)}
                                  title="Marcar como realizada"
                                >
                                  <CheckCircle size={14} />
                                </button>
                              )}
                              <button
                                className="fumigation-card__action-btn fumigation-card__action-btn--edit"
                                onClick={(e) => handleEdit(e, assignment)}
                                title="Editar"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                className="fumigation-card__action-btn fumigation-card__action-btn--delete"
                                onClick={(e) => handleDelete(e, assignment)}
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
