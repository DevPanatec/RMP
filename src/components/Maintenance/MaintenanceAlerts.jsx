import { useMaintenance } from '../../context/MaintenanceContext';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, Clock, X, Wrench } from '../Icons';

const MaintenanceAlerts = ({ userRole }) => {
  const { user } = useAuth();
  const { alerts, dismissAlert, tasks } = useMaintenance();
  const isAdmin = userRole === 'admin' || user?.tipo === 'admin';

  const activeAlerts = alerts.filter(a => a.status === 'active');

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return { bg: 'rgba(255, 59, 48, 0.05)', border: 'rgba(255, 59, 48, 0.2)', text: '#ff3b30' };
      case 'warning':
        return { bg: 'rgba(255, 204, 0, 0.05)', border: 'rgba(255, 204, 0, 0.2)', text: '#ffcc00' };
      case 'info':
        return { bg: 'rgba(0, 122, 255, 0.05)', border: 'rgba(0, 122, 255, 0.2)', text: '#007aff' };
      default:
        return { bg: 'rgba(0, 0, 0, 0.02)', border: 'rgba(0, 0, 0, 0.1)', text: '#666' };
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle size={20} style={{ color: '#ff3b30' }} />;
      case 'warning':
        return <AlertTriangle size={20} style={{ color: '#ffcc00' }} />;
      case 'info':
        return <Clock size={20} style={{ color: '#007aff' }} />;
      default:
        return <Wrench size={20} style={{ color: '#666' }} />;
    }
  };

  const getRelatedTask = (taskId) => {
    if (!taskId) return null;
    return tasks.find(t => t.id === taskId);
  };

  const handleDismiss = async (alertId) => {
    if (isAdmin) {
      await dismissAlert(alertId);
    }
  };

  return (
    <div>
      {/* Summary - Diseño delgado con divisiones */}
      <div style={{
        background: 'var(--color-primary)',
        borderRadius: '16px',
        padding: '20px 0',
        marginBottom: '32px',
        boxShadow: '0 4px 16px var(--shadow-sm)',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)'
      }}>
        {/* Críticas */}
        <div style={{
          padding: '0 32px',
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
              Críticas
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'white', lineHeight: 1, marginBottom: '2px' }}>
              {activeAlerts.filter(a => a.severity === 'critical').length}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.65)' }}>
              requieren atención inmediata
            </div>
          </div>
        </div>

        {/* Advertencias */}
        <div style={{
          padding: '0 32px',
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
              Advertencias
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'white', lineHeight: 1, marginBottom: '2px' }}>
              {activeAlerts.filter(a => a.severity === 'warning').length}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.65)' }}>
              pendientes de revisión
            </div>
          </div>
        </div>

        {/* Informativas */}
        <div style={{
          padding: '0 32px',
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
              Informativas
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'white', lineHeight: 1, marginBottom: '2px' }}>
              {activeAlerts.filter(a => a.severity === 'info').length}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.65)' }}>
              notificaciones generales
            </div>
          </div>
        </div>
      </div>

      {/* Alerts List - Diseño Limpio */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {activeAlerts.length === 0 ? (
          <div style={{
            background: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '16px',
            padding: '60px 20px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 16px',
              borderRadius: '20px',
              background: 'var(--color-background-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={40} style={{ color: '#9ca3af' }} />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#374151' }}>
              No hay alertas activas
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>
              Todas las alertas han sido atendidas o descartadas
            </p>
          </div>
        ) : (
          activeAlerts.map((alert) => {
            const relatedTask = getRelatedTask(alert.task_id);

            const severityConfig = {
              critical: {
                bg: 'var(--color-surface)',
                border: '#dcfce7',
                borderLeft: 'var(--color-primary)',
                iconBg: 'var(--color-primary)',
                iconColor: 'white',
                titleColor: '#1f2937'
              },
              warning: {
                bg: 'var(--color-surface)',
                border: '#dcfce7',
                borderLeft: 'var(--color-primary)',
                iconBg: 'var(--color-primary)',
                iconColor: 'white',
                titleColor: '#1f2937'
              },
              info: {
                bg: 'var(--color-surface)',
                border: '#dcfce7',
                borderLeft: 'var(--color-primary)',
                iconBg: 'var(--color-primary)',
                iconColor: 'white',
                titleColor: '#1f2937'
              }
            };

            const config = severityConfig[alert.severity] || severityConfig.info;

            return (
              <div
                key={alert.id}
                style={{
                  background: config.bg,
                  border: `2px solid ${config.border}`,
                  borderLeft: `4px solid ${config.borderLeft}`,
                  borderRadius: '16px',
                  padding: '20px 24px',
                  transition: 'all 0.2s ease',
                  cursor: 'default',
                  boxShadow: '0 4px 16px var(--shadow-xs)'
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
                <div style={{ display: 'flex', alignItems: 'start', gap: '14px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: config.iconBg,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px var(--shadow-sm)'
                  }}>
                    {alert.severity === 'critical' ? (
                      <AlertTriangle size={20} style={{ color: config.iconColor }} />
                    ) : alert.severity === 'warning' ? (
                      <AlertTriangle size={20} style={{ color: config.iconColor }} />
                    ) : (
                      <Clock size={20} style={{ color: config.iconColor }} />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: '600', color: config.titleColor, lineHeight: '1.4' }}>
                          {alert.message}
                        </h4>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                          {relatedTask && (
                            <>
                              <span className={`maintenance-task-item__badge maintenance-task-item__badge--${relatedTask.type}`} style={{ fontSize: '11px', padding: '4px 10px' }}>
                                {relatedTask.type}
                              </span>
                              <span>•</span>
                              <span>{new Date(relatedTask.scheduled_date).toLocaleDateString('es-PA')} {relatedTask.scheduled_time}</span>
                            </>
                          )}
                          {!relatedTask && (
                            <span>{new Date(alert.scheduled_date).toLocaleDateString('es-PA')}</span>
                          )}
                          {alert.equipment_id && (
                            <>
                              <span>•</span>
                              <span>Equipo: {alert.equipment_id}</span>
                            </>
                          )}
                        </div>

                        {relatedTask?.observations && (
                          <div style={{ marginTop: '10px', fontSize: '13px', color: '#4b5563', padding: '10px', background: '#f9fafb', borderRadius: '8px' }}>
                            {relatedTask.observations}
                          </div>
                        )}
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => handleDismiss(alert.id)}
                          style={{
                            flexShrink: 0,
                            width: '32px',
                            height: '32px',
                            padding: '0',
                            background: '#f3f4f6',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            color: '#6b7280',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#ef4444';
                            e.currentTarget.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#f3f4f6';
                            e.currentTarget.style.color = '#6b7280';
                          }}
                          title="Descartar alerta"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Info Message for non-admin */}
      {!isAdmin && activeAlerts.length > 0 && (
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(0, 122, 255, 0.05)',
          border: '1px solid rgba(0, 122, 255, 0.2)',
          borderRadius: '12px'
        }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#007aff' }}>
            Solo los administradores pueden descartar alertas. Contacta con un administrador si necesitas atención inmediata.
          </p>
        </div>
      )}
    </div>
  );
};

export default MaintenanceAlerts;
