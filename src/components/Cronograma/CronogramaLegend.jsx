const ITEMS = [
  { className: 'completed', label: 'Completado' },
  { className: 'in_progress', label: 'En progreso' },
  { className: 'scheduled', label: 'Programado' },
  { className: 'overdue', label: 'Atrasado' },
];

const CronogramaLegend = () => (
  <div className="cronograma-legend" aria-label="Leyenda de estados">
    {ITEMS.map((it) => (
      <div key={it.className} className="cronograma-legend__item">
        <span
          className={`cronograma-legend__swatch cronograma-event--${it.className}`}
          aria-hidden="true"
        />
        <span>{it.label}</span>
      </div>
    ))}
  </div>
);

export default CronogramaLegend;
