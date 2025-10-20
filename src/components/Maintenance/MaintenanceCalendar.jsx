import { useState } from 'react';
import { useSupabaseMaintenance } from '../../context/SupabaseMaintenanceContext';
import { ChevronLeft, ChevronRight, Clock, AlertTriangle } from '../Icons';
import MaintenanceTaskModal from './MaintenanceTaskModal';

const MaintenanceCalendar = () => {
  const { tasks, alerts } = useSupabaseMaintenance();
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
    return tasks.filter(task => task.scheduled_date === dateStr);
  };

  const getAlertStatusForDay = (day) => {
    const dayTasks = getTasksForDay(day);
    const now = new Date();
    const dayDate = new Date(year, month, day);

    if (dayTasks.length === 0) return 'none';

    // Si hay tareas pendientes y la fecha ya pasó
    if (dayTasks.some(t => t.status !== 'completada') && dayDate < now) {
      return 'overdue';
    }

    // Si hay tareas próximas (en los próximos 3 días)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    if (dayTasks.some(t => t.status !== 'completada') && dayDate >= now && dayDate <= threeDaysFromNow) {
      return 'upcoming';
    }

    return 'none';
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const renderCalendarDays = () => {
    const days = [];

    // Empty cells for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} style={{ aspectRatio: '1' }} />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayTasks = getTasksForDay(day);
      const alertStatus = getAlertStatusForDay(day);
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

      const bgColor = alertStatus === 'overdue' ? 'rgba(255, 59, 48, 0.05)' :
                     alertStatus === 'upcoming' ? 'rgba(255, 204, 0, 0.05)' :
                     isToday ? 'rgba(0, 122, 255, 0.05)' : 'white';

      const borderColor = alertStatus === 'overdue' ? 'rgba(255, 59, 48, 0.3)' :
                         alertStatus === 'upcoming' ? 'rgba(255, 204, 0, 0.3)' :
                         isToday ? 'rgba(0, 122, 255, 0.3)' : 'var(--color-border)';

      days.push(
        <div
          key={day}
          style={{
            aspectRatio: '1',
            border: `1px solid ${borderColor}`,
            padding: '8px',
            background: bgColor,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{
              fontSize: '14px',
              fontWeight: '500',
              color: isToday ? '#007aff' : '#333'
            }}>
              {day}
            </span>
            {alertStatus !== 'none' && (
              <AlertTriangle size={14} style={{ color: alertStatus === 'overdue' ? '#ff3b30' : '#ffcc00' }} />
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {dayTasks.slice(0, 3).map((task) => (
              <div
                key={task.id}
                onClick={() => handleTaskClick(task)}
                style={{
                  cursor: 'pointer',
                  fontSize: '10px',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  background: task.type === 'preventivo' ? 'rgba(52, 199, 89, 0.1)' :
                             task.type === 'correctivo' ? 'rgba(255, 149, 0, 0.1)' :
                             'rgba(255, 59, 48, 0.1)',
                  color: task.type === 'preventivo' ? '#34c759' :
                        task.type === 'correctivo' ? '#ff9500' : '#ff3b30',
                  opacity: task.status === 'completada' ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Clock size={10} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.scheduled_time}
                </span>
              </div>
            ))}
            {dayTasks.length > 3 && (
              <div style={{ fontSize: '10px', color: '#999', padding: '2px 6px' }}>
                +{dayTasks.length - 3} más
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="maintenance-section">
      {/* Header con gradiente */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)',
        borderRadius: '20px',
        padding: '32px',
        color: 'white',
        marginBottom: '24px',
        boxShadow: '0 8px 32px rgba(61, 82, 41, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 8px 0' }}>
              📅 {monthNames[month]} {year}
            </h2>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '15px' }}>
              Calendario de Mantenimiento
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={previousMonth}
              style={{
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              style={{
                padding: '10px 20px',
                background: 'rgba(255, 255, 255, 0.95)',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                color: 'var(--color-primary)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'white'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)'}
            >
              Hoy
            </button>
            <button
              onClick={nextMonth}
              style={{
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Legend con cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.1) 0%, rgba(52, 199, 89, 0.05) 100%)',
          border: '1px solid rgba(52, 199, 89, 0.2)',
          borderRadius: '12px',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{ width: '12px', height: '12px', background: '#34c759', borderRadius: '50%' }} />
          <span style={{ fontSize: '13px', fontWeight: '500', color: '#34c759' }}>Preventivo</span>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 149, 0, 0.1) 0%, rgba(255, 149, 0, 0.05) 100%)',
          border: '1px solid rgba(255, 149, 0, 0.2)',
          borderRadius: '12px',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{ width: '12px', height: '12px', background: '#ff9500', borderRadius: '50%' }} />
          <span style={{ fontSize: '13px', fontWeight: '500', color: '#ff9500' }}>Correctivo</span>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 59, 48, 0.1) 0%, rgba(255, 59, 48, 0.05) 100%)',
          border: '1px solid rgba(255, 59, 48, 0.2)',
          borderRadius: '12px',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{ width: '12px', height: '12px', background: '#ff3b30', borderRadius: '50%' }} />
          <span style={{ fontSize: '13px', fontWeight: '500', color: '#ff3b30' }}>Contingencia</span>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 204, 0, 0.1) 0%, rgba(255, 204, 0, 0.05) 100%)',
          border: '1px solid rgba(255, 204, 0, 0.2)',
          borderRadius: '12px',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{ width: '12px', height: '12px', background: '#ffcc00', borderRadius: '50%' }} />
          <span style={{ fontSize: '13px', fontWeight: '500', color: '#ffcc00' }}>Próximo (3 días)</span>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 59, 48, 0.1) 0%, rgba(255, 59, 48, 0.05) 100%)',
          border: '1px solid rgba(255, 59, 48, 0.3)',
          borderRadius: '12px',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{ width: '12px', height: '12px', background: '#ff3b30', borderRadius: '50%', opacity: 0.7 }} />
          <span style={{ fontSize: '13px', fontWeight: '500', color: '#ff3b30' }}>Vencido</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div style={{ border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--color-background-secondary)' }}>
          {dayNames.map((day) => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: '600',
                padding: '12px',
                borderBottom: '1px solid var(--color-border)',
                color: '#666'
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {renderCalendarDays()}
        </div>
      </div>

      {/* Active Alerts Summary */}
      {alerts.filter(a => a.status === 'active').length > 0 && (
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(255, 204, 0, 0.05)',
          border: '1px solid rgba(255, 204, 0, 0.2)',
          borderRadius: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <AlertTriangle size={20} style={{ color: '#ffcc00' }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#333' }}>
              Alertas Activas ({alerts.filter(a => a.status === 'active').length})
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {alerts.filter(a => a.status === 'active').slice(0, 3).map((alert) => (
              <div key={alert.id} style={{ fontSize: '14px', color: '#666' }}>
                {alert.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal para ver detalles de tarea */}
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
