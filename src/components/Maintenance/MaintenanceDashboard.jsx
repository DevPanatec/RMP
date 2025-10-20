import { useSupabaseMaintenance } from '../../context/SupabaseMaintenanceContext';
import { Calendar, Clock, CheckCircle, AlertTriangle, TrendingUp, Package } from '../Icons';

const MaintenanceDashboard = ({ userRole }) => {
  const { tasks, alerts, getUpcomingTasks, getTasksByStatus, getOperationalStats } = useSupabaseMaintenance();

  const upcomingTasks = getUpcomingTasks(7);
  const programmedTasks = getTasksByStatus('programada');
  const inProgressTasks = getTasksByStatus('en_proceso');
  const completedTasks = getTasksByStatus('completada');
  const activeAlerts = alerts.filter(a => a.status === 'active');
  const stats = getOperationalStats();

  // Calculate overdue tasks
  const now = new Date();
  const overdueTasks = tasks.filter(task => {
    const taskDate = new Date(`${task.scheduled_date}T${task.scheduled_time}`);
    return taskDate < now && task.status !== 'completada';
  });

  return (
    <div>
      {/* Hero Stats con degradado */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '24px',
        color: 'white',
        boxShadow: '0 8px 32px rgba(61, 82, 41, 0.2)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', fontWeight: '700', marginBottom: '8px', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              {programmedTasks.length}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '500' }}>
              Programadas
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', fontWeight: '700', marginBottom: '8px', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              {inProgressTasks.length}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '500' }}>
              En Proceso
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', fontWeight: '700', marginBottom: '8px', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              {completedTasks.length}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '500' }}>
              Completadas
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', fontWeight: '700', marginBottom: '8px', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              {activeAlerts.length}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '500' }}>
              Alertas Activas
            </div>
          </div>
        </div>
      </div>

      {/* Operational Stats con cards mejoradas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
          border: '1px solid rgba(0, 122, 255, 0.1)',
          borderRadius: '16px',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '80px', opacity: '0.1' }}>💧</div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              Volumen Total
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#0c4a6e', marginBottom: '4px' }}>
              {stats.totalDischarges.toLocaleString()}
            </div>
            <div style={{ fontSize: '13px', color: '#0369a1', fontWeight: '500' }}>
              galones descargados
            </div>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: '1px solid var(--color-primary-subtle)',
          borderRadius: '16px',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '80px', opacity: '0.1' }}>💵</div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              Costo Acumulado
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--color-primary-active)', marginBottom: '4px' }}>
              B/. {stats.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-primary-hover)', fontWeight: '500' }}>
              inversión total
            </div>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: '1px solid rgba(255, 149, 0, 0.1)',
          borderRadius: '16px',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '80px', opacity: '0.1' }}>⚡</div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#d97706', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              Alto Impacto
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#92400e', marginBottom: '4px' }}>
              {stats.highImpactCleanups}
            </div>
            <div style={{ fontSize: '13px', color: '#b45309', fontWeight: '500' }}>
              limpiezas realizadas
            </div>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
          border: '1px solid rgba(168, 85, 247, 0.1)',
          borderRadius: '16px',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '80px', opacity: '0.1' }}>⏱️</div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#9333ea', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              Duración Promedio
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#581c87', marginBottom: '4px' }}>
              {stats.averageWorkDuration.toFixed(1)}
            </div>
            <div style={{ fontSize: '13px', color: '#7c3aed', fontWeight: '500' }}>
              horas de trabajo
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Tasks Alert */}
      {overdueTasks.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 59, 48, 0.05) 0%, rgba(255, 59, 48, 0.02) 100%)',
          border: '1px solid rgba(255, 59, 48, 0.2)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'start',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'rgba(255, 59, 48, 0.1)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertTriangle size={20} style={{ color: '#ff3b30' }} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#dc2626' }}>
              {overdueTasks.length} Tarea{overdueTasks.length !== 1 ? 's' : ''} Vencida{overdueTasks.length !== 1 ? 's' : ''}
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#991b1b' }}>
              Hay tareas que no se han completado en la fecha programada. Revísalas lo antes posible.
            </p>
          </div>
        </div>
      )}

      {/* Upcoming Tasks */}
      <div className="maintenance-section">
        <div className="maintenance-section__header">
          <h3 className="maintenance-section__title">📅 Próximos Mantenimientos (7 días)</h3>
        </div>

        {upcomingTasks.length === 0 ? (
          <div className="maintenance-empty">
            <div className="maintenance-empty__icon">📅</div>
            <h4 className="maintenance-empty__title">No hay mantenimientos programados</h4>
            <p className="maintenance-empty__description">
              No hay mantenimientos programados para los próximos 7 días
            </p>
          </div>
        ) : (
          <div className="maintenance-task-list">
            {upcomingTasks.map((task) => {
              const taskDate = new Date(`${task.scheduled_date}T${task.scheduled_time}`);
              const daysUntil = Math.ceil((taskDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const urgency = daysUntil <= 1 ? 'red' : daysUntil <= 3 ? 'yellow' : 'green';

              const urgencyStyles = {
                red: {
                  bg: 'linear-gradient(135deg, rgba(255, 59, 48, 0.08) 0%, rgba(255, 59, 48, 0.04) 100%)',
                  border: 'rgba(255, 59, 48, 0.3)',
                  color: '#dc2626'
                },
                yellow: {
                  bg: 'linear-gradient(135deg, rgba(255, 204, 0, 0.08) 0%, rgba(255, 204, 0, 0.04) 100%)',
                  border: 'rgba(255, 204, 0, 0.3)',
                  color: '#d97706'
                },
                green: {
                  bg: 'linear-gradient(135deg, var(--color-primary-subtle) 0%, var(--color-primary-light) 100%)',
                  border: 'var(--color-primary-subtle)',
                  color: 'var(--color-primary)'
                }
              };

              return (
                <div
                  key={task.id}
                  className="maintenance-task-item"
                  style={{
                    background: urgencyStyles[urgency].bg,
                    border: `1px solid ${urgencyStyles[urgency].border}`,
                    borderLeft: `4px solid ${urgencyStyles[urgency].color}`
                  }}
                >
                  <div className="maintenance-task-item__content">
                    <span className={`maintenance-task-item__badge maintenance-task-item__badge--${task.type}`}>
                      {task.type}
                    </span>
                    <div className="maintenance-task-item__info">
                      <div className="maintenance-task-item__date">
                        {new Date(task.scheduled_date).toLocaleDateString('es-PA')} {task.scheduled_time}
                      </div>
                      <div className="maintenance-task-item__description">{task.observations}</div>
                      {task.operational_data && (
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '8px', display: 'flex', gap: '16px' }}>
                          <span>💧 {task.operational_data.volume_discharged?.toLocaleString()} gal</span>
                          <span>💵 B/. {task.operational_data.total_estimated_cost?.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: urgencyStyles[urgency].color,
                    padding: '8px 16px',
                    background: 'white',
                    borderRadius: '8px'
                  }}>
                    {daysUntil === 0 ? '🔥 Hoy' : daysUntil === 1 ? '⚠️ Mañana' : `📌 ${daysUntil} días`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Completed Tasks */}
      <div className="maintenance-section">
        <div className="maintenance-section__header">
          <h3 className="maintenance-section__title">✅ Mantenimientos Completados Recientes</h3>
        </div>

        {completedTasks.length === 0 ? (
          <div className="maintenance-empty">
            <div className="maintenance-empty__icon">✅</div>
            <h4 className="maintenance-empty__title">No hay mantenimientos completados</h4>
            <p className="maintenance-empty__description">
              Los mantenimientos completados aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="maintenance-task-list">
            {completedTasks.slice(0, 5).map((task) => (
              <div key={task.id} className="maintenance-task-item" style={{
                background: 'linear-gradient(135deg, var(--color-primary-light) 0%, rgba(255, 255, 255, 0.5) 100%)',
                borderLeft: '4px solid var(--color-primary)'
              }}>
                <div className="maintenance-task-item__content">
                  <span className={`maintenance-task-item__badge maintenance-task-item__badge--${task.type}`}>
                    {task.type}
                  </span>
                  <div className="maintenance-task-item__info">
                    <div className="maintenance-task-item__date">
                      ✅ Completado: {task.completed_at ? new Date(task.completed_at).toLocaleDateString('es-PA') : '-'}
                    </div>
                    <div className="maintenance-task-item__description">{task.observations}</div>
                    {task.operational_data && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '12px',
                        fontSize: '12px',
                        marginTop: '12px',
                        padding: '12px',
                        background: 'white',
                        borderRadius: '8px'
                      }}>
                        <div>
                          <div style={{ color: '#999', marginBottom: '4px' }}>Volumen</div>
                          <div style={{ fontWeight: '600', color: '#333' }}>
                            {task.operational_data.volume_discharged?.toLocaleString()} gal
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#999', marginBottom: '4px' }}>Costo</div>
                          <div style={{ fontWeight: '600', color: '#333' }}>
                            B/. {task.operational_data.total_estimated_cost?.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#999', marginBottom: '4px' }}>Duración</div>
                          <div style={{ fontWeight: '600', color: '#333' }}>
                            {task.operational_data.work_duration} hrs
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <span className="maintenance-task-item__status maintenance-task-item__status--completada">
                  Completada
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceDashboard;
