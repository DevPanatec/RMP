import { useState, useMemo } from 'react';
import { useSupabaseRoutes } from '../../context/SupabaseRoutesContext';
import { useSupabaseCleaning } from '../../context/SupabaseCleaningContext';
import { useSupabaseMaintenance } from '../../context/SupabaseMaintenanceContext';
import { Truck, Zap, Sparkles, Wrench, TrendingUp, CheckCircle, Clock, Download, ChevronRight, Calendar } from '../Icons';
import { Card } from '../UI';
import { RecoleccionIcon, FumigacionIcon, LimpiezaIcon, MantenimientoIcon } from './ServiceIcons';
import './ReportsDashboard.css';

const ReportsDashboard = ({ onNavigate, categoriesNav }) => {
  const { routes } = useSupabaseRoutes();
  const { assignments } = useSupabaseCleaning();
  const { tasks: maintenanceTasks } = useSupabaseMaintenance();
  const [isDownloading, setIsDownloading] = useState(false);

  const rutasRecoleccion = routes.filter(r => r.type === 'recoleccion' || r.tipoServicio === 'recoleccion');
  const rutasFumigacion = routes.filter(r => r.type === 'fumigacion' || r.tipoServicio === 'fumigacion');

  const mantenimientoTotal = maintenanceTasks?.length || 0;

  const limpiezaPendiente = assignments.filter(a => a.estado === 'pendiente').length;
  const limpiezaCompletada = assignments.filter(a => a.estado === 'completado').length;
  const limpiezaTotal = assignments.length;

  // Calcular métricas de últimos 7 días
  const last7Days = useMemo(() => {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recoleccionRecent = assignments.filter(a => {
      const aDate = new Date(a.fecha);
      return aDate >= sevenDaysAgo && (a.tipo === 'recoleccion' || a.tipoServicio === 'recoleccion');
    }).length;

    const fumigacionRecent = assignments.filter(a => {
      const aDate = new Date(a.fecha);
      return aDate >= sevenDaysAgo && (a.tipo === 'fumigacion' || a.tipoServicio === 'fumigacion');
    }).length;

    const limpiezaRecent = assignments.filter(a => {
      const aDate = new Date(a.fecha);
      return aDate >= sevenDaysAgo && a.estado === 'completado';
    }).length;

    const mantenimientoRecent = (maintenanceTasks || []).filter(t => {
      const tDate = new Date(t.scheduled_date || t.created_at);
      return tDate >= sevenDaysAgo;
    }).length;

    return { recoleccionRecent, fumigacionRecent, limpiezaRecent, mantenimientoRecent };
  }, [assignments, maintenanceTasks]);

  // Última actualización
  const lastUpdate = useMemo(() => {
    if (assignments.length === 0) return 'Sin datos';
    const dates = assignments.map(a => new Date(a.fecha || a.created_at)).filter(d => !isNaN(d));
    if (dates.length === 0) return 'Sin datos';
    const maxDate = new Date(Math.max(...dates));
    return maxDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, [assignments]);

  // Función para descargar reportes masivos
  const handleMassiveDownload = async () => {
    setIsDownloading(true);
    try {
      // TODO: Implementar descarga masiva real con ZIP
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulación
      console.log('Descargando reportes masivos...');
      alert('Función de descarga masiva en desarrollo. Se descargará un ZIP con todos los reportes.');
    } catch (error) {
      console.error('Error descargando reportes:', error);
      alert('Error al descargar reportes');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="reports-dashboard">
      <div className="dashboard-header">
        <div>
          <h2>Dashboard de Reportes</h2>
          <p>Vista general de todas las operaciones</p>
        </div>
        <button
          className="btn-new btn-new--primary"
          onClick={handleMassiveDownload}
          disabled={isDownloading}
        >
          <Download size={18} />
          {isDownloading ? 'Descargando...' : 'Descargar Reportes Masivos'}
        </button>
      </div>

      {categoriesNav}

      <div className="dashboard-metrics">
        <Card
          className="metric-card metric-card--recoleccion"
          hoverable
          onClick={() => onNavigate?.('recoleccion')}
        >
          <div className="metric-icon">
            <RecoleccionIcon size={56} className="metric-logo" />
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
            <FumigacionIcon size={56} className="metric-logo" />
          </div>
          <div className="metric-content">
            <h3>Fumigación</h3>
            <div className="metric-stats">
              <div className="stat-item">
                <span className="stat-value">{rutasFumigacion.length}</span>
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
            <LimpiezaIcon size={56} className="metric-logo" />
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
            <MantenimientoIcon size={56} className="metric-logo" />
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
