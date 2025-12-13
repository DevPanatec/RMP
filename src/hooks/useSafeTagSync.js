import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";

/**
 * Hook para sincronización de GPS SafeTag
 *
 * Proporciona funcionalidad para:
 * - Sincronizar manualmente todos los vehículos con SafeTag
 * - Ver estado de sincronización en tiempo real
 * - Manejar estados de loading y errores
 *
 * @returns {Object} { sync, syncing, error, status }
 */
export const useSafeTagSync = () => {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  const syncAction = useAction(api.safetag.syncAllVehicles);
  const syncStatus = useQuery(api.safetag.getSyncStatus);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);

    try {
      const results = await syncAction();

      const successful = results.filter(r => r.success).length;
      const total = results.length;

      console.log(`✅ Sincronización SafeTag: ${successful}/${total} vehículos actualizados`);

      return results;
    } catch (err) {
      console.error("❌ Error en sincronización SafeTag:", err);
      setError(err.message);
      throw err;
    } finally {
      setSyncing(false);
    }
  };

  return {
    sync: handleSync,
    syncing,
    error,
    status: syncStatus,
  };
};
