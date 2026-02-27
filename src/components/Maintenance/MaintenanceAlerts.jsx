import { useMaintenance } from '../../context/MaintenanceContext';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, Clock, X, Wrench } from '../Icons';

const MaintenanceAlerts = ({ userRole }) => {
  const { user } = useAuth();
  const { alerts, dismissAlert, tasks } = useMaintenance();
  const isAdmin = userRole === 'admin' || user?.tipo === 'admin';

  const activeAlerts = alerts.filter(a => !a.leida);

  const getSeverityIcon = (severidad) => {
    switch (severidad) {
      case 'error':
        return <AlertTriangle size={20} />;
      case 'warning':
        return <AlertTriangle size={20} />;
      case 'info':
        return <Clock size={20} />;
      default:
        return <Wrench size={20} />;
    }
  };

  const getRelatedTask = (taskId) => {
    if (!taskId) return null;
    return tasks.find(t => t._id === taskId);
  };

  const handleDismiss = async (alertId) => {
    if (isAdmin) {
      await dismissAlert(alertId);
    }
  };

  return (
    <div>
      {/* Summary */}
      <div className="maint-alerts-summary">
        <div className="maint-alerts-summary__cell maint-alerts-summary__cell--bordered">
          <div className="maint-alerts-summary__icon">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="maint-alerts-summary__label">Críticas</div>
            <div className="maint-alerts-summary__value">
              {activeAlerts.filter(a => a.severidad === 'error').length}
            </div>
            <div className="maint-alerts-summary__desc">requieren atención inmediata</div>
          </div>
        </div>

        <div className="maint-alerts-summary__cell maint-alerts-summary__cell--bordered">
          <div className="maint-alerts-summary__icon">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="maint-alerts-summary__label">Advertencias</div>
            <div className="maint-alerts-summary__value">
              {activeAlerts.filter(a => a.severidad === 'warning').length}
            </div>
            <div className="maint-alerts-summary__desc">pendientes de revisión</div>
          </div>
        </div>

        <div className="maint-alerts-summary__cell">
          <div className="maint-alerts-summary__icon">
            <Clock size={24} />
          </div>
          <div>
            <div className="maint-alerts-summary__label">Informativas</div>
            <div className="maint-alerts-summary__value">
              {activeAlerts.filter(a => a.severidad === 'info').length}
            </div>
            <div className="maint-alerts-summary__desc">notificaciones generales</div>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="maint-alerts-list">
        {activeAlerts.length === 0 ? (
          <div className="maint-alerts-empty">
            <div className="maint-alerts-empty__icon-wrap">
              <Clock size={40} style={{ color: 'var(--color-text-secondary)' }} />
            </div>
            <h3 className="maint-alerts-empty__title">No hay alertas activas</h3>
            <p className="maint-alerts-empty__desc">
              Todas las alertas han sido atendidas o descartadas
            </p>
          </div>
        ) : (
          activeAlerts.map((alert) => {
            const relatedTask = getRelatedTask(alert.task_id);

            return (
              <div key={alert._id} className="maint-alert-card">
                <div className="maint-alert-card__layout">
                  <div className="maint-alert-card__icon">
                    {getSeverityIcon(alert.severidad)}
                  </div>

                  <div className="maint-alert-card__body">
                    <div className="maint-alert-card__header">
                      <div style={{ flex: 1 }}>
                        <h4 className="maint-alert-card__title">
                          {alert.mensaje}
                        </h4>

                        <div className="maint-alert-card__meta">
                          {relatedTask && (
                            <>
                              <span className={`maintenance-task-item__badge maintenance-task-item__badge--${relatedTask.tipo}`} style={{ fontSize: '11px', padding: '4px 10px' }}>
                                {relatedTask.tipo}
                              </span>
                              <span>•</span>
                              <span>{relatedTask.fecha_programada ? new Date(relatedTask.fecha_programada).toLocaleDateString('es-PA') : ''}</span>
                            </>
                          )}
                          {!relatedTask && alert.fecha_generada && (
                            <span>{new Date(alert.fecha_generada).toLocaleDateString('es-PA')}</span>
                          )}
                          {alert.vehiculo_id && (
                            <>
                              <span>•</span>
                              <span>Vehículo asignado</span>
                            </>
                          )}
                        </div>

                        {relatedTask?.notas && (
                          <div className="maint-alert-card__observations">
                            {relatedTask.notas}
                          </div>
                        )}
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => handleDismiss(alert._id)}
                          className="maint-alert-dismiss"
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
        <div className="maint-alerts-info">
          <p className="maint-alerts-info__text">
            Solo los administradores pueden descartar alertas. Contacta con un administrador si necesitas atención inmediata.
          </p>
        </div>
      )}
    </div>
  );
};

export default MaintenanceAlerts;
