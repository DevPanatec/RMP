import React, { useState } from 'react';
import { Wrench, Plus, Calendar, AlertTriangle, CheckCircle, Clock, Filter } from 'lucide-react';
import { useSupabaseMaintenance } from '../context/SupabaseMaintenanceContext';
import { useSupabaseAuth } from '../context/SupabaseAuthContext';
import MaintenanceTaskForm from './MaintenanceTaskForm';
import MaintenanceCalendar from './MaintenanceCalendar';
import MaintenanceDashboard from './MaintenanceDashboard';
import MaintenanceTaskList from './MaintenanceTaskList';
import MaintenanceAlerts from './MaintenanceAlerts';

type View = 'dashboard' | 'tasks' | 'calendar' | 'alerts';

const MaintenanceManager: React.FC = () => {
  const { user } = useSupabaseAuth();
  const { tasks, alerts, loading } = useSupabaseMaintenance();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  const isAdmin = user?.tipo === 'admin';
  const activeAlerts = alerts.filter(a => a.status === 'active');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Wrench className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mantenimiento</h1>
              <p className="text-sm text-gray-500">Planta de Tratamiento - Mercado San Felipe Neri</p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowTaskForm(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nueva Tarea
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`px-4 py-2 font-medium transition-colors ${
              currentView === 'dashboard'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentView('tasks')}
            className={`px-4 py-2 font-medium transition-colors ${
              currentView === 'tasks'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Tareas
          </button>
          <button
            onClick={() => setCurrentView('calendar')}
            className={`px-4 py-2 font-medium transition-colors ${
              currentView === 'calendar'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Calendario
          </button>
          <button
            onClick={() => setCurrentView('alerts')}
            className={`px-4 py-2 font-medium transition-colors relative ${
              currentView === 'alerts'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Alertas
            {activeAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeAlerts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div>
        {currentView === 'dashboard' && <MaintenanceDashboard />}
        {currentView === 'tasks' && (
          <MaintenanceTaskList
            onEditTask={(taskId) => {
              setSelectedTask(taskId);
              setShowTaskForm(true);
            }}
          />
        )}
        {currentView === 'calendar' && <MaintenanceCalendar />}
        {currentView === 'alerts' && <MaintenanceAlerts />}
      </div>

      {/* Task Form Modal */}
      {showTaskForm && (
        <MaintenanceTaskForm
          taskId={selectedTask}
          onClose={() => {
            setShowTaskForm(false);
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
};

export default MaintenanceManager;
