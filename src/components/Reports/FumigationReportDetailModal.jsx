import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { X, Download, MapPin, Clock, Calendar, FileText, Spray, UserCheck, Camera, CheckCircle, Wrench } from '../Icons';
import { MapLibreComponent } from '../Map';
import { generateFumigacionPDFComplete } from '../../utils/reportPdfGenerator';
import './RouteReportDetailModal.css';

// Helper para parsear fechas sin problemas de timezone
const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr.includes('T')) return new Date(dateStr);
  return new Date(dateStr + 'T00:00:00');
};

const FumigationReportDetailModal = ({ report: initialReport, onClose }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  // Cargar el reporte completo con fotos usando getReportById
  const fullReport = useQuery(
    api.fumigaciones.getReportById,
    initialReport?._id ? { id: initialReport._id } : "skip"
  );

  // Usar el reporte completo si está disponible, sino el inicial
  const report = fullReport || initialReport;

  if (!initialReport) return null;

  const isLoadingPhotos = !fullReport && initialReport;

  const handleDownloadPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const fecha = report.fecha_completacion || report.fecha;
      await generateFumigacionPDFComplete([report], { desde: fecha, hasta: fecha });
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Preparar punto para el mapa
  const lugarParaMapa = report.latitud && report.longitud
    ? [{
        _id: report.lugar_id || 'lugar-fumigacion',
        nombre: report.lugar_nombre,
        latitud: report.latitud,
        longitud: report.longitud,
        tipo: 'fumigacion',
      }]
    : [];

  // Contar fotos totales
  const totalFotos = (report.fotos_antes?.length || 0) +
                     (report.fotos_durante?.length || 0) +
                     (report.fotos_despues?.length || 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="route-report-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="route-report-header">
          <div className="route-report-title">
            <Spray size={24} />
            <div>
              <h2>{report.lugar_nombre}</h2>
              <p className="route-report-subtitle">
                Reporte de Fumigación {report.tipo_fumigacion === 'interna' ? 'Interna' : 'Externa'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Contenido */}
        <div className="route-report-body">
          {/* Stats principales */}
          <div className="route-report-stats">
            <div className="stat-card">
              <Calendar size={20} />
              <div>
                <span className="stat-label">Fecha</span>
                <span className="stat-value">
                  {parseLocalDate(report.fecha).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
            <div className="stat-card">
              <Clock size={20} />
              <div>
                <span className="stat-label">Horario</span>
                <span className="stat-value">{report.horario_inicio} - {report.horario_fin}</span>
              </div>
            </div>
            <div className="stat-card">
              <Clock size={20} />
              <div>
                <span className="stat-label">Duración</span>
                <span className="stat-value">{formatDuration(report.duracion_minutos)}</span>
              </div>
            </div>
            <div className="stat-card">
              <UserCheck size={20} />
              <div>
                <span className="stat-label">Realizado por</span>
                <span className="stat-value">{report.usuario_completo}</span>
              </div>
            </div>
          </div>

          {/* Mapa */}
          <div className="route-map-section">
            <h3><MapPin size={20} /> Ubicación de Fumigación</h3>
            {lugarParaMapa.length > 0 ? (
              <div className="route-map-container">
                <MapLibreComponent
                  key={`map-${report._id}`}
                  camiones={[]}
                  rutas={[]}
                  personnel={[]}
                  lugares={lugarParaMapa}
                  showRealTime={false}
                />
              </div>
            ) : (
              <div className="route-map-container" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-surface-secondary)',
                color: 'var(--color-text-secondary)'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <MapPin size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <p>No hay coordenadas GPS disponibles para este lugar</p>
                </div>
              </div>
            )}
          </div>

          {/* Productos Utilizados */}
          {report.productos_utilizados && report.productos_utilizados.length > 0 && (
            <div className="paradas-section">
              <h3><Spray size={20} /> Productos Utilizados ({report.productos_utilizados.length})</h3>
              <div className="productos-list">
                {report.productos_utilizados.map((producto, idx) => (
                  <div key={idx} className="producto-item">
                    <Spray size={16} />
                    <span>{producto}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evidencia Fotográfica - 3 columnas horizontales */}
          {(isLoadingPhotos || totalFotos > 0) && (
            <div className="paradas-section">
              <h3><Camera size={20} /> Evidencia Fotográfica ({isLoadingPhotos ? '...' : totalFotos} fotos)</h3>

              {isLoadingPhotos ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  Cargando fotos...
                </div>
              ) : (
                <div className="fotos-horizontal-grid">
                  {/* Columna Antes */}
                  <div className="fotos-column">
                    <div className="fotos-column-header fotos-antes">
                      <Camera size={16} />
                      <span>Antes ({report.fotos_antes?.length || 0})</span>
                    </div>
                    <div className="fotos-column-content">
                      {report.fotos_antes && report.fotos_antes.length > 0 ? (
                        report.fotos_antes.map((foto, idx) => (
                          <div
                            key={foto._id || idx}
                            className="foto-item-horizontal"
                            onClick={() => window.open(foto.url, '_blank')}
                          >
                            <img src={foto.url} alt={`Antes ${idx + 1}`} />
                          </div>
                        ))
                      ) : (
                        <div className="fotos-empty">Sin fotos</div>
                      )}
                    </div>
                  </div>

                  {/* Columna Durante */}
                  <div className="fotos-column">
                    <div className="fotos-column-header fotos-durante">
                      <Wrench size={16} />
                      <span>Durante ({report.fotos_durante?.length || 0})</span>
                    </div>
                    <div className="fotos-column-content">
                      {report.fotos_durante && report.fotos_durante.length > 0 ? (
                        report.fotos_durante.map((foto, idx) => (
                          <div
                            key={foto._id || idx}
                            className="foto-item-horizontal"
                            onClick={() => window.open(foto.url, '_blank')}
                          >
                            <img src={foto.url} alt={`Durante ${idx + 1}`} />
                          </div>
                        ))
                      ) : (
                        <div className="fotos-empty">Sin fotos</div>
                      )}
                    </div>
                  </div>

                  {/* Columna Después */}
                  <div className="fotos-column">
                    <div className="fotos-column-header fotos-despues">
                      <CheckCircle size={16} />
                      <span>Después ({report.fotos_despues?.length || 0})</span>
                    </div>
                    <div className="fotos-column-content">
                      {report.fotos_despues && report.fotos_despues.length > 0 ? (
                        report.fotos_despues.map((foto, idx) => (
                          <div
                            key={foto._id || idx}
                            className="foto-item-horizontal"
                            onClick={() => window.open(foto.url, '_blank')}
                          >
                            <img src={foto.url} alt={`Después ${idx + 1}`} />
                          </div>
                        ))
                      ) : (
                        <div className="fotos-empty">Sin fotos</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Observaciones */}
          {report.observaciones && (
            <div className="observaciones-section">
              <h3><FileText size={20} /> Observaciones</h3>
              <div className="observaciones-text">
                {report.observaciones}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="route-report-footer">
          <button className="btn btn--secondary" onClick={onClose}>
            Cerrar
          </button>
          <button
            className="btn btn--primary"
            onClick={handleDownloadPDF}
            disabled={isDownloading}
          >
            <Download size={16} />
            {isDownloading ? 'Generando...' : 'Descargar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FumigationReportDetailModal;
