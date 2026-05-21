import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { MapPin, Plus, RefreshCw, Trash2, Edit, History, X, ChevronRight } from '../Icons';
import './LocationComponentsView.css';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function calcDays(fechaInstalacion, vidaUtilDias) {
  const dias = Math.floor((Date.now() - fechaInstalacion) / 86400000);
  const pct = dias / vidaUtilDias;
  return { dias, pct: Math.min(1, Math.max(0, pct)) };
}

function lifecycleColor(pct) {
  if (pct < 0.5) return 'var(--color-success)';
  if (pct < 0.8) return 'var(--color-warning)';
  return 'var(--color-error)';
}

function estadoBadge(estado) {
  const map = {
    activo: { label: 'Activo', cls: 'lc-badge--success' },
    reemplazado: { label: 'Reemplazado', cls: 'lc-badge--info' },
    vencido: { label: 'Vencido', cls: 'lc-badge--error' },
  };
  return map[estado] ?? { label: estado, cls: 'lc-badge--neutral' };
}

// ─────────────────────────────────────────────
// Component Form Modal
// ─────────────────────────────────────────────

function ComponentFormModal({ lugarId, component, onClose, onSaved }) {
  const addMutation = useMutation(api.fleetInventory.addLocationComponent);
  const updateMutation = useMutation(api.fleetInventory.updateLocationComponent);
  const isEdit = !!component;

  const [form, setForm] = useState({
    nombre: component?.nombre ?? '',
    tipo: component?.tipo ?? '',
    marca: component?.marca ?? '',
    fecha_instalacion: component
      ? new Date(component.fecha_instalacion).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    vida_util_dias: component?.vida_util_dias ?? '',
    costo: component?.costo ?? '',
    notas: component?.notas ?? '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.nombre || !form.tipo || !form.vida_util_dias) return;
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre,
        tipo: form.tipo,
        marca: form.marca || undefined,
        fecha_instalacion: new Date(form.fecha_instalacion).getTime(),
        vida_util_dias: Number(form.vida_util_dias),
        costo: form.costo !== '' ? Number(form.costo) : undefined,
        notas: form.notas || undefined,
      };
      if (isEdit) {
        await updateMutation({ id: component._id, ...payload });
      } else {
        await addMutation({ lugar_id: lugarId, ...payload });
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lc-modal-overlay" onClick={onClose}>
      <div className="lc-modal" onClick={e => e.stopPropagation()}>
        <div className="lc-modal__header">
          <h3>{isEdit ? 'Editar componente' : 'Agregar componente'}</h3>
          <button className="lc-modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="lc-modal__body">
          <div className="lc-form-row">
            <label>Nombre *</label>
            <input className="lc-input" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="ej: Cepillo rotativo, Lámpara LED" />
          </div>
          <div className="lc-form-row">
            <label>Tipo *</label>
            <input className="lc-input" value={form.tipo} onChange={e => set('tipo', e.target.value)} placeholder="ej: cepillo, lampara, filtro" />
          </div>
          <div className="lc-form-grid">
            <div className="lc-form-row">
              <label>Marca</label>
              <input className="lc-input" value={form.marca} onChange={e => set('marca', e.target.value)} />
            </div>
            <div className="lc-form-row">
              <label>Vida útil (días) *</label>
              <input type="number" className="lc-input" value={form.vida_util_dias} onChange={e => set('vida_util_dias', e.target.value)} placeholder="ej: 90" />
            </div>
          </div>
          <div className="lc-form-grid">
            <div className="lc-form-row">
              <label>Fecha instalación *</label>
              <input type="date" className="lc-input" value={form.fecha_instalacion} onChange={e => set('fecha_instalacion', e.target.value)} />
            </div>
            <div className="lc-form-row">
              <label>Costo ($)</label>
              <input type="number" className="lc-input" value={form.costo} onChange={e => set('costo', e.target.value)} />
            </div>
          </div>
          <div className="lc-form-row">
            <label>Notas</label>
            <textarea className="lc-input lc-textarea" value={form.notas} onChange={e => set('notas', e.target.value)} rows={2} />
          </div>
        </div>
        <div className="lc-modal__footer">
          <button className="lc-btn lc-btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="lc-btn lc-btn--primary" onClick={handleSave} disabled={saving || !form.nombre || !form.tipo || !form.vida_util_dias}>
            {saving ? 'Guardando…' : isEdit ? 'Guardar' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Replace Modal
// ─────────────────────────────────────────────

function ReplaceModal({ component, onClose, onSaved }) {
  const replaceMutation = useMutation(api.fleetInventory.replaceLocationComponent);
  const [form, setForm] = useState({
    motivo: 'preventivo',
    tecnico: '',
    costo: '',
    notas: '',
    nueva_fecha: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await replaceMutation({
        componente_id: component._id,
        motivo: form.motivo,
        tecnico: form.tecnico || undefined,
        costo: form.costo !== '' ? Number(form.costo) : undefined,
        notas: form.notas || undefined,
        nueva_fecha_instalacion: new Date(form.nueva_fecha).getTime(),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lc-modal-overlay" onClick={onClose}>
      <div className="lc-modal lc-modal--sm" onClick={e => e.stopPropagation()}>
        <div className="lc-modal__header">
          <h3>Registrar reemplazo — {component.nombre}</h3>
          <button className="lc-modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="lc-modal__body">
          <div className="lc-form-row">
            <label>Motivo</label>
            <select className="lc-input" value={form.motivo} onChange={e => set('motivo', e.target.value)}>
              <option value="preventivo">Preventivo</option>
              <option value="desgaste">Desgaste</option>
              <option value="falla">Falla</option>
            </select>
          </div>
          <div className="lc-form-row">
            <label>Nueva fecha instalación</label>
            <input type="date" className="lc-input" value={form.nueva_fecha} onChange={e => set('nueva_fecha', e.target.value)} />
          </div>
          <div className="lc-form-grid">
            <div className="lc-form-row">
              <label>Técnico</label>
              <input className="lc-input" value={form.tecnico} onChange={e => set('tecnico', e.target.value)} />
            </div>
            <div className="lc-form-row">
              <label>Costo ($)</label>
              <input type="number" className="lc-input" value={form.costo} onChange={e => set('costo', e.target.value)} />
            </div>
          </div>
          <div className="lc-form-row">
            <label>Notas</label>
            <textarea className="lc-input lc-textarea" value={form.notas} onChange={e => set('notas', e.target.value)} rows={2} />
          </div>
        </div>
        <div className="lc-modal__footer">
          <button className="lc-btn lc-btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="lc-btn lc-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Location Detail Panel
// ─────────────────────────────────────────────

function LocationDetail({ lugar, canWrite }) {
  const rawComponents = useQuery(api.fleetInventory.listLocationComponents, { lugar_id: lugar._id });
  const rawHistory = useQuery(api.fleetInventory.listLocationComponentsHistory, { lugar_id: lugar._id });
  const components = rawComponents ?? [];
  const history = rawHistory ?? [];
  const deleteMutation = useMutation(api.fleetInventory.deleteLocationComponent);

  const [showAdd, setShowAdd] = useState(false);
  const [editComp, setEditComp] = useState(null);
  const [replaceComp, setReplaceComp] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const alertCount = useMemo(() => {
    return components.filter(c => {
      if (c.estado === 'vencido') return true;
      const { pct } = calcDays(c.fecha_instalacion, c.vida_util_dias);
      return pct >= 0.8;
    }).length;
  }, [rawComponents]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (comp) => {
    if (!confirm(`Eliminar "${comp.nombre}"?`)) return;
    await deleteMutation({ id: comp._id });
  };

  return (
    <div className="lc-detail-panel">
      <div className="lc-detail-panel__header">
        <div className="lc-detail-panel__title">
          <MapPin size={17} />
          <span>{lugar.nombre}</span>
        </div>
        <div className="lc-detail-panel__meta">
          {lugar.descripcion && <span className="lc-detail-panel__desc">{lugar.descripcion}</span>}
          {alertCount > 0 && (
            <span className="lc-alert-pill">⚠ {alertCount} alerta{alertCount > 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      <div className="lc-section-header">
        <span>Componentes ({components.length})</span>
        <div className="lc-section-actions">
          <button className="lc-icon-btn" onClick={() => setShowHistory(h => !h)} title="Historial">
            <History size={15} />
          </button>
          {canWrite && (
            <button className="lc-btn lc-btn--sm lc-btn--primary" onClick={() => { setEditComp(null); setShowAdd(true); }}>
              <Plus size={14} /> Agregar
            </button>
          )}
        </div>
      </div>

      {!showHistory ? (
        <div className="lc-comp-list">
          {components.length === 0 ? (
            <div className="lc-empty">Sin componentes registrados para este lugar</div>
          ) : (
            components.map(comp => {
              const { dias, pct } = calcDays(comp.fecha_instalacion, comp.vida_util_dias);
              const color = comp.estado === 'vencido' ? 'var(--color-error)' : lifecycleColor(pct);
              const badge = estadoBadge(comp.estado);
              return (
                <div key={comp._id} className="lc-comp-row">
                  <div className="lc-comp-row__indicator" style={{ background: color }} />
                  <div className="lc-comp-row__info">
                    <div className="lc-comp-row__name">{comp.nombre}</div>
                    <div className="lc-comp-row__meta">
                      <span className="lc-tag">{comp.tipo}</span>
                      {comp.marca && <span className="lc-comp-row__brand">{comp.marca}</span>}
                    </div>
                  </div>
                  <div className="lc-comp-row__lifecycle">
                    <div className="lc-lifecycle-bar">
                      <div
                        className="lc-lifecycle-bar__fill"
                        style={{ width: `${pct * 100}%`, background: color }}
                      />
                    </div>
                    <div className="lc-lifecycle-label" style={{ color }}>
                      {dias} / {comp.vida_util_dias} días
                    </div>
                  </div>
                  <div className="lc-comp-row__estado">
                    <span className={`lc-badge ${badge.cls}`}>{badge.label}</span>
                  </div>
                  {canWrite && (
                    <div className="lc-comp-row__actions">
                      <button className="lc-icon-btn" title="Reemplazar" onClick={() => setReplaceComp(comp)}>
                        <RefreshCw size={14} />
                      </button>
                      <button className="lc-icon-btn" title="Editar" onClick={() => { setEditComp(comp); setShowAdd(true); }}>
                        <Edit size={14} />
                      </button>
                      <button className="lc-icon-btn lc-icon-btn--danger" title="Eliminar" onClick={() => handleDelete(comp)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="lc-history-list">
          <div className="lc-section-subheader">Historial de reemplazos</div>
          {history.length === 0 ? (
            <div className="lc-empty">Sin historial</div>
          ) : (
            history.map(h => (
              <div key={h._id} className="lc-history-row">
                <div className="lc-history-row__tipo">{h.tipo}</div>
                <div className="lc-history-row__meta">
                  {new Date(h.fecha_cambio).toLocaleDateString('es-PA')} ·{' '}
                  {h.dias_uso} días ·{' '}
                  <span className={`lc-badge lc-badge--${h.motivo === 'falla' ? 'error' : h.motivo === 'desgaste' ? 'warn' : 'success'}`}>{h.motivo}</span>
                  {h.tecnico && ` · ${h.tecnico}`}
                  {h.costo != null && ` · $${h.costo}`}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showAdd && (
        <ComponentFormModal
          lugarId={lugar._id}
          component={editComp}
          onClose={() => { setShowAdd(false); setEditComp(null); }}
          onSaved={() => { setShowAdd(false); setEditComp(null); }}
        />
      )}
      {replaceComp && (
        <ReplaceModal
          component={replaceComp}
          onClose={() => setReplaceComp(null)}
          onSaved={() => setReplaceComp(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main View
// ─────────────────────────────────────────────

const LocationComponentsView = ({ userRole = 'admin' }) => {
  const canWrite = userRole === 'admin' || userRole === 'super_admin';
  const [selectedLugarId, setSelectedLugarId] = useState(null);

  const rawLugares = useQuery(api.fumigaciones.listLugares, {});
  const lugares = rawLugares ?? [];
  const selectedLugar = useMemo(() => lugares.find(l => l._id === selectedLugarId), [rawLugares, selectedLugarId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="lc-root">
      <div className="lc-split">
        {/* Lugar list */}
        <div className="lc-list-panel">
          <div className="lc-list-panel__header">Lugares</div>
          {lugares.length === 0 ? (
            <div className="lc-empty">Sin lugares registrados</div>
          ) : (
            lugares.filter(l => l.activo !== false).map(l => (
              <div
                key={l._id}
                className={`lc-list-item ${l._id === selectedLugarId ? 'lc-list-item--active' : ''}`}
                onClick={() => setSelectedLugarId(l._id)}
              >
                <MapPin size={15} className="lc-list-item__icon" />
                <div className="lc-list-item__info">
                  <div className="lc-list-item__name">{l.nombre}</div>
                  {l.descripcion && <div className="lc-list-item__sub">{l.descripcion}</div>}
                </div>
                <ChevronRight size={13} />
              </div>
            ))
          )}
        </div>

        {/* Detail */}
        <div className="lc-detail-area">
          {selectedLugar ? (
            <LocationDetail lugar={selectedLugar} canWrite={canWrite} />
          ) : (
            <div className="lc-empty lc-empty--center">
              <MapPin size={32} className="lc-empty__icon" />
              <p>Selecciona un lugar para gestionar sus componentes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationComponentsView;
