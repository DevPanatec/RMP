import { useOrganization } from '../context/OrganizationContext';
import { useAuth } from '../context/AuthContext';

/**
 * Hook para guardar acciones de creación detrás de una org seleccionada.
 *
 * Super_admin: si no eligió org en el switcher, las creaciones se bloquean.
 * Otros roles: tienen org fija desde el perfil — siempre habilitado.
 *
 * Uso:
 *   const { canCreate, blockReason } = useRequireOrg();
 *   <button disabled={!canCreate} title={blockReason}>Nuevo</button>
 */
export const useRequireOrg = () => {
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();

  const isSuperAdmin = user?.tipo === 'super_admin';

  // Non-super_admin: org fija desde perfil. Asumir habilitado.
  if (!isSuperAdmin) {
    return { canCreate: true, blockReason: null };
  }

  // Super_admin sin org seleccionada: bloquear con razón clara.
  if (!currentOrgId) {
    return {
      canCreate: false,
      blockReason: 'Selecciona una organización en la barra superior para crear recursos.',
    };
  }

  return { canCreate: true, blockReason: null };
};

export default useRequireOrg;
