import { useState } from 'react';
import { useFleet } from '../../context/FleetContext';
import { Truck, Plus, X, Play, Satellite, Edit3, Trash2, MapPin, Clock } from '../Icons';
import RoutePlayback from '../SafeTag/RoutePlayback';
import './FleetManagement.css';

const FleetManagement = () => {
  const { vehicles, addVehicle, updateVehicle, deleteVehicle } = useFleet();

  // Estados del modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [editingVehicle, setEditingVehicle] = useState(null);
  
  // Estado para reproducción GPS
  const [playbackVehicle, setPlaybackVehicle] = useState(null);

  // Estado del formulario - MINIMALISTA
  const [formData, setFormData] = useState({
    nombre: '',
    placa: '',
    safetagDeviceId: ''
  });

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
    setFormData({ nombre: '', placa: '', safetagDeviceId: '' });
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
      safetagDeviceId: vehicle.safetag_device_id || vehicle.gps_imei || ''
    });
    setSubmitError(null);
    setShowModal(true);
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingVehicle(null);
    setFormData({ nombre: '', placa: '', safetagDeviceId: '' });
    setSubmitError(null);
  };

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
      if (modalMode === 'add') {
        // Agregar nuevo vehículo
        const result = await addVehicle({
          nombre: formData.nombre,
          placa: formData.placa,
          safetagDeviceId: formData.safetagDeviceId || undefined,
          tipo_servicio: 'general', // Default
        });

        if (result?.success === false) {
          throw new Error(result.error || 'Error al agregar vehículo');
        }
      } else {
        // Editar vehículo existente
        const result = await updateVehicle(editingVehicle._id || editingVehicle.id, {
          nombre: formData.nombre,
          placa: formData.placa,
          safetag_device_id: formData.safetagDeviceId || undefined,
          gps_imei: formData.safetagDeviceId || undefined
        });

        if (result?.success === false) {
          throw new Error(result.error || 'Error al actualizar vehículo');
        }
      }

      handleCloseModal();
    } catch (error) {
      console.error('❌ Error:', error);
      setSubmitError(error.message || 'Error al procesar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminar vehículo
  const handleDelete = async (vehicle) => {
    if (!window.confirm(`¿Estás seguro de eliminar el vehículo "${vehicle.nombre || vehicle.placa}"?`)) {
      return;
    }

    try {
      await deleteVehicle(vehicle._id || vehicle.id);
    } catch (error) {
      console.error('Error eliminando vehículo:', error);
      alert('Error al eliminar el vehículo');
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

        <button className="btn-add-v2" onClick={handleOpenAddModal}>
          <Plus size={20} />
          <span>Agregar Vehículo</span>
        </button>
      </div>

      {/* Grid de vehículos */}
      <div className="fleet-grid-v2">
        {vehicles.length === 0 ? (
          <div className="fleet-empty-state">
            <div className="empty-icon">
              <Truck size={48} />
            </div>
            <h3>No hay vehículos registrados</h3>
            <p>Agrega tu primer vehículo para comenzar a monitorear tu flota</p>
            <button className="btn-add-v2" onClick={handleOpenAddModal}>
              <Plus size={20} />
              <span>Agregar Vehículo</span>
            </button>
          </div>
        ) : (
          vehicles.map(vehicle => (
            <div key={vehicle._id || vehicle.id} className="vehicle-card-v2">
              {/* Header de la card */}
              <div className="vehicle-card-header">
                <div className="vehicle-card-icon">
                  <Truck size={24} />
                </div>
                <div className="vehicle-card-actions">
                  <button 
                    className="btn-icon-action"
                    onClick={() => handleOpenEditModal(vehicle)}
                    title="Editar vehículo"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    className="btn-icon-action danger"
                    onClick={() => handleDelete(vehicle)}
                    title="Eliminar vehículo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
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
                ) : (
                  <button
                    className="btn-configure-gps"
                    onClick={() => handleOpenEditModal(vehicle)}
                  >
                    <Satellite size={16} />
                    <span>Configurar GPS</span>
                  </button>
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
                <Satellite size={16} />
                <span>Conexión GPS (opcional)</span>
              </div>

              <div className="form-group-v2">
                <label>
                  IMEI del dispositivo GPS
                  {formData.safetagDeviceId && (
                    <span className={`imei-status ${formData.safetagDeviceId.length === 15 ? 'valid' : 'partial'}`}>
                      {formData.safetagDeviceId.length === 15 ? '✓ Válido' : `${formData.safetagDeviceId.length}/15`}
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
    </div>
  );
};

export default FleetManagement;
