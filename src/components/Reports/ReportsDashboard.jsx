import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../../context/AuthContext';
import { useRoutes } from '../../context/RoutesContext';
import { useCleaning } from '../../context/CleaningContext';
import { useFumigation } from '../../context/FumigationContext';
import { useMaintenance } from '../../context/MaintenanceContext';
import { useReports } from '../../context/ReportsContext';
import { Truck, Sparkles, Wrench, Bug, Download, ChevronRight, Calendar, BarChart3 } from '../Icons';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import './ReportsDashboard.css';

pdfMake.vfs = pdfFonts.vfs;

// Helper para parsear fechas sin problemas de timezone
const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr.includes('T')) return new Date(dateStr);
  return new Date(dateStr + 'T00:00:00');
};

const ReportsDashboard = ({ onNavigate, categoriesNav }) => {
  const { user } = useAuth();
  const { routes } = useRoutes();
  const { assignments: cleaningAssignments } = useCleaning();
  const { assignments: fumigationAssignments } = useFumigation();
  const { tasks: maintenanceTasks } = useMaintenance();
  const { reports } = useReports();

  // Query para reportes de mantenimiento
  const maintenanceReportsData = useQuery(api.maintenance.listReports);
  const maintenanceReports = maintenanceReportsData || [];

  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadPanel, setShowDownloadPanel] = useState(false);

  // Estado para controles de descarga
  const [dateRange, setDateRange] = useState({
    desde: new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0],
    hasta: new Date().toISOString().split('T')[0]
  });

  const [selectedModules, setSelectedModules] = useState({
    recoleccion: true,
    fumigacion: true,
    limpieza: true,
    mantenimiento: false
  });

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

  // Última actualización
  const lastUpdate = useMemo(() => {
    if (rutasRecoleccion.length === 0) return 'Sin datos';
    const dates = rutasRecoleccion.map(r => parseLocalDate(r.fecha_completacion)).filter(d => !isNaN(d));
    if (dates.length === 0) return 'Sin datos';
    const maxDate = new Date(Math.max(...dates));
    return maxDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, [rutasRecoleccion]);

  // Toggle módulo
  const toggleModule = (module) => {
    setSelectedModules(prev => ({ ...prev, [module]: !prev[module] }));
  };

  // Descargar reportes combinados
  const handleCombinedDownload = async () => {
    const hasSelection = Object.values(selectedModules).some(v => v);
    if (!hasSelection) {
      alert('Debe seleccionar al menos un módulo para descargar');
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

    try {
      const content = [];
      const desde = parseLocalDate(dateRange.desde);
      const hasta = parseLocalDate(dateRange.hasta);

      content.push({
        text: 'REPORTES COMBINADOS - RMP',
        style: 'header',
        alignment: 'center',
        margin: [0, 0, 0, 10]
      });

      content.push({
        columns: [
          { text: `Periodo: ${desde.toLocaleDateString('es-ES')} - ${hasta.toLocaleDateString('es-ES')}`, width: '*' },
          { text: `Generado: ${new Date().toLocaleString('es-ES')}`, width: 'auto', alignment: 'right' }
        ],
        margin: [0, 0, 0, 20]
      });

      content.push({
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }],
        margin: [0, 0, 0, 20]
      });

      // Recolección
      if (selectedModules.recoleccion) {
        const filtered = reports.filter(r => {
          const rDate = parseLocalDate(r.fecha_completacion);
          return rDate >= desde && rDate <= hasta;
        });

        content.push({ text: 'REPORTES DE RECOLECCIÓN', style: 'sectionHeader', margin: [0, 0, 0, 10] });
        content.push({ text: `Total de reportes: ${filtered.length}`, margin: [0, 0, 0, 10] });

        if (filtered.length > 0) {
          filtered.forEach((report, idx) => {
            content.push({
              text: `${idx + 1}. ${report.ruta_nombre || 'Ruta'} - ${parseLocalDate(report.fecha_completacion).toLocaleDateString('es-ES')}`,
              margin: [10, 5, 0, 0]
            });
            content.push({
              text: `   Conductor: ${report.conductor_nombre} | Vehículo: ${report.vehiculo_placa}`,
              fontSize: 10,
              color: '#666',
              margin: [10, 2, 0, 5]
            });
          });
        } else {
          content.push({ text: 'No hay reportes en el periodo seleccionado', italics: true, color: '#999', margin: [10, 0, 0, 10] });
        }
        content.push({ text: '', margin: [0, 0, 0, 15] });
      }

      // Fumigación
      if (selectedModules.fumigacion && fumigationAssignments) {
        const filtered = fumigationAssignments.filter(f => {
          const fDate = parseLocalDate(f.fecha);
          return fDate >= desde && fDate <= hasta;
        });

        content.push({ text: 'REPORTES DE FUMIGACIÓN', style: 'sectionHeader', margin: [0, 0, 0, 10] });
        content.push({ text: `Total de reportes: ${filtered.length}`, margin: [0, 0, 0, 10] });

        if (filtered.length > 0) {
          filtered.forEach((fumigation, idx) => {
            const tipo = fumigation.tipo_fumigacion === 'interna' ? 'Interna' : 'Externa';
            content.push({
              text: `${idx + 1}. ${tipo} - ${fumigation.lugar_nombre} - ${parseLocalDate(fumigation.fecha).toLocaleDateString('es-ES')}`,
              margin: [10, 5, 0, 0]
            });
          });
        } else {
          content.push({ text: 'No hay reportes en el periodo seleccionado', italics: true, color: '#999', margin: [10, 0, 0, 10] });
        }
        content.push({ text: '', margin: [0, 0, 0, 15] });
      }

      // Limpieza
      if (selectedModules.limpieza && cleaningAssignments) {
        const filtered = cleaningAssignments.filter(a => {
          const aDate = parseLocalDate(a.fecha);
          return aDate >= desde && aDate <= hasta;
        });

        content.push({ text: 'REPORTES DE LIMPIEZA', style: 'sectionHeader', margin: [0, 0, 0, 10] });
        content.push({ text: `Total de reportes: ${filtered.length}`, margin: [0, 0, 0, 10] });

        if (filtered.length > 0) {
          filtered.forEach((cleaning, idx) => {
            content.push({
              text: `${idx + 1}. ${cleaning.lugar?.nombre || 'Lugar'} - ${cleaning.area?.nombre || 'Área'} - ${parseLocalDate(cleaning.fecha).toLocaleDateString('es-ES')}`,
              margin: [10, 5, 0, 0]
            });
          });
        } else {
          content.push({ text: 'No hay reportes en el periodo seleccionado', italics: true, color: '#999', margin: [10, 0, 0, 10] });
        }
        content.push({ text: '', margin: [0, 0, 0, 15] });
      }

      // Mantenimiento
      if (selectedModules.mantenimiento && maintenanceTasks) {
        const filtered = maintenanceTasks.filter(t => {
          const tDate = new Date(t.scheduled_date);
          return tDate >= desde && tDate <= hasta;
        });

        content.push({ text: 'REPORTES DE MANTENIMIENTO', style: 'sectionHeader', margin: [0, 0, 0, 10] });
        content.push({ text: `Total de reportes: ${filtered.length}`, margin: [0, 0, 0, 10] });

        if (filtered.length > 0) {
          filtered.forEach((task, idx) => {
            content.push({
              text: `${idx + 1}. ${task.type} - ${new Date(task.scheduled_date).toLocaleDateString('es-ES')}`,
              margin: [10, 5, 0, 0]
            });
          });
        } else {
          content.push({ text: 'No hay reportes en el periodo seleccionado', italics: true, color: '#999', margin: [10, 0, 0, 10] });
        }
      }

      const docDefinition = {
        content,
        footer: (currentPage, pageCount) => ({
          text: `Página ${currentPage} de ${pageCount} | RMP - Recolecting Manager Pro`,
          alignment: 'center',
          fontSize: 8,
          italics: true,
          margin: [0, 10, 0, 0]
        }),
        styles: {
          header: { fontSize: 18, bold: true },
          sectionHeader: { fontSize: 14, bold: true, color: '#0078D4' }
        },
        defaultStyle: { fontSize: 11 }
      };

      const fileName = `Reportes_${desde.toISOString().split('T')[0]}_${hasta.toISOString().split('T')[0]}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el reporte.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Configuración de módulos
  const modules = [
    {
      id: 'recoleccion',
      title: 'Recolección',
      icon: Truck,
      color: '#107C10',
      total: rutasRecoleccion.length,
      recent: last7Days.recoleccionRecent,
      image: '/icons/modules/RECOLECCION.png'
    },
    {
      id: 'fumigacion',
      title: 'Fumigación',
      icon: Bug,
      color: '#0078D4',
      total: fumigacionTotal,
      recent: last7Days.fumigacionRecent,
      image: '/icons/modules/FUMIGACION.png'
    },
    {
      id: 'limpieza',
      title: 'Limpieza',
      icon: Sparkles,
      color: '#8764B8',
      total: limpiezaTotal,
      recent: last7Days.limpiezaRecent,
      image: '/icons/modules/limpieza.png'
    },
    {
      id: 'mantenimiento',
      title: 'Mantenimiento',
      icon: Wrench,
      color: '#CA5010',
      total: mantenimientoTotal,
      recent: last7Days.mantenimientoRecent,
      image: '/icons/modules/mantenimiento.png'
    }
  ];

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
              <label>Incluir módulos:</label>
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

            <button
              className="rd-export-btn"
              onClick={handleCombinedDownload}
              disabled={isDownloading || !Object.values(selectedModules).some(v => v)}
            >
              <Download size={16} />
              {isDownloading ? 'Generando...' : 'Descargar PDF'}
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
                {lastUpdate}
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
