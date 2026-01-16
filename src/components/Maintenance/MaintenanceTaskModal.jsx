import { useState, useEffect } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { X, Upload, Image as ImageIcon, Check, Trash2 } from '../Icons';
import { MAINTENANCE_PRESETS } from '../../constants/maintenancePresets';

const MaintenanceTaskModal = ({ task, viewMode, userRole, onClose }) => {
  const { addTask, updateTask, deleteTask, completeTask } = useMaintenance();
  const [loading, setLoading] = useState(false);
  const isAdmin = userRole === 'admin';
  const isEnterprise = userRole === 'enterprise';

  // Convex mutations y queries para fotos
  const generateUploadUrl = useMutation(api.maintenance.generateUploadUrl);
  const savePhoto = useMutation(api.maintenance.savePhoto);
  const deletePhotoMutation = useMutation(api.maintenance.deletePhoto);
  const createReportMutation = useMutation(api.maintenance.createReport);
  const photosData = useQuery(
    api.maintenance.listPhotos,
    task?._id ? { task_id: task._id } : "skip"
  );

  const [formData, setFormData] = useState({
    titulo: task?.titulo || '',
    tipo: task?.tipo || 'preventivo',
    fecha_programada: task?.fecha_programada || '',
    scheduled_time: task?.scheduled_time || '',
    descripcion: task?.descripcion || '',
    estado: task?.estado || 'pendiente'
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

  // Determinar la siguiente categoría disponible para foto (máx 1 por categoría)
  const getNextAvailableCategory = () => {
    if (photos.before.length === 0) return 'before';
    if (photos.during.length === 0) return 'during';
    if (photos.after.length === 0) return 'after';
    return null; // Todas las categorías tienen foto
  };

  // Mapeo de etapas: local state keys -> database values (español)
  const etapaMap = {
    before: 'antes',
    during: 'durante',
    after: 'despues'
  };

  // Cargar fotos existentes cuando los datos están disponibles
  useEffect(() => {
    if (photosData) {
      const before = photosData.filter(p => p.etapa === 'antes').map(p => ({
        id: p._id,
        url: p.url
      }));
      const during = photosData.filter(p => p.etapa === 'durante').map(p => ({
        id: p._id,
        url: p.url
      }));
      const after = photosData.filter(p => p.etapa === 'despues').map(p => ({
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
        tipo: pkg.type
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
      // Mapear campos del modal a los que espera Convex
      const taskData = {
        titulo: formData.titulo || 'Tarea de Mantenimiento',
        tipo: formData.tipo,
        fecha_programada: formData.fecha_programada,
        descripcion: formData.descripcion,
        costo: operationalData.total_estimated_cost || 0,
        notas: operationalData.technical_observations || '',
        estado: formData.estado
      };

      // Si está actualizando una tarea existente
      if (task) {
        // Si se está COMPLETANDO (cambio de estado a completada)
        if (formData.estado === 'completada' && task.estado !== 'completada') {
          const reportData = {
            vehiculo_placa: task.vehiculo_placa || '',
            costo: operationalData.total_estimated_cost || task.costo || 0,
            mecanico: task.mecanico || 'N/A',
            observaciones: operationalData.technical_observations || task.notas || '',
            usuario_completo: 'Admin'
          };
          console.log('📋 Completando tarea y creando reporte:', reportData);
          await completeTask(task._id || task.id, reportData);
        } else {
          // Actualización normal (sin completar)
          await updateTask(task._id || task.id, {
            descripcion: taskData.descripcion,
            estado: formData.estado,
            costo: taskData.costo,
            notas: taskData.notas,
            fecha_completada: formData.estado === 'completada' ? new Date().toISOString().split('T')[0] : undefined
          });
        }
      }
      // Si está creando una nueva tarea
      else {
        const result = await addTask(taskData);

        // Si se creó exitosamente y hay fotos locales, subirlas
        if (result.success && result._id) {
          const newTaskId = result._id;
          const localPhotos = {
            before: photos.before.filter(p => p.isLocal),
            during: photos.during.filter(p => p.isLocal),
            after: photos.after.filter(p => p.isLocal)
          };

          // Subir todas las fotos locales
          for (const stage of ['before', 'during', 'after']) {
            for (const photo of localPhotos[stage]) {
              try {
                const uploadUrl = await generateUploadUrl();
                const uploadResult = await fetch(uploadUrl, {
                  method: "POST",
                  headers: { "Content-Type": photo.file.type },
                  body: photo.file,
                });

                if (!uploadResult.ok) {
                  throw new Error('Error al subir archivo');
                }

                const { storageId } = await uploadResult.json();

                await savePhoto({
                  task_id: newTaskId,
                  etapa: etapaMap[stage], // Usar etapa en español
                  storage_id: storageId,
                  file_name: photo.file.name,
                  file_size: photo.file.size,
                  mime_type: photo.file.type,
                });

                console.log(`✅ Foto ${etapaMap[stage]} subida exitosamente`);
              } catch (photoError) {
                console.error(`❌ Error uploading ${etapaMap[stage]} photo:`, photoError);
              }
            }
          }

          // Si se creó con estado "completada", generar el reporte directamente
          if (formData.estado === 'completada') {
            console.log('📋 Creando reporte para tarea nueva completada');
            await createReportMutation({
              task_id: newTaskId,
              titulo: taskData.titulo,
              descripcion: taskData.descripcion,
              tipo: taskData.tipo,
              fecha_programada: taskData.fecha_programada,
              fecha_completada: new Date().toISOString().split('T')[0],
              costo: operationalData.total_estimated_cost || 0,
              observaciones: operationalData.technical_observations || '',
              usuario_completo: 'Admin'
            });
            console.log('✅ Reporte creado exitosamente');
          }
        }
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
    // Si ya existe una tarea, subir directamente a Convex
    if (task && task._id) {
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
          etapa: etapaMap[stage], // Usar etapa en español
          storage_id: storageId,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
        });

        console.log(`✅ Foto ${etapaMap[stage]} subida exitosamente:`, photoId);
      } catch (error) {
        console.error('❌ Error uploading photo:', error);
        alert('Error al subir la foto: ' + error.message);
      } finally {
        setUploadingPhotos(false);
      }
    } else {
      // Si no existe tarea aún, guardar foto localmente con preview
      const preview = URL.createObjectURL(file);
      setPhotos(prev => ({
        ...prev,
        [stage]: [...prev[stage], { file, preview, isLocal: true }]
      }));
      console.log('📸 Foto agregada localmente, se subirá al crear la tarea');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Distribuir fotos automáticamente en orden: Antes → Durante → Después
  const handleDrop = async (e) => {
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

    // Filtrar solo imágenes/videos válidos
    const validFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));

    // Distribuir automáticamente en los slots vacíos
    const categories = ['before', 'during', 'after'];
    let fileIndex = 0;

    for (const category of categories) {
      if (fileIndex >= validFiles.length) break;
      if (photos[category].length === 0) {
        await handlePhotoUpload(validFiles[fileIndex], category);
        fileIndex++;
      }
    }

    // Si aún quedan archivos pero no hay slots, avisar
    if (fileIndex < validFiles.length) {
      console.log('⚠️ Ya hay fotos en todas las categorías (máx 1 por categoría)');
    }
  };

  // Pegar imagen automáticamente en el siguiente slot disponible
  const handlePaste = async (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          const nextCategory = getNextAvailableCategory();
          if (nextCategory) {
            await handlePhotoUpload(file, nextCategory);
          } else {
            console.log('⚠️ Ya hay fotos en todas las categorías');
          }
        }
      }
    }
  };

  // Subir foto a una categoría específica (cuando se hace clic en un slot individual)
  const handlePhotoUploadToCategory = async (file, category) => {
    if (photos[category].length > 0) {
      console.log(`⚠️ Ya hay una foto en ${category}`);
      return;
    }
    await handlePhotoUpload(file, category);
  };

  const removePhoto = async (stage, index) => {
    const photo = photos[stage][index];
    if (!photo) return;

    // Si es foto local, remover del estado y liberar preview URL
    if (photo.isLocal) {
      if (photo.preview) {
        URL.revokeObjectURL(photo.preview);
      }
      setPhotos(prev => ({
        ...prev,
        [stage]: prev[stage].filter((_, i) => i !== index)
      }));
      console.log('✅ Foto local eliminada');
    }
    // Si es foto de Convex, eliminar de BD
    else if (photo.id) {
      try {
        await deletePhotoMutation({ id: photo.id });
        console.log('✅ Foto eliminada exitosamente');
      } catch (error) {
        console.error('❌ Error deleting photo:', error);
        alert('Error al eliminar la foto: ' + error.message);
      }
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
                  color: selectedPackage ? 'var(--color-primary)' : '#64748b'
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

          {/* Título */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>
              Título de la Tarea *
            </label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              disabled={viewMode}
              placeholder="Ej: Mantenimiento preventivo mensual"
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
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
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
                value={formData.fecha_programada}
                onChange={(e) => setFormData({ ...formData, fecha_programada: e.target.value })}
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
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
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
                <option value="pendiente">Pendiente</option>
                <option value="en_progreso">En Progreso</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          </div>

          {/* Observaciones/Descripción */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
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
                    border: '2px solid var(--color-primary)',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '700',
                    background: '#f0f4e8',
                    color: 'var(--color-primary)',
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

          {/* Sección de Evidencia Fotográfica - Simplificada */}
          {!viewMode && isAdmin && (
            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '24px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <ImageIcon size={22} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#1f2937' }}>
                  Evidencia Fotográfica
                </h3>
                <span style={{
                  fontSize: '12px',
                  background: photos.before.length && photos.during.length && photos.after.length ? '#dcfce7' : '#fef3c7',
                  color: photos.before.length && photos.during.length && photos.after.length ? '#166534' : '#92400e',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontWeight: '600'
                }}>
                  {(photos.before.length > 0 ? 1 : 0) + (photos.during.length > 0 ? 1 : 0) + (photos.after.length > 0 ? 1 : 0)}/3
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                Arrastra o haz clic en cada casilla. Se asignan automáticamente: Antes → Durante → Después
              </p>

              {/* 3 Slots visuales en fila */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px'
              }}>
                {/* Slot ANTES */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file && photos.before.length === 0) {
                      handlePhotoUpload(file, 'before');
                    }
                  }}
                  onClick={() => photos.before.length === 0 && document.getElementById('file-before').click()}
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    border: photos.before.length > 0 ? '2px solid #22c55e' : '2px dashed #94a3b8',
                    borderRadius: '12px',
                    cursor: photos.before.length > 0 ? 'default' : 'pointer',
                    background: photos.before.length > 0 ? '#f0fdf4' : 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    overflow: 'hidden',
                    transition: 'all 0.2s'
                  }}
                >
                  {photos.before.length > 0 ? (
                    <>
                      <img
                        src={photos.before[0].url || photos.before[0].preview}
                        alt="Antes"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removePhoto('before', 0); }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(239, 68, 68, 0.9)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }}
                      >
                        <X size={16} />
                      </button>
                      <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        right: '0',
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                        padding: '20px 10px 10px',
                        textAlign: 'center'
                      }}>
                        <span style={{ color: 'white', fontWeight: '600', fontSize: '13px' }}>ANTES</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: '#fee2e2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <span style={{ fontSize: '20px', fontWeight: '700', color: '#dc2626' }}>1</span>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626' }}>ANTES</span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>Clic o arrastra</span>
                    </>
                  )}
                </div>
                <input
                  id="file-before"
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], 'before')}
                  style={{ display: 'none' }}
                />

                {/* Slot DURANTE */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file && photos.during.length === 0) {
                      handlePhotoUpload(file, 'during');
                    }
                  }}
                  onClick={() => photos.during.length === 0 && document.getElementById('file-during').click()}
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    border: photos.during.length > 0 ? '2px solid #22c55e' : '2px dashed #94a3b8',
                    borderRadius: '12px',
                    cursor: photos.during.length > 0 ? 'default' : 'pointer',
                    background: photos.during.length > 0 ? '#f0fdf4' : 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    overflow: 'hidden',
                    transition: 'all 0.2s'
                  }}
                >
                  {photos.during.length > 0 ? (
                    <>
                      <img
                        src={photos.during[0].url || photos.during[0].preview}
                        alt="Durante"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removePhoto('during', 0); }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(239, 68, 68, 0.9)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }}
                      >
                        <X size={16} />
                      </button>
                      <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        right: '0',
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                        padding: '20px 10px 10px',
                        textAlign: 'center'
                      }}>
                        <span style={{ color: 'white', fontWeight: '600', fontSize: '13px' }}>DURANTE</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: '#fef3c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <span style={{ fontSize: '20px', fontWeight: '700', color: '#d97706' }}>2</span>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#d97706' }}>DURANTE</span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>Clic o arrastra</span>
                    </>
                  )}
                </div>
                <input
                  id="file-during"
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], 'during')}
                  style={{ display: 'none' }}
                />

                {/* Slot DESPUÉS */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file && photos.after.length === 0) {
                      handlePhotoUpload(file, 'after');
                    }
                  }}
                  onClick={() => photos.after.length === 0 && document.getElementById('file-after').click()}
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    border: photos.after.length > 0 ? '2px solid #22c55e' : '2px dashed #94a3b8',
                    borderRadius: '12px',
                    cursor: photos.after.length > 0 ? 'default' : 'pointer',
                    background: photos.after.length > 0 ? '#f0fdf4' : 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    overflow: 'hidden',
                    transition: 'all 0.2s'
                  }}
                >
                  {photos.after.length > 0 ? (
                    <>
                      <img
                        src={photos.after[0].url || photos.after[0].preview}
                        alt="Después"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removePhoto('after', 0); }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(239, 68, 68, 0.9)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }}
                      >
                        <X size={16} />
                      </button>
                      <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        right: '0',
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                        padding: '20px 10px 10px',
                        textAlign: 'center'
                      }}>
                        <span style={{ color: 'white', fontWeight: '600', fontSize: '13px' }}>DESPUÉS</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: '#dcfce7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <span style={{ fontSize: '20px', fontWeight: '700', color: '#16a34a' }}>3</span>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a' }}>DESPUÉS</span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>Clic o arrastra</span>
                    </>
                  )}
                </div>
                <input
                  id="file-after"
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], 'after')}
                  style={{ display: 'none' }}
                />
              </div>

              {uploadingPhotos && (
                <div style={{
                  padding: '12px',
                  background: '#f0f9ff',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#0369a1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '12px'
                }}>
                  <Upload size={16} />
                  Subiendo foto...
                </div>
              )}

              {/* Mensaje de éxito cuando están las 3 fotos */}
              {photos.before.length > 0 && photos.during.length > 0 && photos.after.length > 0 && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  background: '#dcfce7',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <Check size={20} style={{ color: '#16a34a' }} />
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#166534' }}>
                    Evidencia fotográfica completa
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Imágenes - mostrar si existen */}
          {viewMode && task && (task.images_before?.length > 0 || task.images_during?.length > 0 || task.images_after?.length > 0) && (
            <div style={{
              borderTop: '2px solid #e2e8f0',
              paddingTop: '24px',
              marginBottom: '20px',
              background: 'var(--color-surface)',
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
                <ImageIcon size={22} style={{ color: 'var(--color-primary)' }} />
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
                    background: 'var(--shadow-xs)',
                    borderRadius: '8px',
                    width: 'fit-content'
                  }}>
                    <ImageIcon size={16} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-primary)' }}>Antes</span>
                    <span style={{
                      fontSize: '12px',
                      background: 'var(--color-primary)',
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
                    background: 'var(--shadow-xs)',
                    borderRadius: '8px',
                    width: 'fit-content'
                  }}>
                    <ImageIcon size={16} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-primary)' }}>Durante</span>
                    <span style={{
                      fontSize: '12px',
                      background: 'var(--color-primary)',
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
                    background: 'var(--shadow-xs)',
                    borderRadius: '8px',
                    width: 'fit-content'
                  }}>
                    <ImageIcon size={16} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-primary)' }}>Después</span>
                    <span style={{
                      fontSize: '12px',
                      background: 'var(--color-primary)',
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
                  background: loading ? '#94a3b8' : 'var(--color-primary)',
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
                  : formData.estado === 'completada' && task
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
