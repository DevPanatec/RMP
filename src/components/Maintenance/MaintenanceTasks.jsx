import { useState } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { Plus, Eye, Trash2, CheckCircle, Calendar, Clock, Edit, FileText } from '../Icons';
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
    setViewMode(isAdmin ? false : true);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTask(null);
    setViewMode(false);
  };

  // Helper para formatear fecha
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

  // Helper para obtener color de estado
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
          color: '#92400e',
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

  // Helper para label de estado
  const getEstadoLabel = (estado) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'en_progreso': return 'En Progreso';
      case 'completada': return 'Completada';
      case 'cancelada': return 'Cancelada';
      default: return estado;
    }
  };

  // Helper para label de tipo
  const getTipoLabel = (tipo) => {
    switch (tipo) {
      case 'preventivo': return 'Preventivo';
      case 'correctivo': return 'Correctivo';
      case 'inspección': return 'Inspección';
      default: return tipo || 'General';
    }
  };

  // Contadores
  const counts = {
    all: tasks.length,
    pendiente: tasks.filter(t => t.estado === 'pendiente').length,
    en_progreso: tasks.filter(t => t.estado === 'en_progreso').length,
    completada: tasks.filter(t => t.estado === 'completada').length
  };

  return (
    <div>
      {/* Header con filtros */}
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
          justifyContent: 'space-between'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text)'
          }}>
            Gestión de Tareas
          </h3>
          {isAdmin && (
            <button
              onClick={() => {
                setSelectedTask(null);
                setViewMode(false);
                setShowModal(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-8)',
                padding: 'var(--space-8) var(--space-16)',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-base)',
                fontSize: 'var(--font-size-base)',
                fontWeight: 'var(--font-weight-medium)',
                cursor: 'pointer',
                transition: 'background var(--duration-fast) var(--ease-out)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-primary)'}
            >
              <Plus size={18} />
              Nueva Tarea
            </button>
          )}
        </div>

        {/* Filtros */}
        <div style={{
          padding: 'var(--space-16) var(--space-20)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          gap: 'var(--space-8)',
          flexWrap: 'wrap'
        }}>
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-8)',
                  padding: 'var(--space-8) var(--space-16)',
                  background: isActive ? 'var(--color-primary)' : 'var(--color-background)',
                  color: isActive ? 'white' : 'var(--color-text)',
                  border: isActive ? 'none' : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-base)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  cursor: 'pointer',
                  transition: 'all var(--duration-fast) var(--ease-out)'
                }}
              >
                <Icon size={16} />
                <span>{filterOption.label}</span>
                <span style={{
                  background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--color-surface)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)'
                }}>
                  {filterOption.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Lista de tareas */}
        <div style={{ padding: 'var(--space-12)' }}>
          {filteredTasks.length === 0 ? (
            <div style={{ padding: 'var(--space-40)', textAlign: 'center' }}>
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
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{
                      padding: 'var(--space-12) var(--space-16)',
                      textAlign: 'left',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      borderBottom: '1px solid var(--color-border)',
                      background: 'var(--color-background)'
                    }}>Tipo</th>
                    <th style={{
                      padding: 'var(--space-12) var(--space-16)',
                      textAlign: 'left',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      borderBottom: '1px solid var(--color-border)',
                      background: 'var(--color-background)'
                    }}>Título</th>
                    <th style={{
                      padding: 'var(--space-12) var(--space-16)',
                      textAlign: 'left',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      borderBottom: '1px solid var(--color-border)',
                      background: 'var(--color-background)'
                    }}>Fecha</th>
                    <th style={{
                      padding: 'var(--space-12) var(--space-16)',
                      textAlign: 'left',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      borderBottom: '1px solid var(--color-border)',
                      background: 'var(--color-background)'
                    }}>Estado</th>
                    <th style={{
                      padding: 'var(--space-12) var(--space-16)',
                      textAlign: 'left',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      borderBottom: '1px solid var(--color-border)',
                      background: 'var(--color-background)'
                    }}>Costo</th>
                    <th style={{
                      padding: 'var(--space-12) var(--space-16)',
                      textAlign: 'right',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      borderBottom: '1px solid var(--color-border)',
                      background: 'var(--color-background)'
                    }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr
                      key={task._id}
                      style={{
                        transition: 'background var(--duration-fast) var(--ease-out)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-hover-overlay)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{
                        padding: 'var(--space-12) var(--space-16)',
                        borderBottom: '1px solid var(--color-border)'
                      }}>
                        <span style={{
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 'var(--font-weight-semibold)',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--color-primary-light)',
                          color: 'var(--color-primary)',
                          textTransform: 'uppercase'
                        }}>
                          {getTipoLabel(task.tipo)}
                        </span>
                      </td>
                      <td style={{
                        padding: 'var(--space-12) var(--space-16)',
                        borderBottom: '1px solid var(--color-border)',
                        maxWidth: '300px'
                      }}>
                        <div style={{
                          fontSize: 'var(--font-size-base)',
                          fontWeight: 'var(--font-weight-medium)',
                          color: 'var(--color-text)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {task.titulo || 'Sin título'}
                        </div>
                        {task.descripcion && (
                          <div style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-text-secondary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginTop: '2px'
                          }}>
                            {task.descripcion}
                          </div>
                        )}
                      </td>
                      <td style={{
                        padding: 'var(--space-12) var(--space-16)',
                        borderBottom: '1px solid var(--color-border)',
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text)'
                      }}>
                        {formatDate(task.fecha_programada)}
                      </td>
                      <td style={{
                        padding: 'var(--space-12) var(--space-16)',
                        borderBottom: '1px solid var(--color-border)'
                      }}>
                        <span style={{
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 'var(--font-weight-medium)',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                          ...getEstadoStyle(task.estado)
                        }}>
                          {getEstadoLabel(task.estado)}
                        </span>
                      </td>
                      <td style={{
                        padding: 'var(--space-12) var(--space-16)',
                        borderBottom: '1px solid var(--color-border)',
                        fontSize: 'var(--font-size-sm)'
                      }}>
                        {task.costo ? (
                          <div>
                            <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>
                              B/. {task.costo.toFixed(2)}
                            </div>
                            {task.mecanico && (
                              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                                {task.mecanico}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-text-tertiary)' }}>-</span>
                        )}
                      </td>
                      <td style={{
                        padding: 'var(--space-12) var(--space-16)',
                        borderBottom: '1px solid var(--color-border)'
                      }}>
                        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleView(task)}
                            style={{
                              padding: 'var(--space-8)',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--color-info)',
                              borderRadius: 'var(--radius-base)',
                              transition: 'background var(--duration-fast) var(--ease-out)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-info-light)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            title="Ver detalles"
                          >
                            <Eye size={18} />
                          </button>
                          {isAdmin && (
                            <>
                              {task.estado !== 'completada' && (
                                <button
                                  onClick={() => handleEdit(task)}
                                  style={{
                                    padding: 'var(--space-8)',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--color-primary)',
                                    borderRadius: 'var(--radius-base)',
                                    transition: 'background var(--duration-fast) var(--ease-out)'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary-light)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                  title="Editar"
                                >
                                  <Edit size={18} />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(task._id)}
                                style={{
                                  padding: 'var(--space-8)',
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--color-error)',
                                  borderRadius: 'var(--radius-base)',
                                  transition: 'background var(--duration-fast) var(--ease-out)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-error-light)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
