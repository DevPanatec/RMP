import { useState, useEffect, useCallback, useRef } from 'react';

const DB_NAME = 'rmp-offline';
const DB_VERSION = 1;
const STORE_NAME = 'photo_queue';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

function idbGetAll(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

function idbPut(db, item) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put(item);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

function idbDelete(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(id);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}

/**
 * Hook para cola offline de fotos de paradas.
 *
 * @param {Object} opts
 * @param {Function} opts.generateUploadUrl  - Convex mutation para obtener URL de upload
 * @param {Function} opts.attachPhotoToParada - Convex mutation para adjuntar la foto al evento parada_completada existente (sin duplicar)
 * @param {Function} [opts.addRouteEvent]    - Fallback: registrar evento nuevo (legacy)
 */
export function useOfflinePhotoQueue({ generateUploadUrl, attachPhotoToParada, addRouteEvent }) {
  const [queueItems, setQueueItems] = useState([]);
  const isDrainingRef = useRef(false);
  const dbRef = useRef(null);
  // Stable refs so drain closure never captures stale functions
  const generateUploadUrlRef = useRef(generateUploadUrl);
  const attachPhotoToParadaRef = useRef(attachPhotoToParada);
  const addRouteEventRef = useRef(addRouteEvent);
  useEffect(() => { generateUploadUrlRef.current = generateUploadUrl; }, [generateUploadUrl]);
  useEffect(() => { attachPhotoToParadaRef.current = attachPhotoToParada; }, [attachPhotoToParada]);
  useEffect(() => { addRouteEventRef.current = addRouteEvent; }, [addRouteEvent]);

  const refreshQueue = useCallback(async () => {
    if (!dbRef.current) return;
    const items = await idbGetAll(dbRef.current);
    setQueueItems(items);
  }, []);

  // Initialize IDB and load persisted queue on mount
  useEffect(() => {
    openDB()
      .then((db) => {
        dbRef.current = db;
        return idbGetAll(db);
      })
      .then((items) => setQueueItems(items))
      .catch((err) => console.error('[OfflineQueue] IDB init error:', err));
  }, []);

  const drainQueue = useCallback(async () => {
    if (isDrainingRef.current) return;
    const db = dbRef.current;
    if (!db) return;

    isDrainingRef.current = true;
    try {
      const items = await idbGetAll(db);
      const actionable = items.filter(
        (i) => i.status === 'pending' || i.status === 'syncing'
      );

      for (const item of actionable) {
        if (item.retries >= item.maxRetries) {
          await idbPut(db, {
            ...item,
            status: 'error',
            errorMsg: 'Máximo de reintentos alcanzado',
          });
          await refreshQueue();
          continue;
        }

        await idbPut(db, { ...item, status: 'syncing' });
        await refreshQueue();

        try {
          const uploadUrl = await generateUploadUrlRef.current();
          const res = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': item.mimeType },
            body: item.fileBlob,
          });
          if (!res.ok) throw new Error(`Upload HTTP ${res.status}`);
          const { storageId } = await res.json();

          // Adjuntar foto al evento parada_completada existente para que el admin
          // la vea en tiempo real SIN duplicar el evento.
          if (attachPhotoToParadaRef.current && item.asignacionId && item.paradaIndex != null) {
            try {
              await attachPhotoToParadaRef.current({
                asignacion_id: item.asignacionId,
                parada_index: item.paradaIndex,
                foto_storage_id: storageId,
              });
            } catch (evErr) {
              console.warn('[OfflineQueue] No se pudo adjuntar foto al evento:', evErr);
            }
          }

          await idbPut(db, { ...item, status: 'uploaded', uploadedStorageId: storageId });
          await refreshQueue();

          // Auto-remove after 3s so banner disappears
          setTimeout(async () => {
            await idbDelete(db, item.id);
            await refreshQueue();
          }, 3000);
        } catch (err) {
          const newRetries = item.retries + 1;
          const failed = newRetries >= item.maxRetries;
          await idbPut(db, {
            ...item,
            status: failed ? 'error' : 'pending',
            retries: newRetries,
            errorMsg: failed ? err.message : null,
          });
          await refreshQueue();
          // Exponential backoff between items
          if (!failed) {
            await new Promise((r) => setTimeout(r, Math.pow(2, newRetries) * 1000));
          }
        }
      }
    } finally {
      isDrainingRef.current = false;
    }
  }, [refreshQueue]);

  // Drain when network comes back online
  useEffect(() => {
    window.addEventListener('online', drainQueue);
    return () => window.removeEventListener('online', drainQueue);
  }, [drainQueue]);

  // Listen for Background Sync postMessage from service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (e) => {
      if (e.data?.type === 'DRAIN_PHOTO_QUEUE') drainQueue();
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [drainQueue]);

  /**
   * Add a photo to the offline queue.
   * @param {Object} item - Must include: fileBlob, mimeType, fileName, paradaIndex,
   *   paradaNombre, routeProgressId, asignacionId, rutaId, rutaNombre,
   *   conductorId, conductorNombre, vehiculoId, vehiculoPlaca
   * @returns {Promise<string>} id of the queued item
   */
  const addToQueue = useCallback(
    async (item) => {
      const db = dbRef.current;
      if (!db) throw new Error('IDB no disponible');

      const id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const queueItem = {
        ...item,
        id,
        retries: 0,
        maxRetries: 3,
        status: 'pending',
        errorMsg: null,
        uploadedStorageId: null,
        timestamp: Date.now(),
      };

      await idbPut(db, queueItem);
      await refreshQueue();

      // Register Background Sync if available
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready
          .then((reg) => reg.sync.register('sync-stop-photos'))
          .catch(() => {/* not available, online event fallback handles it */});
      }

      return id;
    },
    [refreshQueue]
  );

  const clearError = useCallback(
    async (id) => {
      const db = dbRef.current;
      if (!db) return;
      const items = await idbGetAll(db);
      const item = items.find((i) => i.id === id);
      if (item) {
        await idbPut(db, { ...item, status: 'pending', retries: 0, errorMsg: null });
        await refreshQueue();
      }
    },
    [refreshQueue]
  );

  const pendingCount = queueItems.filter(
    (i) => i.status === 'pending' || i.status === 'syncing'
  ).length;
  const syncingCount = queueItems.filter((i) => i.status === 'syncing').length;

  return { addToQueue, drainQueue, queueItems, pendingCount, syncingCount, clearError };
}
