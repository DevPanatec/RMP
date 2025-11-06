import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { X, Image as ImageIcon } from '../Icons';
import './PhotosModal.css';

const PhotosModal = ({ isOpen, onClose, assignmentId }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const assignment = useQuery(api.fumigaciones.getById, { id: assignmentId });
  const photos = useQuery(api.fumigaciones.getPhotosByAssignment, { assignment_id: assignmentId });

  useEffect(() => {
    if (!isOpen) {
      setSelectedPhoto(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePhotoClick = (photo) => {
    setSelectedPhoto(photo);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      if (selectedPhoto) {
        setSelectedPhoto(null);
      } else {
        onClose();
      }
    }
  };

  return (
    <div className="photos-modal-overlay" onClick={handleOverlayClick}>
      <div className="photos-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="photos-modal-header">
          <div className="modal-header-content">
            <h4>
              <ImageIcon size={20} /> Evidencias de Fumigación
            </h4>
            {assignment && (
              <p>
                {assignment.lugar_nombre} • {new Date(assignment.fecha).toLocaleDateString('es-ES')}
              </p>
            )}
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="photos-modal-body">
          {!photos || photos.length === 0 ? (
            <div className="photos-empty">
              <ImageIcon size={48} color="#ccc" />
              <p>No hay evidencias fotográficas</p>
            </div>
          ) : (
            <div className="photos-grid">
              {photos.map((photo, index) => (
                <div
                  key={photo._id}
                  className="photo-item"
                  onClick={() => handlePhotoClick(photo)}
                >
                  <img
                    src={photo.url}
                    alt={`Evidencia ${index + 1}`}
                    loading="lazy"
                  />
                  <div className="photo-overlay">
                    <span>Ver ampliada</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedPhoto && (
          <div className="photo-viewer" onClick={() => setSelectedPhoto(null)}>
            <div className="photo-viewer-content">
              <button
                className="photo-viewer-close"
                onClick={() => setSelectedPhoto(null)}
              >
                <X size={24} />
              </button>
              <img
                src={selectedPhoto.url}
                alt="Evidencia ampliada"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotosModal;
