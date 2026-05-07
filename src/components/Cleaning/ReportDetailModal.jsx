import { useState } from 'react';
import { X, Calendar, MapPin, Clock, Building, FileText, Image as ImageIcon, Camera, CheckCircle, Wrench } from '../Icons';
import { MapLibreComponent } from '../Map';
import '../Reports/StandardReportModal.css';

const ReportDetailModal = ({ isOpen, onClose, report, location }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  if (!isOpen || !report) return null;

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
        _id: location._id || 'lugar-limpieza',
        nombre: report.sala || location.nombre,
        latitud: location.latitud,
        longitud: location.longitud,
        tipo: 'limpieza',
      }]
    : [];

  // Organizar fotos por etapa
  const fotosPorEtapa = {
    antes: report.rawAssignment?.fotos?.filter(f => f.etapa === 'antes') || [],
    durante: report.rawAssignment?.fotos?.filter(f => f.etapa === 'durante') || [],
    despues: report.rawAssignment?.fotos?.filter(f => f.etapa === 'despues') || [],
  };

  const totalFotos = fotosPorEtapa.antes.length + fotosPorEtapa.durante.length + fotosPorEtapa.despues.length;

  return (
    <div className="report-modal-overlay" onClick={handleOverlayClick}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="report-modal__header">
          <div className="report-modal__header-left">
            <div className="report-modal__icon">
              <img
                src="/icons/modules/limpieza.png"
                alt="Limpieza"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            <div className="report-modal__header-text">
              <h2 className="report-modal__title">Reporte de Limpieza</h2>
              <p className="report-modal__subtitle">{report.sala} - {report.area}</p>
            </div>
          </div>
          <button className="report-modal__close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="report-modal__content">

          {/* Mapa de Ubicacion */}
          <div className="report-section">
            <div className="report-section__header">
              <MapPin size={18} />
              <h3>Ubicacion</h3>
            </div>
            <div className="report-section__body" style={{ padding: 0 }}>
              {lugarParaMapa.length > 0 ? (
                <div className="report-map-container">
                  <MapLibreComponent
                    key={`map-cleaning-${report.fecha}`}
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
                {/* Sala */}
                <div className="report-summary-card">
                  <div className="report-summary-card__icon">
                    <Building size={20} />
                  </div>
                  <div className="report-summary-card__content">
                    <span className="report-summary-card__label">Sala</span>
                    <span className="report-summary-card__value">{report.sala || 'No especificada'}</span>
                  </div>
                </div>

                {/* Area */}
                <div className="report-summary-card">
                  <div className="report-summary-card__icon">
                    <MapPin size={20} />
                  </div>
                  <div className="report-summary-card__content">
                    <span className="report-summary-card__label">Area</span>
                    <span className="report-summary-card__value">{report.area || 'No especificada'}</span>
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
                      {new Date(report.fecha).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Hora */}
                <div className="report-summary-card">
                  <div className="report-summary-card__icon">
                    <Clock size={20} />
                  </div>
                  <div className="report-summary-card__content">
                    <span className="report-summary-card__label">Hora</span>
                    <span className="report-summary-card__value">{report.hora || 'No especificada'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
                      <div className="report-photos-empty">No hay fotos en esta etapa</div>
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
                      <div className="report-photos-empty">No hay fotos en esta etapa</div>
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
                      <div className="report-photos-empty">No hay fotos en esta etapa</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          {report.observaciones && (
            <div className="report-observations">
              <div className="report-observations__header">
                <FileText size={18} />
                <h4>Observaciones</h4>
              </div>
              <p className="report-observations__text">{report.observaciones}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="report-modal__footer">
          <button className="report-modal__btn report-modal__btn--secondary" onClick={onClose}>
            <X size={18} />
            Cerrar
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

export default ReportDetailModal;
