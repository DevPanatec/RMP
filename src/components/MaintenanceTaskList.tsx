import React, { useState } from 'react';
import { Eye, Trash2, CheckCircle, Clock, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { useSupabaseMaintenance } from '../context/SupabaseMaintenanceContext';
import { useSupabaseAuth } from '../context/SupabaseAuthContext';

interface MaintenanceTaskListProps {
  onEditTask: (taskId: string) => void;
}

const MaintenanceTaskList: React.FC<MaintenanceTaskListProps> = ({ onEditTask }) => {
  const { user } = useSupabaseAuth();
  const { tasks, deleteTask, completeTask } = useSupabaseMaintenance();
  const [filter, setFilter] = useState<'all' | 'programada' | 'en_proceso' | 'completada'>('all');
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  const isAdmin = user?.tipo === 'admin';

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter(t => t.status === filter);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'programada':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            Programada
          </span>
        );
      case 'en_proceso':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
            <AlertCircle className="w-3 h-3" />
            En Proceso
          </span>
        );
      case 'completada':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Completada
          </span>
        );
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      preventivo: 'bg-green-100 text-green-800',
      correctivo: 'bg-orange-100 text-orange-800',
      contingencia: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type as keyof typeof colors]}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta tarea?')) {
      await deleteTask(id);
    }
  };

  const selectedTaskData = selectedTask ? tasks.find(t => t.id === selectedTask) : null;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todas ({tasks.length})
          </button>
          <button
            onClick={() => setFilter('programada')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'programada'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Programadas ({tasks.filter(t => t.status === 'programada').length})
          </button>
          <button
            onClick={() => setFilter('en_proceso')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'en_proceso'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            En Proceso ({tasks.filter(t => t.status === 'en_proceso').length})
          </button>
          <button
            onClick={() => setFilter('completada')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'completada'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Completadas ({tasks.filter(t => t.status === 'completada').length})
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha/Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Observaciones
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datos Operativos
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTypeBadge(task.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{new Date(task.scheduled_date).toLocaleDateString('es-PA')}</div>
                    <div className="text-gray-500">{task.scheduled_time}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate">{task.observations}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(task.status)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {task.operational_data ? (
                      <div className="space-y-1">
                        <div>Vol: {task.operational_data.volume_discharged?.toLocaleString()} gal</div>
                        <div>Costo: B/. {task.operational_data.total_estimated_cost?.toFixed(2)}</div>
                        {task.operational_data.cleanup_type && (
                          <div className="text-xs text-gray-500">{task.operational_data.cleanup_type}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedTask(task.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver detalles"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {isAdmin && (
                        <>
                          {task.status !== 'completada' && (
                            <button
                              onClick={() => onEditTask(task.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Completar"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTasks.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No hay tareas {filter !== 'all' && `en estado "${filter}"`}
            </div>
          )}
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTaskData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Detalles de Tarea</h2>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  {getTypeBadge(selectedTaskData.type)}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  {getStatusBadge(selectedTaskData.status)}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <p className="text-gray-900">{new Date(selectedTaskData.scheduled_date).toLocaleDateString('es-PA')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                  <p className="text-gray-900">{selectedTaskData.scheduled_time}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <p className="text-gray-900">{selectedTaskData.observations}</p>
              </div>

              {selectedTaskData.operational_data && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Datos Operativos</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Volumen Descargado</label>
                      <p className="text-gray-900">{selectedTaskData.operational_data.volume_discharged?.toLocaleString()} galones</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Costo por Galón</label>
                      <p className="text-gray-900">B/. {selectedTaskData.operational_data.cost_per_gallon?.toFixed(2)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Costo Total</label>
                      <p className="text-gray-900 text-lg font-semibold">B/. {selectedTaskData.operational_data.total_estimated_cost?.toFixed(2)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Limpieza</label>
                      <p className="text-gray-900">{selectedTaskData.operational_data.cleanup_type || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duración</label>
                      <p className="text-gray-900">{selectedTaskData.operational_data.work_duration || 0} horas</p>
                    </div>
                  </div>
                  {selectedTaskData.operational_data.technical_observations && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones Técnicas</label>
                      <p className="text-gray-900">{selectedTaskData.operational_data.technical_observations}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Images */}
              {(selectedTaskData.images_before?.length || selectedTaskData.images_during?.length || selectedTaskData.images_after?.length) && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Imágenes</h3>
                  {selectedTaskData.images_before && selectedTaskData.images_before.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Antes</label>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedTaskData.images_before.map((url, index) => (
                          <img key={index} src={url} alt={`Antes ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedTaskData.images_during && selectedTaskData.images_during.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Durante</label>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedTaskData.images_during.map((url, index) => (
                          <img key={index} src={url} alt={`Durante ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedTaskData.images_after && selectedTaskData.images_after.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Después</label>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedTaskData.images_after.map((url, index) => (
                          <img key={index} src={url} alt={`Después ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceTaskList;
