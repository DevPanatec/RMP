import { useMemo } from 'react';
import { Truck, Sparkles, Bug, Wrench } from '../Icons';
import CronogramaEvent from './CronogramaEvent';

const MS_DAY = 86_400_000;
const MAX_EVENTS_PER_CELL = 3;

const MODULES = [
  { id: 'rec', label: 'Rutas', Icon: Truck },
  { id: 'lim', label: 'Limpieza', Icon: Sparkles },
  { id: 'fum', label: 'Fumigación', Icon: Bug },
  { id: 'mto', label: 'Mantenimiento', Icon: Wrench },
];

const DAY_NAMES_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const sameDay = (a, b) => {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

const CronogramaGrid = ({ events, weekStart, activeModules, onCellClick }) => {
  const todayMs = Date.now();

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const ms = weekStart + i * MS_DAY;
        const d = new Date(ms);
        return {
          ms,
          dayName: DAY_NAMES_SHORT[i],
          dayNum: d.getDate(),
          isToday: sameDay(ms, todayMs),
        };
      }),
    [weekStart, todayMs]
  );

  const bucketed = useMemo(() => {
    const map = new Map();
    for (const e of events) {
      const eventDate = new Date(e.timestamp);
      eventDate.setHours(0, 0, 0, 0);
      const eventDayMs = eventDate.getTime();
      const dayIdx = Math.round((eventDayMs - weekStart) / MS_DAY);
      if (dayIdx < 0 || dayIdx > 6) continue;
      const key = `${e.module}-${dayIdx}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.timestamp - b.timestamp);
    }
    return map;
  }, [events, weekStart]);

  const visibleModules = MODULES.filter((m) => activeModules[m.id]);

  return (
    <div className="cronograma-grid-wrap">
      <div
        className="cronograma-grid"
        style={{ gridTemplateColumns: `160px repeat(7, minmax(0, 1fr))` }}
      >
        <div className="cronograma-grid__corner" />
        {days.map((d, i) => (
          <div
            key={i}
            className={`cronograma-grid__dayhead${d.isToday ? ' cronograma-grid__dayhead--today' : ''}`}
          >
            <span className="cronograma-grid__dayname">{d.dayName}</span>
            <span className="cronograma-grid__daynum">{d.dayNum}</span>
          </div>
        ))}

        {visibleModules.map((m) => {
          const Icon = m.Icon;
          return (
            <div key={m.id} style={{ display: 'contents' }}>
              <div className={`cronograma-grid__rowhead cronograma-grid__rowhead--${m.id}`}>
                <Icon size={14} strokeWidth={1.75} />
                <span>{m.label}</span>
              </div>
              {days.map((d, i) => {
                const cellEvents = bucketed.get(`${m.id}-${i}`) || [];
                const visible = cellEvents.slice(0, MAX_EVENTS_PER_CELL);
                const extraCount = cellEvents.length - visible.length;
                return (
                  <div
                    key={`${m.id}-${i}`}
                    className={`cronograma-grid__cell${d.isToday ? ' cronograma-grid__cell--today' : ''}`}
                  >
                    {cellEvents.length === 0 ? (
                      <span className="cronograma-grid__empty" aria-hidden="true">·</span>
                    ) : (
                      <>
                        {visible.map((e) => (
                          <CronogramaEvent key={e.id} event={e} />
                        ))}
                        {extraCount > 0 && (
                          <button
                            type="button"
                            className={`cronograma-grid__more cronograma-grid__more--${m.id}`}
                            onClick={() => onCellClick && onCellClick(d.ms, m.id)}
                            title={`Ver los ${cellEvents.length} eventos`}
                          >
                            +{extraCount} más
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {visibleModules.length === 0 && (
        <div className="cronograma__empty">
          Activa al menos un módulo en los filtros pa' ver eventos.
        </div>
      )}

      {events.length === 0 && visibleModules.length > 0 && (
        <div className="cronograma__empty">
          Sin actividad registrada en esta semana.
        </div>
      )}
    </div>
  );
};

export default CronogramaGrid;
