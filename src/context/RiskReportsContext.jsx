import { createContext, useContext } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const RiskReportsContext = createContext();

export const RiskReportsProvider = ({ children }) => {
  const reportsData = useQuery(api.reportes_riesgo.listWithDetails);

  const addReportMutation = useMutation(api.reportes_riesgo.add);
  const updateReportMutation = useMutation(api.reportes_riesgo.update);
  const deleteReportMutation = useMutation(api.reportes_riesgo.remove);

  const reports = reportsData || [];
  const loading = reportsData === undefined;

  const addReport = async (reportData) => {
    try {
      const reportId = await addReportMutation(reportData);
      return reportId; // 🆕 Retornar el ID del reporte creado
    } catch (error) {
      console.error('Error adding report:', error);
      throw error; // 🆕 Lanzar error para que handleSubmitRiskReport lo maneje
    }
  };

  const updateReportStatus = async (reportId, newStatus) => {
    try {
      await updateReportMutation({ id: reportId, estado: newStatus });
      return { success: true };
    } catch (error) {
      console.error('Error updating report status:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteReport = async (reportId) => {
    try {
      await deleteReportMutation({ id: reportId });
      return { success: true };
    } catch (error) {
      console.error('Error deleting report:', error);
      return { success: false, error: error.message };
    }
  };

  const getReportsByDriver = (driverName) => {
    return reports.filter(report => report.conductor === driverName);
  };

  const getReportStats = () => {
    const total = reports.length;
    const internos = reports.filter(r => r.tipo === 'interno').length;
    const externos = reports.filter(r => r.tipo === 'externo').length;
    const pendientes = reports.filter(r => r.estado === 'reportado' || r.estado === 'pendiente').length;
    const enRevision = reports.filter(r => r.estado === 'en_revision').length;
    const resueltos = reports.filter(r => r.estado === 'resuelto').length;

    const porPrioridad = {
      critica: reports.filter(r => r.prioridad === 'critica').length,
      alta: reports.filter(r => r.prioridad === 'alta').length,
      media: reports.filter(r => r.prioridad === 'media').length,
      baja: reports.filter(r => r.prioridad === 'baja').length
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

  const value = {
    reports,
    loading,
    addReport,
    updateReportStatus,
    deleteReport,
    getReportsByDriver,
    getReportStats,
  };

  return <RiskReportsContext.Provider value={value}>{children}</RiskReportsContext.Provider>;
};

export const useRiskReports = () => {
  const context = useContext(RiskReportsContext);
  if (!context) throw new Error('useRiskReports must be used within RiskReportsProvider');
  return context;
};

export const useSupabaseRiskReports = useRiskReports;
export default RiskReportsContext;
