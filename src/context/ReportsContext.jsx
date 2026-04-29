import { createContext, useContext } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useProject } from './ProjectContext';

const ReportsContext = createContext();

export const ReportsProvider = ({ children }) => {
  const { currentProjectId } = useProject();
  const reportsData = useQuery(api.route_reports.list, { proyecto_id: currentProjectId ?? undefined });

  const addReportMutation = useMutation(api.route_reports.add);

  const reports = reportsData || [];
  const loading = reportsData === undefined;

  const saveRouteCompletionReport = async (reportData) => {
    try {
      await addReportMutation(reportData);
      return { success: true };
    } catch (error) {
      console.error('Error saving report:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    reports,
    loading,
    saveRouteCompletionReport,
  };

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
};

export const useReports = () => {
  const context = useContext(ReportsContext);
  if (!context) throw new Error('useReports must be used within ReportsProvider');
  return context;
};

export const useSupabaseReports = useReports;
export default ReportsContext;
