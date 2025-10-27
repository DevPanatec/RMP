import React, { useState, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useSupabaseMaintenance } from '../context/SupabaseMaintenanceContext';

interface MaintenanceTaskFormProps {
  taskId?: string | null;
  onClose: () => void;
}

const MaintenanceTaskForm: React.FC<MaintenanceTaskFormProps> = ({ taskId, onClose }) => {
  const { tasks, createTask, updateTask } = useMaintenanceContext();
  const [loading, setLoading] = useState(false);

  const existingTask = taskId ? tasks.find(t => t.id === taskId) : null;
  const isEditing = !!existingTask;

  const [formData, setFormData] = useState({
    type: existingTask?.type || 'preventivo' as 'preventivo' | 'correctivo' | 'contingencia',
    scheduled_date: existingTask?.scheduled_date || '',
    scheduled_time: existingTask?.scheduled_time || '',
    observations: existingTask?.observations || '',
    status: existingTask?.status || 'programada' as 'programada' | 'en_proceso' | 'completada'
  });

  const [operationalData, setOperationalData] = useState({
    volume_discharged: existingTask?.operational_data?.volume_discharged || 0,
    cost_per_gallon: existingTask?.operational_data?.cost_per_gallon || 0.11,
    total_estimated_cost: existingTask?.operational_data?.total_estimated_cost || 0,
    cleanup_type: existingTask?.operational_data?.cleanup_type || '',
    work_duration: existingTask?.operational_data?.work_duration || 0,
    technical_observations: existingTask?.operational_data?.technical_observations || ''
  });

  const [images, setImages] = useState<{
    before: File[];
    during: File[];
    after: File[];
  }>({
    before: [],
    during: [],
    after: []
  });

  // Calcular costo total automáticamente
  useEffect(() => {
    const total = (operationalData.volume_discharged || 0) * (operationalData.cost_per_gallon || 0.11);
    setOperationalData(prev => ({ ...prev, total_estimated_cost: total }));
  }, [operationalData.volume_discharged, operationalData.cost_per_gallon]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, stage: 'before' | 'during' | 'after') => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImages(prev => ({
        ...prev,
        [stage]: [...prev[stage], ...newFiles]
      }));
    }
  };

  const removeImage = (stage: 'before' | 'during' | 'after', index: number) => {
    setImages(prev => ({
      ...prev,
      [stage]: prev[stage].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const taskData = {
        ...formData,
        operational_data: operationalData,
        images_before: [],
        images_during: [],
        images_after: []
      };

      if (isEditing && taskId) {
        await updateTask(taskId, taskData);
      } else {
        await createTask(taskData);
      }

      onClose();
    } catch (error) {
      console.error('Error saving maintenance task:', error);
      alert('Error al guardar la tarea de mantenimiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Editar Tarea de Mantenimiento' : 'Nueva Tarea de Mantenimiento'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tipo de Mantenimiento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Mantenimiento
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="preventivo">Preventivo</option>
              <option value="correctivo">Correctivo</option>
              <option value="contingencia">Contingencia</option>
            </select>
          </div>

          {/* Fecha y Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Programada
              </label>
              <input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora Programada
              </label>
              <input
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="programada">Programada</option>
              <option value="en_proceso">En Proceso</option>
              <option value="completada">Completada</option>
            </select>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones
            </label>
            <textarea
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Descripción general de la tarea..."
            />
          </div>

          {/* Datos Operativos */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos Operativos</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Volumen Descargado (galones)
                </label>
                <input
                  type="number"
                  value={operationalData.volume_discharged}
                  onChange={(e) => setOperationalData({ ...operationalData, volume_discharged: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="6000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Costo por Galón (B/.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={operationalData.cost_per_gallon}
                  onChange={(e) => setOperationalData({ ...operationalData, cost_per_gallon: parseFloat(e.target.value) || 0.11 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.11"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Estimado (B/.)
                </label>
                <input
                  type="number"
                  value={operationalData.total_estimated_cost?.toFixed(2)}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Limpieza
                </label>
                <select
                  value={operationalData.cleanup_type}
                  onChange={(e) => setOperationalData({ ...operationalData, cleanup_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccionar...</option>
                  <option value="alto impacto">Alto Impacto</option>
                  <option value="medio impacto">Medio Impacto</option>
                  <option value="bajo impacto">Bajo Impacto</option>
                  <option value="rutinaria">Rutinaria</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duración del Trabajo (horas)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={operationalData.work_duration}
                  onChange={(e) => setOperationalData({ ...operationalData, work_duration: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="4"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones Técnicas
              </label>
              <textarea
                value={operationalData.technical_observations}
                onChange={(e) => setOperationalData({ ...operationalData, technical_observations: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: grasa, revisión de bombas, extracción de sedimentos..."
              />
            </div>
          </div>

          {/* Imágenes */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Imágenes</h3>

            {['before', 'during', 'after'].map((stage) => (
              <div key={stage} className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {stage === 'before' ? 'Antes' : stage === 'during' ? 'Durante' : 'Después'}
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <Upload className="w-5 h-5 text-gray-600" />
                    <span className="text-sm text-gray-700">Subir Imágenes</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleImageUpload(e, stage as any)}
                      className="hidden"
                    />
                  </label>
                  <span className="text-sm text-gray-500">
                    {images[stage as keyof typeof images].length} imagen(es) seleccionada(s)
                  </span>
                </div>

                {images[stage as keyof typeof images].length > 0 && (
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {images[stage as keyof typeof images].map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`${stage} ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(stage as any, index)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaintenanceTaskForm;
