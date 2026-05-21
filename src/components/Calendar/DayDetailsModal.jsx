import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Filter } from '../Icons';
import { Modal } from '../UI';
import { useOrganization } from '../../context/OrganizationContext';
import ActivityIcon from './ActivityIcon';

const DayDetailsModal = ({ date, activities, onClose, filters, onFilterChange }) => {
  const { hasModulo } = useOrganization();
  const [localFilters, setLocalFilters] = useState(filters);

  // Sync con parent filters cuando se reabra el modal o cambien los filtros del padre.
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, date]);

  const getDayName = (date) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
  };

  const getMonthName = (date) => {
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return months[date.getMonth()];
  };

  const toggleLocalFilter = (filterName) => {
    setLocalFilters(prev => ({
      ...prev,
      [filterName]: !prev[filterName]
    }));
  };

  const filteredActivities = activities.filter(activity => {
    if (activity.type === 'recoleccion') return localFilters.recoleccion;
    if (activity.type === 'fumigacion') return localFilters.fumigacion;
    if (activity.type === 'limpieza') return localFilters.limpieza;
    if (activity.type === 'mantenimiento') return localFilters.mantenimiento;
    return true;
  });

  const getActivityTypeName = (type) => {
    switch (type) {
      case 'recoleccion':
        return 'Recolección';
      case 'fumigacion':
        return 'Fumigación';
      case 'limpieza':
        return 'Limpieza';
      case 'mantenimiento':
        return 'Mantenimiento';
      default:
        return 'Actividad';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'programada':
        return 'status-programada';
      case 'en_progreso':
        return 'status-en-progreso';
      case 'completado':
        return 'status-completado';
      case 'pendiente':
        return 'status-pendiente';
      case 'cancelada':
        return 'status-cancelada';
      default:
        return 'status-default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'programada':
        return 'Programada';
      case 'en_progreso':
        return 'En Progreso';
      case 'completado':
        return 'Completado';
      case 'pendiente':
        return 'Pendiente';
      case 'cancelada':
        return 'Cancelada';
      default:
        return status;
    }
  };

  return (
    <Modal open onClose={onClose} size="lg" variant="detail" className="day-details-modal">
      <Modal.Header icon={<CalendarIcon size={18} />} onClose={onClose} id="day-details-title">
        {getDayName(date)}, {date.getDate()} de {getMonthName(date)} {date.getFullYear()}
        <span className="day-details-modal__count">
          · {activities.length} actividad{activities.length !== 1 ? 'es' : ''}
        </span>
      </Modal.Header>

      <div className="modal-filters">
          <div className="filters-label">
            <Filter size={16} /> Filtrar:
          </div>
          <div className="filter-buttons-inline">
            {hasModulo('REC') && (
              <button
                className={`filter-btn-sm ${localFilters.recoleccion ? 'active' : ''}`}
                onClick={() => toggleLocalFilter('recoleccion')}
              >
                🚛 Recolección
              </button>
            )}
            {hasModulo('FUM') && (
              <button
                className={`filter-btn-sm ${localFilters.fumigacion ? 'active' : ''}`}
                onClick={() => toggleLocalFilter('fumigacion')}
              >
                🦟 Fumigación
              </button>
            )}
            {hasModulo('LIM') && (
              <button
                className={`filter-btn-sm ${localFilters.limpieza ? 'active' : ''}`}
                onClick={() => toggleLocalFilter('limpieza')}
              >
                🧹 Limpieza
              </button>
            )}
            {hasModulo('MTO') && (
              <button
                className={`filter-btn-sm ${localFilters.mantenimiento ? 'active' : ''}`}
                onClick={() => toggleLocalFilter('mantenimiento')}
              >
                🔧 Mantenimiento
              </button>
            )}
          </div>
        </div>

      <Modal.Body className="day-details-body">
          {filteredActivities.length === 0 ? (
            <div className="no-activities-modal">
              <p>No hay actividades que coincidan con los filtros seleccionados</p>
            </div>
          ) : (
            <div className="activities-list">
              {filteredActivities.map(activity => (
                <div key={activity.id} className="activity-detail-card">
                  <div className="activity-detail-header">
                    <div className="activity-icon-time">
                      <ActivityIcon activity={activity} size="lg" />
                      <span className="activity-time-text">{activity.time}</span>
                    </div>
                    <div className="activity-badges">
                      <span className="activity-type-badge-modal">
                        {getActivityTypeName(activity.type)}
                      </span>
                      <span className={`status-badge ${getStatusBadgeClass(activity.status)}`}>
                        {getStatusLabel(activity.status)}
                      </span>
                    </div>
                  </div>
                  <div className="activity-detail-body">
                    <h4 className="activity-detail-title">{activity.title}</h4>
                    {activity.data.descripcion && (
                      <p className="activity-detail-description">{activity.data.descripcion}</p>
                    )}
                    <div className="activity-detail-meta">
                      {activity.data.conductor_nombre && (
                        <div className="meta-item">
                          <span className="meta-label">Conductor:</span>
                          <span className="meta-value">{activity.data.conductor_nombre}</span>
                        </div>
                      )}
                      {activity.data.vehiculo && (
                        <div className="meta-item">
                          <span className="meta-label">Vehículo:</span>
                          <span className="meta-value">{activity.data.vehiculo.placa}</span>
                        </div>
                      )}
                      {activity.data.paradas && activity.data.paradas.length > 0 && (
                        <div className="meta-item">
                          <span className="meta-label">Paradas:</span>
                          <span className="meta-value">{activity.data.paradas.length}</span>
                        </div>
                      )}
                      {activity.data.notas && (
                        <div className="meta-item full-width">
                          <span className="meta-label">Notas:</span>
                          <span className="meta-value">{activity.data.notas}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </Modal.Body>

      <Modal.Footer>
        <button type="button" className="btn btn--outline" onClick={onClose} data-autofocus>
          Cerrar
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default DayDetailsModal;
