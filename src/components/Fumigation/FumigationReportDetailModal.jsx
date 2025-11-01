import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { X, Download, Calendar, MapPin, Clock, Bug, Package, FileText, Image as ImageIcon } from '../Icons';
import { Button, Badge } from '../UI';
import './FumigationReportDetailModal.css';

const FumigationReportDetailModal = ({ isOpen, onClose, assignment, location, onDownload }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Cargar fotos del assignment
  const photos = useQuery(
    api.fumigaciones.getPhotosByAssignment,
    assignment?._id ? { assignment_id: assignment._id } : "skip"
  );

  if (!isOpen || !assignment) return null;

  const getTipoLabel = (tipo) => {
    return tipo === 'interna' ? 'Fumigación Interna' : 'Fumigación Externa';
  };

  const getTipoBadgeVariant = (tipo) => {
    return tipo === 'interna' ? 'primary' : 'success';
  };

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
    <div className="fumigation-report-overlay" onClick={handleOverlayClick}>
      <div className="fumigation-report-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="fumigation-report__header">
          <div className="fumigation-report__header-content">
            <div className="fumigation-report__title-row">
              <Bug size={24} />
              <h2 className="fumigation-report__title">Reporte de Fumigación</h2>
            </div>
            <Badge
              variant={getTipoBadgeVariant(assignment.tipo_fumigacion)}
              text={getTipoLabel(assignment.tipo_fumigacion)}
            />
          </div>
          <button className="fumigation-report__close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="fumigation-report__content">

          {/* Sección de Resumen */}
          <div className="fumigation-report__summary">
            <h3 className="section-title">
              <FileText size={18} />
              Resumen del Reporte
            </h3>

            <div className="summary-grid">
              {/* Ubicación */}
              <div className="summary-item">
                <div className="summary-label">
                  <MapPin size={16} />
                  <span>Ubicación</span>
                </div>
                <div className="summary-value">{location.nombre}</div>
              </div>

              {/* Fecha */}
              <div className="summary-item">
                <div className="summary-label">
                  <Calendar size={16} />
                  <span>Fecha</span>
                </div>
                <div className="summary-value">
                  {new Date(assignment.fecha).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>

              {/* Horario */}
              <div className="summary-item summary-item--full">
                <div className="summary-label">
                  <Clock size={16} />
                  <span>Horario</span>
                </div>
                <div className="summary-value">
                  {assignment.horario_inicio} - {assignment.horario_fin}
                </div>
              </div>

              {/* Productos Utilizados */}
              {assignment.productos_utilizados && assignment.productos_utilizados.length > 0 && (
                <div className="summary-item summary-item--full">
                  <div className="summary-label">
                    <Package size={16} />
                    <span>Productos Utilizados</span>
                  </div>
                  <div className="summary-value">
                    <ul className="productos-list">
                      {assignment.productos_utilizados.map((producto, index) => (
                        <li key={index}>{producto}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Observaciones/Descripción */}
              {assignment.observaciones && (
                <div className="summary-item summary-item--full">
                  <div className="summary-label">
                    <FileText size={16} />
                    <span>Observaciones</span>
                  </div>
                  <div className="summary-value summary-value--text">
                    {assignment.observaciones}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sección de Evidencias Fotográficas */}
          <div className="fumigation-report__photos">
            <div className="photos-header">
              <h3 className="section-title">
                <ImageIcon size={18} />
                Evidencias Fotográficas
              </h3>
              <span className="photos-count">
                {photos ? photos.length : 0} foto{photos?.length !== 1 ? 's' : ''}
              </span>
            </div>

            {!photos || photos.length === 0 ? (
              <div className="photos-empty">
                <ImageIcon size={48} color="#ccc" />
                <p>No hay evidencias fotográficas adjuntas</p>
              </div>
            ) : (
              <div className="photos-gallery">
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
                    <div className="photo-overlay-hover">
                      <span>Ver ampliada</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="fumigation-report__footer">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="primary"
            icon={<Download size={18} />}
            onClick={onDownload}
          >
            Descargar PDF
          </Button>
        </div>

        {/* Visor de Foto Ampliada */}
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

export default FumigationReportDetailModal;
