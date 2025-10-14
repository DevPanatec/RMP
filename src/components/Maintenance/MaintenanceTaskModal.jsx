import { useState, useEffect } from 'react';
import { useSupabaseMaintenance } from '../../context/SupabaseMaintenanceContext';
import { X } from '../Icons';
import { MAINTENANCE_PRESETS } from '../../constants/maintenancePresets';

const MaintenanceTaskModal = ({ task, viewMode, onClose }) => {
  const { createTask, updateTask } = useSupabaseMaintenance();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    type: task?.type || 'preventivo',
    scheduled_date: task?.scheduled_date || '',
    scheduled_time: task?.scheduled_time || '',
    observations: task?.observations || '',
    status: task?.status || 'programada'
  });

  const [operationalData, setOperationalData] = useState({
    volume_discharged: task?.operational_data?.volume_discharged || 0,
    cost_per_gallon: task?.operational_data?.cost_per_gallon || 0.11,
    total_estimated_cost: task?.operational_data?.total_estimated_cost || 0,
    cleanup_type: task?.operational_data?.cleanup_type || '',
    work_duration: task?.operational_data?.work_duration || 0,
    technical_observations: task?.operational_data?.technical_observations || ''
  });

  const [selectedPackage, setSelectedPackage] = useState('');
  const [selectedTasks, setSelectedTasks] = useState([]);

  useEffect(() => {
    const total = (operationalData.volume_discharged || 0) * (operationalData.cost_per_gallon || 0.11);
    setOperationalData(prev => ({ ...prev, total_estimated_cost: total }));
  }, [operationalData.volume_discharged, operationalData.cost_per_gallon]);

  // Manejar selección de paquete de mantenimiento
  const handlePackageSelect = (packageId) => {
    if (!packageId) {
      setSelectedPackage('');
      setSelectedTasks([]);
      return;
    }

    const pkg = MAINTENANCE_PRESETS.maintenancePackages.find(p => p.id === packageId);
    if (pkg) {
      setSelectedPackage(packageId);

      // Aplicar preset de volumen
      if (pkg.volumePreset) {
        const volumePreset = MAINTENANCE_PRESETS.volumeAndCost.find(v => v.id === pkg.volumePreset);
        if (volumePreset) {
          setOperationalData(prev => ({
            ...prev,
            volume_discharged: volumePreset.volume_gallons,
            cost_per_gallon: volumePreset.cost_per_gallon,
            total_estimated_cost: volumePreset.total_cost
          }));
        }
      }

      // Aplicar tareas del paquete
      const packageTasks = pkg.tasks.map(taskId =>
        MAINTENANCE_PRESETS.standardTasks.find(t => t.id === taskId)
      ).filter(Boolean);

      setSelectedTasks(pkg.tasks);

      // Construir observaciones técnicas automáticas
      const taskDescriptions = packageTasks.map(t => t.label).join(', ');
      setOperationalData(prev => ({
        ...prev,
        technical_observations: taskDescriptions,
        work_duration: pkg.estimatedDuration / 60 // Convertir minutos a horas
      }));

      // Aplicar tipo de mantenimiento
      setFormData(prev => ({
        ...prev,
        type: pkg.type
      }));
    }
  };

  // Manejar selección de preset de volumen
  const handleVolumePresetSelect = (presetId) => {
    if (!presetId) return;

    const preset = MAINTENANCE_PRESETS.volumeAndCost.find(v => v.id === presetId);
    if (preset) {
      setOperationalData(prev => ({
        ...prev,
        volume_discharged: preset.volume_gallons,
        cost_per_gallon: preset.cost_per_gallon,
        total_estimated_cost: preset.total_cost
      }));
    }
  };

  const handleSubmit = async (e) => {
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

      if (task) {
        await updateTask(task.id, taskData);
      } else {
        await createTask(taskData);
      }

      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Error al guardar la tarea');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          .modal-scroll::-webkit-scrollbar {
            width: 8px;
          }
          .modal-scroll::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
          }
          .modal-scroll::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 10px;
          }
          .modal-scroll::-webkit-scrollbar-thumb:hover {
            background: #555;
          }
        `}
      </style>
      <div
        className="modal-scroll"
        style={{
          background: 'white',
          borderRadius: '20px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '85vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div style={{
          position: 'sticky',
          top: 0,
          background: 'white',
          borderBottom: '1px solid var(--color-border)',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '16px 16px 0 0'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            {viewMode ? 'Detalles de Tarea' : task ? 'Editar Tarea' : 'Nueva Tarea de Mantenimiento'}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#999' }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Paquete de Mantenimiento (NUEVO) */}
          {!viewMode && (
            <div style={{
              marginBottom: '24px',
              padding: '20px',
              background: 'linear-gradient(135deg, #3D5229 0%, #556B2F 100%)',
              borderRadius: '16px',
              boxShadow: '0 4px 15px rgba(61, 82, 41, 0.3)'
            }}>
              <label style={{ display: 'block', fontSize: '15px', fontWeight: '700', marginBottom: '12px', color: 'white' }}>
                Paquete de Mantenimiento
              </label>
              <select
                value={selectedPackage}
                onChange={(e) => handlePackageSelect(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  background: 'white',
                  fontWeight: '500',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s'
                }}
              >
                <option value="">Personalizar manualmente</option>
                {MAINTENANCE_PRESETS.maintenancePackages.map(pkg => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.label} - {(pkg.estimatedDuration / 60).toFixed(1)}h
                  </option>
                ))}
              </select>
              {selectedPackage && (
                <p style={{ margin: '10px 0 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.95)', lineHeight: '1.4' }}>
                  {MAINTENANCE_PRESETS.maintenancePackages.find(p => p.id === selectedPackage)?.description}
                </p>
              )}
            </div>
          )}

          {/* Información Básica - Grid compacto */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {/* Tipo de Mantenimiento */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>
                Tipo
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                disabled={viewMode}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                required
              >
                {MAINTENANCE_PRESETS.maintenanceType.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>
                Fecha
              </label>
              <input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                disabled={viewMode}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                required
              />
            </div>

            {/* Hora */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>
                Hora
              </label>
              <input
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                disabled={viewMode}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                required
              />
            </div>

            {/* Estado */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>
                Estado
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                disabled={viewMode}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
                required
              >
                <option value="programada">Programada</option>
                <option value="en_proceso">En Proceso</option>
                <option value="completada">Completada</option>
              </select>
            </div>
          </div>

          {/* Observaciones */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>
              Observaciones
            </label>
            <textarea
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              disabled={viewMode}
              rows={2}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                transition: 'all 0.2s'
              }}
              placeholder="Descripción general de la tarea..."
            />
          </div>

          {/* Datos Operativos */}
          <div style={{
            background: '#f8fafc',
            padding: '20px',
            borderRadius: '16px',
            marginBottom: '24px',
            border: '2px solid #e2e8f0'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#334155' }}>
              Datos Operativos
            </h3>

            {/* Preset de Volumen (NUEVO) */}
            {!viewMode && (
              <div style={{
                marginBottom: '16px',
                padding: '14px',
                background: 'white',
                borderRadius: '12px',
                border: '2px dashed #cbd5e1'
              }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#475569' }}>
                  Preset de Volumen
                </label>
                <select
                  onChange={(e) => handleVolumePresetSelect(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Seleccionar preset...</option>
                  {MAINTENANCE_PRESETS.volumeAndCost.map(preset => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label} - {preset.volume_gallons.toLocaleString()} gal - B/.{preset.total_cost.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#475569' }}>
                  Volumen (gal)
                </label>
                <input
                  type="number"
                  value={operationalData.volume_discharged}
                  onChange={(e) => setOperationalData({ ...operationalData, volume_discharged: parseFloat(e.target.value) || 0 })}
                  disabled={viewMode}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    background: 'white'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#475569' }}>
                  Costo/Gal (B/.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={operationalData.cost_per_gallon}
                  onChange={(e) => setOperationalData({ ...operationalData, cost_per_gallon: parseFloat(e.target.value) || 0.11 })}
                  disabled={viewMode}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    background: 'white'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#475569' }}>
                  Total (B/.)
                </label>
                <input
                  type="text"
                  value={`B/. ${operationalData.total_estimated_cost?.toFixed(2)}`}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #3D5229',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '700',
                    background: '#f0f4e8',
                    color: '#3D5229',
                    textAlign: 'center'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#475569' }}>
                  Duración (h)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={operationalData.work_duration}
                  onChange={(e) => setOperationalData({ ...operationalData, work_duration: parseFloat(e.target.value) || 0 })}
                  disabled={viewMode}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    background: 'white'
                  }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#475569' }}>
                  Impacto
                </label>
                <select
                  value={operationalData.cleanup_type}
                  onChange={(e) => setOperationalData({ ...operationalData, cleanup_type: e.target.value })}
                  disabled={viewMode}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    background: 'white'
                  }}
                >
                  <option value="">Seleccionar...</option>
                  {MAINTENANCE_PRESETS.impactLevel.map(impact => (
                    <option key={impact.id} value={impact.label}>
                      {impact.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#475569' }}>
                Tareas Técnicas
              </label>
              <textarea
                value={operationalData.technical_observations}
                onChange={(e) => setOperationalData({ ...operationalData, technical_observations: e.target.value })}
                disabled={viewMode}
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  background: 'white'
                }}
                placeholder="Ej: Succión completa, limpieza de paredes, extracción de grasa..."
              />
            </div>
          </div>

          {/* Imágenes - mostrar si existen */}
          {viewMode && task && (task.images_before?.length > 0 || task.images_during?.length > 0 || task.images_after?.length > 0) && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Imágenes</h3>

              {task.images_before && task.images_before.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                    Antes
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
                    {task.images_before.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Antes ${index + 1}`}
                        style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {task.images_during && task.images_during.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                    Durante
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
                    {task.images_during.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Durante ${index + 1}`}
                        style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {task.images_after && task.images_after.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                    Después
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
                    {task.images_after.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Después ${index + 1}`}
                        style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botones */}
          {!viewMode && (
            <div style={{
              position: 'sticky',
              bottom: 0,
              background: 'white',
              padding: '20px 0 0 0',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              borderTop: '2px solid #e5e7eb',
              boxShadow: '0 -4px 10px rgba(0,0,0,0.05)'
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '12px 28px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '12px 32px',
                  background: loading ? '#94a3b8' : 'linear-gradient(135deg, #3D5229 0%, #556B2F 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: loading ? 'none' : '0 4px 12px rgba(61, 82, 41, 0.4)',
                  transform: loading ? 'scale(1)' : 'scale(1)'
                }}
                onMouseOver={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)', e.currentTarget.style.boxShadow = '0 6px 16px rgba(61, 82, 41, 0.5)')}
                onMouseOut={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = '0 4px 12px rgba(61, 82, 41, 0.4)')}
              >
                {loading ? 'Guardando...' : task ? 'Actualizar Tarea' : 'Crear Tarea'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default MaintenanceTaskModal;
