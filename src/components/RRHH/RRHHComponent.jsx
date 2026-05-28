import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useRRHH } from '../../context/RRHHContext';
import { useOrganization } from '../../context/OrganizationContext';
import { usePersonnel } from '../../context/PersonnelContext';
import { Users, FileText, Edit, DollarSign, Lock, Plus, Trash2, X } from '../Icons';
import toast from 'react-hot-toast';
import './RRHHComponent.css';

const SUB_TABS = [
  { id: 'empleados', label: 'Empleados', icon: Users },
  { id: 'contratos', label: 'Contratos', icon: FileText },
  { id: 'adendas', label: 'Adendas', icon: Edit },
  { id: 'historico', label: 'Histórico salarial', icon: DollarSign },
];

const RRHHComponent = () => {
  const { hasModulo } = useOrganization();
  const [active, setActive] = useState('empleados');

  if (!hasModulo('RRHH')) {
    return (
      <div className="rrhh-empty">
        <Lock size={48} strokeWidth={1.5} />
        <h2>Módulo RRHH no contratado</h2>
        <p>Contacta al administrador para activar este módulo.</p>
      </div>
    );
  }

  return (
    <div className="rrhh-root">
      <div className="rrhh-subnav">
        {SUB_TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={`rrhh-subnav__btn ${active === t.id ? 'is-active' : ''}`}
              onClick={() => setActive(t.id)}
            >
              <Icon size={16} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
      <div className="rrhh-content">
        {active === 'empleados' && <EmpleadosTab />}
        {active === 'contratos' && <ContratosTab />}
        {active === 'adendas' && <AdendasTab />}
        {active === 'historico' && <HistoricoTab />}
      </div>
    </div>
  );
};

// ─── Empleados (vista 360) ──────────────────────────────────────────

const EmpleadosTab = () => {
  const { employees } = usePersonnel();
  const [selected, setSelected] = useState(null);

  if (!employees || employees.length === 0) {
    return <div className="rrhh-empty rrhh-empty--inline"><p>Sin empleados registrados.</p></div>;
  }

  return (
    <div className="rrhh-master-detail">
      <div className="rrhh-list-pane">
        <h3 className="rrhh-section-title">Empleados ({employees.length})</h3>
        <ul className="rrhh-list">
          {employees.map((e) => (
            <li
              key={e._id}
              className={`rrhh-list__item ${selected?._id === e._id ? 'is-selected' : ''}`}
              onClick={() => setSelected(e)}
            >
              <div className="rrhh-list__primary">{e.nombre} {e.apellido}</div>
              <div className="rrhh-list__secondary">{e.cargo ?? '—'} · ${e.salario?.toFixed(2) ?? '0.00'}</div>
            </li>
          ))}
        </ul>
      </div>
      <div className="rrhh-detail-pane">
        {selected ? <EmpleadoDetail empleado={selected} /> : (
          <div className="rrhh-empty rrhh-empty--inline"><p>Selecciona un empleado para ver contratos + salario histórico.</p></div>
        )}
      </div>
    </div>
  );
};

const EmpleadoDetail = ({ empleado }) => {
  const contratos = useQuery(api.rrhh.contratos.list, { empleado_id: empleado._id }) ?? [];
  const adendas = useQuery(api.rrhh.adendas.list, { empleado_id: empleado._id }) ?? [];
  const historico = useQuery(api.rrhh.salarioHistorico.listByEmpleado, { empleado_id: empleado._id }) ?? [];

  const vigente = contratos.find((c) => c.estado === 'vigente');

  return (
    <div className="rrhh-detail">
      <h3 className="rrhh-section-title">{empleado.nombre} {empleado.apellido}</h3>
      <div className="rrhh-detail__meta">
        <span>Cédula: {empleado.cedula ?? '—'}</span>
        <span>Cargo actual: {empleado.cargo ?? '—'}</span>
        <span>Salario actual: ${empleado.salario?.toFixed(2) ?? '0.00'}</span>
      </div>

      <section className="rrhh-section">
        <h4>Contrato vigente</h4>
        {vigente ? (
          <div className="rrhh-card">
            <div className="rrhh-card__row">
              <strong>{vigente.numero}</strong>
              <span className="rrhh-badge rrhh-badge--success">{vigente.estado}</span>
            </div>
            <div className="rrhh-card__row">
              <span>{vigente.tipo}</span>
              <span>Desde {vigente.fecha_inicio} {vigente.fecha_fin ? `hasta ${vigente.fecha_fin}` : '(indefinido)'}</span>
            </div>
            <div className="rrhh-card__row">
              <span>{vigente.cargo}</span>
              <span>${vigente.salario_base.toFixed(2)}/mes</span>
            </div>
          </div>
        ) : (
          <p className="rrhh-empty__inline">Sin contrato vigente. Crea uno en el tab Contratos.</p>
        )}
      </section>

      <section className="rrhh-section">
        <h4>Adendas ({adendas.length})</h4>
        {adendas.length === 0 ? (
          <p className="rrhh-empty__inline">Sin adendas.</p>
        ) : (
          <ul className="rrhh-mini-list">
            {adendas.map((a) => (
              <li key={a._id}>
                <strong>{a.numero}</strong> · {a.fecha_efectiva} · {a.motivo}
                <div className="rrhh-mini-list__detail">{JSON.stringify(a.cambios)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rrhh-section">
        <h4>Histórico salarial ({historico.length})</h4>
        {historico.length === 0 ? (
          <p className="rrhh-empty__inline">Sin histórico.</p>
        ) : (
          <table className="rrhh-table">
            <thead><tr><th>Desde</th><th>Hasta</th><th>Monto</th><th>Origen</th></tr></thead>
            <tbody>
              {historico.map((h) => (
                <tr key={h._id}>
                  <td>{h.vigencia_desde}</td>
                  <td>{h.vigencia_hasta ?? <em>vigente</em>}</td>
                  <td>${h.salario_base.toFixed(2)}</td>
                  <td>{h.adenda_id ? 'adenda' : 'contrato'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

// ─── Contratos ─────────────────────────────────────────────────────

const ContratosTab = () => {
  const { contratos, createContrato, rescindirContrato } = useRRHH();
  const { employees } = usePersonnel();
  const [showForm, setShowForm] = useState(false);
  const [filterEstado, setFilterEstado] = useState('vigente');

  const empName = (id) => {
    const e = employees?.find((x) => x._id === id);
    return e ? `${e.nombre} ${e.apellido}` : id;
  };

  const filtered = contratos.filter((c) => filterEstado === 'todos' || c.estado === filterEstado);

  return (
    <div>
      <div className="rrhh-toolbar">
        <h3 className="rrhh-section-title">Contratos</h3>
        <div className="rrhh-form-row">
          <select className="rrhh-input rrhh-input--inline" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
            <option value="vigente">Vigentes</option>
            <option value="vencido">Vencidos</option>
            <option value="rescindido">Rescindidos</option>
            <option value="todos">Todos</option>
          </select>
          <button className="rrhh-btn rrhh-btn--primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> Nuevo contrato
          </button>
        </div>
      </div>

      {showForm && (
        <ContratoForm
          employees={employees ?? []}
          onCancel={() => setShowForm(false)}
          onCreate={async (data) => {
            const r = await createContrato(data);
            if (r.success) { toast.success('Contrato creado'); setShowForm(false); }
            else toast.error(r.error || 'Error');
          }}
        />
      )}

      <table className="rrhh-table">
        <thead><tr>
          <th>Número</th><th>Empleado</th><th>Tipo</th><th>Cargo</th>
          <th>Salario</th><th>Desde</th><th>Hasta</th><th>Estado</th><th></th>
        </tr></thead>
        <tbody>
          {filtered.map((c) => (
            <tr key={c._id}>
              <td>{c.numero}</td>
              <td>{empName(c.empleado_id)}</td>
              <td>{c.tipo}</td>
              <td>{c.cargo}</td>
              <td>${c.salario_base.toFixed(2)}</td>
              <td>{c.fecha_inicio}</td>
              <td>{c.fecha_fin ?? '—'}</td>
              <td><span className={`rrhh-badge rrhh-badge--${c.estado}`}>{c.estado}</span></td>
              <td>
                {c.estado === 'vigente' && (
                  <button
                    className="rrhh-btn rrhh-btn--icon"
                    title="Rescindir"
                    onClick={async () => {
                      const motivo = prompt('Motivo de rescisión:');
                      if (!motivo) return;
                      const fecha = prompt('Fecha de rescisión (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
                      if (!fecha) return;
                      const r = await rescindirContrato({ id: c._id, motivo, fecha_rescision: fecha });
                      if (r.success) toast.success('Contrato rescindido');
                      else toast.error(r.error || 'Error');
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={9} className="rrhh-table__empty">Sin contratos {filterEstado}.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const ContratoForm = ({ employees, onCreate, onCancel }) => {
  const [empId, setEmpId] = useState('');
  const [numero, setNumero] = useState('');
  const [tipo, setTipo] = useState('indefinido');
  const [desde, setDesde] = useState(() => new Date().toISOString().slice(0, 10));
  const [hasta, setHasta] = useState('');
  const [salario, setSalario] = useState(0);
  const [cargo, setCargo] = useState('');

  return (
    <div className="rrhh-card">
      <div className="rrhh-form-grid">
        <label>
          Empleado
          <select className="rrhh-input" value={empId} onChange={(e) => setEmpId(e.target.value)}>
            <option value="">Seleccionar…</option>
            {employees.map((e) => <option key={e._id} value={e._id}>{e.nombre} {e.apellido}</option>)}
          </select>
        </label>
        <label>
          Número
          <input className="rrhh-input" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="CONT-2026-001" />
        </label>
        <label>
          Tipo
          <select className="rrhh-input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="indefinido">Indefinido</option>
            <option value="definido">Definido</option>
            <option value="obra">Por obra</option>
          </select>
        </label>
        <label>
          Cargo
          <input className="rrhh-input" value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Conductor" />
        </label>
        <label>
          Salario base ($)
          <input type="number" min={1} className="rrhh-input" value={salario} onChange={(e) => setSalario(Number(e.target.value))} />
        </label>
        <label>
          Desde
          <input type="date" className="rrhh-input" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        {tipo !== 'indefinido' && (
          <label>
            Hasta
            <input type="date" className="rrhh-input" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </label>
        )}
      </div>
      <div className="rrhh-form-actions">
        <button className="rrhh-btn" onClick={onCancel}>Cancelar</button>
        <button
          className="rrhh-btn rrhh-btn--primary"
          disabled={!empId || !numero.trim() || !cargo.trim() || salario <= 0 || (tipo !== 'indefinido' && !hasta)}
          onClick={() => onCreate({
            empleado_id: empId, numero: numero.trim(), tipo,
            fecha_inicio: desde, fecha_fin: tipo === 'indefinido' ? undefined : hasta,
            salario_base: salario, cargo: cargo.trim(),
          })}
        >
          Crear contrato
        </button>
      </div>
    </div>
  );
};

// ─── Adendas ───────────────────────────────────────────────────────

const AdendasTab = () => {
  const { contratos, adendas, createAdenda, removeAdenda } = useRRHH();
  const { employees } = usePersonnel();
  const [showForm, setShowForm] = useState(false);

  const contratosVigentes = contratos.filter((c) => c.estado === 'vigente');
  const empName = (id) => {
    const e = employees?.find((x) => x._id === id);
    return e ? `${e.nombre} ${e.apellido}` : id;
  };

  return (
    <div>
      <div className="rrhh-toolbar">
        <h3 className="rrhh-section-title">Adendas</h3>
        <button className="rrhh-btn rrhh-btn--primary" onClick={() => setShowForm(!showForm)} disabled={contratosVigentes.length === 0}>
          <Plus size={16} /> Nueva adenda
        </button>
      </div>

      {contratosVigentes.length === 0 && (
        <p className="rrhh-empty__inline">Sin contratos vigentes. Crea un contrato primero.</p>
      )}

      {showForm && contratosVigentes.length > 0 && (
        <AdendaForm
          contratos={contratosVigentes}
          empName={empName}
          onCancel={() => setShowForm(false)}
          onCreate={async (data) => {
            const r = await createAdenda(data);
            if (r.success) { toast.success('Adenda creada'); setShowForm(false); }
            else toast.error(r.error || 'Error');
          }}
        />
      )}

      <table className="rrhh-table">
        <thead><tr>
          <th>Número</th><th>Empleado</th><th>Fecha efectiva</th>
          <th>Motivo</th><th>Cambios</th><th></th>
        </tr></thead>
        <tbody>
          {adendas.map((a) => (
            <tr key={a._id}>
              <td>{a.numero}</td>
              <td>{empName(a.empleado_id)}</td>
              <td>{a.fecha_efectiva}</td>
              <td>{a.motivo}</td>
              <td className="rrhh-monospace">{JSON.stringify(a.cambios)}</td>
              <td>
                <button
                  className="rrhh-btn rrhh-btn--icon"
                  title="Eliminar (solo si es la última adenda del contrato)"
                  onClick={async () => {
                    if (!confirm('Eliminar adenda? Revierte salario al estado previo.')) return;
                    const r = await removeAdenda({ id: a._id });
                    if (r.success) toast.success('Adenda eliminada');
                    else toast.error(r.error || 'Error');
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
          {adendas.length === 0 && (
            <tr><td colSpan={6} className="rrhh-table__empty">Sin adendas.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const AdendaForm = ({ contratos, empName, onCreate, onCancel }) => {
  const [contratoId, setContratoId] = useState('');
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [motivo, setMotivo] = useState('');
  const [nuevoSalario, setNuevoSalario] = useState('');
  const [nuevoCargo, setNuevoCargo] = useState('');
  const [nuevaFechaFin, setNuevaFechaFin] = useState('');

  const buildCambios = () => {
    const c = {};
    if (nuevoSalario && Number(nuevoSalario) > 0) c.salario_base = Number(nuevoSalario);
    if (nuevoCargo.trim()) c.cargo = nuevoCargo.trim();
    if (nuevaFechaFin) c.fecha_fin = nuevaFechaFin;
    return c;
  };

  const cambios = buildCambios();
  const validCambios = Object.keys(cambios).length > 0;

  return (
    <div className="rrhh-card">
      <div className="rrhh-form-grid">
        <label className="rrhh-form-grid__full">
          Contrato
          <select className="rrhh-input" value={contratoId} onChange={(e) => setContratoId(e.target.value)}>
            <option value="">Seleccionar…</option>
            {contratos.map((c) => (
              <option key={c._id} value={c._id}>
                {c.numero} — {empName(c.empleado_id)} ({c.cargo}, ${c.salario_base})
              </option>
            ))}
          </select>
        </label>
        <label>
          Número adenda
          <input className="rrhh-input" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="ADD-001" />
        </label>
        <label>
          Fecha efectiva
          <input type="date" className="rrhh-input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label className="rrhh-form-grid__full">
          Motivo
          <input className="rrhh-input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Aumento de salario / Cambio de cargo" />
        </label>
        <label>
          Nuevo salario (opcional)
          <input type="number" className="rrhh-input" value={nuevoSalario} onChange={(e) => setNuevoSalario(e.target.value)} />
        </label>
        <label>
          Nuevo cargo (opcional)
          <input className="rrhh-input" value={nuevoCargo} onChange={(e) => setNuevoCargo(e.target.value)} />
        </label>
        <label>
          Nueva fecha fin (opcional)
          <input type="date" className="rrhh-input" value={nuevaFechaFin} onChange={(e) => setNuevaFechaFin(e.target.value)} />
        </label>
      </div>
      <p className="rrhh-hint">Al menos un cambio requerido. La adenda preserva el contrato original.</p>
      <div className="rrhh-form-actions">
        <button className="rrhh-btn" onClick={onCancel}>Cancelar</button>
        <button
          className="rrhh-btn rrhh-btn--primary"
          disabled={!contratoId || !numero.trim() || !motivo.trim() || !validCambios}
          onClick={() => onCreate({
            contrato_id: contratoId, numero: numero.trim(),
            fecha_efectiva: fecha, motivo: motivo.trim(), cambios,
          })}
        >
          Crear adenda
        </button>
      </div>
    </div>
  );
};

// ─── Histórico salarial global ─────────────────────────────────────

const HistoricoTab = () => {
  const { employees } = usePersonnel();
  // Devuelve agregado de todos los empleados — caro pa' org grande, mejor por empleado.
  // Acá mostramos solo lista de empleados con su salario actual; detalle clickea empleado en tab Empleados.
  const sorted = useMemo(() => {
    if (!employees) return [];
    return [...employees].sort((a, b) => (b.salario ?? 0) - (a.salario ?? 0));
  }, [employees]);

  return (
    <div>
      <h3 className="rrhh-section-title">Histórico salarial</h3>
      <p className="rrhh-hint">Vista agregada. Para detalle histórico por empleado, seleccionalo en el tab Empleados.</p>
      <table className="rrhh-table">
        <thead><tr><th>Empleado</th><th>Cargo</th><th>Salario actual</th></tr></thead>
        <tbody>
          {sorted.map((e) => (
            <tr key={e._id}>
              <td>{e.nombre} {e.apellido}</td>
              <td>{e.cargo ?? '—'}</td>
              <td>${e.salario?.toFixed(2) ?? '0.00'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RRHHComponent;
