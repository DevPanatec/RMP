import React from 'react';
import { Calendar, AlertTriangle, TrendingUp, Clock, DollarSign, Droplet, Wrench } from 'lucide-react';
import { useSupabaseMaintenance } from '../context/SupabaseMaintenanceContext';

const MaintenanceDashboard: React.FC = () => {
  const { tasks, alerts, getUpcomingTasks, getTasksByStatus, getOperationalStats } = useSupabaseMaintenance();

  const upcomingTasks = getUpcomingTasks(7);
  const programmedTasks = getTasksByStatus('programada');
  const inProgressTasks = getTasksByStatus('en_proceso');
  const completedTasks = getTasksByStatus('completada');
  const activeAlerts = alerts.filter(a => a.status === 'active');
  const stats = getOperationalStats();

  // Calculate overdue tasks
  const now = new Date();
  const overdueTasks = tasks.filter(task => {
    const taskDate = new Date(`${task.scheduled_date}T${task.scheduled_time}`);
    return taskDate < now && task.status !== 'completada';
  });

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon, color, subtitle }) => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tareas Programadas"
          value={programmedTasks.length}
          icon={<Calendar className="w-6 h-6 text-blue-600" />}
          color="bg-blue-100"
        />
        <StatCard
          title="En Proceso"
          value={inProgressTasks.length}
          icon={<Clock className="w-6 h-6 text-yellow-600" />}
          color="bg-yellow-100"
        />
        <StatCard
          title="Completadas"
          value={completedTasks.length}
          icon={<Wrench className="w-6 h-6 text-green-600" />}
          color="bg-green-100"
          subtitle="Este mes"
        />
        <StatCard
          title="Alertas Activas"
          value={activeAlerts.length}
          icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
          color="bg-red-100"
        />
      </div>

      {/* Operational Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Volumen Total Descargado"
          value={`${stats.totalDischarges.toLocaleString()}`}
          subtitle="galones"
          icon={<Droplet className="w-6 h-6 text-blue-600" />}
          color="bg-blue-100"
        />
        <StatCard
          title="Costo Acumulado"
          value={`B/. ${stats.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<DollarSign className="w-6 h-6 text-green-600" />}
          color="bg-green-100"
        />
        <StatCard
          title="Limpiezas Alto Impacto"
          value={stats.highImpactCleanups}
          icon={<TrendingUp className="w-6 h-6 text-orange-600" />}
          color="bg-orange-100"
        />
        <StatCard
          title="Duración Promedio"
          value={`${stats.averageWorkDuration.toFixed(1)}`}
          subtitle="horas"
          icon={<Clock className="w-6 h-6 text-purple-600" />}
          color="bg-purple-100"
        />
      </div>

      {/* Overdue Tasks Alert */}
      {overdueTasks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-1">
                {overdueTasks.length} Tarea{overdueTasks.length !== 1 ? 's' : ''} Vencida{overdueTasks.length !== 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-red-800">
                Hay tareas que no se han completado en la fecha programada. Revísalas lo antes posible.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Tasks */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Próximos Mantenimientos (7 días)
        </h3>

        {upcomingTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay mantenimientos programados para los próximos 7 días
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingTasks.map((task) => {
              const taskDate = new Date(`${task.scheduled_date}T${task.scheduled_time}`);
              const daysUntil = Math.ceil((taskDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-lg border ${
                    daysUntil <= 1
                      ? 'bg-red-50 border-red-200'
                      : daysUntil <= 3
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          task.type === 'preventivo'
                            ? 'bg-green-100 text-green-800'
                            : task.type === 'correctivo'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {task.type}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(task.scheduled_date).toLocaleDateString('es-PA')} {task.scheduled_time}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{task.observations}</p>
                      {task.operational_data && (
                        <div className="mt-2 text-xs text-gray-600">
                          Volumen estimado: {task.operational_data.volume_discharged?.toLocaleString()} gal ·
                          Costo: B/. {task.operational_data.total_estimated_cost?.toFixed(2)}
                        </div>
                      )}
                    </div>
                    <div className={`text-sm font-medium ${
                      daysUntil <= 1
                        ? 'text-red-700'
                        : daysUntil <= 3
                        ? 'text-yellow-700'
                        : 'text-blue-700'
                    }`}>
                      {daysUntil === 0 ? 'Hoy' : daysUntil === 1 ? 'Mañana' : `En ${daysUntil} días`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Completed Tasks */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Mantenimientos Completados Recientes
        </h3>

        {completedTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay mantenimientos completados aún
          </div>
        ) : (
          <div className="space-y-3">
            {completedTasks.slice(0, 5).map((task) => (
              <div key={task.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        task.type === 'preventivo'
                          ? 'bg-green-100 text-green-800'
                          : task.type === 'correctivo'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {task.type}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        Completado: {task.completed_at ? new Date(task.completed_at).toLocaleDateString('es-PA') : '-'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{task.observations}</p>
                    {task.operational_data && (
                      <div className="mt-2 grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="text-gray-600">Volumen:</span>{' '}
                          <span className="font-medium text-gray-900">
                            {task.operational_data.volume_discharged?.toLocaleString()} gal
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Costo:</span>{' '}
                          <span className="font-medium text-gray-900">
                            B/. {task.operational_data.total_estimated_cost?.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Duración:</span>{' '}
                          <span className="font-medium text-gray-900">
                            {task.operational_data.work_duration} hrs
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceDashboard;
