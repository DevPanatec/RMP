import React from 'react';
import { AlertTriangle, Clock, X, Wrench } from 'lucide-react';
import { useSupabaseMaintenance } from '../context/SupabaseMaintenanceContext';
import { useSupabaseAuth } from '../context/SupabaseAuthContext';

const MaintenanceAlerts: React.FC = () => {
  const { user } = useSupabaseAuth();
  const { alerts, dismissAlert, tasks } = useSupabaseMaintenance();
  const isAdmin = user?.tipo === 'admin';

  const activeAlerts = alerts.filter(a => a.status === 'active');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <Wrench className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRelatedTask = (taskId?: string) => {
    if (!taskId) return null;
    return tasks.find(t => t.id === taskId);
  };

  const handleDismiss = async (alertId: string) => {
    if (isAdmin) {
      await dismissAlert(alertId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">
              {activeAlerts.filter(a => a.severity === 'critical').length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Críticas</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {activeAlerts.filter(a => a.severity === 'warning').length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Advertencias</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {activeAlerts.filter(a => a.severity === 'info').length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Informativas</div>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {activeAlerts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay alertas activas
            </h3>
            <p className="text-gray-500">
              Todas las alertas han sido atendidas o descartadas
            </p>
          </div>
        ) : (
          activeAlerts.map((alert) => {
            const relatedTask = getRelatedTask(alert.task_id);

            return (
              <div
                key={alert.id}
                className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getSeverityIcon(alert.severity)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium mb-1">{alert.message}</p>

                        {relatedTask && (
                          <div className="mt-2 p-3 bg-white bg-opacity-50 rounded-lg">
                            <div className="text-sm space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Tarea:</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  relatedTask.type === 'preventivo'
                                    ? 'bg-green-100 text-green-800'
                                    : relatedTask.type === 'correctivo'
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {relatedTask.type}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium">Fecha:</span>{' '}
                                {new Date(relatedTask.scheduled_date).toLocaleDateString('es-PA')} {relatedTask.scheduled_time}
                              </div>
                              <div>
                                <span className="font-medium">Observaciones:</span>{' '}
                                {relatedTask.observations}
                              </div>
                            </div>
                          </div>
                        )}

                        {alert.equipment_id && (
                          <div className="mt-2 text-sm">
                            <span className="font-medium">Equipo:</span> {alert.equipment_id}
                          </div>
                        )}

                        <div className="mt-2 text-xs opacity-75">
                          Programada para: {new Date(alert.scheduled_date).toLocaleString('es-PA')}
                        </div>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => handleDismiss(alert.id)}
                          className="flex-shrink-0 p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors"
                          title="Descartar alerta"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Info Message */}
      {!isAdmin && activeAlerts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            Solo los administradores pueden descartar alertas. Contacta con un administrador si necesitas atención inmediata.
          </p>
        </div>
      )}
    </div>
  );
};

export default MaintenanceAlerts;
