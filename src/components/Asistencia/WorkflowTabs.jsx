import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAsistencia } from '../../context/AsistenciaContext';
import { usePersonnel } from '../../context/PersonnelContext';
import { Plus, Check, X, Trash2 } from '../Icons';
import toast from 'react-hot-toast';

const TIPOS_PERMISO = [
  { v: 'personal', label: 'Personal' },
  { v: 'medico', label: 'Médico' },
  { v: 'vacaciones', label: 'Vacaciones' },
  { v: 'maternidad', label: 'Maternidad' },
  { v: 'duelo', label: 'Duelo' },
  { v: 'otro', label: 'Otro' },
];

const TIPOS_HE = [
  { v: 'diurna', label: 'Diurna (×1.25)' },
  { v: 'nocturna', label: 'Nocturna (×1.50)' },
  { v: 'feriado', label: 'Feriado (×1.50)' },
  { v: 'domingo', label: 'Domingo (×2.00)' },
];

const ESTADOS = [
  { v: 'pendiente', label: 'Pendientes', badge: 'warning' },
  { v: 'aprobado', label: 'Aprobados', badge: 'success' },
  { v: 'rechazado', label: 'Rechazados', badge: 'error' },
];

// ─── Permisos ──────────────────────────────────────────────────────

export const PermisosTab = () => {
  const { employees } = usePersonnel();
  const { createPermiso, aprobarPermiso, rechazarPermiso, removePermiso } = useAsistencia();
  const [filterEstado, setFilterEstado] = useState('pendiente');
  const [showForm, setShowForm] = useState(false);

  const permisos = useQuery(api.asistencia.permisos.list, { estado: filterEstado }) ?? [];

  const empName = (id) => {
    const e = employees?.find((x) => x._id === id);
    return e ? `${e.nombre} ${e.apellido}` : id;
  };

  return (
    <div>
      <div className="asi-toolbar">
        <h3 className="asi-section-title">Permisos</h3>
        <div className="asi-form-row">
          <FilterEstado value={filterEstado} onChange={setFilterEstado} />
          <button className="asi-btn asi-btn--primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> Nuevo permiso
          </button>
        </div>
      </div>

      {showForm && (
        <PermisoForm
          employees={employees ?? []}
          onCancel={() => setShowForm(false)}
          onCreate={async (data) => {
            const r = await createPermiso(data);
            if (r.success) { toast.success('Permiso creado'); setShowForm(false); }
            else toast.error(r.error || 'Error');
          }}
        />
      )}

      <table className="asi-table">
        <thead>
          <tr>
            <th>Empleado</th>
            <th>Tipo</th>
            <th>Desde</th>
            <th>Hasta</th>
            <th>Motivo</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {permisos.map((p) => (
            <tr key={p._id}>
              <td>{empName(p.empleado_id)}</td>
              <td>{TIPOS_PERMISO.find((t) => t.v === p.tipo)?.label ?? p.tipo}</td>
              <td>{p.fecha_desde}</td>
              <td>{p.fecha_hasta}</td>
              <td title={p.motivo}>{truncate(p.motivo, 40)}</td>
              <td><EstadoBadge estado={p.estado} /></td>
              <td>
                <ActionButtons
                  estado={p.estado}
                  onAprobar={async () => {
                    const r = await aprobarPermiso({ id: p._id });
                    if (r.success) toast.success('Aprobado');
                    else toast.error(r.error || 'Error');
                  }}
                  onRechazar={async () => {
                    const notas = prompt('Notas de rechazo (opcional):') || undefined;
                    const r = await rechazarPermiso({ id: p._id, notas });
                    if (r.success) toast.success('Rechazado');
                    else toast.error(r.error || 'Error');
                  }}
                  onRemove={p.estado !== 'aprobado' ? async () => {
                    if (!confirm('Eliminar permiso?')) return;
                    const r = await removePermiso({ id: p._id });
                    if (r.success) toast.success('Eliminado');
                    else toast.error(r.error || 'Error');
                  } : null}
                />
              </td>
            </tr>
          ))}
          {permisos.length === 0 && (
            <tr><td colSpan={7} className="asi-table__empty">Sin permisos {filterEstado}.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const PermisoForm = ({ employees, onCreate, onCancel }) => {
  const [empId, setEmpId] = useState('');
  const [tipo, setTipo] = useState('personal');
  const [desde, setDesde] = useState(() => new Date().toISOString().slice(0, 10));
  const [hasta, setHasta] = useState(() => new Date().toISOString().slice(0, 10));
  const [motivo, setMotivo] = useState('');

  return (
    <div className="asi-card">
      <div className="asi-form-grid">
        <label>
          Empleado
          <select className="asi-input" value={empId} onChange={(e) => setEmpId(e.target.value)}>
            <option value="">Seleccionar…</option>
            {employees.map((e) => (
              <option key={e._id} value={e._id}>{e.nombre} {e.apellido}</option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select className="asi-input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS_PERMISO.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
          </select>
        </label>
        <label>
          Desde
          <input type="date" className="asi-input" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" className="asi-input" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
        <label className="asi-form-grid__full">
          Motivo
          <textarea
            className="asi-input"
            rows={2}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Detalle del permiso"
          />
        </label>
      </div>
      <div className="asi-form-actions">
        <button className="asi-btn" onClick={onCancel}>Cancelar</button>
        <button
          className="asi-btn asi-btn--primary"
          disabled={!empId || !motivo.trim() || hasta < desde}
          onClick={() => onCreate({ empleado_id: empId, tipo, fecha_desde: desde, fecha_hasta: hasta, motivo })}
        >
          Crear permiso
        </button>
      </div>
    </div>
  );
};

// ─── Horas extras ──────────────────────────────────────────────────

export const HorasExtrasTab = () => {
  const { employees } = usePersonnel();
  const { createHoraExtra, aprobarHoraExtra, rechazarHoraExtra, removeHoraExtra } = useAsistencia();
  const [filterEstado, setFilterEstado] = useState('pendiente');
  const [showForm, setShowForm] = useState(false);

  const horas = useQuery(api.asistencia.horasExtras.list, { estado: filterEstado }) ?? [];

  const empName = (id) => {
    const e = employees?.find((x) => x._id === id);
    return e ? `${e.nombre} ${e.apellido}` : id;
  };

  const totalMinutos = useMemo(() => horas.reduce((s, h) => s + h.minutos, 0), [horas]);

  return (
    <div>
      <div className="asi-toolbar">
        <h3 className="asi-section-title">Horas extras</h3>
        <div className="asi-form-row">
          <FilterEstado value={filterEstado} onChange={setFilterEstado} />
          <button className="asi-btn asi-btn--primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> Registrar HE
          </button>
        </div>
      </div>

      {filterEstado === 'aprobado' && (
        <p className="asi-hint">Total aprobado: {(totalMinutos / 60).toFixed(2)}h ({totalMinutos} min)</p>
      )}

      {showForm && (
        <HoraExtraForm
          employees={employees ?? []}
          onCancel={() => setShowForm(false)}
          onCreate={async (data) => {
            const r = await createHoraExtra(data);
            if (r.success) { toast.success('Hora extra registrada'); setShowForm(false); }
            else toast.error(r.error || 'Error');
          }}
        />
      )}

      <table className="asi-table">
        <thead>
          <tr>
            <th>Empleado</th>
            <th>Fecha</th>
            <th>Min</th>
            <th>Tipo</th>
            <th>Motivo</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {horas.map((h) => (
            <tr key={h._id}>
              <td>{empName(h.empleado_id)}</td>
              <td>{h.fecha}</td>
              <td>{h.minutos}</td>
              <td>{TIPOS_HE.find((t) => t.v === h.tipo)?.label ?? h.tipo}</td>
              <td title={h.motivo}>{truncate(h.motivo, 30)}</td>
              <td><EstadoBadge estado={h.estado} /></td>
              <td>
                <ActionButtons
                  estado={h.estado}
                  onAprobar={async () => {
                    const r = await aprobarHoraExtra({ id: h._id });
                    if (r.success) toast.success('Aprobada');
                    else toast.error(r.error || 'Error');
                  }}
                  onRechazar={async () => {
                    const notas = prompt('Notas de rechazo (opcional):') || undefined;
                    const r = await rechazarHoraExtra({ id: h._id, notas });
                    if (r.success) toast.success('Rechazada');
                    else toast.error(r.error || 'Error');
                  }}
                  onRemove={h.estado !== 'aprobado' ? async () => {
                    if (!confirm('Eliminar hora extra?')) return;
                    const r = await removeHoraExtra({ id: h._id });
                    if (r.success) toast.success('Eliminada');
                    else toast.error(r.error || 'Error');
                  } : null}
                />
              </td>
            </tr>
          ))}
          {horas.length === 0 && (
            <tr><td colSpan={7} className="asi-table__empty">Sin horas extras {filterEstado}.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const HoraExtraForm = ({ employees, onCreate, onCancel }) => {
  const [empId, setEmpId] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [minutos, setMinutos] = useState(60);
  const [tipo, setTipo] = useState('diurna');
  const [motivo, setMotivo] = useState('');

  return (
    <div className="asi-card">
      <div className="asi-form-grid">
        <label>
          Empleado
          <select className="asi-input" value={empId} onChange={(e) => setEmpId(e.target.value)}>
            <option value="">Seleccionar…</option>
            {employees.map((e) => (
              <option key={e._id} value={e._id}>{e.nombre} {e.apellido}</option>
            ))}
          </select>
        </label>
        <label>
          Fecha
          <input type="date" className="asi-input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label>
          Minutos
          <input
            type="number"
            min={1}
            max={720}
            className="asi-input"
            value={minutos}
            onChange={(e) => setMinutos(Number(e.target.value))}
          />
        </label>
        <label>
          Tipo (multiplicador)
          <select className="asi-input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS_HE.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
          </select>
        </label>
        <label className="asi-form-grid__full">
          Motivo
          <textarea
            className="asi-input"
            rows={2}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Trabajo realizado fuera de horario"
          />
        </label>
      </div>
      <div className="asi-form-actions">
        <button className="asi-btn" onClick={onCancel}>Cancelar</button>
        <button
          className="asi-btn asi-btn--primary"
          disabled={!empId || !motivo.trim() || minutos <= 0}
          onClick={() => onCreate({ empleado_id: empId, fecha, minutos, tipo, motivo })}
        >
          Registrar
        </button>
      </div>
    </div>
  );
};

// ─── Cambios turno ─────────────────────────────────────────────────

export const CambiosTurnoTab = () => {
  const { employees } = usePersonnel();
  const { createCambioTurno, aprobarCambioTurno, rechazarCambioTurno, removeCambioTurno } = useAsistencia();
  const [filterEstado, setFilterEstado] = useState('pendiente');
  const [showForm, setShowForm] = useState(false);

  const swaps = useQuery(api.asistencia.cambiosTurno.list, { estado: filterEstado }) ?? [];

  const empName = (id) => {
    const e = employees?.find((x) => x._id === id);
    return e ? `${e.nombre} ${e.apellido}` : id;
  };

  return (
    <div>
      <div className="asi-toolbar">
        <h3 className="asi-section-title">Cambios de turno</h3>
        <div className="asi-form-row">
          <FilterEstado value={filterEstado} onChange={setFilterEstado} />
          <button className="asi-btn asi-btn--primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> Nuevo cambio
          </button>
        </div>
      </div>

      {showForm && (
        <CambioTurnoForm
          employees={employees ?? []}
          onCancel={() => setShowForm(false)}
          onCreate={async (data) => {
            const r = await createCambioTurno(data);
            if (r.success) { toast.success('Cambio creado'); setShowForm(false); }
            else toast.error(r.error || 'Error');
          }}
        />
      )}

      <table className="asi-table">
        <thead>
          <tr>
            <th>Empleado A</th>
            <th>Empleado B</th>
            <th>Fecha</th>
            <th>Motivo</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {swaps.map((s) => (
            <tr key={s._id}>
              <td>{empName(s.empleado_a_id)}</td>
              <td>{empName(s.empleado_b_id)}</td>
              <td>{s.fecha}</td>
              <td title={s.motivo}>{truncate(s.motivo, 40)}</td>
              <td><EstadoBadge estado={s.estado} /></td>
              <td>
                <ActionButtons
                  estado={s.estado}
                  onAprobar={async () => {
                    const r = await aprobarCambioTurno({ id: s._id });
                    if (r.success) toast.success('Aprobado');
                    else toast.error(r.error || 'Error');
                  }}
                  onRechazar={async () => {
                    const notas = prompt('Notas de rechazo (opcional):') || undefined;
                    const r = await rechazarCambioTurno({ id: s._id, notas });
                    if (r.success) toast.success('Rechazado');
                    else toast.error(r.error || 'Error');
                  }}
                  onRemove={s.estado !== 'aprobado' ? async () => {
                    if (!confirm('Eliminar cambio?')) return;
                    const r = await removeCambioTurno({ id: s._id });
                    if (r.success) toast.success('Eliminado');
                    else toast.error(r.error || 'Error');
                  } : null}
                />
              </td>
            </tr>
          ))}
          {swaps.length === 0 && (
            <tr><td colSpan={6} className="asi-table__empty">Sin cambios {filterEstado}.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const CambioTurnoForm = ({ employees, onCreate, onCancel }) => {
  const [empA, setEmpA] = useState('');
  const [empB, setEmpB] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [motivo, setMotivo] = useState('');

  return (
    <div className="asi-card">
      <div className="asi-form-grid">
        <label>
          Empleado A
          <select className="asi-input" value={empA} onChange={(e) => setEmpA(e.target.value)}>
            <option value="">Seleccionar…</option>
            {employees.map((e) => (
              <option key={e._id} value={e._id}>{e.nombre} {e.apellido}</option>
            ))}
          </select>
        </label>
        <label>
          Empleado B
          <select className="asi-input" value={empB} onChange={(e) => setEmpB(e.target.value)}>
            <option value="">Seleccionar…</option>
            {employees.filter((e) => e._id !== empA).map((e) => (
              <option key={e._id} value={e._id}>{e.nombre} {e.apellido}</option>
            ))}
          </select>
        </label>
        <label>
          Fecha del swap
          <input type="date" className="asi-input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label className="asi-form-grid__full">
          Motivo
          <textarea
            className="asi-input"
            rows={2}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Razón del intercambio"
          />
        </label>
      </div>
      <div className="asi-form-actions">
        <button className="asi-btn" onClick={onCancel}>Cancelar</button>
        <button
          className="asi-btn asi-btn--primary"
          disabled={!empA || !empB || empA === empB || !motivo.trim()}
          onClick={() => onCreate({ empleado_a_id: empA, empleado_b_id: empB, fecha, motivo })}
        >
          Crear cambio
        </button>
      </div>
    </div>
  );
};

// ─── Helpers compartidos ───────────────────────────────────────────

const FilterEstado = ({ value, onChange }) => (
  <select className="asi-input asi-input--inline" value={value} onChange={(e) => onChange(e.target.value)}>
    {ESTADOS.map((e) => <option key={e.v} value={e.v}>{e.label}</option>)}
  </select>
);

const EstadoBadge = ({ estado }) => {
  const e = ESTADOS.find((x) => x.v === estado);
  return <span className={`asi-badge asi-badge--${e?.badge ?? 'default'}`}>{estado}</span>;
};

const ActionButtons = ({ estado, onAprobar, onRechazar, onRemove }) => {
  if (estado === 'pendiente') {
    return (
      <div className="asi-action-group">
        <button className="asi-btn asi-btn--icon" title="Aprobar" onClick={onAprobar}>
          <Check size={14} />
        </button>
        <button className="asi-btn asi-btn--icon" title="Rechazar" onClick={onRechazar}>
          <X size={14} />
        </button>
      </div>
    );
  }
  if (onRemove) {
    return (
      <button className="asi-btn asi-btn--icon" title="Eliminar" onClick={onRemove}>
        <Trash2 size={14} />
      </button>
    );
  }
  return null;
};

const truncate = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '');
