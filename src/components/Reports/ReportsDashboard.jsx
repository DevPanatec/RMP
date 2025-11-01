import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRoutes } from '../../context/RoutesContext';
import { useCleaning } from '../../context/CleaningContext';
import { useFumigation } from '../../context/FumigationContext';
import { useMaintenance } from '../../context/MaintenanceContext';
import { useReports } from '../../context/ReportsContext';
import { Truck, Zap, Sparkles, Wrench, Bug, TrendingUp, CheckCircle, Clock, Download, ChevronRight, Calendar } from '../Icons';
import { Card } from '../UI';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import './ReportsDashboard.css';

pdfMake.vfs = pdfFonts.vfs;

const ReportsDashboard = ({ onNavigate, categoriesNav }) => {
  const { user } = useAuth();
  const { routes } = useRoutes();
  const { assignments: cleaningAssignments } = useCleaning();
  const { assignments: fumigationAssignments } = useFumigation();
  const { tasks: maintenanceTasks } = useMaintenance();
  const { reports } = useReports();

  const [isDownloading, setIsDownloading] = useState(false);
  const [showGlobalControls, setShowGlobalControls] = useState(false); // Panel colapsado por defecto

  // Estado para controles globales
  const [dateRange, setDateRange] = useState({
    desde: new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0], // Últimos 30 días
    hasta: new Date().toISOString().split('T')[0] // Hoy
  });

  const [selectedModules, setSelectedModules] = useState({
    recoleccion: true,
    fumigacion: true,
    limpieza: true,
    mantenimiento: false
  });

  const rutasRecoleccion = routes.filter(r => r.type === 'recoleccion' || r.tipoServicio === 'recoleccion');

  const mantenimientoTotal = maintenanceTasks?.length || 0;
  const fumigacionTotal = fumigationAssignments?.length || 0;

  const limpiezaPendiente = cleaningAssignments.filter(a => a.estado === 'pendiente').length;
  const limpiezaCompletada = cleaningAssignments.filter(a => a.estado === 'completado').length;
  const limpiezaTotal = cleaningAssignments.length;

  // Calcular métricas de últimos 7 días
  const last7Days = useMemo(() => {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recoleccionRecent = rutasRecoleccion.filter(r => {
      const rDate = new Date(r.fecha || r.created_at);
      return rDate >= sevenDaysAgo;
    }).length;

    const fumigacionRecent = (fumigationAssignments || []).filter(f => {
      const fDate = new Date(f.fecha);
      return fDate >= sevenDaysAgo;
    }).length;

    const limpiezaRecent = cleaningAssignments.filter(a => {
      const aDate = new Date(a.fecha);
      return aDate >= sevenDaysAgo && a.estado === 'completado';
    }).length;

    const mantenimientoRecent = (maintenanceTasks || []).filter(t => {
      const tDate = new Date(t.scheduled_date || t.created_at);
      return tDate >= sevenDaysAgo;
    }).length;

    return { recoleccionRecent, fumigacionRecent, limpiezaRecent, mantenimientoRecent };
  }, [rutasRecoleccion, fumigationAssignments, cleaningAssignments, maintenanceTasks]);

  // Última actualización
  const lastUpdate = useMemo(() => {
    if (cleaningAssignments.length === 0) return 'Sin datos';
    const dates = cleaningAssignments.map(a => new Date(a.fecha || a.created_at)).filter(d => !isNaN(d));
    if (dates.length === 0) return 'Sin datos';
    const maxDate = new Date(Math.max(...dates));
    return maxDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, [cleaningAssignments]);

  // Toggle módulo
  const toggleModule = (module) => {
    setSelectedModules(prev => ({
      ...prev,
      [module]: !prev[module]
    }));
  };

  // Función para descargar reportes combinados
  const handleCombinedDownload = async () => {
    // Validar que al menos un módulo esté seleccionado
    const hasSelection = Object.values(selectedModules).some(v => v);
    if (!hasSelection) {
      alert('Debe seleccionar al menos un módulo para descargar');
      return;
    }

    // Validar rango de fechas
    if (dateRange.desde > dateRange.hasta) {
      alert('La fecha "Desde" debe ser anterior a la fecha "Hasta"');
      return;
    }

    // Validar permisos
    if (user?.tipo === 'conductor') {
      alert('No tiene permisos para descargar reportes');
      return;
    }

    setIsDownloading(true);

    try {
      const content = [];
      const desde = new Date(dateRange.desde);
      const hasta = new Date(dateRange.hasta);

      // Header
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

      // Separador
      content.push({
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }],
        margin: [0, 0, 0, 20]
      });

      // Recolección
      if (selectedModules.recoleccion) {
        const filtered = reports.filter(r => {
          const rDate = new Date(r.fecha_completacion);
          return rDate >= desde && rDate <= hasta;
        });

        content.push({ text: '🚛 REPORTES DE RECOLECCIÓN', style: 'sectionHeader', margin: [0, 0, 0, 10] });
        content.push({ text: `Total de reportes: ${filtered.length}`, margin: [0, 0, 0, 10] });

        if (filtered.length > 0) {
          filtered.forEach((report, idx) => {
            content.push({
              text: `${idx + 1}. ${report.ruta_nombre || 'Ruta'} - ${new Date(report.fecha_completacion).toLocaleDateString('es-ES')}`,
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

        content.push({ text: '', margin: [0, 0, 0, 15] }); // Spacer
      }

      // Fumigación
      if (selectedModules.fumigacion && fumigationAssignments) {
        const filtered = fumigationAssignments.filter(f => {
          const fDate = new Date(f.fecha);
          return fDate >= desde && fDate <= hasta;
        });

        content.push({ text: '🦟 REPORTES DE FUMIGACIÓN', style: 'sectionHeader', margin: [0, 0, 0, 10] });
        content.push({ text: `Total de reportes: ${filtered.length}`, margin: [0, 0, 0, 10] });

        if (filtered.length > 0) {
          filtered.forEach((fumigation, idx) => {
            const tipo = fumigation.tipo_fumigacion === 'interna' ? 'Interna' : 'Externa';
            content.push({
              text: `${idx + 1}. ${tipo} - ${fumigation.lugar_nombre} - ${new Date(fumigation.fecha).toLocaleDateString('es-ES')}`,
              margin: [10, 5, 0, 0]
            });
            content.push({
              text: `   Horario: ${fumigation.horario_inicio} - ${fumigation.horario_fin}`,
              fontSize: 10,
              color: '#666',
              margin: [10, 2, 0, 5]
            });
          });
        } else {
          content.push({ text: 'No hay reportes en el periodo seleccionado', italics: true, color: '#999', margin: [10, 0, 0, 10] });
        }

        content.push({ text: '', margin: [0, 0, 0, 15] }); // Spacer
      }

      // Limpieza
      if (selectedModules.limpieza && cleaningAssignments) {
        const filtered = cleaningAssignments.filter(a => {
          const aDate = new Date(a.fecha);
          return aDate >= desde && aDate <= hasta;
        });

        content.push({ text: '🧹 REPORTES DE LIMPIEZA', style: 'sectionHeader', margin: [0, 0, 0, 10] });
        content.push({ text: `Total de reportes: ${filtered.length}`, margin: [0, 0, 0, 10] });

        if (filtered.length > 0) {
          filtered.forEach((cleaning, idx) => {
            content.push({
              text: `${idx + 1}. ${cleaning.lugar?.nombre || 'Lugar'} - ${cleaning.area?.nombre || 'Área'} - ${new Date(cleaning.fecha).toLocaleDateString('es-ES')}`,
              margin: [10, 5, 0, 0]
            });
            content.push({
              text: `   Hora: ${cleaning.hora} | Estado: ${cleaning.estado}`,
              fontSize: 10,
              color: '#666',
              margin: [10, 2, 0, 5]
            });
          });
        } else {
          content.push({ text: 'No hay reportes en el periodo seleccionado', italics: true, color: '#999', margin: [10, 0, 0, 10] });
        }

        content.push({ text: '', margin: [0, 0, 0, 15] }); // Spacer
      }

      // Mantenimiento
      if (selectedModules.mantenimiento && maintenanceTasks) {
        const filtered = maintenanceTasks.filter(t => {
          const tDate = new Date(t.scheduled_date);
          return tDate >= desde && tDate <= hasta;
        });

        content.push({ text: '🔧 REPORTES DE MANTENIMIENTO', style: 'sectionHeader', margin: [0, 0, 0, 10] });
        content.push({ text: `Total de reportes: ${filtered.length}`, margin: [0, 0, 0, 10] });

        if (filtered.length > 0) {
          filtered.forEach((task, idx) => {
            content.push({
              text: `${idx + 1}. ${task.type} - ${new Date(task.scheduled_date).toLocaleDateString('es-ES')}`,
              margin: [10, 5, 0, 0]
            });
            content.push({
              text: `   ${task.observations?.substring(0, 80) || 'Sin observaciones'}`,
              fontSize: 10,
              color: '#666',
              margin: [10, 2, 0, 5]
            });
          });
        } else {
          content.push({ text: 'No hay reportes en el periodo seleccionado', italics: true, color: '#999', margin: [10, 0, 0, 10] });
        }
      }

      // Generar PDF
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
          header: {
            fontSize: 18,
            bold: true
          },
          sectionHeader: {
            fontSize: 14,
            bold: true,
            color: '#3D5229'
          }
        },
        defaultStyle: {
          fontSize: 11
        }
      };

      const fileName = `Reportes_Combinados_${desde.toISOString().split('T')[0]}_${hasta.toISOString().split('T')[0]}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);

      console.log('✅ PDF combinado generado exitosamente:', fileName);
    } catch (error) {
      console.error('Error generando PDF combinado:', error);
      alert('Error al generar el reporte combinado. Por favor intenta nuevamente.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="reports-dashboard">
      {/* Botón para expandir/colapsar controles globales */}
      <div className="global-controls-toggle">
        <button
          className="btn-toggle-controls"
          onClick={() => setShowGlobalControls(!showGlobalControls)}
        >
          <Download size={20} />
          <span>Descargar Reportes Combinados</span>
          <span className={`toggle-icon ${showGlobalControls ? 'open' : ''}`}>▼</span>
        </button>
      </div>

      {/* Panel de Controles Globales (colapsable) */}
      {showGlobalControls && (
        <div className="global-controls-panel">
          <div className="controls-header">
            <div>
              <h3>📊 Controles Globales de Reportes</h3>
              <p>Filtra y descarga reportes combinados de múltiples módulos</p>
            </div>
          </div>

          <div className="controls-body">
            {/* Rango de Fechas */}
            <div className="date-range-controls">
              <div className="date-input-group">
                <label><Calendar size={16} /> Desde</label>
                <input
                  type="date"
                  value={dateRange.desde}
                  onChange={(e) => setDateRange(prev => ({ ...prev, desde: e.target.value }))}
                  max={dateRange.hasta}
                />
              </div>
              <div className="date-input-group">
                <label><Calendar size={16} /> Hasta</label>
                <input
                  type="date"
                  value={dateRange.hasta}
                  onChange={(e) => setDateRange(prev => ({ ...prev, hasta: e.target.value }))}
                  min={dateRange.desde}
                />
              </div>
            </div>

            {/* Selección de Módulos */}
            <div className="modules-selection">
              <label className="modules-label">Módulos a incluir:</label>
              <div className="modules-checkboxes">
                <label className={`module-checkbox ${selectedModules.recoleccion ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedModules.recoleccion}
                    onChange={() => toggleModule('recoleccion')}
                  />
                  <Truck size={18} />
                  <span>Recolección</span>
                </label>

                <label className={`module-checkbox ${selectedModules.fumigacion ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedModules.fumigacion}
                    onChange={() => toggleModule('fumigacion')}
                  />
                  <Bug size={18} />
                  <span>Fumigación</span>
                </label>

                <label className={`module-checkbox ${selectedModules.limpieza ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedModules.limpieza}
                    onChange={() => toggleModule('limpieza')}
                  />
                  <Sparkles size={18} />
                  <span>Limpieza</span>
                </label>

                <label className={`module-checkbox ${selectedModules.mantenimiento ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedModules.mantenimiento}
                    onChange={() => toggleModule('mantenimiento')}
                  />
                  <Wrench size={18} />
                  <span>Mantenimiento</span>
                </label>
              </div>
            </div>

            {/* Botón de Descarga */}
            <div className="download-action">
              <button
                className="btn-download-combined"
                onClick={handleCombinedDownload}
                disabled={isDownloading || !Object.values(selectedModules).some(v => v)}
              >
                <Download size={20} />
                {isDownloading ? 'Generando PDF...' : 'Descargar Selección'}
              </button>
              {!Object.values(selectedModules).some(v => v) && (
                <span className="validation-hint">Selecciona al menos un módulo</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-header">
        <div>
          <h2>Dashboard de Reportes</h2>
          <p>Vista general de todas las operaciones</p>
        </div>
      </div>

      {categoriesNav}

      <div className="dashboard-metrics">
        <Card
          className="metric-card metric-card--recoleccion"
          hoverable
          onClick={() => onNavigate?.('recoleccion')}
        >
          <div className="metric-icon">
            <img
              src="/icons/modules/RECOLECCION.png"
              alt="Recolección"
              className="metric-logo"
              loading="eager"
              fetchpriority="high"
              decoding="async"
            />
          </div>
          <div className="metric-content">
            <h3>Recolección</h3>
            <div className="metric-stats">
              <div className="stat-item">
                <span className="stat-value">{rutasRecoleccion.length}</span>
                <span className="stat-label">Total de Reportes</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{last7Days.recoleccionRecent}</span>
                <span className="stat-label">Últimos 7 días</span>
              </div>
            </div>
            <div className="metric-update">
              <Calendar size={14} />
              <span>Actualizado: {lastUpdate}</span>
            </div>
          </div>
          <div className="metric-action">
            <ChevronRight size={24} />
          </div>
        </Card>

        <Card
          className="metric-card metric-card--fumigacion"
          hoverable
          onClick={() => onNavigate?.('fumigacion')}
        >
          <div className="metric-icon">
            <img
              src="/icons/modules/FUMIGACION.png"
              alt="Fumigación"
              className="metric-logo"
              loading="eager"
              fetchpriority="high"
              decoding="async"
            />
          </div>
          <div className="metric-content">
            <h3>Fumigación</h3>
            <div className="metric-stats">
              <div className="stat-item">
                <span className="stat-value">{fumigacionTotal}</span>
                <span className="stat-label">Total de Reportes</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{last7Days.fumigacionRecent}</span>
                <span className="stat-label">Últimos 7 días</span>
              </div>
            </div>
            <div className="metric-update">
              <Calendar size={14} />
              <span>Actualizado: {lastUpdate}</span>
            </div>
          </div>
          <div className="metric-action">
            <ChevronRight size={24} />
          </div>
        </Card>

        <Card
          className="metric-card metric-card--limpieza"
          hoverable
          onClick={() => onNavigate?.('limpieza')}
        >
          <div className="metric-icon">
            <img
              src="/icons/modules/limpieza.png"
              alt="Limpieza"
              className="metric-logo"
              loading="eager"
              fetchpriority="high"
              decoding="async"
            />
          </div>
          <div className="metric-content">
            <h3>Limpieza</h3>
            <div className="metric-stats">
              <div className="stat-item">
                <span className="stat-value">{limpiezaTotal}</span>
                <span className="stat-label">Total de Reportes</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{last7Days.limpiezaRecent}</span>
                <span className="stat-label">Últimos 7 días</span>
              </div>
            </div>
            <div className="metric-update">
              <Calendar size={14} />
              <span>Actualizado: {lastUpdate}</span>
            </div>
          </div>
          <div className="metric-action">
            <ChevronRight size={24} />
          </div>
        </Card>

        <Card
          className="metric-card metric-card--mantenimiento"
          hoverable
          onClick={() => onNavigate?.('mantenimiento')}
        >
          <div className="metric-icon">
            <img
              src="/icons/modules/mantenimiento.png"
              alt="Mantenimiento"
              className="metric-logo"
              loading="eager"
              fetchpriority="high"
              decoding="async"
            />
          </div>
          <div className="metric-content">
            <h3>Mantenimiento</h3>
            <div className="metric-stats">
              <div className="stat-item">
                <span className="stat-value">{mantenimientoTotal}</span>
                <span className="stat-label">Total de Reportes</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{last7Days.mantenimientoRecent}</span>
                <span className="stat-label">Últimos 7 días</span>
              </div>
            </div>
            <div className="metric-update">
              <Calendar size={14} />
              <span>Actualizado: {lastUpdate}</span>
            </div>
          </div>
          <div className="metric-action">
            <ChevronRight size={24} />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ReportsDashboard;
