import { useState, useEffect } from 'react';
import { X, Download, Calendar, MapPin, Image as ImageIcon } from '../Icons';
import { Button } from '../UI';
import supabaseClient from '../../utils/supabaseClient';
import './ReportDetailModal.css';

const ReportDetailModal = ({ isOpen, onClose, report, onDownload }) => {
  const [photoUrls, setPhotoUrls] = useState({ antes: [], durante: [], despues: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && report) {
      loadPhotoUrls();
    }
  }, [isOpen, report]);

  const loadPhotoUrls = async () => {
    if (!report.rawAssignment?.fotos) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const photos = report.rawAssignment.fotos;
      const urlsByStage = { antes: [], durante: [], despues: [] };

      for (const photo of photos) {
        try {
          const { data } = supabaseClient.supabase.storage
            .from('cleaning-evidences')
            .getPublicUrl(photo.file_path);

          if (data?.publicUrl) {
            urlsByStage[photo.etapa].push({
              url: data.publicUrl,
              name: photo.file_name,
              id: photo.id
            });
          }
        } catch (error) {
          console.error('Error loading photo URL:', error);
        }
      }

      setPhotoUrls(urlsByStage);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const photoStages = [
    { id: 'antes', label: 'Antes', color: '#ff3b30', images: photoUrls.antes },
    { id: 'durante', label: 'Durante', color: '#ff9500', images: photoUrls.durante },
    { id: 'despues', label: 'Después', color: '#30d158', images: photoUrls.despues },
  ];

  return (
    <div className="report-detail-overlay" onClick={onClose}>
      <div className="report-detail" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="report-detail__header">
          <div className="report-detail__header-content">
            <h2 className="report-detail__title">Reporte de Limpieza</h2>
            <div className="report-detail__meta">
              <div className="report-detail__meta-item">
                <Calendar size={16} />
                <span>
                  {new Date(report.fecha).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })} - {report.hora}
                </span>
              </div>
              <div className="report-detail__meta-item">
                <MapPin size={16} />
                <span>{report.sala} • {report.area}</span>
              </div>
            </div>
          </div>
          <button className="report-detail__close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="report-detail__content">
          {loading ? (
            <div className="report-detail__loading">
              <p>Cargando evidencias fotográficas...</p>
            </div>
          ) : (
            photoStages.map((stage) => (
              <div key={stage.id} className="report-stage">
                <div className="report-stage__header" style={{ borderColor: stage.color }}>
                  <ImageIcon size={18} color={stage.color} />
                  <h3 className="report-stage__title">{stage.label}</h3>
                  <span className="report-stage__count">
                    {stage.images.length} foto{stage.images.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {stage.images.length > 0 ? (
                  <div className="report-stage__gallery">
                    {stage.images.map((image, index) => (
                      <div key={image.id || index} className="report-image-wrapper">
                        <img
                          src={image.url}
                          alt={`${stage.label} - ${index + 1}`}
                          className="report-image"
                          onClick={() => window.open(image.url, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="report-stage__empty">
                    <p>No hay fotos en esta etapa</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="report-detail__footer">
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
      </div>
    </div>
  );
};

export default ReportDetailModal;
