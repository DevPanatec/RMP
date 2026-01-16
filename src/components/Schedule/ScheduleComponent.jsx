import { useState } from 'react';
import { useSchedule } from '../../context/ScheduleContext';
import { useRoutes } from '../../context/RoutesContext';
import { usePersonnel } from '../../context/PersonnelContext';
import { useFleet } from '../../context/FleetContext';
import { useCleaning } from '../../context/CleaningContext';
import { useFumigation } from '../../context/FumigationContext';
import {
  Calendar, Plus, Edit, Trash2, AlertTriangle, CheckCircle,
  Truck, Users, Map, Clock, X, Sparkles, Camera, Info, Bug, CalendarCheck
} from '../Icons';
import { CustomSelect } from '../UI';
import PhotoUploadField from '../Cleaning/PhotoUploadField';
import HelperManager from './HelperManager';
import WeekdayPicker from './WeekdayPicker';
import { FumigationComponent } from '../Fumigation';
import FumigationModal from '../Fumigation/FumigationModal';
import './ScheduleComponent.css';
import './ScheduleModal.css';

// Helper para convertir formato 24h a 12h (AM/PM)
const formatTime12h = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const period = hour >= 12 ? 'p.m.' : 'a.m.';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${minutes} ${period}`;
};

const ScheduleComponent = () => {
  const {
    assignments: scheduleAssignments,
    loading: scheduleLoading,
    addAssignment: addScheduleAssignment,
    updateAssignment: updateScheduleAssignment,
    deleteAssignment: deleteScheduleAssignment
  } = useSchedule();

  const { routes } = useRoutes();
  const { getAllEmployees } = usePersonnel();
  const personnel = getAllEmployees(); // Convertir objeto de turnos a array
  const { vehicles } = useFleet();
  const {
    lugares,
    areas,
    assignments: cleaningAssignments,
    loading: cleaningLoading,
    addAssignment: addCleaningAssignment,
    uploadPhoto
  } = useCleaning();

  const {
    assignments: fumigationAssignments,
    loading: fumigationLoading,
    createAssignment: createFumigationAssignment,
    uploadPhoto: uploadFumigationPhoto
  } = useFumigation();

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
  const [showRulesBanner, setShowRulesBanner] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showFumigationModal, setShowFumigationModal] = useState(false);

  const [routeFormData, setRouteFormData] = useState({
    tipo_servicio: 'recoleccion', // Solo recolección
    ruta_id: '',
    conductor_nombre: '',
    ayudantes: [],
    fecha: getStartOfWeek(),
    dias_semana: [],
    vehiculo_id: '',
    viajes_diarios: 1,
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

  const activeRoutes = routes.filter(r => r.estado !== 'cancelada');
  const activePersonnel = personnel.filter(p => p.activo === true);
  const activeVehicles = vehicles.filter(v =>
    v.estado === 'activo' ||
    v.estado === 'Disponible' ||
    v.estado === 'disponible' ||
    v.estado === 'En ruta'
  );
  const loading = scheduleLoading || cleaningLoading || fumigationLoading;

  // Filtrar vehículos por tipo de ruta seleccionada (solo recolección)
  const getCompatibleVehicles = () => {
    return activeVehicles.filter(v => v.tipo_servicio === 'recoleccion' || v.tipoServicio === 'recoleccion');
  };

  const compatibleVehicles = getCompatibleVehicles();

  const handleOpenRouteModal = (assignment = null) => {
    if (assignment) {
      setEditingAssignment(assignment);
      setRouteFormData({
        tipo_servicio: 'recoleccion',
        ruta_id: assignment.ruta_id,
        conductor_nombre: assignment.conductor_nombre || '',
        ayudantes: assignment.ayudantes || [],
        fecha: assignment.fecha_asignacion || assignment.fecha || getStartOfWeek(),
        dias_semana: assignment.dias_semana || [],
        vehiculo_id: assignment.vehiculo_id,
        observaciones: assignment.observaciones || ''
      });
    } else {
      setEditingAssignment(null);
      setRouteFormData({
        tipo_servicio: 'recoleccion',
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

  const handleOpenFumigationModal = () => {
    setActiveTab('fumigation');
    setShowFumigationModal(true);
  };

  const handleFumigationSave = async (assignmentData) => {
    const result = await createFumigationAssignment(assignmentData);
    if (result.success) {
      setShowFumigationModal(false);
      setSuccessMessage('Fumigación registrada exitosamente');
      setShowSuccessModal(true);
    }
    return result;
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAssignment(null);
    setRouteFormData({
      tipo_servicio: 'recoleccion',
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

  // Helper: normalizar días (quitar acentos para consistencia)
  const normalizeDays = (days) => {
    if (!Array.isArray(days)) return [];
    return days.map(day => {
      return day
        .normalize('NFD') // Descomponer caracteres con acentos
        .replace(/[\u0300-\u036f]/g, '') // Eliminar marcas diacríticas
        .toLowerCase();
    });
  };

  // Helper: obtener días bloqueados para una ruta en una semana específica
  const getBlockedDays = () => {
    const blockedDaysMap = {};

    if (!routeFormData.ruta_id) {
      console.log('🔍 DEBUG - No hay ruta seleccionada');
      return blockedDaysMap;
    }

    // Obtener la ruta seleccionada
    const selectedRoute = routes.find(r => String(r._id || r.id) === String(routeFormData.ruta_id));

    console.log('🔍 DEBUG - Ruta seleccionada:', selectedRoute);
    console.log('🔍 DEBUG - dias_operacion RAW:', selectedRoute?.dias_operacion);
    console.log('🔍 DEBUG - tipo:', typeof selectedRoute?.dias_operacion, 'isArray:', Array.isArray(selectedRoute?.dias_operacion));

    // Bloquear días que NO están en dias_operacion de la ruta
    if (selectedRoute && selectedRoute.dias_operacion) {
      const allDays = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

      // Parsear dias_operacion si viene como string o asegurarse que es array
      let allowedDays = selectedRoute.dias_operacion;
      if (typeof allowedDays === 'string') {
        try {
          allowedDays = JSON.parse(allowedDays);
          console.log('🔍 DEBUG - Días parseados de string:', allowedDays);
        } catch (e) {
          console.error('❌ ERROR parseando dias_operacion:', e);
          allowedDays = [];
        }
      }

      // Normalizar días (quitar acentos)
      allowedDays = normalizeDays(allowedDays);

      console.log('🔍 DEBUG - Días permitidos FINAL:', allowedDays);
      console.log('🔍 DEBUG - Tipo de allowedDays:', typeof allowedDays, 'isArray:', Array.isArray(allowedDays));

      allDays.forEach(day => {
        const isIncluded = allowedDays.includes(day);
        console.log(`🔍 DEBUG - Día "${day}": includes = ${isIncluded}`);
        if (!isIncluded) {
          blockedDaysMap[day] = 'No disponible';
          console.log(`  ❌ Bloqueando "${day}"`);
        } else {
          console.log(`  ✅ Permitiendo "${day}"`);
        }
      });

      console.log('🔍 DEBUG - Días bloqueados por ruta:', blockedDaysMap);
    }

    // Bloquear días ya asignados a otros conductores
    if (routeFormData.fecha) {
      const conflictos = scheduleAssignments.filter(assignment =>
        String(assignment.ruta_id) === String(routeFormData.ruta_id) &&
        (assignment.fecha_asignacion || assignment.fecha) === routeFormData.fecha &&
        (assignment._id || assignment.id) !== (editingAssignment?._id || editingAssignment?.id)
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

    const selectedRoute = routes.find(r => (r._id || r.id) === selectedRouteId);
    if (!selectedRoute || !selectedRoute.hora_inicio || !selectedRoute.hora_fin) {
      return { hasConflict: false, conflicts: [] };
    }

    // Buscar otras asignaciones del mismo vehículo en la misma semana
    const vehicleAssignments = scheduleAssignments.filter(assignment =>
      String(assignment.vehiculo_id) === String(vehiculoId) &&
      (assignment.fecha_asignacion || assignment.fecha) === fecha &&
      (assignment._id || assignment.id) !== (editingAssignment?._id || editingAssignment?.id)
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

    // Obtener la ruta seleccionada para copiar horarios
    const selectedRoute = routes.find(r => String(r._id || r.id) === String(routeFormData.ruta_id));

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
      ruta_id: routeFormData.ruta_id,
      conductor_nombre: routeFormData.conductor_nombre.trim(), // Eliminar espacios
      vehiculo_id: routeFormData.vehiculo_id,
      fecha_asignacion: routeFormData.fecha,
      dias_semana: routeFormData.dias_semana,
      ayudantes: routeFormData.ayudantes,
      observaciones: routeFormData.observaciones,
      estado: 'programada',
      hora_inicio: selectedRoute?.hora_inicio || null,
      hora_fin: selectedRoute?.hora_fin || null
    };

    // conductor_id es opcional, solo se envía si existe
    // (no se envía si el conductor solo está en empleados, no en perfiles_usuarios)

    let result;
    if (editingAssignment) {
      result = await updateScheduleAssignment(editingAssignment._id || editingAssignment.id, assignmentData);
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

        handleCloseModal();

        if (uploadErrors.length > 0) {
          setSuccessMessage(`Asignación creada pero hubo errores al subir ${uploadErrors.length} foto(s)`);
        } else {
          setSuccessMessage(`Asignación creada exitosamente con ${uploadedCount} foto(s)`);
        }
        setShowSuccessModal(true);
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

  const getAreasByLugar = (lugarId) => {
    return areas.filter(a => String(a.lugar_id) === String(lugarId));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T12:00:00');
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper: formatear días de la semana de forma compacta
  const formatDiasSemana = (diasArray) => {
    if (!diasArray || diasArray.length === 0) return 'Sin días';

    const diasMap = {
      'lunes': 'L',
      'martes': 'M',
      'miercoles': 'X',
      'jueves': 'J',
      'viernes': 'V',
      'sabado': 'S',
      'domingo': 'D'
    };

    // Si son todos los días
    if (diasArray.length === 7) return 'Todos los días';

    // Si son días de semana (L-V)
    const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
    if (diasArray.length === 5 && diasSemana.every(d => diasArray.includes(d))) {
      return 'Lun-Vie';
    }

    // Mostrar iniciales
    return diasArray.map(d => diasMap[d] || d.charAt(0).toUpperCase()).join(', ');
  };

  return (
    <div className="schedule-v2">
      {/* Header Compacto */}
      <div className="schedule-header-v2">
        <div className="schedule-header-info">
          <div className="schedule-header-icon">
            <CalendarCheck size={20} />
          </div>
          <div className="schedule-header-text">
            <h2>Programación</h2>
          </div>
          <div className="schedule-header-badges">
            <span className="header-badge success">{scheduleAssignments.length} Rutas</span>
            <span className="header-badge info">{cleaningAssignments.length} Limpieza</span>
            <span className="header-badge warning">{fumigationAssignments.length} Fumigación</span>
          </div>
        </div>

        <div className="schedule-header-actions">
          <button className="btn-add-v2" onClick={() => handleOpenRouteModal()}>
            <Plus size={16} />
            Ruta
          </button>
          <button className="btn-add-v2 secondary" onClick={handleOpenCleaningModal}>
            <Plus size={16} />
            Limpieza
          </button>
          <button className="btn-add-v2 secondary" onClick={handleOpenFumigationModal}>
            <Plus size={16} />
            Fumigación
          </button>
        </div>
      </div>

      <div className="schedule-tabs-unified">
        <button
          className={`tab-unified ${activeTab === 'routes' ? 'active' : ''}`}
          onClick={() => setActiveTab('routes')}
        >
          <Truck size={16} />
          Rutas
          <span className="tab-badge">{scheduleAssignments.length}</span>
        </button>
        <button
          className={`tab-unified ${activeTab === 'cleaning' ? 'active' : ''}`}
          onClick={() => setActiveTab('cleaning')}
        >
          <Sparkles size={16} />
          Limpieza
          <span className="tab-badge">{cleaningAssignments.length}</span>
        </button>
        <button
          className={`tab-unified ${activeTab === 'fumigation' ? 'active' : ''}`}
          onClick={() => setActiveTab('fumigation')}
        >
          <Bug size={16} />
          Fumigación
          <span className="tab-badge">{fumigationAssignments.length}</span>
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
                  <Truck size={40} />
                  <h3>No hay rutas programadas</h3>
                  <p>Comienza agregando una nueva asignación de ruta</p>
                  <button className="btn btn--primary btn--sm" onClick={() => handleOpenRouteModal()}>
                    <Plus size={16} /> Nueva Ruta
                  </button>
                </div>
              ) : (
                <div className="assignments-table-container">
                  <table className="assignments-table">
                    <thead>
                      <tr>
                        <th>Ruta</th>
                        <th>Semana</th>
                        <th>Días</th>
                        <th>Horario</th>
                        <th>Conductor</th>
                        <th>Vehículo</th>
                        <th style={{ width: '80px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduleAssignments.map(assignment => {
                        const fechaSemana = assignment.fecha_asignacion || assignment.fecha;
                        const fechaInicio = new Date(fechaSemana + 'T12:00:00');
                        const fechaFin = new Date(fechaSemana + 'T12:00:00');
                        fechaFin.setDate(fechaFin.getDate() + 6);

                        const formatoCorto = `${fechaInicio.getDate()}-${fechaFin.getDate()} ${fechaInicio.toLocaleDateString('es-ES', { month: 'short' })}`;

                        const ruta = routes.find(r => (r._id || r.id) === assignment.ruta_id);
                        const vehiculo = vehicles.find(v => (v._id || v.id) === assignment.vehiculo_id);

                        return (
                          <tr key={assignment._id || assignment.id}>
                            <td className="cell-name">{ruta?.nombre || assignment.ruta?.nombre || 'Sin nombre'}</td>
                            <td>
                              <span className="cell-badge success">{formatoCorto}</span>
                            </td>
                            <td>
                              <span className="cell-badge info">{formatDiasSemana(assignment.dias_semana)}</span>
                            </td>
                            <td className="cell-meta">
                              {formatTime12h(assignment.hora_inicio)} - {formatTime12h(assignment.hora_fin)}
                            </td>
                            <td>{assignment.conductor_nombre}</td>
                            <td className="cell-meta">{vehiculo?.placa || 'N/A'}</td>
                            <td className="cell-actions">
                              <button
                                className="btn-icon btn-icon--sm"
                                onClick={() => handleOpenRouteModal(assignment)}
                                title="Editar"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                className="btn-icon btn-icon--sm btn-icon--danger"
                                onClick={() => handleDeleteRoute(assignment._id || assignment.id)}
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'cleaning' && (
            <div className="assignments-list">
              {cleaningAssignments.length === 0 ? (
                <div className="empty-state">
                  <Sparkles size={40} />
                  <h3>No hay tareas de limpieza programadas</h3>
                  <p>Comienza agregando una nueva asignación de limpieza</p>
                  <button className="btn btn--primary btn--sm" onClick={handleOpenCleaningModal}>
                    <Plus size={16} /> Nueva Asignación
                  </button>
                </div>
              ) : (
                <div className="assignments-table-container">
                  <table className="assignments-table">
                    <thead>
                      <tr>
                        <th>Lugar</th>
                        <th>Área</th>
                        <th>Fecha</th>
                        <th>Hora</th>
                        <th>Estado</th>
                        <th>Fotos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cleaningAssignments.map(assignment => (
                        <tr key={assignment._id || assignment.id}>
                          <td className="cell-name">{getLugarNombre(assignment.lugar_id)}</td>
                          <td>{getAreaNombre(assignment.area_id)}</td>
                          <td className="cell-meta">{formatDate(assignment.fecha)}</td>
                          <td className="cell-meta">{formatTime12h(assignment.hora)}</td>
                          <td>
                            <span className={`cell-badge ${assignment.estado === 'completada' ? 'success' : 'info'}`}>
                              {assignment.estado}
                            </span>
                          </td>
                          <td className="cell-meta">
                            {assignment.fotos && assignment.fotos.length > 0 ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Camera size={14} />
                                {assignment.fotos.length}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'fumigation' && (
            <div className="fumigation-embedded-container">
              <FumigationComponent userRole="admin" embedded={true} />
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
                      options={activeRoutes
                        .filter(route => route.tipo_servicio === 'recoleccion')
                        .map(route => ({
                          value: route._id || route.id,
                          label: route.nombre
                        }))}
                      placeholder="Seleccionar ruta de recolección"
                      searchable
                    />

                    {routeFormData.ruta_id && (() => {
                      const selectedRoute = routes.find(r => String(r._id || r.id) === String(routeFormData.ruta_id));
                      return selectedRoute && selectedRoute.hora_inicio && selectedRoute.hora_fin ? (
                        <div style={{
                          marginTop: '12px',
                          padding: '12px 16px',
                          background: 'linear-gradient(135deg, #3D5229 0%, #556B2F 100%)',
                          borderRadius: '10px',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}>
                          <Clock size={18} />
                          <span>Horario de la ruta: {formatTime12h(selectedRoute.hora_inicio)} - {formatTime12h(selectedRoute.hora_fin)}</span>
                        </div>
                      ) : null;
                    })()}

                    <CustomSelect
                      label="Vehículo"
                      required
                      value={routeFormData.vehiculo_id}
                      onChange={(value) => handleRouteInputChange('vehiculo_id', value)}
                      options={compatibleVehicles.map(vehicle => ({
                        value: vehicle._id || vehicle.id,
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
                      onChange={(value) => {
                        setRouteFormData({
                          ...routeFormData,
                          conductor_nombre: value
                        });
                      }}
                      options={activePersonnel.filter(p => (p.cargo || p.puesto) === 'Conductor').map(person => ({
                        value: `${person.nombre} ${person.apellido}`,
                        label: `${person.nombre} ${person.apellido} - ${person.cargo || person.puesto}`
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
                  {showRulesBanner && (
                    <div style={{
                      padding: '14px 48px 14px 18px',
                      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                      border: '1.5px solid #6b9656',
                      borderRadius: '10px',
                      marginBottom: '16px',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      position: 'relative'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3D5229 0%, #556B2F 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        flexShrink: 0
                      }}>
                        <Info size={18} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: '600',
                          color: '#3D5229',
                          marginBottom: '6px',
                          fontSize: '13px'
                        }}>
                          Reglas de Asignación
                        </div>
                        <ul style={{
                          margin: 0,
                          paddingLeft: '18px',
                          color: '#556B2F',
                          fontSize: '12px',
                          lineHeight: '1.6'
                        }}>
                          <li>Solo puedes asignar en los días permitidos por la ruta seleccionada</li>
                          <li>El horario se toma automáticamente de la configuración de la ruta</li>
                          <li>No se pueden duplicar asignaciones en la misma semana</li>
                          <li>Puedes asignar la misma ruta en semanas diferentes</li>
                        </ul>
                      </div>
                      <button
                        onClick={() => setShowRulesBanner(false)}
                        type="button"
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'transparent',
                          border: 'none',
                          color: '#6b9656',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(107, 150, 86, 0.1)';
                          e.currentTarget.style.color = '#3D5229';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#6b9656';
                        }}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}

                  <div style={{
                    marginBottom: '16px',
                    padding: '16px',
                    background: 'linear-gradient(135deg, #3D5229 0%, #556B2F 100%)',
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
              <div className="header-content">
                <div className="header-icon">
                  <Sparkles size={28} />
                </div>
                <div className="header-text">
                  <h3 className="modal-title">Nueva Asignación de Limpieza</h3>
                  <p className="modal-subtitle">Complete los detalles para crear la asignación</p>
                </div>
              </div>
              <button className="modal-close" onClick={handleCloseModal}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCleaningSubmit}>
              <div className="modal-body">
                <div className="form-grid-2col">
                  <div className="form-group-card">
                    <div className="card-label">
                      <Map size={18} />
                      <span>Ubicación</span>
                    </div>
                    
                    <CustomSelect
                      label="Lugar"
                      required
                      value={cleaningFormData.lugar_id}
                      onChange={(value) => {
                        setCleaningFormData({ ...cleaningFormData, lugar_id: value, area_id: '' });
                        setAvailableAreas(getAreasByLugar(value));
                        setErrors({ ...errors, lugar_id: '' });
                      }}
                      options={lugares.map(lugar => ({
                        value: lugar.id,
                        label: lugar.nombre
                      }))}
                      placeholder="Seleccionar lugar"
                      searchable
                    />

                    <CustomSelect
                      label="Área"
                      required
                      value={cleaningFormData.area_id}
                      onChange={(value) => {
                        setCleaningFormData({ ...cleaningFormData, area_id: value });
                        setErrors({ ...errors, area_id: '' });
                      }}
                      options={availableAreas.map(area => ({
                        value: area.id,
                        label: area.nombre
                      }))}
                      placeholder={cleaningFormData.lugar_id ? "Seleccionar área" : "Primero selecciona un lugar"}
                      searchable
                      disabled={!cleaningFormData.lugar_id}
                    />
                  </div>

                  <div className="form-group-card">
                    <div className="card-label">
                      <Calendar size={18} />
                      <span>Fecha y Hora</span>
                    </div>
                    
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
                </div>

                {cleaningFormData.area_id && (
                  <div className="form-group-card form-full-width">
                    <div className="card-label">
                      <Camera size={18} />
                      <span>Evidencia Fotográfica</span>
                    </div>
                    
                    <div className="photos-section-enhanced">
                      <div className="photos-header">
                        <div className="photos-header-icon">
                          <Camera size={20} />
                        </div>
                        <div className="photos-header-content">
                          <h4>Evidencia Fotográfica Requerida</h4>
                          <p>Sube 3 fotos: la primera será "Antes", la segunda "Durante" y la tercera "Después"</p>
                        </div>
                        <div className="photos-progress-indicator">
                          <div className="progress-count">
                            <span className="progress-number">
                              {photos.before.length + photos.during.length + photos.after.length}
                            </span>
                            <span className="progress-total">/3</span>
                          </div>
                          <span className="progress-label">Fotos</span>
                        </div>
                      </div>

                      <div className="photos-progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${((photos.before.length + photos.during.length + photos.after.length) / 3) * 100}%`
                          }}
                        />
                      </div>

                      <PhotoUploadField
                        label=""
                        photos={[...photos.before, ...photos.during, ...photos.after]}
                        onChange={(newPhotos) => {
                          const before = newPhotos[0] ? [newPhotos[0]] : [];
                          const during = newPhotos[1] ? [newPhotos[1]] : [];
                          const after = newPhotos[2] ? [newPhotos[2]] : [];

                          setPhotos({
                            before,
                            during,
                            after
                          });
                        }}
                        maxPhotos={3}
                      />

                      {(photos.before.length > 0 || photos.during.length > 0 || photos.after.length > 0) && (
                        <div className="photo-stage-indicators">
                          {photos.before.length > 0 && (
                            <div className="stage-indicator">
                              <div className="stage-badge completed">1</div>
                              <span>Antes</span>
                            </div>
                          )}
                          {photos.during.length > 0 && (
                            <div className="stage-indicator">
                              <div className="stage-badge completed">2</div>
                              <span>Durante</span>
                            </div>
                          )}
                          {photos.after.length > 0 && (
                            <div className="stage-indicator">
                              <div className="stage-badge completed">3</div>
                              <span>Después</span>
                            </div>
                          )}
                        </div>
                      )}

                      {errors.photos && (
                        <div className="error-message-enhanced">
                          <AlertTriangle size={16} />
                          <span>{errors.photos}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

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

      {/* Modal de éxito */}
      {showSuccessModal && (
        <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="success-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="success-icon-wrapper">
              <CheckCircle size={64} />
            </div>
            <h2>¡Asignación Creada!</h2>
            <p>{successMessage}</p>
            <button
              className="btn btn--primary"
              onClick={() => setShowSuccessModal(false)}
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      {/* Modal de Fumigación */}
      {showFumigationModal && (
        <FumigationModal
          isOpen={showFumigationModal}
          onClose={() => setShowFumigationModal(false)}
          assignment={null}
          onSave={handleFumigationSave}
          isEditing={false}
        />
      )}
    </div>
  );
};

export default ScheduleComponent;
