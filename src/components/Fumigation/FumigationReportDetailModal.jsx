import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { X, Download, Calendar, MapPin, Clock, Spray, FileText, UserCheck, Image as ImageIcon, CheckCircle } from '../Icons';
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

  // Generar URL del mapa
  const mapEmbedUrl = location?.nombre
    ? `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(location.nombre + ', Panama City, Panama')}&zoom=17`
    : null;

  // Calcular duración
  const calculateDuration = () => {
    if (!assignment.horario_inicio || !assignment.horario_fin) return null;
    const [startH, startM] = assignment.horario_inicio.split(':').map(Number);
    const [endH, endM] = assignment.horario_fin.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const durationMinutes = endMinutes - startMinutes;
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const duration = calculateDuration();

  return (
    <div className="fumigation-detail-overlay" onClick={handleOverlayClick}>
      <div className="fumigation-detail-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header con gradiente */}
        <div className="fumigation-detail__header">
          <div className="fumigation-detail__header-left">
            <div className="fumigation-detail__icon-badge">
              <Spray size={32} />
            </div>
            <div className="fumigation-detail__header-text">
              <h2 className="fumigation-detail__title">Reporte de Fumigación</h2>
              <Badge
                variant={getTipoBadgeVariant(assignment.tipo_fumigacion)}
                text={getTipoLabel(assignment.tipo_fumigacion)}
              />
            </div>
          </div>
          <button className="fumigation-detail__close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="fumigation-detail__content">

          {/* 🗺️ MAPA CON OVERLAY MEJORADO */}
          {mapEmbedUrl && (
            <div className="fumigation-detail__map-section">
              <div className="fumigation-map-header">
                <MapPin size={20} />
                <h3>Ubicación de Fumigación</h3>
              </div>
              <div className="fumigation-detail__map-wrapper">
                <iframe
                  src={mapEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="eager"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Mapa de ${location.nombre}`}
                />
                <div className="fumigation-map-label">
                  <MapPin size={16} />
                  <span>{location.nombre}</span>
                </div>
              </div>
            </div>
          )}

          {/* RESUMEN DEL REPORTE - Cards profesionales */}
          <div className="fumigation-detail__summary">
            <div className="fumigation-summary-header">
              <FileText size={20} />
              <h3>Resumen del Reporte</h3>
            </div>

            <div className="fumigation-summary-grid">
              {/* Card: Ubicación */}
              <div className="fumigation-summary-card">
                <div className="summary-card-icon">
                  <MapPin size={24} />
                </div>
                <div className="summary-card-content">
                  <span className="summary-card-label">Ubicación</span>
                  <span className="summary-card-value">{location?.nombre || 'No especificada'}</span>
                </div>
              </div>

              {/* Card: Fecha */}
              <div className="fumigation-summary-card">
                <div className="summary-card-icon">
                  <Calendar size={24} />
                </div>
                <div className="summary-card-content">
                  <span className="summary-card-label">Fecha</span>
                  <span className="summary-card-value">
                    {new Date(assignment.fecha).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Card: Horario */}
              <div className="fumigation-summary-card">
                <div className="summary-card-icon">
                  <Clock size={24} />
                </div>
                <div className="summary-card-content">
                  <span className="summary-card-label">Horario</span>
                  <span className="summary-card-value">
                    {assignment.horario_inicio} - {assignment.horario_fin}
                    {duration && <span className="summary-card-duration">({duration})</span>}
                  </span>
                </div>
              </div>

              {/* Card: Realizado por */}
              {assignment.created_by && (
                <div className="fumigation-summary-card">
                  <div className="summary-card-icon">
                    <UserCheck size={24} />
                  </div>
                  <div className="summary-card-content">
                    <span className="summary-card-label">Realizado por</span>
                    <span className="summary-card-value">{assignment.created_by}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Productos Utilizados - Lista mejorada */}
          {assignment.productos_utilizados && assignment.productos_utilizados.length > 0 && (
            <div className="fumigation-detail__productos">
              <div className="fumigation-productos-header">
                <Spray size={20} />
                <h3>Productos Utilizados</h3>
                <span className="productos-count">{assignment.productos_utilizados.length} producto{assignment.productos_utilizados.length !== 1 ? 's' : ''}</span>
              </div>
              <ul className="productos-list-professional">
                {assignment.productos_utilizados.map((producto, index) => (
                  <li key={index}>
                    <CheckCircle size={18} />
                    <span>{producto}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Observaciones - Card destacado */}
          {assignment.observaciones && (
            <div className="fumigation-detail__observaciones-pro">
              <div className="fumigation-observaciones-header">
                <FileText size={20} />
                <h3>Observaciones</h3>
              </div>
              <p className="observaciones-text-pro">{assignment.observaciones}</p>
            </div>
          )}

          {/* Fotos - Galería profesional */}
          <div className="fumigation-detail__photos-pro">
            <div className="fumigation-photos-header">
              <ImageIcon size={20} />
              <h3>Evidencias Fotográficas</h3>
              <span className="photos-count-badge">
                {photos ? photos.length : 0} foto{photos?.length !== 1 ? 's' : ''}
              </span>
            </div>

            {!photos || photos.length === 0 ? (
              <div className="photos-empty-pro">
                <ImageIcon size={64} />
                <p>No hay evidencias fotográficas adjuntas</p>
              </div>
            ) : (
              <div className="photos-gallery-professional">
                {photos.map((photo, index) => (
                  <div
                    key={photo._id}
                    className="photo-item-professional"
                    onClick={() => handlePhotoClick(photo)}
                  >
                    <img
                      src={photo.url}
                      alt={`Evidencia ${index + 1}`}
                      loading="lazy"
                    />
                    <div className="photo-overlay-professional">
                      <ImageIcon size={32} />
                      <span>Ver en tamaño completo</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer profesional */}
        <div className="fumigation-detail__footer-pro">
          <Button variant="secondary" onClick={onClose} className="btn-large">
            <X size={20} />
            Cerrar
          </Button>
          <Button
            variant="primary"
            icon={<Download size={20} />}
            onClick={onDownload}
            className="btn-large btn-primary-gradient"
          >
            Descargar PDF
          </Button>
        </div>

        {/* Visor de Foto Ampliada - Mejorado */}
        {selectedPhoto && (
          <div className="photo-viewer-pro" onClick={() => setSelectedPhoto(null)}>
            <button
              className="photo-viewer-close-pro"
              onClick={() => setSelectedPhoto(null)}
            >
              <X size={32} />
            </button>
            <div className="photo-viewer-content-pro" onClick={(e) => e.stopPropagation()}>
              <img
                src={selectedPhoto.url}
                alt="Evidencia ampliada"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FumigationReportDetailModal;
