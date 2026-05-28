import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Activity, DollarSign, AlertTriangle, Check, Clock, TrendingUp } from '../Icons';
import './KbHealth.css';

// SuperAdmin: estado del crawler queue + budget hoy + daily summary.
// Refresh auto vía Convex reactivity.
export default function QueueStatus() {
  const stats = useQuery(api.kbCrawlQueue.stats, {});
  const budget = useQuery(api.kbBudget.getTodayStatus, {});
  const daily = useQuery(api.kbDailySummary.last24h, {});

  return (
    <div className="kb-cost">
      {/* Daily summary (24h) */}
      <section className="kb-section">
        <header className="kb-section__header">
          <TrendingUp size={18} />
          <h3>Actividad últimas 24h</h3>
        </header>
        {daily === undefined ? (
          <div className="kb-loading">Cargando…</div>
        ) : daily === null ? (
          <div className="kb-empty"><p>Sin permisos.</p></div>
        ) : (
          <div className="kb-stats">
            <div className="kb-stat">
              <div className="kb-stat__value">{daily.crawler.tasks_completed}</div>
              <div className="kb-stat__label">Tasks completadas</div>
            </div>
            <div className="kb-stat kb-stat--success">
              <div className="kb-stat__value">{daily.kb_additions.sources}</div>
              <div className="kb-stat__label">KB sources nuevos</div>
            </div>
            <div className="kb-stat kb-stat--info">
              <div className="kb-stat__value">{daily.kb_additions.models}</div>
              <div className="kb-stat__label">Modelos nuevos</div>
            </div>
            <div className="kb-stat kb-stat--info">
              <div className="kb-stat__value">{daily.kb_additions.template_overrides}</div>
              <div className="kb-stat__label">Templates nuevos</div>
            </div>
            <div className="kb-stat kb-stat--warn">
              <div className="kb-stat__value">{daily.alerts.new_count}</div>
              <div className="kb-stat__label">Alerts nuevas</div>
            </div>
            <div className="kb-stat">
              <div className="kb-stat__value">${daily.total_ai_cost_usd.toFixed(4)}</div>
              <div className="kb-stat__label">Gasto IA 24h</div>
            </div>
          </div>
        )}
      </section>

      {/* Budget hoy */}
      <section className="kb-section">
        <header className="kb-section__header">
          <DollarSign size={18} />
          <h3>Budget de hoy</h3>
        </header>
        {budget === undefined ? (
          <div className="kb-loading">Cargando…</div>
        ) : budget === null ? (
          <div className="kb-empty"><p>Sin actividad hoy. Budget reset auto 00:00 UTC.</p></div>
        ) : (
          <div className="kb-stats">
            <div className="kb-stat kb-stat--big">
              <div className="kb-stat__value">${budget.total_usd_spent.toFixed(4)}</div>
              <div className="kb-stat__label">Gasto hoy</div>
              <div className="kb-stat__pct">
                Cap: ${budget.daily_cap_usd.toFixed(2)} ·
                {((budget.total_usd_spent / budget.daily_cap_usd) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="kb-stat">
              <div className="kb-stat__value">{budget.total_calls}</div>
              <div className="kb-stat__label">Total calls</div>
            </div>
            {budget.by_provider && Object.entries(budget.by_provider).map(([provider, stats]) => {
              const cap = budget.daily_call_caps?.[provider];
              const pct = cap ? ((stats.calls / cap) * 100).toFixed(0) : null;
              const exceeded = cap && stats.calls >= cap;
              return (
                <div
                  key={provider}
                  className={`kb-stat ${exceeded ? 'kb-stat--warn' : ''}`}
                >
                  <div className="kb-stat__value">{stats.calls}</div>
                  <div className="kb-stat__label">{provider}</div>
                  <div className="kb-stat__pct">
                    ${stats.usd.toFixed(4)}
                    {pct !== null && ` · ${pct}% cap`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Queue stats */}
      <section className="kb-section">
        <header className="kb-section__header">
          <Activity size={18} />
          <h3>Crawler queue</h3>
        </header>
        {stats === undefined ? (
          <div className="kb-loading">Cargando…</div>
        ) : !stats || stats.total === 0 ? (
          <div className="kb-empty">
            <Clock size={24} />
            <p>Queue vacío. Próxima discovery: domingo 3am Panama.</p>
          </div>
        ) : (
          <>
            <div className="kb-stats">
              <div className="kb-stat kb-stat--big">
                <div className="kb-stat__value">{stats.total}</div>
                <div className="kb-stat__label">Total tasks</div>
              </div>
              {Object.entries(stats.byEstado).map(([estado, count]) => {
                const cls =
                  estado === 'done' ? 'kb-stat--success' :
                  estado === 'failed' || estado === 'skipped_budget' ? 'kb-stat--warn' :
                  estado === 'running' ? 'kb-stat--info' : '';
                return (
                  <div key={estado} className={`kb-stat ${cls}`}>
                    <div className="kb-stat__value">{count}</div>
                    <div className="kb-stat__label">{estado}</div>
                  </div>
                );
              })}
            </div>

            <details className="kb-details">
              <summary>Por provider</summary>
              <ul className="kb-list">
                {Object.entries(stats.byProvider)
                  .sort(([, a], [, b]) => b - a)
                  .map(([provider, count]) => (
                    <li key={provider} className="kb-list-item">
                      <div className="kb-list-item__main">
                        <strong>{provider}</strong>
                      </div>
                      <span className="kb-badge">{count}</span>
                    </li>
                  ))}
              </ul>
            </details>
          </>
        )}
      </section>

      <section className="kb-section">
        <header className="kb-section__header">
          <AlertTriangle size={18} />
          <h3>Cron schedule activo</h3>
        </header>
        <ul className="kb-list">
          <li className="kb-list-item">
            <div className="kb-list-item__main">
              <strong>Queue worker nocturnal</strong>
              <small>cada 30min, UTC 4-11 (11pm-6am Panama)</small>
            </div>
            <Check size={14} style={{ color: 'var(--color-success)' }} />
          </li>
          <li className="kb-list-item">
            <div className="kb-list-item__main">
              <strong>KB crawler daily</strong>
              <small>2am Panama: NHTSA + Wikidata + DOE AFDC + 5 OEM URLs</small>
            </div>
            <Check size={14} style={{ color: 'var(--color-success)' }} />
          </li>
          <li className="kb-list-item">
            <div className="kb-list-item__main">
              <strong>OEM brochures weekly full batch</strong>
              <small>domingo 5am Panama: hasta 100 URLs</small>
            </div>
            <Check size={14} style={{ color: 'var(--color-success)' }} />
          </li>
          <li className="kb-list-item">
            <div className="kb-list-item__main">
              <strong>Discovery weekly</strong>
              <small>domingo 3am Panama: encola OEM + NHTSA top + Wikidata orphans</small>
            </div>
            <Check size={14} style={{ color: 'var(--color-success)' }} />
          </li>
          <li className="kb-list-item">
            <div className="kb-list-item__main">
              <strong>Conflict detection</strong>
              <small>daily 5am Panama: detecta discrepancias cross-source</small>
            </div>
            <Check size={14} style={{ color: 'var(--color-success)' }} />
          </li>
          <li className="kb-list-item">
            <div className="kb-list-item__main">
              <strong>Coverage snapshot</strong>
              <small>cada 6h: % flota Nivel 1/2/3</small>
            </div>
            <Check size={14} style={{ color: 'var(--color-success)' }} />
          </li>
        </ul>
      </section>
    </div>
  );
}
