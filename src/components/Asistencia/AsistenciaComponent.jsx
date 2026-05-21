import { Clock, MapPin } from '../Icons';
import './AsistenciaComponent.css';

const AsistenciaComponent = () => {
  return (
    <div className="asistencia-placeholder">
      <div className="asistencia-placeholder__card">
        <div className="asistencia-placeholder__icon">
          <Clock strokeWidth={1.5} size={48} />
        </div>
        <h2 className="asistencia-placeholder__title">Módulo Asistencia</h2>
        <div className="asistencia-placeholder__badge">
          <MapPin size={14} />
          <span>En desarrollo</span>
        </div>
        <p className="asistencia-placeholder__lead">
          Control de asistencia y jornadas laborales del personal.
        </p>
        <ul className="asistencia-placeholder__features">
          <li>Marcaje digital de entrada y salida</li>
          <li>Geofence clock-in / clock-out automático</li>
          <li>Reportes de presencia por turno</li>
          <li>Cálculo de horas trabajadas y tardanzas</li>
          <li>Integración con RRHH y nómina</li>
        </ul>
        <p className="asistencia-placeholder__hint">
          Este módulo estará disponible próximamente. Si te interesa activarlo, contacta a tu administrador.
        </p>
      </div>
    </div>
  );
};

export default AsistenciaComponent;
