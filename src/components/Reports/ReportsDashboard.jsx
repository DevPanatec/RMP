import { useSupabaseRoutes } from '../../context/SupabaseRoutesContext';
import { useSupabaseCleaning } from '../../context/SupabaseCleaningContext';
import { Truck, Zap, Sparkles, TrendingUp, CheckCircle, Clock } from '../Icons';
import { Card } from '../UI';
import './ReportsDashboard.css';

const ReportsDashboard = () => {
  const { routes } = useSupabaseRoutes();
  const { assignments } = useSupabaseCleaning();

  const rutasRecoleccion = routes.filter(r => r.type === 'recoleccion' || r.tipoServicio === 'recoleccion');
  const rutasFumigacion = routes.filter(r => r.type === 'fumigacion' || r.tipoServicio === 'fumigacion');

  const limpiezaPendiente = assignments.filter(a => a.estado === 'pendiente').length;
  const limpiezaCompletada = assignments.filter(a => a.estado === 'completado').length;
  const limpiezaTotal = assignments.length;

  return (
    <div className="reports-dashboard">
      <div className="dashboard-header">
        <h2>Dashboard de Reportes</h2>
        <p>Vista general de todas las operaciones</p>
      </div>

      <div className="dashboard-metrics">
        <Card className="metric-card metric-card--recoleccion">
          <div className="metric-icon">
            <Truck size={32} strokeWidth={1.5} />
          </div>
          <div className="metric-content">
            <h3>Recolección</h3>
            <div className="metric-stats">
              <div className="stat-item">
                <span className="stat-value">{rutasRecoleccion.length}</span>
                <span className="stat-label">Rutas Activas</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {rutasRecoleccion.filter(r => r.estado === 'activo').length}
                </span>
                <span className="stat-label">En Operación</span>
              </div>
            </div>
          </div>
          <div className="metric-trend">
            <TrendingUp size={20} />
            <span>85%</span>
          </div>
        </Card>

        <Card className="metric-card metric-card--fumigacion">
          <div className="metric-icon">
            <Zap size={32} strokeWidth={1.5} />
          </div>
          <div className="metric-content">
            <h3>Fumigación</h3>
            <div className="metric-stats">
              <div className="stat-item">
                <span className="stat-value">{rutasFumigacion.length}</span>
                <span className="stat-label">Rutas Activas</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {rutasFumigacion.filter(r => r.estado === 'activo').length}
                </span>
                <span className="stat-label">En Operación</span>
              </div>
            </div>
          </div>
          <div className="metric-trend">
            <TrendingUp size={20} />
            <span>92%</span>
          </div>
        </Card>

        <Card className="metric-card metric-card--limpieza">
          <div className="metric-icon">
            <Sparkles size={32} strokeWidth={1.5} />
          </div>
          <div className="metric-content">
            <h3>Limpieza</h3>
            <div className="metric-stats">
              <div className="stat-item">
                <span className="stat-value">{limpiezaTotal}</span>
                <span className="stat-label">Total Asignaciones</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{limpiezaCompletada}</span>
                <span className="stat-label">Completadas</span>
              </div>
            </div>
          </div>
          <div className="metric-trend">
            <CheckCircle size={20} />
            <span>{limpiezaTotal > 0 ? Math.round((limpiezaCompletada / limpiezaTotal) * 100) : 0}%</span>
          </div>
        </Card>
      </div>

      <div className="dashboard-quick-stats">
        <div className="quick-stat">
          <Clock size={24} />
          <div className="quick-stat-content">
            <span className="quick-stat-value">{limpiezaPendiente}</span>
            <span className="quick-stat-label">Limpiezas Pendientes</span>
          </div>
        </div>

        <div className="quick-stat">
          <CheckCircle size={24} />
          <div className="quick-stat-content">
            <span className="quick-stat-value">{rutasRecoleccion.length + rutasFumigacion.length}</span>
            <span className="quick-stat-label">Rutas Totales</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsDashboard;
