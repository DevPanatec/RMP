import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  // - super_admin: seleccionable, persistida en localStorage. Auto-elige primera
  //   org SOLO al primer login (evita "Sin organización"). Después respeta elección
  //   explícita del super_admin, incluyendo null = vista "Todas las orgs".
  // - Otros: fijo a user.organizacion_id
  const STORAGE_KEY = 'rmp_current_org_id';
  const HAS_PICKED_KEY = 'rmp_org_user_picked'; // flag pa' saber que super_admin ya tocó el switcher

  const [currentOrgId, setCurrentOrgIdState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });
  // Auto-select corre 1 vez por sesión, solo si super_admin nunca eligió antes
  const didAutoSelectRef = useRef(false);

  // Sincronizar para non-super_admin: fija a su organizacion_id
  useEffect(() => {
    if (!user) return;
    if (!isSuperAdmin && user.organizacion_id) {
      setCurrentOrgIdState(user.organizacion_id);
    }
  }, [user, isSuperAdmin]);

  // Auto-select pa' super_admin: corre 1 sola vez por sesión. Solo si:
  //   (a) super_admin NUNCA tocó el switcher en sesiones anteriores (HAS_PICKED_KEY ausente)
  //   (b) y no hay org guardada
  // Si super_admin ya eligió "Todas" (null) explícitamente, NO re-elegimos.
  useEffect(() => {
    if (!isSuperAdmin) return;
    if (didAutoSelectRef.current) return;
    if (availableOrgs.length === 0) return;
    let hasPicked = false;
    try { hasPicked = localStorage.getItem(HAS_PICKED_KEY) === '1'; } catch { /* ignore */ }
    if (hasPicked) {
      didAutoSelectRef.current = true;
      return; // Respetar elección previa (incluso si fue null = Todas)
    }
    const stored = currentOrgId && availableOrgs.find((o) => o._id === currentOrgId);
    if (!stored) {
      const match = (o) => {
        const n = (o.nombre ?? '').toLowerCase();
        const s = (o.slug ?? '').toLowerCase();
        return n.includes('rmp') || s.includes('rmp') || n.includes('default') || s.includes('default');
      };
      const preferred = availableOrgs.find(match) ?? availableOrgs[0];
      setCurrentOrgIdState(preferred._id);
      try { localStorage.setItem(STORAGE_KEY, preferred._id); } catch { /* ignore */ }
    }
    didAutoSelectRef.current = true;
  }, [isSuperAdmin, availableOrgs, currentOrgId]);

  const currentOrg = useMemo(() => {
    if (!currentOrgId) return null;
    return availableOrgs.find((o) => o._id === currentOrgId) ?? null;
  }, [currentOrgId, availableOrgs]);

  const setCurrentOrg = (orgId) => {
    if (!isSuperAdmin) return; // Otros no pueden cambiar
    setCurrentOrgIdState(orgId);
    try {
      localStorage.setItem(HAS_PICKED_KEY, '1'); // marca: super_admin ya eligió manualmente
      if (orgId) localStorage.setItem(STORAGE_KEY, orgId);
      else localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
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
