import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../../context/AuthContext';
import { useCleaning } from '../../context/CleaningContext';
import { useFumigation } from '../../context/FumigationContext';
import { useMaintenance } from '../../context/MaintenanceContext';
import { useReports } from '../../context/ReportsContext';
import { useOrganization } from '../../context/OrganizationContext';
import { Truck, Sparkles, Wrench, Bug, Download, ChevronRight, Calendar, BarChart3, CheckSquare } from '../Icons';
import { generateCombinedPDFComplete } from '../../utils/lazyPdf';
import './ReportsDashboard.css';

// Helper para parsear fechas sin problemas de timezone
const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr.includes('T')) return new Date(dateStr);
  return new Date(dateStr + 'T00:00:00');
};

const ReportsDashboard = ({ onNavigate, categoriesNav }) => {
  const { user } = useAuth();
  const { hasModulo } = useOrganization();
  const { assignments: cleaningAssignments } = useCleaning();
  const { assignments: fumigationAssignments } = useFumigation();
  const { tasks: maintenanceTasks } = useMaintenance();
  const { reports } = useReports();

  // Query para reportes de mantenimiento (estadisticas)
  const maintenanceReportsData = useQuery(api.maintenance.listReports);
  const maintenanceReports = maintenanceReportsData || [];

  // Queries para reportes COMPLETOS con fotos (para descarga)
  const cleaningReportsWithPhotos = useQuery(api.cleaning.listReportsWithPhotos, {});
  const fumigationReportsWithPhotos = useQuery(api.fumigaciones.listReportsWithPhotos, {});
  const maintenanceReportsWithPhotos = useQuery(api.maintenance.listReportsWithPhotos, {});

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showDownloadPanel, setShowDownloadPanel] = useState(false);

  // Estado para controles de descarga
  const [dateRange, setDateRange] = useState({
    desde: new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0],
    hasta: new Date().toISOString().split('T')[0]
  });

  // Default: sólo módulos activos pre-seleccionados (regla CREAR del Sprint H).
  // Módulos off con histórico pueden seleccionarse manualmente.
  const [selectedModules, setSelectedModules] = useState({
    recoleccion: hasModulo('REC'),
    fumigacion: hasModulo('FUM'),
    limpieza: hasModulo('LIM'),
    mantenimiento: hasModulo('MTO'),
  });

  const [includeIndex, setIncludeIndex] = useState(true);

  // Datos de reportes
  const rutasRecoleccion = reports.filter(r => r.tipo_ruta === 'recoleccion');
  const mantenimientoTotal = maintenanceReports.length;
  const fumigacionTotal = fumigationAssignments?.filter(a => a.estado === 'realizada' || a.estado === 'reportada').length || 0;
  const limpiezaTotal = cleaningAssignments.filter(a => a.estado === 'completado').length;

  // Métricas de últimos 7 días
  const last7Days = useMemo(() => {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recoleccionRecent = rutasRecoleccion.filter(r => {
      const rDate = parseLocalDate(r.fecha_completacion);
      return rDate >= sevenDaysAgo;
    }).length;

    const fumigacionRecent = (fumigationAssignments || []).filter(f => {
      const fDate = parseLocalDate(f.fecha);
      return fDate >= sevenDaysAgo && (f.estado === 'realizada' || f.estado === 'reportada');
    }).length;

    const limpiezaRecent = cleaningAssignments.filter(a => {
      const aDate = parseLocalDate(a.fecha);
      return aDate >= sevenDaysAgo && a.estado === 'completado';
    }).length;

    const mantenimientoRecent = (maintenanceTasks || []).filter(t => {
      const tDate = parseLocalDate(t.fecha_completada || t.fecha_programada);
      return tDate >= sevenDaysAgo && t.estado === 'completada';
    }).length;

    return { recoleccionRecent, fumigacionRecent, limpiezaRecent, mantenimientoRecent };
  }, [rutasRecoleccion, fumigationAssignments, cleaningAssignments, maintenanceTasks]);

  // Última actualización por módulo
  const getLastUpdate = (dates) => {
    const validDates = dates.filter(d => d && !isNaN(d));
    if (validDates.length === 0) return 'Sin datos';
    const maxDate = new Date(Math.max(...validDates));
    return maxDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const lastUpdates = useMemo(() => ({
    recoleccion: getLastUpdate(rutasRecoleccion.map(r => r.fecha_completacion ? parseLocalDate(r.fecha_completacion) : null)),
    fumigacion: getLastUpdate((fumigationAssignments || []).filter(a => a.estado === 'realizada' || a.estado === 'reportada').map(a => a.fecha ? parseLocalDate(a.fecha) : null)),
    limpieza: getLastUpdate(cleaningAssignments.filter(a => a.estado === 'completado').map(a => a.fecha ? parseLocalDate(a.fecha) : null)),
    mantenimiento: getLastUpdate(maintenanceReports.map(r => r.fecha_reporte ? parseLocalDate(r.fecha_reporte) : null)),
  }), [rutasRecoleccion, fumigationAssignments, cleaningAssignments, maintenanceReports]);

  // Toggle módulo
  const toggleModule = (module) => {
    setSelectedModules(prev => ({ ...prev, [module]: !prev[module] }));
  };

  // Descargar reportes combinados COMPLETOS con fotos
  const handleCombinedDownload = async () => {
    const hasSelection = Object.values(selectedModules).some(v => v);
    if (!hasSelection) {
      alert('Debe seleccionar al menos un modulo para descargar');
      return;
    }

    if (dateRange.desde > dateRange.hasta) {
      alert('La fecha "Desde" debe ser anterior a la fecha "Hasta"');
      return;
    }

    if (user?.tipo === 'conductor') {
      alert('No tiene permisos para descargar reportes');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      // Preparar datos con reportes COMPLETOS (con fotos)
      const data = {
        recoleccion: reports || [],
        fumigacion: fumigationReportsWithPhotos || [],
        limpieza: cleaningReportsWithPhotos || [],
        mantenimiento: maintenanceReportsWithPhotos || []
      };

      const result = await generateCombinedPDFComplete(
        data,
        dateRange,
        selectedModules,
        (progress) => setDownloadProgress(progress),
        { includeIndex }
      );
      console.log('PDF completo generado:', result);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el reporte.');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  // Seleccionar/deseleccionar todos
  const selectAllModules = () => {
    const allSelected = Object.values(selectedModules).every(v => v);
    const newValue = !allSelected;
    setSelectedModules({
      recoleccion: newValue,
      fumigacion: newValue,
      limpieza: newValue,
      mantenimiento: newValue
    });
  };

  // Configuración de módulos — anotados con `requiredModulo` y `isHistorical`
  // para que el render decida si la card es interactiva (módulo activo) o
  // sólo histórica (módulo off pero hay data acumulada).
  const allModules = [
    {
      id: 'recoleccion',
      title: 'Recolección',
      icon: Truck,
      color: '#107C10',
      total: rutasRecoleccion.length,
      recent: last7Days.recoleccionRecent,
      image: '/icons/modules/RECOLECCION.png',
      lastUpdate: lastUpdates.recoleccion,
      requiredModulo: 'REC',
    },
    {
      id: 'fumigacion',
      title: 'Fumigación',
      icon: Bug,
      color: '#0078D4',
      total: fumigacionTotal,
      recent: last7Days.fumigacionRecent,
      image: '/icons/modules/FUMIGACION.png',
      lastUpdate: lastUpdates.fumigacion,
      requiredModulo: 'FUM',
    },
    {
      id: 'limpieza',
      title: 'Limpieza',
      icon: Sparkles,
      color: '#8764B8',
      total: limpiezaTotal,
      recent: last7Days.limpiezaRecent,
      image: '/icons/modules/limpieza.png',
      lastUpdate: lastUpdates.limpieza,
      requiredModulo: 'LIM',
    },
    {
      id: 'mantenimiento',
      title: 'Mantenimiento',
      icon: Wrench,
      color: '#CA5010',
      total: mantenimientoTotal,
      recent: last7Days.mantenimientoRecent,
      image: '/icons/modules/mantenimiento.png',
      lastUpdate: lastUpdates.mantenimiento,
      requiredModulo: 'MTO',
    },
  ];

  // Cards visibles: módulo activo OR data histórica > 0.
  const modules = allModules
    .map((m) => ({
      ...m,
      isActive: hasModulo(m.requiredModulo),
      isHistoricalOnly: !hasModulo(m.requiredModulo) && m.total > 0,
    }))
    .filter((m) => m.isActive || m.total > 0);

  return (
    <div className="reports-dashboard-v2">
      {/* Header */}
      <header className="rd-header">
        <div className="rd-header-left">
          <div className="rd-header-icon">
            <BarChart3 size={24} />
          </div>
          <div className="rd-header-text">
            <h1>Centro de Reportes</h1>
            <p>Vista consolidada de operaciones</p>
          </div>
        </div>
        <button
          className="rd-download-btn"
          onClick={() => setShowDownloadPanel(!showDownloadPanel)}
        >
          <Download size={18} />
          <span>Exportar</span>
        </button>
      </header>

      {/* Panel de descarga */}
      {showDownloadPanel && (
        <div className="rd-download-panel">
          <div className="rd-panel-header">
            <h3>Exportar Reportes</h3>
            <button className="rd-panel-close" onClick={() => setShowDownloadPanel(false)}>×</button>
          </div>

          <div className="rd-panel-body">
            <div className="rd-date-range">
              <div className="rd-date-field">
                <label>Desde</label>
                <input
                  type="date"
                  value={dateRange.desde}
                  onChange={(e) => setDateRange(prev => ({ ...prev, desde: e.target.value }))}
                  max={dateRange.hasta}
                />
              </div>
              <div className="rd-date-field">
                <label>Hasta</label>
                <input
                  type="date"
                  value={dateRange.hasta}
                  onChange={(e) => setDateRange(prev => ({ ...prev, hasta: e.target.value }))}
                  min={dateRange.desde}
                />
              </div>
            </div>

            <div className="rd-modules-select">
              <div className="rd-modules-header">
                <label>Incluir modulos:</label>
                <button
                  className="rd-select-all-btn"
                  onClick={selectAllModules}
                >
                  <CheckSquare size={14} />
                  {Object.values(selectedModules).every(v => v) ? 'Deseleccionar' : 'Seleccionar'} todos
                </button>
              </div>
              <div className="rd-module-chips">
                {modules.map(mod => (
                  <button
                    key={mod.id}
                    className={`rd-chip ${selectedModules[mod.id] ? 'active' : ''}`}
                    onClick={() => toggleModule(mod.id)}
                    style={{ '--chip-color': mod.color }}
                  >
                    <mod.icon size={14} />
                    <span>{mod.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rd-index-toggle">
              <label className="rd-toggle-label">
                <input
                  type="checkbox"
                  checked={includeIndex}
                  onChange={(e) => setIncludeIndex(e.target.checked)}
                />
                <span>Incluir índice de reportes</span>
              </label>
            </div>

            <button
              className="rd-export-btn"
              onClick={handleCombinedDownload}
              disabled={isDownloading || !Object.values(selectedModules).some(v => v)}
            >
              <Download size={16} />
              {isDownloading
                ? `Generando... ${Math.round(downloadProgress)}%`
                : 'Descargar PDF Completo'}
            </button>
          </div>
        </div>
      )}

      {/* Navegación de categorías */}
      {categoriesNav}

      {/* Grid de módulos */}
      <div className="rd-modules-grid">
        {modules.map((mod) => (
          <div
            key={mod.id}
            className="rd-module-card"
            onClick={() => onNavigate?.(mod.id)}
            style={{ '--module-color': mod.color }}
          >
            <div className="rd-card-accent" />

            <div className="rd-card-header">
              <img
                src={mod.image}
                alt={mod.title}
                className="rd-card-logo"
              />
              <h3>{mod.title}</h3>
            </div>

            <div className="rd-card-stats">
              <div className="rd-stat">
                <span className="rd-stat-value">{mod.total}</span>
                <span className="rd-stat-label">Total</span>
              </div>
              <div className="rd-stat-divider" />
              <div className="rd-stat">
                <span className="rd-stat-value">{mod.recent}</span>
                <span className="rd-stat-label">7 días</span>
              </div>
            </div>

            <div className="rd-card-footer">
              <span className="rd-card-update">
                <Calendar size={12} />
                {mod.lastUpdate}
              </span>
              <ChevronRight size={18} className="rd-card-arrow" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportsDashboard;
