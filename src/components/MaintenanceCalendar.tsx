import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, AlertTriangle } from 'lucide-react';
import { useSupabaseMaintenance } from '../context/SupabaseMaintenanceContext';

const MaintenanceCalendar: React.FC = () => {
  const { tasks, alerts } = useSupabaseMaintenance();
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
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

  const getTasksForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(task => task.scheduled_date === dateStr);
  };

  const getAlertStatusForDay = (day: number): 'none' | 'upcoming' | 'overdue' => {
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
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayTasks = getTasksForDay(day);
      const alertStatus = getAlertStatusForDay(day);
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

      days.push(
        <div
          key={day}
          className={`aspect-square border border-gray-200 p-2 relative ${
            isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'
          } ${alertStatus === 'overdue' ? 'bg-red-50' : ''} ${
            alertStatus === 'upcoming' ? 'bg-yellow-50' : ''
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-sm font-medium ${
                isToday ? 'text-blue-600' : 'text-gray-700'
              }`}>
                {day}
              </span>
              {alertStatus !== 'none' && (
                <AlertTriangle className={`w-4 h-4 ${
                  alertStatus === 'overdue' ? 'text-red-500' : 'text-yellow-500'
                }`} />
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1">
              {dayTasks.slice(0, 3).map((task, index) => (
                <div
                  key={task.id}
                  className={`text-xs px-2 py-1 rounded ${
                    task.type === 'preventivo'
                      ? 'bg-green-100 text-green-800'
                      : task.type === 'correctivo'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-red-100 text-red-800'
                  } ${task.status === 'completada' ? 'opacity-50' : ''}`}
                  title={task.observations}
                >
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span className="truncate">{task.scheduled_time}</span>
                  </div>
                </div>
              ))}
              {dayTasks.length > 3 && (
                <div className="text-xs text-gray-500 px-2">
                  +{dayTasks.length - 3} más
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {monthNames[month]} {year}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
          <span className="text-gray-600">Preventivo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-100 border border-orange-200 rounded"></div>
          <span className="text-gray-600">Correctivo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
          <span className="text-gray-600">Contingencia</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-50 border border-yellow-200 rounded"></div>
          <span className="text-gray-600">Próximo (3 días)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
          <span className="text-gray-600">Vencido</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-gray-50">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-gray-700 py-2 border-b border-gray-200"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {renderCalendarDays()}
        </div>
      </div>

      {/* Active Alerts Summary */}
      {alerts.filter(a => a.status === 'active').length > 0 && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <h3 className="font-medium text-yellow-900">
              Alertas Activas ({alerts.filter(a => a.status === 'active').length})
            </h3>
          </div>
          <div className="space-y-2">
            {alerts.filter(a => a.status === 'active').slice(0, 3).map((alert) => (
              <div key={alert.id} className="text-sm text-yellow-800">
                {alert.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceCalendar;
