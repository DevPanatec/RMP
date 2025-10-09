import { useState, useRef } from 'react';
import { X, Upload, Trash2, Check, Camera } from '../Icons';
import { Button } from '../UI';
import { useSupabaseCleaning } from '../../context/SupabaseCleaningContext';
import './PhotosModal.css';

const PHOTO_STAGES = [
  { id: 'antes', label: 'Antes', color: '#ff3b30' },
  { id: 'durante', label: 'Durante', color: '#ff9500' },
  { id: 'despues', label: 'Después', color: '#30d158' },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const PhotosModal = ({ isOpen, onClose, onComplete, assignmentId, assignmentData }) => {
  const { uploadPhoto } = useSupabaseCleaning();
  const [photos, setPhotos] = useState({
    antes: [],
    durante: [],
    despues: [],
  });

  const [dragOver, setDragOver] = useState(null);
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const fileInputRefs = {
    antes: useRef(null),
    durante: useRef(null),
    despues: useRef(null),
  };

  if (!isOpen) return null;

  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Tipo de archivo no permitido. Use JPG, PNG o WEBP';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'El archivo es muy grande. Máximo 5MB';
    }
    return null;
  };

  const handleFileSelect = (stage, files) => {
    const newPhotos = [...photos[stage]];
    const newErrors = {};

    Array.from(files).forEach((file) => {
      const error = validateFile(file);
      if (error) {
        newErrors[stage] = error;
        return;
      }

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        newPhotos.push({
          id: Date.now() + Math.random(),
          file: file,
          preview: e.target.result,
          name: file.name,
        });
        setPhotos({ ...photos, [stage]: newPhotos });
      };
      reader.readAsDataURL(file);
    });

    setErrors(newErrors);
  };

  const handleDragOver = (e, stage) => {
    e.preventDefault();
    setDragOver(stage);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(null);
  };

  const handleDrop = (e, stage) => {
    e.preventDefault();
    setDragOver(null);

    const files = e.dataTransfer.files;
    handleFileSelect(stage, files);
  };

  const removePhoto = (stage, photoId) => {
    setPhotos({
      ...photos,
      [stage]: photos[stage].filter((p) => p.id !== photoId),
    });
  };

  const handleComplete = async () => {
    // Validar que al menos una foto haya sido subida
    const totalPhotos = photos.antes.length + photos.durante.length + photos.despues.length;

    if (totalPhotos === 0) {
      setErrors({ general: 'Debe subir al menos una foto' });
      return;
    }

    if (!assignmentId) {
      setErrors({ general: 'No se proporcionó el ID de la asignación' });
      return;
    }

    setUploading(true);
    setErrors({});

    try {
      const uploadPromises = [];

      // Subir todas las fotos a Supabase Storage
      PHOTO_STAGES.forEach((stage) => {
        photos[stage.id].forEach((photo) => {
          uploadPromises.push(
            uploadPhoto(assignmentId, stage.id, photo.file)
          );
        });
      });

      const results = await Promise.all(uploadPromises);

      // Verificar si todas las subidas fueron exitosas
      const failedUploads = results.filter((r) => !r.success);

      if (failedUploads.length > 0) {
        setErrors({
          general: `Error al subir ${failedUploads.length} foto(s). Intente nuevamente.`
        });
        setUploading(false);
        return;
      }

      // Todas las fotos se subieron exitosamente
      onComplete(results);
    } catch (error) {
      console.error('Error al subir fotos:', error);
      setErrors({ general: 'Error al guardar las evidencias. Intente nuevamente.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="photos-modal-overlay" onClick={onClose}>
      <div className="photos-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="photos-modal__header">
          <div>
            <h2 className="photos-modal__title">Evidencias Fotográficas</h2>
            <p className="photos-modal__subtitle">
              {assignmentData.sala} - {assignmentData.area}
            </p>
          </div>
          <button className="photos-modal__close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="photos-modal__content">
          {PHOTO_STAGES.map((stage) => (
            <div key={stage.id} className="photo-stage">
              <div className="photo-stage__header" style={{ borderColor: stage.color }}>
                <Camera size={18} color={stage.color} />
                <h3 className="photo-stage__title">{stage.label}</h3>
                <span className="photo-stage__count">
                  {photos[stage.id].length} foto{photos[stage.id].length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Drop Zone */}
              <div
                className={`photo-dropzone ${dragOver === stage.id ? 'photo-dropzone--active' : ''}`}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
                onClick={() => fileInputRefs[stage.id].current?.click()}
              >
                <Upload size={32} color="#999" />
                <p className="photo-dropzone__text">
                  Arrastra imágenes aquí o haz clic para seleccionar
                </p>
                <p className="photo-dropzone__hint">
                  JPG, PNG o WEBP • Máx. 5MB
                </p>
                <input
                  ref={fileInputRefs[stage.id]}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  multiple
                  onChange={(e) => handleFileSelect(stage.id, e.target.files)}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Photo Grid */}
              {photos[stage.id].length > 0 && (
                <div className="photo-grid">
                  {photos[stage.id].map((photo) => (
                    <div key={photo.id} className="photo-item">
                      <img
                        src={photo.preview}
                        alt={photo.name}
                        className="photo-item__image"
                      />
                      <button
                        className="photo-item__remove"
                        onClick={() => removePhoto(stage.id, photo.id)}
                        title="Eliminar foto"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className="photo-item__name">{photo.name}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Errors */}
              {errors[stage.id] && (
                <div className="photo-stage__error">{errors[stage.id]}</div>
              )}
            </div>
          ))}
        </div>

        {/* General Error */}
        {errors.general && (
          <div className="photos-modal__error">{errors.general}</div>
        )}

        {/* Footer */}
        <div className="photos-modal__footer">
          <Button variant="secondary" onClick={onClose} disabled={uploading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            icon={<Check size={18} />}
            onClick={handleComplete}
            disabled={uploading}
          >
            {uploading ? 'Subiendo...' : 'Guardar Evidencias'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PhotosModal;
