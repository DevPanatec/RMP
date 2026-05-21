import './GPSStatusIndicator.css';
import { Satellite } from '../Icons';

/**
 * GPSStatusIndicator - Componente para mostrar el estado de conexión GPS de un vehículo
 *
 * Props:
 * - gps_conectado: boolean - Si el GPS está conectado
 * - gps_ultima_actualizacion: string - Timestamp de la última actualización
 * - gps_imei: string - IMEI del GPS (opcional, para mostrar tooltip)
 * - size: 'small' | 'medium' | 'large' - Tamaño del indicador (default: 'medium')
 * - showLabel: boolean - Mostrar etiqueta de texto (default: false)
 * - showTimestamp: boolean - Mostrar timestamp de última actualización (default: false)
 * - hideWhenUnconfigured: boolean - Si true, no renderiza cuando falta IMEI (default: false para mostrar estado en conductor)
 */
const GPSStatusIndicator = ({
  gps_conectado,
  gps_ultima_actualizacion,
  gps_imei,
  size = 'medium',
  showLabel = false,
  showTimestamp = false,
  hideWhenUnconfigured = false
}) => {
  // Solo esconder si el caller lo pide explícitamente
  if (!gps_imei && hideWhenUnconfigured) {
    return null;
  }

  // GPS sin configurar — mostrar estado claro al conductor
  if (!gps_imei) {
    return (
      <div
        className={`gps-status-indicator gps-status-indicator--${size} gps-status--unconfigured`}
        title="Este vehículo no tiene GPS configurado"
      >
        <div className="gps-status-icon">
          <Satellite size={size === 'small' ? 12 : size === 'medium' ? 14 : 16} strokeWidth={2} />
          <span className="gps-status-badge">✗</span>
        </div>
        {showLabel && <span className="gps-status-label">GPS No Configurado</span>}
      </div>
    );
  }

  // Calcular tiempo transcurrido desde última actualización
  const getTimeSinceUpdate = () => {
    if (!gps_ultima_actualizacion) {
      return 'Nunca';
    }

    const now = new Date();
    const lastUpdate = new Date(gps_ultima_actualizacion);
    const diffMs = now - lastUpdate;
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) {
      return 'Justo ahora';
    } else if (diffMinutes < 60) {
      return `Hace ${diffMinutes} min`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      return `Hace ${diffHours}h ${diffMinutes % 60}min`;
    }
  };

  const statusClass = gps_conectado ? 'gps-status--connected' : 'gps-status--disconnected';
  const statusText = gps_conectado ? 'GPS Conectado' : 'GPS Desconectado';
  const statusIcon = gps_conectado ? '✓' : '✗';

  return (
    <div className={`gps-status-indicator gps-status-indicator--${size} ${statusClass}`} title={`IMEI: ${gps_imei}`}>
      <div className="gps-status-icon">
        <Satellite size={size === 'small' ? 12 : size === 'medium' ? 14 : 16} strokeWidth={2} />
        <span className="gps-status-badge">{statusIcon}</span>
      </div>

      {showLabel && (
        <span className="gps-status-label">{statusText}</span>
      )}

      {showTimestamp && gps_ultima_actualizacion && (
        <span className="gps-status-timestamp">
          {getTimeSinceUpdate()}
        </span>
      )}
    </div>
  );
};

export default GPSStatusIndicator;
