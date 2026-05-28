import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAsistencia } from '../../context/AsistenciaContext';
import { Clock, RefreshCw, Calendar, ChevronLeft, X } from '../Icons';
import toast from 'react-hot-toast';
import './AsignarHorarioWizard.css';

const DIAS_NOMBRES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const AsignarHorarioWizard = ({ empleado, onClose, onDone }) => {
  const { plantillas, asignarHorario } = useAsistencia();
  const [modo, setModo] = useState(null); // null | 'fijo' | 'rotativo' | 'sueltos'

  return (
    <div className="wiz-modal" onClick={onClose}>
      <div className="wiz-panel" onClick={(e) => e.stopPropagation()}>
        <header className="wiz-header">
          <div>
            {modo && (
              <button className="wiz-back" onClick={() => setModo(null)} aria-label="Atrás">
                <ChevronLeft size={18} />
              </button>
            )}
            <h2>Asignar horario</h2>
            <p>{empleado.nombre} {empleado.apellido}</p>
          </div>
          <button className="wiz-close" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </header>

        {modo === null && (
          <div className="wiz-choices">
            <p className="wiz-lead">¿Cómo trabaja este colaborador?</p>
            <button className="wiz-choice" onClick={() => setModo('fijo')}>
              <Clock size={28} strokeWidth={1.5} />
              <div>
                <strong>Turno fijo</strong>
                <span>Mismo horario todos los días (ej: lun a vie, 8 a 5)</span>
              </div>
            </button>
            <button className="wiz-choice" onClick={() => setModo('rotativo')}>
              <RefreshCw size={28} strokeWidth={1.5} />
              <div>
                <strong>Turnos rotativos</strong>
                <span>Cambia día a día siguiendo un patrón (M / T / N / libre)</span>
              </div>
            </button>
            <button className="wiz-choice" onClick={() => setModo('sueltos')}>
              <Calendar size={28} strokeWidth={1.5} />
              <div>
                <strong>Días sueltos</strong>
                <span>Asignas turno día por día desde el calendario semanal</span>
              </div>
            </button>
          </div>
        )}

        {modo === 'fijo' && (
          <ModoFijo
            empleado={empleado}
            plantillas={plantillas}
            asignarHorario={asignarHorario}
            onDone={onDone}
          />
        )}

        {modo === 'rotativo' && (
          <ModoRotativo
            empleado={empleado}
            plantillas={plantillas}
            onDone={onDone}
          />
        )}

        {modo === 'sueltos' && (
          <ModoSueltos onDone={onClose} />
        )}
      </div>
    </div>
  );
};

// ─── Modo: turno fijo ──────────────────────────────────────────────

const ModoFijo = ({ empleado, plantillas, asignarHorario, onDone }) => {
  const [plantillaId, setPlantillaId] = useState('');
  const [desde, setDesde] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  const activas = plantillas.filter((p) => p.activo);

  const handleSubmit = async () => {
    if (!plantillaId) return toast.error('Selecciona un turno');
    setSubmitting(true);
    const r = await asignarHorario({
      empleado_id: empleado._id,
      horario_plantilla_id: plantillaId,
      vigencia_desde: desde,
    });
    setSubmitting(false);
    if (r.success) {
      toast.success('Horario asignado');
      onDone?.();
    } else {
      toast.error(r.error || 'Error');
    }
  };

  return (
    <div className="wiz-body">
      <p className="wiz-lead">Elige un turno estándar:</p>
      {activas.length === 0 ? (
        <div className="wiz-empty">
          No hay turnos creados aún. Ve a la pestaña <strong>Turnos</strong> y crea uno, o pulsa
          "Crear turnos estándar" desde el checklist de inicio.
        </div>
      ) : (
        <div className="wiz-turnos">
          {activas.map((p) => (
            <label
              key={p._id}
              className={`wiz-turno ${plantillaId === p._id ? 'is-active' : ''}`}
            >
              <input
                type="radio"
                name="turno"
                value={p._id}
                checked={plantillaId === p._id}
                onChange={(e) => setPlantillaId(e.target.value)}
              />
              <div className="wiz-turno__info">
                <strong>{p.nombre}</strong>
                <span>
                  {p.hora_entrada} - {p.hora_salida}
                  {p.hora_almuerzo_inicio && ` (almuerzo ${p.hora_almuerzo_inicio}-${p.hora_almuerzo_fin})`}
                </span>
                <span className="wiz-turno__dias">
                  {p.dias_laborables.map((d) => DIAS_NOMBRES[d === 0 ? 6 : d - 1]).join(' ')}
                </span>
              </div>
            </label>
          ))}
        </div>
      )}

      <label className="wiz-field">
        <span>Aplica desde</span>
        <input
          type="date"
          className="wiz-input"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
        />
      </label>

      <div className="wiz-actions">
        <button
          className="wiz-btn wiz-btn--primary"
          onClick={handleSubmit}
          disabled={!plantillaId || submitting}
        >
          {submitting ? 'Asignando...' : 'Asignar turno fijo'}
        </button>
      </div>
    </div>
  );
};

// ─── Modo: rotativo ───────────────────────────────────────────────

const ModoRotativo = ({ empleado, plantillas, onDone }) => {
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [diasTotal, setDiasTotal] = useState(28);
  const [ciclo, setCiclo] = useState(['', '', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const generar = useMutation(api.asistencia.turnosCalendario.generarPatron);

  const activas = plantillas.filter((p) => p.activo);

  const updateCiclo = (idx, val) => {
    const next = [...ciclo];
    next[idx] = val;
    setCiclo(next);
  };
  const addStep = () => setCiclo([...ciclo, '']);
  const removeStep = (idx) => setCiclo(ciclo.filter((_, i) => i !== idx));

  const handleGenerar = async () => {
    setSubmitting(true);
    try {
      const r = await generar({
        empleado_id: empleado._id,
        fecha_inicio: fechaInicio,
        dias_total: diasTotal,
        ciclo: ciclo.map((c) => c || null),
        motivo: 'rotación',
        overwrite: true,
      });
      toast.success(`Rotación creada: ${r.created} días`);
      onDone?.();
    } catch (e) {
      toast.error(e.message || 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  if (activas.length < 2) {
    return (
      <div className="wiz-body">
        <div className="wiz-empty">
          Para configurar rotación necesitas al menos 2 turnos diferentes creados.
          Ve a la pestaña <strong>Turnos</strong> y crea las opciones (ej: Mañana, Tarde, Noche).
        </div>
      </div>
    );
  }

  return (
    <div className="wiz-body">
      <p className="wiz-lead">
        Define el ciclo. Se repite todos los días por el período que elijas.
      </p>

      <div className="wiz-row">
        <label className="wiz-field">
          <span>Empieza el</span>
          <input
            type="date"
            className="wiz-input"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </label>
        <label className="wiz-field">
          <span>Por cuántos días</span>
          <input
            type="number"
            min={1}
            max={366}
            className="wiz-input"
            value={diasTotal}
            onChange={(e) => setDiasTotal(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="wiz-ciclo">
        <p className="wiz-lead">Ciclo ({ciclo.length} días):</p>
        {ciclo.map((step, idx) => (
          <div key={idx} className="wiz-ciclo__step">
            <span className="wiz-ciclo__label">Día {idx + 1}</span>
            <select
              className="wiz-input wiz-input--grow"
              value={step}
              onChange={(e) => updateCiclo(idx, e.target.value)}
            >
              <option value="">Libre (no trabaja)</option>
              {activas.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.nombre} ({p.hora_entrada} - {p.hora_salida})
                </option>
              ))}
            </select>
            {ciclo.length > 1 && (
              <button
                className="wiz-btn wiz-btn--icon"
                onClick={() => removeStep(idx)}
                aria-label="Quitar paso"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        <button className="wiz-btn wiz-btn--ghost" onClick={addStep}>
          Agregar día al ciclo
        </button>
      </div>

      <div className="wiz-hint">
        Ejemplo: ciclo [Mañana, Tarde, Noche, Libre] cada 4 días genera 7 ciclos en 28 días.
      </div>

      <div className="wiz-actions">
        <button
          className="wiz-btn wiz-btn--primary"
          onClick={handleGenerar}
          disabled={submitting}
        >
          {submitting ? 'Generando...' : `Crear rotación de ${diasTotal} días`}
        </button>
      </div>
    </div>
  );
};

// ─── Modo: días sueltos ───────────────────────────────────────────

const ModoSueltos = ({ onDone }) => (
  <div className="wiz-body">
    <div className="wiz-empty wiz-empty--info">
      Para asignar día por día, ve a la pestaña <strong>Calendario semanal</strong>.
      Ahí ves todos los empleados en grid y haces click en cada celda para asignar el turno
      del día. Útil para refuerzos, eventos puntuales o equipos con horario impredecible.
    </div>
    <div className="wiz-actions">
      <button className="wiz-btn wiz-btn--primary" onClick={onDone}>
        Entendido
      </button>
    </div>
  </div>
);

export default AsignarHorarioWizard;
