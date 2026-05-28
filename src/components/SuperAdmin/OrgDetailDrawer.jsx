import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { X, RefreshCw, AlertTriangle, CheckCircle, Clock, Info } from '../../components/Icons';
import ProyectosComponent from '../Proyectos/ProyectosComponent';
import './OrgDetailDrawer.css';

// Safe JSON stringify para audit log values.
// El backend ya trunca a 5KB y envuelve grandes valores como
// { _truncated: true, _preview: "..." } — los renderizamos limpio.
function safeStringify(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object' && value !== null && value._truncated === true) {
    const preview = typeof value._preview === 'string' ? value._preview : '';
    return `(truncado) ${preview}`;
  }
  try {
    const s = JSON.stringify(value);
    if (s === undefined) return String(value);
    return s.length > 200 ? s.slice(0, 197) + '…' : s;
  } catch {
    return '[object]';
  }
}

const BYTES_PER_GB_DRAWER = 1024 ** 3;
function fmtBytesGB(bytes) {
  if (!bytes || bytes <= 0) return '0';
  return (bytes / BYTES_PER_GB_DRAWER).toFixed(2);
}

const ESCALAS = ['S', 'M', 'L', 'XL', 'XXL'];
const ESCALA_BASE_USD = { S: 299, M: 1199, L: 2499, XL: 4499, XXL: 8999 };

// Personal (empleados) ya no es módulo comprable — se incluye con cualquier módulo operacional.
const MODULOS_PRODUCCION = [
  { code: 'REC', name: 'Recolección', price: 500 },
  { code: 'FUM', name: 'Fumigación', price: 500 },
  { code: 'LIM', name: 'Limpieza', price: 400 },
  { code: 'MTO', name: 'Mantenimiento general', price: 400 },
  { code: 'INV', name: 'Inventario', price: 300 },
  { code: 'BI', name: 'Reportes avanzados', price: 600 },
  { code: 'ASI', name: 'Asistencia', price: 300 },
  { code: 'RRHH', name: 'RRHH completo', price: 500 },
];
const MODULOS_ROADMAP = [];

const BYTES_PER_GB = 1024 ** 3;

// Tope de seguridad para los inputs de caps custom (UX, paralelo al backend MAX_CAPS).
const CAP_MAX = {
  camiones: 10000,
  proyectos: 100000,
  usuarios: 10000,
  storage_gb: 10240,
};

function fmtUsd(n) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function fmtDate(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('es-PA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtDateTime(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('es-PA', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// YYYY-MM-DD → epoch ms anclado a UTC mediodía para evitar off-by-one-day
// entre zonas horarias en el audit log + cron de renovación.
function dateInputToEpochUTCNoon(raw) {
  if (!raw) return null;
  const ms = new Date(raw + 'T12:00:00Z').getTime();
  return Number.isFinite(ms) ? ms : null;
}

function epochToDateInput(ms) {
  if (!ms) return '';
  return new Date(ms).toISOString().slice(0, 10);
}

// ============================================
// ConfirmDialog — reemplaza window.confirm
// Soporta confirmación simple + input de notas opcional.
// ============================================
function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  requireNotas = false,
  notasLabel = 'Notas (obligatorio)',
  notasHint = null,
  onConfirm,
  onCancel,
}) {
  const [notas, setNotas] = useState('');
  const [err, setErr] = useState(null);
  const dialogRef = useRef(null);
  const confirmBtnRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    if (requireNotas) {
      const ta = dialogRef.current?.querySelector('textarea');
      ta?.focus();
    } else {
      confirmBtnRef.current?.focus();
    }
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, [requireNotas]);

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel();
    } else if (e.key === 'Tab') {
      // Focus trap básico
      const focusables = dialogRef.current?.querySelectorAll(
        'button, textarea, [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [onCancel]);

  const handleConfirm = () => {
    if (requireNotas && notas.trim().length === 0) {
      setErr('Notas son obligatorias para esta acción.');
      return;
    }
    onConfirm(notas.trim());
  };

  return (
    <div
      className="confirm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onKeyDown={handleKey}
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        className="confirm-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-title" className="confirm-dialog__title">{title}</h3>
        {message && <p className="confirm-dialog__body">{message}</p>}
        {requireNotas && (
          <div className="confirm-dialog__input-block">
            <label className="confirm-dialog__label" htmlFor="confirm-notas">{notasLabel}</label>
            <textarea
              id="confirm-notas"
              className="confirm-dialog__textarea"
              value={notas}
              onChange={(e) => { setNotas(e.target.value); setErr(null); }}
              placeholder="Justificación, ID de contrato, etc."
            />
            {notasHint && <span className="confirm-dialog__hint">{notasHint}</span>}
            {err && <span className="confirm-dialog__error">{err}</span>}
          </div>
        )}
        <div className="confirm-dialog__actions">
          <button className="btn btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button
            ref={confirmBtnRef}
            className={`btn ${destructive ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Parity check: detecta drift entre el mirror frontend (ESCALA_BASE_USD +
// MODULOS_*) y los valores reales del backend. Sin throw — log en consola para
// que un super_admin con devtools abierto vea inmediatamente que está mostrando
// precios stale. La fuente de verdad es el backend (convex/lib/*).
function checkPricingParity(backendConstants) {
  if (!backendConstants) return null;
  const mismatches = [];
  for (const [k, v] of Object.entries(ESCALA_BASE_USD)) {
    const bv = backendConstants.escala_base_usd?.[k];
    if (bv !== undefined && bv !== v) {
      mismatches.push(`escala ${k}: UI=${v} backend=${bv}`);
    }
  }
  const allModulosUI = [...MODULOS_PRODUCCION, ...MODULOS_ROADMAP];
  const byCode = new Map(backendConstants.modulos.map((m) => [m.code, m.price]));
  for (const m of allModulosUI) {
    const bv = byCode.get(m.code);
    if (bv !== undefined && bv !== m.price) {
      mismatches.push(`modulo ${m.code}: UI=${m.price} backend=${bv}`);
    }
  }
  if (mismatches.length > 0) {
    console.warn(
      '[PlataformaPanel] Drift de precios detectado entre frontend y backend:',
      mismatches.join(' | '),
    );
    return mismatches;
  }
  return null;
}

function OrgDetailDrawer({ orgId, onClose, onEditInfo }) {
  const [activeTab, setActiveTab] = useState('uso');
  const stats = useQuery(api.organizaciones.getOrgStats, { id: orgId });
  const planConstants = useQuery(api.organizaciones.getPlanConstants);

  // Parity check correr cada vez que cambien los constants del backend.
  const driftMismatches = checkPricingParity(planConstants);

  const setEscala = useMutation(api.organizaciones.setEscala);
  const toggleModulo = useMutation(api.organizaciones.toggleModulo);
  const setCustomCap = useMutation(api.organizaciones.setCustomCap);
  const setDiscount = useMutation(api.organizaciones.setDiscount);
  const setSetupStatus = useMutation(api.organizaciones.setSetupStatus);
  const setPlanFechas = useMutation(api.organizaciones.setPlanFechas);
  const setActive = useMutation(api.organizaciones.setActive);
  const recomputeStorage = useMutation(api.organizaciones.recomputeStorage);

  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lastDrift, setLastDrift] = useState(null);
  const [confirmState, setConfirmState] = useState(null); // { ...props }

  // Refs para focus management
  const drawerRef = useRef(null);
  const closeBtnRef = useRef(null);
  const openerFocused = useRef(null);

  // Esc cierra + focus trap dentro del drawer.
  // Cuando confirmState está activo, el drawer se vuelve inert: ConfirmDialog
  // tiene su propio focus trap y al cerrar restaura el foco al elemento previo
  // (botón disparador) ANTES de que este trap intente capturarlo.
  useEffect(() => {
    openerFocused.current = document.activeElement;
    closeBtnRef.current?.focus();
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (confirmState) return; // dejar que confirmation maneje
        onClose();
      } else if (e.key === 'Tab' && !confirmState) {
        const focusables = drawerRef.current?.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables || focusables.length === 0) return;
        // Filtrar elementos dentro de un dialog anidado — Tab debe quedarse dentro del confirm
        const visible = Array.from(focusables).filter((el) => !el.closest('.confirm-overlay, .confirm-dialog-overlay'));
        if (visible.length === 0) return;
        const first = visible[0];
        const last = visible[visible.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      openerFocused.current?.focus?.();
    };
  }, [onClose, confirmState]);

  // Drawer inert mientras hay un dialog anidado — bloquea Tab/click hacia atrás
  useEffect(() => {
    const el = drawerRef.current;
    if (!el) return;
    if (confirmState) {
      el.setAttribute('inert', '');
      el.setAttribute('aria-hidden', 'true');
    } else {
      el.removeAttribute('inert');
      el.removeAttribute('aria-hidden');
    }
  }, [confirmState]);

  if (stats === undefined) {
    return (
      <div className="drawer-overlay" onClick={onClose}>
        <div className="drawer" onClick={(e) => e.stopPropagation()}>
          <div className="drawer__loading">Cargando…</div>
        </div>
      </div>
    );
  }
  if (stats === null) return null;

  const { org, usage, audit_log, mrr_usd, modulos_usd, base_usd, escala_effective, modulos_effective } = stats;

  async function withFeedback(fn, successMsg) {
    setBusy(true);
    setFeedback(null);
    try {
      await fn();
      setFeedback({ type: 'success', msg: successMsg });
      setTimeout(() => setFeedback(null), 2500);
    } catch (e) {
      setFeedback({ type: 'error', msg: e?.message ?? 'Error' });
    } finally {
      setBusy(false);
    }
  }

  function openConfirm(props) {
    setConfirmState(props);
  }
  function closeConfirm() {
    setConfirmState(null);
  }

  function handleEscalaClick(e) {
    if (escala_effective === e) return;
    openConfirm({
      title: `Cambiar escala a ${e}`,
      message:
        `Escala actual: ${escala_effective} (${fmtUsd(ESCALA_BASE_USD[escala_effective])}/mes)\n` +
        `Nueva escala: ${e} (${fmtUsd(ESCALA_BASE_USD[e])}/mes)`,
      confirmLabel: 'Cambiar escala',
      onConfirm: () => {
        closeConfirm();
        withFeedback(() => setEscala({ id: orgId, escala: e }), `Escala cambiada a ${e}`);
      },
      onCancel: closeConfirm,
    });
  }

  function handleSetActiveClick() {
    const next = !org.activo;
    openConfirm({
      title: next ? 'Reactivar organización' : 'Suspender organización',
      message: `${next ? 'Reactivar' : 'Suspender'} la organización "${org.nombre}"?`,
      confirmLabel: next ? 'Reactivar' : 'Suspender',
      destructive: !next,
      onConfirm: () => {
        closeConfirm();
        withFeedback(
          () => setActive({ id: orgId, activo: next }),
          `Org ${next ? 'reactivada' : 'suspendida'}`
        );
      },
      onCancel: closeConfirm,
    });
  }

  function handleModuloToggle(m, isRoadmap) {
    const active = (modulos_effective || []).includes(m.code);
    if (isRoadmap && !active) {
      // Activación de roadmap requiere notas + (backend) descuento ≥30% o setup waived.
      openConfirm({
        title: `Activar módulo roadmap: ${m.name}`,
        message:
          `Este módulo está en roadmap (no construido). El backend exige descuento ≥30% ` +
          `o setup_status="waived" además de notas con la justificación comercial.\n\n` +
          `Org: descuento ${org.discount_pct ?? 0}%, setup ${org.setup_status ?? 'pendiente'}.`,
        confirmLabel: 'Activar módulo',
        requireNotas: true,
        notasLabel: 'Justificación comercial (obligatorio)',
        notasHint: 'Incluir ID de contrato o approval interno.',
        onConfirm: (notas) => {
          closeConfirm();
          withFeedback(
            () => toggleModulo({ id: orgId, codigo: m.code, activar: true, notas }),
            `${m.name} activado`
          );
        },
        onCancel: closeConfirm,
      });
      return;
    }
    withFeedback(
      () => toggleModulo({ id: orgId, codigo: m.code, activar: !active }),
      `${m.name} ${!active ? 'activado' : 'desactivado'}`
    );
  }

  return (
    <div
      className="drawer-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      <div
        ref={drawerRef}
        className="drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="drawer__header">
          <div>
            <h2 id="drawer-title">{org.nombre}</h2>
            <span className="drawer__slug">{org.slug}</span>
          </div>
          <div className="drawer__header-actions">
            {onEditInfo && (
              <button
                type="button"
                className="drawer__edit-info"
                onClick={onEditInfo}
                title="Editar nombre, slug y contactos"
              >
                Editar info
              </button>
            )}
            <button ref={closeBtnRef} className="drawer__close" onClick={onClose} aria-label="Cerrar (Esc)">
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="drawer__summary">
          <div className="drawer-kpi">
            <div className="drawer-kpi__label">Escala</div>
            <div className="drawer-kpi__value">{escala_effective}</div>
          </div>
          <div className="drawer-kpi">
            <div className="drawer-kpi__label">Base</div>
            <div className="drawer-kpi__value">{fmtUsd(base_usd)}</div>
          </div>
          <div className="drawer-kpi">
            <div className="drawer-kpi__label">+ Módulos</div>
            <div className="drawer-kpi__value">{fmtUsd(modulos_usd)}</div>
          </div>
          <div className="drawer-kpi">
            <div className="drawer-kpi__label">+ Overflow</div>
            <div className={`drawer-kpi__value ${usage.overflow_total_usd > 0 ? 'drawer-kpi__value--overflow' : ''}`}>
              {fmtUsd(usage.overflow_total_usd)}
            </div>
          </div>
          <div className="drawer-kpi drawer-kpi--accent">
            <div className="drawer-kpi__label">MRR total</div>
            <div className="drawer-kpi__value">{fmtUsd(mrr_usd)}</div>
          </div>
        </div>

        <nav className="drawer__tabs">
          {['uso', 'proyectos', 'plan', 'modulos', 'caps', 'fechas', 'audit'].map((t) => (
            <button
              key={t}
              className={`drawer__tab ${activeTab === t ? 'active' : ''}`}
              onClick={() => setActiveTab(t)}
            >
              {t === 'uso' && 'Uso'}
              {t === 'proyectos' && 'Proyectos'}
              {t === 'plan' && 'Plan'}
              {t === 'modulos' && 'Módulos'}
              {t === 'caps' && 'Caps custom'}
              {t === 'fechas' && 'Fechas / Setup'}
              {t === 'audit' && 'Audit log'}
            </button>
          ))}
        </nav>

        {driftMismatches && (
          <div className="drawer__feedback drawer__feedback--error">
            <AlertTriangle size={16} />
            <span>
              Drift de precios detectado ({driftMismatches.length}). UI puede estar mostrando valores stale —
              revisar consola para detalle y sincronizar <code>OrgDetailDrawer.jsx</code> con
              <code> convex/lib/limits.ts</code> + <code>convex/lib/modules.ts</code>.
            </span>
          </div>
        )}

        {feedback && (
          <div className={`drawer__feedback drawer__feedback--${feedback.type}`}>
            {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            <span>{feedback.msg}</span>
          </div>
        )}

        <div className="drawer__body">
          {activeTab === 'uso' && (
            <div className="drawer__section">
              <h3>Uso vs Límites</h3>
              <table className="usage-table">
                <thead>
                  <tr><th>Recurso</th><th>Actual</th><th>Cap</th><th>%</th><th>Overflow</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Camiones</td>
                    <td>{usage.counts.camiones}</td>
                    <td>{usage.caps.camiones === Infinity ? '∞' : usage.caps.camiones}</td>
                    <td>{usage.pct.camiones.toFixed(0)}%</td>
                    <td>{usage.overflow.camiones.extras > 0 ? `+${usage.overflow.camiones.extras} · ${fmtUsd(usage.overflow.camiones.total_usd)}` : '—'}</td>
                  </tr>
                  <tr>
                    <td>Proyectos</td>
                    <td>{usage.counts.proyectos}</td>
                    <td>{usage.caps.proyectos === Infinity ? '∞' : usage.caps.proyectos}</td>
                    <td>{usage.pct.proyectos.toFixed(0)}%</td>
                    <td>{usage.overflow.proyectos.extras > 0 ? `+${usage.overflow.proyectos.extras} · ${fmtUsd(usage.overflow.proyectos.total_usd)}` : '—'}</td>
                  </tr>
                  <tr>
                    <td>Usuarios</td>
                    <td>{usage.counts.usuarios}</td>
                    <td>{usage.caps.usuarios === Infinity ? '∞' : usage.caps.usuarios}</td>
                    <td>{usage.pct.usuarios.toFixed(0)}%</td>
                    <td>{usage.overflow.usuarios.extras > 0 ? `+${usage.overflow.usuarios.extras} · ${fmtUsd(usage.overflow.usuarios.total_usd)}` : '—'}</td>
                  </tr>
                  <tr>
                    <td>Storage</td>
                    <td>{(usage.counts.storage_bytes / BYTES_PER_GB).toFixed(2)} GB</td>
                    <td>{usage.caps.storage_gb === Infinity ? '∞' : `${usage.caps.storage_gb} GB`}</td>
                    <td>{usage.pct.storage.toFixed(0)}%</td>
                    <td>{usage.overflow.storage_gb_extras > 0 ? `+${usage.overflow.storage_gb_extras.toFixed(2)} GB` : '—'}</td>
                  </tr>
                </tbody>
              </table>
              <div className="drawer__section-footer">
                <span>
                  <Clock size={14} /> Último recompute storage: {fmtDateTime(org.storage_last_recompute)}
                </span>
                <button
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setFeedback(null);
                    try {
                      const r = await recomputeStorage({ id: orgId });
                      setLastDrift(r);
                      if (r.partial) {
                        setFeedback({
                          type: 'error',
                          msg:
                            `Recompute parcial — límite de paginación alcanzado. ` +
                            `Fotos contadas: cleaning=${r.photo_counts.cleaning}, fumi=${r.photo_counts.fumi}, mto=${r.photo_counts.mto}. ` +
                            `Storage NO actualizado. Re-correr o usar backfillStorageCounters con batchSize mayor.`,
                        });
                        setTimeout(() => setFeedback(null), 8000);
                      } else {
                        const driftGB = (r.drift / BYTES_PER_GB_DRAWER).toFixed(2);
                        const sign = r.drift >= 0 ? '+' : '';
                        setFeedback({
                          type: 'success',
                          msg: `Storage recalculado. Drift: ${sign}${driftGB} GB (${fmtBytesGB(r.before)} → ${fmtBytesGB(r.after)} GB)`,
                        });
                        setTimeout(() => setFeedback(null), 5000);
                      }
                    } catch (e) {
                      setFeedback({ type: 'error', msg: e?.message ?? 'Error' });
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <RefreshCw size={14} /> Recomputar storage
                </button>
              </div>
              {lastDrift && !lastDrift.partial && Math.abs(lastDrift.drift) > BYTES_PER_GB_DRAWER && (
                <div className="drawer__drift-warning">
                  <AlertTriangle size={14} aria-hidden="true" />
                  <span>
                    Drift detectado &gt; 1 GB. El counter delta tenía desincronización significativa.
                    Considerá revisar si hay mutations cascade que no decrementen.
                  </span>
                </div>
              )}
              {lastDrift && lastDrift.partial && (
                <div className="drawer__partial-warning">
                  <Info size={14} aria-hidden="true" />
                  <span>
                    Recompute parcial. El conteo se cortó por límite de paginación; el contador
                    no se actualizó para evitar persistir un valor incompleto.
                  </span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'plan' && (
            <div className="drawer__section">
              <h3>Escala</h3>
              <div className="escala-grid">
                {ESCALAS.map((e) => (
                  <button
                    key={e}
                    className={`escala-option ${escala_effective === e ? 'selected' : ''}`}
                    disabled={busy}
                    onClick={() => handleEscalaClick(e)}
                  >
                    <div className="escala-option__code">{e}</div>
                    <div className="escala-option__price">{fmtUsd(ESCALA_BASE_USD[e])}/mes</div>
                  </button>
                ))}
              </div>

              <h3 className="drawer__h-spaced">Descuento (%)</h3>
              <div className="inline-form">
                <input
                  type="number"
                  min={0}
                  max={15}
                  step={1}
                  defaultValue={org.discount_pct ?? 0}
                  onBlur={(e) => {
                    const raw = e.target.value.trim();
                    const pct = Number(raw);
                    if (raw === '' || isNaN(pct)) {
                      setFeedback({ type: 'error', msg: 'Descuento debe ser un número entre 0 y 15' });
                      e.target.value = String(org.discount_pct ?? 0);
                      return;
                    }
                    if (!Number.isInteger(pct)) {
                      setFeedback({ type: 'error', msg: 'Descuento debe ser entero' });
                      e.target.value = String(org.discount_pct ?? 0);
                      return;
                    }
                    if (pct < 0 || pct > 15) {
                      setFeedback({ type: 'error', msg: 'Descuento fuera de rango (0-15)' });
                      e.target.value = String(org.discount_pct ?? 0);
                      return;
                    }
                    if (pct === (org.discount_pct ?? 0)) return;
                    withFeedback(() => setDiscount({ id: orgId, pct }), `Descuento actualizado a ${pct}%`);
                  }}
                />
                <span className="hint">Máximo 15% (pilots, año 1)</span>
              </div>

              <h3 className="drawer__h-spaced">Estado</h3>
              <div className="inline-form">
                <button
                  className={`btn ${org.activo ? 'btn-danger' : 'btn-primary'}`}
                  disabled={busy}
                  onClick={handleSetActiveClick}
                >
                  {org.activo ? 'Suspender organización' : 'Reactivar organización'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'modulos' && (
            <div className="drawer__section">
              <h3>Módulos en Producción</h3>
              <p className="hint">Activar/desactivar oculta tabs en dashboards de la org y bloquea mutations server-side.</p>
              <div className="modulos-list">
                {MODULOS_PRODUCCION.map((m) => {
                  const active = (modulos_effective || []).includes(m.code);
                  return (
                    <div key={m.code} className="modulo-row">
                      <div className="modulo-row__info">
                        <span className="modulo-row__code">{m.code}</span>
                        <span className="modulo-row__name">{m.name}</span>
                        <span className="modulo-row__price">+{fmtUsd(m.price)}/mes</span>
                      </div>
                      <button
                        className={`toggle ${active ? 'toggle--on' : ''}`}
                        disabled={busy}
                        role="switch"
                        aria-checked={active}
                        aria-label={`${m.name} ${active ? 'activado' : 'desactivado'} — clic para ${active ? 'desactivar' : 'activar'}`}
                        onClick={() => handleModuloToggle(m, false)}
                      >
                        <span className="toggle__knob" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {MODULOS_ROADMAP.length > 0 && (
                <>
                  <h3 className="drawer__h-spaced">Roadmap (no construidos)</h3>
                  <p className="hint hint--roadmap-warning">
                    <AlertTriangle size={14} aria-hidden="true" />
                    <span>
                      Módulos roadmap se facturan pero <strong>no tienen UI construida</strong>.
                      Solo activar con contrato firmado (descuento ≥30% o setup waived) y notas con justificación comercial.
                      El usuario final no verá nuevas funcionalidades hasta que se implemente.
                    </span>
                  </p>
                  {(modulos_effective || []).some((c) => MODULOS_ROADMAP.find((m) => m.code === c)) && (
                    <div className="drawer__feedback drawer__feedback--error" style={{ marginBottom: 'var(--space-12)' }}>
                      <AlertTriangle size={16} />
                      <span>
                        <strong>Esta org tiene {(modulos_effective || []).filter((c) => MODULOS_ROADMAP.find((m) => m.code === c)).length} módulo(s) roadmap activo(s):</strong>{' '}
                        {(modulos_effective || []).filter((c) => MODULOS_ROADMAP.find((m) => m.code === c)).join(', ')} —
                        están facturando sin entregar valor UI. Verificar que el cliente esté al tanto.
                      </span>
                    </div>
                  )}
                  <div className="modulos-list">
                    {MODULOS_ROADMAP.map((m) => {
                      const active = (modulos_effective || []).includes(m.code);
                      return (
                        <div key={m.code} className="modulo-row modulo-row--roadmap">
                          <div className="modulo-row__info">
                            <span className="modulo-row__code">{m.code}</span>
                            <span className="modulo-row__name">{m.name}</span>
                            <span className="modulo-row__price">+{fmtUsd(m.price)}/mes</span>
                            <span className="badge badge-warning">Roadmap</span>
                          </div>
                          <button
                            className={`toggle ${active ? 'toggle--on' : ''}`}
                            disabled={busy}
                            role="switch"
                            aria-checked={active}
                            aria-label={`${m.name} (roadmap) ${active ? 'activado' : 'desactivado'} — requiere descuento ≥30% o setup waived`}
                            title="Roadmap — activar solo con descuento ≥30% o setup waived + notas obligatorias"
                            onClick={() => handleModuloToggle(m, true)}
                          >
                            <span className="toggle__knob" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'caps' && (
            <div className="drawer__section">
              <h3>Caps personalizados</h3>
              <p className="hint">Dejá vacío para usar el cap default de la escala. Override solo para casos puntuales.</p>
              <div className="caps-form">
                {['camiones', 'proyectos', 'usuarios', 'storage_gb'].map((key) => {
                  const current = (org.custom_caps || {})[key];
                  const defaultCap = usage.caps[key === 'storage_gb' ? 'storage_gb' : key];
                  const placeholder = `Default escala ${escala_effective}: ${defaultCap === Infinity ? '∞' : defaultCap}${key === 'storage_gb' ? ' GB' : ''}`;
                  return (
                    <div key={key} className="caps-form__row">
                      <label>{key === 'storage_gb' ? 'Storage (GB)' : key}</label>
                      <input
                        type="number"
                        min={0}
                        max={CAP_MAX[key]}
                        step={1}
                        defaultValue={current ?? ''}
                        placeholder={placeholder}
                        onBlur={(e) => {
                          const raw = e.target.value.trim();
                          const value = raw === '' ? undefined : Number(raw);
                          if (value !== undefined && (isNaN(value) || value < 0)) {
                            setFeedback({ type: 'error', msg: `Cap ${key} debe ser un número ≥ 0` });
                            e.target.value = current ?? '';
                            return;
                          }
                          if (value !== undefined && value > CAP_MAX[key]) {
                            setFeedback({ type: 'error', msg: `Cap ${key} excede el máximo (${CAP_MAX[key].toLocaleString()})` });
                            e.target.value = current ?? '';
                            return;
                          }
                          if ((current ?? null) === (value ?? null)) return;
                          withFeedback(
                            () => setCustomCap({ id: orgId, key, value }),
                            value === undefined ? `Cap ${key} reset a default` : `Cap ${key} = ${value}`
                          );
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'fechas' && (
            <div className="drawer__section">
              <h3>Setup fee</h3>
              <div className="inline-form">
                {['pendiente', 'pagado', 'waived'].map((s) => (
                  <button
                    key={s}
                    className={`btn-pill ${(org.setup_status ?? 'pendiente') === s ? 'active' : ''}`}
                    disabled={busy}
                    onClick={() => withFeedback(() => setSetupStatus({ id: orgId, status: s }), `Setup status: ${s}`)}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <h3 className="drawer__h-spaced">Fecha inicio plan</h3>
              <input
                type="date"
                defaultValue={epochToDateInput(org.fecha_inicio_plan)}
                onBlur={(e) => {
                  const ms = dateInputToEpochUTCNoon(e.target.value);
                  if (ms === null) return;
                  withFeedback(
                    () => setPlanFechas({ id: orgId, fecha_inicio_plan: ms }),
                    'Fecha inicio actualizada'
                  );
                }}
              />

              <h3 className="drawer__h-spaced--tight">Fecha renovación</h3>
              <input
                type="date"
                defaultValue={epochToDateInput(org.fecha_renovacion_plan)}
                onBlur={(e) => {
                  const ms = dateInputToEpochUTCNoon(e.target.value);
                  if (ms === null) return;
                  withFeedback(
                    () => setPlanFechas({ id: orgId, fecha_renovacion_plan: ms }),
                    'Fecha renovación actualizada'
                  );
                }}
              />

              <div className="drawer__section-footer">
                <span><Clock size={14} /> Plan inicio: {fmtDate(org.fecha_inicio_plan)}</span>
                <span><Clock size={14} /> Renovación: {fmtDate(org.fecha_renovacion_plan)}</span>
              </div>
            </div>
          )}

          {activeTab === 'proyectos' && (
            <div className="drawer__section drawer__section--proyectos">
              <ProyectosComponent orgIdOverride={orgId} embedded />
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="drawer__section">
              <h3>Audit log · últimos 50</h3>
              {audit_log.length === 0 ? (
                <p className="hint">Sin cambios registrados.</p>
              ) : (
                <table className="audit-table">
                  <thead>
                    <tr><th>Fecha</th><th>Acción</th><th>Campo</th><th>Antes</th><th>Después</th><th>Por</th></tr>
                  </thead>
                  <tbody>
                    {audit_log.map((entry) => (
                      <tr key={entry._id}>
                        <td>{fmtDateTime(entry.timestamp)}</td>
                        <td><code>{entry.action}</code></td>
                        <td>{entry.field ?? '—'}</td>
                        <td className="audit-table__val" title={typeof entry.before_value === 'string' ? entry.before_value : JSON.stringify(entry.before_value ?? '')}>
                          {safeStringify(entry.before_value)}
                        </td>
                        <td className="audit-table__val" title={typeof entry.after_value === 'string' ? entry.after_value : JSON.stringify(entry.after_value ?? '')}>
                          {safeStringify(entry.after_value)}
                        </td>
                        <td>{entry.changed_by_email ?? entry.changed_by_user_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
      {confirmState && <ConfirmDialog {...confirmState} />}
    </div>
  );
}

export default OrgDetailDrawer;
