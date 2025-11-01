import { useState, useEffect, useMemo } from 'react';
import { useRoutes } from '../../context/RoutesContext';
import { useCleaning } from '../../context/CleaningContext';
import { useFumigation } from '../../context/FumigationContext';
import { useSchedule } from '../../context/ScheduleContext';
import { useMaintenance } from '../../context/MaintenanceContext';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter } from '../Icons';
import CalendarDay from './CalendarDay';
import DayDetailsModal from './DayDetailsModal';
import './CalendarComponent.css';

const CALENDAR_CONFIG = {
  maxVisibleActivities: 3,
  overloadThreshold: 4,
  showCounts: true,
  enableFilters: true,
  modalOnClick: true
};

const CalendarComponent = () => {
  const { routes, loading: routesLoading } = useRoutes();
  const { assignments: cleaningAssignments, loading: cleaningLoading } = useCleaning();
  const { assignments: fumigationAssignments, loading: fumigationLoading } = useFumigation();
  const { assignments: scheduleAssignments, loading: scheduleLoading, getDayNameFromDate, getStartOfWeekFromDate } = useSchedule();
  const { tasks: maintenanceTasks, loading: maintenanceLoading } = useMaintenance();

  console.log('📅 DEBUG CalendarComponent - cleaningAssignments:', cleaningAssignments);
  console.log('📅 DEBUG CalendarComponent - Cantidad:', cleaningAssignments.length);
  console.log('📅 DEBUG CalendarComponent - fumigationAssignments:', fumigationAssignments);
  console.log('📅 DEBUG CalendarComponent - Fumigaciones:', fumigationAssignments?.length || 0);

  const [viewMode, setViewMode] = useState('month');
  const [selectedDate, setSelectedDate] = useState(new Date()); // Default to current date
  const [filters, setFilters] = useState({
    recoleccion: true,
    fumigacion: true,
    limpieza: true,
    mantenimiento: true
  });
  const [selectedDay, setSelectedDay] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const loading = routesLoading || cleaningLoading || fumigationLoading || scheduleLoading || maintenanceLoading;

  const getActivityTypeIcon = (type) => {
    switch (type) {
      case 'recoleccion':
        return '🚛';
      case 'fumigacion':
        return '🦟';
      case 'limpieza':
        return '🧹';
      case 'mantenimiento':
        return '🔧';
      default:
        return '📌';
    }
  };

  const getActivitiesForDate = (date) => {
    // Formatear fecha en zona horaria local (no UTC) para evitar desajustes
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const dayName = getDayNameFromDate(dateStr);
    const dateWeekStart = getStartOfWeekFromDate(dateStr);
    const activities = [];

    const routeAssignments = scheduleAssignments.filter(assignment => {
      // Debe ser la misma semana (misma fecha de inicio de semana)
      if (assignment.fecha !== dateWeekStart) return false;

      // Y debe incluir este día de la semana
      if (assignment.dias_semana && Array.isArray(assignment.dias_semana)) {
        return assignment.dias_semana.includes(dayName);
      }
      return false;
    });

    // Rutas de recolección programadas
    routeAssignments.forEach(assignment => {
      const routeType = assignment.ruta?.tipo_servicio || 'recoleccion';
      const timeDisplay = assignment.hora_inicio || assignment.ruta?.hora_inicio || '08:00';

      if (filters.recoleccion && routeType === 'recoleccion') {
        activities.push({
          id: `route-rec-${assignment.id}`,
          type: 'recoleccion',
          title: assignment.ruta?.nombre || 'Ruta sin nombre',
          time: timeDisplay,
          status: assignment.estado || 'programada',
          data: {
            ...assignment,
            conductor_nombre: assignment.conductor_nombre,
            ayudantes: assignment.ayudantes || [],
            vehiculo: assignment.vehiculo
          }
        });
      }
    });

    if (filters.limpieza) {
      const cleaningForDate = cleaningAssignments.filter(
        a => a.fecha === dateStr
      );

      console.log('🗓️ DEBUG Calendario - Fecha buscada:', dateStr);
      console.log('🗓️ DEBUG Calendario - Asignaciones totales:', cleaningAssignments.length);
      console.log('🗓️ DEBUG Calendario - Asignaciones filtradas:', cleaningForDate.length);
      console.log('🗓️ DEBUG Calendario - Datos filtrados:', cleaningForDate);

      cleaningForDate.forEach(assignment => {
        const timeFormatted = assignment.hora ? assignment.hora.substring(0, 5) : '10:00';
        const activity = {
          id: `cleaning-${assignment.id}`,
          type: 'limpieza',
          title: `${assignment.lugar?.nombre || 'Lugar'} - ${assignment.area?.nombre || 'Área'}`,
          time: timeFormatted,
          status: assignment.estado,
          data: assignment
        };

        console.log('🗓️ DEBUG Calendario - Actividad agregada:', activity);
        activities.push(activity);
      });
    }

    // Fumigaciones (eventos nocturnos)
    if (filters.fumigacion && fumigationAssignments) {
      const fumigationsForDate = fumigationAssignments.filter(
        f => f.fecha === dateStr
      );

      console.log('🦟 DEBUG Calendario - Fumigaciones para fecha:', dateStr, fumigationsForDate);

      fumigationsForDate.forEach(fumigation => {
        const tipoLabel = fumigation.tipo_fumigacion === 'interna' ? 'Interna' : 'Externa';
        const timeDisplay = fumigation.horario_inicio || '19:00'; // Preset nocturno

        activities.push({
          id: `fumigation-${fumigation._id}`,
          type: 'fumigacion',
          title: `Fumigación ${tipoLabel} - ${fumigation.lugar_nombre || 'Lugar'}`,
          time: timeDisplay,
          status: fumigation.estado || 'reportada',
          data: fumigation
        });
      });
    }

    if (filters.mantenimiento) {
      const maintenanceForDate = maintenanceTasks.filter(
        task => task.scheduled_date === dateStr
      );
      maintenanceForDate.forEach(task => {
        activities.push({
          id: `maintenance-${task.id}`,
          type: 'mantenimiento',
          title: `Mantenimiento ${task.type} - ${task.observations?.substring(0, 30) || 'Tarea'}`,
          time: task.scheduled_time || '08:00',
          status: task.status,
          data: task
        });
      });
    }

    activities.sort((a, b) => a.time.localeCompare(b.time));
    return activities;
  };

  const getWeekDays = (date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay() + 1);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getMonthDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    
    for (let i = 0; i < startDay; i++) {
      const prevMonthDay = new Date(year, month, -startDay + i + 1);
      days.push({ date: prevMonthDay, isCurrentMonth: false });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    
    return days;
  };

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const monthDays = useMemo(() => getMonthDays(selectedDate), [selectedDate]);

  const getDayName = (date) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[date.getDay()];
  };

  const getMonthName = (date) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[date.getMonth()];
  };

  const getPeriodLabel = () => {
    if (viewMode === 'day') {
      return selectedDate.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else if (viewMode === 'week') {
      const endDate = new Date(weekDays[6]);
      return `${weekDays[0].getDate()} ${getMonthName(weekDays[0])} - ${endDate.getDate()} ${getMonthName(endDate)} ${selectedDate.getFullYear()}`;
    } else {
      return `${getMonthName(selectedDate)} ${selectedDate.getFullYear()}`;
    }
  };

  const nextPeriod = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };

  const prevPeriod = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const handleDayClick = (date, activities) => {
    if (CALENDAR_CONFIG.modalOnClick) {
      setSelectedDay({ date, activities });
      setShowModal(true);
    }
  };

  const toggleFilter = (filterName) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: !prev[filterName]
    }));
  };

  const formatDate = (date) => {
    // Formatear en zona horaria local (no UTC)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const isToday = (date) => {
    const today = new Date();
    return formatDate(date) === formatDate(today);
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div className="calendar-title">
          <h2><CalendarIcon size={24} /> Calendario</h2>
          <p>Vista consolidada de todas las actividades programadas</p>
        </div>
      </div>

      <div className="calendar-controls">
        <div className="view-mode-selector">
          <button 
            className={`view-mode-btn ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => setViewMode('day')}
          >
            Día
          </button>
          <button 
            className={`view-mode-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            Semana
          </button>
          <button 
            className={`view-mode-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            Mes
          </button>
        </div>
        
        <div className="period-label">
          {getPeriodLabel()}
        </div>
        
        <div className="date-navigation">
          <button className="btn btn--sm btn--outline" onClick={prevPeriod}>
            <ChevronLeft size={16} /> Anterior
          </button>
          <button className="btn btn--sm" onClick={goToToday}>
            Hoy
          </button>
          <button className="btn btn--sm btn--outline" onClick={nextPeriod}>
            Siguiente <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {CALENDAR_CONFIG.enableFilters && (
        <div className="calendar-filters">
          <div className="filters-label">
            <Filter size={16} /> Filtrar por:
          </div>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filters.recoleccion ? 'active' : ''}`}
              onClick={() => toggleFilter('recoleccion')}
            >
              🚛 Recolección
            </button>
            <button
              className={`filter-btn ${filters.fumigacion ? 'active' : ''}`}
              onClick={() => toggleFilter('fumigacion')}
            >
              🦟 Fumigación
            </button>
            <button
              className={`filter-btn ${filters.limpieza ? 'active' : ''}`}
              onClick={() => toggleFilter('limpieza')}
            >
              🧹 Limpieza
            </button>
            <button
              className={`filter-btn ${filters.mantenimiento ? 'active' : ''}`}
              onClick={() => toggleFilter('mantenimiento')}
            >
              🔧 Mantenimiento
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="calendar-loading">
          <div className="spinner"></div>
          <p>Cargando calendario...</p>
        </div>
      ) : (
        <>
          {viewMode === 'day' && (
            <div className="calendar-day-view">
              <CalendarDay
                date={selectedDate}
                activities={getActivitiesForDate(selectedDate)}
                isToday={isToday(selectedDate)}
                config={CALENDAR_CONFIG}
                onDayClick={handleDayClick}
                viewMode="day"
              />
            </div>
          )}

          {viewMode === 'week' && (
            <div className="calendar-week-view">
              <div className="week-grid">
                {weekDays.map((day, index) => {
                  const activities = getActivitiesForDate(day);
                  return (
                    <CalendarDay
                      key={index}
                      date={day}
                      activities={activities}
                      isToday={isToday(day)}
                      config={CALENDAR_CONFIG}
                      onDayClick={handleDayClick}
                      viewMode="week"
                    />
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'month' && (
            <div className="calendar-month-view">
              <div className="month-header">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, idx) => (
                  <div key={idx} className="month-weekday">{day}</div>
                ))}
              </div>
              <div className="month-grid">
                {monthDays.map((dayObj, index) => {
                  const activities = getActivitiesForDate(dayObj.date);
                  return (
                    <CalendarDay
                      key={index}
                      date={dayObj.date}
                      activities={activities}
                      isToday={isToday(dayObj.date)}
                      isCurrentMonth={dayObj.isCurrentMonth}
                      config={CALENDAR_CONFIG}
                      onDayClick={handleDayClick}
                      viewMode="month"
                    />
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {showModal && selectedDay && (
        <DayDetailsModal
          date={selectedDay.date}
          activities={selectedDay.activities}
          onClose={() => setShowModal(false)}
          filters={filters}
          onFilterChange={toggleFilter}
        />
      )}
    </div>
  );
};

export default CalendarComponent;
