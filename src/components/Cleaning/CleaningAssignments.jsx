import { useState } from 'react';
import { Plus, Calendar, MapPin, Image as ImageIcon } from '../Icons';
import { Button, Card } from '../UI';
import { useSupabaseCleaning } from '../../context/SupabaseCleaningContext';
import PhotosModal from './PhotosModal';
import './CleaningAssignments.css';

const CleaningAssignments = ({ userRole }) => {
  const { salas, areas, assignments, loading, addAssignment, getAreasBySala } = useSupabaseCleaning();

  const [showForm, setShowForm] = useState(false);
  const [showPhotosModal, setShowPhotosModal] = useState(false);
  const [currentAssignmentId, setCurrentAssignmentId] = useState(null);
  const [formData, setFormData] = useState({
    sala_id: '',
    area_id: '',
    fecha: '',
    hora: '',
  });

  const [errors, setErrors] = useState({});
  const [availableAreas, setAvailableAreas] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSalaChange = (e) => {
    const salaId = e.target.value;
    setFormData({ ...formData, sala_id: salaId, area_id: '' });
    setAvailableAreas(getAreasBySala(salaId));
    setErrors({ ...errors, sala_id: '' });
  };

  const handleAreaChange = (e) => {
    const areaId = e.target.value;
    setFormData({ ...formData, area_id: areaId });
    setErrors({ ...errors, area_id: '' });

    // Abrir modal de fotos automáticamente después de seleccionar área
    if (areaId && formData.sala_id) {
      setTimeout(() => {
        setShowPhotosModal(true);
      }, 300);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.sala_id) newErrors.sala_id = 'Seleccione una sala';
    if (!formData.area_id) newErrors.area_id = 'Seleccione un área';
    if (!formData.fecha) newErrors.fecha = 'Seleccione una fecha';
    if (!formData.hora) newErrors.hora = 'Seleccione una hora';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const result = await addAssignment(formData);

      if (result.success) {
        // Guardar el ID de la asignación para el modal de fotos
        setCurrentAssignmentId(result.data.id);

        // Resetear formulario
        setFormData({ sala_id: '', area_id: '', fecha: '', hora: '' });
        setAvailableAreas([]);
        setShowForm(false);

        // Mostrar mensaje de éxito
        alert('Asignación creada con éxito');
      } else {
        alert(`Error al crear asignación: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear la asignación');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotosComplete = (photos) => {
    console.log('Fotos guardadas:', photos);
    setShowPhotosModal(false);
    setCurrentAssignmentId(null);
  };

  // Obtener nombre de sala por ID
  const getSalaNombre = (salaId) => {
    const sala = salas.find(s => s.id === salaId);
    return sala ? sala.nombre : '';
  };

  // Obtener nombre de área por ID
  const getAreaNombre = (areaId) => {
    const area = areas.find(a => a.id === areaId);
    return area ? area.nombre : '';
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
      {!showForm && (
        <div className="cleaning-assignments__header">
          <Button
            variant="primary"
            icon={<Plus size={18} />}
            onClick={() => setShowForm(true)}
          >
            Nueva Asignación
          </Button>
        </div>
      )}

      {/* Formulario de nueva asignación */}
      {showForm && (
        <Card className="cleaning-assignments__form-card" title="Nueva Asignación de Limpieza">
          <form onSubmit={handleSubmit} className="cleaning-form">
            <div className="cleaning-form__grid">
              {/* Sala */}
              <div className="cleaning-form__field">
                <label className="cleaning-form__label">
                  <MapPin size={16} />
                  <span>Sala</span>
                </label>
                <select
                  value={formData.sala_id}
                  onChange={handleSalaChange}
                  className={`cleaning-form__select ${errors.sala_id ? 'cleaning-form__select--error' : ''}`}
                  disabled={submitting}
                >
                  <option value="">Seleccionar sala...</option>
                  {salas.map((sala) => (
                    <option key={sala.id} value={sala.id}>
                      {sala.nombre}
                    </option>
                  ))}
                </select>
                {errors.sala_id && (
                  <span className="cleaning-form__error">{errors.sala_id}</span>
                )}
              </div>

              {/* Área */}
              <div className="cleaning-form__field">
                <label className="cleaning-form__label">
                  <MapPin size={16} />
                  <span>Área</span>
                </label>
                <select
                  value={formData.area_id}
                  onChange={handleAreaChange}
                  disabled={!formData.sala_id || submitting}
                  className={`cleaning-form__select ${errors.area_id ? 'cleaning-form__select--error' : ''}`}
                >
                  <option value="">Seleccionar área...</option>
                  {availableAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.nombre}
                    </option>
                  ))}
                </select>
                {errors.area_id && (
                  <span className="cleaning-form__error">{errors.area_id}</span>
                )}
              </div>

              {/* Fecha */}
              <div className="cleaning-form__field">
                <label className="cleaning-form__label">
                  <Calendar size={16} />
                  <span>Fecha</span>
                </label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => {
                    setFormData({ ...formData, fecha: e.target.value });
                    setErrors({ ...errors, fecha: '' });
                  }}
                  className={`cleaning-form__input ${errors.fecha ? 'cleaning-form__input--error' : ''}`}
                  disabled={submitting}
                />
                {errors.fecha && (
                  <span className="cleaning-form__error">{errors.fecha}</span>
                )}
              </div>

              {/* Hora */}
              <div className="cleaning-form__field">
                <label className="cleaning-form__label">
                  <Calendar size={16} />
                  <span>Hora</span>
                </label>
                <input
                  type="time"
                  value={formData.hora}
                  onChange={(e) => {
                    setFormData({ ...formData, hora: e.target.value });
                    setErrors({ ...errors, hora: '' });
                  }}
                  className={`cleaning-form__input ${errors.hora ? 'cleaning-form__input--error' : ''}`}
                  disabled={submitting}
                />
                {errors.hora && (
                  <span className="cleaning-form__error">{errors.hora}</span>
                )}
              </div>
            </div>

            {/* Botones */}
            <div className="cleaning-form__actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ sala_id: '', area_id: '', fecha: '', hora: '' });
                  setErrors({});
                  setAvailableAreas([]);
                }}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                icon={<ImageIcon size={18} />}
                disabled={submitting}
              >
                {submitting ? 'Creando...' : 'Crear Asignación'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Modal de Fotos */}
      {showPhotosModal && currentAssignmentId && (
        <PhotosModal
          isOpen={showPhotosModal}
          onClose={() => setShowPhotosModal(false)}
          onComplete={handlePhotosComplete}
          assignmentId={currentAssignmentId}
          assignmentData={{
            sala: getSalaNombre(formData.sala_id),
            area: getAreaNombre(formData.area_id),
          }}
        />
      )}

      {/* Lista de asignaciones existentes */}
      {!showForm && (
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
                      <span className="assignment-card__sala">
                        {assignment.sala?.nombre}
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
      )}
    </div>
  );
};

export default CleaningAssignments;
