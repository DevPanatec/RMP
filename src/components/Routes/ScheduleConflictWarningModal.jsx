import { AlertTriangle } from '../Icons';
import { Modal } from '../UI';
import './ScheduleConflictWarningModal.css';

const ScheduleConflictWarningModal = ({ open, conflictos, vehiculoPlaca, onCancel, onContinue }) => {
  if (!open) return null;

  return (
    <Modal open onClose={onCancel} size="md" variant="form">
      <Modal.Header
        icon={<AlertTriangle size={18} />}
        onClose={onCancel}
        id="scwm-title"
      >
        Solapamiento de horario detectado
      </Modal.Header>

      <Modal.Body>
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
      </Modal.Body>

      <Modal.Footer>
        <button type="button" className="scwm-btn scwm-btn--secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="scwm-btn scwm-btn--primary" onClick={onContinue} data-autofocus>
          Crear de todos modos
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default ScheduleConflictWarningModal;
