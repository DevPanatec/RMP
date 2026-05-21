import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { X, Image as ImageIcon } from '../Icons';
import { Modal } from '../UI';
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

  return (
    <Modal open onClose={onClose} size="lg" variant="detail">
      <Modal.Header icon={<ImageIcon size={18} />} onClose={onClose} id="fum-photos-title">
        Evidencias de Fumigación
        {assignment && <span> · {assignment.lugar_nombre} · {new Date(assignment.fecha).toLocaleDateString('es-ES')}</span>}
      </Modal.Header>

      <Modal.Body className="photos-modal-body">
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
      </Modal.Body>

      {selectedPhoto && (
        <div className="photo-viewer" onClick={() => setSelectedPhoto(null)}>
          <div className="photo-viewer-content">
            <button
              type="button"
              className="photo-viewer-close"
              onClick={() => setSelectedPhoto(null)}
              aria-label="Cerrar foto"
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
    </Modal>
  );
};

export default PhotosModal;
