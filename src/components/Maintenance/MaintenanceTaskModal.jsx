import { useState, useEffect } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { useAuth } from '../../context/AuthContext';
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { X, Upload, Image as ImageIcon, Check, Trash2, Save, Wrench } from '../Icons';
import { MAINTENANCE_PRESETS } from '../../constants/maintenancePresets';
import { Modal } from '../UI';
import toast from 'react-hot-toast';
import { handleMutationError } from '../../utils/mutationError';
import './MaintenanceTaskModal.css';

const MaintenanceTaskModal = ({ task, viewMode, userRole, onClose }) => {
  const { addTask, updateTask, deleteTask, completeTask } = useMaintenance();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isEnterprise = userRole === 'enterprise';
  // readOnly = vista de detalle O usuario sin permisos de escritura (defense-in-depth)
  const readOnly = viewMode || !isAdmin;

  // Convex mutations y queries para fotos
  const generateUploadUrl = useMutation(api.maintenance.generateUploadUrl);
  const savePhoto = useMutation(api.maintenance.savePhoto);
  const deletePhotoMutation = useMutation(api.maintenance.deletePhoto);
  const createReportMutation = useMutation(api.maintenance.createReport);
  const photosData = useQuery(
    api.maintenance.listPhotos,
    task?._id ? { task_id: task._id } : "skip"
  );

  // Load volume presets from database
  const volumePresets = useQuery(api.maintenance.listVolumePresets, {
    user_email: user?.email || ''
  });
  const createVolumePreset = useMutation(api.maintenance.createVolumePreset);
  const deleteVolumePreset = useMutation(api.maintenance.deleteVolumePreset);

  const [formData, setFormData] = useState({
    titulo: task?.titulo || '',
    tipo: task?.tipo || 'preventivo',
    prioridad: task?.prioridad || 'media',
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
  const [selectedPresetId, setSelectedPresetId] = useState('');

  // Estados para "Save Preset" dialog
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false);
  const [newPresetLabel, setNewPresetLabel] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');

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
    if (!presetId) {
      // Manual mode - reset preset selection
      setSelectedPresetId('');
      return;
    }

    setSelectedPresetId(presetId);

    // Find preset in loaded list (database presets, not hardcoded array)
    const preset = volumePresets?.find(p => p._id === presetId);
    if (!preset) return;

    setOperationalData(prev => ({
      ...prev,
      volume_discharged: preset.volume_gallons,
      cost_per_gallon: preset.cost_per_gallon,
      total_estimated_cost: preset.total_cost
    }));
  };

  // Handler para guardar preset personalizado
  const handleSavePreset = async () => {
    if (!newPresetLabel.trim()) {
      toast.error('Por favor ingresa un nombre para el preset');
      return;
    }

    try {
      await createVolumePreset({
        label: newPresetLabel.trim(),
        volume_gallons: operationalData.volume_discharged,
        cost_per_gallon: operationalData.cost_per_gallon,
        total_cost: operationalData.total_estimated_cost,
        description: newPresetDescription.trim() || undefined,
        created_by: user?.email || 'unknown',
        is_global: false // Personal preset by default
      });

      toast.success('Preset guardado exitosamente');
      setShowSavePresetDialog(false);
      setNewPresetLabel('');
      setNewPresetDescription('');
    } catch (error) {
      console.error('Error saving preset:', error);
      toast.error('Error al guardar preset');
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
        prioridad: formData.prioridad || 'media',
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
          console.log('Completando tarea y creando reporte:', reportData);
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

        if (!result.success) {
          toast.error(result.error || 'Error al crear la tarea');
          setLoading(false);
          return;
        }

        // Si se creó exitosamente y hay fotos locales, subirlas
        if (result._id) {
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

                console.log(`Foto ${etapaMap[stage]} subida exitosamente`);
              } catch (photoError) {
                console.error(`Error uploading ${etapaMap[stage]} photo:`, photoError);
              }
            }
          }

          // Si se creó con estado "completada", generar el reporte directamente
          if (formData.estado === 'completada') {
            console.log('Creando reporte para tarea nueva completada');
            await createReportMutation({
              task_id: newTaskId,
              titulo: taskData.titulo,
              descripcion: taskData.descripcion,
              tipo: taskData.tipo,
              prioridad: formData.prioridad || 'media',
              fecha_programada: taskData.fecha_programada,
              fecha_completada: new Date().toISOString().split('T')[0],
              costo: operationalData.total_estimated_cost || 0,
              observaciones: operationalData.technical_observations || '',
              usuario_completo: 'Admin'
            });
            console.log('Reporte creado exitosamente');
          }
        }

        toast.success('Tarea creada exitosamente');
      }

      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
      handleMutationError(error, 'Error al guardar la tarea');
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

        console.log(`Foto ${etapaMap[stage]} subida exitosamente:`, photoId);
      } catch (error) {
        console.error('Error uploading photo:', error);
        handleMutationError(error, 'Error al subir la foto');
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
      console.log('Foto agregada localmente, se subirá al crear la tarea');
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
      console.log('Ya hay fotos en todas las categorías (máx 1 por categoría)');
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
            console.log('Ya hay fotos en todas las categorías');
          }
        }
      }
    }
  };

  // Subir foto a una categoría específica (cuando se hace clic en un slot individual)
  const handlePhotoUploadToCategory = async (file, category) => {
    if (photos[category].length > 0) {
      console.log(`Ya hay una foto en ${category}`);
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
      console.log('Foto local eliminada');
    }
    // Si es foto de Convex, eliminar de BD
    else if (photo.id) {
      try {
        await deletePhotoMutation({ id: photo.id });
        console.log('Foto eliminada exitosamente');
      } catch (error) {
        console.error('Error deleting photo:', error);
        handleMutationError(error, 'Error al eliminar la foto');
      }
    }
  };

  const modalTitle = viewMode ? 'Detalles de Tarea' : task ? 'Editar Tarea' : 'Nueva Tarea de Mantenimiento';

  return (
    <Modal open onClose={onClose} size="lg" variant="form" ariaLabelledBy="maintenance-task-modal-title">
      <Modal.Header icon={<Wrench size={18} />} onClose={onClose} id="maintenance-task-modal-title">
        {modalTitle}
      </Modal.Header>
      <Modal.Body className="maintenance-task-modal__body">
        <form id="maintenance-task-form" onSubmit={handleSubmit} className="maintenance-task-modal__form">
          {/* Paquete de Mantenimiento - Compacto */}
          {!readOnly && (
            <div className="maintenance-task-modal__field-group">
              <label className="maintenance-task-modal__label">
                Paquete de Mantenimiento (Opcional)
              </label>
              <select
                value={selectedPackage}
                onChange={(e) => handlePackageSelect(e.target.value)}
                className={`maintenance-task-modal__select maintenance-task-modal__select--package ${selectedPackage ? 'maintenance-task-modal__select--package-active' : 'maintenance-task-modal__select--package-inactive'}`}
              >
                <option value="">Personalizado</option>
                {MAINTENANCE_PRESETS.maintenancePackages.map(pkg => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.label} ({(pkg.estimatedDuration / 60).toFixed(1)}h)
                  </option>
                ))}
              </select>
              {selectedPackage && (
                <p className="maintenance-task-modal__hint">
                  {MAINTENANCE_PRESETS.maintenancePackages.find(p => p.id === selectedPackage)?.description}
                </p>
              )}
            </div>
          )}

          {/* Título */}
          <div className="maintenance-task-modal__field-group">
            <label className="maintenance-task-modal__label">
              Título de la Tarea *
            </label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              disabled={readOnly}
              placeholder="Ej: Mantenimiento preventivo mensual"
              className="maintenance-task-modal__input"
              required
            />
          </div>

          {/* Información Básica - Grid compacto */}
          <div className="maintenance-task-modal__grid">
            {/* Tipo de Mantenimiento */}
            <div>
              <label className="maintenance-task-modal__label">
                Tipo
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                disabled={readOnly}
                className="maintenance-task-modal__select"
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
              <label className="maintenance-task-modal__label">
                Fecha
              </label>
              <input
                type="date"
                value={formData.fecha_programada}
                onChange={(e) => setFormData({ ...formData, fecha_programada: e.target.value })}
                disabled={readOnly}
                className="maintenance-task-modal__input"
                required
              />
            </div>

            {/* Hora */}
            <div>
              <label className="maintenance-task-modal__label">
                Hora
              </label>
              <input
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                disabled={readOnly}
                className="maintenance-task-modal__input"
              />
            </div>

            {/* Estado */}
            <div>
              <label className="maintenance-task-modal__label">
                Estado
              </label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                disabled={readOnly}
                className="maintenance-task-modal__select"
                required
              >
                <option value="pendiente">Pendiente</option>
                <option value="en_progreso">En Progreso</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>

            {/* Prioridad */}
            <div>
              <label className="maintenance-task-modal__label">
                Prioridad
              </label>
              <select
                value={formData.prioridad}
                onChange={(e) => setFormData({ ...formData, prioridad: e.target.value })}
                disabled={readOnly}
                className="maintenance-task-modal__select"
                required
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>

          {/* Observaciones/Descripción */}
          <div className="maintenance-task-modal__field-group--large">
            <label className="maintenance-task-modal__label">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              disabled={readOnly}
              rows={2}
              className="maintenance-task-modal__textarea"
              placeholder="Descripción general de la tarea..."
            />
          </div>

          {/* Datos Operativos */}
          <div className="maintenance-task-modal__operational-section">
            <h3 className="maintenance-task-modal__section-title">
              Datos Operativos
            </h3>

            {/* Preset de Volumen - Compacto */}
            {!readOnly && (
              <div className="maintenance-task-modal__field-group--compact">
                <label className="maintenance-task-modal__label--small">
                  Preset de Volumen (Opcional)
                </label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => handleVolumePresetSelect(e.target.value)}
                  className="maintenance-task-modal__select maintenance-task-modal__select--small"
                >
                  <option value="">Manual</option>
                  {(volumePresets || []).map(preset => (
                    <option key={preset._id} value={preset._id}>
                      {preset.is_custom ? '[Custom] ' : ''}{preset.label} ({preset.volume_gallons.toLocaleString()} gal, B/.{preset.total_cost.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="maintenance-task-modal__grid--operational">
              <div>
                <label className="maintenance-task-modal__label--small">
                  Volumen (gal)
                </label>
                <input
                  type="number"
                  value={operationalData.volume_discharged}
                  onChange={(e) => setOperationalData({ ...operationalData, volume_discharged: parseFloat(e.target.value) || 0 })}
                  disabled={readOnly}
                  className="maintenance-task-modal__input maintenance-task-modal__input--operational"
                />
              </div>

              <div>
                <label className="maintenance-task-modal__label--small">
                  Costo/Gal (B/.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={operationalData.cost_per_gallon}
                  onChange={(e) => setOperationalData({ ...operationalData, cost_per_gallon: parseFloat(e.target.value) || 0.11 })}
                  disabled={readOnly}
                  className="maintenance-task-modal__input maintenance-task-modal__input--operational"
                />
              </div>

              <div>
                <label className="maintenance-task-modal__label--small">
                  Total (B/.)
                </label>
                <input
                  type="text"
                  value={`B/. ${operationalData.total_estimated_cost?.toFixed(2)}`}
                  readOnly
                  className="maintenance-task-modal__input maintenance-task-modal__input--total"
                />
              </div>

              <div>
                <label className="maintenance-task-modal__label--small">
                  Duración (h)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={operationalData.work_duration}
                  onChange={(e) => setOperationalData({ ...operationalData, work_duration: parseFloat(e.target.value) || 0 })}
                  disabled={readOnly}
                  className="maintenance-task-modal__input maintenance-task-modal__input--operational"
                />
              </div>
            </div>

            <div>
              <label className="maintenance-task-modal__label--small">
                Tareas Técnicas
              </label>
              <textarea
                value={operationalData.technical_observations}
                onChange={(e) => setOperationalData({ ...operationalData, technical_observations: e.target.value })}
                disabled={readOnly}
                rows={2}
                className="maintenance-task-modal__textarea maintenance-task-modal__textarea--small"
                placeholder="Ej: Succión completa, limpieza de paredes, extracción de grasa..."
              />
            </div>

            {/* Save as Preset Button (only in Manual mode) */}
            {!readOnly && !selectedPresetId && (
              <div className="maintenance-task-modal__save-preset-container">
                <button
                  type="button"
                  onClick={() => setShowSavePresetDialog(true)}
                  disabled={!operationalData.volume_discharged || !operationalData.cost_per_gallon}
                  className={`maintenance-task-modal__save-preset-btn ${
                    operationalData.volume_discharged && operationalData.cost_per_gallon
                      ? 'maintenance-task-modal__save-preset-btn--active'
                      : 'maintenance-task-modal__save-preset-btn--disabled'
                  }`}
                >
                  <Save size={16} />
                  Guardar como Preset
                </button>
              </div>
            )}
          </div>

          {/* Sección de Evidencia Fotográfica - Simplificada */}
          {!viewMode && isAdmin && (
            <div className="maintenance-task-modal__photo-section">
              <div className="maintenance-task-modal__photo-header">
                <ImageIcon size={22} style={{ color: 'var(--color-primary)' }} />
                <h3 className="maintenance-task-modal__photo-title">
                  Evidencia Fotográfica
                </h3>
                <span className={`maintenance-task-modal__photo-counter ${
                  photos.before.length && photos.during.length && photos.after.length
                    ? 'maintenance-task-modal__photo-counter--complete'
                    : 'maintenance-task-modal__photo-counter--incomplete'
                }`}>
                  {(photos.before.length > 0 ? 1 : 0) + (photos.during.length > 0 ? 1 : 0) + (photos.after.length > 0 ? 1 : 0)}/3
                </span>
              </div>
              <p className="maintenance-task-modal__photo-description">
                Arrastra o haz clic en cada casilla. Se asignan automáticamente: Antes &rarr; Durante &rarr; Después
              </p>

              {/* 3 Slots visuales en fila */}
              <div className="maintenance-task-modal__photo-grid">
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
                  className={`maintenance-task-modal__photo-slot ${
                    photos.before.length > 0
                      ? 'maintenance-task-modal__photo-slot--filled'
                      : 'maintenance-task-modal__photo-slot--empty'
                  }`}
                >
                  {photos.before.length > 0 ? (
                    <>
                      <img
                        src={photos.before[0].url || photos.before[0].preview}
                        alt="Antes"
                        className="maintenance-task-modal__photo-image"
                      />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removePhoto('before', 0); }}
                        className="maintenance-task-modal__photo-remove-btn"
                      >
                        <X size={16} />
                      </button>
                      <div className="maintenance-task-modal__photo-overlay">
                        <span className="maintenance-task-modal__photo-overlay-label">ANTES</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="maintenance-task-modal__photo-number maintenance-task-modal__photo-number--before">
                        <span className="maintenance-task-modal__photo-number-text maintenance-task-modal__photo-number-text--before">1</span>
                      </div>
                      <span className="maintenance-task-modal__photo-slot-label maintenance-task-modal__photo-slot-label--before">ANTES</span>
                      <span className="maintenance-task-modal__photo-slot-hint">Clic o arrastra</span>
                    </>
                  )}
                </div>
                <input
                  id="file-before"
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], 'before')}
                  className="maintenance-task-modal__file-input"
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
                  className={`maintenance-task-modal__photo-slot ${
                    photos.during.length > 0
                      ? 'maintenance-task-modal__photo-slot--filled'
                      : 'maintenance-task-modal__photo-slot--empty'
                  }`}
                >
                  {photos.during.length > 0 ? (
                    <>
                      <img
                        src={photos.during[0].url || photos.during[0].preview}
                        alt="Durante"
                        className="maintenance-task-modal__photo-image"
                      />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removePhoto('during', 0); }}
                        className="maintenance-task-modal__photo-remove-btn"
                      >
                        <X size={16} />
                      </button>
                      <div className="maintenance-task-modal__photo-overlay">
                        <span className="maintenance-task-modal__photo-overlay-label">DURANTE</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="maintenance-task-modal__photo-number maintenance-task-modal__photo-number--during">
                        <span className="maintenance-task-modal__photo-number-text maintenance-task-modal__photo-number-text--during">2</span>
                      </div>
                      <span className="maintenance-task-modal__photo-slot-label maintenance-task-modal__photo-slot-label--during">DURANTE</span>
                      <span className="maintenance-task-modal__photo-slot-hint">Clic o arrastra</span>
                    </>
                  )}
                </div>
                <input
                  id="file-during"
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], 'during')}
                  className="maintenance-task-modal__file-input"
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
                  className={`maintenance-task-modal__photo-slot ${
                    photos.after.length > 0
                      ? 'maintenance-task-modal__photo-slot--filled'
                      : 'maintenance-task-modal__photo-slot--empty'
                  }`}
                >
                  {photos.after.length > 0 ? (
                    <>
                      <img
                        src={photos.after[0].url || photos.after[0].preview}
                        alt="Después"
                        className="maintenance-task-modal__photo-image"
                      />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removePhoto('after', 0); }}
                        className="maintenance-task-modal__photo-remove-btn"
                      >
                        <X size={16} />
                      </button>
                      <div className="maintenance-task-modal__photo-overlay">
                        <span className="maintenance-task-modal__photo-overlay-label">DESPUÉS</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="maintenance-task-modal__photo-number maintenance-task-modal__photo-number--after">
                        <span className="maintenance-task-modal__photo-number-text maintenance-task-modal__photo-number-text--after">3</span>
                      </div>
                      <span className="maintenance-task-modal__photo-slot-label maintenance-task-modal__photo-slot-label--after">DESPUÉS</span>
                      <span className="maintenance-task-modal__photo-slot-hint">Clic o arrastra</span>
                    </>
                  )}
                </div>
                <input
                  id="file-after"
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], 'after')}
                  className="maintenance-task-modal__file-input"
                />
              </div>

              {uploadingPhotos && (
                <div className="maintenance-task-modal__upload-status">
                  <Upload size={16} />
                  Subiendo foto...
                </div>
              )}

              {/* Mensaje de éxito cuando están las 3 fotos */}
              {photos.before.length > 0 && photos.during.length > 0 && photos.after.length > 0 && (
                <div className="maintenance-task-modal__photo-complete">
                  <Check size={20} style={{ color: 'var(--color-success-dark)' }} />
                  <span className="maintenance-task-modal__photo-complete-text">
                    Evidencia fotográfica completa
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Imágenes - mostrar si existen */}
          {viewMode && task && (task.images_before?.length > 0 || task.images_during?.length > 0 || task.images_after?.length > 0) && (
            <div className="maintenance-task-modal__view-photos">
              <div className="maintenance-task-modal__view-photos-header">
                <ImageIcon size={22} style={{ color: 'var(--color-primary)' }} />
                Evidencia Fotográfica del Mantenimiento
              </div>

              {/* Sección Antes */}
              {task.images_before && task.images_before.length > 0 && (
                <div className="maintenance-task-modal__view-stage">
                  <div className="maintenance-task-modal__view-stage-label">
                    <ImageIcon size={16} style={{ color: 'var(--color-primary)' }} />
                    <span className="maintenance-task-modal__view-stage-name">Antes</span>
                    <span className="maintenance-task-modal__view-stage-count">
                      {task.images_before.length}
                    </span>
                  </div>
                  <div className="maintenance-task-modal__view-image-grid">
                    {task.images_before.map((url, index) => (
                      <div key={index} className="maintenance-task-modal__view-image-card">
                        <img
                          src={url}
                          alt={`Antes ${index + 1}`}
                          className="maintenance-task-modal__view-image"
                          onClick={() => window.open(url, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sección Durante */}
              {task.images_during && task.images_during.length > 0 && (
                <div className="maintenance-task-modal__view-stage">
                  <div className="maintenance-task-modal__view-stage-label">
                    <ImageIcon size={16} style={{ color: 'var(--color-primary)' }} />
                    <span className="maintenance-task-modal__view-stage-name">Durante</span>
                    <span className="maintenance-task-modal__view-stage-count">
                      {task.images_during.length}
                    </span>
                  </div>
                  <div className="maintenance-task-modal__view-image-grid">
                    {task.images_during.map((url, index) => (
                      <div key={index} className="maintenance-task-modal__view-image-card">
                        <img
                          src={url}
                          alt={`Durante ${index + 1}`}
                          className="maintenance-task-modal__view-image"
                          onClick={() => window.open(url, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sección Después */}
              {task.images_after && task.images_after.length > 0 && (
                <div className="maintenance-task-modal__view-stage">
                  <div className="maintenance-task-modal__view-stage-label">
                    <ImageIcon size={16} style={{ color: 'var(--color-primary)' }} />
                    <span className="maintenance-task-modal__view-stage-name">Después</span>
                    <span className="maintenance-task-modal__view-stage-count">
                      {task.images_after.length}
                    </span>
                  </div>
                  <div className="maintenance-task-modal__view-image-grid">
                    {task.images_after.map((url, index) => (
                      <div key={index} className="maintenance-task-modal__view-image-card">
                        <img
                          src={url}
                          alt={`Después ${index + 1}`}
                          className="maintenance-task-modal__view-image"
                          onClick={() => window.open(url, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </form>
      </Modal.Body>
      {!viewMode && isAdmin && (
        <Modal.Footer>
          <button
            type="button"
            onClick={onClose}
            className="maintenance-task-modal__btn-cancel"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="maintenance-task-form"
            disabled={loading}
            className="maintenance-task-modal__btn-submit"
          >
            {loading
              ? 'Guardando...'
              : formData.estado === 'completada' && task
                ? 'Completar Tarea'
                : task
                  ? 'Actualizar Tarea'
                  : 'Crear Tarea'}
          </button>
        </Modal.Footer>
      )}

      {/* Save Preset Dialog */}
      {showSavePresetDialog && (
        <div className="maintenance-task-modal__preset-overlay">
          <div className="maintenance-task-modal__preset-dialog">
            <h3 className="maintenance-task-modal__preset-title">
              Guardar Preset Personalizado
            </h3>

            <div className="maintenance-task-modal__preset-field">
              <label className="maintenance-task-modal__preset-label">
                Nombre del Preset *
              </label>
              <input
                type="text"
                value={newPresetLabel}
                onChange={(e) => setNewPresetLabel(e.target.value)}
                placeholder="Ej: Mi Descarga Personalizada"
                className="maintenance-task-modal__preset-input"
              />
            </div>

            <div className="maintenance-task-modal__preset-field">
              <label className="maintenance-task-modal__preset-label">
                Descripción (Opcional)
              </label>
              <textarea
                value={newPresetDescription}
                onChange={(e) => setNewPresetDescription(e.target.value)}
                placeholder="Ej: Descarga especial para vehículos grandes"
                rows={3}
                className="maintenance-task-modal__preset-textarea"
              />
            </div>

            <div className="maintenance-task-modal__preset-actions">
              <button
                type="button"
                onClick={() => {
                  setShowSavePresetDialog(false);
                  setNewPresetLabel('');
                  setNewPresetDescription('');
                }}
                className="maintenance-task-modal__preset-btn-cancel"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePreset}
                disabled={!newPresetLabel.trim()}
                className={`maintenance-task-modal__preset-btn-save ${
                  newPresetLabel.trim()
                    ? 'maintenance-task-modal__preset-btn-save--active'
                    : 'maintenance-task-modal__preset-btn-save--disabled'
                }`}
              >
                Guardar Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default MaintenanceTaskModal;
