import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from './AuthContext';

const OrganizationContext = createContext(null);

export const OrganizationProvider = ({ children }) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.tipo === 'super_admin';

  // Convex query: super_admin → todas; otros → solo la propia
  const availableOrgs = useQuery(api.organizaciones.listAccessible) ?? [];

  // currentOrgId:
  // - super_admin: seleccionable (default null = "Todas")
  // - Otros: fijo a user.organizacion_id
  const [currentOrgId, setCurrentOrgIdState] = useState(null);

  // Sincronizar para non-super_admin: fija a su organizacion_id
  useEffect(() => {
    if (!user) return;
    if (!isSuperAdmin && user.organizacion_id) {
      setCurrentOrgIdState(user.organizacion_id);
    }
  }, [user, isSuperAdmin]);

  const currentOrg = useMemo(() => {
    if (!currentOrgId) return null;
    return availableOrgs.find((o) => o._id === currentOrgId) ?? null;
  }, [currentOrgId, availableOrgs]);

  const setCurrentOrg = (orgId) => {
    if (!isSuperAdmin) return; // Otros no pueden cambiar
    setCurrentOrgIdState(orgId);
  };

  const loading = availableOrgs === undefined;

  const value = useMemo(
    () => ({
      currentOrg,
      currentOrgId,
      availableOrgs,
      isSuperAdmin,
      setCurrentOrg,
      loading,
    }),
    [currentOrg, currentOrgId, availableOrgs, isSuperAdmin, loading]
  );

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
};

export const useOrganization = () => {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error('useOrganization must be used within OrganizationProvider');
  return ctx;
};

export default OrganizationContext;
