import { useState } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { Plus, Eye, Trash2, CheckCircle, Calendar, Clock, Edit, FileText } from '../Icons';

const MaintenanceTasks = ({ userRole, isAdmin: isAdminProp, onCreate, onView, onEdit }) => {
  const { tasks, deleteTask } = useMaintenance();
  const [filter, setFilter] = useState('all');

  // Backwards-compat: si el parent no pasa isAdmin, derivarlo aquí
  const isAdmin = typeof isAdminProp === 'boolean'
    ? isAdminProp
    : (userRole === 'admin' || userRole === 'super_admin');

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter(t => t.estado === filter);

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta tarea?')) {
      await deleteTask(id);
    }
  };

  const handleView = (task) => {
    if (onView) onView(task);
  };

  const handleEdit = (task) => {
    if (onEdit) onEdit(task);
  };

  const handleCreate = () => {
    if (onCreate) onCreate();
  };

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

  const getEstadoStyle = (estado) => {
    switch (estado) {
      case 'completada':
        return {
          background: 'var(--color-success-light)',
          color: 'var(--color-success)',
          border: '1px solid var(--color-success)'
        };
      case 'pendiente':
        return {
          background: 'var(--color-warning-light)',
          color: 'var(--color-warning-dark, #92400e)',
          border: '1px solid var(--color-warning)'
        };
      case 'en_progreso':
        return {
          background: 'var(--color-info-light)',
          color: 'var(--color-info)',
          border: '1px solid var(--color-info)'
        };
      case 'cancelada':
        return {
          background: 'var(--color-error-light)',
          color: 'var(--color-error)',
          border: '1px solid var(--color-error)'
        };
      default:
        return {
          background: 'var(--color-background)',
          color: 'var(--color-text-secondary)',
          border: '1px solid var(--color-border)'
        };
    }
  };

  const getEstadoLabel = (estado) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'en_progreso': return 'En Progreso';
      case 'completada': return 'Completada';
      case 'cancelada': return 'Cancelada';
      default: return estado;
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

  const counts = {
    all: tasks.length,
    pendiente: tasks.filter(t => t.estado === 'pendiente').length,
    en_progreso: tasks.filter(t => t.estado === 'en_progreso').length,
    completada: tasks.filter(t => t.estado === 'completada').length
  };

  return (
    <div>
      <div className="maint-tasks-wrapper">
        {/* Header */}
        <div className="maint-tasks-header">
          <h3 className="maint-tasks-title">Gestión de Tareas</h3>
          {isAdmin && (
            <button
              onClick={handleCreate}
              className="maint-tasks-add-btn"
            >
              <Plus size={18} />
              Nueva Tarea
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="maint-tasks-filters">
          {[
            { id: 'all', label: 'Todas', icon: FileText, count: counts.all },
            { id: 'pendiente', label: 'Pendientes', icon: Clock, count: counts.pendiente },
            { id: 'en_progreso', label: 'En Progreso', icon: Calendar, count: counts.en_progreso },
            { id: 'completada', label: 'Completadas', icon: CheckCircle, count: counts.completada }
          ].map((filterOption) => {
            const Icon = filterOption.icon;
            const isActive = filter === filterOption.id;
            return (
              <button
                key={filterOption.id}
                onClick={() => setFilter(filterOption.id)}
                className={`maint-tasks-filter-btn ${isActive ? 'maint-tasks-filter-btn--active' : ''}`}
              >
                <Icon size={16} />
                <span>{filterOption.label}</span>
                <span className="maint-tasks-filter-count">
                  {filterOption.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Task List */}
        <div className="maint-tasks-content">
          {filteredTasks.length === 0 ? (
            <div className="maint-tasks-empty">
              <FileText size={48} style={{ color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-12)' }} />
              <h4 style={{ margin: '0 0 var(--space-4) 0', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>
                No hay tareas
              </h4>
              <p style={{ margin: 0, fontSize: 'var(--font-size-base)', color: 'var(--color-text-secondary)' }}>
                {filter === 'all'
                  ? 'No hay tareas de mantenimiento registradas'
                  : `No hay tareas en estado "${getEstadoLabel(filter)}"`}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="maint-tasks-table">
                <thead>
                  <tr>
                    <th className="maint-tasks-th">Tipo</th>
                    <th className="maint-tasks-th">Título</th>
                    <th className="maint-tasks-th">Fecha</th>
                    <th className="maint-tasks-th">Estado</th>
                    <th className="maint-tasks-th">Costo</th>
                    <th className="maint-tasks-th maint-tasks-th--right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr key={task._id} className="maint-tasks-row">
                      <td className="maint-tasks-td">
                        <span className="maint-dash-type-badge">
                          {getTipoLabel(task.tipo)}
                        </span>
                      </td>
                      <td className="maint-tasks-td maint-tasks-td--title">
                        <div className="maint-tasks-task-title">
                          {task.titulo || 'Sin título'}
                        </div>
                        {task.descripcion && (
                          <div className="maint-tasks-task-desc">
                            {task.descripcion}
                          </div>
                        )}
                      </td>
                      <td className="maint-tasks-td maint-tasks-td--date">
                        {formatDate(task.fecha_programada)}
                      </td>
                      <td className="maint-tasks-td">
                        <span className="maint-tasks-estado-badge" style={getEstadoStyle(task.estado)}>
                          {getEstadoLabel(task.estado)}
                        </span>
                      </td>
                      <td className="maint-tasks-td" style={{ fontSize: 'var(--font-size-sm)' }}>
                        {task.costo ? (
                          <div>
                            <div className="maint-tasks-cost-value">
                              B/. {task.costo.toFixed(2)}
                            </div>
                            {task.mecanico && (
                              <div className="maint-tasks-cost-mechanic">
                                {task.mecanico}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-text-tertiary)' }}>-</span>
                        )}
                      </td>
                      <td className="maint-tasks-td">
                        <div className="maint-tasks-actions">
                          <button
                            onClick={() => handleView(task)}
                            className="maint-tasks-action-btn maint-tasks-action-btn--view"
                            title="Ver detalles"
                          >
                            <Eye size={18} />
                          </button>
                          {isAdmin && (
                            <>
                              {task.estado !== 'completada' && (
                                <button
                                  onClick={() => handleEdit(task)}
                                  className="maint-tasks-action-btn maint-tasks-action-btn--edit"
                                  title="Editar"
                                >
                                  <Edit size={18} />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(task._id)}
                                className="maint-tasks-action-btn maint-tasks-action-btn--delete"
                                title="Eliminar"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaintenanceTasks;
