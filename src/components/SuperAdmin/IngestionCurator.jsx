import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { FileText, Check, X, AlertTriangle, ChevronDown } from '../Icons';
import './KbHealth.css';

// Lista ingestion_runs en estado "needs_review". Curator aprueba o rechaza.
// Confidence < 0.85 → human review (auto-approve si >= 0.85 — ya hecho en completeRun).
export default function IngestionCurator() {
  const runs = useQuery(api.ingestionMutations.listPendingReview, { limit: 50 });
  const approve = useMutation(api.ingestionMutations.approveRun);
  const reject = useMutation(api.ingestionMutations.rejectRun);
  const [busyId, setBusyId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const handleApprove = async (id) => {
    setBusyId(id);
    try { await approve({ run_id: id }); } catch (e) { alert(e.message); }
    finally { setBusyId(null); }
  };
  const handleReject = async (id) => {
    const reason = prompt('Razón del rechazo (opcional):') ?? '';
    setBusyId(id);
    try { await reject({ run_id: id, reason: reason || undefined }); } catch (e) { alert(e.message); }
    finally { setBusyId(null); }
  };

  return (
    <div className="kb-governance">
      <section className="kb-section">
        <header className="kb-section__header">
          <FileText size={18} />
          <h3>Ingestiones pendientes de revisión</h3>
          <span className="kb-badge">{Array.isArray(runs) ? runs.length : 0}</span>
        </header>
        {runs === undefined ? (
          <div className="kb-loading">Cargando…</div>
        ) : runs.length === 0 ? (
          <div className="kb-empty">
            <Check size={24} />
            <p>Sin runs pendientes. Todos los manuales fueron auto-aprobados (confidence ≥ 0.85) o procesados.</p>
          </div>
        ) : (
          <ul className="kb-list">
            {runs.map(r => {
              const expanded = expandedId === r._id;
              const conf = (r.confidence_score ?? 0) * 100;
              return (
                <li key={r._id} className={`kb-list-item ${conf < 50 ? 'kb-list-item--warn' : ''}`}>
                  <div className="kb-list-item__main">
                    <strong>Run {r._id.slice(-8)}</strong>
                    <small>
                      {r.vision_model ?? 'sin modelo'} · confianza {conf.toFixed(0)}%
                      {r.vision_cost_usd ? ` · $${r.vision_cost_usd.toFixed(4)}` : ''}
                    </small>
                    <span className="kb-list-item__date">
                      {new Date(r._creationTime).toLocaleString('es-PA')}
                    </span>
                    {expanded && r.extracted_structure && (
                      <pre style={{
                        marginTop: 8,
                        padding: 8,
                        background: 'var(--color-surface-secondary, #F8F9FA)',
                        borderRadius: 4,
                        fontSize: 11,
                        maxHeight: 240,
                        overflow: 'auto',
                      }}>
                        {JSON.stringify(r.extracted_structure, null, 2)}
                      </pre>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="kb-btn kb-btn--ghost" onClick={() => setExpandedId(expanded ? null : r._id)}>
                      <ChevronDown size={14} /> {expanded ? 'Ocultar' : 'Ver'}
                    </button>
                    <button
                      className="kb-btn kb-btn--primary"
                      onClick={() => handleApprove(r._id)}
                      disabled={busyId === r._id}
                    >
                      <Check size={14} /> Aprobar
                    </button>
                    <button
                      className="kb-btn kb-btn--ghost"
                      onClick={() => handleReject(r._id)}
                      disabled={busyId === r._id}
                    >
                      <X size={14} /> Rechazar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
