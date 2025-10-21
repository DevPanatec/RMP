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
import './ScheduleModal.css';

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
    lugares,
    areas,
    assignments: cleaningAssignments,
    loading: cleaningLoading,
    addAssignment: addCleaningAssignment,
    getAreasByLugar,
    uploadPhoto
  } = useSupabaseCleaning();

  console.log('🎯 DEBUG Schedule Component - scheduleAssignments:', scheduleAssignments);
  console.log('🎯 DEBUG Schedule Component - routes:', routes);

  // Helper: obtener el lunes de la semana actual
  const getStartOfWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Si es domingo (0), retroceder 6 días
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    // Formatear en zona horaria local, no UTC
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  };

  // Helper: ajustar cualquier fecha al lunes de esa semana
  const adjustToMonday = (dateString) => {
    const date = new Date(dateString + 'T12:00:00'); // Agregar hora para evitar problemas de timezone
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    // Formatear en zona horaria local, no UTC
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  };

  // Helper: obtener el domingo de la semana (fin de semana)
  const getEndOfWeek = (dateString) => {
    const monday = new Date(dateString + 'T12:00:00');
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    // Formatear en zona horaria local, no UTC
    return `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;
  };

  // Helper: formatear rango de semana
  const formatWeekRange = (dateString) => {
    const start = new Date(dateString + 'T12:00:00');
    const end = new Date(getEndOfWeek(dateString) + 'T12:00:00');

    const startDay = start.getDate();
    const endDay = end.getDate();
    const startMonth = start.toLocaleDateString('es-ES', { month: 'long' });
    const endMonth = end.toLocaleDateString('es-ES', { month: 'long' });
    const year = start.getFullYear();

    if (startMonth === endMonth) {
      return `Semana del ${startDay} al ${endDay} de ${startMonth}, ${year}`;
    } else {
      return `Semana del ${startDay} de ${startMonth} al ${endDay} de ${endMonth}, ${year}`;
    }
  };

  const [activeTab, setActiveTab] = useState('routes');
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);

  const [routeFormData, setRouteFormData] = useState({
    ruta_id: '',
    conductor_nombre: '',
    ayudantes: [],
    fecha: getStartOfWeek(),
    dias_semana: [],
    vehiculo_id: '',
    observaciones: ''
  });

  const [cleaningFormData, setCleaningFormData] = useState({
    lugar_id: '',
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
  const activePersonnel = personnel.filter(p => p.active === true);
  const activeVehicles = vehicles.filter(v =>
    v.estado === 'activo' ||
    v.estado === 'Disponible' ||
    v.estado === 'disponible'
  );
  const loading = scheduleLoading || cleaningLoading;

  // Filtrar vehículos por tipo de ruta seleccionada
  const getCompatibleVehicles = () => {
    if (!routeFormData.ruta_id) return activeVehicles;

    const selectedRoute = routes.find(r => r.id === parseInt(routeFormData.ruta_id));
    if (!selectedRoute) return activeVehicles;

    const routeType = selectedRoute.tipo_servicio;
    return activeVehicles.filter(v => v.tipo_servicio === routeType);
  };

  const compatibleVehicles = getCompatibleVehicles();

  const handleOpenRouteModal = (assignment = null) => {
    if (assignment) {
      setEditingAssignment(assignment);
      setRouteFormData({
        ruta_id: assignment.ruta_id,
        conductor_nombre: assignment.conductor_nombre,
        ayudantes: assignment.ayudantes || [],
        fecha: assignment.fecha || getStartOfWeek(),
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
        fecha: getStartOfWeek(),
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
      lugar_id: '',
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
      fecha: getStartOfWeek(),
      dias_semana: [],
      vehiculo_id: '',
      observaciones: ''
    });
    setCleaningFormData({
      lugar_id: '',
      area_id: '',
      fecha: '',
      hora: '',
    });
    setPhotos({ before: [], during: [], after: [] });
    setAvailableAreas([]);
    setErrors({});
  };

  // Helper: obtener días bloqueados para una ruta en una semana específica
  const getBlockedDays = () => {
    const blockedDaysMap = {};

    if (!routeFormData.ruta_id) {
      return blockedDaysMap;
    }

    // Obtener la ruta seleccionada
    const selectedRoute = routes.find(r => r.id === parseInt(routeFormData.ruta_id));

    console.log('🔍 DEBUG - Ruta seleccionada:', selectedRoute);
    console.log('🔍 DEBUG - dias_operacion:', selectedRoute?.dias_operacion);
    console.log('🔍 DEBUG - tipo:', typeof selectedRoute?.dias_operacion, Array.isArray(selectedRoute?.dias_operacion));

    // Bloquear días que NO están en dias_operacion de la ruta
    if (selectedRoute && selectedRoute.dias_operacion) {
      const allDays = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

      // Parsear dias_operacion si viene como string o asegurarse que es array
      let allowedDays = selectedRoute.dias_operacion;
      if (typeof allowedDays === 'string') {
        try {
          allowedDays = JSON.parse(allowedDays);
        } catch (e) {
          console.error('Error parseando dias_operacion:', e);
          allowedDays = [];
        }
      }

      console.log('🔍 DEBUG - Días permitidos (parsed):', allowedDays);

      allDays.forEach(day => {
        if (!allowedDays.includes(day)) {
          blockedDaysMap[day] = 'No disponible';
        }
      });

      console.log('🔍 DEBUG - Días bloqueados:', blockedDaysMap);
    }

    // Bloquear días ya asignados a otros conductores
    if (routeFormData.fecha) {
      const conflictos = scheduleAssignments.filter(assignment =>
        assignment.ruta_id === parseInt(routeFormData.ruta_id) &&
        assignment.fecha === routeFormData.fecha &&
        assignment.id !== editingAssignment?.id
      );

      console.log('🔍 DEBUG - Asignaciones en conflicto:', conflictos);

      conflictos.forEach(assignment => {
        if (assignment.dias_semana && Array.isArray(assignment.dias_semana)) {
          assignment.dias_semana.forEach(dia => {
            blockedDaysMap[dia] = assignment.conductor_nombre;
          });
        }
      });
    }

    console.log('🔍 DEBUG - Resultado final blockedDaysMap:', blockedDaysMap);
    return blockedDaysMap;
  };

  // Función para verificar conflictos de vehículos por horario
  const checkVehicleConflicts = (vehiculoId, dias, fecha, selectedRouteId) => {
    if (!vehiculoId || !dias || dias.length === 0 || !fecha) {
      return { hasConflict: false, conflicts: [] };
    }

    const selectedRoute = routes.find(r => r.id === parseInt(selectedRouteId));
    if (!selectedRoute || !selectedRoute.hora_inicio || !selectedRoute.hora_fin) {
      return { hasConflict: false, conflicts: [] };
    }

    // Buscar otras asignaciones del mismo vehículo en la misma semana
    const vehicleAssignments = scheduleAssignments.filter(assignment =>
      assignment.vehiculo_id === parseInt(vehiculoId) &&
      assignment.fecha === fecha &&
      assignment.id !== editingAssignment?.id
    );

    const conflicts = [];

    vehicleAssignments.forEach(assignment => {
      if (!assignment.ruta || !assignment.dias_semana) return;

      const assignedRoute = assignment.ruta;
      if (!assignedRoute.hora_inicio || !assignedRoute.hora_fin) return;

      // Verificar si hay solapamiento de días
      const overlappingDays = dias.filter(dia =>
        assignment.dias_semana.includes(dia)
      );

      if (overlappingDays.length > 0) {
        // Verificar si hay solapamiento de horarios
        const selectedStart = selectedRoute.hora_inicio;
        const selectedEnd = selectedRoute.hora_fin;
        const assignedStart = assignedRoute.hora_inicio;
        const assignedEnd = assignedRoute.hora_fin;

        const hasTimeOverlap = (
          (selectedStart >= assignedStart && selectedStart < assignedEnd) ||
          (selectedEnd > assignedStart && selectedEnd <= assignedEnd) ||
          (selectedStart <= assignedStart && selectedEnd >= assignedEnd)
        );

        if (hasTimeOverlap) {
          conflicts.push({
            dias: overlappingDays,
            ruta: assignedRoute.nombre,
            horario: `${assignedStart} - ${assignedEnd}`,
            conductor: assignment.conductor_nombre
          });
        }
      }
    });

    return {
      hasConflict: conflicts.length > 0,
      conflicts
    };
  };

  const handleRouteInputChange = (field, value) => {
    // Si están cambiando la fecha, ajustar al lunes de esa semana
    if (field === 'fecha') {
      value = adjustToMonday(value);
    }
    const newFormData = { ...routeFormData, [field]: value };
    setRouteFormData(newFormData);
  };

  const handleRouteSubmit = async (e) => {
    e.preventDefault();

    // Validar campos requeridos
    if (!routeFormData.ruta_id) {
      alert('❌ Debe seleccionar una ruta');
      return;
    }
    if (!routeFormData.conductor_nombre) {
      alert('❌ Debe seleccionar un conductor');
      return;
    }
    if (!routeFormData.vehiculo_id) {
      alert('❌ Debe seleccionar un vehículo');
      return;
    }
    if (routeFormData.dias_semana.length === 0) {
      alert('❌ Debe seleccionar al menos un día de la semana');
      return;
    }

    // Validar compatibilidad vehículo-ruta
    const selectedRoute = routes.find(r => r.id === parseInt(routeFormData.ruta_id));
    const selectedVehicle = vehicles.find(v => v.id === parseInt(routeFormData.vehiculo_id));

    if (selectedRoute && selectedVehicle) {
      if (selectedRoute.tipo_servicio !== selectedVehicle.tipo_servicio) {
        alert(`❌ Incompatibilidad de tipo de servicio\n\nLa ruta seleccionada es de tipo: ${selectedRoute.tipo_servicio}\nEl vehículo seleccionado es de tipo: ${selectedVehicle.tipo_servicio}\n\nDebe seleccionar un vehículo del mismo tipo que la ruta.`);
        return;
      }
    }

    // Validar conflictos de ruta (mismo día y ruta ya asignada a otro conductor)
    const blockedDays = getBlockedDays();
    const conflictingDays = routeFormData.dias_semana.filter(dia => dia in blockedDays);

    if (conflictingDays.length > 0) {
      const conflictDetails = conflictingDays.map(dia => {
        const diaCapitalizado = dia.charAt(0).toUpperCase() + dia.slice(1);
        return `${diaCapitalizado} (asignado a ${blockedDays[dia]})`;
      }).join(', ');

      alert(`❌ No se puede guardar la asignación\n\nLos siguientes días ya están asignados:\n${conflictDetails}\n\nPor favor, selecciona solo días disponibles.`);
      return;
    }

    // Validar conflictos de vehículo (mismo vehículo en el mismo horario)
    const vehicleConflictCheck = checkVehicleConflicts(
      routeFormData.vehiculo_id,
      routeFormData.dias_semana,
      routeFormData.fecha,
      routeFormData.ruta_id
    );

    if (vehicleConflictCheck.hasConflict) {
      const conflictMessages = vehicleConflictCheck.conflicts.map(conflict => {
        const diasCapitalizados = conflict.dias.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
        return `• ${diasCapitalizados}: ${conflict.ruta} (${conflict.horario}) - Conductor: ${conflict.conductor}`;
      }).join('\n');

      alert(`❌ Conflicto de vehículo detectado\n\nEl vehículo seleccionado ya está asignado en los siguientes horarios:\n\n${conflictMessages}\n\nPor favor, selecciona otro vehículo o cambia los días/horarios.`);
      return;
    }

    // Crear assignmentData con horarios copiados de la ruta
    const assignmentData = {
      ...routeFormData,
      ruta_id: parseInt(routeFormData.ruta_id),
      vehiculo_id: parseInt(routeFormData.vehiculo_id),
      estado: 'programada',
      hora_inicio: selectedRoute?.hora_inicio || null,
      hora_fin: selectedRoute?.hora_fin || null
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

  const handleLugarChange = (e) => {
    const lugarId = e.target.value;
    setCleaningFormData({ ...cleaningFormData, lugar_id: lugarId, area_id: '' });
    setAvailableAreas(getAreasByLugar(lugarId));
    setErrors({ ...errors, lugar_id: '' });
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

    if (!cleaningFormData.lugar_id) newErrors.lugar_id = 'Seleccione un lugar';
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

  const getLugarNombre = (lugarId) => {
    const lugar = lugares.find(l => l.id === lugarId);
    return lugar ? lugar.nombre : '';
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
                          <h4>{getLugarNombre(assignment.lugar_id)} - {getAreaNombre(assignment.area_id)}</h4>
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

                    {routeFormData.ruta_id && (() => {
                      const selectedRoute = routes.find(r => r.id === parseInt(routeFormData.ruta_id));
                      return selectedRoute && selectedRoute.hora_inicio && selectedRoute.hora_fin ? (
                        <div style={{
                          marginTop: '12px',
                          padding: '12px 16px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          borderRadius: '10px',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}>
                          <Clock size={18} />
                          <span>Horario de la ruta: {selectedRoute.hora_inicio} - {selectedRoute.hora_fin}</span>
                        </div>
                      ) : null;
                    })()}

                    <CustomSelect
                      label="Vehículo"
                      required
                      value={routeFormData.vehiculo_id}
                      onChange={(value) => handleRouteInputChange('vehiculo_id', value)}
                      options={compatibleVehicles.map(vehicle => ({
                        value: vehicle.id,
                        label: `${vehicle.tipo_servicio === 'recoleccion' ? '🚛' : '🦟'} ${vehicle.placa} - ${vehicle.nombre || vehicle.marca}`
                      }))}
                      placeholder={routeFormData.ruta_id ? "Seleccionar vehículo compatible" : "Primero selecciona una ruta"}
                      searchable
                      disabled={!routeFormData.ruta_id}
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
                        value: person.name,
                        label: `${person.name} - ${person.position}`
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
                    <span>Programación Recurrente</span>
                  </div>

                  {/* Banner informativo */}
                  <div style={{
                    padding: '14px 18px',
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                    border: '1.5px solid #0ea5e9',
                    borderRadius: '10px',
                    marginBottom: '16px',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start'
                  }}>
                    <div style={{
                      color: '#0369a1',
                      fontSize: '20px',
                      lineHeight: '1',
                      marginTop: '2px'
                    }}>
                      ℹ️
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: '600',
                        color: '#0c4a6e',
                        marginBottom: '6px',
                        fontSize: '13px'
                      }}>
                        Reglas de Asignación
                      </div>
                      <ul style={{
                        margin: 0,
                        paddingLeft: '18px',
                        color: '#0369a1',
                        fontSize: '12px',
                        lineHeight: '1.6'
                      }}>
                        <li>Solo puedes asignar en los días permitidos por la ruta seleccionada</li>
                        <li>El horario se toma automáticamente de la configuración de la ruta</li>
                        <li>No se pueden duplicar asignaciones en la misma semana</li>
                        <li>Puedes asignar la misma ruta en semanas diferentes</li>
                      </ul>
                    </div>
                  </div>

                  <div style={{
                    marginBottom: '16px',
                    padding: '16px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '12px',
                    color: 'white'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px'
                    }}>
                      <div style={{ fontSize: '13px', opacity: 0.9 }}>
                        Semana de inicio
                      </div>
                      <input
                        type="date"
                        value={routeFormData.fecha}
                        onChange={(e) => handleRouteInputChange('fecha', e.target.value)}
                        required
                        style={{
                          padding: '6px 10px',
                          border: '1.5px solid rgba(255, 255, 255, 0.3)',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          background: 'rgba(255, 255, 255, 0.15)',
                          color: 'white',
                          backdropFilter: 'blur(10px)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      />
                    </div>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      letterSpacing: '-0.3px',
                      lineHeight: '1.3'
                    }}>
                      {formatWeekRange(routeFormData.fecha)}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      opacity: 0.8,
                      marginTop: '8px',
                      fontStyle: 'italic'
                    }}>
                      Selecciona los días de esta semana en que se realizará la ruta
                    </div>
                  </div>

                  <WeekdayPicker
                    selectedDays={routeFormData.dias_semana}
                    onChange={(newDays) => handleRouteInputChange('dias_semana', newDays)}
                    blockedDays={getBlockedDays()}
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
                      onChange={(e) => handleRouteInputChange('observaciones', e.target.value.slice(0, 500))}
                      rows="3"
                      placeholder="Notas adicionales..."
                      maxLength={500}
                      style={{ maxHeight: '150px', resize: 'vertical' }}
                    />
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px', textAlign: 'right' }}>
                      {routeFormData.observaciones.length}/500 caracteres
                    </div>
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
                  <label>Lugar *</label>
                  <select
                    value={cleaningFormData.lugar_id}
                    onChange={handleLugarChange}
                    className={errors.lugar_id ? 'error' : ''}
                    required
                  >
                    <option value="">Seleccionar lugar</option>
                    {lugares.map(lugar => (
                      <option key={lugar.id} value={lugar.id}>
                        {lugar.nombre}
                      </option>
                    ))}
                  </select>
                  {errors.lugar_id && <span className="error-text">{errors.lugar_id}</span>}
                </div>

                <div className="form-group">
                  <label>Área *</label>
                  <select
                    value={cleaningFormData.area_id}
                    onChange={handleAreaChange}
                    disabled={!cleaningFormData.lugar_id}
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
