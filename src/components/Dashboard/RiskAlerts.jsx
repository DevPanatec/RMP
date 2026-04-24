import { AlertTriangle, Truck, MapPin, Clock, Eye, CheckCircle, ChevronRight } from '../Icons';
import './RiskAlerts.css';

const PREVIEW_LIMIT = 4;

const RiskAlerts = ({ alerts = [], onViewDetails, onViewAll, newAlertIds }) => {
  const activeAlerts = [...alerts]
    .filter(alert => alert.estado !== 'resuelto' && alert.estado !== 'resolved')
    .sort((a, b) => {
      const priorityOrder = { alta: 3, high: 3, media: 2, medium: 2, baja: 1, low: 1 };
      const prioDiff = (priorityOrder[b.prioridad] || 0) - (priorityOrder[a.prioridad] || 0);
      if (prioDiff !== 0) return prioDiff;
      const ta = new Date(a.fecha_reporte || a.fechaCreacion || a._creationTime || 0).getTime();
      const tb = new Date(b.fecha_reporte || b.fechaCreacion || b._creationTime || 0).getTime();
      return tb - ta;
    });

  const sortedAlerts = activeAlerts.slice(0, PREVIEW_LIMIT);
  const hiddenCount = activeAlerts.length - sortedAlerts.length;

  if (sortedAlerts.length === 0) {
    return (
      <div className="risk-alerts">
        <div className="alerts-header">
          <h3><AlertTriangle strokeWidth={1.5} size={22} /> Alertas y Riesgos</h3>
          <span className="alerts-count safe">
            <span className="count-badge safe">0</span>
            Sin alertas activas
          </span>
        </div>
        <div className="no-alerts">
          <div className="no-alerts-icon"><CheckCircle strokeWidth={2} size={32} /></div>
          <p>Todo está funcionando correctamente</p>
          <span>No hay riesgos o alertas que requieran atención</span>
        </div>
      </div>
    );
  }

  const highPriorityCount = activeAlerts.filter(a =>
    a.prioridad === 'alta' || a.prioridad === 'high'
  ).length;

  return (
    <div className="risk-alerts">
      <div className="alerts-header">
        <h3><AlertTriangle strokeWidth={1.5} size={22} /> Alertas y Riesgos</h3>
        <span className={`alerts-count ${highPriorityCount > 0 ? 'danger' : 'warning'}`}>
          <span className={`count-badge ${highPriorityCount > 0 ? 'danger' : 'warning'}`}>
            {activeAlerts.length}
          </span>
          {activeAlerts.length === 1 ? 'Alerta activa' : 'Alertas activas'}
        </span>
      </div>

      <div className="alerts-grid">
        {sortedAlerts.map((alert, index) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onViewDetails={onViewDetails}
            delay={index * 100}
            isNew={newAlertIds?.has(alert._id || alert.id)}
          />
        ))}
      </div>

      {hiddenCount > 0 && onViewAll && (
        <button type="button" className="panel-view-all" onClick={onViewAll}>
          <span>Ver todas ({activeAlerts.length})</span>
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
};

const AlertCard = ({ alert, onViewDetails, delay, isNew }) => {
  const getPriorityClass = (prioridad) => {
    const priority = prioridad?.toLowerCase();
    if (priority === 'alta' || priority === 'high') return 'high';
    if (priority === 'media' || priority === 'medium') return 'medium';
    return 'low';
  };

  const getPriorityLabel = (prioridad) => {
    const priority = prioridad?.toLowerCase();
    if (priority === 'alta' || priority === 'high') return 'ALTA';
    if (priority === 'media' || priority === 'medium') return 'MEDIA';
    return 'BAJA';
  };

  const priorityClass = getPriorityClass(alert.prioridad);
  const priorityLabel = getPriorityLabel(alert.prioridad);

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Reciente';
    const date = new Date(timestamp);
    if (isNaN(date)) return 'Reciente';
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-PA', { day: '2-digit', month: 'short' });
  };

  return (
    <div className={`alert-risk-card priority-${priorityClass}${isNew ? ' alert-risk-card--new' : ''}`}>
      <div className="alert-risk-header">
        <div className={`priority-badge priority-${priorityClass}`}>
          <span>{priorityLabel}</span>
        </div>
        <div className="alert-time">
          <Clock size={14} />
          {formatTime(alert.fecha_reporte || alert.fechaCreacion || alert.fecha || alert.timestamp || alert.created_at || alert._creationTime)}
        </div>
      </div>

      <div className="alert-risk-body">
        <h4>{alert.titulo || alert.title || 'Alerta de Riesgo'}</h4>
        <p className="alert-description">
          {alert.descripcion || alert.description || 'Sin descripción disponible'}
        </p>

        <div className="alert-details">
          {(alert.camion || alert.vehiculo || alert.vehicle) && (
            <div className="detail-item">
              <Truck size={16} />
              <span>
                {alert.camion || alert.vehiculo || alert.vehicle}
              </span>
            </div>
          )}
          
          {alert.ubicacion && (
            <div className="detail-item">
              <MapPin size={16} />
              <span>{alert.ubicacion}</span>
            </div>
          )}

          {alert.tipo && (
            <div className="detail-item type">
              <span className="type-label">Tipo:</span>
              <span className="type-value">{alert.tipo}</span>
            </div>
          )}
        </div>
      </div>

      {onViewDetails && (
        <div className="alert-risk-footer">
          <button 
            className="view-details-btn"
            onClick={() => onViewDetails(alert)}
          >
            <Eye size={16} />
            Ver Detalles
          </button>
        </div>
      )}
    </div>
  );
};

export default RiskAlerts;
