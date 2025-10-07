import { useState, useEffect } from 'react';
import { useSupabaseSchedule } from '../../context/SupabaseScheduleContext';
import { useSupabaseRoutes } from '../../context/SupabaseRoutesContext';
import { useSupabasePersonnel } from '../../context/SupabasePersonnelContext';
import { useSupabaseFleet } from '../../context/SupabaseFleetContext';
import { 
  Calendar, Plus, Edit, Trash2, AlertTriangle, CheckCircle,
  Truck, Users, Map, Clock, X
} from '../Icons';
import './ScheduleComponent.css';

const ScheduleComponent = () => {
  const { 
    assignments, 
    loading, 
    addAssignment, 
    updateAssignment, 
    deleteAssignment,
    checkConflicts,
    getAssignmentsForWeek
  } = useSupabaseSchedule();
  
  const { routes } = useSupabaseRoutes();
  const { personnel } = useSupabasePersonnel();
  const { vehicles } = useSupabaseFleet();

  const [viewMode, setViewMode] = useState('week'); // 'day', 'week', 'month'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [formData, setFormData] = useState({
    ruta_id: '',
    conductor_nombre: '',
    vehiculo_id: '',
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '',
    hora_fin: '',
    observaciones: ''
  });
  const [conflicts, setConflicts] = useState({ hasConflict: false, conflicts: [] });

  const activeRoutes = routes.filter(r => r.activa !== false);
  const activePersonnel = personnel.filter(p => p.estado === 'Activo');
  const activeVehicles = vehicles.filter(v => v.estado === 'activo' || v.estado === 'Disponible');

  const getWeekDays = (date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay() + 1); // Lunes
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays(selectedDate);
  const weekAssignments = getAssignmentsForWeek(weekDays[0].toISOString().split('T')[0]);

  const getDayName = (date) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[date.getDay()];
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const handleOpenModal = (assignment = null) => {
    if (assignment) {
      setEditingAssignment(assignment);
      setFormData({
        ruta_id: assignment.ruta_id,
        conductor_nombre: assignment.conductor_nombre,
        vehiculo_id: assignment.vehiculo_id,
        fecha: assignment.fecha,
        hora_inicio: assignment.hora_inicio,
        hora_fin: assignment.hora_fin,
        observaciones: assignment.observaciones || ''
      });
    } else {
      setEditingAssignment(null);
      setFormData({
        ruta_id: '',
        conductor_nombre: '',
        vehiculo_id: '',
        fecha: formatDate(selectedDate),
        hora_inicio: '',
        hora_fin: '',
        observaciones: ''
      });
    }
    setConflicts({ hasConflict: false, conflicts: [] });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAssignment(null);
    setFormData({
      ruta_id: '',
      conductor_nombre: '',
      vehiculo_id: '',
      fecha: new Date().toISOString().split('T')[0],
      hora_inicio: '',
      hora_fin: '',
      observaciones: ''
    });
    setConflicts({ hasConflict: false, conflicts: [] });
  };

  const handleInputChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    if (field === 'ruta_id' && value) {
      const selectedRoute = routes.find(r => r.id === parseInt(value));
      if (selectedRoute && selectedRoute.hora_inicio && selectedRoute.hora_fin) {
        newFormData.hora_inicio = selectedRoute.hora_inicio;
        newFormData.hora_fin = selectedRoute.hora_fin;
        setFormData(newFormData);
      }
    }

    if (newFormData.conductor_nombre && newFormData.vehiculo_id && 
        newFormData.fecha && newFormData.hora_inicio && newFormData.hora_fin) {
      const conflictCheck = checkConflicts(
        newFormData.conductor_nombre,
        parseInt(newFormData.vehiculo_id),
        newFormData.fecha,
        newFormData.hora_inicio,
        newFormData.hora_fin,
        editingAssignment?.id
      );
      setConflicts(conflictCheck);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (conflicts.hasConflict) {
      alert('No se puede guardar. Hay conflictos de horario.');
      return;
    }

    const assignmentData = {
      ...formData,
      ruta_id: parseInt(formData.ruta_id),
      vehiculo_id: parseInt(formData.vehiculo_id),
      estado: 'programada'
    };

    let result;
    if (editingAssignment) {
      result = await updateAssignment(editingAssignment.id, assignmentData);
    } else {
      result = await addAssignment(assignmentData);
    }

    if (result.success) {
      handleCloseModal();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta asignación?')) {
      const result = await deleteAssignment(id);
      if (!result.success) {
        alert(`Error: ${result.error}`);
      }
    }
  };

  const getAssignmentsForDay = (date) => {
    const dateStr = formatDate(date);
    return weekAssignments.filter(a => a.fecha === dateStr);
  };

  const nextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const prevWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  return (
    <div className="schedule-container">
      <div className="schedule-header">
        <div className="schedule-title">
          <h2><Calendar size={24} /> Programación de Rutas</h2>
          <p>Asigna conductores y vehículos a las rutas programadas</p>
        </div>
        <button className="btn btn--primary" onClick={() => handleOpenModal()}>
          <Plus size={16} /> Nueva Asignación
        </button>
      </div>

      <div className="schedule-controls">
        <div className="date-navigation">
          <button className="btn btn--sm btn--outline" onClick={prevWeek}>
            ← Anterior
          </button>
          <button className="btn btn--sm" onClick={goToToday}>
            Hoy
          </button>
          <button className="btn btn--sm btn--outline" onClick={nextWeek}>
            Siguiente →
          </button>
        </div>
        <div className="week-label">
          Semana del {weekDays[0].toLocaleDateString('es-ES')} al{' '}
          {weekDays[6].toLocaleDateString('es-ES')}
        </div>
      </div>

      {loading ? (
        <div className="schedule-loading">
          <div className="spinner"></div>
          <p>Cargando programación...</p>
        </div>
      ) : (
        <div className="schedule-grid">
          {weekDays.map((day, index) => {
            const dayAssignments = getAssignmentsForDay(day);
            const isToday = formatDate(day) === formatDate(new Date());
            
            return (
              <div key={index} className={`schedule-day ${isToday ? 'today' : ''}`}>
                <div className="day-header">
                  <div className="day-name">{getDayName(day)}</div>
                  <div className="day-date">{day.getDate()}</div>
                </div>
                
                <div className="day-assignments">
                  {dayAssignments.length === 0 ? (
                    <div className="no-assignments">
                      <p>Sin asignaciones</p>
                    </div>
                  ) : (
                    dayAssignments.map(assignment => (
                      <div key={assignment.id} className="assignment-card">
                        <div className="assignment-route">
                          <Map size={14} /> {assignment.ruta?.nombre || 'Ruta sin nombre'}
                        </div>
                        <div className="assignment-time">
                          <Clock size={12} /> {assignment.hora_inicio} - {assignment.hora_fin}
                        </div>
                        <div className="assignment-conductor">
                          <Users size={12} /> {assignment.conductor_nombre}
                        </div>
                        <div className="assignment-vehicle">
                          <Truck size={12} /> {assignment.vehiculo?.placa}
                        </div>
                        <div className="assignment-actions">
                          <button 
                            className="btn-icon btn-icon--sm"
                            onClick={() => handleOpenModal(assignment)}
                            title="Editar"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            className="btn-icon btn-icon--sm btn-icon--danger"
                            onClick={() => handleDelete(assignment.id)}
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editingAssignment ? <><Edit size={20} /> Editar Asignación</> : <><Plus size={20} /> Nueva Asignación</>}
              </h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              {conflicts.hasConflict && (
                <div className="conflict-alert">
                  <AlertTriangle size={20} />
                  <div>
                    <strong>Conflicto de horario detectado:</strong>
                    <ul>
                      {conflicts.conflicts.map((conflict, idx) => (
                        <li key={idx}>
                          {conflict.type === 'conductor' 
                            ? `El conductor ${conflict.conductor}` 
                            : `El vehículo ${conflict.vehiculo}`} 
                          ya está asignado a {conflict.ruta} de {conflict.hora}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Ruta *</label>
                  <select
                    value={formData.ruta_id}
                    onChange={(e) => handleInputChange('ruta_id', e.target.value)}
                    required
                  >
                    <option value="">Seleccionar ruta</option>
                    {activeRoutes.map(route => (
                      <option key={route.id} value={route.id}>
                        {route.nombre} - {route.tipo_servicio}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Fecha *</label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => handleInputChange('fecha', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Hora Inicio *</label>
                  <input
                    type="time"
                    value={formData.hora_inicio}
                    onChange={(e) => handleInputChange('hora_inicio', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Hora Fin *</label>
                  <input
                    type="time"
                    value={formData.hora_fin}
                    onChange={(e) => handleInputChange('hora_fin', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Conductor *</label>
                  <select
                    value={formData.conductor_nombre}
                    onChange={(e) => handleInputChange('conductor_nombre', e.target.value)}
                    required
                  >
                    <option value="">Seleccionar conductor</option>
                    {activePersonnel.map(person => (
                      <option key={person.id} value={person.nombre}>
                        {person.nombre} - {person.puesto}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Vehículo *</label>
                  <select
                    value={formData.vehiculo_id}
                    onChange={(e) => handleInputChange('vehiculo_id', e.target.value)}
                    required
                  >
                    <option value="">Seleccionar vehículo</option>
                    {activeVehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.placa} - {vehicle.nombre || vehicle.marca}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Observaciones</label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => handleInputChange('observaciones', e.target.value)}
                  rows="3"
                  placeholder="Notas adicionales..."
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn--outline" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn--primary"
                  disabled={conflicts.hasConflict}
                >
                  <CheckCircle size={16} /> {editingAssignment ? 'Actualizar' : 'Crear'} Asignación
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
