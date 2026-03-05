import { AlertTriangle, Truck, MapPin, Clock, Eye, CheckCircle } from '../Icons';
import './RiskAlerts.css';

const RiskAlerts = ({ alerts = [], onViewDetails, newAlertIds }) => {
  const sortedAlerts = [...alerts]
    .filter(alert => alert.estado !== 'resuelto' && alert.estado !== 'resolved')
    .sort((a, b) => {
      const priorityOrder = { alta: 3, high: 3, media: 2, medium: 2, baja: 1, low: 1 };
      return (priorityOrder[b.prioridad] || 0) - (priorityOrder[a.prioridad] || 0);
    })
    .slice(0, 6);

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

  const highPriorityCount = sortedAlerts.filter(a => 
    a.prioridad === 'alta' || a.prioridad === 'high'
  ).length;

  return (
    <div className="risk-alerts">
      <div className="alerts-header">
        <h3><AlertTriangle strokeWidth={1.5} size={22} /> Alertas y Riesgos</h3>
        <span className={`alerts-count ${highPriorityCount > 0 ? 'danger' : 'warning'}`}>
          <span className={`count-badge ${highPriorityCount > 0 ? 'danger' : 'warning'}`}>
            {sortedAlerts.length}
          </span>
          {sortedAlerts.length === 1 ? 'Alerta activa' : 'Alertas activas'}
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
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`alert-risk-card priority-${priorityClass}${isNew ? ' alert-risk-card--new' : ''}`}>
      <div className="alert-risk-header">
        <div className={`priority-badge priority-${priorityClass}`}>
          <span>{priorityLabel}</span>
        </div>
        <div className="alert-time">
          <Clock size={14} />
          {formatTime(alert.fecha || alert.timestamp || alert.created_at)}
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
