import { useState } from 'react';
import { useSupabaseMaintenance } from '../../context/SupabaseMaintenanceContext';
import { Plus, Eye, Trash2, CheckCircle } from '../Icons';
import MaintenanceTaskModal from './MaintenanceTaskModal';

const MaintenanceTasks = ({ userRole }) => {
  const { tasks, deleteTask } = useSupabaseMaintenance();
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [viewMode, setViewMode] = useState(false);

  const isAdmin = userRole === 'admin';

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter(t => t.status === filter);

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta tarea?')) {
      await deleteTask(id);
    }
  };

  const handleView = (task) => {
    setSelectedTask(task);
    setViewMode(true);
    setShowModal(true);
  };

  const handleEdit = (task) => {
    setSelectedTask(task);
    setViewMode(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTask(null);
    setViewMode(false);
  };

  return (
    <div>
      {/* Header with filters */}
      <div className="maintenance-section">
        <div className="maintenance-section__header">
          <h3 className="maintenance-section__title">Gestión de Tareas</h3>
          {isAdmin && (
            <button
              onClick={() => {
                setSelectedTask(null);
                setViewMode(false);
                setShowModal(true);
              }}
              className="maintenance-section__action"
            >
              <Plus size={18} />
              Nueva Tarea
            </button>
          )}
        </div>

        {/* Filters con degradados */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <button
            className={`maintenance-subtab ${filter === 'all' ? 'maintenance-subtab--active' : ''}`}
            onClick={() => setFilter('all')}
            style={{
              background: filter === 'all'
                ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)'
                : 'var(--color-secondary)',
              color: filter === 'all' ? 'white' : 'var(--color-text-secondary)',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: filter === 'all' ? '0 4px 12px rgba(61, 82, 41, 0.2)' : 'none'
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>{tasks.length}</div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>Todas las Tareas</div>
          </button>
          <button
            className={`maintenance-subtab ${filter === 'programada' ? 'maintenance-subtab--active' : ''}`}
            onClick={() => setFilter('programada')}
            style={{
              background: filter === 'programada'
                ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
                : 'var(--color-secondary)',
              color: filter === 'programada' ? 'white' : 'var(--color-text-secondary)',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: filter === 'programada' ? '0 4px 12px rgba(14, 165, 233, 0.2)' : 'none'
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
              {tasks.filter(t => t.status === 'programada').length}
            </div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>📅 Programadas</div>
          </button>
          <button
            className={`maintenance-subtab ${filter === 'en_proceso' ? 'maintenance-subtab--active' : ''}`}
            onClick={() => setFilter('en_proceso')}
            style={{
              background: filter === 'en_proceso'
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'var(--color-secondary)',
              color: filter === 'en_proceso' ? 'white' : 'var(--color-text-secondary)',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: filter === 'en_proceso' ? '0 4px 12px rgba(245, 158, 11, 0.2)' : 'none'
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
              {tasks.filter(t => t.status === 'en_proceso').length}
            </div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>⚙️ En Proceso</div>
          </button>
          <button
            className={`maintenance-subtab ${filter === 'completada' ? 'maintenance-subtab--active' : ''}`}
            onClick={() => setFilter('completada')}
            style={{
              background: filter === 'completada'
                ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-success) 100%)'
                : 'var(--color-secondary)',
              color: filter === 'completada' ? 'white' : 'var(--color-text-secondary)',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: filter === 'completada' ? '0 4px 12px rgba(61, 82, 41, 0.2)' : 'none'
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
              {tasks.filter(t => t.status === 'completada').length}
            </div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>✅ Completadas</div>
          </button>
        </div>

        {/* Tasks List */}
        {filteredTasks.length === 0 ? (
          <div className="maintenance-empty">
            <div className="maintenance-empty__icon">📋</div>
            <h4 className="maintenance-empty__title">No hay tareas</h4>
            <p className="maintenance-empty__description">
              {filter === 'all'
                ? 'No hay tareas de mantenimiento registradas'
                : `No hay tareas en estado "${filter}"`}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#999', textTransform: 'uppercase' }}>Tipo</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#999', textTransform: 'uppercase' }}>Fecha/Hora</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#999', textTransform: 'uppercase' }}>Observaciones</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#999', textTransform: 'uppercase' }}>Estado</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#999', textTransform: 'uppercase' }}>Datos Operativos</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#999', textTransform: 'uppercase' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px' }}>
                      <span className={`maintenance-task-item__badge maintenance-task-item__badge--${task.type}`}>
                        {task.type}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      <div style={{ fontWeight: '500' }}>{new Date(task.scheduled_date).toLocaleDateString('es-PA')}</div>
                      <div style={{ color: '#999', fontSize: '12px' }}>{task.scheduled_time}</div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', maxWidth: '300px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.observations}
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span className={`maintenance-task-item__status maintenance-task-item__status--${task.status}`}>
                        {task.status === 'programada' ? 'Programada' :
                         task.status === 'en_proceso' ? 'En Proceso' : 'Completada'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px' }}>
                      {task.operational_data ? (
                        <div>
                          <div>Vol: {task.operational_data.volume_discharged?.toLocaleString()} gal</div>
                          <div style={{ color: '#999' }}>Costo: B/. {task.operational_data.total_estimated_cost?.toFixed(2)}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#999' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleView(task)}
                          style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#007aff' }}
                          title="Ver detalles"
                        >
                          <Eye size={18} />
                        </button>
                        {isAdmin && (
                          <>
                            {task.status !== 'completada' && (
                              <button
                                onClick={() => handleEdit(task)}
                                style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#34c759' }}
                                title="Editar"
                              >
                                <CheckCircle size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(task.id)}
                              style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#ff3b30' }}
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

      {/* Modal */}
      {showModal && (
        <MaintenanceTaskModal
          task={selectedTask}
          viewMode={viewMode}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default MaintenanceTasks;
