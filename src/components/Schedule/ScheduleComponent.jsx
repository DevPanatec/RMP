import { useState } from 'react';
import { useSupabaseSchedule } from '../../context/SupabaseScheduleContext';
import { useSupabaseRoutes } from '../../context/SupabaseRoutesContext';
import { useSupabasePersonnel } from '../../context/SupabasePersonnelContext';
import { useSupabaseFleet } from '../../context/SupabaseFleetContext';
import { useSupabaseCleaning } from '../../context/SupabaseCleaningContext';
import { 
  Calendar, Plus, Edit, Trash2, AlertTriangle, CheckCircle,
  Truck, Users, Map, Clock, X, Sparkles, Camera
} from '../Icons';
import { CustomSelect } from '../UI';
import PhotoUploadField from '../Cleaning/PhotoUploadField';
import HelperManager from './HelperManager';
import WeekdayPicker from './WeekdayPicker';
import './ScheduleComponent.css';

const ScheduleComponent = () => {
  const { 
    assignments: scheduleAssignments, 
    loading: scheduleLoading, 
    addAssignment: addScheduleAssignment, 
    updateAssignment: updateScheduleAssignment, 
    deleteAssignment: deleteScheduleAssignment
  } = useSupabaseSchedule();
  
  const { routes } = useSupabaseRoutes();
  const { personnel } = useSupabasePersonnel();
  const { vehicles } = useSupabaseFleet();
  const { 
    salas, 
    areas, 
    assignments: cleaningAssignments, 
    loading: cleaningLoading, 
    addAssignment: addCleaningAssignment,
    getAreasBySala,
    uploadPhoto 
  } = useSupabaseCleaning();

  const [activeTab, setActiveTab] = useState('routes');
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  
  const [routeFormData, setRouteFormData] = useState({
    ruta_id: '',
    conductor_nombre: '',
    ayudantes: [],
    dias_semana: [],
    vehiculo_id: '',
    observaciones: ''
  });

  const [cleaningFormData, setCleaningFormData] = useState({
    sala_id: '',
    area_id: '',
    fecha: '',
    hora: '',
  });

  const [photos, setPhotos] = useState({
    before: [],
    during: [],
    after: []
  });

  const [availableAreas, setAvailableAreas] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const activeRoutes = routes.filter(r => r.activa !== false);
  const activePersonnel = personnel.filter(p => p.estado === 'Activo');
  const activeVehicles = vehicles.filter(v => v.estado === 'activo' || v.estado === 'Disponible');
  const loading = scheduleLoading || cleaningLoading;

  const handleOpenRouteModal = (assignment = null) => {
    if (assignment) {
      setEditingAssignment(assignment);
      setRouteFormData({
        ruta_id: assignment.ruta_id,
        conductor_nombre: assignment.conductor_nombre,
        ayudantes: assignment.ayudantes || [],
        dias_semana: assignment.dias_semana || [],
        vehiculo_id: assignment.vehiculo_id,
        observaciones: assignment.observaciones || ''
      });
    } else {
      setEditingAssignment(null);
      setRouteFormData({
        ruta_id: '',
        conductor_nombre: '',
        ayudantes: [],
        dias_semana: [],
        vehiculo_id: '',
        observaciones: ''
      });
    }
    setActiveTab('routes');
    setShowModal(true);
  };

  const handleOpenCleaningModal = () => {
    setCleaningFormData({
      sala_id: '',
      area_id: '',
      fecha: '',
      hora: '',
    });
    setPhotos({ before: [], during: [], after: [] });
    setAvailableAreas([]);
    setErrors({});
    setActiveTab('cleaning');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAssignment(null);
    setRouteFormData({
      ruta_id: '',
      conductor_nombre: '',
      ayudantes: [],
      dias_semana: [],
      vehiculo_id: '',
      observaciones: ''
    });
    setCleaningFormData({
      sala_id: '',
      area_id: '',
      fecha: '',
      hora: '',
    });
    setPhotos({ before: [], during: [], after: [] });
    setAvailableAreas([]);
    setErrors({});
  };

  const handleRouteInputChange = (field, value) => {
    const newFormData = { ...routeFormData, [field]: value };
    setRouteFormData(newFormData);
  };

  const handleRouteSubmit = async (e) => {
    e.preventDefault();

    if (routeFormData.dias_semana.length === 0) {
      alert('Debe seleccionar al menos un día de la semana');
      return;
    }

    const assignmentData = {
      ...routeFormData,
      ruta_id: parseInt(routeFormData.ruta_id),
      vehiculo_id: parseInt(routeFormData.vehiculo_id),
      estado: 'programada'
    };

    let result;
    if (editingAssignment) {
      result = await updateScheduleAssignment(editingAssignment.id, assignmentData);
    } else {
      result = await addScheduleAssignment(assignmentData);
    }

    if (result.success) {
      handleCloseModal();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleDeleteRoute = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta asignación?')) {
      const result = await deleteScheduleAssignment(id);
      if (!result.success) {
        alert(`Error: ${result.error}`);
      }
    }
  };

  const handleSalaChange = (e) => {
    const salaId = e.target.value;
    setCleaningFormData({ ...cleaningFormData, sala_id: salaId, area_id: '' });
    setAvailableAreas(getAreasBySala(salaId));
    setErrors({ ...errors, sala_id: '' });
  };

  const handleAreaChange = (e) => {
    const areaId = e.target.value;
    setCleaningFormData({ ...cleaningFormData, area_id: areaId });
    setErrors({ ...errors, area_id: '' });
  };

  const handlePhotosChange = (type, newPhotos) => {
    setPhotos({ ...photos, [type]: newPhotos });
  };

  const validateCleaningForm = () => {
    const newErrors = {};

    if (!cleaningFormData.sala_id) newErrors.sala_id = 'Seleccione una sala';
    if (!cleaningFormData.area_id) newErrors.area_id = 'Seleccione un área';
    if (!cleaningFormData.fecha) newErrors.fecha = 'Seleccione una fecha';
    if (!cleaningFormData.hora) newErrors.hora = 'Seleccione una hora';

    if (cleaningFormData.area_id) {
      if (photos.before.length === 0) newErrors.photos = 'Debe agregar al menos una foto de "Antes"';
      else if (photos.during.length === 0) newErrors.photos = 'Debe agregar al menos una foto de "Durante"';
      else if (photos.after.length === 0) newErrors.photos = 'Debe agregar al menos una foto de "Después"';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCleaningSubmit = async (e) => {
    e.preventDefault();

    if (!validateCleaningForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const result = await addCleaningAssignment(cleaningFormData);

      if (result.success) {
        const assignmentId = result.data.id;

        const allPhotos = [
          ...photos.before.map(p => ({ file: p.file, etapa: 'antes' })),
          ...photos.during.map(p => ({ file: p.file, etapa: 'durante' })),
          ...photos.after.map(p => ({ file: p.file, etapa: 'despues' }))
        ];

        let uploadedCount = 0;
        const uploadErrors = [];

        for (const photo of allPhotos) {
          const uploadResult = await uploadPhoto(assignmentId, photo.etapa, photo.file);
          if (uploadResult.success) {
            uploadedCount++;
          } else {
            uploadErrors.push(uploadResult.error);
          }
        }

        if (uploadErrors.length > 0) {
          alert(`Asignación creada pero hubo errores al subir ${uploadErrors.length} foto(s)`);
        } else {
          alert(`Asignación creada exitosamente con ${uploadedCount} foto(s)`);
        }

        handleCloseModal();
      } else {
        alert(`Error al crear asignación: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear la asignación');
    } finally {
      setSubmitting(false);
    }
  };

  const getSalaNombre = (salaId) => {
    const sala = salas.find(s => s.id === salaId);
    return sala ? sala.nombre : '';
  };

  const getAreaNombre = (areaId) => {
    const area = areas.find(a => a.id === areaId);
    return area ? area.nombre : '';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="schedule-unified">
      <div className="schedule-header">
        <div className="schedule-title">
          <h2><Calendar size={24} /> Programación Unificada</h2>
          <p>Gestiona todas las asignaciones de rutas y limpieza en un solo lugar</p>
        </div>
        <div className="schedule-actions">
          <button className="btn btn--primary" onClick={() => handleOpenRouteModal()}>
            <Truck size={16} /> Nueva Ruta
          </button>
          <button className="btn btn--primary" onClick={handleOpenCleaningModal}>
            <Sparkles size={16} /> Nueva Limpieza
          </button>
        </div>
      </div>

      <div className="schedule-tabs-unified">
        <button 
          className={`tab-unified ${activeTab === 'routes' ? 'active' : ''}`}
          onClick={() => setActiveTab('routes')}
        >
          <Truck size={18} />
          <span>Rutas Programadas</span>
          <span className="tab-badge">{scheduleAssignments.length}</span>
        </button>
        <button 
          className={`tab-unified ${activeTab === 'cleaning' ? 'active' : ''}`}
          onClick={() => setActiveTab('cleaning')}
        >
          <Sparkles size={18} />
          <span>Limpieza Programada</span>
          <span className="tab-badge">{cleaningAssignments.length}</span>
        </button>
      </div>

      {loading ? (
        <div className="schedule-loading">
          <div className="spinner"></div>
          <p>Cargando asignaciones...</p>
        </div>
      ) : (
        <div className="schedule-content-unified">
          {activeTab === 'routes' && (
            <div className="assignments-list">
              {scheduleAssignments.length === 0 ? (
                <div className="empty-state">
                  <Truck size={48} />
                  <h3>No hay rutas programadas</h3>
                  <p>Comienza agregando una nueva asignación de ruta</p>
                  <button className="btn btn--primary" onClick={() => handleOpenRouteModal()}>
                    <Plus size={16} /> Nueva Ruta
                  </button>
                </div>
              ) : (
                <div className="assignments-grid">
                  {scheduleAssignments.map(assignment => (
                    <div key={assignment.id} className="assignment-card-unified">
                      <div className="assignment-header-unified">
                        <div className="assignment-type-icon route">
                          <Truck size={20} />
                        </div>
                        <div className="assignment-title-unified">
                          <h4>{assignment.ruta?.nombre || 'Ruta sin nombre'}</h4>
                          <p className="assignment-date">{formatDate(assignment.fecha)}</p>
                        </div>
                        <div className="assignment-actions-unified">
                          <button 
                            className="btn-icon btn-icon--sm"
                            onClick={() => handleOpenRouteModal(assignment)}
                            title="Editar"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            className="btn-icon btn-icon--sm btn-icon--danger"
                            onClick={() => handleDeleteRoute(assignment.id)}
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="assignment-details-unified">
                        <div className="detail-item">
                          <Clock size={14} />
                          <span>{assignment.hora_inicio} - {assignment.hora_fin}</span>
                        </div>
                        <div className="detail-item">
                          <Users size={14} />
                          <span>{assignment.conductor_nombre}</span>
                        </div>
                        <div className="detail-item">
                          <Truck size={14} />
                          <span>{assignment.vehiculo?.placa}</span>
                        </div>
                      </div>
                      {assignment.observaciones && (
                        <div className="assignment-notes">
                          <p>{assignment.observaciones}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'cleaning' && (
            <div className="assignments-list">
              {cleaningAssignments.length === 0 ? (
                <div className="empty-state">
                  <Sparkles size={48} />
                  <h3>No hay tareas de limpieza programadas</h3>
                  <p>Comienza agregando una nueva asignación de limpieza</p>
                  <button className="btn btn--primary" onClick={handleOpenCleaningModal}>
                    <Plus size={16} /> Nueva Limpieza
                  </button>
                </div>
              ) : (
                <div className="assignments-grid">
                  {cleaningAssignments.map(assignment => (
                    <div key={assignment.id} className="assignment-card-unified">
                      <div className="assignment-header-unified">
                        <div className="assignment-type-icon cleaning">
                          <Sparkles size={20} />
                        </div>
                        <div className="assignment-title-unified">
                          <h4>{getSalaNombre(assignment.sala_id)} - {getAreaNombre(assignment.area_id)}</h4>
                          <p className="assignment-date">{formatDate(assignment.fecha)}</p>
                        </div>
                        <span className={`status-badge status-${assignment.estado}`}>
                          {assignment.estado}
                        </span>
                      </div>
                      <div className="assignment-details-unified">
                        <div className="detail-item">
                          <Clock size={14} />
                          <span>{assignment.hora}</span>
                        </div>
                        {assignment.fotos && assignment.fotos.length > 0 && (
                          <div className="detail-item">
                            <Camera size={14} />
                            <span>{assignment.fotos.length} foto(s)</span>
                          </div>
                        )}
                      </div>
                      {assignment.notas && (
                        <div className="assignment-notes">
                          <p>{assignment.notas}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showModal && activeTab === 'routes' && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-content">
                <div className="header-icon">
                  {editingAssignment ? <Edit size={28} /> : <Plus size={28} />}
                </div>
                <div className="header-text">
                  <h3 className="modal-title">
                    {editingAssignment ? 'Editar Asignación de Ruta' : 'Nueva Asignación de Ruta'}
                  </h3>
                  <p className="modal-subtitle">
                    {editingAssignment ? 'Actualice los detalles de la asignación' : 'Complete los detalles para crear la asignación'}
                  </p>
                </div>
              </div>
              <button className="modal-close" onClick={handleCloseModal}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleRouteSubmit}>
              <div className="modal-body">
                <div className="form-grid-2col">
                  <div className="form-group-card">
                    <div className="card-label">
                      <Map size={18} />
                      <span>Ruta & Vehículo</span>
                    </div>
                    
                    <CustomSelect
                      label="Ruta"
                      required
                      value={routeFormData.ruta_id}
                      onChange={(value) => handleRouteInputChange('ruta_id', value)}
                      options={activeRoutes.map(route => ({
                        value: route.id,
                        label: `${route.nombre} - ${route.tipo_servicio}`
                      }))}
                      placeholder="Seleccionar ruta"
                      searchable
                    />

                    <CustomSelect
                      label="Vehículo"
                      required
                      value={routeFormData.vehiculo_id}
                      onChange={(value) => handleRouteInputChange('vehiculo_id', value)}
                      options={activeVehicles.map(vehicle => ({
                        value: vehicle.id,
                        label: `${vehicle.placa} - ${vehicle.nombre || vehicle.marca}`
                      }))}
                      placeholder="Seleccionar vehículo"
                      searchable
                    />
                  </div>

                  <div className="form-group-card">
                    <div className="card-label">
                      <Users size={18} />
                      <span>Personal Asignado</span>
                    </div>
                    
                    <CustomSelect
                      label="Conductor"
                      required
                      value={routeFormData.conductor_nombre}
                      onChange={(value) => handleRouteInputChange('conductor_nombre', value)}
                      options={activePersonnel.map(person => ({
                        value: person.nombre,
                        label: `${person.nombre} - ${person.puesto}`
                      }))}
                      placeholder="Seleccionar conductor"
                      searchable
                    />

                    <HelperManager
                      helpers={routeFormData.ayudantes}
                      onChange={(newHelpers) => handleRouteInputChange('ayudantes', newHelpers)}
                    />
                  </div>
                </div>

                <div className="form-group-card form-full-width">
                  <div className="card-label">
                    <Calendar size={18} />
                    <span>Horarios Semanales</span>
                  </div>
                  <WeekdayPicker
                    selectedDays={routeFormData.dias_semana}
                    onChange={(newDays) => handleRouteInputChange('dias_semana', newDays)}
                  />
                </div>

                <div className="form-group-card form-full-width">
                  <div className="card-label">
                    <AlertTriangle size={18} />
                    <span>Observaciones (Opcional)</span>
                  </div>
                  <div className="form-group">
                    <textarea
                      value={routeFormData.observaciones}
                      onChange={(e) => handleRouteInputChange('observaciones', e.target.value)}
                      rows="3"
                      placeholder="Notas adicionales..."
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <div className="footer-actions">
                  <button type="button" className="btn btn--outline" onClick={handleCloseModal}>
                    <X size={16} />
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn--primary"
                  >
                    <CheckCircle size={16} /> 
                    {editingAssignment ? 'Actualizar' : 'Crear'} Asignación
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && activeTab === 'cleaning' && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Plus size={20} /> Nueva Asignación de Limpieza
              </h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCleaningSubmit} className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Sala *</label>
                  <select
                    value={cleaningFormData.sala_id}
                    onChange={handleSalaChange}
                    className={errors.sala_id ? 'error' : ''}
                    required
                  >
                    <option value="">Seleccionar sala</option>
                    {salas.map(sala => (
                      <option key={sala.id} value={sala.id}>
                        {sala.nombre}
                      </option>
                    ))}
                  </select>
                  {errors.sala_id && <span className="error-text">{errors.sala_id}</span>}
                </div>

                <div className="form-group">
                  <label>Área *</label>
                  <select
                    value={cleaningFormData.area_id}
                    onChange={handleAreaChange}
                    disabled={!cleaningFormData.sala_id}
                    className={errors.area_id ? 'error' : ''}
                    required
                  >
                    <option value="">Seleccionar área</option>
                    {availableAreas.map(area => (
                      <option key={area.id} value={area.id}>
                        {area.nombre}
                      </option>
                    ))}
                  </select>
                  {errors.area_id && <span className="error-text">{errors.area_id}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Fecha y Hora *</label>
                  <input
                    type="datetime-local"
                    value={`${cleaningFormData.fecha}T${cleaningFormData.hora}`}
                    onChange={(e) => {
                      const [date, time] = e.target.value.split('T');
                      setCleaningFormData({ 
                        ...cleaningFormData, 
                        fecha: date, 
                        hora: time 
                      });
                      setErrors({ ...errors, fecha: '', hora: '' });
                    }}
                    step="900"
                    className={errors.fecha || errors.hora ? 'error' : ''}
                    required
                  />
                  {(errors.fecha || errors.hora) && (
                    <span className="error-text">{errors.fecha || errors.hora}</span>
                  )}
                </div>
              </div>

              {cleaningFormData.area_id && (
                <div className="photos-section-enhanced">
                  <div className="photos-header">
                    <div className="photos-header-icon">
                      <Camera size={20} />
                    </div>
                    <div className="photos-header-content">
                      <h4>Evidencia Fotográfica Requerida</h4>
                      <p>Sube fotos de cada etapa para documentar el trabajo realizado</p>
                    </div>
                    <div className="photos-progress-indicator">
                      <div className="progress-count">
                        <span className="progress-number">
                          {(photos.before.length > 0 ? 1 : 0) + 
                           (photos.during.length > 0 ? 1 : 0) + 
                           (photos.after.length > 0 ? 1 : 0)}
                        </span>
                        <span className="progress-total">/3</span>
                      </div>
                      <span className="progress-label">Completadas</span>
                    </div>
                  </div>

                  <div className="photos-progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${((photos.before.length > 0 ? 1 : 0) + 
                                  (photos.during.length > 0 ? 1 : 0) + 
                                  (photos.after.length > 0 ? 1 : 0)) * 33.33}%` 
                      }}
                    />
                  </div>

                  <div className="photos-grid-enhanced">
                    <div className="photo-card-enhanced">
                      <div className="photo-card-header">
                        <div className={`photo-step-badge ${photos.before.length > 0 ? 'completed' : ''}`}>
                          {photos.before.length > 0 ? <CheckCircle size={16} /> : '1'}
                        </div>
                        <h5>Fotos Antes</h5>
                      </div>
                      <div className="photo-card-body">
                        <PhotoUploadField
                          label=""
                          photos={photos.before}
                          onChange={(newPhotos) => handlePhotosChange('before', newPhotos)}
                        />
                      </div>
                      {photos.before.length > 0 && (
                        <div className="photo-card-footer">
                          <span className="photo-count">{photos.before.length} foto(s) subida(s)</span>
                        </div>
                      )}
                    </div>

                    <div className="photo-card-enhanced">
                      <div className="photo-card-header">
                        <div className={`photo-step-badge ${photos.during.length > 0 ? 'completed' : ''}`}>
                          {photos.during.length > 0 ? <CheckCircle size={16} /> : '2'}
                        </div>
                        <h5>Fotos Durante</h5>
                      </div>
                      <div className="photo-card-body">
                        <PhotoUploadField
                          label=""
                          photos={photos.during}
                          onChange={(newPhotos) => handlePhotosChange('during', newPhotos)}
                        />
                      </div>
                      {photos.during.length > 0 && (
                        <div className="photo-card-footer">
                          <span className="photo-count">{photos.during.length} foto(s) subida(s)</span>
                        </div>
                      )}
                    </div>

                    <div className="photo-card-enhanced">
                      <div className="photo-card-header">
                        <div className={`photo-step-badge ${photos.after.length > 0 ? 'completed' : ''}`}>
                          {photos.after.length > 0 ? <CheckCircle size={16} /> : '3'}
                        </div>
                        <h5>Fotos Después</h5>
                      </div>
                      <div className="photo-card-body">
                        <PhotoUploadField
                          label=""
                          photos={photos.after}
                          onChange={(newPhotos) => handlePhotosChange('after', newPhotos)}
                        />
                      </div>
                      {photos.after.length > 0 && (
                        <div className="photo-card-footer">
                          <span className="photo-count">{photos.after.length} foto(s) subida(s)</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {errors.photos && (
                    <div className="error-message-enhanced">
                      <AlertTriangle size={16} />
                      <span>{errors.photos}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn--outline" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn--primary"
                  disabled={submitting}
                >
                  <CheckCircle size={16} /> {submitting ? 'Creando...' : 'Crear Asignación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleComponent;
