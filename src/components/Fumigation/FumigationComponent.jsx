import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Bug, BarChart3 } from '../Icons';
import { ServiceDownloadSection } from '../shared';
import { generateFumigacionPDFComplete } from '../../utils/reportPdfGenerator';
import FumigationAssignments from './FumigationAssignments';
import './FumigationComponent.css';

const FumigationComponent = ({ userRole = 'admin', embedded = false }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Obtener reportes con fotos desde Convex
  const reportsWithPhotos = useQuery(api.fumigaciones.listReportsWithPhotos, {});

  // Manejar descarga de reportes de fumigacion (completos con fotos)
  const handleDownload = async (dateRange) => {
    setIsDownloading(true);
    setDownloadProgress(0);
    try {
      const reports = reportsWithPhotos || [];
      const result = await generateFumigacionPDFComplete(
        reports,
        dateRange,
        (progress) => setDownloadProgress(progress)
      );
      console.log('📄 PDF de fumigacion completo generado:', result);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el reporte de fumigacion');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  if (embedded) {
    return (
      <div className="fumigation-container fumigation-container--embedded">
        <FumigationAssignments userRole={userRole} />
      </div>
    );
  }

  return (
    <div className="fumigation-container">
      {/* Header */}
      <div className="fumigation-header">
        <div className="fumigation-header__content">
          <div className="fumigation-header__title-group">
            <Bug className="fumigation-header__icon" size={32} />
            <div>
              <h1 className="fumigation-header__title">Gestion de Fumigacion</h1>
              <p className="fumigation-header__subtitle">
                Registra fumigaciones internas y externas con evidencia fotografica
              </p>
            </div>
          </div>
        </div>

        {/* Informacion de frecuencia */}
        <div className="fumigation-info">
          <div className="fumigation-info__item">
            <span className="fumigation-info__label">Interna (Mensual):</span>
            <span className="fumigation-info__value">1 vez al mes - 7:00 PM - 11:00 PM</span>
          </div>
          <div className="fumigation-info__item">
            <span className="fumigation-info__label">Externa (Semanal):</span>
            <span className="fumigation-info__value">3 veces por semana - 7:00 PM - 11:00 PM</span>
          </div>
        </div>

        {/* Seccion de descarga de reportes */}
        <ServiceDownloadSection
          serviceName="Fumigacion"
          serviceIcon={Bug}
          onDownload={handleDownload}
          isLoading={isDownloading}
          disabled={userRole === 'conductor'}
        />

        {/* Mensaje de reportes */}
        <div className="fumigation-notice">
          <BarChart3 size={18} />
          <span>
            Los reportes detallados de fumigacion estan disponibles en la seccion
            <strong> Reportes &rarr; Fumigacion</strong>
          </span>
        </div>
      </div>

      {/* Contenido */}
      <div className="fumigation-content">
        <FumigationAssignments userRole={userRole} />
      </div>
    </div>
  );
};

export default FumigationComponent;
