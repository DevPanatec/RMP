import { useMaintenance } from '../../context/MaintenanceContext';
import { Calendar, Clock, CheckCircle, AlertTriangle, Wrench, TrendingUp, Plus } from '../Icons';

const MaintenanceDashboard = ({ userRole, onCreateTask, onSeeAllTasks }) => {
  const { tasks, getUpcomingTasks, getTasksByStatus, getOperationalStats } = useMaintenance();

  const upcomingTasks = getUpcomingTasks(7);
  const completedTasks = getTasksByStatus('completada');
  const stats = getOperationalStats();

  const now = new Date();

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('es-PA', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getTipoLabel = (tipo) => {
    switch (tipo) {
      case 'preventivo': return 'Preventivo';
      case 'correctivo': return 'Correctivo';
      case 'inspección': return 'Inspección';
      default: return tipo || 'General';
    }
  };

  const getUrgencyClass = (daysUntil) => {
    if (daysUntil <= 1) return 'maint-dash-urgency--error';
    if (daysUntil <= 3) return 'maint-dash-urgency--warning';
    return 'maint-dash-urgency--primary';
  };

  const getBorderClass = (daysUntil) => {
    if (daysUntil <= 1) return 'maint-dash-task-item--error';
    if (daysUntil <= 3) return 'maint-dash-task-item--warning';
    return '';
  };

  return (
    <div>
      {/* Stats Cards */}
      <div className="maint-dash-grid">
        <div className="maint-dash-stat-card">
          <div className="maint-dash-stat-header">
            <div className="maint-dash-stat-icon maint-dash-stat-icon--primary">
              <Wrench size={20} />
            </div>
            <span className="maint-dash-stat-label">Total Tareas</span>
          </div>
          <div className="maint-dash-stat-value">{stats.total}</div>
        </div>

        <div className="maint-dash-stat-card">
          <div className="maint-dash-stat-header">
            <div className="maint-dash-stat-icon maint-dash-stat-icon--warning">
              <Clock size={20} />
            </div>
            <span className="maint-dash-stat-label">Pendientes</span>
          </div>
          <div className="maint-dash-stat-value">{stats.pendiente}</div>
        </div>

        <div className="maint-dash-stat-card">
          <div className="maint-dash-stat-header">
            <div className="maint-dash-stat-icon maint-dash-stat-icon--success">
              <CheckCircle size={20} />
            </div>
            <span className="maint-dash-stat-label">Completadas</span>
          </div>
          <div className="maint-dash-stat-value">{stats.completed}</div>
        </div>

        <div className="maint-dash-stat-card">
          <div className="maint-dash-stat-header">
            <div className="maint-dash-stat-icon maint-dash-stat-icon--info">
              <TrendingUp size={20} />
            </div>
            <span className="maint-dash-stat-label">Costo Total</span>
          </div>
          <div className="maint-dash-stat-value">
            B/. {stats.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="maint-dash-columns">

        {/* Próximos Mantenimientos */}
        <div className="maint-dash-panel">
          <div className="maint-dash-panel__header">
            <div className="maint-dash-panel__icon maint-dash-panel__icon--primary">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="maint-dash-panel__title">Próximos Mantenimientos</h3>
              <p className="maint-dash-panel__subtitle">Próximos 7 días</p>
            </div>
          </div>

          <div className="maint-dash-panel__content">
            {upcomingTasks.length === 0 ? (
              <div className="maint-dash-empty">
                <Calendar size={48} className="maint-dash-empty__icon" />
                <p className="maint-dash-empty__text">No hay mantenimientos programados</p>
                {onCreateTask && (
                  <button
                    type="button"
                    className="maint-dash-empty-cta"
                    onClick={onCreateTask}
                  >
                    <Plus size={16} />
                    Crear primera tarea
                  </button>
                )}
              </div>
            ) : (
              <div className="maint-dash-task-list">
                {upcomingTasks.slice(0, 5).map((task) => {
                  const taskDate = task.fecha_programada ? new Date(task.fecha_programada) : new Date();
                  const daysUntil = Math.ceil((taskDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                  return (
                    <div
                      key={task._id}
                      className={`maint-dash-task-item ${getBorderClass(daysUntil)}`}
                    >
                      <div className="maint-dash-task-row">
                        <div className="maint-dash-task-info">
                          <div className="maint-dash-task-meta">
                            <span className="maint-dash-type-badge">
                              {getTipoLabel(task.tipo)}
                            </span>
                            <span className="maint-dash-task-date">
                              {formatDate(task.fecha_programada)}
                            </span>
                          </div>
                          <p className="maint-dash-task-title">
                            {task.titulo || 'Tarea de mantenimiento'}
                          </p>
                        </div>
                        <div className={`maint-dash-urgency ${getUrgencyClass(daysUntil)}`}>
                          {daysUntil === 0 ? (
                            <>
                              <AlertTriangle size={12} />
                              <span>Hoy</span>
                            </>
                          ) : daysUntil === 1 ? (
                            <>
                              <Clock size={12} />
                              <span>Mañana</span>
                            </>
                          ) : (
                            <span>{daysUntil} días</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Completados Recientes */}
        <div className="maint-dash-panel">
          <div className="maint-dash-panel__header">
            <div className="maint-dash-panel__icon maint-dash-panel__icon--success">
              <CheckCircle size={18} />
            </div>
            <div>
              <h3 className="maint-dash-panel__title">Completados Recientes</h3>
              <p className="maint-dash-panel__subtitle">Últimos 5 mantenimientos</p>
            </div>
          </div>

          <div className="maint-dash-panel__content">
            {completedTasks.length === 0 ? (
              <div className="maint-dash-empty">
                <CheckCircle size={48} className="maint-dash-empty__icon" />
                <p className="maint-dash-empty__text">No hay mantenimientos completados</p>
                {onSeeAllTasks && tasks.length > 0 && (
                  <button
                    type="button"
                    className="maint-dash-empty-cta maint-dash-empty-cta--ghost"
                    onClick={onSeeAllTasks}
                  >
                    Ver todas las tareas
                  </button>
                )}
              </div>
            ) : (
              <div className="maint-dash-task-list">
                {completedTasks.slice(0, 5).map((task) => (
                  <div
                    key={task._id}
                    className="maint-dash-task-item maint-dash-task-item--success"
                  >
                    <div className="maint-dash-task-row maint-dash-task-row--with-mb">
                      <div className="maint-dash-task-info">
                        <div className="maint-dash-task-meta">
                          <span className="maint-dash-type-badge maint-dash-type-badge--success">
                            {getTipoLabel(task.tipo)}
                          </span>
                          <span className="maint-dash-task-date">
                            <CheckCircle size={12} style={{ color: 'var(--color-success)' }} />
                            {formatDate(task.fecha_completada)}
                          </span>
                        </div>
                        <p className="maint-dash-task-title">
                          {task.titulo || 'Tarea de mantenimiento'}
                        </p>
                      </div>
                    </div>

                    {(task.costo || task.mecanico) && (
                      <div className="maint-dash-completed-meta">
                        {task.costo > 0 && (
                          <div className="maint-dash-completed-meta__item">
                            <TrendingUp size={14} style={{ color: 'var(--color-info)' }} />
                            <span className="maint-tasks-cost-value">
                              B/. {task.costo.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {task.mecanico && (
                          <div className="maint-dash-completed-meta__item">
                            <Wrench size={14} style={{ color: 'var(--color-text-secondary)' }} />
                            <span style={{ color: 'var(--color-text-secondary)' }}>
                              {task.mecanico}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceDashboard;
