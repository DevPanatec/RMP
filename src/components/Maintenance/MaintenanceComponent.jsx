import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { BarChart3, Wrench, Plus, MapPin, CalendarCheck, FileText } from '../Icons';
import { ServiceDownloadSection } from '../shared';
import LocationComponentsView from '../LocationComponents/LocationComponentsView';
import { generateMantenimientoPDFComplete } from '../../utils/lazyPdf';
import MaintenanceDashboard from './MaintenanceDashboard';
import MaintenanceTasks from './MaintenanceTasks';
import MaintenanceTaskModal from './MaintenanceTaskModal';
import PMScheduleManager from './PMScheduleManager';
import './MaintenanceComponent.css';

const MaintenanceComponent = ({ userRole = 'admin', mode = 'sites' }) => {
  const isFleet = mode === 'fleet';
  const [activeView, setActiveView] = useState(isFleet ? 'dashboard' : 'sitios');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [viewMode, setViewMode] = useState(false);

  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  const reportsWithPhotos = useQuery(
    api.maintenance.listReportsWithPhotos,
    isFleet ? {} : 'skip'
  );

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
      console.log('PDF de mantenimiento completo generado:', result);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el reporte de mantenimiento');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const fleetCategories = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'preventivo', label: 'Preventivo', icon: CalendarCheck },
    { id: 'tareas', label: 'Tareas', icon: Wrench },
  ];

  const siteCategories = [
    { id: 'sitios', label: 'Sitios y Componentes', icon: MapPin },
    { id: 'tareas-sitio', label: 'Tareas de Sitio', icon: Wrench },
    { id: 'reportes', label: 'Reportes', icon: FileText },
  ];

  const categories = isFleet ? fleetCategories : siteCategories;

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

  const renderStub = (icon, title, description) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'var(--space-32) var(--space-16)',
        gap: 'var(--space-12)',
        color: 'var(--color-text-secondary)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div style={{ color: 'var(--color-text-tertiary)' }}>{icon}</div>
      <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)', color: 'var(--color-text)' }}>
        {title}
      </h3>
      <p style={{ margin: 0, maxWidth: 480, fontSize: 'var(--font-size-base)' }}>
        {description}
      </p>
      <span
        style={{
          marginTop: 'var(--space-8)',
          padding: '4px 8px',
          fontSize: 'var(--font-size-xs)',
          fontWeight: 'var(--font-weight-medium)',
          color: 'var(--color-info)',
          background: 'var(--color-info-light)',
          border: '1px solid var(--color-info)',
          borderRadius: 'var(--radius-sm)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        Próximamente · Fase 2
      </span>
    </div>
  );

  const renderContent = () => {
    if (isFleet) {
      switch (activeView) {
        case 'dashboard':
          return (
            <MaintenanceDashboard
              userRole={userRole}
              onCreateTask={isAdmin ? handleOpenCreate : null}
              onSeeAllTasks={() => setActiveView('tareas')}
            />
          );
        case 'preventivo':
          return <PMScheduleManager canWrite={isAdmin} />;
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
          return null;
      }
    }

    switch (activeView) {
      case 'sitios':
        return <LocationComponentsView userRole={userRole} />;
      case 'tareas-sitio':
        return renderStub(
          <Wrench size={48} strokeWidth={1.25} />,
          'Tareas de Sitio',
          'Gestión de tareas de mantenimiento por sitio cliente: cambio de extintores, mantención de AC, bombas, generadores, plomería. Con asignación a taller interno o externo.'
        );
      case 'reportes':
        return renderStub(
          <FileText size={48} strokeWidth={1.25} />,
          'Reportes por Sitio',
          'Historial mensual por cliente y sitio con fotos antes/durante/después, costo, taller responsable y observaciones. Exportable en PDF para auditoría del cliente.'
        );
      default:
        return null;
    }
  };

  const headerTitle = isFleet ? 'Mantenimiento de Flota' : 'Mantenimiento de Sitios';
  const headerSubtitle = isFleet
    ? 'Tareas vehiculares preventivas y correctivas'
    : 'Mantenimiento de sitios cliente y sus componentes';
  const showCreateBtn = isAdmin && isFleet;
  const showDownload = isFleet;

  return (
    <div className="reports-container-new maintenance-container-modern">
      <div className="maintenance-header-section">
        <div className="maintenance-header-info">
          <h2>{headerTitle}</h2>
          <p>{headerSubtitle}</p>
        </div>
        <div className="maintenance-header-actions">
          {showCreateBtn && (
            <button
              type="button"
              className="maintenance-header-create-btn"
              onClick={handleOpenCreate}
            >
              <Plus size={18} />
              <span>Nueva Tarea</span>
            </button>
          )}
          {showDownload && (
            <ServiceDownloadSection
              serviceName="Mantenimiento"
              serviceIcon={Wrench}
              onDownload={handleDownload}
              isLoading={isDownloading}
              disabled={userRole === 'conductor'}
              variant="compact"
            />
          )}
        </div>
      </div>

      {renderCategoriesNav()}
      <div className="reports-content-new" style={{ marginTop: '24px' }}>
        {renderContent()}
      </div>

      {showModal && isFleet && (
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
