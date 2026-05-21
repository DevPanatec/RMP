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

  // Módulos activos de la org actual.
  // - super_admin sin org seleccionada → todos los módulos (puede ver todo)
  // - cualquier otro → modulos_activos literal del backend (sin fallback).
  //   Backend garantiza ≥1 módulo via toggleModulo invariant + default REC en
  //   `add`. Una org con modulos_activos vacío/undefined es un dato corrupto
  //   que el frontend debe reflejar honestamente, no enmascarar.
  const currentOrgModulos = useMemo(() => {
    if (isSuperAdmin && !currentOrg) {
      return ['REC', 'FUM', 'LIM', 'MTO', 'INV', 'BI', 'ASI', 'RRHH'];
    }
    return currentOrg?.modulos_activos ?? [];
  }, [isSuperAdmin, currentOrg]);

  const hasModulo = useMemo(
    () => (codigo) => {
      // PER ya no es módulo comprable — se desbloquea con cualquier módulo operacional.
      // Backward-compat: orgs antiguas con "PER" en el array también pasan.
      if (codigo === 'PER') {
        return ['REC', 'FUM', 'LIM', 'MTO'].some((m) => currentOrgModulos.includes(m))
          || currentOrgModulos.includes('PER');
      }
      return currentOrgModulos.includes(codigo);
    },
    [currentOrgModulos]
  );

  const loading = availableOrgs === undefined;

  const value = useMemo(
    () => ({
      currentOrg,
      currentOrgId,
      availableOrgs,
      isSuperAdmin,
      setCurrentOrg,
      currentOrgModulos,
      hasModulo,
      loading,
    }),
    [currentOrg, currentOrgId, availableOrgs, isSuperAdmin, currentOrgModulos, hasModulo, loading]
  );

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
};

export const useOrganization = () => {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error('useOrganization must be used within OrganizationProvider');
  return ctx;
};

export default OrganizationContext;
