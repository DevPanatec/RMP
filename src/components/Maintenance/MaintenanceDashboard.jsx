import { useMaintenance } from '../../context/MaintenanceContext';
import { Calendar, Clock, CheckCircle, AlertTriangle, Wrench, TrendingUp } from '../Icons';

const MaintenanceDashboard = ({ userRole }) => {
  const { tasks, getUpcomingTasks, getTasksByStatus, getOperationalStats } = useMaintenance();

  const upcomingTasks = getUpcomingTasks(7);
  const completedTasks = getTasksByStatus('completada');
  const stats = getOperationalStats();

  const now = new Date();

  // Formatear fecha de forma legible
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

  // Obtener color de tipo
  const getTipoColor = (tipo) => {
    switch (tipo) {
      case 'preventivo': return 'var(--color-primary)';
      case 'correctivo': return 'var(--color-warning)';
      case 'inspección': return 'var(--color-info)';
      default: return 'var(--color-text-secondary)';
    }
  };

  // Obtener label de tipo
  const getTipoLabel = (tipo) => {
    switch (tipo) {
      case 'preventivo': return 'Preventivo';
      case 'correctivo': return 'Correctivo';
      case 'inspección': return 'Inspección';
      default: return tipo || 'General';
    }
  };

  return (
    <div>
      {/* Stats Cards - Fluent Design */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-16)',
        marginBottom: 'var(--space-24)'
      }}>
        {/* Total Tareas */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-16)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)', marginBottom: 'var(--space-12)' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'var(--color-primary)',
              borderRadius: 'var(--radius-base)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Wrench size={20} style={{ color: 'white' }} />
            </div>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Tareas
            </span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>
            {stats.total}
          </div>
        </div>

        {/* Pendientes */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-16)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)', marginBottom: 'var(--space-12)' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'var(--color-warning)',
              borderRadius: 'var(--radius-base)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={20} style={{ color: 'white' }} />
            </div>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Pendientes
            </span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>
            {stats.pendiente}
          </div>
        </div>

        {/* Completadas */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-16)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)', marginBottom: 'var(--space-12)' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'var(--color-success)',
              borderRadius: 'var(--radius-base)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle size={20} style={{ color: 'white' }} />
            </div>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Completadas
            </span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>
            {stats.completed}
          </div>
        </div>

        {/* Costo Total */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-16)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)', marginBottom: 'var(--space-12)' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'var(--color-info)',
              borderRadius: 'var(--radius-base)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={20} style={{ color: 'white' }} />
            </div>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Costo Total
            </span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>
            B/. {stats.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-24)' }}>

        {/* Próximos Mantenimientos */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: 'var(--space-16) var(--space-20)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-12)'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'var(--color-primary)',
              borderRadius: 'var(--radius-base)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calendar size={18} style={{ color: 'white' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>
                Próximos Mantenimientos
              </h3>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                Próximos 7 días
              </p>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: 'var(--space-12)' }}>
            {upcomingTasks.length === 0 ? (
              <div style={{ padding: 'var(--space-32)', textAlign: 'center' }}>
                <Calendar size={48} style={{ color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-12)' }} />
                <p style={{ margin: 0, fontSize: 'var(--font-size-base)', color: 'var(--color-text-secondary)' }}>
                  No hay mantenimientos programados
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
                {upcomingTasks.slice(0, 5).map((task) => {
                  const taskDate = task.fecha_programada ? new Date(task.fecha_programada) : new Date();
                  const daysUntil = Math.ceil((taskDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const urgencyColor = daysUntil <= 1 ? '#dc2626' : daysUntil <= 3 ? '#d97706' : 'var(--color-primary)';

                  return (
                    <div
                      key={task._id}
                      style={{
                        padding: 'var(--space-12) var(--space-16)',
                        background: 'var(--color-background)',
                        borderRadius: 'var(--radius-base)',
                        borderLeft: `3px solid ${urgencyColor}`,
                        transition: 'background var(--duration-fast) var(--ease-out)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-hover-overlay)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-background)'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-12)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', marginBottom: 'var(--space-4)' }}>
                            <span style={{
                              fontSize: 'var(--font-size-xs)',
                              fontWeight: 'var(--font-weight-semibold)',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--color-primary-light)',
                              color: 'var(--color-primary)',
                              textTransform: 'uppercase'
                            }}>
                              {getTipoLabel(task.tipo)}
                            </span>
                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                              {formatDate(task.fecha_programada)}
                            </span>
                          </div>
                          <p style={{
                            margin: 0,
                            fontSize: 'var(--font-size-base)',
                            color: 'var(--color-text)',
                            fontWeight: 'var(--font-weight-medium)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {task.titulo || 'Tarea de mantenimiento'}
                          </p>
                        </div>
                        <div style={{
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 'var(--font-weight-semibold)',
                          color: urgencyColor,
                          padding: '4px 10px',
                          background: `${urgencyColor}10`,
                          borderRadius: 'var(--radius-base)',
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
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: 'var(--space-16) var(--space-20)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-12)'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'var(--color-success)',
              borderRadius: 'var(--radius-base)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle size={18} style={{ color: 'white' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>
                Completados Recientes
              </h3>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                Últimos 5 mantenimientos
              </p>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: 'var(--space-12)' }}>
            {completedTasks.length === 0 ? (
              <div style={{ padding: 'var(--space-32)', textAlign: 'center' }}>
                <CheckCircle size={48} style={{ color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-12)' }} />
                <p style={{ margin: 0, fontSize: 'var(--font-size-base)', color: 'var(--color-text-secondary)' }}>
                  No hay mantenimientos completados
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
                {completedTasks.slice(0, 5).map((task) => (
                  <div
                    key={task._id}
                    style={{
                      padding: 'var(--space-12) var(--space-16)',
                      background: 'var(--color-background)',
                      borderRadius: 'var(--radius-base)',
                      borderLeft: '3px solid var(--color-success)',
                      transition: 'background var(--duration-fast) var(--ease-out)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-hover-overlay)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-background)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-12)', marginBottom: 'var(--space-8)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', marginBottom: 'var(--space-4)' }}>
                          <span style={{
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 'var(--font-weight-semibold)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--color-success-light)',
                            color: 'var(--color-success)',
                            textTransform: 'uppercase'
                          }}>
                            {getTipoLabel(task.tipo)}
                          </span>
                          <span style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <CheckCircle size={12} style={{ color: 'var(--color-success)' }} />
                            {formatDate(task.fecha_completada)}
                          </span>
                        </div>
                        <p style={{
                          margin: 0,
                          fontSize: 'var(--font-size-base)',
                          color: 'var(--color-text)',
                          fontWeight: 'var(--font-weight-medium)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {task.titulo || 'Tarea de mantenimiento'}
                        </p>
                      </div>
                    </div>

                    {/* Info adicional */}
                    {(task.costo || task.mecanico) && (
                      <div style={{
                        display: 'flex',
                        gap: 'var(--space-16)',
                        fontSize: 'var(--font-size-sm)',
                        padding: 'var(--space-8) var(--space-12)',
                        background: 'var(--color-surface)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)'
                      }}>
                        {task.costo > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <TrendingUp size={14} style={{ color: 'var(--color-info)' }} />
                            <span style={{ color: 'var(--color-text)', fontWeight: 'var(--font-weight-semibold)' }}>
                              B/. {task.costo.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {task.mecanico && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
