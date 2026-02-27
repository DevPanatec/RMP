import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Sparkles, BarChart3 } from '../Icons';
import { ServiceDownloadSection } from '../shared';
import { generateLimpiezaPDFComplete } from '../../utils/reportPdfGenerator';
import CleaningAssignments from './CleaningAssignments';
import './CleaningComponent.css';

const CleaningComponent = ({ userRole = 'admin', embedded = false }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Obtener reportes con fotos desde Convex
  const reportsWithPhotos = useQuery(api.cleaning.listReportsWithPhotos, {});

  // Manejar descarga de reportes de limpieza (completos con fotos)
  const handleDownload = async (dateRange) => {
    setIsDownloading(true);
    setDownloadProgress(0);
    try {
      const reports = reportsWithPhotos || [];
      const result = await generateLimpiezaPDFComplete(
        reports,
        dateRange,
        (progress) => setDownloadProgress(progress)
      );
      console.log('📄 PDF de limpieza completo generado:', result);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el reporte de limpieza');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  if (embedded) {
    return (
      <div className="cleaning-container cleaning-container--embedded">
        <CleaningAssignments userRole={userRole} />
      </div>
    );
  }

  return (
    <div className="cleaning-container">
      {/* Header */}
      <div className="cleaning-header">
        <div className="cleaning-header__content">
          <div className="cleaning-header__title-group">
            <Sparkles className="cleaning-header__icon" size={32} />
            <div>
              <h1 className="cleaning-header__title">Gestion de Limpieza</h1>
              <p className="cleaning-header__subtitle">
                Crea y administra asignaciones de limpieza con evidencias fotograficas
              </p>
            </div>
          </div>
        </div>

        {/* Seccion de descarga de reportes */}
        <ServiceDownloadSection
          serviceName="Limpieza"
          serviceIcon={Sparkles}
          onDownload={handleDownload}
          isLoading={isDownloading}
          disabled={userRole === 'conductor'}
        />

        {/* Mensaje de reportes */}
        <div className="cleaning-notice">
          <BarChart3 size={18} />
          <span>
            Los reportes detallados de limpieza estan disponibles en la seccion
            <strong> Reportes &rarr; Limpieza</strong>
          </span>
        </div>
      </div>

      {/* Contenido */}
      <div className="cleaning-content">
        <CleaningAssignments userRole={userRole} />
      </div>
    </div>
  );
};

export default CleaningComponent;
