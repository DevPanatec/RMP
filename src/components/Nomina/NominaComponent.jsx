import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useOrganization } from '../../context/OrganizationContext';
import { Lock, Plus, Download, DollarSign, Trash2, X, RefreshCw, Check } from '../Icons';
import toast from 'react-hot-toast';
import './NominaComponent.css';

const NominaComponent = () => {
  const { hasModulo } = useOrganization();
  const [selectedPeriodo, setSelectedPeriodo] = useState(null);

  const periodos = useQuery(api.nomina.periodos.list, {}) ?? [];

  // Gate triple: NOM + ASI + RRHH
  if (!hasModulo('NOM')) {
    return <GatedScreen icon={<Lock size={48} />} title="Módulo Nómina no contratado" message="Contacta al admin." />;
  }
  if (!hasModulo('ASI') || !hasModulo('RRHH')) {
    return <GatedScreen icon={<Lock size={48} />} title="Nómina requiere ASI + RRHH" message={`Faltan: ${!hasModulo('ASI') ? 'Asistencia ' : ''}${!hasModulo('RRHH') ? 'RRHH' : ''}`} />;
  }

  return (
    <div className="nom-root">
      <div className="nom-layout">
        <PeriodosPane
          periodos={periodos}
          selected={selectedPeriodo}
          onSelect={setSelectedPeriodo}
        />
        <PeriodoDetail periodo={selectedPeriodo} />
      </div>
    </div>
  );
};

const GatedScreen = ({ icon, title, message }) => (
  <div className="nom-empty">
    {icon}
    <h2>{title}</h2>
    <p>{message}</p>
  </div>
);

// ─── Periodos pane (master) ────────────────────────────────────────

const PeriodosPane = ({ periodos, selected, onSelect }) => {
  const { currentOrgId } = useOrganization();
  const create = useMutation(api.nomina.periodos.create);
  const remove = useMutation(api.nomina.periodos.remove);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="nom-pane">
      <div className="nom-pane__header">
        <h3>Períodos</h3>
        <button className="nom-btn nom-btn--primary nom-btn--sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> Nuevo
        </button>
      </div>

      {showForm && (
        <PeriodoForm
          onCancel={() => setShowForm(false)}
          onCreate={async (data) => {
            try {
              // v.optional() acepta undefined, NO null. Omit si currentOrgId es null.
              const payload = currentOrgId
                ? { ...data, organizacion_id: currentOrgId }
                : data;
              await create(payload);
              toast.success('Período creado');
              setShowForm(false);
            } catch (e) {
              toast.error(e.message || 'Error');
            }
          }}
        />
      )}

      <ul className="nom-list">
        {periodos.map((p) => (
          <li
            key={p._id}
            className={`nom-list__item ${selected?._id === p._id ? 'is-selected' : ''}`}
            onClick={() => onSelect(p)}
          >
            <div className="nom-list__row">
              <strong>{p.nombre}</strong>
              <span className={`nom-badge nom-badge--${p.estado}`}>{p.estado}</span>
            </div>
            <div className="nom-list__meta">
              {p.tipo} · {p.fecha_desde} → {p.fecha_hasta}
            </div>
            {p.estado === 'abierto' && (
              <button
                className="nom-list__remove"
                title="Eliminar"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm(`Eliminar período "${p.nombre}"?`)) return;
                  try {
                    await remove({ id: p._id });
                    toast.success('Eliminado');
                    if (selected?._id === p._id) onSelect(null);
                  } catch (err) {
                    toast.error(err.message || 'Error');
                  }
                }}
              >
                <Trash2 size={12} />
              </button>
            )}
          </li>
        ))}
        {periodos.length === 0 && <li className="nom-list__empty">Sin períodos. Crea uno.</li>}
      </ul>
    </div>
  );
};

const PeriodoForm = ({ onCreate, onCancel }) => {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('quincenal');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [dlm, setDlm] = useState(22);

  // Auto-relleno quincenal/mensual al cambiar desde
  const handleDesdeChange = (v) => {
    setDesde(v);
    if (!v) return;
    const d = new Date(v + 'T00:00:00Z');
    if (tipo === 'quincenal') {
      const day = d.getUTCDate();
      if (day === 1) {
        const end = new Date(d);
        end.setUTCDate(15);
        setHasta(end.toISOString().slice(0, 10));
        setNombre(`Q1 ${d.toLocaleDateString('es-PA', { month: 'long', year: 'numeric' })}`);
      } else if (day === 16) {
        const end = new Date(d.getUTCFullYear(), d.getUTCMonth() + 1, 0);
        setHasta(end.toISOString().slice(0, 10));
        setNombre(`Q2 ${d.toLocaleDateString('es-PA', { month: 'long', year: 'numeric' })}`);
      }
    } else if (tipo === 'mensual') {
      const end = new Date(d.getUTCFullYear(), d.getUTCMonth() + 1, 0);
      setHasta(end.toISOString().slice(0, 10));
      setNombre(d.toLocaleDateString('es-PA', { month: 'long', year: 'numeric' }));
    }
  };

  return (
    <div className="nom-card">
      <label className="nom-field">
        <span>Tipo</span>
        <select className="nom-input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="quincenal">Quincenal</option>
          <option value="mensual">Mensual</option>
        </select>
      </label>
      <label className="nom-field">
        <span>Desde</span>
        <input type="date" className="nom-input" value={desde} onChange={(e) => handleDesdeChange(e.target.value)} />
      </label>
      <label className="nom-field">
        <span>Hasta</span>
        <input type="date" className="nom-input" value={hasta} onChange={(e) => setHasta(e.target.value)} />
      </label>
      <label className="nom-field">
        <span>Nombre</span>
        <input className="nom-input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Quincena Mar 1-15" />
      </label>
      <label className="nom-field">
        <span>Días laborables/mes</span>
        <input type="number" min={15} max={31} className="nom-input" value={dlm} onChange={(e) => setDlm(Number(e.target.value))} />
      </label>
      <div className="nom-form-actions">
        <button className="nom-btn" onClick={onCancel}>Cancelar</button>
        <button
          className="nom-btn nom-btn--primary"
          disabled={!nombre.trim() || !desde || !hasta}
          onClick={() => onCreate({ nombre: nombre.trim(), tipo, fecha_desde: desde, fecha_hasta: hasta, dias_laborables_mes: dlm })}
        >
          Crear
        </button>
      </div>
    </div>
  );
};

// ─── Período detail ────────────────────────────────────────────────

const PeriodoDetail = ({ periodo }) => {
  const calcular = useMutation(api.nomina.calculo.calcularPeriodo);
  const cerrar = useMutation(api.nomina.periodos.cerrar);
  const reabrir = useMutation(api.nomina.periodos.reabrir);
  const lineas = useQuery(
    api.nomina.lineas.listByPeriodo,
    periodo ? { periodo_id: periodo._id } : 'skip',
  );
  const totales = useQuery(
    api.nomina.lineas.totalesPorPeriodo,
    periodo ? { periodo_id: periodo._id } : 'skip',
  );
  const [calculating, setCalculating] = useState(false);

  if (!periodo) {
    return (
      <div className="nom-pane nom-pane--detail">
        <div className="nom-empty nom-empty--inline">
          <p>Selecciona un período para ver el cálculo de nómina.</p>
        </div>
      </div>
    );
  }

  const handleCalcular = async () => {
    setCalculating(true);
    try {
      const r = await calcular({ periodo_id: periodo._id });
      if (r.partial) {
        toast.success(`Procesado chunk: ${r.creadas} líneas. ${r.remaining} pendientes (en background)`);
      } else {
        toast.success(`Cálculo completo: ${r.creadas} empleados, $${r.bruto_total.toFixed(2)} bruto total`);
      }
    } catch (e) {
      toast.error(e.message || 'Error');
    } finally {
      setCalculating(false);
    }
  };

  const handleCerrar = async () => {
    if (!confirm('Cerrar período? No podrás recalcular sin reabrir.')) return;
    try {
      await cerrar({ id: periodo._id });
      toast.success('Período cerrado');
    } catch (e) {
      toast.error(e.message || 'Error');
    }
  };

  const handleReabrir = async () => {
    try {
      await reabrir({ id: periodo._id });
      toast.success('Período reabierto');
    } catch (e) {
      toast.error(e.message || 'Error');
    }
  };

  const handleExport = () => {
    if (!lineas || lineas.length === 0) {
      toast.error('Sin líneas para exportar');
      return;
    }
    const headers = [
      'Empleado', 'Cédula', 'Cargo',
      'Salario mensual', 'Salario base período',
      'Min trabajados', 'Días completos', 'Días permiso',
      'Min ausente', 'Monto ausencias',
      'Min HE diurna', 'Min HE nocturna', 'Min HE feriado', 'Min HE domingo',
      'Monto extras', 'BRUTO TOTAL',
    ];
    const rows = lineas.map((l) => [
      l.empleado_nombre, l.empleado_cedula, l.cargo ?? '',
      l.salario_mensual, l.salario_base_periodo,
      l.minutos_trabajados, l.dias_completos, l.dias_permiso,
      l.minutos_ausente, l.monto_ausencias,
      l.minutos_extra_diurna, l.minutos_extra_nocturna,
      l.minutos_extra_feriado, l.minutos_extra_domingo,
      l.monto_extras, l.bruto_total,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nomina_${periodo.nombre.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('CSV descargado');
  };

  return (
    <div className="nom-pane nom-pane--detail">
      <div className="nom-detail__header">
        <div>
          <h3>{periodo.nombre}</h3>
          <p>{periodo.tipo} · {periodo.fecha_desde} → {periodo.fecha_hasta}</p>
        </div>
        <div className="nom-detail__actions">
          {periodo.estado === 'abierto' && (
            <button className="nom-btn nom-btn--primary" onClick={handleCalcular} disabled={calculating}>
              <DollarSign size={14} /> {calculating ? 'Calculando…' : 'Calcular'}
            </button>
          )}
          {periodo.estado === 'calculado' && (
            <>
              <button className="nom-btn" onClick={handleCalcular} disabled={calculating}>
                <RefreshCw size={14} /> Recalcular
              </button>
              <button className="nom-btn nom-btn--success" onClick={handleCerrar}>
                <Check size={14} /> Cerrar
              </button>
            </>
          )}
          {periodo.estado === 'cerrado' && (
            <button className="nom-btn" onClick={handleReabrir}>
              <X size={14} /> Reabrir
            </button>
          )}
          {(periodo.estado === 'calculado' || periodo.estado === 'cerrado') && (
            <button className="nom-btn" onClick={handleExport}>
              <Download size={14} /> CSV
            </button>
          )}
        </div>
      </div>

      {totales && (
        <div className="nom-totales">
          <Total label="Empleados" value={totales.empleados} />
          <Total label="Base período" value={`$${totales.total_base.toFixed(2)}`} />
          <Total label="Extras" value={`$${totales.total_extras.toFixed(2)}`} />
          <Total label="Ausencias" value={`$${totales.total_ausencias.toFixed(2)}`} />
          <Total label="BRUTO TOTAL" value={`$${totales.bruto_total.toFixed(2)}`} highlight />
        </div>
      )}

      <table className="nom-table">
        <thead>
          <tr>
            <th>Empleado</th>
            <th>Cargo</th>
            <th>Mensual</th>
            <th>Base período</th>
            <th>Min trab.</th>
            <th>Min aus.</th>
            <th>Aus. $</th>
            <th>HE total min</th>
            <th>Extras $</th>
            <th>Bruto</th>
          </tr>
        </thead>
        <tbody>
          {(lineas ?? []).map((l) => (
            <tr key={l._id}>
              <td>{l.empleado_nombre}</td>
              <td>{l.cargo ?? '—'}</td>
              <td>${l.salario_mensual.toFixed(2)}</td>
              <td>${l.salario_base_periodo.toFixed(2)}</td>
              <td>{l.minutos_trabajados}</td>
              <td>{l.minutos_ausente}</td>
              <td>${l.monto_ausencias.toFixed(2)}</td>
              <td>{l.minutos_extra_diurna + l.minutos_extra_nocturna + l.minutos_extra_feriado + l.minutos_extra_domingo}</td>
              <td>${l.monto_extras.toFixed(2)}</td>
              <td><strong>${l.bruto_total.toFixed(2)}</strong></td>
            </tr>
          ))}
          {lineas && lineas.length === 0 && (
            <tr><td colSpan={10} className="nom-table__empty">Sin líneas. Calcula el período.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const Total = ({ label, value, highlight }) => (
  <div className={`nom-total ${highlight ? 'is-highlight' : ''}`}>
    <div className="nom-total__label">{label}</div>
    <div className="nom-total__value">{value}</div>
  </div>
);

const csvCell = (v) => {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
};

export default NominaComponent;
