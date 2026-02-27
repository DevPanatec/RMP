import { useState } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { ChevronLeft, ChevronRight, Clock, AlertTriangle } from '../Icons';
import MaintenanceTaskModal from './MaintenanceTaskModal';

const MaintenanceCalendar = () => {
  const { tasks, alerts } = useMaintenance();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTask(null);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getTasksForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(task => task.fecha_programada === dateStr);
  };

  const getAlertStatusForDay = (day) => {
    const dayTasks = getTasksForDay(day);
    const now = new Date();
    const dayDate = new Date(year, month, day);

    if (dayTasks.length === 0) return 'none';

    if (dayTasks.some(t => t.estado !== 'completada') && dayDate < now) {
      return 'overdue';
    }

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    if (dayTasks.some(t => t.estado !== 'completada') && dayDate >= now && dayDate <= threeDaysFromNow) {
      return 'upcoming';
    }

    return 'none';
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const getTaskTypeClass = (tipo) => {
    switch (tipo) {
      case 'preventivo': return 'maint-cal-task--preventivo';
      case 'correctivo': return 'maint-cal-task--correctivo';
      default: return 'maint-cal-task--contingencia';
    }
  };

  const getDayClass = (day) => {
    const alertStatus = getAlertStatusForDay(day);
    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

    if (alertStatus === 'overdue') return 'maint-cal-day maint-cal-day--overdue';
    if (alertStatus === 'upcoming') return 'maint-cal-day maint-cal-day--upcoming';
    if (isToday) return 'maint-cal-day maint-cal-day--today';
    return 'maint-cal-day';
  };

  const renderCalendarDays = () => {
    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} style={{ aspectRatio: '1' }} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayTasks = getTasksForDay(day);
      const alertStatus = getAlertStatusForDay(day);
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

      days.push(
        <div key={day} className={getDayClass(day)}>
          <div className="maint-cal-day__header">
            <span className={`maint-cal-day__number ${isToday ? 'maint-cal-day__number--today' : ''}`}>
              {day}
            </span>
            {alertStatus !== 'none' && (
              <AlertTriangle size={14} style={{ color: alertStatus === 'overdue' ? 'var(--color-error)' : 'var(--color-warning)' }} />
            )}
          </div>

          <div className="maint-cal-day__tasks">
            {dayTasks.slice(0, 3).map((task) => (
              <div
                key={task._id}
                onClick={() => handleTaskClick(task)}
                className={`maint-cal-task ${getTaskTypeClass(task.tipo)} ${task.estado === 'completada' ? 'maint-cal-task--completed' : ''}`}
              >
                <Clock size={10} />
                <span className="maint-cal-task__time">
                  {task.titulo}
                </span>
              </div>
            ))}
            {dayTasks.length > 3 && (
              <div className="maint-cal-more">
                +{dayTasks.length - 3} más
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const activeAlerts = alerts.filter(a => !a.leida);

  return (
    <div className="maintenance-section">
      {/* Header */}
      <div className="maint-cal-header">
        <div className="maint-cal-header__layout">
          <div>
            <h2 className="maint-cal-header__title">
              {monthNames[month]} {year}
            </h2>
            <p className="maint-cal-header__subtitle">
              Calendario de Mantenimiento
            </p>
          </div>
          <div className="maint-cal-nav">
            <button onClick={previousMonth} className="maint-cal-nav-btn">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="maint-cal-today-btn">
              Hoy
            </button>
            <button onClick={nextMonth} className="maint-cal-nav-btn">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="maint-cal-legend">
        <div className="maint-cal-legend__item maint-cal-legend__item--success">
          <div className="maint-cal-legend__dot maint-cal-legend__dot--success" />
          <span className="maint-cal-legend__label maint-cal-legend__label--success">Preventivo</span>
        </div>
        <div className="maint-cal-legend__item maint-cal-legend__item--warning">
          <div className="maint-cal-legend__dot maint-cal-legend__dot--warning" />
          <span className="maint-cal-legend__label maint-cal-legend__label--warning">Correctivo</span>
        </div>
        <div className="maint-cal-legend__item maint-cal-legend__item--error">
          <div className="maint-cal-legend__dot maint-cal-legend__dot--error" />
          <span className="maint-cal-legend__label maint-cal-legend__label--error">Contingencia</span>
        </div>
        <div className="maint-cal-legend__item maint-cal-legend__item--warning">
          <div className="maint-cal-legend__dot maint-cal-legend__dot--warning" />
          <span className="maint-cal-legend__label maint-cal-legend__label--warning">Próximo (3 días)</span>
        </div>
        <div className="maint-cal-legend__item maint-cal-legend__item--error">
          <div className="maint-cal-legend__dot maint-cal-legend__dot--error" style={{ opacity: 0.7 }} />
          <span className="maint-cal-legend__label maint-cal-legend__label--error">Vencido</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="maint-cal-grid">
        <div className="maint-cal-grid__headers">
          {dayNames.map((day) => (
            <div key={day} className="maint-cal-grid__day-name">
              {day}
            </div>
          ))}
        </div>

        <div className="maint-cal-grid__days">
          {renderCalendarDays()}
        </div>
      </div>

      {/* Active Alerts Summary */}
      {activeAlerts.length > 0 && (
        <div className="maint-cal-alerts-box">
          <div className="maint-cal-alerts-box__header">
            <AlertTriangle size={20} style={{ color: 'var(--color-warning)' }} />
            <h3 className="maint-cal-alerts-box__title">
              Alertas Activas ({activeAlerts.length})
            </h3>
          </div>
          <div className="maint-cal-alerts-box__list">
            {activeAlerts.slice(0, 3).map((alert) => (
              <div key={alert._id} className="maint-cal-alerts-box__item">
                {alert.mensaje}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && selectedTask && (
        <MaintenanceTaskModal
          task={selectedTask}
          viewMode={true}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default MaintenanceCalendar;
