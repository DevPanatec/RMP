import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationContext';

const ProjectContext = createContext(null);

export const ProjectProvider = ({ children }) => {
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();
  const isAdmin = user?.tipo === 'admin' || user?.tipo === 'super_admin';

  // Convex query: filtra por currentOrgId si super_admin tiene una org seleccionada
  const availableProjects = useQuery(
    api.proyectos.listAccessible,
    currentOrgId ? { organizacion_id: currentOrgId } : {}
  ) ?? [];

  // currentProject:
  // - Enterprise/Conductor: fijo en su proyecto del perfil
  // - Admin/super_admin: seleccionable (default null = "Todos")
  const [currentProjectId, setCurrentProjectIdState] = useState(null);

  // Sincronizar para enterprise/conductor: fija a su proyecto_id
  useEffect(() => {
    if (!user) return;
    if (!isAdmin && user.proyecto_id) {
      setCurrentProjectIdState(user.proyecto_id);
    }
  }, [user, isAdmin]);

  // Reset proyecto al cambiar de org (super_admin)
  useEffect(() => {
    if (isAdmin) {
      setCurrentProjectIdState(null);
    }
  }, [currentOrgId, isAdmin]);

  const currentProject = useMemo(() => {
    if (!currentProjectId) return null;
    return availableProjects.find((p) => p._id === currentProjectId) ?? null;
  }, [currentProjectId, availableProjects]);

  const setCurrentProject = (projectId) => {
    if (!isAdmin) return; // Enterprise no puede cambiar
    setCurrentProjectIdState(projectId);
  };

  const value = useMemo(
    () => ({
      currentProject,
      currentProjectId,
      availableProjects,
      isAdmin,
      setCurrentProject,
    }),
    [currentProject, currentProjectId, availableProjects, isAdmin]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProject = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
};
