const CronogramaSkeleton = ({ viewMode }) => {
  const cols = viewMode === 'month' ? 30 : viewMode === 'year' ? 12 : 7;
  const rows = 4;
  return (
    <div className="cronograma-skel" aria-busy="true" aria-label="Cargando cronograma">
      <div className="cronograma-skel__head">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="cronograma-skel__cell cronograma-skel__cell--head" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="cronograma-skel__row">
          <div className="cronograma-skel__rowhead" />
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="cronograma-skel__cell"
              style={{ animationDelay: `${(r * cols + c) * 8}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default CronogramaSkeleton;
