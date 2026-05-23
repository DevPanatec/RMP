import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  CheckCircle, AlertTriangle, Bug
} from '../Icons';
import { Modal } from '../UI';
import { useFumigation } from '../../context/FumigationContext';
import { handleMutationError } from '../../utils/mutationError';
import SimplePhotoSlots from '../Cleaning/SimplePhotoSlots';
import './FumigationModal.css';

const PRESET_HORARIO = {
  inicio: '19:00',
  fin: '23:00'
};

const FumigationModal = ({ isOpen, onClose, assignment, onSave, isEditing }) => {
  const { lugares, uploadPhoto } = useFumigation();

  const [formData, setFormData] = useState({
    tipo_fumigacion: '',
    lugar_id: '',
    fecha: '',
    horario_inicio: PRESET_HORARIO.inicio,
    horario_fin: PRESET_HORARIO.fin,
    descripcion: ''
  });

  const [photos, setPhotos] = useState({
    before: [],
    during: [],
    after: []
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Query para verificar duplicados
  const checkDuplicate = useQuery(
    api.fumigaciones.checkDuplicate,
    formData.tipo_fumigacion && formData.lugar_id && formData.fecha
      ? {
          tipo_fumigacion: formData.tipo_fumigacion,
          lugar_id: formData.lugar_id,
          fecha: formData.fecha,
        }
      : 'skip'
  );

  // Query para verificar límite de frecuencia
  const frequencyCheck = useQuery(
    api.fumigaciones.checkFrequencyCompliance,
    formData.tipo_fumigacion && formData.lugar_id && formData.fecha
      ? {
          tipo_fumigacion: formData.tipo_fumigacion,
          lugar_id: formData.lugar_id,
          fecha: formData.fecha,
        }
      : 'skip'
  );

  useEffect(() => {
    if (assignment && isEditing) {
      setFormData({
        tipo_fumigacion: assignment.tipo_fumigacion || '',
        lugar_id: assignment.lugar_id || '',
        fecha: assignment.fecha || '',
        horario_inicio: assignment.horario_inicio || PRESET_HORARIO.inicio,
        horario_fin: assignment.horario_fin || PRESET_HORARIO.fin,
        descripcion: assignment.observaciones || ''
      });
    } else {
      setFormData({
        tipo_fumigacion: '',
        lugar_id: '',
        fecha: '',
        horario_inicio: PRESET_HORARIO.inicio,
        horario_fin: PRESET_HORARIO.fin,
        descripcion: ''
      });
    }
    setErrors({});
    setPhotos({ before: [], during: [], after: [] });
    setDuplicateWarning(null);
  }, [assignment, isEditing, isOpen]);

  useEffect(() => {
    if (checkDuplicate === true) {
      setDuplicateWarning('Ya existe una fumigación de este tipo para este lugar en esta fecha');
    } else {
      setDuplicateWarning(null);
    }
  }, [checkDuplicate]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePhotosChange = (type, newPhotos) => {
    setPhotos(prev => ({ ...prev, [type]: newPhotos }));
    if (errors.photos) {
      setErrors(prev => ({ ...prev, photos: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.tipo_fumigacion) {
      newErrors.tipo_fumigacion = 'Seleccione el tipo de fumigación';
    }

    if (!formData.lugar_id) {
      newErrors.lugar_id = 'Seleccione un lugar';
    }

    if (!formData.fecha) {
      newErrors.fecha = 'Seleccione una fecha';
    }

    const totalPhotosCount = photos.before.length + photos.during.length + photos.after.length;
    if (totalPhotosCount === 0) {
      newErrors.photos = 'Debe agregar al menos una evidencia fotográfica';
    }

    if (checkDuplicate === true) {
      newErrors.duplicate = 'Ya existe un registro duplicado';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const assignmentData = {
        tipo_fumigacion: formData.tipo_fumigacion,
        lugar_id: formData.lugar_id,
        fecha: formData.fecha,
        horario_inicio: formData.horario_inicio,
        horario_fin: formData.horario_fin,
        observaciones: formData.descripcion || undefined
      };

      const result = await onSave(assignmentData);

      if (result.success && result.id) {
        const assignmentId = result.id;

        // Subir fotos con etapa
        const allPhotos = [
          ...photos.before.map(p => ({ file: p.file, etapa: 'antes' })),
          ...photos.during.map(p => ({ file: p.file, etapa: 'durante' })),
          ...photos.after.map(p => ({ file: p.file, etapa: 'despues' }))
        ];

        for (const photo of allPhotos) {
          await uploadPhoto(photo.file, assignmentId, photo.etapa);
        }

        setFormData({
          tipo_fumigacion: '',
          lugar_id: '',
          fecha: '',
          horario_inicio: PRESET_HORARIO.inicio,
          horario_fin: PRESET_HORARIO.fin,
          descripcion: ''
        });
        setPhotos({ before: [], during: [], after: [] });
        onClose();
      }
    } catch (error) {
      console.error('Error al registrar fumigación:', error);
      const userMsg = handleMutationError(error, 'Error al registrar la fumigación');
      setErrors({ submit: userMsg });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const totalPhotos = (photos.before.length > 0 ? 1 : 0) + (photos.during.length > 0 ? 1 : 0) + (photos.after.length > 0 ? 1 : 0);

  const getValidationStatus = () => {
    if (!formData.tipo_fumigacion) return { icon: AlertTriangle, text: 'Selecciona el tipo de fumigación', type: 'error' };
    if (!formData.lugar_id) return { icon: AlertTriangle, text: 'Selecciona un lugar', type: 'error' };
    if (!formData.fecha) return { icon: AlertTriangle, text: 'Selecciona una fecha', type: 'error' };
    if (totalPhotos === 0) return { icon: AlertTriangle, text: 'Agrega al menos una foto', type: 'warning' };
    if (checkDuplicate === true) return { icon: AlertTriangle, text: 'Registro duplicado detectado', type: 'error' };
    return { icon: CheckCircle, text: 'Listo para guardar', type: 'success' };
  };

  const validationStatus = getValidationStatus();

  return (
    <Modal open onClose={onClose} size="lg" variant="form">
      <Modal.Header icon={<Bug size={18} />} onClose={onClose} id="fumigation-modal-title">
        Registrar Fumigación
      </Modal.Header>
      <Modal.Body className="fumigation-modal-body">
          <div className="form-grid">
            {/* Tipo de Fumigación */}
            <div className="form-group">
              <label>Tipo de Fumigación *</label>
              <select
                value={formData.tipo_fumigacion}
                onChange={e => handleChange('tipo_fumigacion', e.target.value)}
                className={`fumigation-input ${errors.tipo_fumigacion ? 'error' : ''}`}
                disabled={submitting}
              >
                <option value="">Seleccionar tipo...</option>
                <option value="interna">Interna (Mensual)</option>
                <option value="externa">Externa (Semanal)</option>
              </select>
              {errors.tipo_fumigacion && <span className="error-text">{errors.tipo_fumigacion}</span>}
            </div>

            {/* Lugar */}
            <div className="form-group">
              <label>Lugar *</label>
              <select
                value={formData.lugar_id}
                onChange={e => handleChange('lugar_id', e.target.value)}
                className={`fumigation-input ${errors.lugar_id ? 'error' : ''}`}
                disabled={submitting}
              >
                <option value="">Seleccionar lugar...</option>
                {lugares.map((lugar) => (
                  <option key={lugar._id} value={lugar._id}>
                    {lugar.nombre}
                  </option>
                ))}
              </select>
              {errors.lugar_id && <span className="error-text">{errors.lugar_id}</span>}
            </div>

            {/* Fecha */}
            <div className="form-group">
              <label>Fecha *</label>
              <input
                type="date"
                value={formData.fecha}
                onChange={e => handleChange('fecha', e.target.value)}
                className={`fumigation-input ${errors.fecha ? 'error' : ''}`}
                disabled={submitting}
              />
              {errors.fecha && <span className="error-text">{errors.fecha}</span>}
            </div>

            {/* Horarios */}
            <div className="form-row-inline">
              <div className="form-group">
                <label>Hora de Inicio</label>
                <input
                  type="time"
                  value={formData.horario_inicio}
                  onChange={e => handleChange('horario_inicio', e.target.value)}
                  className="fumigation-input"
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label>Hora de Fin</label>
                <input
                  type="time"
                  value={formData.horario_fin}
                  onChange={e => handleChange('horario_fin', e.target.value)}
                  className="fumigation-input"
                  disabled={submitting}
                />
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={e => handleChange('descripcion', e.target.value)}
              className="fumigation-input"
              rows={3}
              placeholder="Detalles adicionales sobre la fumigación..."
              disabled={submitting}
            />
          </div>

          {/* Warnings */}
          {frequencyCheck && frequencyCheck.excedido && (
            <div className="warning-banner">
              <AlertTriangle size={16} />
              <span>
                Límite de frecuencia: {frequencyCheck.actual}/{frequencyCheck.limite} {frequencyCheck.periodo === 'mes' ? 'mensuales' : 'semanales'} para este lugar
              </span>
            </div>
          )}

          {duplicateWarning && (
            <div className="error-banner">
              <AlertTriangle size={16} />
              <span>{duplicateWarning}</span>
            </div>
          )}

          {/* Evidencias Fotográficas */}
          <div className="photos-section">
            <SimplePhotoSlots
              photos={photos}
              onPhotosChange={setPhotos}
              disabled={submitting}
              labels={{ before: 'ANTES', during: 'DURANTE', after: 'DESPUÉS' }}
            />

            {errors.photos && (
              <div className="error-banner" style={{ marginTop: '12px' }}>
                <AlertTriangle size={16} />
                <span>{errors.photos}</span>
              </div>
            )}
          </div>
      </Modal.Body>

      <Modal.Footer align="between">
        <span className={`validation-info ${validationStatus.type}`}>
          <validationStatus.icon size={16} />
          <span>{validationStatus.text}</span>
        </span>
        <div className="footer-actions">
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSave}
            disabled={validationStatus.type === 'error' || submitting}
            data-autofocus
          >
            {submitting ? (
              <>Guardando...</>
            ) : (
              <><CheckCircle size={16} /> Registrar Fumigación</>
            )}
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default FumigationModal;
