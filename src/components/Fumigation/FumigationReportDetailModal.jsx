import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { X, Download, Calendar, MapPin, Clock, Spray, FileText, UserCheck, Image as ImageIcon, CheckCircle, Camera, Wrench } from '../Icons';
import MapComponent from '../Map/MapComponent';
import '../Reports/StandardReportModal.css';

const FumigationReportDetailModal = ({ isOpen, onClose, assignment, location, onDownload }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Cargar fotos del assignment
  const photos = useQuery(
    api.fumigaciones.getPhotosByAssignment,
    assignment?._id ? { assignment_id: assignment._id } : "skip"
  );

  if (!isOpen || !assignment) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      if (selectedPhoto) {
        setSelectedPhoto(null);
      } else {
        onClose();
      }
    }
  };

  // Preparar punto para el mapa
  const lugarParaMapa = location?.latitud && location?.longitud
    ? [{
        _id: location._id || 'lugar-fumigacion',
        nombre: location.nombre,
        latitud: location.latitud,
        longitud: location.longitud,
        tipo: 'fumigacion',
      }]
    : [];

  // Calcular duracion
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

  // Organizar fotos por etapa
  const fotosPorEtapa = {
    antes: photos?.filter(p => p.etapa === 'antes') || [],
    durante: photos?.filter(p => p.etapa === 'durante' || !p.etapa) || [],
    despues: photos?.filter(p => p.etapa === 'despues') || [],
  };

  const totalFotos = (fotosPorEtapa.antes.length + fotosPorEtapa.durante.length + fotosPorEtapa.despues.length);

  const getTipoLabel = (tipo) => {
    return tipo === 'interna' ? 'Interna' : 'Externa';
  };

  return (
    <div className="report-modal-overlay" onClick={handleOverlayClick}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="report-modal__header">
          <div className="report-modal__header-left">
            <div className="report-modal__icon">
              <Spray size={32} />
            </div>
            <div className="report-modal__header-text">
              <h2 className="report-modal__title">Reporte de Fumigacion</h2>
              <p className="report-modal__subtitle">{location?.nombre || 'Sin ubicacion'}</p>
            </div>
          </div>
          <button className="report-modal__close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="report-modal__content">

          {/* Badge de tipo */}
          <div className="report-badges">
            <span className={`report-badge report-badge--${assignment.tipo_fumigacion}`}>
              <Spray size={14} />
              Fumigacion {getTipoLabel(assignment.tipo_fumigacion)}
            </span>
          </div>

          {/* Mapa de Ubicacion */}
          <div className="report-section">
            <div className="report-section__header">
              <MapPin size={18} />
              <h3>Ubicacion</h3>
            </div>
            <div className="report-section__body" style={{ padding: 0 }}>
              {lugarParaMapa.length > 0 ? (
                <div className="report-map-container">
                  <MapComponent
                    key={`map-fumigation-${assignment.fecha}`}
                    camiones={[]}
                    rutas={[]}
                    personnel={[]}
                    lugares={lugarParaMapa}
                    showRealTime={false}
                  />
                </div>
              ) : (
                <div className="report-map-empty">
                  <MapPin size={32} />
                  <p>No hay coordenadas GPS disponibles para este lugar</p>
                </div>
              )}
            </div>
          </div>

          {/* Resumen del Reporte */}
          <div className="report-section">
            <div className="report-section__header">
              <FileText size={18} />
              <h3>Resumen del Reporte</h3>
            </div>
            <div className="report-section__body">
              <div className="report-summary-grid">
                {/* Ubicacion */}
                <div className="report-summary-card">
                  <div className="report-summary-card__icon">
                    <MapPin size={20} />
                  </div>
                  <div className="report-summary-card__content">
                    <span className="report-summary-card__label">Ubicacion</span>
                    <span className="report-summary-card__value">{location?.nombre || 'No especificada'}</span>
                  </div>
                </div>

                {/* Fecha */}
                <div className="report-summary-card">
                  <div className="report-summary-card__icon">
                    <Calendar size={20} />
                  </div>
                  <div className="report-summary-card__content">
                    <span className="report-summary-card__label">Fecha</span>
                    <span className="report-summary-card__value">
                      {new Date(assignment.fecha).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Horario */}
                <div className="report-summary-card">
                  <div className="report-summary-card__icon">
                    <Clock size={20} />
                  </div>
                  <div className="report-summary-card__content">
                    <span className="report-summary-card__label">Horario</span>
                    <span className="report-summary-card__value">
                      {assignment.horario_inicio} - {assignment.horario_fin}
                      {duration && <span className="report-summary-card__extra">({duration})</span>}
                    </span>
                  </div>
                </div>

                {/* Realizado por */}
                {assignment.created_by && (
                  <div className="report-summary-card">
                    <div className="report-summary-card__icon">
                      <UserCheck size={20} />
                    </div>
                    <div className="report-summary-card__content">
                      <span className="report-summary-card__label">Realizado por</span>
                      <span className="report-summary-card__value">{assignment.created_by}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Productos Utilizados */}
          {assignment.productos_utilizados && assignment.productos_utilizados.length > 0 && (
            <div className="report-section">
              <div className="report-section__header">
                <Spray size={18} />
                <h3>Productos Utilizados</h3>
                <span className="section-badge">{assignment.productos_utilizados.length} producto{assignment.productos_utilizados.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="report-section__body">
                <ul className="report-list">
                  {assignment.productos_utilizados.map((producto, index) => (
                    <li key={index} className="report-list-item">
                      <CheckCircle size={18} />
                      <span>{producto}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Observaciones */}
          {assignment.observaciones && (
            <div className="report-observations">
              <div className="report-observations__header">
                <FileText size={18} />
                <h4>Observaciones</h4>
              </div>
              <p className="report-observations__text">{assignment.observaciones}</p>
            </div>
          )}

          {/* Evidencias Fotograficas */}
          <div className="report-section">
            <div className="report-section__header">
              <ImageIcon size={18} />
              <h3>Evidencias Fotograficas</h3>
              {totalFotos > 0 && (
                <span className="section-badge">{totalFotos} foto{totalFotos !== 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="report-section__body">
              {!photos ? (
                <div className="report-photos-empty">Cargando fotos...</div>
              ) : totalFotos === 0 ? (
                <div className="report-photos-empty">No hay evidencias fotograficas adjuntas</div>
              ) : (
                <div className="report-photos-grid">
                  {/* Columna Antes */}
                  <div className="report-photos-column">
                    <div className="report-photos-column__header report-photos-column__header--antes">
                      <span className="report-photos-column__title">
                        <Camera size={16} />
                        Antes
                      </span>
                      <span className="report-photos-column__count">{fotosPorEtapa.antes.length} fotos</span>
                    </div>
                    <div className="report-photos-column__content">
                      {fotosPorEtapa.antes.length > 0 ? (
                        fotosPorEtapa.antes.map((foto, idx) => (
                          <div
                            key={foto._id || idx}
                            className="report-photo-item"
                            onClick={() => setSelectedPhoto(foto)}
                          >
                            <img src={foto.url} alt={`Antes ${idx + 1}`} />
                          </div>
                        ))
                      ) : (
                        <div className="report-photos-empty">No hay fotos</div>
                      )}
                    </div>
                  </div>

                  {/* Columna Durante */}
                  <div className="report-photos-column">
                    <div className="report-photos-column__header report-photos-column__header--durante">
                      <span className="report-photos-column__title">
                        <Wrench size={16} />
                        Durante
                      </span>
                      <span className="report-photos-column__count">{fotosPorEtapa.durante.length} fotos</span>
                    </div>
                    <div className="report-photos-column__content">
                      {fotosPorEtapa.durante.length > 0 ? (
                        fotosPorEtapa.durante.map((foto, idx) => (
                          <div
                            key={foto._id || idx}
                            className="report-photo-item"
                            onClick={() => setSelectedPhoto(foto)}
                          >
                            <img src={foto.url} alt={`Durante ${idx + 1}`} />
                          </div>
                        ))
                      ) : (
                        <div className="report-photos-empty">No hay fotos</div>
                      )}
                    </div>
                  </div>

                  {/* Columna Despues */}
                  <div className="report-photos-column">
                    <div className="report-photos-column__header report-photos-column__header--despues">
                      <span className="report-photos-column__title">
                        <CheckCircle size={16} />
                        Despues
                      </span>
                      <span className="report-photos-column__count">{fotosPorEtapa.despues.length} fotos</span>
                    </div>
                    <div className="report-photos-column__content">
                      {fotosPorEtapa.despues.length > 0 ? (
                        fotosPorEtapa.despues.map((foto, idx) => (
                          <div
                            key={foto._id || idx}
                            className="report-photo-item"
                            onClick={() => setSelectedPhoto(foto)}
                          >
                            <img src={foto.url} alt={`Despues ${idx + 1}`} />
                          </div>
                        ))
                      ) : (
                        <div className="report-photos-empty">No hay fotos</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="report-modal__footer">
          <button className="report-modal__btn report-modal__btn--secondary" onClick={onClose}>
            <X size={18} />
            Cerrar
          </button>
          <button className="report-modal__btn report-modal__btn--primary" onClick={onDownload}>
            <Download size={18} />
            Descargar PDF
          </button>
        </div>

        {/* Photo Viewer */}
        {selectedPhoto && (
          <div className="report-photo-viewer" onClick={() => setSelectedPhoto(null)}>
            <button
              className="report-photo-viewer__close"
              onClick={() => setSelectedPhoto(null)}
            >
              <X size={28} />
            </button>
            <div className="report-photo-viewer__content" onClick={(e) => e.stopPropagation()}>
              <img src={selectedPhoto.url} alt="Evidencia ampliada" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FumigationReportDetailModal;
