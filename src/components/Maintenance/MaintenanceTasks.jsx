import { useState } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { Plus, Eye, Trash2, CheckCircle, Calendar, Wrench, FileText } from '../Icons';
import MaintenanceTaskModal from './MaintenanceTaskModal';

const MaintenanceTasks = ({ userRole }) => {
  const { tasks, deleteTask } = useMaintenance();
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [viewMode, setViewMode] = useState(false);

  const isAdmin = userRole === 'admin';

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter(t => t.estado === filter);

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
    // Enterprise siempre en viewMode
    setViewMode(isAdmin ? false : true);
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
            className={`maintenance-subtab ${filter === 'pendiente' ? 'maintenance-subtab--active' : ''}`}
            onClick={() => setFilter('pendiente')}
            style={{
              background: filter === 'pendiente'
                ? 'linear-gradient(135deg, #3D5229 0%, #556B2F 100%)'
                : 'var(--color-secondary)',
              color: filter === 'pendiente' ? 'white' : 'var(--color-text-secondary)',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: filter === 'pendiente' ? '0 4px 12px rgba(61, 82, 41, 0.3)' : 'none'
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
              {tasks.filter(t => t.estado === 'pendiente').length}
            </div>
            <div style={{ fontSize: '13px', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
              <Calendar size={14} />
              <span>Pendientes</span>
            </div>
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
              {tasks.filter(t => t.estado === 'completada').length}
            </div>
            <div style={{ fontSize: '13px', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
              <CheckCircle size={14} />
              <span>Completadas</span>
            </div>
          </button>
        </div>

        {/* Tasks List */}
        {filteredTasks.length === 0 ? (
          <div className="maintenance-empty">
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
              <FileText size={40} style={{ color: '#9ca3af' }} />
            </div>
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
                  <tr key={task._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px' }}>
                      <span className={`maintenance-task-item__badge maintenance-task-item__badge--${task.tipo}`}>
                        {task.tipo}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      <div style={{ fontWeight: '500' }}>
                        {task.fecha_programada ? new Date(task.fecha_programada).toLocaleDateString('es-PA') : '-'}
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', maxWidth: '300px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.titulo}
                      </div>
                      {task.descripcion && (
                        <div style={{ color: '#999', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.descripcion}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span className={`maintenance-task-item__status maintenance-task-item__status--${task.estado}`}>
                        {task.estado === 'pendiente' ? 'Pendiente' :
                         task.estado === 'en_progreso' ? 'En Proceso' :
                         task.estado === 'completada' ? 'Completada' : 'Cancelada'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px' }}>
                      {task.costo ? (
                        <div>
                          <div style={{ fontWeight: '500' }}>B/. {task.costo.toFixed(2)}</div>
                          {task.mecanico && (
                            <div style={{ color: '#999', fontSize: '12px' }}>{task.mecanico}</div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#999' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleView(task)}
                          style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#556B2F' }}
                          title="Ver detalles"
                        >
                          <Eye size={18} />
                        </button>
                        {isAdmin && (
                          <>
                            {task.estado !== 'completada' && (
                              <button
                                onClick={() => handleEdit(task)}
                                style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#3D5229' }}
                                title="Editar"
                              >
                                <CheckCircle size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(task._id)}
                              style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#556B2F' }}
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
          userRole={userRole}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default MaintenanceTasks;
