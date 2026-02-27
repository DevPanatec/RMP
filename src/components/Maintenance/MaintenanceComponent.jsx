import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { BarChart3, Wrench } from '../Icons';
import { ServiceDownloadSection } from '../shared';
import { generateMantenimientoPDFComplete } from '../../utils/reportPdfGenerator';
import MaintenanceDashboard from './MaintenanceDashboard';
import MaintenanceTasks from './MaintenanceTasks';
import './MaintenanceComponent.css';

const MaintenanceComponent = ({ userRole = 'admin' }) => {
  const [activeView, setActiveView] = useState('dashboard');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Obtener reportes con fotos desde Convex
  const reportsWithPhotos = useQuery(api.maintenance.listReportsWithPhotos, {});

  // Manejar descarga de reportes de mantenimiento (completos con fotos)
  const handleDownload = async (dateRange) => {
    setIsDownloading(true);
    setDownloadProgress(0);
    try {
      const reports = reportsWithPhotos || [];
      const result = await generateMantenimientoPDFComplete(
        reports,
        dateRange,
        (progress) => setDownloadProgress(progress)
      );
      console.log('📄 PDF de mantenimiento completo generado:', result);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el reporte de mantenimiento');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const categories = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'tareas', label: 'Tareas', icon: Wrench }
  ];

  const renderCategoriesNav = () => (
    <div className="reports-categories">
      {categories.map(category => (
        <button
          key={category.id}
          className={`category-tab ${activeView === category.id ? 'category-tab--active' : ''}`}
          onClick={() => setActiveView(category.id)}
        >
          <category.icon size={20} strokeWidth={1.5} />
          <span>{category.label}</span>
        </button>
      ))}
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <MaintenanceDashboard userRole={userRole} />;
      case 'tareas':
        return <MaintenanceTasks userRole={userRole} />;
      default:
        return <MaintenanceDashboard userRole={userRole} />;
    }
  };

  return (
    <div className="reports-container-new maintenance-container-modern">
      {/* Header con descarga */}
      <div className="maintenance-header-section">
        <div className="maintenance-header-info">
          <h2>Gestion de Mantenimiento</h2>
          <p>Administra tareas de mantenimiento preventivo y correctivo</p>
        </div>
        <ServiceDownloadSection
          serviceName="Mantenimiento"
          serviceIcon={Wrench}
          onDownload={handleDownload}
          isLoading={isDownloading}
          disabled={userRole === 'conductor'}
          variant="compact"
        />
      </div>

      {renderCategoriesNav()}
      <div className="reports-content-new" style={{ marginTop: '24px' }}>
        {renderContent()}
      </div>
    </div>
  );
};

export default MaintenanceComponent;
