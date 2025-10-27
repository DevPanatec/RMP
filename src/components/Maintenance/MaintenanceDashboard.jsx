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

      {/* Operational Stats - Diseño delgado con divisiones */}
      <div style={{
        background: 'linear-gradient(135deg, #556B2F 0%, #3D5229 100%)',
        borderRadius: '16px',
        padding: '20px 0',
        marginBottom: '32px',
        boxShadow: '0 4px 16px rgba(61, 82, 41, 0.2)',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)'
      }}>
        {/* Volumen Total */}
        <div style={{
          padding: '0 24px',
          borderRight: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Package size={24} style={{ color: 'white' }} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
              Volumen Total
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'white', lineHeight: 1, marginBottom: '2px' }}>
              {stats.totalDischarges.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.65)' }}>
              galones descargados
            </div>
          </div>
        </div>

        {/* Costo Acumulado */}
        <div style={{
          padding: '0 24px',
          borderRight: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <TrendingUp size={24} style={{ color: 'white' }} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
              Costo Acumulado
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'white', lineHeight: 1, marginBottom: '2px' }}>
              B/. {stats.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.65)' }}>
              inversión total
            </div>
          </div>
        </div>

        {/* Alto Impacto */}
        <div style={{
          padding: '0 24px',
          borderRight: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertTriangle size={24} style={{ color: 'white' }} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
              Alto Impacto
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'white', lineHeight: 1, marginBottom: '2px' }}>
              {stats.highImpactCleanups}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.65)' }}>
              limpiezas realizadas
            </div>
          </div>
        </div>

        {/* Duración Promedio */}
        <div style={{
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Clock size={24} style={{ color: 'white' }} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
              Duración Promedio
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'white', lineHeight: 1, marginBottom: '2px' }}>
              {stats.averageWorkDuration.toFixed(1)}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.65)' }}>
              horas de trabajo
            </div>
          </div>
        </div>
      </div>

      {/* Tasks Grid - Compact Side by Side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px' }}>
        {/* Upcoming Tasks */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
          border: '2px solid #dcfce7',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 4px 16px rgba(61, 82, 41, 0.08)',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #dcfce7' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #3D5229 0%, #556B2F 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(61, 82, 41, 0.2)'
            }}>
              <Calendar size={22} style={{ color: 'white' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>Próximos Mantenimientos</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Próximos 7 días</p>
            </div>
          </div>

          {upcomingTasks.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 16px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Calendar size={40} style={{ color: '#9ca3af' }} />
              </div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>Sin mantenimientos</h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af', textAlign: 'center' }}>
                No hay mantenimientos programados
              </p>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
              {upcomingTasks.slice(0, 5).map((task) => {
              const taskDate = new Date(`${task.scheduled_date}T${task.scheduled_time}`);
              const daysUntil = Math.ceil((taskDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const urgency = daysUntil <= 1 ? 'red' : daysUntil <= 3 ? 'yellow' : 'green';

              const urgencyColor = daysUntil <= 1 ? '#dc2626' : daysUntil <= 3 ? '#d97706' : '#3D5229';

              return (
                <div
                  key={task.id}
                  style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderLeft: `3px solid ${urgencyColor}`,
                    borderRadius: '12px',
                    padding: '14px 16px',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span className={`maintenance-task-item__badge maintenance-task-item__badge--${task.type}`} style={{ fontSize: '11px', padding: '3px 10px' }}>
                          {task.type}
                        </span>
                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                          {new Date(task.scheduled_date).toLocaleDateString('es-PA')}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', color: '#1f2937', marginBottom: '4px', lineHeight: '1.4' }}>
                        {task.observations}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      color: urgencyColor,
                      padding: '6px 12px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
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
                        <span>{daysUntil}d</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>

        {/* Recent Completed Tasks */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
          border: '2px solid #dcfce7',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 4px 16px rgba(61, 82, 41, 0.08)',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #dcfce7' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #3D5229 0%, #556B2F 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(61, 82, 41, 0.2)'
            }}>
              <CheckCircle size={22} style={{ color: 'white' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>Completados Recientes</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Últimos 5 mantenimientos</p>
            </div>
          </div>

          {completedTasks.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 16px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle size={40} style={{ color: '#3D5229' }} />
              </div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>Sin completados</h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af', textAlign: 'center' }}>
                Los completados aparecerán aquí
              </p>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
              {completedTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderLeft: '3px solid #3D5229',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span className={`maintenance-task-item__badge maintenance-task-item__badge--${task.type}`} style={{ fontSize: '11px', padding: '3px 10px' }}>
                          {task.type}
                        </span>
                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={12} style={{ color: '#3D5229' }} />
                          {task.completed_at ? new Date(task.completed_at).toLocaleDateString('es-PA') : '-'}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', color: '#1f2937', lineHeight: '1.4' }}>
                        {task.observations}
                      </div>
                    </div>
                  </div>
                  {task.operational_data && (
                    <div style={{
                      display: 'flex',
                      gap: '16px',
                      fontSize: '11px',
                      padding: '10px',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280' }}>
                        <Package size={12} style={{ color: '#0284c7' }} />
                        <span style={{ fontWeight: '600' }}>{task.operational_data.volume_discharged?.toLocaleString()} gal</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280' }}>
                        <TrendingUp size={12} style={{ color: '#3D5229' }} />
                        <span style={{ fontWeight: '600' }}>B/. {task.operational_data.total_estimated_cost?.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280' }}>
                        <Clock size={12} style={{ color: '#9333ea' }} />
                        <span style={{ fontWeight: '600' }}>{task.operational_data.work_duration} hrs</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaintenanceDashboard;
