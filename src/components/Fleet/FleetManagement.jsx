import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useFleet } from '../../context/FleetContext';
import { Truck, Plus, X, Play, Satellite, Edit3, Trash2, MapPin, Clock, Check } from '../Icons';
import RoutePlayback from '../SafeTag/RoutePlayback';
import { ConfirmDialog } from '../UI';
import VinDecoder from './VinDecoder';
import ModelAutocomplete from './ModelAutocomplete';
import './FleetManagement.css';

// Tipos de vehículo soportados (alineados con schema vehiculos.tipo_vehiculo)
const TIPOS_VEHICULO = [
  { value: '', label: '-- Seleccionar --' },
  { value: 'compactador', label: 'Compactador (basura)' },
  { value: 'barredora', label: 'Barredora vial' },
  { value: 'fumigadora', label: 'Fumigadora' },
  { value: 'cisterna', label: 'Cisterna' },
  { value: 'camion_carga', label: 'Camión de carga' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'bus', label: 'Bus' },
];

// equipment_class por defecto según tipo_vehiculo
function inferEquipmentClass(tipoVehiculo) {
  const map = {
    compactador: 'compactador',
    camion_carga: 'compactador',
    bus: 'compactador',
    pickup: 'compactador',
    barredora: 'barredora',
    cisterna: 'cisterna',
    fumigadora: 'fumigadora',
  };
  return map[tipoVehiculo] ?? null;
}

const FleetManagement = ({ userRole = 'admin' }) => {
  const { vehicles, addVehicle, updateVehicle, deleteVehicle } = useFleet();
  const canWrite = userRole === 'admin' || userRole === 'super_admin';

  // Estados del modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [editingVehicle, setEditingVehicle] = useState(null);
  
  // Estado para reproducción GPS
  const [playbackVehicle, setPlaybackVehicle] = useState(null);
  // Confirm dialog para delete
  const [vehicleToDelete, setVehicleToDelete] = useState(null);

  // Estado del formulario — ahora con marca/modelo/año/tipo
  const [formData, setFormData] = useState({
    nombre: '',
    placa: '',
    safetagDeviceId: '',
    marca: '',
    modelo: '',
    anio: '',
    tipo_vehiculo: '',
  });
  // Mutations KB upsert
  const upsertMake = useMutation(api.makes.upsert);
  const upsertModel = useMutation(api.models.upsert);
  const upsertModelYear = useMutation(api.modelYears.upsert);

  // Estados de UI
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estadísticas
  const totalVehicles = vehicles.length;
  const vehiclesWithGPS = vehicles.filter(v => v.safetag_device_id || v.gps_imei).length;
  const vehiclesOnline = vehicles.filter(v => v.gps_en_linea).length;

  // Abrir modal para agregar
  const handleOpenAddModal = () => {
    setModalMode('add');
    setEditingVehicle(null);
    setFormData({ nombre: '', placa: '', safetagDeviceId: '', marca: '', modelo: '', anio: '', tipo_vehiculo: '' });
    setSubmitError(null);
    setShowModal(true);
  };

  // Abrir modal para editar
  const handleOpenEditModal = (vehicle) => {
    setModalMode('edit');
    setEditingVehicle(vehicle);
    setFormData({
      nombre: vehicle.nombre || '',
      placa: vehicle.placa || '',
      safetagDeviceId: vehicle.safetag_device_id || vehicle.gps_imei || '',
      marca: vehicle.marca || '',
      modelo: vehicle.modelo || '',
      anio: vehicle.anio ? String(vehicle.anio) : '',
      tipo_vehiculo: vehicle.tipo_vehiculo || '',
    });
    setSubmitError(null);
    setShowModal(true);
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingVehicle(null);
    setFormData({ nombre: '', placa: '', safetagDeviceId: '', marca: '', modelo: '', anio: '', tipo_vehiculo: '' });
    setSubmitError(null);
  };

  // Escape key closes modal (a11y + parity with overlay/X button)
  useEffect(() => {
    if (!showModal) return;
    const onKey = (e) => { if (e.key === 'Escape') handleCloseModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showModal]);

  // Manejar cambios en inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (submitError) setSubmitError(null);

    // Validar IMEI (solo números, máximo 15)
    if (name === 'safetagDeviceId') {
      const cleanedValue = value.replace(/\D/g, '').slice(0, 15);
      setFormData(prev => ({ ...prev, [name]: cleanedValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Guardar (agregar o editar)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const anioNum = formData.anio ? parseInt(formData.anio, 10) : undefined;
      const tipoVeh = formData.tipo_vehiculo || undefined;
      const equipmentClass = inferEquipmentClass(tipoVeh);

      // Upsert KB si hay marca/modelo
      if (formData.marca && formData.modelo && equipmentClass) {
        try {
          const make_id = await upsertMake({ nombre: formData.marca.trim() });
          const model_id = await upsertModel({
            make_id,
            nombre: formData.modelo.trim(),
            equipment_class: equipmentClass,
            tipo_vehiculo_default: tipoVeh,
          });
          if (anioNum) {
            await upsertModelYear({ model_id, year: anioNum });
          }
        } catch (kbErr) {
          console.warn('KB upsert falló (no crítico):', kbErr);
        }
      }

      const payload = {
        nombre: formData.nombre,
        placa: formData.placa,
        marca: formData.marca || undefined,
        modelo: formData.modelo || undefined,
        anio: anioNum,
        tipoVehiculo: tipoVeh,
      };

      if (modalMode === 'add') {
        const result = await addVehicle({
          ...payload,
          safetagDeviceId: formData.safetagDeviceId || undefined,
          tipo_servicio: 'general',
        });

        if (result?.success === false) {
          throw new Error(result.error || 'Error al agregar vehículo');
        }
      } else {
        const result = await updateVehicle(editingVehicle._id || editingVehicle.id, {
          ...payload,
          tipo_vehiculo: tipoVeh,
          safetag_device_id: formData.safetagDeviceId || undefined,
          gps_imei: formData.safetagDeviceId || undefined,
        });

        if (result?.success === false) {
          throw new Error(result.error || 'Error al actualizar vehículo');
        }
      }

      handleCloseModal();
    } catch (error) {
      console.error('Error:', error);
      setSubmitError(error.message || 'Error al procesar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  // VIN decoder callback: autocompleta marca/modelo/año
  const handleVinDecoded = (data) => {
    setFormData(prev => ({
      ...prev,
      marca: prev.marca || data.make || '',
      modelo: prev.modelo || data.model || '',
      anio: prev.anio || (data.year ? String(data.year) : ''),
    }));
  };

  // ModelAutocomplete selection: set kbRefs y tipo_vehiculo_default si disponible
  const handleModelSelect = (modelDoc) => {
    if (modelDoc.tipo_vehiculo_default && !formData.tipo_vehiculo) {
      setFormData(prev => ({ ...prev, tipo_vehiculo: modelDoc.tipo_vehiculo_default }));
    }
  };

  // Eliminar vehículo — abre ConfirmDialog
  const handleDelete = (vehicle) => {
    setVehicleToDelete(vehicle);
  };

  const confirmDeleteVehicle = async () => {
    if (!vehicleToDelete) return;
    try {
      await deleteVehicle(vehicleToDelete._id || vehicleToDelete.id);
      toast.success(`Vehículo ${vehicleToDelete.placa || ''} eliminado`);
      setVehicleToDelete(null);
    } catch (error) {
      console.error('Error eliminando vehículo:', error);
      // Mostrar mensaje completo del backend (e.g. "tiene asignaciones activas")
      const msg = error?.message || error?.data || 'Error desconocido al eliminar vehículo';
      toast.error(msg.replace(/^Uncaught Error:\s*/, ''), { duration: 6000 });
      // No cerrar el modal de confirm si falló — user puede ver el error y decidir
      setVehicleToDelete(null);
    }
  };

  // Formatear última actualización GPS
  const formatLastUpdate = (timestamp) => {
    if (!timestamp) return 'Sin datos';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)} h`;
    return date.toLocaleDateString();
  };

  return (
    <div className="fleet-management-v2">
      {/* Header con estadísticas */}
      <div className="fleet-header-v2">
        <div className="fleet-header-info">
          <div className="fleet-header-icon">
            <Truck size={28} />
          </div>
          <div className="fleet-header-text">
            <h2>Gestión de Flota</h2>
            <p>Administra los vehículos y su conexión GPS</p>
          </div>
        </div>

        <div className="fleet-header-stats">
          <div className="fleet-stat-pill">
            <span className="stat-number">{totalVehicles}</span>
            <span className="stat-label">Vehículos</span>
          </div>
          <div className="fleet-stat-pill success">
            <span className="stat-number">{vehiclesWithGPS}</span>
            <span className="stat-label">Con GPS</span>
          </div>
          <div className="fleet-stat-pill info">
            <span className="stat-number">{vehiclesOnline}</span>
            <span className="stat-label">En línea</span>
          </div>
        </div>

        {canWrite && (
          <button className="btn-add-v2" onClick={handleOpenAddModal}>
            <Plus size={20} />
            <span>Agregar Vehículo</span>
          </button>
        )}
      </div>

      {/* Grid de vehículos */}
      <div className="fleet-grid-v2">
        {vehicles.length === 0 ? (
          <div className="fleet-empty-state">
            <div className="empty-icon">
              <Truck size={48} />
            </div>
            <h3>No hay vehículos registrados</h3>
            <p>{canWrite ? 'Agrega tu primer vehículo para comenzar a monitorear tu flota' : 'No tienes vehículos asignados en este proyecto.'}</p>
            {canWrite && (
              <button className="btn-add-v2" onClick={handleOpenAddModal}>
                <Plus size={20} />
                <span>Agregar Vehículo</span>
              </button>
            )}
          </div>
        ) : (
          vehicles.map(vehicle => (
            <div key={vehicle._id || vehicle.id} className="vehicle-card-v2">
              {/* Header de la card */}
              <div className="vehicle-card-header">
                <div className="vehicle-card-icon">
                  <Truck size={24} />
                </div>
                {canWrite && (
                  <div className="vehicle-card-actions">
                    <button
                      className="btn-icon-action"
                      onClick={() => handleOpenEditModal(vehicle)}
                      title="Editar vehículo"
                      aria-label="Editar vehículo"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      className="btn-icon-action danger"
                      onClick={() => handleDelete(vehicle)}
                      title="Eliminar vehículo"
                      aria-label="Eliminar vehículo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Info del vehículo */}
              <div className="vehicle-card-body">
                <h3 className="vehicle-name">{vehicle.nombre || 'Sin nombre'}</h3>
                <p className="vehicle-placa">{vehicle.placa}</p>

                {/* Estado GPS */}
                <div className="vehicle-gps-status">
                  {vehicle.safetag_device_id || vehicle.gps_imei ? (
                    <>
                      <div className={`gps-badge ${vehicle.gps_en_linea ? 'online' : 'offline'}`}>
                        <Satellite size={14} />
                        <span>{vehicle.gps_en_linea ? 'En línea' : 'Desconectado'}</span>
                      </div>
                      {vehicle.gps_latitud && vehicle.gps_longitud && (
                        <div className="gps-location">
                          <MapPin size={12} />
                          <span>{vehicle.gps_latitud?.toFixed(4)}, {vehicle.gps_longitud?.toFixed(4)}</span>
                        </div>
                      )}
                      {vehicle.gps_ultima_actualizacion && (
                        <div className="gps-update">
                          <Clock size={12} />
                          <span>{formatLastUpdate(vehicle.gps_ultima_actualizacion)}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="gps-badge no-gps">
                      <Satellite size={14} />
                      <span>Sin GPS</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer con acciones */}
              <div className="vehicle-card-footer">
                {vehicle.safetag_device_id || vehicle.gps_imei ? (
                  <button
                    className="btn-view-history"
                    onClick={() => setPlaybackVehicle({
                      deviceId: vehicle.safetag_device_id || vehicle.gps_imei,
                      deviceName: vehicle.safetag_device_name,
                      placa: vehicle.placa,
                      vehicleId: vehicle._id || vehicle.id
                    })}
                  >
                    <Play size={16} />
                    <span>Ver Historial GPS</span>
                  </button>
                ) : canWrite ? (
                  <button
                    className="btn-configure-gps"
                    onClick={() => handleOpenEditModal(vehicle)}
                  >
                    <Satellite size={16} />
                    <span>Configurar GPS</span>
                  </button>
                ) : (
                  <div className="gps-badge no-gps" style={{ width: '100%', justifyContent: 'center' }}>
                    <Satellite size={14} />
                    <span>Sin GPS configurado</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Agregar/Editar - MINIMALISTA */}
      {showModal && (
        <div className="modal-overlay-v2" onClick={handleCloseModal}>
          <div className="modal-content-v2" onClick={e => e.stopPropagation()}>
            <div className="modal-header-v2">
              <h2>{modalMode === 'add' ? 'Nuevo Vehículo' : 'Editar Vehículo'}</h2>
              <button className="btn-close-v2" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form-v2">
              <div className="form-group-v2">
                <label>Nombre del vehículo</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  placeholder="Ej: Camión Principal"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group-v2">
                <label>Placa</label>
                <input
                  type="text"
                  name="placa"
                  value={formData.placa}
                  onChange={handleInputChange}
                  placeholder="Ej: ABC-123"
                  required
                />
              </div>

              <div className="form-divider-v2">
                <Truck size={16} />
                <span>Identificación del vehículo</span>
              </div>

              <div className="form-group-v2">
                <label>Tipo de vehículo</label>
                <select
                  name="tipo_vehiculo"
                  value={formData.tipo_vehiculo}
                  onChange={handleInputChange}
                  className="select-v2"
                >
                  {TIPOS_VEHICULO.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <VinDecoder onDecoded={handleVinDecoded} disabled={isSubmitting} />

              <div className="form-row-v2">
                <div className="form-group-v2">
                  <label>Marca</label>
                  <input
                    type="text"
                    name="marca"
                    value={formData.marca}
                    onChange={handleInputChange}
                    placeholder="ej: Mack, Volvo, Tennant"
                  />
                </div>
                <div className="form-group-v2">
                  <label>Año</label>
                  <input
                    type="number"
                    name="anio"
                    value={formData.anio}
                    onChange={handleInputChange}
                    placeholder="ej: 2018"
                    min={1980}
                    max={new Date().getFullYear() + 1}
                  />
                </div>
              </div>

              <div className="form-group-v2">
                <label>Modelo</label>
                <ModelAutocomplete
                  value={formData.modelo}
                  onChange={(v) => setFormData(prev => ({ ...prev, modelo: v }))}
                  onSelectModel={handleModelSelect}
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-divider-v2">
                <Satellite size={16} />
                <span>Conexión GPS (opcional)</span>
              </div>

              <div className="form-group-v2">
                <label>
                  IMEI del dispositivo GPS
                  {formData.safetagDeviceId && (
                    <span className={`imei-status ${formData.safetagDeviceId.length === 15 ? 'valid' : 'partial'}`}>
                      {formData.safetagDeviceId.length === 15 ? (
                        <>
                          <Check size={12} aria-hidden="true" /> Válido
                        </>
                      ) : `${formData.safetagDeviceId.length}/15`}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  name="safetagDeviceId"
                  value={formData.safetagDeviceId}
                  onChange={handleInputChange}
                  placeholder="15 dígitos del IMEI"
                  className={formData.safetagDeviceId && formData.safetagDeviceId.length !== 15 ? 'input-warning' : ''}
                />
                <small className="form-hint-v2">
                  Encuentra el IMEI en la configuración del dispositivo GPS o en la app SafeTag
                </small>
              </div>

              {submitError && (
                <div className="form-error-v2">
                  {submitError}
                </div>
              )}

              <div className="modal-actions-v2">
                <button 
                  type="button" 
                  className="btn-secondary-v2"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary-v2"
                  disabled={isSubmitting}
                >
                  {isSubmitting 
                    ? 'Guardando...' 
                    : modalMode === 'add' 
                      ? 'Agregar Vehículo' 
                      : 'Guardar Cambios'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Reproducción GPS */}
      {playbackVehicle && (
        <RoutePlayback
          deviceId={playbackVehicle.deviceId}
          deviceName={playbackVehicle.deviceName}
          placa={playbackVehicle.placa}
          vehicleId={playbackVehicle.vehicleId}
          onClose={() => setPlaybackVehicle(null)}
        />
      )}

      {/* Confirm delete vehículo */}
      {vehicleToDelete && (
        <ConfirmDialog
          open
          destructive
          title="¿Eliminar vehículo?"
          message={`Vas a eliminar "${vehicleToDelete.nombre || vehicleToDelete.placa}". Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          onConfirm={confirmDeleteVehicle}
          onCancel={() => setVehicleToDelete(null)}
        />
      )}
    </div>
  );
};

export default FleetManagement;
