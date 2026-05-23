import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Shield, Search, AlertTriangle, Users, Briefcase, Truck, HardDrive, X, Plus } from '../../components/Icons';
import OrgDetailDrawer from './OrgDetailDrawer';
import OrgFormModal from './OrgFormModal';
import { Skeleton } from '../UI';
import useInputDebounce from '../../hooks/useInputDebounce';
import './PlataformaPanel.css';

const BYTES_PER_GB = 1024 ** 3;
const ESCALA_COLORS = {
  S: 'var(--color-escala-s)',
  M: 'var(--color-escala-m)',
  L: 'var(--color-escala-l)',
  XL: 'var(--color-escala-xl)',
  XXL: 'var(--color-escala-xxl)',
};

function bytesToGB(bytes) {
  return (bytes / BYTES_PER_GB).toFixed(2);
}

function fmtUsd(n) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function colorForPct(pct) {
  if (pct >= 100) return 'var(--color-error)';
  if (pct >= 90) return 'var(--color-alert-critical)';
  if (pct >= 70) return 'var(--color-warning)';
  return 'var(--color-success)';
}

function UsageBar({ label, current, cap, pct, icon: Icon, suffix = '' }) {
  const isInfinity = cap === Infinity || cap > 1e10;
  const displayCap = isInfinity ? '∞' : cap.toLocaleString();
  const displayCurrent = typeof current === 'number' ? current.toLocaleString() : current;
  const safePct = isInfinity ? 0 : Math.min(pct, 100);
  const overflowPct = isInfinity ? 0 : Math.max(0, pct - 100);
  const color = colorForPct(pct);

  return (
    <div className="usage-bar">
      <div className="usage-bar__header">
        <span className="usage-bar__label">
          {Icon && <Icon size={14} strokeWidth={2} />}
          {label}
        </span>
        <span className="usage-bar__value">
          {displayCurrent}{suffix} <span className="usage-bar__cap">/ {displayCap}{suffix}</span>
        </span>
      </div>
      <div className="usage-bar__track">
        <div
          className="usage-bar__fill"
          style={{ width: `${safePct}%`, background: color }}
        />
        {overflowPct > 0 && (
          <div
            className="usage-bar__overflow"
            style={{ width: `${Math.min(overflowPct, 100)}%` }}
            title={`Overflow: +${overflowPct.toFixed(0)}%`}
          />
        )}
      </div>
    </div>
  );
}

function OrgCard({ org, onSelect }) {
  const escalaColor = ESCALA_COLORS[org.escala] || '#605E5C';
  const overflowUsd = org.usage?.overflow_total_usd ?? 0;
  const hasOverflow = overflowUsd > 0;
  const modulosCount = (org.modulos_activos || []).length;

  return (
    <button className="org-card" onClick={() => onSelect(org)}>
      <div className="org-card__header">
        <div className="org-card__title">
          <span className="org-card__name">{org.nombre}</span>
          {!org.activo && <span className="badge badge-error">Suspendida</span>}
        </div>
        <div className="org-card__plan">
          <span className="escala-pill" style={{ background: escalaColor }}>
            {org.escala}
          </span>
          <span className="mrr-pill">{fmtUsd(org.mrr_usd)}/mes</span>
        </div>
      </div>

      <div className="org-card__modulos">
        {(org.modulos_activos || []).map((m) => (
          <span key={m} className="modulo-chip">{m}</span>
        ))}
        {modulosCount === 0 && <span className="modulo-chip modulo-chip--empty">Sin módulos</span>}
      </div>

      <div className="org-card__usage">
        <UsageBar
          label="Camiones"
          icon={Truck}
          current={org.usage.counts.camiones}
          cap={org.usage.caps.camiones}
          pct={org.usage.pct.camiones}
        />
        <UsageBar
          label="Proyectos"
          icon={Briefcase}
          current={org.usage.counts.proyectos}
          cap={org.usage.caps.proyectos}
          pct={org.usage.pct.proyectos}
        />
        <UsageBar
          label="Usuarios"
          icon={Users}
          current={org.usage.counts.usuarios}
          cap={org.usage.caps.usuarios}
          pct={org.usage.pct.usuarios}
        />
        <UsageBar
          label="Storage"
          icon={HardDrive}
          current={bytesToGB(org.usage.counts.storage_bytes)}
          cap={org.usage.caps.storage_gb}
          pct={org.usage.pct.storage}
          suffix=" GB"
        />
      </div>

      {hasOverflow && (
        <div className="org-card__overflow-banner">
          <AlertTriangle size={14} strokeWidth={2} />
          <span>Overflow: {fmtUsd(overflowUsd)}/mes</span>
        </div>
      )}
    </button>
  );
}

function PlataformaPanel() {
  const orgs = useQuery(api.organizaciones.listWithStats);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useInputDebounce(searchQuery, 300);
  const [filterEscala, setFilterEscala] = useState('all');
  const [filterEstado, setFilterEstado] = useState('activas');
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);

  const filtered = useMemo(() => {
    if (!orgs) return [];
    let list = orgs;
    if (filterEstado === 'activas') list = list.filter((o) => o.activo);
    else if (filterEstado === 'suspendidas') list = list.filter((o) => !o.activo);
    if (filterEscala !== 'all') list = list.filter((o) => o.escala === filterEscala);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((o) =>
        o.nombre.toLowerCase().includes(q) ||
        (o.slug && o.slug.toLowerCase().includes(q))
      );
    }
    return list;
  }, [orgs, filterEstado, filterEscala, debouncedSearch]);

  const aggregates = useMemo(() => {
    if (!orgs) return { totalOrgs: 0, totalMrr: 0, totalOverflow: 0, orgsWithOverflow: 0 };
    return {
      totalOrgs: orgs.length,
      totalMrr: orgs.reduce((s, o) => s + (o.mrr_usd || 0), 0),
      totalOverflow: orgs.reduce((s, o) => s + (o.usage?.overflow_total_usd || 0), 0),
      orgsWithOverflow: orgs.filter((o) => (o.usage?.overflow_total_usd || 0) > 0).length,
    };
  }, [orgs]);

  if (orgs === undefined) {
    return (
      <div className="plataforma-panel">
        <header className="plataforma-panel__header">
          <div className="plataforma-panel__title">
            <Shield size={24} strokeWidth={1.5} />
            <h1>Plataforma — Administración de Planes</h1>
          </div>
          <Skeleton width="60%" height="14px" />
        </header>
        <section className="plataforma-panel__aggregates">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="agg-kpi">
              <Skeleton width="50%" height="11px" />
              <div style={{ marginTop: 'var(--space-8)' }}>
                <Skeleton width="70%" height="22px" />
              </div>
            </div>
          ))}
        </section>
        <section className="plataforma-panel__org-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="org-card">
              <Skeleton width="80%" height="16px" />
              <div style={{ marginTop: 'var(--space-12)' }}>
                <Skeleton width="100%" height="64px" />
              </div>
              <div style={{ marginTop: 'var(--space-8)' }}>
                <Skeleton width="40%" height="12px" />
              </div>
            </div>
          ))}
        </section>
      </div>
    );
  }

  const selectedOrg = selectedOrgId ? orgs.find((o) => o._id === selectedOrgId) : null;

  return (
    <div className="plataforma-panel">
      <header className="plataforma-panel__header">
        <div className="plataforma-panel__title">
          <Shield size={24} strokeWidth={1.5} />
          <h1>Plataforma — Administración de Planes</h1>
        </div>
        <p className="plataforma-panel__subtitle">
          Monitoreo + gestión de planes, módulos y consumo por organización.
        </p>
      </header>

      <div className="plataforma-panel__header-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={() => { setEditingOrg(null); setShowOrgForm(true); }}
        >
          <Plus size={16} strokeWidth={2} /> Nueva organización
        </button>
      </div>

      <section className="plataforma-panel__aggregates">
        <div className="agg-kpi">
          <div className="agg-kpi__label">Organizaciones</div>
          <div className="agg-kpi__value">{aggregates.totalOrgs}</div>
        </div>
        <div className="agg-kpi">
          <div className="agg-kpi__label">MRR total</div>
          <div className="agg-kpi__value">{fmtUsd(aggregates.totalMrr)}</div>
        </div>
        <div className="agg-kpi">
          <div className="agg-kpi__label">Overflow mes</div>
          <div className="agg-kpi__value" style={{ color: aggregates.totalOverflow > 0 ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>
            {fmtUsd(aggregates.totalOverflow)}
          </div>
        </div>
        <div className="agg-kpi">
          <div className="agg-kpi__label">Con overflow</div>
          <div className="agg-kpi__value">{aggregates.orgsWithOverflow}</div>
        </div>
      </section>

      <section className="plataforma-panel__toolbar">
        <div className="search-input">
          <Search size={16} strokeWidth={2} />
          <input
            type="text"
            placeholder="Buscar por nombre o slug…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Buscar organización"
          />
          {searchQuery && (
            <button
              type="button"
              className="search-input__clear"
              onClick={() => setSearchQuery('')}
              aria-label="Limpiar búsqueda"
              title="Limpiar"
            >
              <X size={14} strokeWidth={2} />
            </button>
          )}
        </div>
        <select value={filterEscala} onChange={(e) => setFilterEscala(e.target.value)}>
          <option value="all">Todas las escalas</option>
          <option value="S">S</option>
          <option value="M">M</option>
          <option value="L">L</option>
          <option value="XL">XL</option>
          <option value="XXL">XXL</option>
        </select>
        <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
          <option value="activas">Activas</option>
          <option value="suspendidas">Suspendidas</option>
          <option value="todas">Todas</option>
        </select>
      </section>

      {filtered.length === 0 ? (
        <div className="plataforma-panel__empty">
          {aggregates.totalOrgs === 0 ? (
            <>
              <p>Aún no hay organizaciones registradas.</p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => { setEditingOrg(null); setShowOrgForm(true); }}
                style={{ marginTop: 'var(--space-12)' }}
              >
                <Plus size={16} strokeWidth={2} /> Crear primera organización
              </button>
            </>
          ) : (
            <p>No hay organizaciones que coincidan con el filtro.</p>
          )}
        </div>
      ) : (
        <div className="plataforma-panel__grid">
          {filtered.map((o) => (
            <OrgCard key={o._id} org={o} onSelect={(org) => setSelectedOrgId(org._id)} />
          ))}
        </div>
      )}

      {selectedOrg && (
        <OrgDetailDrawer
          orgId={selectedOrg._id}
          onClose={() => setSelectedOrgId(null)}
          onEditInfo={() => { setEditingOrg(selectedOrg); setShowOrgForm(true); }}
        />
      )}

      {showOrgForm && (
        <OrgFormModal
          editing={editingOrg}
          onClose={() => { setShowOrgForm(false); setEditingOrg(null); }}
          onSaved={() => { setShowOrgForm(false); setEditingOrg(null); }}
        />
      )}
    </div>
  );
}

export default PlataformaPanel;
