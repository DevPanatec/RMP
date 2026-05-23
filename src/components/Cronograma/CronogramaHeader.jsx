import { ChevronLeft, ChevronRight, Truck, Sparkles, Bug, Wrench } from '../Icons';

const MODULES = [
  { id: 'rec', label: 'Rutas', Icon: Truck },
  { id: 'lim', label: 'Limpieza', Icon: Sparkles },
  { id: 'fum', label: 'Fumigación', Icon: Bug },
  { id: 'mto', label: 'Mantenimiento', Icon: Wrench },
];

const VIEW_MODES = [
  { id: 'year', label: 'Año' },
  { id: 'month', label: 'Mes' },
  { id: 'week', label: 'Semana' },
];

const formatWeekRange = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d) =>
    d.toLocaleDateString('es-PA', { day: 'numeric', month: 'short' });
  const sameYear = s.getFullYear() === e.getFullYear();
  const year = sameYear ? s.getFullYear() : `${s.getFullYear()}–${e.getFullYear()}`;
  return `${fmt(s)} → ${fmt(e)} ${year}`;
};

const formatMonth = (anchorMs) => {
  const d = new Date(anchorMs);
  const label = d.toLocaleDateString('es-PA', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const formatYear = (anchorMs) => String(new Date(anchorMs).getFullYear());

const CronogramaHeader = ({
  viewMode,
  rangeStart,
  rangeEnd,
  anchorMs,
  moduleFilters,
  onPrev,
  onNext,
  onToday,
  onToggleModule,
  onViewModeChange,
}) => {
  let label;
  if (viewMode === 'year') label = formatYear(anchorMs);
  else if (viewMode === 'month') label = formatMonth(anchorMs);
  else label = formatWeekRange(rangeStart, rangeEnd);

  const ariaLabel = (kind) => {
    const action = kind === 'prev' ? 'anterior' : 'siguiente';
    if (viewMode === 'year') return `Año ${action}`;
    if (viewMode === 'month') return `Mes ${action}`;
    return `Semana ${action}`;
  };

  return (
    <div className="cronograma-header">
      <div className="cronograma-header__nav">
        <div
          className={`cronograma-segctrl cronograma-segctrl--${viewMode}`}
          role="tablist"
          aria-label="Modo de vista"
        >
          <span className="cronograma-segctrl__indicator" aria-hidden="true" />
          {VIEW_MODES.map((vm) => (
            <button
              key={vm.id}
              type="button"
              role="tab"
              aria-selected={viewMode === vm.id}
              className={`cronograma-segctrl__btn${viewMode === vm.id ? ' cronograma-segctrl__btn--active' : ''}`}
              onClick={() => onViewModeChange(vm.id)}
            >
              {vm.label}
            </button>
          ))}
        </div>

        <div className="cronograma-header__pager">
          <button
            type="button"
            className="cronograma-header__navbtn"
            onClick={onPrev}
            aria-label={ariaLabel('prev')}
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <span className="cronograma-header__range" key={label}>
            {label}
          </span>
          <button
            type="button"
            className="cronograma-header__navbtn"
            onClick={onNext}
            aria-label={ariaLabel('next')}
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>

        <button type="button" className="cronograma-header__today" onClick={onToday}>
          <span className="cronograma-header__today-dot" aria-hidden="true" />
          Hoy
        </button>
      </div>

      <div className="cronograma-header__filters" role="group" aria-label="Filtros por módulo">
        {MODULES.map((m) => {
          const active = !!moduleFilters[m.id];
          const Icon = m.Icon;
          return (
            <button
              key={m.id}
              type="button"
              className={`cronograma-chip cronograma-chip--${m.id}${active ? ' cronograma-chip--active' : ''}`}
              onClick={() => onToggleModule(m.id)}
              aria-pressed={active}
              title={`${active ? 'Ocultar' : 'Mostrar'} ${m.label}`}
            >
              <Icon size={13} strokeWidth={1.75} />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CronogramaHeader;
