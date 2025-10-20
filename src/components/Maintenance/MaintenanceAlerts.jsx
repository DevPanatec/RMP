import { useSupabaseMaintenance } from '../../context/SupabaseMaintenanceContext';
import { useSupabaseAuth } from '../../context/SupabaseAuthContext';
import { AlertTriangle, Clock, X, Wrench } from '../Icons';

const MaintenanceAlerts = ({ userRole }) => {
  const { user } = useSupabaseAuth();
  const { alerts, dismissAlert, tasks } = useSupabaseMaintenance();
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
      {/* Summary con gradientes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
          borderRadius: '16px',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(255, 59, 48, 0.15)'
        }}>
          <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '60px', opacity: '0.15' }}>🚨</div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '36px', fontWeight: '700', color: '#dc2626', marginBottom: '8px' }}>
              {activeAlerts.filter(a => a.severity === 'critical').length}
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>
              Críticas
            </div>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          borderRadius: '16px',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(255, 204, 0, 0.15)'
        }}>
          <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '60px', opacity: '0.15' }}>⚠️</div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '36px', fontWeight: '700', color: '#d97706', marginBottom: '8px' }}>
              {activeAlerts.filter(a => a.severity === 'warning').length}
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#92400e' }}>
              Advertencias
            </div>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
          borderRadius: '16px',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0, 122, 255, 0.15)'
        }}>
          <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '60px', opacity: '0.15' }}>ℹ️</div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '36px', fontWeight: '700', color: '#2563eb', marginBottom: '8px' }}>
              {activeAlerts.filter(a => a.severity === 'info').length}
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e3a8a' }}>
              Informativas
            </div>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {activeAlerts.length === 0 ? (
          <div className="maintenance-section">
            <div className="maintenance-empty">
              <div className="maintenance-empty__icon">
                <Clock size={32} />
              </div>
              <h3 className="maintenance-empty__title">No hay alertas activas</h3>
              <p className="maintenance-empty__description">
                Todas las alertas han sido atendidas o descartadas
              </p>
            </div>
          </div>
        ) : (
          activeAlerts.map((alert) => {
            const relatedTask = getRelatedTask(alert.task_id);
            const colors = getSeverityColor(alert.severity);

            const gradientBg = alert.severity === 'critical'
              ? 'linear-gradient(135deg, rgba(255, 59, 48, 0.08) 0%, rgba(255, 59, 48, 0.03) 100%)'
              : alert.severity === 'warning'
              ? 'linear-gradient(135deg, rgba(255, 204, 0, 0.08) 0%, rgba(255, 204, 0, 0.03) 100%)'
              : 'linear-gradient(135deg, rgba(0, 122, 255, 0.08) 0%, rgba(0, 122, 255, 0.03) 100%)';

            return (
              <div
                key={alert.id}
                style={{
                  border: `2px solid ${colors.border}`,
                  borderRadius: '16px',
                  padding: '20px',
                  background: gradientBg,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)'}
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <div style={{ flexShrink: 0, marginTop: '2px' }}>
                    {getSeverityIcon(alert.severity)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: colors.text }}>
                          {alert.message}
                        </p>

                        {relatedTask && (
                          <div style={{
                            marginTop: '12px',
                            padding: '12px',
                            background: 'white',
                            borderRadius: '8px',
                            fontSize: '13px'
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: '600', color: '#333' }}>Tarea:</span>
                                <span className={`maintenance-task-item__badge maintenance-task-item__badge--${relatedTask.type}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                                  {relatedTask.type}
                                </span>
                              </div>
                              <div style={{ color: '#666' }}>
                                <span style={{ fontWeight: '600', color: '#333' }}>Fecha:</span>{' '}
                                {new Date(relatedTask.scheduled_date).toLocaleDateString('es-PA')} {relatedTask.scheduled_time}
                              </div>
                              <div style={{ color: '#666' }}>
                                <span style={{ fontWeight: '600', color: '#333' }}>Observaciones:</span>{' '}
                                {relatedTask.observations}
                              </div>
                            </div>
                          </div>
                        )}

                        {alert.equipment_id && (
                          <div style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
                            <span style={{ fontWeight: '600', color: '#333' }}>Equipo:</span> {alert.equipment_id}
                          </div>
                        )}

                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>
                          Programada para: {new Date(alert.scheduled_date).toLocaleString('es-PA')}
                        </div>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => handleDismiss(alert.id)}
                          style={{
                            flexShrink: 0,
                            padding: '6px',
                            background: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: '#999',
                            transition: 'all 0.2s'
                          }}
                          title="Descartar alerta"
                        >
                          <X size={18} />
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
