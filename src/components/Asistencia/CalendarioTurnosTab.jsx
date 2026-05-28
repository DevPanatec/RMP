import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAsistencia } from '../../context/AsistenciaContext';
import { ChevronLeft, ChevronRight, RefreshCw, X } from '../Icons';
import toast from 'react-hot-toast';

const DIAS_NOMBRES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function getLunes(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  const dow = d.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function shiftWeek(iso, weeks) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

function fmtFecha(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

const CalendarioTurnosTab = () => {
  const { plantillas } = useAsistencia();
  const [lunes, setLunes] = useState(() => getLunes(new Date().toISOString().slice(0, 10)));
  const [showPattern, setShowPattern] = useState(false);
  const [popover, setPopover] = useState(null); // { empId, fecha, overrideId, x, y }

  const data = useQuery(api.asistencia.turnosCalendario.getSemana, { fecha_lunes: lunes });
  const setTurno = useMutation(api.asistencia.turnosCalendario.setTurno);
  const clearTurno = useMutation(api.asistencia.turnosCalendario.clearTurno);

  const plantillaLabel = (id) => {
    if (!id) return 'Libre';
    const p = plantillas.find((x) => x._id === id);
    return p ? p.nombre.split(' ')[0] : '—';
  };

  const handleCellClick = (e, empId, fecha, overrideId) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover({
      empId,
      fecha,
      overrideId,
      x: rect.left,
      y: rect.bottom + window.scrollY,
    });
  };

  const handlePick = async (plantillaId, off) => {
    if (!popover) return;
    try {
      await setTurno({
        empleado_id: popover.empId,
        fecha: popover.fecha,
        horario_plantilla_id: plantillaId ?? undefined,
        motivo: off ? 'libre' : 'asignación manual',
      });
      toast.success('Turno actualizado');
    } catch (err) {
      toast.error(err.message || 'Error');
    }
    setPopover(null);
  };

  const handleClear = async () => {
    if (!popover?.overrideId) return;
    try {
      await clearTurno({ id: popover.overrideId });
      toast.success('Override quitado, vuelve al horario default');
    } catch (err) {
      toast.error(err.message || 'Error');
    }
    setPopover(null);
  };

  return (
    <div>
      <div className="asi-toolbar">
        <h3 className="asi-section-title">Calendario semanal</h3>
        <div className="asi-form-row">
          <button className="asi-btn" onClick={() => setLunes(shiftWeek(lunes, -1))}>
            <ChevronLeft size={14} /> Anterior
          </button>
          <span className="asi-form-row__inline">
            Semana del {fmtFecha(lunes)} al {fmtFecha(shiftWeek(lunes, 1))}
          </span>
          <button className="asi-btn" onClick={() => setLunes(shiftWeek(lunes, 1))}>
            Siguiente <ChevronRight size={14} />
          </button>
          <button className="asi-btn asi-btn--primary" onClick={() => setShowPattern(!showPattern)}>
            <RefreshCw size={14} /> Configurar rotación
          </button>
        </div>
      </div>

      <p className="asi-hint">
        Click en una celda para cambiar el turno SOLO de ese día. El "horario default" del
        colaborador se mantiene salvo que crees un override aquí.
      </p>

      {showPattern && (
        <PatronRotativoForm
          plantillas={plantillas}
          empleados={data?.filas?.map((f) => f.empleado) ?? []}
          onClose={() => setShowPattern(false)}
        />
      )}

      {!data && <p className="asi-hint">Cargando...</p>}

      {data && (
        <div className="asi-calendario">
          <table className="asi-table asi-table--calendario">
            <thead>
              <tr>
                <th>Empleado</th>
                {data.fechas.map((f, i) => (
                  <th key={f}>
                    {DIAS_NOMBRES[i]}
                    <br />
                    <span style={{ fontWeight: 400, fontSize: '10px' }}>{fmtFecha(f)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.filas.map((fila) => (
                <tr key={fila.empleado._id}>
                  <td>
                    <strong>{fila.empleado.nombre} {fila.empleado.apellido}</strong>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                      Default: {plantillaLabel(fila.default_plantilla_id)}
                    </div>
                  </td>
                  {data.fechas.map((f) => {
                    const override = fila.overrides[f];
                    const isOverride = override !== null;
                    const plantillaId = isOverride
                      ? override.horario_plantilla_id
                      : fila.default_plantilla_id;
                    const label = plantillaLabel(plantillaId);
                    const isOff = isOverride && !override.horario_plantilla_id;
                    return (
                      <td
                        key={f}
                        className={`asi-cell ${isOverride ? 'is-override' : ''} ${isOff ? 'is-off' : ''}`}
                        onClick={(e) =>
                          handleCellClick(e, fila.empleado._id, f, override?._id)
                        }
                        title={isOverride ? `Override - ${override.motivo ?? ''}` : 'Default'}
                      >
                        {isOff ? 'Libre' : label}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {data.filas.length === 0 && (
                <tr>
                  <td colSpan={8} className="asi-table__empty">
                    Sin empleados activos pa' marcar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {popover && (
        <CellPopover
          plantillas={plantillas.filter((p) => p.activo)}
          hasOverride={!!popover.overrideId}
          x={popover.x}
          y={popover.y}
          onPick={handlePick}
          onClear={handleClear}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  );
};

const CellPopover = ({ plantillas, hasOverride, x, y, onPick, onClear, onClose }) => {
  const ref = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    setTimeout(() => document.addEventListener('click', onDocClick), 0);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="cal-popover"
      style={{ left: x, top: y }}
    >
      <div className="cal-popover__header">Asignar turno</div>
      <ul className="cal-popover__list">
        {plantillas.map((p) => (
          <li key={p._id}>
            <button onClick={() => onPick(p._id, false)}>
              <strong>{p.nombre}</strong>
              <span>{p.hora_entrada} - {p.hora_salida}</span>
            </button>
          </li>
        ))}
        <li>
          <button onClick={() => onPick(null, true)} className="cal-popover__off">
            <strong>Libre</strong>
            <span>No trabaja este día</span>
          </button>
        </li>
        {hasOverride && (
          <li>
            <button onClick={onClear} className="cal-popover__clear">
              <strong>Quitar override</strong>
              <span>Vuelve al horario default</span>
            </button>
          </li>
        )}
      </ul>
    </div>
  );
};

const PatronRotativoForm = ({ plantillas, empleados, onClose }) => {
  const [empId, setEmpId] = useState('');
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [diasTotal, setDiasTotal] = useState(28);
  const [ciclo, setCiclo] = useState(['', '', '', '']);
  const [overwrite, setOverwrite] = useState(false);
  const [motivo, setMotivo] = useState('rotación');
  const generar = useMutation(api.asistencia.turnosCalendario.generarPatron);

  const updateCiclo = (idx, val) => {
    const next = [...ciclo];
    next[idx] = val;
    setCiclo(next);
  };

  const addStep = () => setCiclo([...ciclo, '']);
  const removeStep = (idx) => setCiclo(ciclo.filter((_, i) => i !== idx));

  const handleGenerar = async () => {
    if (!empId || ciclo.length === 0) {
      toast.error('Empleado y ciclo requeridos');
      return;
    }
    try {
      const cicloIds = ciclo.map((c) => c || null);
      const r = await generar({
        empleado_id: empId,
        fecha_inicio: fechaInicio,
        dias_total: diasTotal,
        ciclo: cicloIds,
        motivo,
        overwrite,
      });
      toast.success(`Generado: ${r.created} días${r.skipped > 0 ? ` (${r.skipped} saltados)` : ''}`);
      onClose();
    } catch (e) {
      toast.error(e.message || 'Error');
    }
  };

  return (
    <div className="asi-card">
      <h4>Configurar rotación</h4>
      <p className="asi-hint">
        Define el ciclo. Ej: [Mañana, Tarde, Noche, Libre] cada 4 días.
        Se aplica al colaborador desde la fecha que elijas, por el período que indiques.
      </p>
      <div className="asi-form-grid">
        <label>
          Colaborador
          <select className="asi-input" value={empId} onChange={(e) => setEmpId(e.target.value)}>
            <option value="">Selecciona...</option>
            {empleados.map((e) => (
              <option key={e._id} value={e._id}>{e.nombre} {e.apellido}</option>
            ))}
          </select>
        </label>
        <label>
          Fecha inicio
          <input
            type="date"
            className="asi-input"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </label>
        <label>
          Total de días a generar
          <input
            type="number"
            min={1}
            max={366}
            className="asi-input"
            value={diasTotal}
            onChange={(e) => setDiasTotal(Number(e.target.value))}
          />
        </label>
        <label>
          Motivo
          <input
            className="asi-input"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </label>
        <label className="asi-form-grid__full">
          <input
            type="checkbox"
            checked={overwrite}
            onChange={(e) => setOverwrite(e.target.checked)}
          />{' '}
          Sobrescribir asignaciones existentes en los días afectados
        </label>
      </div>

      <div style={{ marginTop: 'var(--space-12)' }}>
        <strong>Ciclo ({ciclo.length} días):</strong>
        {ciclo.map((step, idx) => (
          <div key={idx} className="asi-form-row" style={{ marginTop: 'var(--space-4)' }}>
            <span style={{ minWidth: 60 }}>Día {idx + 1}:</span>
            <select
              className="asi-input"
              style={{ flex: 1 }}
              value={step}
              onChange={(e) => updateCiclo(idx, e.target.value)}
            >
              <option value="">Libre</option>
              {plantillas.filter((p) => p.activo).map((p) => (
                <option key={p._id} value={p._id}>
                  {p.nombre} ({p.hora_entrada} - {p.hora_salida})
                </option>
              ))}
            </select>
            {ciclo.length > 1 && (
              <button className="asi-btn asi-btn--icon" onClick={() => removeStep(idx)}>
                <X size={12} />
              </button>
            )}
          </div>
        ))}
        <button className="asi-btn" style={{ marginTop: 'var(--space-8)' }} onClick={addStep}>
          Agregar día al ciclo
        </button>
      </div>

      <div className="asi-form-actions">
        <button className="asi-btn" onClick={onClose}>Cancelar</button>
        <button className="asi-btn asi-btn--primary" onClick={handleGenerar} disabled={!empId}>
          Generar {diasTotal} días
        </button>
      </div>
    </div>
  );
};

export default CalendarioTurnosTab;
