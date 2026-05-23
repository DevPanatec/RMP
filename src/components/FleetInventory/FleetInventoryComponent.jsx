import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useFleet } from '../../context/FleetContext';
import {
  Truck, Package, Plus, ChevronRight, RefreshCw, Trash2, Edit,
  AlertTriangle, History, X, Layers
} from '../Icons';
import { renderDiagram, implementedTemplates } from '../../diagrams/factory';
import './FleetInventoryComponent.css';

// ─────────────────────────────────────────────────────────
// Lifecycle helpers
// ─────────────────────────────────────────────────────────

function calcLifecycle(comp, kmAcumulado) {
  const now = Date.now();
  const results = [];

  if (comp.vida_util_dias) {
    const dias = Math.floor((now - comp.fecha_instalacion) / 86400000);
    results.push({ label: `${dias} / ${comp.vida_util_dias} días`, pct: dias / comp.vida_util_dias });
  }

  if (comp.vida_util_km && comp.km_instalacion != null && kmAcumulado != null) {
    const km = kmAcumulado - comp.km_instalacion;
    results.push({ label: `${km.toFixed(0)} / ${comp.vida_util_km} km`, pct: km / comp.vida_util_km });
  }

  if (results.length === 0) return null;
  const worst = results.reduce((a, b) => (a.pct > b.pct ? a : b));
  return { ...worst, pct: Math.min(1, Math.max(0, worst.pct)) };
}

function lifecycleColor(pct) {
  if (pct == null) return 'var(--color-text-secondary)';
  if (pct < 0.5) return 'var(--color-success)';
  if (pct < 0.8) return 'var(--color-warning)';
  return 'var(--color-error)';
}

function estadoBadge(estado) {
  const map = {
    activo: { label: 'Activo', cls: 'badge--success' },
    reemplazado: { label: 'Reemplazado', cls: 'badge--info' },
    vencido: { label: 'Vencido', cls: 'badge--error' },
    dado_de_baja: { label: 'Baja', cls: 'badge--neutral' },
  };
  return map[estado] ?? { label: estado, cls: 'badge--neutral' };
}

// ─────────────────────────────────────────────────────────
// Motor de Diagramas — hotspot sobre imagen
// ─────────────────────────────────────────────────────────

// Zone matching: component.tipo coincide si contiene algún patrón (o viceversa)
function matchesZone(componentTipo, zonePatterns) {
  const tipo = (componentTipo ?? '').toLowerCase().replace(/[\s_-]/g, '');
  return zonePatterns.some(p => {
    const pat = p.toLowerCase().replace(/[\s_-]/g, '');
    return tipo.includes(pat) || pat.includes(tipo);
  });
}

function DiagramEngine({ vehicle, components, kmAcumulado, onZoneFilter, activeZone, setActiveZone }) {
  const resolution = useQuery(api.diagramEngine.resolveForVehicle, { vehiculo_id: vehicle._id });
  const [hoveredZone, setHoveredZone] = useState(null);

  if (resolution === undefined) {
    return <div className="diagram-loading">Cargando diagrama…</div>;
  }

  if (!resolution || resolution.fallback_level === 3) {
    return (
      <div className="diagram-fallback">
        <Layers size={20} />
        <span>Sin diagrama disponible para este tipo de equipo</span>
      </div>
    );
  }

  const { template, zones, fallback_level, equipment_class, code_template_params } = resolution;

  // Plan v6 — Si el equipment_class tiene code template TS implementado, usarlo
  const useCodeTemplate = equipment_class && implementedTemplates.includes(equipment_class);
  const codeRender = useCodeTemplate
    ? renderDiagram(equipment_class, code_template_params ?? {})
    : null;

  // Peor estado por zona (para coloreado)
  const zoneHealth = {};
  for (const zone of zones) {
    const zoneComps = components.filter(c => matchesZone(c.tipo, zone.tipo_patterns));
    if (zoneComps.length === 0) {
      zoneHealth[zone.system_key] = null;
    } else {
      zoneHealth[zone.system_key] = Math.max(...zoneComps.map(c => {
        if (c.estado === 'vencido') return 1.0;
        return calcLifecycle(c, kmAcumulado)?.pct ?? 0;
      }));
    }
  }

  const handleZoneClick = (zone) => {
    const key = zone.system_key;
    const next = activeZone === key ? null : key;
    setActiveZone(next);
    if (next) {
      onZoneFilter(components.filter(c => matchesZone(c.tipo, zone.tipo_patterns)));
    } else {
      onZoneFilter(null);
    }
  };

  const hoveredZoneDef = zones.find(z => z.system_key === hoveredZone);
  const compCountByZone = (zone) => components.filter(c => matchesZone(c.tipo, zone.tipo_patterns)).length;

  return (
    <div className="diagram-engine">
      {fallback_level === 2 && (
        <div className="diagram-generic-badge">Vista genérica — {template.label}</div>
      )}
      <div className="diagram-canvas">
        {codeRender ? (
          <div
            className="diagram-render"
            dangerouslySetInnerHTML={{ __html: codeRender.svg }}
          />
        ) : (
          <img
            src={template.render_path}
            alt={template.label}
            className="diagram-render"
            draggable={false}
          />
        )}
        {[...zones].sort((a, b) => a.display_order - b.display_order).map(zone => {
          const pct = zoneHealth[zone.system_key];
          const isActive = activeZone === zone.system_key;
          const healthClass = pct == null ? '' : pct >= 0.8 ? 'diagram-hotspot--danger' : pct >= 0.5 ? 'diagram-hotspot--warn' : 'diagram-hotspot--ok';
          const count = compCountByZone(zone);
          return (
            <div
              key={zone.system_key}
              className={`diagram-hotspot ${healthClass}${isActive ? ' diagram-hotspot--active' : ''}`}
              style={{ clipPath: `polygon(${zone.polygon_points})` }}
              onClick={() => handleZoneClick(zone)}
              onMouseEnter={() => setHoveredZone(zone.system_key)}
              onMouseLeave={() => setHoveredZone(null)}
              title={`${zone.nombre}${count > 0 ? ` (${count} componente${count > 1 ? 's' : ''})` : ' — sin componentes'}`}
            />
          );
        })}
        {hoveredZoneDef && (
          <div className="diagram-tooltip">
            {hoveredZoneDef.nombre}
            {compCountByZone(hoveredZoneDef) > 0 && (
              <span className="diagram-tooltip__count">{compCountByZone(hoveredZoneDef)}</span>
            )}
          </div>
        )}
      </div>
      {activeZone && (
        <div className="diagram-filter-bar">
          <span>Filtrando zona: <strong>{zones.find(z => z.system_key === activeZone)?.nombre}</strong></span>
          <button className="diagram-filter-bar__clear" onClick={() => { setActiveZone(null); onZoneFilter(null); }}>× Limpiar</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Component Form Modal
// ─────────────────────────────────────────────────────────

const POSICIONES = [
  'llanta_delantera_izq', 'llanta_delantera_der',
  'llanta_trasera_izq', 'llanta_trasera_der',
  'llanta_media_izq', 'llanta_media_der',
  'bateria', 'motor', 'frenos_delanteros', 'frenos_traseros',
  'cepillo_principal', 'cepillo_lateral_izq', 'cepillo_lateral_der',
  'deposito', 'bomba', 'compresor',
];

function ComponentFormModal({ vehiculoId, kmAcumulado, component, onClose, onSaved }) {
  const addMutation = useMutation(api.fleetInventory.addVehicleComponent);
  const updateMutation = useMutation(api.fleetInventory.updateVehicleComponent);
  const isEdit = !!component;

  const [form, setForm] = useState({
    nombre: component?.nombre ?? '',
    tipo: component?.tipo ?? '',
    posicion: component?.posicion ?? '',
    marca: component?.marca ?? '',
    numero_serie: component?.numero_serie ?? '',
    fecha_instalacion: component
      ? new Date(component.fecha_instalacion).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    km_instalacion: component?.km_instalacion ?? kmAcumulado ?? '',
    vida_util_km: component?.vida_util_km ?? '',
    vida_util_dias: component?.vida_util_dias ?? '',
    costo: component?.costo ?? '',
    notas: component?.notas ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.nombre || !form.tipo) return;
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre,
        tipo: form.tipo,
        posicion: form.posicion || undefined,
        marca: form.marca || undefined,
        numero_serie: form.numero_serie || undefined,
        fecha_instalacion: new Date(form.fecha_instalacion).getTime(),
        km_instalacion: form.km_instalacion !== '' ? Number(form.km_instalacion) : undefined,
        vida_util_km: form.vida_util_km !== '' ? Number(form.vida_util_km) : undefined,
        vida_util_dias: form.vida_util_dias !== '' ? Number(form.vida_util_dias) : undefined,
        costo: form.costo !== '' ? Number(form.costo) : undefined,
        notas: form.notas || undefined,
      };
      if (isEdit) {
        await updateMutation({ id: component._id, ...payload });
      } else {
        await addMutation({ vehiculo_id: vehiculoId, ...payload });
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fi-modal-overlay" onClick={onClose}>
      <div className="fi-modal" onClick={e => e.stopPropagation()}>
        <div className="fi-modal__header">
          <h3>{isEdit ? 'Editar componente' : 'Agregar componente'}</h3>
          <button className="fi-modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="fi-modal__body">
          <div className="fi-form-row">
            <label>Nombre *</label>
            <input className="fi-input" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="ej: Llanta delantera izq" />
          </div>
          <div className="fi-form-row">
            <label>Tipo *</label>
            <input className="fi-input" value={form.tipo} onChange={e => set('tipo', e.target.value)} placeholder="ej: llanta, bateria, cepillo" />
          </div>
          <div className="fi-form-row">
            <label>Posición en diagrama</label>
            <select className="fi-input" value={form.posicion} onChange={e => set('posicion', e.target.value)}>
              <option value="">Sin posición</option>
              {POSICIONES.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div className="fi-form-grid">
            <div className="fi-form-row">
              <label>Marca</label>
              <input className="fi-input" value={form.marca} onChange={e => set('marca', e.target.value)} />
            </div>
            <div className="fi-form-row">
              <label>N° Serie</label>
              <input className="fi-input" value={form.numero_serie} onChange={e => set('numero_serie', e.target.value)} />
            </div>
          </div>
          <div className="fi-form-row">
            <label>Fecha instalación *</label>
            <input type="date" className="fi-input" value={form.fecha_instalacion} onChange={e => set('fecha_instalacion', e.target.value)} />
          </div>
          <div className="fi-form-grid">
            <div className="fi-form-row">
              <label>Km al instalar</label>
              <input type="number" className="fi-input" value={form.km_instalacion} onChange={e => set('km_instalacion', e.target.value)} placeholder={kmAcumulado?.toFixed(0) ?? '0'} />
            </div>
            <div className="fi-form-row">
              <label>Vida útil (km)</label>
              <input type="number" className="fi-input" value={form.vida_util_km} onChange={e => set('vida_util_km', e.target.value)} placeholder="ej: 40000" />
            </div>
          </div>
          <div className="fi-form-grid">
            <div className="fi-form-row">
              <label>Vida útil (días)</label>
              <input type="number" className="fi-input" value={form.vida_util_dias} onChange={e => set('vida_util_dias', e.target.value)} placeholder="ej: 90" />
            </div>
            <div className="fi-form-row">
              <label>Costo ($)</label>
              <input type="number" className="fi-input" value={form.costo} onChange={e => set('costo', e.target.value)} />
            </div>
          </div>
          <div className="fi-form-row">
            <label>Notas</label>
            <textarea className="fi-input fi-textarea" value={form.notas} onChange={e => set('notas', e.target.value)} rows={2} />
          </div>
        </div>
        <div className="fi-modal__footer">
          <button className="fi-btn fi-btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="fi-btn fi-btn--primary" onClick={handleSave} disabled={saving || !form.nombre || !form.tipo}>
            {saving ? 'Guardando…' : isEdit ? 'Guardar' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Replace Modal
// ─────────────────────────────────────────────────────────

function ReplaceModal({ component, kmAcumulado, onClose, onSaved, isAsset }) {
  const vehicleReplace = useMutation(api.fleetInventory.replaceVehicleComponent);
  const assetReplace = useMutation(api.fleetInventory.replaceFleetAssetComponent);

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
      const base = {
        motivo: form.motivo,
        tecnico: form.tecnico || undefined,
        costo: form.costo !== '' ? Number(form.costo) : undefined,
        notas: form.notas || undefined,
        nueva_fecha_instalacion: new Date(form.nueva_fecha).getTime(),
      };
      if (isAsset) {
        await assetReplace({ componente_id: component._id, ...base });
      } else {
        await vehicleReplace({
          componente_id: component._id,
          nuevo_km_instalacion: kmAcumulado,
          ...base,
        });
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fi-modal-overlay" onClick={onClose}>
      <div className="fi-modal fi-modal--sm" onClick={e => e.stopPropagation()}>
        <div className="fi-modal__header">
          <h3>Registrar reemplazo — {component.nombre}</h3>
          <button className="fi-modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="fi-modal__body">
          <div className="fi-form-row">
            <label>Motivo</label>
            <select className="fi-input" value={form.motivo} onChange={e => set('motivo', e.target.value)}>
              <option value="preventivo">Preventivo</option>
              <option value="desgaste">Desgaste</option>
              <option value="falla">Falla</option>
            </select>
          </div>
          <div className="fi-form-row">
            <label>Nueva fecha instalación</label>
            <input type="date" className="fi-input" value={form.nueva_fecha} onChange={e => set('nueva_fecha', e.target.value)} />
          </div>
          <div className="fi-form-grid">
            <div className="fi-form-row">
              <label>Técnico</label>
              <input className="fi-input" value={form.tecnico} onChange={e => set('tecnico', e.target.value)} />
            </div>
            <div className="fi-form-row">
              <label>Costo ($)</label>
              <input type="number" className="fi-input" value={form.costo} onChange={e => set('costo', e.target.value)} />
            </div>
          </div>
          <div className="fi-form-row">
            <label>Notas</label>
            <textarea className="fi-input fi-textarea" value={form.notas} onChange={e => set('notas', e.target.value)} rows={2} />
          </div>
        </div>
        <div className="fi-modal__footer">
          <button className="fi-btn fi-btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="fi-btn fi-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Registrar reemplazo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Asset Form Modal
// ─────────────────────────────────────────────────────────

function AssetFormModal({ asset, onClose, onSaved }) {
  const addMutation = useMutation(api.fleetInventory.addFleetAsset);
  const updateMutation = useMutation(api.fleetInventory.updateFleetAsset);
  const isEdit = !!asset;

  const [form, setForm] = useState({
    nombre: asset?.nombre ?? '',
    tipo: asset?.tipo ?? '',
    descripcion: asset?.descripcion ?? '',
    fecha_adquisicion: asset
      ? new Date(asset.fecha_adquisicion).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    vida_util_dias: asset?.vida_util_dias ?? '',
    tiene_componentes: asset?.tiene_componentes ?? false,
    costo: asset?.costo ?? '',
    notas: asset?.notas ?? '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.nombre || !form.tipo) return;
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre,
        tipo: form.tipo,
        descripcion: form.descripcion || undefined,
        fecha_adquisicion: new Date(form.fecha_adquisicion).getTime(),
        vida_util_dias: form.vida_util_dias !== '' ? Number(form.vida_util_dias) : undefined,
        tiene_componentes: form.tiene_componentes,
        costo: form.costo !== '' ? Number(form.costo) : undefined,
        notas: form.notas || undefined,
      };
      if (isEdit) {
        await updateMutation({ id: asset._id, ...payload });
      } else {
        await addMutation(payload);
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fi-modal-overlay" onClick={onClose}>
      <div className="fi-modal" onClick={e => e.stopPropagation()}>
        <div className="fi-modal__header">
          <h3>{isEdit ? 'Editar activo' : 'Agregar activo'}</h3>
          <button className="fi-modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="fi-modal__body">
          <div className="fi-form-row">
            <label>Nombre *</label>
            <input className="fi-input" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="ej: Manguera Principal" />
          </div>
          <div className="fi-form-row">
            <label>Tipo *</label>
            <input className="fi-input" value={form.tipo} onChange={e => set('tipo', e.target.value)} placeholder="ej: manguera, lampara, generador" />
          </div>
          <div className="fi-form-row">
            <label>Descripción</label>
            <input className="fi-input" value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
          </div>
          <div className="fi-form-grid">
            <div className="fi-form-row">
              <label>Fecha adquisición</label>
              <input type="date" className="fi-input" value={form.fecha_adquisicion} onChange={e => set('fecha_adquisicion', e.target.value)} />
            </div>
            <div className="fi-form-row">
              <label>Vida útil (días)</label>
              <input type="number" className="fi-input" value={form.vida_util_dias} onChange={e => set('vida_util_dias', e.target.value)} placeholder="ej: 1000" />
            </div>
          </div>
          <div className="fi-form-grid">
            <div className="fi-form-row">
              <label>Costo ($)</label>
              <input type="number" className="fi-input" value={form.costo} onChange={e => set('costo', e.target.value)} />
            </div>
            <div className="fi-form-row fi-form-row--checkbox">
              <label>
                <input type="checkbox" checked={form.tiene_componentes} onChange={e => set('tiene_componentes', e.target.checked)} />
                Tiene sub-componentes
              </label>
            </div>
          </div>
          <div className="fi-form-row">
            <label>Notas</label>
            <textarea className="fi-input fi-textarea" value={form.notas} onChange={e => set('notas', e.target.value)} rows={2} />
          </div>
        </div>
        <div className="fi-modal__footer">
          <button className="fi-btn fi-btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="fi-btn fi-btn--primary" onClick={handleSave} disabled={saving || !form.nombre || !form.tipo}>
            {saving ? 'Guardando…' : isEdit ? 'Guardar' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Asset Component Sub-Modal (componentes de un activo)
// ─────────────────────────────────────────────────────────

function AssetComponentFormModal({ assetId, component, onClose, onSaved }) {
  const addMutation = useMutation(api.fleetInventory.addFleetAssetComponent);
  const updateMutation = useMutation(api.fleetInventory.updateFleetAssetComponent);
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
        vida_util_dias: Number(form.vida_util_dias),
        costo: form.costo !== '' ? Number(form.costo) : undefined,
        notas: form.notas || undefined,
      };
      if (isEdit) {
        await updateMutation({ id: component._id, ...payload });
      } else {
        await addMutation({
          asset_id: assetId,
          fecha_instalacion: new Date(form.fecha_instalacion).getTime(),
          ...payload,
        });
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fi-modal-overlay" onClick={onClose}>
      <div className="fi-modal fi-modal--sm" onClick={e => e.stopPropagation()}>
        <div className="fi-modal__header">
          <h3>{isEdit ? 'Editar sub-componente' : 'Agregar sub-componente'}</h3>
          <button className="fi-modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="fi-modal__body">
          <div className="fi-form-row">
            <label>Nombre *</label>
            <input className="fi-input" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
          </div>
          <div className="fi-form-row">
            <label>Tipo *</label>
            <input className="fi-input" value={form.tipo} onChange={e => set('tipo', e.target.value)} />
          </div>
          <div className="fi-form-grid">
            <div className="fi-form-row">
              <label>Marca</label>
              <input className="fi-input" value={form.marca} onChange={e => set('marca', e.target.value)} />
            </div>
            <div className="fi-form-row">
              <label>Vida útil (días) *</label>
              <input type="number" className="fi-input" value={form.vida_util_dias} onChange={e => set('vida_util_dias', e.target.value)} />
            </div>
          </div>
          <div className="fi-form-grid">
            <div className="fi-form-row">
              <label>Fecha instalación</label>
              <input type="date" className="fi-input" value={form.fecha_instalacion} onChange={e => set('fecha_instalacion', e.target.value)} />
            </div>
            <div className="fi-form-row">
              <label>Costo ($)</label>
              <input type="number" className="fi-input" value={form.costo} onChange={e => set('costo', e.target.value)} />
            </div>
          </div>
          <div className="fi-form-row">
            <label>Notas</label>
            <textarea className="fi-input fi-textarea" value={form.notas} onChange={e => set('notas', e.target.value)} rows={2} />
          </div>
        </div>
        <div className="fi-modal__footer">
          <button className="fi-btn fi-btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="fi-btn fi-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Components List (shared between vehicle and asset)
// ─────────────────────────────────────────────────────────

function ComponentRow({ comp, kmAcumulado, onReplace, onEdit, onDelete, isAsset }) {
  const lc = calcLifecycle(comp, isAsset ? undefined : kmAcumulado);
  const color = comp.estado === 'vencido' ? 'var(--color-error)' : lifecycleColor(lc?.pct);
  const badge = estadoBadge(comp.estado);
  const diasDesde = Math.floor((Date.now() - comp.fecha_instalacion) / 86400000);

  return (
    <div className="fi-comp-row">
      <div className="fi-comp-row__indicator" style={{ background: color }} />
      <div className="fi-comp-row__info">
        <div className="fi-comp-row__name">{comp.nombre}</div>
        <div className="fi-comp-row__meta">
          <span className="fi-tag">{comp.tipo}</span>
          {comp.posicion && <span className="fi-tag fi-tag--pos">{comp.posicion.replace(/_/g, ' ')}</span>}
          {comp.marca && <span className="fi-comp-row__brand">{comp.marca}</span>}
        </div>
      </div>
      <div className="fi-comp-row__lifecycle">
        <div className="fi-lifecycle-bar">
          <div
            className="fi-lifecycle-bar__fill"
            style={{ width: `${Math.min(100, (lc?.pct ?? 0) * 100)}%`, background: color }}
          />
        </div>
        <div className="fi-lifecycle-label" style={{ color }}>{lc?.label ?? `${diasDesde} días`}</div>
      </div>
      <div className="fi-comp-row__estado">
        <span className={`fi-badge ${badge.cls}`}>{badge.label}</span>
      </div>
      <div className="fi-comp-row__actions">
        <button className="fi-icon-btn" title="Registrar reemplazo" onClick={() => onReplace(comp)}>
          <RefreshCw size={15} />
        </button>
        <button className="fi-icon-btn" title="Editar" onClick={() => onEdit(comp)}>
          <Edit size={15} />
        </button>
        <button className="fi-icon-btn fi-icon-btn--danger" title="Eliminar" onClick={() => onDelete(comp)}>
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Vehicle Detail Panel
// ─────────────────────────────────────────────────────────

function VehicleDetailPanel({ vehicle, canWrite }) {
  const rawComponents = useQuery(api.fleetInventory.listVehicleComponents, { vehiculo_id: vehicle._id });
  const rawHistory = useQuery(api.fleetInventory.listVehicleComponentsHistory, { vehiculo_id: vehicle._id });
  const components = rawComponents ?? [];
  const history = rawHistory ?? [];
  const deleteMutation = useMutation(api.fleetInventory.deleteVehicleComponent);

  const [showAdd, setShowAdd] = useState(false);
  const [editComp, setEditComp] = useState(null);
  const [replaceComp, setReplaceComp] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [filteredComponents, setFilteredComponents] = useState(null);
  const [activeZone, setActiveZone] = useState(null);

  const kmAcumulado = vehicle.km_acumulado ?? 0;
  const displayComponents = filteredComponents ?? components;

  const alertCount = useMemo(() => {
    return components.filter(c => {
      const lc = calcLifecycle(c, kmAcumulado);
      return c.estado === 'vencido' || (lc && lc.pct >= 0.8);
    }).length;
  }, [rawComponents, kmAcumulado]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (comp) => {
    if (!confirm(`Eliminar "${comp.nombre}"?`)) return;
    await deleteMutation({ id: comp._id });
  };

  return (
    <div className="fi-detail-panel">
      <div className="fi-detail-panel__header">
        <div className="fi-detail-panel__title">
          <Truck size={18} />
          <span>{vehicle.nombre ?? vehicle.placa}</span>
          {vehicle.placa && vehicle.nombre && <span className="fi-detail-panel__sub">{vehicle.placa}</span>}
        </div>
        <div className="fi-detail-panel__stats">
          {kmAcumulado > 0 && (
            <div className="fi-stat-pill">
              <span className="fi-stat-pill__label">Odómetro GPS</span>
              <span className="fi-stat-pill__value">{kmAcumulado.toFixed(1)} km</span>
            </div>
          )}
          {alertCount > 0 && (
            <div className="fi-stat-pill fi-stat-pill--warn">
              <AlertTriangle size={13} />
              <span>{alertCount} alerta{alertCount > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* Motor de Diagramas */}
      <DiagramEngine
        vehicle={vehicle}
        components={components}
        kmAcumulado={kmAcumulado}
        onZoneFilter={setFilteredComponents}
        activeZone={activeZone}
        setActiveZone={setActiveZone}
      />

      {/* Components list */}
      <div className="fi-section-header">
        <span>
          Componentes
          {filteredComponents ? ` (${filteredComponents.length} / ${components.length})` : ` (${components.length})`}
        </span>
        <div className="fi-section-actions">
          <button className="fi-icon-btn" onClick={() => setShowHistory(h => !h)} title="Historial">
            <History size={15} />
          </button>
          {canWrite && (
            <button className="fi-btn fi-btn--sm fi-btn--primary" onClick={() => setShowAdd(true)}>
              <Plus size={14} /> Agregar
            </button>
          )}
        </div>
      </div>

      {!showHistory ? (
        <div className="fi-comp-list">
          {components.length === 0 ? (
            <div className="fi-empty">Sin componentes registrados</div>
          ) : displayComponents.length === 0 ? (
            <div className="fi-empty">Sin componentes en esta zona</div>
          ) : (
            displayComponents.map(c => (
              <ComponentRow
                key={c._id}
                comp={c}
                kmAcumulado={kmAcumulado}
                onReplace={canWrite ? setReplaceComp : () => {}}
                onEdit={canWrite ? setEditComp : () => {}}
                onDelete={canWrite ? handleDelete : () => {}}
                isAsset={false}
              />
            ))
          )}
        </div>
      ) : (
        <div className="fi-history-list">
          <div className="fi-section-subheader">Historial de reemplazos</div>
          {history.length === 0 ? (
            <div className="fi-empty">Sin historial</div>
          ) : (
            history.map(h => (
              <div key={h._id} className="fi-history-row">
                <div className="fi-history-row__tipo">{h.tipo}</div>
                <div className="fi-history-row__meta">
                  {new Date(h.fecha_cambio).toLocaleDateString('es-PA')} ·{' '}
                  {h.dias_uso} días uso ·{' '}
                  <span className={`fi-badge fi-badge--${h.motivo === 'falla' ? 'error' : h.motivo === 'desgaste' ? 'warn' : 'success'}`}>{h.motivo}</span>
                  {h.km_al_cambio != null && ` · ${h.km_al_cambio.toFixed(0)} km`}
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
          vehiculoId={vehicle._id}
          kmAcumulado={kmAcumulado}
          component={null}
          onClose={() => setShowAdd(false)}
          onSaved={() => setShowAdd(false)}
        />
      )}
      {editComp && (
        <ComponentFormModal
          vehiculoId={vehicle._id}
          kmAcumulado={kmAcumulado}
          component={editComp}
          onClose={() => setEditComp(null)}
          onSaved={() => setEditComp(null)}
        />
      )}
      {replaceComp && (
        <ReplaceModal
          component={replaceComp}
          kmAcumulado={kmAcumulado}
          isAsset={false}
          onClose={() => setReplaceComp(null)}
          onSaved={() => setReplaceComp(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Asset Detail Panel
// ─────────────────────────────────────────────────────────

function AssetDetailPanel({ asset, canWrite }) {
  const components = useQuery(api.fleetInventory.listFleetAssetComponents, { asset_id: asset._id }) ?? [];
  const history = useQuery(api.fleetInventory.listFleetAssetComponentsHistory, { asset_id: asset._id }) ?? [];
  const deleteMutation = useMutation(api.fleetInventory.deleteFleetAssetComponent);

  const [showAdd, setShowAdd] = useState(false);
  const [editComp, setEditComp] = useState(null);
  const [replaceComp, setReplaceComp] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const diasDesde = Math.floor((Date.now() - asset.fecha_adquisicion) / 86400000);
  const pct = asset.vida_util_dias ? diasDesde / asset.vida_util_dias : null;
  const color = pct == null ? 'var(--color-text-secondary)' : lifecycleColor(pct);

  const handleDelete = async (comp) => {
    if (!confirm(`Eliminar "${comp.nombre}"?`)) return;
    await deleteMutation({ id: comp._id });
  };

  return (
    <div className="fi-detail-panel">
      <div className="fi-detail-panel__header">
        <div className="fi-detail-panel__title">
          <Package size={18} />
          <span>{asset.nombre}</span>
          <span className="fi-detail-panel__sub">{asset.tipo}</span>
        </div>
        {asset.vida_util_dias && (
          <div className="fi-asset-lifecycle">
            <div className="fi-lifecycle-bar fi-lifecycle-bar--wide">
              <div
                className="fi-lifecycle-bar__fill"
                style={{ width: `${Math.min(100, (pct ?? 0) * 100)}%`, background: color }}
              />
            </div>
            <span className="fi-lifecycle-label" style={{ color }}>
              {diasDesde} / {asset.vida_util_dias} días
            </span>
          </div>
        )}
      </div>

      {asset.tiene_componentes && (
        <>
          <div className="fi-section-header">
            <span>Sub-componentes ({components.length})</span>
            <div className="fi-section-actions">
              <button className="fi-icon-btn" onClick={() => setShowHistory(h => !h)}>
                <History size={15} />
              </button>
              {canWrite && (
                <button className="fi-btn fi-btn--sm fi-btn--primary" onClick={() => setShowAdd(true)}>
                  <Plus size={14} /> Agregar
                </button>
              )}
            </div>
          </div>

          {!showHistory ? (
            <div className="fi-comp-list">
              {components.length === 0 ? (
                <div className="fi-empty">Sin sub-componentes</div>
              ) : (
                components.map(c => (
                  <ComponentRow
                    key={c._id}
                    comp={c}
                    kmAcumulado={undefined}
                    onReplace={canWrite ? setReplaceComp : () => {}}
                    onEdit={canWrite ? c => { setEditComp(c); setShowAdd(true); } : () => {}}
                    onDelete={canWrite ? handleDelete : () => {}}
                    isAsset={true}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="fi-history-list">
              {history.map(h => (
                <div key={h._id} className="fi-history-row">
                  <div className="fi-history-row__tipo">{h.tipo}</div>
                  <div className="fi-history-row__meta">
                    {new Date(h.fecha_cambio).toLocaleDateString('es-PA')} ·{' '}
                    {h.dias_uso} días ·{' '}
                    <span className={`fi-badge fi-badge--${h.motivo === 'falla' ? 'error' : 'success'}`}>{h.motivo}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!asset.tiene_componentes && (
        <div className="fi-asset-nodesc">
          Este activo no tiene sub-componentes. El activo completo se trackea como unidad.
          {canWrite && (
            <button className="fi-link" onClick={() => {}}>Activar sub-componentes</button>
          )}
        </div>
      )}

      {showAdd && (
        <AssetComponentFormModal
          assetId={asset._id}
          component={editComp}
          onClose={() => { setShowAdd(false); setEditComp(null); }}
          onSaved={() => { setShowAdd(false); setEditComp(null); }}
        />
      )}
      {replaceComp && (
        <ReplaceModal
          component={replaceComp}
          kmAcumulado={undefined}
          isAsset={true}
          onClose={() => setReplaceComp(null)}
          onSaved={() => setReplaceComp(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────

const FleetInventoryComponent = ({ userRole = 'admin' }) => {
  const canWrite = userRole === 'admin' || userRole === 'super_admin';
  const [subTab, setSubTab] = useState('vehiculos');
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editAsset, setEditAsset] = useState(null);

  const { vehicles } = useFleet();
  const rawAssets = useQuery(api.fleetInventory.listFleetAssets, {});
  const assets = rawAssets ?? [];
  const deleteAsset = useMutation(api.fleetInventory.deleteFleetAsset);

  const selectedVehicle = useMemo(() => vehicles?.find(v => v._id === selectedVehicleId), [vehicles, selectedVehicleId]);
  const selectedAsset = useMemo(() => assets.find(a => a._id === selectedAssetId), [rawAssets, selectedAssetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteAsset = async (asset) => {
    if (!confirm(`Eliminar activo "${asset.nombre}"?`)) return;
    if (selectedAssetId === asset._id) setSelectedAssetId(null);
    await deleteAsset({ id: asset._id });
  };

  return (
    <div className="fi-root">
      {/* Sub-tab bar */}
      <div className="fi-subtabs">
        <button
          className={`fi-subtab ${subTab === 'vehiculos' ? 'fi-subtab--active' : ''}`}
          onClick={() => setSubTab('vehiculos')}
        >
          <Truck size={15} /> Vehículos y Máquinas
        </button>
        <button
          className={`fi-subtab ${subTab === 'activos' ? 'fi-subtab--active' : ''}`}
          onClick={() => setSubTab('activos')}
        >
          <Package size={15} /> Activos Standalone
        </button>
      </div>

      {/* ── VEHÍCULOS TAB ── */}
      {subTab === 'vehiculos' && (
        <div className="fi-split">
          {/* Vehicle list */}
          <div className="fi-list-panel">
            <div className="fi-list-panel__header">Flota</div>
            {!vehicles || vehicles.length === 0 ? (
              <div className="fi-empty">Sin vehículos registrados</div>
            ) : (
              vehicles.map(v => {
                const isSelected = v._id === selectedVehicleId;
                return (
                  <div
                    key={v._id}
                    className={`fi-list-item ${isSelected ? 'fi-list-item--active' : ''}`}
                    onClick={() => setSelectedVehicleId(v._id)}
                  >
                    <div className="fi-list-item__icon">
                      <Truck size={16} />
                    </div>
                    <div className="fi-list-item__info">
                      <div className="fi-list-item__name">{v.nombre ?? v.placa}</div>
                      <div className="fi-list-item__sub">
                        {v.tipo_vehiculo ?? v.tipo_servicio}
                        {v.km_acumulado != null && ` · ${v.km_acumulado.toFixed(0)} km`}
                      </div>
                    </div>
                    <ChevronRight size={14} className="fi-list-item__arrow" />
                  </div>
                );
              })
            )}
          </div>

          {/* Vehicle detail */}
          <div className="fi-detail-area">
            {selectedVehicle ? (
              <VehicleDetailPanel vehicle={selectedVehicle} canWrite={canWrite} />
            ) : (
              <div className="fi-empty fi-empty--center">
                <Truck size={32} className="fi-empty__icon" />
                <p>Selecciona un vehículo para ver sus componentes</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ACTIVOS TAB ── */}
      {subTab === 'activos' && (
        <div className="fi-split">
          {/* Asset list */}
          <div className="fi-list-panel">
            <div className="fi-list-panel__header">
              Activos
              {canWrite && (
                <button className="fi-btn fi-btn--sm fi-btn--primary" onClick={() => { setEditAsset(null); setShowAssetModal(true); }}>
                  <Plus size={13} />
                </button>
              )}
            </div>
            {assets.length === 0 ? (
              <div className="fi-empty">Sin activos registrados</div>
            ) : (
              assets.map(a => {
                const diasDesde = Math.floor((Date.now() - a.fecha_adquisicion) / 86400000);
                const pct = a.vida_util_dias ? diasDesde / a.vida_util_dias : null;
                const color = pct == null ? 'var(--color-text-secondary)' : lifecycleColor(pct);
                const isSelected = a._id === selectedAssetId;
                return (
                  <div
                    key={a._id}
                    className={`fi-list-item ${isSelected ? 'fi-list-item--active' : ''}`}
                    onClick={() => setSelectedAssetId(a._id)}
                  >
                    <div className="fi-list-item__dot" style={{ background: color }} />
                    <div className="fi-list-item__info">
                      <div className="fi-list-item__name">{a.nombre}</div>
                      <div className="fi-list-item__sub">
                        {a.tipo}
                        {a.vida_util_dias && ` · ${diasDesde}/${a.vida_util_dias} días`}
                      </div>
                    </div>
                    <div className="fi-list-item__right">
                      {canWrite && (
                        <>
                          <button className="fi-icon-btn" onClick={e => { e.stopPropagation(); setEditAsset(a); setShowAssetModal(true); }}><Edit size={13} /></button>
                          <button className="fi-icon-btn fi-icon-btn--danger" onClick={e => { e.stopPropagation(); handleDeleteAsset(a); }}><Trash2 size={13} /></button>
                        </>
                      )}
                      <ChevronRight size={14} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Asset detail */}
          <div className="fi-detail-area">
            {selectedAsset ? (
              <AssetDetailPanel asset={selectedAsset} canWrite={canWrite} />
            ) : (
              <div className="fi-empty fi-empty--center">
                <Package size={32} className="fi-empty__icon" />
                <p>Selecciona un activo para ver sus detalles</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showAssetModal && (
        <AssetFormModal
          asset={editAsset}
          onClose={() => { setShowAssetModal(false); setEditAsset(null); }}
          onSaved={() => { setShowAssetModal(false); setEditAsset(null); }}
        />
      )}
    </div>
  );
};

export default FleetInventoryComponent;
