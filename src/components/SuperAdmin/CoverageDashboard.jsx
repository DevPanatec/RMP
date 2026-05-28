import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Layers, TrendingUp, AlertTriangle } from '../Icons';
import './KbHealth.css';

// SuperAdmin: dashboard de cobertura del Motor de Diagramas.
// Nivel 1 = template_override existe (refinamiento específico de modelo).
// Nivel 2 = KB tiene model_year con params.
// Nivel 3 = genérico de clase (fallback).
export default function CoverageDashboard() {
  const snapshot = useQuery(api.kbIntegrity.latestCoverageSnapshot, {});
  const history = useQuery(api.kbIntegrity.coverageHistory, { days: 30 });

  if (snapshot === undefined) {
    return <div className="kb-loading">Cargando cobertura…</div>;
  }

  if (snapshot === null) {
    return (
      <div className="kb-empty">
        <Layers size={32} />
        <p>Sin snapshot disponible. Esperá próximo cron (cada 6h) o ejecuta manualmente.</p>
      </div>
    );
  }

  const { total_vehicles, level_1_count, level_2_count, level_3_count, coverage_pct, top_missing_models } = snapshot;

  return (
    <div className="kb-coverage">
      <section className="kb-section">
        <header className="kb-section__header">
          <TrendingUp size={18} />
          <h3>Cobertura actual</h3>
          <span className="kb-badge">{(coverage_pct * 100).toFixed(1)}%</span>
        </header>
        <div className="kb-stats">
          <div className="kb-stat">
            <div className="kb-stat__value">{total_vehicles}</div>
            <div className="kb-stat__label">Total vehículos</div>
          </div>
          <div className="kb-stat kb-stat--success">
            <div className="kb-stat__value">{level_1_count}</div>
            <div className="kb-stat__label">Nivel 1 — Override</div>
            <div className="kb-stat__pct">
              {total_vehicles > 0 ? ((level_1_count / total_vehicles) * 100).toFixed(0) : 0}%
            </div>
          </div>
          <div className="kb-stat kb-stat--info">
            <div className="kb-stat__value">{level_2_count}</div>
            <div className="kb-stat__label">Nivel 2 — KB Params</div>
            <div className="kb-stat__pct">
              {total_vehicles > 0 ? ((level_2_count / total_vehicles) * 100).toFixed(0) : 0}%
            </div>
          </div>
          <div className="kb-stat kb-stat--warn">
            <div className="kb-stat__value">{level_3_count}</div>
            <div className="kb-stat__label">Nivel 3 — Genérico</div>
            <div className="kb-stat__pct">
              {total_vehicles > 0 ? ((level_3_count / total_vehicles) * 100).toFixed(0) : 0}%
            </div>
          </div>
        </div>
        <small className="kb-timestamp">
          Última actualización: {new Date(snapshot.snapshot_at).toLocaleString('es-PA')}
        </small>
      </section>

      <section className="kb-section">
        <header className="kb-section__header">
          <AlertTriangle size={18} />
          <h3>Top modelos sin template (backlog priorizado)</h3>
        </header>
        {!top_missing_models || top_missing_models.length === 0 ? (
          <div className="kb-empty"><p>Sin modelos huérfanos.</p></div>
        ) : (
          <ul className="kb-list">
            {top_missing_models.map((m, i) => (
              <li key={`${m.make_name}-${m.model_name}-${i}`} className="kb-list-item">
                <div className="kb-list-item__main">
                  <strong>{m.make_name} {m.model_name}</strong>
                  <small>{m.count} vehículo{m.count > 1 ? 's' : ''} sin diagrama específico</small>
                </div>
                <span className="kb-badge kb-badge--warn">{m.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {Array.isArray(history) && history.length > 1 && (
        <section className="kb-section">
          <header className="kb-section__header">
            <TrendingUp size={18} />
            <h3>Historial 30 días</h3>
          </header>
          <ul className="kb-list">
            {history.slice(-10).reverse().map(h => (
              <li key={h._id} className="kb-list-item">
                <div className="kb-list-item__main">
                  <strong>{(h.coverage_pct * 100).toFixed(1)}%</strong>
                  <small>L1:{h.level_1_count} L2:{h.level_2_count} L3:{h.level_3_count} (total {h.total_vehicles})</small>
                </div>
                <span className="kb-list-item__date">
                  {new Date(h.snapshot_at).toLocaleString('es-PA')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
