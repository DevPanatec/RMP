import { useMemo } from 'react';
import { CheckCircle, Clock, AlertOctagon, Activity } from '../Icons';
import { useCountUp } from './useCountUp';

const computeTotals = (queryResult, moduleFilters) => {
  if (!queryResult) return { total: 0, completed: 0, scheduled: 0, in_progress: 0, overdue: 0 };
  const acc = { total: 0, completed: 0, scheduled: 0, in_progress: 0, overdue: 0 };

  if (queryResult.mode === 'summary') {
    for (const cell of queryResult.summary) {
      if (!moduleFilters[cell.module]) continue;
      acc.total += cell.total;
      acc.completed += cell.byStatus.completed;
      acc.scheduled += cell.byStatus.scheduled;
      acc.in_progress += cell.byStatus.in_progress;
      acc.overdue += cell.byStatus.overdue;
    }
  } else if (queryResult.mode === 'detail') {
    for (const e of queryResult.events) {
      if (!moduleFilters[e.module]) continue;
      acc.total += 1;
      acc[e.status] += 1;
    }
  }
  return acc;
};

const MetricCard = ({ icon: Icon, label, value, accent, suffix, sublabel, pulse }) => {
  const animated = useCountUp(value);
  return (
    <div className={`cronograma-metric cronograma-metric--${accent}${pulse ? ' cronograma-metric--pulse' : ''}`}>
      <div className="cronograma-metric__icon" aria-hidden="true">
        <Icon size={18} strokeWidth={1.75} />
      </div>
      <div className="cronograma-metric__body">
        <span className="cronograma-metric__label">{label}</span>
        <span className="cronograma-metric__value">
          {animated}
          {suffix && <small className="cronograma-metric__suffix">{suffix}</small>}
        </span>
        {sublabel && <span className="cronograma-metric__sublabel">{sublabel}</span>}
      </div>
    </div>
  );
};

const CronogramaMetrics = ({ queryResult, moduleFilters, loading }) => {
  const totals = useMemo(
    () => computeTotals(queryResult, moduleFilters),
    [queryResult, moduleFilters]
  );

  const completionPct = totals.total > 0
    ? Math.round((totals.completed / totals.total) * 100)
    : 0;

  if (loading) {
    return (
      <div className="cronograma-metrics" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="cronograma-metric cronograma-metric--skeleton" />
        ))}
      </div>
    );
  }

  return (
    <div className="cronograma-metrics">
      <MetricCard
        icon={Activity}
        label="Total eventos"
        value={totals.total}
        accent="primary"
        sublabel={`${totals.in_progress} en curso ahora`}
        pulse={totals.in_progress > 0}
      />
      <MetricCard
        icon={CheckCircle}
        label="Completados"
        value={totals.completed}
        accent="success"
        suffix={`/ ${completionPct}%`}
        sublabel={`de ${totals.total} totales`}
      />
      <MetricCard
        icon={Clock}
        label="Programados"
        value={totals.scheduled}
        accent="info"
        sublabel="próximas tareas"
      />
      <MetricCard
        icon={AlertOctagon}
        label="Atrasados"
        value={totals.overdue}
        accent={totals.overdue > 0 ? 'danger' : 'neutral'}
        sublabel={totals.overdue > 0 ? 'requiere atención' : 'todo al día'}
        pulse={totals.overdue > 0}
      />
    </div>
  );
};

export default CronogramaMetrics;
