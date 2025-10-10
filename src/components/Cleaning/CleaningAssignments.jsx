import { useState } from 'react';
import { Plus, Calendar, MapPin, Image as ImageIcon, Camera } from '../Icons';
import { Button, Card } from '../UI';
import { useSupabaseCleaning } from '../../context/SupabaseCleaningContext';
import PhotosModal from './PhotosModal';
import PhotoUploadField from './PhotoUploadField';
import './CleaningAssignments.css';

const CleaningAssignments = ({ userRole }) => {
  const { salas, areas, assignments, loading, addAssignment, getAreasBySala, uploadPhoto } = useSupabaseCleaning();

  const [showForm, setShowForm] = useState(false);
  const [showPhotosModal, setShowPhotosModal] = useState(false);
  const [currentAssignmentId, setCurrentAssignmentId] = useState(null);
  const [formData, setFormData] = useState({
    sala_id: '',
    area_id: '',
    fecha: '',
    hora: '',
  });

  const [photos, setPhotos] = useState({
    before: [],
    during: [],
    after: []
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
  };

  const handlePhotosChange = (type, newPhotos) => {
    setPhotos({ ...photos, [type]: newPhotos });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.sala_id) newErrors.sala_id = 'Seleccione una sala';
    if (!formData.area_id) newErrors.area_id = 'Seleccione un área';
    if (!formData.fecha) newErrors.fecha = 'Seleccione una fecha';
    if (!formData.hora) newErrors.hora = 'Seleccione una hora';

    if (formData.area_id) {
      if (photos.before.length === 0) newErrors.photos = 'Debe agregar al menos una foto de "Antes"';
      else if (photos.during.length === 0) newErrors.photos = 'Debe agregar al menos una foto de "Durante"';
      else if (photos.after.length === 0) newErrors.photos = 'Debe agregar al menos una foto de "Después"';
    }

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
        const assignmentId = result.data.id;

        const allPhotos = [
          ...photos.before.map(p => ({ file: p.file, etapa: 'antes' })),
          ...photos.during.map(p => ({ file: p.file, etapa: 'durante' })),
          ...photos.after.map(p => ({ file: p.file, etapa: 'despues' }))
        ];

        let uploadedCount = 0;
        const uploadErrors = [];

        for (const photo of allPhotos) {
          const uploadResult = await uploadPhoto(assignmentId, photo.etapa, photo.file);
          if (uploadResult.success) {
            uploadedCount++;
          } else {
            uploadErrors.push(uploadResult.error);
          }
        }

        if (uploadErrors.length > 0) {
          alert(`Asignación creada pero hubo errores al subir ${uploadErrors.length} foto(s)`);
        } else {
          alert(`Asignación creada exitosamente con ${uploadedCount} foto(s)`);
        }

        setFormData({ sala_id: '', area_id: '', fecha: '', hora: '' });
        setPhotos({ before: [], during: [], after: [] });
        setAvailableAreas([]);
        setShowForm(false);
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

              {/* Fecha y Hora */}
              <div className="cleaning-form__field">
                <label className="cleaning-form__label">
                  <Calendar size={16} />
                  <span>Fecha y Hora</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.fecha && formData.hora ? `${formData.fecha}T${formData.hora}` : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      const [date, time] = value.split('T');
                      setFormData({ ...formData, fecha: date, hora: time });
                      setErrors({ ...errors, fecha: '', hora: '' });
                    }
                  }}
                  className={`cleaning-form__input ${errors.fecha || errors.hora ? 'cleaning-form__input--error' : ''}`}
                  disabled={submitting}
                  step="900"
                />
                {(errors.fecha || errors.hora) && (
                  <span className="cleaning-form__error">{errors.fecha || errors.hora}</span>
                )}
              </div>
            </div>

            {/* Sección de Fotos - Se expande al seleccionar área */}
            {formData.area_id && (
              <div className="cleaning-form__photos-section">
                <div className="photos-section__header">
                  <div className="photos-header-content">
                    <Camera size={20} />
                    <h3>Evidencias Fotográficas</h3>
                  </div>
                  <span className="photos-required-badge">Requeridas</span>
                </div>

                <div className="photos-grid">
                  <PhotoUploadField
                    label="Antes de Limpiar"
                    type="before"
                    photos={photos.before}
                    onPhotosChange={(newPhotos) => handlePhotosChange('before', newPhotos)}
                    maxPhotos={3}
                  />

                  <PhotoUploadField
                    label="Durante la Limpieza"
                    type="during"
                    photos={photos.during}
                    onPhotosChange={(newPhotos) => handlePhotosChange('during', newPhotos)}
                    maxPhotos={3}
                  />

                  <PhotoUploadField
                    label="Después de Limpiar"
                    type="after"
                    photos={photos.after}
                    onPhotosChange={(newPhotos) => handlePhotosChange('after', newPhotos)}
                    maxPhotos={3}
                  />
                </div>

                {errors.photos && (
                  <div className="photos-error">
                    <span>{errors.photos}</span>
                  </div>
                )}
              </div>
            )}

            {/* Botones */}
            <div className="cleaning-form__actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ sala_id: '', area_id: '', fecha: '', hora: '' });
                  setPhotos({ before: [], during: [], after: [] });
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
