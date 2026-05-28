import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { DollarSign, TrendingUp } from '../Icons';
import './KbHealth.css';

const WINDOWS = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
];

// SuperAdmin: gasto Claude API agregado de kb_audit_log.cost_usd.
export default function CostAnalytics() {
  const [days, setDays] = useState(30);
  const summary = useQuery(api.kbAudit.costSummary, { days });
  const auditRecent = useQuery(api.kbAudit.list, { limit: 25 });

  return (
    <div className="kb-cost">
      <section className="kb-section">
        <header className="kb-section__header">
          <DollarSign size={18} />
          <h3>Gasto Claude API</h3>
          <div className="kb-window-switcher">
            {WINDOWS.map(w => (
              <button
                key={w.days}
                type="button"
                className={`kb-window-btn ${days === w.days ? 'kb-window-btn--active' : ''}`}
                onClick={() => setDays(w.days)}
              >
                {w.label}
              </button>
            ))}
          </div>
        </header>
        {summary === undefined ? (
          <div className="kb-loading">Cargando…</div>
        ) : summary === null ? (
          <div className="kb-empty"><p>Sin permisos para consultar.</p></div>
        ) : (
          <>
            <div className="kb-stats">
              <div className="kb-stat kb-stat--big">
                <div className="kb-stat__value">${summary.total_usd.toFixed(2)}</div>
                <div className="kb-stat__label">Total {summary.window_days}d</div>
              </div>
              <div className="kb-stat">
                <div className="kb-stat__value">{summary.entries_count}</div>
                <div className="kb-stat__label">Eventos IA con costo</div>
              </div>
              {Object.entries(summary.by_source).map(([src, cost]) => (
                <div key={src} className="kb-stat kb-stat--info">
                  <div className="kb-stat__value">${cost.toFixed(2)}</div>
                  <div className="kb-stat__label">{src}</div>
                </div>
              ))}
            </div>

            {Object.keys(summary.by_day).length > 0 && (
              <details className="kb-details">
                <summary>Gasto por día</summary>
                <ul className="kb-list">
                  {Object.entries(summary.by_day)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([day, cost]) => (
                      <li key={day} className="kb-list-item">
                        <div className="kb-list-item__main">
                          <strong>{day}</strong>
                        </div>
                        <span className="kb-badge">${cost.toFixed(2)}</span>
                      </li>
                    ))}
                </ul>
              </details>
            )}
          </>
        )}
      </section>

      <section className="kb-section">
        <header className="kb-section__header">
          <TrendingUp size={18} />
          <h3>Audit log reciente</h3>
        </header>
        {auditRecent === undefined ? (
          <div className="kb-loading">Cargando…</div>
        ) : auditRecent.length === 0 ? (
          <div className="kb-empty"><p>Sin eventos registrados.</p></div>
        ) : (
          <ul className="kb-list">
            {auditRecent.map(a => (
              <li key={a._id} className={`kb-list-item ${a.rolled_back_at ? 'kb-list-item--rolled-back' : ''}`}>
                <div className="kb-list-item__main">
                  <strong>{a.event}</strong>
                  <small>
                    {a.entity_type} · {a.source}
                    {a.cost_usd ? ` · $${a.cost_usd.toFixed(4)}` : ''}
                    {a.confidence ? ` · conf ${(a.confidence * 100).toFixed(0)}%` : ''}
                    {a.rolled_back_at ? ' · REVERTIDO' : ''}
                  </small>
                  <span className="kb-list-item__date">
                    {new Date(a.timestamp).toLocaleString('es-PA')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
