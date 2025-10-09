import { createContext, useContext, useReducer, useEffect } from 'react';
import { reportesRiesgo as initialReports } from '../data/mockData';

// Crear el contexto
const RiskReportsContext = createContext();

// Tipos de acciones
const ACTIONS = {
  SET_REPORTS: 'SET_REPORTS',
  ADD_REPORT: 'ADD_REPORT',
  UPDATE_REPORT_STATUS: 'UPDATE_REPORT_STATUS',
  DELETE_REPORT: 'DELETE_REPORT',
  LOAD_REPORTS: 'LOAD_REPORTS'
};

// Reducer para manejar el estado
const riskReportsReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_REPORTS:
      return {
        ...state,
        reports: action.payload,
        loading: false
      };

    case ACTIONS.ADD_REPORT:
      const newReports = [...state.reports, action.payload];
      // Guardar en localStorage
      localStorage.setItem('rmp_risk_reports', JSON.stringify(newReports));
      return {
        ...state,
        reports: newReports
      };

    case ACTIONS.UPDATE_REPORT_STATUS:
      const updatedReports = state.reports.map(report =>
        report.id === action.payload.reportId
          ? { 
              ...report, 
              estado: action.payload.newStatus,
              fechaActualizacion: new Date().toISOString()
            }
          : report
      );
      // Guardar en localStorage
      localStorage.setItem('rmp_risk_reports', JSON.stringify(updatedReports));
      return {
        ...state,
        reports: updatedReports
      };

    case ACTIONS.DELETE_REPORT:
      const filteredReports = state.reports.filter(report => report.id !== action.payload);
      localStorage.setItem('rmp_risk_reports', JSON.stringify(filteredReports));
      return {
        ...state,
        reports: filteredReports
      };

    case ACTIONS.LOAD_REPORTS:
      return {
        ...state,
        loading: true
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
export const RiskReportsProvider = ({ children }) => {
  const [state, dispatch] = useReducer(riskReportsReducer, initialState);

  // Cargar reportes al iniciar
  useEffect(() => {
    loadReports();
  }, []);

  // Función para cargar reportes
  const loadReports = () => {
    dispatch({ type: ACTIONS.LOAD_REPORTS });
    
    try {
      // Intentar cargar desde localStorage
      const savedReports = localStorage.getItem('rmp_risk_reports');
      
      if (savedReports) {
        const parsedReports = JSON.parse(savedReports);
        dispatch({ type: ACTIONS.SET_REPORTS, payload: parsedReports });
      } else {
        // Si no hay datos guardados, usar datos iniciales y guardarlos
        localStorage.setItem('rmp_risk_reports', JSON.stringify(initialReports));
        dispatch({ type: ACTIONS.SET_REPORTS, payload: initialReports });
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      // En caso de error, usar datos iniciales
      dispatch({ type: ACTIONS.SET_REPORTS, payload: initialReports });
    }
  };

  // Función para agregar un nuevo reporte
  const addReport = (reportData) => {
    const newReport = {
      id: `RISK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...reportData,
      estado: 'reportado',
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString()
    };

    dispatch({ type: ACTIONS.ADD_REPORT, payload: newReport });
    return newReport;
  };

  // Función para actualizar el estado de un reporte
  const updateReportStatus = (reportId, newStatus) => {
    dispatch({ 
      type: ACTIONS.UPDATE_REPORT_STATUS, 
      payload: { reportId, newStatus } 
    });
  };

  // Función para eliminar un reporte
  const deleteReport = (reportId) => {
    dispatch({ type: ACTIONS.DELETE_REPORT, payload: reportId });
  };

  // Función para obtener reportes por conductor
  const getReportsByDriver = (driverName) => {
    return state.reports.filter(report => report.conductor === driverName);
  };

  // Función para obtener estadísticas
  const getReportStats = () => {
    const total = state.reports.length;
    const internos = state.reports.filter(r => r.tipo === 'interno').length;
    const externos = state.reports.filter(r => r.tipo === 'externo').length;
    const pendientes = state.reports.filter(r => r.estado === 'reportado').length;
    const enRevision = state.reports.filter(r => r.estado === 'en_revision').length;
    const resueltos = state.reports.filter(r => r.estado === 'resuelto').length;
    
    const porPrioridad = {
      critica: state.reports.filter(r => r.prioridad === 'critica').length,
      alta: state.reports.filter(r => r.prioridad === 'alta').length,
      media: state.reports.filter(r => r.prioridad === 'media').length,
      baja: state.reports.filter(r => r.prioridad === 'baja').length
    };

    return {
      total,
      internos,
      externos,
      pendientes,
      enRevision,
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
    <RiskReportsContext.Provider value={value}>
      {children}
    </RiskReportsContext.Provider>
  );
};

// Hook para usar el contexto
export const useRiskReports = () => {
  const context = useContext(RiskReportsContext);
  if (!context) {
    throw new Error('useRiskReports debe ser usado dentro de un RiskReportsProvider');
  }
  return context;
};

export default RiskReportsContext;