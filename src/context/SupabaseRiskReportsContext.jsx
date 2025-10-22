import { createContext, useContext, useReducer, useEffect } from 'react';
import supabaseClient from '../utils/supabaseClient';
import { DEMO_RISK_REPORTS, mergeDemoData } from '../utils/demoData';
import { useDemoMode } from '../hooks/useDemoMode';

// Crear el contexto
const SupabaseRiskReportsContext = createContext();

// Tipos de acciones
const ACTIONS = {
  SET_REPORTS: 'SET_REPORTS',
  ADD_REPORT: 'ADD_REPORT',
  UPDATE_REPORT_STATUS: 'UPDATE_REPORT_STATUS',
  DELETE_REPORT: 'DELETE_REPORT',
  LOAD_REPORTS: 'LOAD_REPORTS',
  SET_ERROR: 'SET_ERROR'
};

// Reducer para manejar el estado
const riskReportsReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_REPORTS:
      return {
        ...state,
        reports: action.payload,
        loading: false,
        error: null
      };

    case ACTIONS.ADD_REPORT:
      return {
        ...state,
        reports: [...state.reports, action.payload]
      };

    case ACTIONS.UPDATE_REPORT_STATUS:
      return {
        ...state,
        reports: state.reports.map(report =>
          report.id === action.payload.reportId
            ? { ...report, estado: action.payload.newStatus }
            : report
        )
      };

    case ACTIONS.DELETE_REPORT:
      return {
        ...state,
        reports: state.reports.filter(report => report.id !== action.payload)
      };

    case ACTIONS.LOAD_REPORTS:
      return {
        ...state,
        loading: true,
        error: null
      };

    case ACTIONS.SET_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    default:
      return state;
  }
};

// Estado inicial
const initialState = {
  reports: [],
  loading: true,
  error: null
};

// Provider del contexto
export const SupabaseRiskReportsProvider = ({ children }) => {
  const [state, dispatch] = useReducer(riskReportsReducer, initialState);
  const { isDemoMode } = useDemoMode();

  // Cargar reportes al iniciar
  useEffect(() => {
    loadReports();
  }, [isDemoMode]);

  // Función para cargar reportes
  const loadReports = async () => {
    dispatch({ type: ACTIONS.LOAD_REPORTS });
    
    try {
      const result = await supabaseClient.getAlerts();
      
      // Formatear datos para que coincidan con la estructura esperada
      const formattedReports = (result.rows || []).map(alert => {
        // Mapear tipo_riesgo a nombre legible
        const categoriaMap = {
          'mecanico': 'Problemas mecánicos',
          'combustible': 'Combustible',
          'seguridad': 'Equipo de seguridad',
          'mantenimiento': 'Mantenimiento requerido',
          'bloqueo_via': 'Bloqueo de vía',
          'seguridad_ciudadana': 'Seguridad ciudadana',
          'climatico': 'Condiciones climáticas',
          'manifestacion': 'Protesta o manifestación',
          'accidente': 'Accidente de tránsito',
          'operacional': 'Operacional'
        };

        // Determinar si es interno o externo basado en tipo_riesgo
        const esInterno = ['seguridad', 'vehiculo', 'mecanico', 'operacional', 'interno', 'mantenimiento', 'combustible'].includes(
          (alert.tipo_riesgo || '').toLowerCase()
        );

        return {
          id: alert.id,
          tipo: esInterno ? 'interno' : 'externo',
          titulo: alert.titulo || 'Reporte de Riesgo',
          descripcion: alert.descripcion || 'Sin descripción',
          conductor: alert.empleado_nombre || 'Sin asignar',
          ubicacion: alert.ubicacion || 'Sin ubicación',
          prioridad: alert.nivel_severidad === 'critico' ? 'critica' :
                    alert.nivel_severidad === 'alto' ? 'alta' :
                    alert.nivel_severidad === 'medio' ? 'media' : 'baja',
          estado: alert.estado || 'reportado',
          categoria: categoriaMap[alert.tipo_riesgo] || alert.tipo_riesgo || 'Operacional',
          camion: alert.vehiculo_placa || 'N/A',
          proyecto: alert.proyecto_nombre || 'Sin proyecto',
          severidad: alert.nivel_severidad,
          prioridadNumerica: alert.prioridad || 5,
          fechaCreacion: alert.fecha_reporte || alert.created_at,
          fechaActualizacion: alert.updated_at || alert.created_at,
          // Campos adicionales
          empleadoId: alert.empleado_reporta_id,
          vehiculoId: alert.vehiculo_id,
          proyectoId: alert.proyecto_id,
          gpsLatitud: alert.gps_latitud,
          gpsLongitud: alert.gps_longitud
        };
      });

      // Mezclar con datos demo si el modo demo está activo
      const finalReports = isDemoMode ? mergeDemoData(formattedReports, DEMO_RISK_REPORTS) : formattedReports;

      dispatch({ type: ACTIONS.SET_REPORTS, payload: finalReports });
    } catch (error) {
      console.error('Error loading reports:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
    }
  };

  // Función para agregar un nuevo reporte
  const addReport = async (reportData) => {
    try {
      // reportData ya viene con el formato correcto para Supabase desde ConductorDashboard
      const result = await supabaseClient.addAlert(reportData);
      const newAlert = result.rows[0];

      // Mapear tipo_riesgo a nombre legible
      const categoriaMap = {
        'mecanico': 'Problemas mecánicos',
        'combustible': 'Combustible',
        'seguridad': 'Equipo de seguridad',
        'mantenimiento': 'Mantenimiento requerido',
        'bloqueo_via': 'Bloqueo de vía',
        'seguridad_ciudadana': 'Seguridad ciudadana',
        'climatico': 'Condiciones climáticas',
        'manifestacion': 'Protesta o manifestación',
        'accidente': 'Accidente de tránsito',
        'operacional': 'Operacional'
      };

      // Formatear para el estado
      const formattedReport = {
        id: newAlert.id,
        tipo: newAlert.tipo_riesgo || 'operacional',
        titulo: newAlert.titulo,
        descripcion: newAlert.descripcion,
        conductor: reportData.conductor || 'Sin asignar',
        ubicacion: newAlert.ubicacion || 'Sin ubicación',
        prioridad: newAlert.nivel_severidad === 'critico' ? 'critica' :
                  newAlert.nivel_severidad === 'alto' ? 'alta' :
                  newAlert.nivel_severidad === 'medio' ? 'media' : 'baja',
        estado: 'reportado',
        categoria: categoriaMap[newAlert.tipo_riesgo] || newAlert.tipo_riesgo || 'Operacional',
        camion: reportData.camion || 'N/A',
        fechaCreacion: newAlert.fecha_reporte || newAlert.created_at,
        fechaActualizacion: newAlert.updated_at,
        empleadoId: newAlert.empleado_reporta_id,
        vehiculoId: newAlert.vehiculo_id,
        proyectoId: newAlert.proyecto_id,
        gpsLatitud: newAlert.gps_latitud,
        gpsLongitud: newAlert.gps_longitud
      };

      dispatch({ type: ACTIONS.ADD_REPORT, payload: formattedReport });

      // Recargar todos los reportes para actualizar la vista
      await loadReports();

      return formattedReport;
    } catch (error) {
      console.error('Error adding report:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Función para actualizar el estado de un reporte
  const updateReportStatus = async (reportId, newStatus) => {
    try {
      const updates = {
        leida: newStatus === 'resuelto'
      };
      
      await supabaseClient.updateAlert(reportId, updates);
      dispatch({ 
        type: ACTIONS.UPDATE_REPORT_STATUS, 
        payload: { reportId, newStatus } 
      });
    } catch (error) {
      console.error('Error updating report status:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Función para eliminar un reporte
  const deleteReport = async (reportId) => {
    try {
      await supabaseClient.deleteAlert(reportId);
      dispatch({ type: ACTIONS.DELETE_REPORT, payload: reportId });
    } catch (error) {
      console.error('Error deleting report:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Función para obtener reportes por conductor
  const getReportsByDriver = (driverName) => {
    return state.reports.filter(report => 
      report.conductor && report.conductor.toLowerCase().includes(driverName.toLowerCase())
    );
  };

  // Función para obtener estadísticas
  const getReportStats = () => {
    const total = state.reports.length;
    const internos = state.reports.filter(r => r.tipo === 'interno').length;
    const externos = state.reports.filter(r => r.tipo === 'externo').length;
    const pendientes = state.reports.filter(r => !r.leida).length;
    const resueltos = state.reports.filter(r => r.leida).length;
    
    const porPrioridad = {
      critica: state.reports.filter(r => r.urgente === true).length,
      alta: state.reports.filter(r => r.urgente === true).length,
      media: state.reports.filter(r => r.urgente === false).length,
      baja: state.reports.filter(r => r.urgente === false).length
    };

    return {
      total,
      internos,
      externos,
      pendientes,
      enRevision: 0, // No hay campo específico en la tabla
      resueltos,
      porPrioridad
    };
  };

  // Valor del contexto
  const value = {
    reports: state.reports,
    loading: state.loading,
    error: state.error,
    addReport,
    updateReportStatus,
    deleteReport,
    getReportsByDriver,
    getReportStats,
    loadReports
  };

  return (
    <SupabaseRiskReportsContext.Provider value={value}>
      {children}
    </SupabaseRiskReportsContext.Provider>
  );
};

// Hook para usar el contexto
export const useSupabaseRiskReports = () => {
  const context = useContext(SupabaseRiskReportsContext);
  if (!context) {
    throw new Error('useSupabaseRiskReports debe ser usado dentro de un SupabaseRiskReportsProvider');
  }
  return context;
};

export default SupabaseRiskReportsContext;