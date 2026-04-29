import { useMemo } from 'react';
import { useSchedule } from '../../context/ScheduleContext';
import { useRoutes } from '../../context/RoutesContext';
import { Calendar, Clock, MapPin, Route as RouteIcon } from '../Icons';
import './UpcomingRoutes.css';

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const DAY_LABELS = {
  domingo: 'Dom', lunes: 'Lun', martes: 'Mar', miercoles: 'Mié',
  jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb'
};

const formatHora = (h) => {
  if (!h) return '—';
  const [hh, mm] = h.split(':');
  const hour = parseInt(hh, 10);
  const period = hour >= 12 ? 'p.m.' : 'a.m.';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${mm} ${period}`;
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const UpcomingRoutes = ({ limit = 6 }) => {
  const { assignments } = useSchedule();
  const { routes } = useRoutes();

  const upcoming = useMemo(() => {
    const today = todayStr();
    const now = new Date();
    const todayDay = DAY_NAMES[now.getDay()];

    const items = [];

    for (const a of assignments || []) {
      // Excluir canceladas y completadas
      if (a.estado === 'cancelada' || a.estado === 'completada') continue;
      // Excluir las que ya están en progreso (esas aparecen en el mapa)
      if (a.estado === 'en_progreso') continue;

      const ruta = routes.find((r) => (r._id || r.id) === a.ruta_id);
      if (!ruta) continue;

      const isRecurring = Array.isArray(a.dias_semana) && a.dias_semana.length > 0;
      const oneOffFecha = a.fecha_asignacion;

      let label = '';
      let sortKey = '';

      if (isRecurring) {
        // Próximo día de la semana que aplique a partir de hoy (incluyendo hoy)
        const remainingDays = [];
        for (let offset = 0; offset < 7; offset++) {
          const d = new Date(now);
          d.setDate(now.getDate() + offset);
          const dn = DAY_NAMES[d.getDay()];
          if (a.dias_semana.includes(dn)) {
            remainingDays.push({ day: dn, offset, date: d });
          }
        }
        if (remainingDays.length === 0) continue;
        const next = remainingDays[0];
        if (next.offset === 0) label = 'Hoy';
        else if (next.offset === 1) label = 'Mañana';
        else label = DAY_LABELS[next.day];
        const isoDate = `${next.date.getFullYear()}-${String(next.date.getMonth() + 1).padStart(2, '0')}-${String(next.date.getDate()).padStart(2, '0')}`;
        sortKey = `${isoDate}T${a.hora_inicio || '00:00'}`;
      } else {
        if (!oneOffFecha) continue;
        if (oneOffFecha < today) continue;
        if (oneOffFecha === today) label = 'Hoy';
        else if (oneOffFecha === todayStrPlus(1)) label = 'Mañana';
        else label = oneOffFecha;
        sortKey = `${oneOffFecha}T${a.hora_inicio || '00:00'}`;
      }

      items.push({
        id: a._id,
        rutaNombre: ruta.nombre,
        paradas: Array.isArray(ruta.paradas) ? ruta.paradas.length : 0,
        conductor: a.conductor_nombre,
        horaInicio: a.hora_inicio,
        horaFin: a.hora_fin,
        label,
        recurrente: isRecurring,
        diasSemana: a.dias_semana,
        sortKey,
      });
    }

    items.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    return items.slice(0, limit);
  }, [assignments, routes, limit]);

  if (upcoming.length === 0) {
    return (
      <div className="upcoming-routes">
        <div className="upcoming-routes-header">
          <Calendar size={16} />
          <h3>Próximas Rutas</h3>
        </div>
        <div className="upcoming-routes-empty">
          No hay rutas programadas próximas para tu proyecto.
        </div>
      </div>
    );
  }

  return (
    <div className="upcoming-routes">
      <div className="upcoming-routes-header">
        <Calendar size={16} />
        <h3>Próximas Rutas</h3>
        <span className="upcoming-routes-count">{upcoming.length}</span>
      </div>
      <ul className="upcoming-routes-list">
        {upcoming.map((u) => (
          <li key={u.id} className="upcoming-route-item">
            <div className="upcoming-route-when">
              <span className="upcoming-route-day">{u.label}</span>
              <span className="upcoming-route-time">
                <Clock size={12} /> {formatHora(u.horaInicio)} – {formatHora(u.horaFin)}
              </span>
            </div>
            <div className="upcoming-route-meta">
              <div className="upcoming-route-name">
                <RouteIcon size={12} /> {u.rutaNombre}
              </div>
              <div className="upcoming-route-sub">
                <MapPin size={11} /> {u.paradas} parada{u.paradas === 1 ? '' : 's'}
                {u.conductor ? ` · ${u.conductor}` : ''}
              </div>
              {u.recurrente && (
                <div className="upcoming-route-recurring">
                  Recurrente: {u.diasSemana.map((d) => DAY_LABELS[d]).join(' · ')}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

function todayStrPlus(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default UpcomingRoutes;
