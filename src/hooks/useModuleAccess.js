import { useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useOrganization } from '../context/OrganizationContext';

// Etiquetas user-facing por código de módulo. Centraliza nombres "bonitos"
// para banners y toasts. Se usa también en blockReason del hook.
const MODULE_LABELS = {
  REC: 'Recolección',
  FUM: 'Fumigación',
  LIM: 'Limpieza',
  MTO: 'Mantenimiento',
  INV: 'Inventario',
  PER: 'Empleados',
  BI: 'Reportes avanzados',
  'PER-full': 'RRHH completo',
};

const formatLabel = (codigo) => MODULE_LABELS[codigo] ?? codigo;

/**
 * Hook canónico de visibilidad UI según estado de módulo.
 *
 * Regla: "Histórico se ve, presente y futuro se gatean."
 *
 * Recibe un código de módulo o array (AND-semantics — todos requeridos).
 *
 * Retorna:
 *  - canCreate:         hasModulo strict — gate CREAR/EDITAR.
 *  - canViewHistorical: siempre true (la data histórica nunca se oculta).
 *  - canViewLive:       hasModulo strict — gate EN VIVO (KPIs, listas de futuro).
 *  - isHistoricalOnly:  !canCreate — el caller debe mostrar badge "Histórico" si aplica.
 *  - blockReason:       string user-facing cuando canCreate=false.
 *  - guard:             wrap a un handler — si !canCreate, toast + abort.
 */
export function useModuleAccess(codigo) {
  const { hasModulo } = useOrganization();

  const codigos = useMemo(
    () => (Array.isArray(codigo) ? codigo : [codigo]).filter(Boolean),
    [codigo]
  );

  const canCreate = useMemo(
    () => codigos.length > 0 && codigos.every((c) => hasModulo(c)),
    [codigos, hasModulo]
  );

  const blockReason = useMemo(() => {
    if (canCreate) return null;
    const missing = codigos.filter((c) => !hasModulo(c));
    if (missing.length === 0) return null;
    const labels = missing.map(formatLabel).join(', ');
    return `Módulo ${labels} no contratado`;
  }, [canCreate, codigos, hasModulo]);

  const guard = useCallback(
    (fn) => (...args) => {
      if (!canCreate) {
        toast.error(blockReason || 'Módulo no contratado');
        return undefined;
      }
      return fn?.(...args);
    },
    [canCreate, blockReason]
  );

  return {
    canCreate,
    canViewHistorical: true,
    canViewLive: canCreate,
    isHistoricalOnly: !canCreate,
    blockReason,
    guard,
  };
}

/**
 * OR-semantics — true si al menos uno de los módulos está activo.
 * Útil para secciones que requieren cualquier módulo operacional.
 */
export function useAnyModule(codigos) {
  const { hasModulo } = useOrganization();
  return useMemo(
    () => (codigos || []).some((c) => hasModulo(c)),
    [codigos, hasModulo]
  );
}

/**
 * Devuelve una función `safeNav(targetTab)` que, dado un map `isTabAvailable`,
 * retorna un callback para usar en onClick. Si target no está disponible,
 * retorna `undefined` — el caller decide no renderizar el botón disparador.
 *
 * Uso:
 *   const safeNav = useSafeTabNav(isTabAvailable, setActiveTab);
 *   const onViewAll = safeNav('reportes'); // undefined si BI off
 *   {onViewAll && <button onClick={onViewAll}>Ver todo</button>}
 */
export function useSafeTabNav(isTabAvailable, setActiveTab) {
  return useCallback(
    (targetTab) => {
      if (!isTabAvailable || !setActiveTab) return undefined;
      if (!isTabAvailable(targetTab)) return undefined;
      return () => setActiveTab(targetTab);
    },
    [isTabAvailable, setActiveTab]
  );
}

export default useModuleAccess;
