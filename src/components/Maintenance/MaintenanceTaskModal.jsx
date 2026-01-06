import { useState, useEffect } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { X, Upload, Image as ImageIcon, Check, Trash2 } from '../Icons';
import { MAINTENANCE_PRESETS } from '../../constants/maintenancePresets';

const MaintenanceTaskModal = ({ task, viewMode, userRole, onClose }) => {
  const { addTask, updateTask, deleteTask } = useMaintenance();
  const [loading, setLoading] = useState(false);
  const isAdmin = userRole === 'admin';
  const isEnterprise = userRole === 'enterprise';

  // Convex mutations y queries para fotos
  const generateUploadUrl = useMutation(api.maintenance.generateUploadUrl);
  const savePhoto = useMutation(api.maintenance.savePhoto);
  const deletePhotoMutation = useMutation(api.maintenance.deletePhoto);
  const photosData = useQuery(
    api.maintenance.listPhotos,
    task?._id ? { task_id: task._id } : "skip"
  );

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

  // Estados para fotos (solo para completar tareas)
  const [photos, setPhotos] = useState({
    before: [],
    during: [],
    after: []
  });

  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Cargar fotos existentes cuando los datos están disponibles
  useEffect(() => {
    if (photosData) {
      const before = photosData.filter(p => p.etapa === 'before').map(p => ({
        id: p._id,
        url: p.url
      }));
      const during = photosData.filter(p => p.etapa === 'during').map(p => ({
        id: p._id,
        url: p.url
      }));
      const after = photosData.filter(p => p.etapa === 'after').map(p => ({
        id: p._id,
        url: p.url
      }));

      setPhotos({ before, during, after });
    }
  }, [photosData]);

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
        operational_data: operationalData
      };

      // Si está actualizando una tarea existente
      if (task) {
        await updateTask(task._id || task.id, taskData);
      }
      // Si está creando una nueva tarea
      else {
        await addTask(taskData);
      }

      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Error al guardar la tarea');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (file, stage) => {
    // Si no hay task creado aún, mostrar error
    if (!task || !task._id) {
      alert('Debes crear la tarea primero antes de subir fotos.');
      return;
    }

    setUploadingPhotos(true);
    try {
      // 1. Generar URL de upload firmada
      const uploadUrl = await generateUploadUrl();

      // 2. Subir archivo a Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error('Error al subir archivo');
      }

      const { storageId } = await result.json();

      // 3. Guardar metadata en la base de datos
      const photoId = await savePhoto({
        task_id: task._id,
        etapa: stage,
        storage_id: storageId,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      });

      console.log('✅ Foto subida exitosamente:', photoId);
    } catch (error) {
      console.error('❌ Error uploading photo:', error);
      alert('Error al subir la foto: ' + error.message);
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const [selectedCategory, setSelectedCategory] = useState('before');

  const handleDrop = async (e, stage) => {
    e.preventDefault();
    e.stopPropagation();

    const files = [];
    const uniqueFiles = new Set();

    // Manejar archivos desde file explorer
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(file => {
        const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
        if (!uniqueFiles.has(fileKey)) {
          uniqueFiles.add(fileKey);
          files.push(file);
        }
      });
    }

    // Manejar imágenes desde WhatsApp Web o navegador (solo si no hay archivos ya)
    if (files.length === 0 && e.dataTransfer.items) {
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];

        if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
          const file = item.getAsFile();
          if (file) {
            const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
            if (!uniqueFiles.has(fileKey)) {
              uniqueFiles.add(fileKey);
              files.push(file);
            }
          }
        }
      }
    }

    // Distribución automática: Si son 3 archivos, distribuir automáticamente
    if (files.length === 3) {
      await handlePhotoUpload(files[0], 'before');
      await handlePhotoUpload(files[1], 'during');
      await handlePhotoUpload(files[2], 'after');
    }
    // Si no son 3, subir a la categoría seleccionada
    else {
      for (const file of files) {
        if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
          await handlePhotoUpload(file, selectedCategory);
        }
      }
    }
  };

  const handlePaste = async (e, stage) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          await handlePhotoUpload(file, selectedCategory);
        }
      }
    }
  };

  const removePhoto = async (stage, index) => {
    const photo = photos[stage][index];
    if (!photo || !photo.id) return;

    try {
      await deletePhotoMutation({ id: photo.id });
      console.log('✅ Foto eliminada exitosamente');
    } catch (error) {
      console.error('❌ Error deleting photo:', error);
      alert('Error al eliminar la foto: ' + error.message);
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
          {/* Paquete de Mantenimiento - Compacto */}
          {!viewMode && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>
                Paquete de Mantenimiento (Opcional)
              </label>
              <select
                value={selectedPackage}
                onChange={(e) => handlePackageSelect(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #dcfce7',
                  borderRadius: '10px',
                  fontSize: '14px',
                  background: 'white',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  color: selectedPackage ? '#3D5229' : '#64748b'
                }}
              >
                <option value="">Personalizado</option>
                {MAINTENANCE_PRESETS.maintenancePackages.map(pkg => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.label} ({(pkg.estimatedDuration / 60).toFixed(1)}h)
                  </option>
                ))}
              </select>
              {selectedPackage && (
                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
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

            {/* Preset de Volumen - Compacto */}
            {!viewMode && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#475569' }}>
                  Preset de Volumen (Opcional)
                </label>
                <select
                  onChange={(e) => handleVolumePresetSelect(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    background: 'white'
                  }}
                >
                  <option value="">Manual</option>
                  {MAINTENANCE_PRESETS.volumeAndCost.map(preset => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label} ({preset.volume_gallons.toLocaleString()} gal, B/.{preset.total_cost.toFixed(2)})
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

          {/* Sección de Evidencia Fotográfica - Para crear o completar tareas */}
          {!viewMode && isAdmin && (
            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '24px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <ImageIcon size={22} style={{ color: '#3D5229' }} />
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#1f2937' }}>
                  Evidencia Fotográfica
                </h3>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
                Selecciona la categoría y arrastra las imágenes. Si arrastras 3 imágenes, se distribuirán automáticamente (1 antes, 1 durante, 1 después)
              </p>

              {/* Selector de categoría integrado con zona de carga */}
              <div style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
                border: '2px solid #dcfce7',
                borderRadius: '16px',
                padding: '20px'
              }}>
                {/* Tabs de categoría */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#f8fafc', padding: '6px', borderRadius: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('before')}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: selectedCategory === 'before' ? 'linear-gradient(135deg, #3D5229 0%, #556B2F 100%)' : 'transparent',
                      color: selectedCategory === 'before' ? 'white' : '#64748b',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: selectedCategory === 'before' ? '0 2px 8px rgba(61, 82, 41, 0.3)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <ImageIcon size={16} />
                    Antes
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('during')}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: selectedCategory === 'during' ? 'linear-gradient(135deg, #3D5229 0%, #556B2F 100%)' : 'transparent',
                      color: selectedCategory === 'during' ? 'white' : '#64748b',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: selectedCategory === 'during' ? '0 2px 8px rgba(61, 82, 41, 0.3)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <ImageIcon size={16} />
                    Durante
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('after')}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: selectedCategory === 'after' ? 'linear-gradient(135deg, #3D5229 0%, #556B2F 100%)' : 'transparent',
                      color: selectedCategory === 'after' ? 'white' : '#64748b',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: selectedCategory === 'after' ? '0 2px 8px rgba(61, 82, 41, 0.3)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <ImageIcon size={16} />
                    Después
                  </button>
                </div>

                {/* Zona de carga */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'all')}
                  onPaste={(e) => handlePaste(e, 'all')}
                  onClick={() => document.getElementById('file-all').click()}
                  style={{
                    width: '100%',
                    minHeight: '140px',
                    padding: '30px',
                    border: '2px dashed #94a3b8',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#3D5229';
                    e.currentTarget.style.background = '#f0fdf4';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#94a3b8';
                    e.currentTarget.style.background = 'white';
                  }}
                >
                  <Upload size={48} style={{ color: '#3D5229', opacity: 0.6 }} />
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#475569', textAlign: 'center' }}>
                    Arrastra fotos aquí o haz clic para seleccionar
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                    Se subirán a la categoría: <strong style={{ color: '#3D5229' }}>
                      {selectedCategory === 'before' ? 'Antes' : selectedCategory === 'during' ? 'Durante' : 'Después'}
                    </strong>
                  </div>
                </div>
                <input
                  id="file-all"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={(e) => {
                    Array.from(e.target.files).forEach(file => handlePhotoUpload(file, selectedCategory));
                  }}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Galería de imágenes subidas organizadas por categoría */}
              {(photos.before.length > 0 || photos.during.length > 0 || photos.after.length > 0) && (
                <div style={{ marginTop: '20px' }}>
                  {/* Sección Antes */}
                  {photos.before.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '8px 12px', background: 'rgba(61, 82, 41, 0.08)', borderRadius: '8px', width: 'fit-content' }}>
                        <ImageIcon size={16} style={{ color: '#3D5229' }} />
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#3D5229' }}>Antes</span>
                        <span style={{ fontSize: '12px', background: '#3D5229', color: 'white', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                          {photos.before.length}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
                        {photos.before.map((photo, idx) => (
                          <div key={photo.id || idx} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '2px solid #dcfce7' }}>
                            <img src={photo.url} alt={`Antes ${idx + 1}`} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removePhoto('before', idx); }}
                              style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                background: 'rgba(61, 82, 41, 0.9)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sección Durante */}
                  {photos.during.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '8px 12px', background: 'rgba(61, 82, 41, 0.08)', borderRadius: '8px', width: 'fit-content' }}>
                        <ImageIcon size={16} style={{ color: '#3D5229' }} />
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#3D5229' }}>Durante</span>
                        <span style={{ fontSize: '12px', background: '#3D5229', color: 'white', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                          {photos.during.length}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
                        {photos.during.map((photo, idx) => (
                          <div key={photo.id || idx} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '2px solid #dcfce7' }}>
                            <img src={photo.url} alt={`Durante ${idx + 1}`} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removePhoto('during', idx); }}
                              style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                background: 'rgba(61, 82, 41, 0.9)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sección Después */}
                  {photos.after.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '8px 12px', background: 'rgba(61, 82, 41, 0.08)', borderRadius: '8px', width: 'fit-content' }}>
                        <ImageIcon size={16} style={{ color: '#3D5229' }} />
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#3D5229' }}>Después</span>
                        <span style={{ fontSize: '12px', background: '#3D5229', color: 'white', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                          {photos.after.length}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
                        {photos.after.map((photo, idx) => (
                          <div key={photo.id || idx} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '2px solid #dcfce7' }}>
                            <img src={photo.url} alt={`Después ${idx + 1}`} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removePhoto('after', idx); }}
                              style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                background: 'rgba(61, 82, 41, 0.9)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {uploadingPhotos && (
                <div style={{
                  padding: '12px',
                  background: 'rgba(61, 82, 41, 0.08)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#3D5229',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '12px'
                }}>
                  <Upload size={16} style={{ color: '#3D5229' }} />
                  Subiendo fotos...
                </div>
              )}

              {/* Botón para marcar como completada */}
              {photos.before.length > 0 && photos.during.length > 0 && photos.after.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'completada' })}
                  disabled={formData.status === 'completada'}
                  style={{
                    marginTop: '12px',
                    padding: '14px',
                    background: 'linear-gradient(135deg, #3D5229 0%, #556B2F 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: formData.status === 'completada' ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(61, 82, 41, 0.3)',
                    transition: 'all 0.2s',
                    opacity: formData.status === 'completada' ? 0.7 : 1
                  }}
                >
                  <Check size={18} />
                  {formData.status === 'completada' ? 'Marcada como Completada' : 'Marcar como Completada'}
                </button>
              )}
            </div>
          )}

          {/* Imágenes - mostrar si existen */}
          {viewMode && task && (task.images_before?.length > 0 || task.images_during?.length > 0 || task.images_after?.length > 0) && (
            <div style={{
              borderTop: '2px solid #e2e8f0',
              paddingTop: '24px',
              marginBottom: '20px',
              background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
              padding: '24px',
              borderRadius: '16px',
              border: '2px solid #dcfce7'
            }}>
              <div style={{
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '20px',
                color: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <ImageIcon size={22} style={{ color: '#3D5229' }} />
                Evidencia Fotográfica del Mantenimiento
              </div>

              {/* Sección Antes */}
              {task.images_before && task.images_before.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                    padding: '8px 12px',
                    background: 'rgba(61, 82, 41, 0.08)',
                    borderRadius: '8px',
                    width: 'fit-content'
                  }}>
                    <ImageIcon size={16} style={{ color: '#3D5229' }} />
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#3D5229' }}>Antes</span>
                    <span style={{
                      fontSize: '12px',
                      background: '#3D5229',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: '600'
                    }}>
                      {task.images_before.length}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                    {task.images_before.map((url, index) => (
                      <div key={index} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '2px solid #dcfce7', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <img
                          src={url}
                          alt={`Antes ${index + 1}`}
                          style={{ width: '100%', height: '140px', objectFit: 'cover', cursor: 'pointer' }}
                          onClick={() => window.open(url, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sección Durante */}
              {task.images_during && task.images_during.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                    padding: '8px 12px',
                    background: 'rgba(61, 82, 41, 0.08)',
                    borderRadius: '8px',
                    width: 'fit-content'
                  }}>
                    <ImageIcon size={16} style={{ color: '#3D5229' }} />
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#3D5229' }}>Durante</span>
                    <span style={{
                      fontSize: '12px',
                      background: '#3D5229',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: '600'
                    }}>
                      {task.images_during.length}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                    {task.images_during.map((url, index) => (
                      <div key={index} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '2px solid #dcfce7', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <img
                          src={url}
                          alt={`Durante ${index + 1}`}
                          style={{ width: '100%', height: '140px', objectFit: 'cover', cursor: 'pointer' }}
                          onClick={() => window.open(url, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sección Después */}
              {task.images_after && task.images_after.length > 0 && (
                <div style={{ marginBottom: '0' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                    padding: '8px 12px',
                    background: 'rgba(61, 82, 41, 0.08)',
                    borderRadius: '8px',
                    width: 'fit-content'
                  }}>
                    <ImageIcon size={16} style={{ color: '#3D5229' }} />
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#3D5229' }}>Después</span>
                    <span style={{
                      fontSize: '12px',
                      background: '#3D5229',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: '600'
                    }}>
                      {task.images_after.length}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                    {task.images_after.map((url, index) => (
                      <div key={index} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '2px solid #dcfce7', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <img
                          src={url}
                          alt={`Después ${index + 1}`}
                          style={{ width: '100%', height: '140px', objectFit: 'cover', cursor: 'pointer' }}
                          onClick={() => window.open(url, '_blank')}
                        />
                      </div>
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
                {loading
                  ? 'Guardando...'
                  : formData.status === 'completada' && task
                    ? 'Completar Tarea'
                    : task
                      ? 'Actualizar Tarea'
                      : 'Crear Tarea'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default MaintenanceTaskModal;
