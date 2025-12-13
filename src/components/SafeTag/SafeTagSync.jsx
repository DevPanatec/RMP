import React, { useState } from 'react';
import { useSafeTagSync } from '../../hooks/useSafeTagSync';
import { RefreshCw, CheckCircle, XCircle, Clock, Satellite, Play } from '../../components/Icons';
import RoutePlayback from './RoutePlayback';
import './SafeTagSync.css';

/**
 * Componente de Sincronización SafeTag GPS
 *
 * Muestra el estado de todos los vehículos con GPS SafeTag configurado
 * y permite sincronización manual de datos GPS
 */
export const SafeTagSync = () => {
  const { sync, syncing, error, status } = useSafeTagSync();
  const [playbackVehicle, setPlaybackVehicle] = useState(null);

  const handleSyncClick = async () => {
    try {
      await sync();
    } catch (err) {
      // Error ya manejado en el hook
      console.error("Error en sincronización:", err);
    }
  };

  const formatLastUpdate = (timestamp) => {
    if (!timestamp) return 'Nunca';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;

    return date.toLocaleDateString();
  };

  return (
    <div className="safetag-sync">
      <div className="sync-header">
        <div className="header-title">
          <Satellite size={24} />
          <h3>Sincronización SafeTag GPS</h3>
        </div>
        <button
          onClick={handleSyncClick}
          disabled={syncing}
          className={`sync-button ${syncing ? 'syncing' : ''}`}
        >
          <RefreshCw className={syncing ? 'spinning' : ''} size={18} />
          {syncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
        </button>
      </div>

      {error && (
        <div className="sync-error">
          <XCircle size={16} />
          <span>Error: {error}</span>
        </div>
      )}

      <div className="sync-info">
        <p>
          <strong>ℹ️ Info:</strong> La sincronización automática se ejecuta cada 1 minuto.
          Usa el botón "Sincronizar Ahora" para actualizar manualmente.
        </p>
      </div>

      {status && status.length > 0 && (
        <div className="sync-status">
          <h4>Estado de Vehículos ({status.length})</h4>
          <div className="vehicles-grid">
            {status.map((v) => (
              <div key={v.vehiculoId} className="vehicle-card">
                <div className="vehicle-header">
                  <span className="vehicle-placa">{v.placa}</span>
                  <span className={`status-badge ${v.enLinea ? 'online' : 'offline'}`}>
                    {v.enLinea ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    {v.enLinea ? 'Online' : 'Offline'}
                  </span>
                </div>

                <div className="vehicle-info">
                  <p><strong>Vehículo:</strong> {v.marca} {v.modelo}</p>
                  <p><strong>Device:</strong> {v.safetagDeviceName || v.safetagDeviceId}</p>

                  {v.posicion.lat && v.posicion.lng ? (
                    <>
                      <p><strong>Posición:</strong> {v.posicion.lat?.toFixed(5)}, {v.posicion.lng?.toFixed(5)}</p>
                      <p><strong>Velocidad:</strong> {v.velocidad || 0} km/h</p>
                      {v.rumbo !== undefined && <p><strong>Rumbo:</strong> {v.rumbo}°</p>}
                    </>
                  ) : (
                    <p className="no-location">Sin ubicación GPS disponible</p>
                  )}

                  <div className="device-status">
                    {v.bateria !== undefined && (
                      <span className="status-item">
                        🔋 {v.bateria}%
                      </span>
                    )}
                    {v.senal !== undefined && (
                      <span className="status-item">
                        📶 Señal {v.senal}
                      </span>
                    )}
                  </div>

                  <p className="last-update">
                    <Clock size={12} />
                    {formatLastUpdate(v.ultimaActualizacion)}
                  </p>
                </div>

                {/* Botón Ver Historial */}
                <button
                  onClick={() =>
                    setPlaybackVehicle({
                      deviceId: v.safetagDeviceId,
                      deviceName: v.safetagDeviceName,
                      placa: v.placa,
                      marca: v.marca,
                      modelo: v.modelo,
                    })
                  }
                  className="view-history-button"
                  title="Ver reproducción de ruta"
                >
                  <Play size={16} />
                  Ver Historial
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Reproducción de Ruta */}
      {playbackVehicle && (
        <RoutePlayback
          deviceId={playbackVehicle.deviceId}
          deviceName={playbackVehicle.deviceName}
          placa={playbackVehicle.placa}
          onClose={() => setPlaybackVehicle(null)}
        />
      )}

      {status && status.length === 0 && (
        <div className="no-vehicles">
          <Satellite size={48} />
          <h4>No hay vehículos con SafeTag configurado</h4>
          <p>Ve a <strong>Flota → Editar Vehículo</strong> para vincular un dispositivo SafeTag.</p>
          <div className="setup-steps">
            <h5>Pasos para configurar:</h5>
            <ol>
              <li>Obtén el <strong>Device ID</strong> (IMEI) de tu GPS SafeTag desde la app</li>
              <li>Ve a <strong>Operaciones → Flota</strong></li>
              <li>Edita el vehículo deseado</li>
              <li>Agrega el <strong>SafeTag Device ID</strong></li>
              <li>Guarda y vuelve aquí para sincronizar</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafeTagSync;
