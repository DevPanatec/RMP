import { useMemo } from 'react';
import { Truck, Sparkles, Bug, Wrench } from '../Icons';

const MS_DAY = 86_400_000;

const MODULES = [
  { id: 'rec', label: 'Rutas', Icon: Truck },
  { id: 'lim', label: 'Limpieza', Icon: Sparkles },
  { id: 'fum', label: 'Fumigación', Icon: Bug },
  { id: 'mto', label: 'Mantenimiento', Icon: Wrench },
];

const DAY_INITIAL = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

const pad2 = (n) => String(n).padStart(2, '0');
const dayKey = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const intensityLevel = (count) => {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
};

const CronogramaHeatmap = ({ summary, rangeStart, rangeEnd, activeModules, onCellClick }) => {
  const todayKey = dayKey(Date.now());

  const days = useMemo(() => {
    const arr = [];
    for (let ms = rangeStart; ms <= rangeEnd; ms += MS_DAY) {
      const d = new Date(ms);
      arr.push({
        ms,
        key: dayKey(ms),
        dayOfMonth: d.getDate(),
        dayOfWeek: d.getDay(),
        isToday: dayKey(ms) === todayKey,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      });
    }
    return arr;
  }, [rangeStart, rangeEnd, todayKey]);

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
      for (const d of days) {
        const cell = bucket.get(`${d.key}|${m.id}`);
        if (cell) sum += cell.total;
      }
      totals[m.id] = sum;
    }
    return totals;
  }, [visibleModules, days, bucket]);

  return (
    <div className="cronograma-heatmap-wrap">
      <div
        className="cronograma-heatmap"
        style={{ gridTemplateColumns: `170px repeat(${days.length}, minmax(30px, 1fr)) 72px` }}
      >
        <div className="cronograma-heatmap__corner" />
        {days.map((d) => (
          <div
            key={`dow-${d.key}`}
            className={`cronograma-heatmap__dowhead${d.isWeekend ? ' cronograma-heatmap__dowhead--weekend' : ''}`}
          >
            {DAY_INITIAL[d.dayOfWeek]}
          </div>
        ))}
        <div className="cronograma-heatmap__totalhead">Total</div>

        <div className="cronograma-heatmap__corner" />
        {days.map((d) => (
          <div
            key={`dom-${d.key}`}
            className={`cronograma-heatmap__domhead${d.isToday ? ' cronograma-heatmap__domhead--today' : ''}`}
          >
            {d.isToday && <span className="cronograma-heatmap__today-pulse" aria-hidden="true" />}
            <span className="cronograma-heatmap__domhead-num">{d.dayOfMonth}</span>
          </div>
        ))}
        <div className="cronograma-heatmap__totalhead" />

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
              {days.map((d, di) => {
                const cell = bucket.get(`${d.key}|${m.id}`);
                const total = cell?.total ?? 0;
                const level = intensityLevel(total);
                const hasOverdue = (cell?.byStatus.overdue ?? 0) > 0;
                const hasInProgress = (cell?.byStatus.in_progress ?? 0) > 0;
                const title = cell
                  ? `${m.label} · ${d.key}\nTotal: ${total}\n✓ ${cell.byStatus.completed}  ⏵ ${cell.byStatus.in_progress}  ◷ ${cell.byStatus.scheduled}  ⚠ ${cell.byStatus.overdue}`
                  : `${m.label} · ${d.key}\nSin actividad`;
                // Stagger fade-in: max ~600ms across grid
                const delay = Math.min(600, (mi * days.length + di) * 6);
                return (
                  <button
                    key={`${m.id}-${d.key}`}
                    type="button"
                    style={{ animationDelay: `${delay}ms` }}
                    className={[
                      'cronograma-heatmap__cell',
                      `cronograma-heatmap__cell--${m.id}`,
                      `cronograma-heatmap__cell--level-${level}`,
                      d.isToday ? 'cronograma-heatmap__cell--today' : '',
                      d.isWeekend ? 'cronograma-heatmap__cell--weekend' : '',
                      hasOverdue ? 'cronograma-heatmap__cell--has-overdue' : '',
                      hasInProgress ? 'cronograma-heatmap__cell--has-progress' : '',
                      total === 0 ? 'cronograma-heatmap__cell--empty' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => total > 0 && onCellClick(d.ms, m.id)}
                    disabled={total === 0}
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
          <p>Sin actividad registrada en este mes.</p>
          <span className="cronograma__empty-hint">Cambia de mes o activa más módulos.</span>
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

export default CronogramaHeatmap;
