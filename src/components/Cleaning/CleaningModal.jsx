import { useState, useEffect } from 'react';
import {
  Plus, X, FileText, Camera, CheckCircle,
  AlertTriangle, MapPin, Calendar, Clock,
  Edit, Save, Image as ImageIcon
} from '../Icons';
import { useCleaning } from '../../context/CleaningContext';
import { handleMutationError } from '../../utils/mutationError';
import SimplePhotoSlots from './SimplePhotoSlots';
import './CleaningModal.css';

const TABS = {
  INFO: 'info',
  EVIDENCE: 'evidence',
  SUMMARY: 'summary'
};

const CleaningModal = ({ isOpen, onClose, assignment, onSave, isEditing }) => {
  const { lugares, uploadPhoto } = useCleaning();

  const [activeTab, setActiveTab] = useState(TABS.INFO);
  const [formData, setFormData] = useState({
    sala_id: '',
    fecha: '',
    hora: '',
    tipo_limpieza: 'regular'
  });

  const [photos, setPhotos] = useState({
    before: [],
    during: [],
    after: []
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (assignment && isEditing) {
      setFormData({
        sala_id: assignment.sala_id || '',
        fecha: assignment.fecha || '',
        hora: assignment.hora || '',
        tipo_limpieza: assignment.tipo_limpieza || 'regular'
      });
    } else {
      setFormData({
        sala_id: '',
        fecha: '',
        hora: '',
        tipo_limpieza: 'regular'
      });
    }
    setActiveTab(TABS.INFO);
    setErrors({});
    setPhotos({ before: [], during: [], after: [] });
  }, [assignment, isEditing, isOpen]);

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

    if (!formData.sala_id) {
      newErrors.sala_id = 'Seleccione un lugar';
    }

    if (!formData.fecha) {
      newErrors.fecha = 'Seleccione una fecha';
    }

    if (!formData.hora) {
      newErrors.hora = 'Seleccione una hora';
    }

    if (photos.before.length === 0) {
      newErrors.photos = 'Debe agregar al menos una foto de "Antes"';
    } else if (photos.during.length === 0) {
      newErrors.photos = 'Debe agregar al menos una foto de "Durante"';
    } else if (photos.after.length === 0) {
      newErrors.photos = 'Debe agregar al menos una foto de "Después"';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      const firstErrorTab = errors.sala_id || errors.fecha || errors.hora
        ? TABS.INFO
        : errors.photos
          ? TABS.EVIDENCE
          : TABS.SUMMARY;
      setActiveTab(firstErrorTab);
      return;
    }

    setSubmitting(true);

    try {
      const assignmentData = {
        sala_id: formData.sala_id,
        fecha: formData.fecha,
        hora: formData.hora,
        tipo_limpieza: formData.tipo_limpieza
      };

      const result = await onSave(assignmentData);

      if (result.success && result.data?.id) {
        const assignmentId = result.data.id;

        const allPhotos = [
          ...photos.before.map(p => ({ file: p.file, etapa: 'antes' })),
          ...photos.during.map(p => ({ file: p.file, etapa: 'durante' })),
          ...photos.after.map(p => ({ file: p.file, etapa: 'despues' }))
        ];

        for (const photo of allPhotos) {
          await uploadPhoto(assignmentId, photo.etapa, photo.file);
        }

        setFormData({ sala_id: '', fecha: '', hora: '', tipo_limpieza: 'regular' });
        setPhotos({ before: [], during: [], after: [] });
        onClose();
      }
    } catch (error) {
      console.error('Error al crear asignación:', error);
      const userMsg = handleMutationError(error, 'Error al crear la asignación');
      setErrors({ submit: userMsg });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const getValidationStatus = () => {
    if (!formData.sala_id) return { icon: AlertTriangle, text: 'Selecciona un lugar', type: 'error' };
    if (!formData.fecha || !formData.hora) return { icon: AlertTriangle, text: 'Completa fecha y hora', type: 'error' };
    if (photos.before.length === 0 || photos.during.length === 0 || photos.after.length === 0) {
      return { icon: AlertTriangle, text: 'Agrega todas las fotos requeridas', type: 'warning' };
    }
    return { icon: CheckCircle, text: 'Listo para guardar', type: 'success' };
  };

  const validationStatus = getValidationStatus();

  const getLugarNombre = (salaId) => {
    const lugar = lugares.find(l => l._id === salaId);
    return lugar ? lugar.nombre : '';
  };

  const totalPhotos = (photos.before.length > 0 ? 1 : 0) + (photos.during.length > 0 ? 1 : 0) + (photos.after.length > 0 ? 1 : 0);

  return (
    <div className="cleaning-modal-overlay" onClick={onClose}>
      <div className="cleaning-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="cleaning-modal-header">
          <div className="modal-header-content">
            <h4>
              {isEditing ? <><Edit size={20} /> Editar Asignación</> : <><Plus size={20} /> Nueva Asignación de Limpieza</>}
            </h4>
            <p>Configura la asignación con información detallada y evidencias fotográficas</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="cleaning-modal-tabs">
          <button
            className={`tab-button ${activeTab === TABS.INFO ? 'active' : ''}`}
            onClick={() => setActiveTab(TABS.INFO)}
          >
            <span className="tab-icon"><FileText size={18} /></span>
            <span className="tab-label">Información</span>
          </button>
          <button
            className={`tab-button ${activeTab === TABS.EVIDENCE ? 'active' : ''}`}
            onClick={() => setActiveTab(TABS.EVIDENCE)}
            disabled={!formData.sala_id}
          >
            <span className="tab-icon"><Camera size={18} /></span>
            <span className="tab-label">Evidencias</span>
            {totalPhotos > 0 && (
              <span className="tab-badge">{totalPhotos}</span>
            )}
          </button>
          <button
            className={`tab-button ${activeTab === TABS.SUMMARY ? 'active' : ''}`}
            onClick={() => setActiveTab(TABS.SUMMARY)}
            disabled={!formData.sala_id}
          >
            <span className="tab-icon"><CheckCircle size={18} /></span>
            <span className="tab-label">Resumen</span>
          </button>
        </div>

        <div className="cleaning-modal-body">
          {activeTab === TABS.INFO && (
            <div className="tab-content tab-info">
              <div className="form-section">
                <h5><MapPin size={18} /> Ubicación</h5>
                
                <div className="form-group">
                  <label>Lugar *</label>
                  <select
                    value={formData.sala_id}
                    onChange={e => handleChange('sala_id', e.target.value)}
                    className={`cleaning-input ${errors.sala_id ? 'error' : ''}`}
                    disabled={submitting}
                  >
                    <option value="">Seleccionar lugar...</option>
                    {lugares.map((lugar) => (
                      <option key={lugar._id} value={lugar._id}>
                        {lugar.nombre}
                      </option>
                    ))}
                  </select>
                  {errors.sala_id && <span className="error-text">{errors.sala_id}</span>}
                </div>
              </div>

              <div className="form-section">
                <h5><Calendar size={18} /> Programación</h5>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Fecha *</label>
                    <input
                      type="date"
                      value={formData.fecha}
                      onChange={e => handleChange('fecha', e.target.value)}
                      className={`cleaning-input ${errors.fecha ? 'error' : ''}`}
                      disabled={submitting}
                    />
                    {errors.fecha && <span className="error-text">{errors.fecha}</span>}
                  </div>

                  <div className="form-group">
                    <label>Hora *</label>
                    <input
                      type="time"
                      value={formData.hora}
                      onChange={e => handleChange('hora', e.target.value)}
                      className={`cleaning-input ${errors.hora ? 'error' : ''}`}
                      disabled={submitting}
                    />
                    {errors.hora && <span className="error-text">{errors.hora}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label>Tipo de Limpieza</label>
                  <select
                    value={formData.tipo_limpieza}
                    onChange={e => handleChange('tipo_limpieza', e.target.value)}
                    className="cleaning-input"
                    disabled={submitting}
                  >
                    <option value="regular">Regular</option>
                    <option value="profunda">Profunda</option>
                    <option value="sanitizacion">Sanitización</option>
                    <option value="emergencia">Emergencia</option>
                  </select>
                </div>
              </div>

              <div className="info-card">
                <div className="info-icon"><AlertTriangle size={24} /></div>
                <div className="info-content">
                  <strong>Importante</strong>
                  <p>Una vez seleccionado el lugar, podrás agregar las evidencias fotográficas en la siguiente pestaña</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === TABS.EVIDENCE && (
            <div className="tab-content tab-evidence">
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
          )}

          {activeTab === TABS.SUMMARY && (
            <div className="tab-content tab-summary">
              <div className="summary-section">
                <h5><CheckCircle size={18} /> Resumen de la Asignación</h5>
                
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="summary-label">Lugar</span>
                    <span className="summary-value">{getLugarNombre(formData.sala_id) || '-'}</span>
                  </div>
                  
                  <div className="summary-item">
                    <span className="summary-label">Fecha</span>
                    <span className="summary-value">
                      {formData.fecha ? new Date(formData.fecha + 'T00:00:00').toLocaleDateString('es-ES', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }) : '-'}
                    </span>
                  </div>
                  
                  <div className="summary-item">
                    <span className="summary-label">Hora</span>
                    <span className="summary-value">{formData.hora || '-'}</span>
                  </div>
                  
                  <div className="summary-item">
                    <span className="summary-label">Tipo de Limpieza</span>
                    <span className="summary-value summary-value--type">{formData.tipo_limpieza || '-'}</span>
                  </div>
                  
                  <div className="summary-item">
                    <span className="summary-label">Evidencias Fotográficas</span>
                    <span className="summary-value">
                      <span className="photo-count">
                        <ImageIcon size={16} />
                        {totalPhotos} fotos
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="photo-summary-section">
                <h6><Camera size={16} /> Fotos Adjuntas</h6>
                <div className="photo-summary-grid">
                  {photos.before.length > 0 && (
                    <div className="photo-summary-card">
                      <span className="photo-stage">Antes</span>
                      <span className="photo-count-badge">{photos.before.length}</span>
                    </div>
                  )}
                  {photos.during.length > 0 && (
                    <div className="photo-summary-card">
                      <span className="photo-stage">Durante</span>
                      <span className="photo-count-badge">{photos.during.length}</span>
                    </div>
                  )}
                  {photos.after.length > 0 && (
                    <div className="photo-summary-card">
                      <span className="photo-stage">Después</span>
                      <span className="photo-count-badge">{photos.after.length}</span>
                    </div>
                  )}
                </div>
              </div>

              {validationStatus.type !== 'success' && (
                <div className={`validation-banner ${validationStatus.type}`}>
                  <validationStatus.icon size={20} />
                  <div>
                    <strong>Información incompleta</strong>
                    <p>{validationStatus.text}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="cleaning-modal-footer">
          <div className="footer-info">
            <span className={`validation-info ${validationStatus.type}`}>
              <validationStatus.icon size={16} />
              <span>{validationStatus.text}</span>
            </span>
          </div>
          <div className="footer-actions">
            <button className="btn btn--secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button 
              className="btn btn--primary" 
              onClick={handleSave}
              disabled={validationStatus.type === 'error' || submitting}
            >
              {submitting ? (
                <>Guardando...</>
              ) : isEditing ? (
                <><Save size={16} /> Actualizar Asignación</>
              ) : (
                <><CheckCircle size={16} /> Crear Asignación</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CleaningModal;
