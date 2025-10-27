import { useState } from 'react';
import { Camera, X, CheckCircle, Upload } from '../Icons';
import './PhotoUploadField.css';

const PhotoUploadField = ({ label, type, photos, onChange, onPhotosChange, maxPhotos = 3 }) => {
  // Soportar tanto onChange como onPhotosChange para compatibilidad
  const handleChange = onChange || onPhotosChange;
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    processFiles(files);
  };

  const processFiles = (files) => {
    const remainingSlots = maxPhotos - photos.length;
    const filesToAdd = files.slice(0, remainingSlots);

    const newPhotos = filesToAdd.map(file => ({
      id: Date.now() + Math.random(),
      file,
      preview: URL.createObjectURL(file),
      type,
      name: file.name
    }));

    handleChange([...photos, ...newPhotos]);
  };

  const removePhoto = (photoId) => {
    const updatedPhotos = photos.filter(p => p.id !== photoId);
    
    const photoToRemove = photos.find(p => p.id === photoId);
    if (photoToRemove && photoToRemove.preview) {
      URL.revokeObjectURL(photoToRemove.preview);
    }
    
    handleChange(updatedPhotos);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      processFiles(imageFiles);
    }
  };

  const isComplete = photos.length > 0;
  const isFull = photos.length >= maxPhotos;

  return (
    <div className="photo-upload-field">
      <div className="photo-upload__header">
        <span className="photo-upload__label">{label}</span>
        <span className={`photo-upload__count ${isComplete ? 'complete' : ''}`}>
          {photos.length}/{maxPhotos}
        </span>
      </div>

      {!isFull && (
        <label 
          className={`photo-upload__dropzone ${dragActive ? 'drag-active' : ''} ${isComplete ? 'has-photos' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="photo-upload__input"
            disabled={isFull}
          />
          
          <div className="photo-upload__icon">
            {isComplete ? (
              <CheckCircle size={32} className="icon-success" />
            ) : (
              <Camera size={32} />
            )}
          </div>
          
          <div className="photo-upload__text">
            <p className="photo-upload__primary">
              {isComplete ? 'Agregar más fotos' : 'Subir fotos'}
            </p>
            <p className="photo-upload__secondary">
              Arrastra archivos o haz clic
            </p>
          </div>
        </label>
      )}

      {photos.length > 0 && (
        <div className="photo-preview-grid">
          {photos.map((photo, index) => (
            <div key={photo.id} className="photo-preview">
              <img src={photo.preview} alt={`${label} ${index + 1}`} />
              <button 
                className="photo-preview__remove"
                onClick={() => removePhoto(photo.id)}
                type="button"
                title="Eliminar foto"
              >
                <X size={16} />
              </button>
              <div className="photo-preview__overlay">
                <span className="photo-preview__number">{index + 1}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoUploadField;
