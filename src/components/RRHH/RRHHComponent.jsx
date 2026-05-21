import { Users, Clock } from '../Icons';
import './RRHHComponent.css';

const RRHHComponent = () => {
  return (
    <div className="rrhh-placeholder">
      <div className="rrhh-placeholder__card">
        <div className="rrhh-placeholder__icon">
          <Users strokeWidth={1.5} size={48} />
        </div>
        <h2 className="rrhh-placeholder__title">Módulo RRHH</h2>
        <div className="rrhh-placeholder__badge">
          <Clock size={14} />
          <span>En desarrollo</span>
        </div>
        <p className="rrhh-placeholder__lead">
          Gestión completa de Recursos Humanos para tu organización.
        </p>
        <ul className="rrhh-placeholder__features">
          <li>Contratos laborales y adendas</li>
          <li>Fechas de entrada y salida del personal</li>
          <li>Payroll Panamá (XIII mes, prima, vacaciones)</li>
          <li>Documentos legales y expedientes</li>
          <li>Asistencia integrada</li>
        </ul>
        <p className="rrhh-placeholder__hint">
          Este módulo estará disponible próximamente. Si te interesa activarlo, contacta a tu administrador.
        </p>
      </div>
    </div>
  );
};

export default RRHHComponent;
