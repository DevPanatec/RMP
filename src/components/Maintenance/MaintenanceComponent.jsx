import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { BarChart3, Wrench, Plus } from '../Icons';
import { ServiceDownloadSection } from '../shared';
import { generateMantenimientoPDFComplete } from '../../utils/reportPdfGenerator';
import MaintenanceDashboard from './MaintenanceDashboard';
import MaintenanceTasks from './MaintenanceTasks';
import MaintenanceTaskModal from './MaintenanceTaskModal';
import './MaintenanceComponent.css';

const MaintenanceComponent = ({ userRole = 'admin' }) => {
  const [activeView, setActiveView] = useState('dashboard');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Modal lifecycle elevado al parent — botón en header dispara desde cualquier vista
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [viewMode, setViewMode] = useState(false);

  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  // Obtener reportes con fotos desde Convex
  const reportsWithPhotos = useQuery(api.maintenance.listReportsWithPhotos, {});

  const handleOpenCreate = () => {
    setSelectedTask(null);
    setViewMode(false);
    setShowModal(true);
  };

  const handleView = (task) => {
    setSelectedTask(task);
    setViewMode(true);
    setShowModal(true);
  };

  const handleEdit = (task) => {
    setSelectedTask(task);
    setViewMode(!isAdmin);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTask(null);
    setViewMode(false);
  };

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
        return (
          <MaintenanceDashboard
            userRole={userRole}
            onCreateTask={isAdmin ? handleOpenCreate : null}
            onSeeAllTasks={() => setActiveView('tareas')}
          />
        );
      case 'tareas':
        return (
          <MaintenanceTasks
            userRole={userRole}
            isAdmin={isAdmin}
            onCreate={handleOpenCreate}
            onView={handleView}
            onEdit={handleEdit}
          />
        );
      default:
        return <MaintenanceDashboard userRole={userRole} />;
    }
  };

  return (
    <div className="reports-container-new maintenance-container-modern">
      {/* Header con botón crear + descarga */}
      <div className="maintenance-header-section">
        <div className="maintenance-header-info">
          <h2>Gestion de Mantenimiento</h2>
          <p>Administra tareas de mantenimiento preventivo y correctivo</p>
        </div>
        <div className="maintenance-header-actions">
          {isAdmin && (
            <button
              type="button"
              className="maintenance-header-create-btn"
              onClick={handleOpenCreate}
            >
              <Plus size={18} />
              <span>Nueva Tarea</span>
            </button>
          )}
          <ServiceDownloadSection
            serviceName="Mantenimiento"
            serviceIcon={Wrench}
            onDownload={handleDownload}
            isLoading={isDownloading}
            disabled={userRole === 'conductor'}
            variant="compact"
          />
        </div>
      </div>

      {renderCategoriesNav()}
      <div className="reports-content-new" style={{ marginTop: '24px' }}>
        {renderContent()}
      </div>

      {showModal && (
        <MaintenanceTaskModal
          task={selectedTask}
          viewMode={viewMode}
          userRole={userRole}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default MaintenanceComponent;
