import { useMemo } from 'react';
import { Truck, Sparkles, Bug, Wrench } from '../Icons';

const MODULES = [
  { id: 'rec', label: 'Rutas', Icon: Truck },
  { id: 'lim', label: 'Limpieza', Icon: Sparkles },
  { id: 'fum', label: 'Fumigación', Icon: Bug },
  { id: 'mto', label: 'Mantenimiento', Icon: Wrench },
];

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const pad2 = (n) => String(n).padStart(2, '0');

// For year: cells span larger counts. Recalibrate intensity for monthly totals.
const intensityLevelMonthly = (count) => {
  if (count <= 0) return 0;
  if (count <= 10) return 1;
  if (count <= 30) return 2;
  if (count <= 80) return 3;
  return 4;
};

const CronogramaYearHeatmap = ({ summary, year, activeModules, onMonthClick }) => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        index: i,
        key: `${year}-${pad2(i + 1)}`,
        label: MONTHS_SHORT[i],
        isCurrent: year === currentYear && i === currentMonth,
        isFuture: year > currentYear || (year === currentYear && i > currentMonth),
      })),
    [year, currentYear, currentMonth]
  );

  const bucket = useMemo(() => {
    const m = new Map();
    for (const s of summary) {
      m.set(`${s.day}|${s.module}`, s);
    }
    return m;
  }, [summary]);

  const visibleModules = MODULES.filter((m) => activeModules[m.id]);

  const moduleTotals = useMemo(() => {
    const totals = {};
    for (const m of visibleModules) {
      let sum = 0;
      for (const mo of months) {
        const cell = bucket.get(`${mo.key}|${m.id}`);
        if (cell) sum += cell.total;
      }
      totals[m.id] = sum;
    }
    return totals;
  }, [visibleModules, months, bucket]);

  return (
    <div className="cronograma-heatmap-wrap cronograma-heatmap-wrap--year">
      <div
        className="cronograma-heatmap cronograma-heatmap--year"
        style={{ gridTemplateColumns: `180px repeat(12, minmax(60px, 1fr)) 80px` }}
      >
        <div className="cronograma-heatmap__corner" />
        {months.map((mo) => (
          <div
            key={`mh-${mo.key}`}
            className={`cronograma-heatmap__monthhead${mo.isCurrent ? ' cronograma-heatmap__monthhead--current' : ''}`}
          >
            {mo.isCurrent && <span className="cronograma-heatmap__today-pulse" aria-hidden="true" />}
            <span className="cronograma-heatmap__monthhead-label">{mo.label}</span>
          </div>
        ))}
        <div className="cronograma-heatmap__totalhead">Total</div>

        {visibleModules.map((m, mi) => {
          const Icon = m.Icon;
          return (
            <div key={m.id} style={{ display: 'contents' }}>
              <div className={`cronograma-heatmap__rowhead cronograma-heatmap__rowhead--${m.id}`}>
                <span className={`cronograma-heatmap__rowicon cronograma-heatmap__rowicon--${m.id}`}>
                  <Icon size={14} strokeWidth={1.75} />
                </span>
                <span className="cronograma-heatmap__rowlabel">{m.label}</span>
              </div>
              {months.map((mo, ci) => {
                const cell = bucket.get(`${mo.key}|${m.id}`);
                const total = cell?.total ?? 0;
                const level = intensityLevelMonthly(total);
                const hasOverdue = (cell?.byStatus.overdue ?? 0) > 0;
                const hasInProgress = (cell?.byStatus.in_progress ?? 0) > 0;
                const title = cell
                  ? `${m.label} · ${mo.label} ${year}\nTotal: ${total}\n✓ ${cell.byStatus.completed}  ⏵ ${cell.byStatus.in_progress}  ◷ ${cell.byStatus.scheduled}  ⚠ ${cell.byStatus.overdue}\n\nClick para ver el mes`
                  : `${m.label} · ${mo.label} ${year}\nSin actividad`;
                const delay = Math.min(400, (mi * 12 + ci) * 12);
                return (
                  <button
                    key={`${m.id}-${mo.key}`}
                    type="button"
                    style={{ animationDelay: `${delay}ms` }}
                    className={[
                      'cronograma-heatmap__cell',
                      'cronograma-heatmap__cell--year',
                      `cronograma-heatmap__cell--${m.id}`,
                      `cronograma-heatmap__cell--level-${level}`,
                      mo.isCurrent ? 'cronograma-heatmap__cell--today' : '',
                      hasOverdue ? 'cronograma-heatmap__cell--has-overdue' : '',
                      hasInProgress ? 'cronograma-heatmap__cell--has-progress' : '',
                      total === 0 ? 'cronograma-heatmap__cell--empty' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => onMonthClick(year, mo.index)}
                    title={title}
                    aria-label={title}
                  >
                    {total > 0 && <span className="cronograma-heatmap__count">{total}</span>}
                  </button>
                );
              })}
              <div className={`cronograma-heatmap__rowtotal cronograma-heatmap__rowtotal--${m.id}`}>
                {moduleTotals[m.id] ?? 0}
              </div>
            </div>
          );
        })}
      </div>

      {visibleModules.length === 0 && (
        <div className="cronograma__empty">
          Activa al menos un módulo en los filtros pa' ver eventos.
        </div>
      )}

      {visibleModules.length > 0 && summary.length === 0 && (
        <div className="cronograma__empty">
          <Sparkles size={28} strokeWidth={1.5} className="cronograma__empty-icon" />
          <p>Sin actividad registrada en {year}.</p>
          <span className="cronograma__empty-hint">Cambia de año o activa más módulos.</span>
        </div>
      )}

      <div className="cronograma-heatmap__scale" aria-hidden="true">
        <span className="cronograma-heatmap__scale-label">Menos</span>
        {[0, 1, 2, 3, 4].map((lvl) => (
          <span
            key={lvl}
            className={`cronograma-heatmap__scale-swatch cronograma-heatmap__cell--level-${lvl}`}
          />
        ))}
        <span className="cronograma-heatmap__scale-label">Más</span>
      </div>
    </div>
  );
};

export default CronogramaYearHeatmap;
