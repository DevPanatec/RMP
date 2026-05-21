import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  X, Download, MapPin, Calendar, FileText, Wrench, UserCheck, Truck, DollarSign,
  CheckCircle, AlertTriangle, Camera, Image as ImageIcon
} from '../Icons';
import { Modal } from '../UI';
import { generateMantenimientoPDFComplete } from '../../utils/lazyPdf';
import './StandardReportModal.css';

// Helper para parsear fechas sin problemas de timezone
const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr.includes('T')) return new Date(dateStr);
  return new Date(dateStr + 'T00:00:00');
};

const MaintenanceReportDetailModal = ({ report: initialReport, onClose }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Cargar el reporte completo con fotos usando getReportById
  const fullReport = useQuery(
    api.maintenance.getReportById,
    initialReport?._id ? { id: initialReport._id } : "skip"
  );

  // Usar el reporte completo si esta disponible, sino el inicial
  const report = fullReport || initialReport;

  if (!initialReport) return null;

  const isLoadingPhotos = !fullReport && initialReport;

  // Formatear tipo de mantenimiento
  const getTipoLabel = (tipo) => {
    switch (tipo) {
      case 'preventivo': return 'Preventivo';
      case 'correctivo': return 'Correctivo';
      case 'inspeccion': return 'Inspeccion';
      default: return tipo || 'General';
    }
  };

  // Descargar PDF individual del reporte
  const handleDownloadPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      // Usar fecha del reporte como rango (un solo dia)
      const fecha = report.fecha_reporte || report.fecha_completada;
      const dateRange = { desde: fecha, hasta: fecha };
      await generateMantenimientoPDFComplete([report], dateRange);
      console.log('📄 PDF de mantenimiento individual generado');
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  // Calcular si se completo a tiempo
  const fechaProgramada = report.fecha_programada ? parseLocalDate(report.fecha_programada) : null;
  const fechaCompletada = parseLocalDate(report.fecha_completada);
  const completadoATiempo = fechaProgramada ? fechaCompletada <= fechaProgramada : true;

  // Organizar fotos por etapa
  const fotosPorEtapa = {
    antes: report.fotos_antes || [],
    durante: report.fotos_durante || [],
    despues: report.fotos_despues || [],
  };

  const totalFotos = fotosPorEtapa.antes.length + fotosPorEtapa.durante.length + fotosPorEtapa.despues.length;

  return (
    <Modal open onClose={onClose} size="lg" variant="detail">
      <Modal.Header icon={<Wrench size={18} />} onClose={onClose} id="maintenance-report-title">
        Reporte de Mantenimiento — {report.titulo}
      </Modal.Header>
      <Modal.Body>
        <div className="report-modal__content-inner">

          {/* Badges de tipo y estado */}
          <div className="report-badges">
            <span className={`report-badge report-badge--${report.tipo}`}>
              <Wrench size={14} />
              {getTipoLabel(report.tipo)}
            </span>
            <span className={`report-badge ${completadoATiempo ? 'report-badge--success' : 'report-badge--warning'}`}>
              {completadoATiempo ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
              {completadoATiempo ? 'Completado a tiempo' : 'Con retraso'}
            </span>
          </div>

          {/* Mapa de Ubicacion */}
          <div className="report-section">
            <div className="report-section__header">
              <MapPin size={18} />
              <h3>Ubicacion</h3>
            </div>
            <div className="report-section__body" style={{ padding: 0 }}>
              <div className="report-map-empty">
                <MapPin size={32} />
                <p>Ubicacion no disponible para este mantenimiento</p>
              </div>
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
                {/* Fecha Programada */}
                {report.fecha_programada && (
                  <div className="report-summary-card">
                    <div className="report-summary-card__icon">
                      <Calendar size={20} />
                    </div>
                    <div className="report-summary-card__content">
                      <span className="report-summary-card__label">Fecha Programada</span>
                      <span className="report-summary-card__value">
                        {parseLocalDate(report.fecha_programada).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                )}

                {/* Fecha Completada */}
                <div className="report-summary-card">
                  <div className="report-summary-card__icon" style={{ background: 'var(--color-success)' }}>
                    <CheckCircle size={20} />
                  </div>
                  <div className="report-summary-card__content">
                    <span className="report-summary-card__label">Fecha Completada</span>
                    <span className="report-summary-card__value">
                      {fechaCompletada.toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                {/* Costo Total */}
                {report.costo !== undefined && report.costo !== null && (
                  <div className="report-summary-card">
                    <div className="report-summary-card__icon" style={{ background: 'var(--color-success)' }}>
                      <DollarSign size={20} />
                    </div>
                    <div className="report-summary-card__content">
                      <span className="report-summary-card__label">Costo Total</span>
                      <span className="report-summary-card__value" style={{ color: 'var(--color-success)' }}>
                        B/. {report.costo.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Completado por */}
                {report.usuario_completo && (
                  <div className="report-summary-card">
                    <div className="report-summary-card__icon">
                      <UserCheck size={20} />
                    </div>
                    <div className="report-summary-card__content">
                      <span className="report-summary-card__label">Completado por</span>
                      <span className="report-summary-card__value">{report.usuario_completo}</span>
                    </div>
                  </div>
                )}

                {/* Vehiculo */}
                {report.vehiculo_placa && (
                  <div className="report-summary-card">
                    <div className="report-summary-card__icon">
                      <Truck size={20} />
                    </div>
                    <div className="report-summary-card__content">
                      <span className="report-summary-card__label">Vehiculo</span>
                      <span className="report-summary-card__value">{report.vehiculo_placa}</span>
                    </div>
                  </div>
                )}

                {/* Mecanico */}
                {report.mecanico && report.mecanico !== 'N/A' && (
                  <div className="report-summary-card">
                    <div className="report-summary-card__icon">
                      <Wrench size={20} />
                    </div>
                    <div className="report-summary-card__content">
                      <span className="report-summary-card__label">Mecanico</span>
                      <span className="report-summary-card__value">{report.mecanico}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Descripcion */}
          {report.descripcion && (
            <div className="report-section">
              <div className="report-section__header">
                <FileText size={18} />
                <h3>Descripcion</h3>
              </div>
              <div className="report-section__body">
                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
                  {report.descripcion}
                </p>
              </div>
            </div>
          )}

          {/* Trabajos Realizados / Observaciones */}
          {report.observaciones && (
            <div className="report-section">
              <div className="report-section__header">
                <CheckCircle size={18} />
                <h3>Trabajos Realizados</h3>
              </div>
              <div className="report-section__body">
                <ul className="report-list">
                  {report.observaciones.split(',').map((item, idx) => (
                    <li key={idx} className="report-list-item">
                      <span className="report-list-item__number">{idx + 1}</span>
                      <span className="report-list-item__content">{item.trim()}</span>
                      <span className="report-list-item__badge">Completado</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Evidencias Fotograficas */}
          {(isLoadingPhotos || totalFotos > 0) && (
            <div className="report-section">
              <div className="report-section__header">
                <ImageIcon size={18} />
                <h3>Evidencia Fotografica</h3>
                {!isLoadingPhotos && totalFotos > 0 && (
                  <span className="section-badge">{totalFotos} foto{totalFotos !== 1 ? 's' : ''}</span>
                )}
              </div>
              <div className="report-section__body">
                {isLoadingPhotos ? (
                  <div className="report-photos-empty">Cargando fotos...</div>
                ) : (
                  <div className="report-photos-grid">
                    {/* Columna Antes */}
                    <div className="report-photos-column">
                      <div className="report-photos-column__header report-photos-column__header--antes">
                        <span className="report-photos-column__title">
                          <Camera size={16} />
                          Antes
                        </span>
                        <span className="report-photos-column__count">{fotosPorEtapa.antes.length}</span>
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
                          <div className="report-photos-empty">Sin fotos</div>
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
                        <span className="report-photos-column__count">{fotosPorEtapa.durante.length}</span>
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
                          <div className="report-photos-empty">Sin fotos</div>
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
                        <span className="report-photos-column__count">{fotosPorEtapa.despues.length}</span>
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
                          <div className="report-photos-empty">Sin fotos</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer align="between">
        <button
          type="button"
          className="report-modal__btn report-modal__btn--primary"
          onClick={handleDownloadPDF}
          disabled={isDownloading}
        >
          <Download size={18} />
          {isDownloading ? 'Generando...' : 'Descargar PDF'}
        </button>
        <button type="button" className="report-modal__btn report-modal__btn--secondary" onClick={onClose}>
          Cerrar
        </button>
      </Modal.Footer>

      {/* Photo Viewer — sigue como overlay separado */}
      {selectedPhoto && (
        <div className="report-photo-viewer" onClick={() => setSelectedPhoto(null)}>
          <button
            type="button"
            className="report-photo-viewer__close"
            onClick={() => setSelectedPhoto(null)}
            aria-label="Cerrar foto"
          >
            <X size={28} />
          </button>
          <div className="report-photo-viewer__content" onClick={(e) => e.stopPropagation()}>
            <img src={selectedPhoto.url} alt="Evidencia ampliada" />
          </div>
        </div>
      )}
    </Modal>
  );
};

export default MaintenanceReportDetailModal;
