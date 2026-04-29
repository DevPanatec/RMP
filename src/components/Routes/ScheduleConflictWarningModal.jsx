import { AlertTriangle, X } from '../Icons';
import './ScheduleConflictWarningModal.css';

const ScheduleConflictWarningModal = ({ open, conflictos, vehiculoPlaca, onCancel, onContinue }) => {
  if (!open) return null;

  return (
    <div className="scwm-overlay" onClick={onCancel}>
      <div className="scwm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scwm-header">
          <div className="scwm-title">
            <AlertTriangle size={20} />
            <h2>Solapamiento de horario detectado</h2>
          </div>
          <button className="scwm-close" onClick={onCancel} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="scwm-body">
          <p className="scwm-lead">
            El vehículo <strong>{vehiculoPlaca}</strong> ya tiene {conflictos.length} ruta(s) con horario solapado en esta fecha.
            Esto es solo una advertencia: la ventana de horario no implica que la ejecución vaya a chocar.
          </p>

          <table className="scwm-table">
            <thead>
              <tr>
                <th>Ruta</th>
                <th>Proyecto</th>
                <th>Horario</th>
                <th>Solapamiento</th>
              </tr>
            </thead>
            <tbody>
              {conflictos.map((c) => (
                <tr key={c.asignacion_id}>
                  <td>{c.ruta_nombre}</td>
                  <td>{c.proyecto_nombre || '—'}</td>
                  <td>{c.hora_inicio} – {c.hora_fin}</td>
                  <td className="scwm-overlap">{c.overlap_inicio} – {c.overlap_fin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="scwm-footer">
          <button className="scwm-btn scwm-btn--secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button className="scwm-btn scwm-btn--primary" onClick={onContinue}>
            Crear de todos modos
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleConflictWarningModal;
