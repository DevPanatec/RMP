import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  Plus, Edit, Trash2, X, AlertTriangle, Clock, Gauge,
  Truck, CheckCircle
} from '../Icons';
import './PMScheduleManager.css';

const INTERVALOS = [
  { value: 'km', label: 'Kilómetros', icon: Gauge, unit: 'km' },
  { value: 'horas', label: 'Horas de motor', icon: Clock, unit: 'h' },
  { value: 'dias', label: 'Días', icon: Clock, unit: 'días' },
];

const CATEGORIAS = [
  'motor', 'transmision', 'frenos', 'neumaticos', 'suspension',
  'electrico', 'hidraulico', 'lubricacion', 'filtros', 'general',
];

function formatRemaining(eval_, tipo_intervalo) {
  if (eval_.remaining === null) return '—';
  const abs = Math.abs(eval_.remaining);
  const unit = tipo_intervalo === 'km' ? 'km' : tipo_intervalo === 'horas' ? 'h' : 'días';
  if (eval_.estado === 'vencido') return `Vencido por ${abs.toFixed(0)} ${unit}`;
  return `Faltan ${abs.toFixed(0)} ${unit}`;
}

function estadoStyle(estado) {
  switch (estado) {
    case 'vencido':
      return { bg: 'var(--color-error-light)', color: 'var(--color-error)', border: 'var(--color-error)' };
    case 'proximo':
      return { bg: 'var(--color-warning-light)', color: 'var(--color-warning-dark, #92400e)', border: 'var(--color-warning)' };
    case 'al_dia':
      return { bg: 'var(--color-success-light)', color: 'var(--color-success)', border: 'var(--color-success)' };
    default:
      return { bg: 'var(--color-surface-secondary)', color: 'var(--color-text-secondary)', border: 'var(--color-border)' };
  }
}

// ─── PM Form Modal ───────────────────────────────────────

function PMFormModal({ pm, vehicles, onClose, onSaved }) {
  const create = useMutation(api.pmSchedules.create);
  const update = useMutation(api.pmSchedules.update);
  const isEdit = !!pm;

  const [form, setForm] = useState({
    vehiculo_id: pm?.vehiculo_id ?? '',
    titulo: pm?.titulo ?? '',
    descripcion: pm?.descripcion ?? '',
    categoria: pm?.categoria ?? 'motor',
    tipo_intervalo: pm?.tipo_intervalo ?? 'km',
    intervalo_valor: pm?.intervalo_valor ?? '',
    advertencia_anticipada: pm?.advertencia_anticipada ?? '',
    referencia_km: pm?.referencia_km ?? '',
    referencia_horas: pm?.referencia_horas ?? '',
    prioridad: pm?.prioridad ?? 'media',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.vehiculo_id || !form.titulo || !form.intervalo_valor) return;
    setSaving(true);
    try {
      const payload = {
        titulo: form.titulo,
        descripcion: form.descripcion || undefined,
        categoria: form.categoria || undefined,
        tipo_intervalo: form.tipo_intervalo,
        intervalo_valor: Number(form.intervalo_valor),
        advertencia_anticipada: form.advertencia_anticipada !== '' ? Number(form.advertencia_anticipada) : undefined,
        referencia_km: form.referencia_km !== '' ? Number(form.referencia_km) : undefined,
        referencia_horas: form.referencia_horas !== '' ? Number(form.referencia_horas) : undefined,
        prioridad: form.prioridad,
      };
      if (isEdit) {
        await update({ id: pm._id, ...payload });
      } else {
        await create({ vehiculo_id: form.vehiculo_id, ...payload });
      }
      onSaved();
    } catch (err) {
      alert(`Error: ${err.message ?? err}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pm-modal-overlay" onClick={onClose}>
      <div className="pm-modal" onClick={e => e.stopPropagation()}>
        <div className="pm-modal__header">
          <h3>{isEdit ? 'Editar plan preventivo' : 'Nuevo plan preventivo'}</h3>
          <button className="pm-modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="pm-modal__body">
          <div className="pm-form-row">
            <label>Vehículo *</label>
            <select className="pm-input" value={form.vehiculo_id} onChange={e => set('vehiculo_id', e.target.value)} disabled={isEdit}>
              <option value="">Seleccionar…</option>
              {vehicles.map(v => (
                <option key={v._id} value={v._id}>{v.placa}{v.nombre ? ` — ${v.nombre}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="pm-form-row">
            <label>Título *</label>
            <input className="pm-input" value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="ej: Cambio de aceite motor" />
          </div>
          <div className="pm-form-row">
            <label>Descripción</label>
            <textarea className="pm-input pm-textarea" rows={2} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
          </div>
          <div className="pm-form-grid">
            <div className="pm-form-row">
              <label>Categoría</label>
              <select className="pm-input" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="pm-form-row">
              <label>Prioridad</label>
              <select className="pm-input" value={form.prioridad} onChange={e => set('prioridad', e.target.value)}>
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>
          <div className="pm-form-row">
            <label>Tipo de intervalo *</label>
            <div className="pm-radio-group">
              {INTERVALOS.map(i => (
                <label key={i.value} className={`pm-radio${form.tipo_intervalo === i.value ? ' pm-radio--active' : ''}`}>
                  <input type="radio" name="tipo_intervalo" value={i.value} checked={form.tipo_intervalo === i.value} onChange={e => set('tipo_intervalo', e.target.value)} />
                  <i.icon size={14} /> {i.label}
                </label>
              ))}
            </div>
          </div>
          <div className="pm-form-grid">
            <div className="pm-form-row">
              <label>Cada *</label>
              <input type="number" className="pm-input" value={form.intervalo_valor} onChange={e => set('intervalo_valor', e.target.value)} placeholder={form.tipo_intervalo === 'km' ? '10000' : form.tipo_intervalo === 'horas' ? '250' : '90'} />
            </div>
            <div className="pm-form-row">
              <label>Avisar con anticipación</label>
              <input type="number" className="pm-input" value={form.advertencia_anticipada} onChange={e => set('advertencia_anticipada', e.target.value)} placeholder="opcional" />
            </div>
          </div>
          <div className="pm-form-grid">
            <div className="pm-form-row">
              <label>Referencia km (último servicio)</label>
              <input type="number" className="pm-input" value={form.referencia_km} onChange={e => set('referencia_km', e.target.value)} placeholder="0 si es nuevo" />
            </div>
            <div className="pm-form-row">
              <label>Referencia horas</label>
              <input type="number" className="pm-input" value={form.referencia_horas} onChange={e => set('referencia_horas', e.target.value)} placeholder="solo si aplica" />
            </div>
          </div>
        </div>
        <div className="pm-modal__footer">
          <button className="pm-btn pm-btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="pm-btn pm-btn--primary" onClick={handleSave} disabled={saving || !form.vehiculo_id || !form.titulo || !form.intervalo_valor}>
            {saving ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mark Executed Modal ────────────────────────────────

function MarkExecutedModal({ pm, latestReading, onClose, onSaved }) {
  const markExecuted = useMutation(api.pmSchedules.markExecuted);
  const recordReading = useMutation(api.meterReadings.record);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    nueva_referencia_km: pm.tipo_intervalo === 'km' ? (latestReading?.km_efectivo ?? '') : '',
    nueva_referencia_horas: pm.tipo_intervalo === 'horas' ? (latestReading?.horas_efectivo ?? '') : '',
    registrar_lectura: false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const fechaMs = new Date(form.fecha).getTime();
      // Si el usuario eligió registrar lectura, hacerlo primero
      if (form.registrar_lectura) {
        if (pm.tipo_intervalo === 'km' && form.nueva_referencia_km !== '') {
          await recordReading({
            vehiculo_id: pm.vehiculo_id,
            tipo: 'odometro',
            valor: Number(form.nueva_referencia_km),
            fecha: fechaMs,
            fuente: 'workorder',
          });
        }
        if (pm.tipo_intervalo === 'horas' && form.nueva_referencia_horas !== '') {
          await recordReading({
            vehiculo_id: pm.vehiculo_id,
            tipo: 'horometro',
            valor: Number(form.nueva_referencia_horas),
            fecha: fechaMs,
            fuente: 'workorder',
          });
        }
      }
      await markExecuted({
        id: pm._id,
        fecha_ejecucion: fechaMs,
        nueva_referencia_km: form.nueva_referencia_km !== '' ? Number(form.nueva_referencia_km) : undefined,
        nueva_referencia_horas: form.nueva_referencia_horas !== '' ? Number(form.nueva_referencia_horas) : undefined,
      });
      onSaved();
    } catch (err) {
      alert(`Error: ${err.message ?? err}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pm-modal-overlay" onClick={onClose}>
      <div className="pm-modal pm-modal--sm" onClick={e => e.stopPropagation()}>
        <div className="pm-modal__header">
          <h3>Marcar ejecutado — {pm.titulo}</h3>
          <button className="pm-modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="pm-modal__body">
          <div className="pm-form-row">
            <label>Fecha de ejecución</label>
            <input type="date" className="pm-input" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
          </div>
          {pm.tipo_intervalo === 'km' && (
            <div className="pm-form-row">
              <label>Nueva referencia km *</label>
              <input type="number" className="pm-input" value={form.nueva_referencia_km} onChange={e => set('nueva_referencia_km', e.target.value)} placeholder="km al momento del servicio" />
              <small className="pm-hint">Próximo servicio: {form.nueva_referencia_km ? (Number(form.nueva_referencia_km) + pm.intervalo_valor).toFixed(0) : '—'} km</small>
            </div>
          )}
          {pm.tipo_intervalo === 'horas' && (
            <div className="pm-form-row">
              <label>Nueva referencia horas *</label>
              <input type="number" className="pm-input" value={form.nueva_referencia_horas} onChange={e => set('nueva_referencia_horas', e.target.value)} placeholder="horas al momento del servicio" />
            </div>
          )}
          {(pm.tipo_intervalo === 'km' || pm.tipo_intervalo === 'horas') && (
            <div className="pm-form-row">
              <label className="pm-checkbox">
                <input type="checkbox" checked={form.registrar_lectura} onChange={e => set('registrar_lectura', e.target.checked)} />
                También registrar como lectura de odómetro/horómetro
              </label>
            </div>
          )}
        </div>
        <div className="pm-modal__footer">
          <button className="pm-btn pm-btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="pm-btn pm-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Confirmar ejecución'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reading Modal ──────────────────────────────────────

function ReadingModal({ vehicles, defaultVehiculoId, onClose, onSaved }) {
  const record = useMutation(api.meterReadings.record);
  const [form, setForm] = useState({
    vehiculo_id: defaultVehiculoId ?? '',
    tipo: 'odometro',
    valor: '',
    fecha: new Date().toISOString().split('T')[0],
    notas: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.vehiculo_id || form.valor === '') return;
    setSaving(true);
    try {
      await record({
        vehiculo_id: form.vehiculo_id,
        tipo: form.tipo,
        valor: Number(form.valor),
        fecha: new Date(form.fecha).getTime(),
        fuente: 'manual',
        notas: form.notas || undefined,
      });
      onSaved();
    } catch (err) {
      alert(`Error: ${err.message ?? err}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pm-modal-overlay" onClick={onClose}>
      <div className="pm-modal pm-modal--sm" onClick={e => e.stopPropagation()}>
        <div className="pm-modal__header">
          <h3>Registrar lectura</h3>
          <button className="pm-modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="pm-modal__body">
          <div className="pm-form-row">
            <label>Vehículo *</label>
            <select className="pm-input" value={form.vehiculo_id} onChange={e => set('vehiculo_id', e.target.value)}>
              <option value="">Seleccionar…</option>
              {vehicles.map(v => (
                <option key={v._id} value={v._id}>{v.placa}{v.nombre ? ` — ${v.nombre}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="pm-form-grid">
            <div className="pm-form-row">
              <label>Tipo</label>
              <select className="pm-input" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                <option value="odometro">Odómetro (km)</option>
                <option value="horometro">Horómetro (h)</option>
              </select>
            </div>
            <div className="pm-form-row">
              <label>Valor *</label>
              <input type="number" className="pm-input" value={form.valor} onChange={e => set('valor', e.target.value)} placeholder={form.tipo === 'odometro' ? 'km' : 'horas'} />
            </div>
          </div>
          <div className="pm-form-row">
            <label>Fecha</label>
            <input type="date" className="pm-input" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
          </div>
          <div className="pm-form-row">
            <label>Notas</label>
            <textarea className="pm-input pm-textarea" rows={2} value={form.notas} onChange={e => set('notas', e.target.value)} />
          </div>
        </div>
        <div className="pm-modal__footer">
          <button className="pm-btn pm-btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="pm-btn pm-btn--primary" onClick={handleSave} disabled={saving || !form.vehiculo_id || form.valor === ''}>
            {saving ? 'Guardando…' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Manager Component ─────────────────────────────

export default function PMScheduleManager({ canWrite }) {
  const dueOrUpcoming = useQuery(api.pmSchedules.listDueOrUpcoming, {}) ?? [];
  const allVehicles = useQuery(api.vehiculos.listMinimal, {}) ?? [];
  const removeMutation = useMutation(api.pmSchedules.remove);

  const [showForm, setShowForm] = useState(false);
  const [editPm, setEditPm] = useState(null);
  const [executePm, setExecutePm] = useState(null);
  const [showReading, setShowReading] = useState(false);
  const [readingVehiculo, setReadingVehiculo] = useState(null);

  const groupedByVehicle = useMemo(() => {
    const m = new Map();
    for (const pm of dueOrUpcoming) {
      const key = pm.vehiculo_id;
      if (!m.has(key)) {
        m.set(key, {
          vehiculo_id: pm.vehiculo_id,
          vehiculo_placa: pm.vehiculo_placa,
          vehiculo_nombre: pm.vehiculo_nombre,
          lectura_km: pm.lectura_km,
          lectura_horas: pm.lectura_horas,
          pms: [],
        });
      }
      m.get(key).pms.push(pm);
    }
    return [...m.values()];
  }, [dueOrUpcoming]);

  const totalVencidos = dueOrUpcoming.filter(p => p.evaluacion.estado === 'vencido').length;
  const totalProximos = dueOrUpcoming.filter(p => p.evaluacion.estado === 'proximo').length;

  const handleDelete = async (pm) => {
    if (!confirm(`¿Eliminar plan "${pm.titulo}"?`)) return;
    await removeMutation({ id: pm._id });
  };

  return (
    <div className="pm-manager">
      {/* Resumen + acciones */}
      <div className="pm-summary">
        <div className="pm-summary__stats">
          <div className="pm-stat pm-stat--danger">
            <AlertTriangle size={18} />
            <div>
              <div className="pm-stat__value">{totalVencidos}</div>
              <div className="pm-stat__label">Vencidos</div>
            </div>
          </div>
          <div className="pm-stat pm-stat--warn">
            <Clock size={18} />
            <div>
              <div className="pm-stat__value">{totalProximos}</div>
              <div className="pm-stat__label">Próximos</div>
            </div>
          </div>
        </div>
        {canWrite && (
          <div className="pm-summary__actions">
            <button className="pm-btn pm-btn--ghost" onClick={() => { setReadingVehiculo(null); setShowReading(true); }}>
              <Gauge size={14} /> Registrar lectura
            </button>
            <button className="pm-btn pm-btn--primary" onClick={() => setShowForm(true)}>
              <Plus size={14} /> Nuevo plan
            </button>
          </div>
        )}
      </div>

      {/* Lista agrupada por vehículo */}
      {groupedByVehicle.length === 0 ? (
        <div className="pm-empty">
          <CheckCircle size={32} />
          <h4>Todo al día</h4>
          <p>No hay mantenimientos preventivos vencidos ni próximos.</p>
          {canWrite && (
            <button className="pm-btn pm-btn--primary" onClick={() => setShowForm(true)}>
              <Plus size={14} /> Crear primer plan
            </button>
          )}
        </div>
      ) : (
        <div className="pm-vehicle-list">
          {groupedByVehicle.map(group => (
            <div key={group.vehiculo_id} className="pm-vehicle-card">
              <div className="pm-vehicle-card__header">
                <div className="pm-vehicle-card__title">
                  <Truck size={16} />
                  <strong>{group.vehiculo_placa ?? '—'}</strong>
                  {group.vehiculo_nombre && <span className="pm-vehicle-card__sub">{group.vehiculo_nombre}</span>}
                </div>
                <div className="pm-vehicle-card__readings">
                  {group.lectura_km != null && <span><Gauge size={12} /> {group.lectura_km.toFixed(0)} km</span>}
                  {group.lectura_horas != null && <span><Clock size={12} /> {group.lectura_horas.toFixed(0)} h</span>}
                  {canWrite && (
                    <button className="pm-icon-btn" title="Registrar lectura" onClick={() => { setReadingVehiculo(group.vehiculo_id); setShowReading(true); }}>
                      <Plus size={12} />
                    </button>
                  )}
                </div>
              </div>
              <div className="pm-list">
                {group.pms.map(pm => {
                  const s = estadoStyle(pm.evaluacion.estado);
                  return (
                    <div key={pm._id} className="pm-row" style={{ borderLeftColor: s.border }}>
                      <div className="pm-row__main">
                        <div className="pm-row__title">{pm.titulo}</div>
                        <div className="pm-row__meta">
                          {pm.categoria && <span className="pm-tag">{pm.categoria}</span>}
                          <span>cada {pm.intervalo_valor} {pm.tipo_intervalo}</span>
                          {pm.prioridad && <span className={`pm-priority pm-priority--${pm.prioridad}`}>{pm.prioridad}</span>}
                        </div>
                      </div>
                      <div className="pm-row__status">
                        <span className="pm-badge" style={{ background: s.bg, color: s.color, borderColor: s.border }}>
                          {pm.evaluacion.estado === 'vencido' ? 'Vencido' : 'Próximo'}
                        </span>
                        <div className="pm-row__remaining" style={{ color: s.color }}>
                          {formatRemaining(pm.evaluacion, pm.tipo_intervalo)}
                        </div>
                      </div>
                      {canWrite && (
                        <div className="pm-row__actions">
                          <button className="pm-icon-btn" title="Marcar ejecutado" onClick={() => setExecutePm(pm)}>
                            <CheckCircle size={15} />
                          </button>
                          <button className="pm-icon-btn" title="Editar" onClick={() => setEditPm(pm)}>
                            <Edit size={15} />
                          </button>
                          <button className="pm-icon-btn pm-icon-btn--danger" title="Eliminar" onClick={() => handleDelete(pm)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {(showForm || editPm) && (
        <PMFormModal
          pm={editPm}
          vehicles={allVehicles}
          onClose={() => { setShowForm(false); setEditPm(null); }}
          onSaved={() => { setShowForm(false); setEditPm(null); }}
        />
      )}
      {executePm && (
        <MarkExecutedModal
          pm={executePm}
          latestReading={{ km_efectivo: executePm.lectura_km, horas_efectivo: executePm.lectura_horas }}
          onClose={() => setExecutePm(null)}
          onSaved={() => setExecutePm(null)}
        />
      )}
      {showReading && (
        <ReadingModal
          vehicles={allVehicles}
          defaultVehiculoId={readingVehiculo}
          onClose={() => { setShowReading(false); setReadingVehiculo(null); }}
          onSaved={() => { setShowReading(false); setReadingVehiculo(null); }}
        />
      )}
    </div>
  );
}
