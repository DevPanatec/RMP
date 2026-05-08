import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  Truck, CheckCircle, AlertTriangle, Calendar, Filter, Plus, Settings,
  ChevronRight, Search, Download, Play, XCircle, User, Package, SprayCan, MapPin,
} from '../Icons';
import MapLibreComponent from '../Map/MapLibreComponent';
import { formatTime as formatTimeUtil } from '../../utils/dates';
import './MonitoringV2.css';

/**
 * MonitoringV2 — Mission Control (Variante A del handoff design_handoff_admin_monitoring/).
 * Layout: header + KPI row + Mapa hero (1fr) | Activity rail (320px) + Riesgos|Fumi + Tabla.
 *
 * Datos vienen de Convex en tiempo real:
 * - vehicles: useFleet (ya scoped por org en el caller)
 * - routeEvents: route_events.getRecent (rail actividad)
 * - displayAlerts: reportes_riesgo.list (riesgos)
 * - fumigaciones: fumigaciones.list (próximas)
 * - assignments: asignaciones.list (tabla del día)
 */
const MonitoringV2 = ({
  user,
  vehicles = [],
  routes = [],
  personnel = [],
  routeEvents = [],
  displayAlerts = [],
  geofences = [],
  allRouteProgress = [],
  selectedTruck,
  onViewLocationReports,
  onTabChange,
  onNewAssignment,
  onMaximizeMap,
  isViewer = false,
}) => {
  const [mapTab, setMapTab] = useState('mapa');
  const [railTab, setRailTab] = useState('todo');

  // === KPIs derivados de datos reales ===
  const activeVehicles = useMemo(
    () => vehicles.filter(v => v.estado === 'En ruta' || v.estado === 'en_ruta').length,
    [vehicles]
  );

  const todayISO = new Date().toISOString().split('T')[0];

  // Paradas hechas hoy + total esperado por rutas activas
  const paradasStats = useMemo(() => {
    const completadasHoy = routeEvents.filter(e => {
      if (e.tipo_evento !== 'parada_completada') return false;
      const t = e.timestamp;
      if (!t) return false;
      return String(t).startsWith(todayISO);
    }).length;
    const totalEsperado = routes.reduce((sum, r) => {
      const paradas = r.paradas || r.stops || [];
      return sum + (Array.isArray(paradas) ? paradas.length : 0);
    }, 0);
    const pct = totalEsperado > 0 ? Math.round((completadasHoy / totalEsperado) * 100) : 0;
    return { completadasHoy, totalEsperado, pct };
  }, [routeEvents, routes, todayISO]);

  const risksOpen = useMemo(() => {
    return displayAlerts.filter(a => {
      const e = (a.estado || '').toLowerCase();
      return e !== 'resuelto' && e !== 'cerrado';
    });
  }, [displayAlerts]);

  // Recolectado hoy: suma de bolsas de eventos parada_completada de hoy
  const recolectadoHoy = useMemo(() => {
    const sum = routeEvents.reduce((acc, e) => {
      if (e.tipo_evento !== 'parada_completada') return acc;
      if (!String(e.timestamp || '').startsWith(todayISO)) return acc;
      return acc + (Number(e.bolsas) || 0);
    }, 0);
    return sum;
  }, [routeEvents, todayISO]);

  // Fumigaciones próximas (esta semana)
  const fumigacionesRaw = useQuery(api.fumigaciones.list, {});
  const proximasFumigaciones = useMemo(() => {
    const list = fumigacionesRaw || [];
    const now = new Date();
    const inWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return list
      .filter(f => {
        if (f.estado === 'reportada') return false;
        const fecha = new Date(f.fecha + 'T00:00:00');
        return fecha >= new Date(now.toDateString()) && fecha <= inWeek;
      })
      .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
      .slice(0, 3);
  }, [fumigacionesRaw]);

  // Asignaciones del día con progreso
  const assignmentsQueryResult = useQuery(api.asignaciones.list, {});
  const todayAssignments = useMemo(() => {
    const assignmentsRaw = assignmentsQueryResult || [];
    const filtered = assignmentsRaw.filter(a => {
      // Recurring: dias_semana incluye día actual
      if (Array.isArray(a.dias_semana) && a.dias_semana.length > 0) {
        const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const today = dayNames[new Date().getDay()];
        if (a.dias_semana.includes(today)) return true;
      }
      return a.fecha_asignacion === todayISO || (a.fecha_inicio || '').startsWith(todayISO);
    });

    // Calcular progreso desde route_progress.paradas_completadas si hay
    return filtered.slice(0, 10).map(a => {
      const totalParadas = a.ruta?.paradas?.length || 0;
      const progress = allRouteProgress.find(rp => rp.asignacion_id === a._id);
      const completedCount = Array.isArray(progress?.paradas_completadas) ? progress.paradas_completadas.length : 0;
      const pct = totalParadas > 0 ? Math.round((completedCount / totalParadas) * 100) : 0;
      return {
        _id: a._id,
        ruta_codigo: a.ruta?.codigo || a.ruta?.nombre?.slice(0, 8) || 'R-???',
        conductor: a.conductor_nombre || 'Sin asignar',
        vehiculo: a.vehiculo_placa || a.vehiculo?.placa || '—',
        turno: (a.hora_inicio || '').startsWith('1') || (a.hora_inicio || '').startsWith('2') ? 'PM' : 'AM',
        estado: a.estado,
        progress: pct,
      };
    });
  }, [assignmentsQueryResult, allRouteProgress, todayISO]);

  // Última actualización GPS más reciente
  const lastUpdateMs = useMemo(() => {
    let mostRecent = 0;
    vehicles.forEach(v => {
      if (v.gps_ultima_actualizacion && v.gps_ultima_actualizacion > mostRecent) {
        mostRecent = v.gps_ultima_actualizacion;
      }
    });
    return mostRecent;
  }, [vehicles]);
  const lastUpdateLabel = useMemo(() => {
    if (!lastUpdateMs) return '—';
    const diff = Date.now() - lastUpdateMs;
    if (diff < 60_000) return `${Math.floor(diff / 1000)}s`;
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
    return `${Math.floor(diff / 3_600_000)}h`;
  }, [lastUpdateMs]);

  const fleetCounts = useMemo(() => {
    const ok = vehicles.filter(v => v.estado === 'En ruta' || v.estado === 'en_ruta').length;
    const warn = vehicles.filter(v => v.estado === 'en_mantenimiento').length;
    const idle = vehicles.length - ok - warn;
    return { ok, warn, idle: Math.max(0, idle) };
  }, [vehicles]);

  // Filtrar eventos rail por tab
  const railEvents = useMemo(() => {
    let evs = routeEvents.slice(0, 50);
    if (railTab === 'operativo') {
      evs = evs.filter(e => e.tipo_evento && e.tipo_evento !== 'riesgo_reportado');
    } else if (railTab === 'riesgos') {
      // riesgos no son route_events, mostrar displayAlerts como eventos
      evs = displayAlerts.slice(0, 30).map(r => ({
        _id: r._id || r.id,
        tipo_evento: 'riesgo_reportado',
        ruta_nombre: '',
        conductor_nombre: r.conductor_nombre || r.conductor || 'Sistema',
        vehiculo_placa: r.vehiculo_placa || r.camion || '',
        timestamp: r.fecha_reporte || r.fechaCreacion || new Date().toISOString(),
        detalles: r.titulo || r.descripcion,
        nivel_severidad: r.nivel_severidad || r.prioridad,
      }));
    }
    return evs;
  }, [routeEvents, railTab, displayAlerts]);

  const handleRecenterMap = () => {
    const v = vehicles.find(c => c.gps_latitud && c.gps_longitud);
    const lat = v?.gps_latitud || 8.983333;
    const lng = v?.gps_longitud || -79.516670;
    window.dispatchEvent(new CustomEvent('recenterMap', { detail: { lat, lng, zoom: 13 } }));
  };

  return (
    <div className="mv2">
      {/* Header */}
      <div className="mv2__head">
        <div>
          <div className="mv2__crumb">Operaciones / <b>Monitoreo</b></div>
          <h1 className="mv2__title">Monitoreo en tiempo real</h1>
          <p className="mv2__lede">
            <span className="mv2-live-dot" />
            {activeVehicles} vehículos activos · Última actualización hace <span className="mono">{lastUpdateLabel}</span>
          </p>
        </div>
        <div className="mv2__head-actions">
          <button className="mv2-btn" onClick={() => onTabChange?.('calendario')}>
            <Calendar size={14} /> Hoy
          </button>
          <button className="mv2-btn" title="Filtros">
            <Filter size={14} /> Filtros
          </button>
          {!isViewer && (
            <button className="mv2-btn mv2-btn--primary" onClick={onNewAssignment}>
              <Plus size={14} /> Nueva asignación
            </button>
          )}
        </div>
      </div>

      {/* KPI row */}
      <div className="mv2__kpi-row">
        <KPI
          tone="brand"
          icon={<Truck size={16} />}
          label="Vehículos activos"
          value={String(activeVehicles)}
          delta={vehicles.length > 0 ? `${vehicles.length} flota` : ''}
        />
        <KPI
          tone="ok"
          icon={<CheckCircle size={16} />}
          label="Paradas hechas"
          value={String(paradasStats.completadasHoy)}
          sub={paradasStats.totalEsperado > 0 ? `de ${paradasStats.totalEsperado} hoy` : 'sin rutas hoy'}
          delta={`${paradasStats.pct}%`}
        />
        <KPI
          tone="warn"
          icon={<AlertTriangle size={16} />}
          label="Riesgos abiertos"
          value={String(risksOpen.length)}
          delta={risksOpen.length === 0 ? 'sin alertas' : ''}
          trend={risksOpen.length === 0 ? 'down' : undefined}
        />
        <KPI
          tone="info"
          icon={<Package size={16} />}
          label="Bolsas hoy"
          value={String(recolectadoHoy)}
          sub="acumulado del día"
        />
      </div>

      {/* Hero: Mapa + Activity Rail */}
      <div className="mv2__hero">
        {/* Mapa */}
        <div className="mv2-card mv2-card--no-pad">
          <div className="mv2-map__head">
            <div className="mv2-map__head-left">
              <span className="mv2-map__title">Flota en operación</span>
              <span className="mv2-pill mv2-pill--ok"><span className="mv2-pill__dot" />{fleetCounts.ok} activos</span>
              {fleetCounts.warn > 0 && (
                <span className="mv2-pill mv2-pill--warn"><span className="mv2-pill__dot" />{fleetCounts.warn} alerta</span>
              )}
              {fleetCounts.idle > 0 && (
                <span className="mv2-pill mv2-pill--neutral">{fleetCounts.idle} inactivos</span>
              )}
            </div>
            <div className="mv2-map__head-right">
              <span className="mv2-map__updated">
                Última actualización <span className="mono">{lastUpdateLabel}</span>
              </span>
              <span className="mv2-map__divider" />
              <div className="mv2-map__tabs">
                <button
                  className={`mv2-map__tab ${mapTab === 'mapa' ? 'mv2-map__tab--active' : ''}`}
                  onClick={() => setMapTab('mapa')}
                >Mapa</button>
                <button
                  className={`mv2-map__tab ${mapTab === 'rutas' ? 'mv2-map__tab--active' : ''}`}
                  onClick={() => setMapTab('rutas')}
                >Rutas</button>
              </div>
              <button className="mv2-map__icon-chip" onClick={handleRecenterMap} title="Centrar mapa">
                <MapPin size={14} />
              </button>
              {onMaximizeMap && (
                <button className="mv2-map__icon-chip" onClick={onMaximizeMap} title="Maximizar">
                  <Settings size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="mv2-map__body">
            <MapLibreComponent
              key="mv2-map"
              camiones={vehicles}
              rutas={isViewer ? [] : routes}
              personnel={isViewer ? [] : personnel}
              geofences={isViewer ? [] : geofences}
              allRouteProgress={isViewer ? [] : allRouteProgress}
              userType={user?.tipo}
              showRealTime={true}
              selectedTruck={selectedTruck}
              onViewLocationReports={onViewLocationReports}
            />
          </div>
        </div>

        {/* Activity Rail */}
        <div className="mv2-card mv2-rail">
          <div className="mv2-rail__head">
            <div className="mv2-rail__head-top">
              <div className="mv2-rail__title-wrap">
                <span className="mv2-rail__title">Registro de actividad</span>
                <span className="mv2-pill mv2-pill--ok"><span className="mv2-pill__dot" />en vivo</span>
              </div>
              <button className="mv2-rail__link" onClick={() => onTabChange?.('reportes')}>
                Ver todo →
              </button>
            </div>
            <div className="mv2-rail__tabs">
              <button
                className={`mv2-rail__tab ${railTab === 'todo' ? 'mv2-rail__tab--active' : ''}`}
                onClick={() => setRailTab('todo')}
              >Todo</button>
              <button
                className={`mv2-rail__tab ${railTab === 'operativo' ? 'mv2-rail__tab--active' : ''}`}
                onClick={() => setRailTab('operativo')}
              >Operativo</button>
              <button
                className={`mv2-rail__tab ${railTab === 'riesgos' ? 'mv2-rail__tab--active' : ''}`}
                onClick={() => setRailTab('riesgos')}
              >Riesgos</button>
            </div>
          </div>
          <div className="mv2-rail__body">
            {railEvents.length === 0 ? (
              <div className="mv2-rail__empty">Sin eventos recientes</div>
            ) : (
              railEvents.map(ev => <EventRow key={ev._id} event={ev} />)
            )}
          </div>
          <div className="mv2-rail__foot">
            <span>Mostrando <b>{railEvents.length}</b> eventos recientes</span>
            <span className="mono">auto-scroll · ON</span>
          </div>
        </div>
      </div>

      {/* Riesgos + Fumigaciones */}
      <div className="mv2__row">
        <div className="mv2-card" style={{ padding: 16 }}>
          <div className="mv2-section__head">
            <span className="mv2-section__title">Riesgos abiertos</span>
            <button className="mv2-rail__link" onClick={() => onTabChange?.('riesgos')}>
              Ver todos →
            </button>
          </div>
          <div className="mv2-section__list">
            {risksOpen.length === 0 ? (
              <div className="mv2-section__empty">Sin riesgos abiertos</div>
            ) : (
              risksOpen.slice(0, 4).map(r => <RiskRow key={r._id || r.id} risk={r} />)
            )}
          </div>
        </div>

        <div className="mv2-card" style={{ padding: 16 }}>
          <div className="mv2-section__head">
            <span className="mv2-section__title">Próximas fumigaciones</span>
            <span className="mv2-pill mv2-pill--info"><span className="mv2-pill__dot" />Esta semana</span>
          </div>
          <div className="mv2-section__list">
            {proximasFumigaciones.length === 0 ? (
              <div className="mv2-section__empty">Sin fumigaciones programadas esta semana</div>
            ) : (
              proximasFumigaciones.map(f => <FumiRow key={f._id} fumi={f} />)
            )}
          </div>
        </div>
      </div>

      {/* Tabla asignaciones del día */}
      <div className="mv2-card mv2-table-card">
        <div className="mv2-table__head">
          <div className="mv2-table__title-wrap">
            <span className="mv2-table__title">Asignaciones de hoy</span>
            <span className="mv2-table__sub">
              {todayAssignments.length} registro{todayAssignments.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="mv2-btn" style={{ height: 28, fontSize: 12, padding: '6px 10px' }}>
              <Search size={12} /> Buscar
            </button>
            <button className="mv2-btn" style={{ height: 28, fontSize: 12, padding: '6px 10px' }}>
              <Download size={12} /> Exportar
            </button>
          </div>
        </div>
        <div className="mv2-table">
          {todayAssignments.length === 0 ? (
            <div className="mv2-table__empty">Sin asignaciones para hoy</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Ruta</th>
                  <th>Conductor</th>
                  <th>Vehículo</th>
                  <th>Turno</th>
                  <th>Estado</th>
                  <th>Progreso</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {todayAssignments.map(a => (
                  <tr key={a._id}>
                    <td><span className="mv2-table__route-id">{a.ruta_codigo}</span></td>
                    <td>
                      <div className="mv2-table__driver">
                        <span className="mv2-table__avatar">{getInitials(a.conductor)}</span>
                        <span>{a.conductor}</span>
                      </div>
                    </td>
                    <td className="mono">{a.vehiculo}</td>
                    <td>{a.turno}</td>
                    <td>
                      <span className={`mv2-pill ${estadoToTone(a.estado)}`}>
                        <span className="mv2-pill__dot" />{a.estado}
                      </span>
                    </td>
                    <td>
                      <div className="mv2-table__progress">
                        <div className="mv2-table__bar">
                          <div className="mv2-table__bar-fill" style={{ width: `${a.progress}%` }} />
                        </div>
                        <span className="mv2-table__pct">{a.progress}%</span>
                      </div>
                    </td>
                    <td><ChevronRight size={14} className="mv2-table__chev" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// === Sub-components ===

const KPI = ({ tone, icon, label, value, sub, delta, trend }) => (
  <div className={`mv2-kpi mv2-kpi--${tone}`}>
    <div className="mv2-kpi__top">
      <div className="mv2-kpi__chip">{icon}</div>
      {delta && (
        <span className={`mv2-kpi__delta ${trend === 'down' ? 'mv2-kpi__delta--down' : ''}`}>{delta}</span>
      )}
    </div>
    <div className="mv2-kpi__value">{value}</div>
    <div className="mv2-kpi__label">{label}</div>
    {sub && <div className="mv2-kpi__sub">{sub}</div>}
  </div>
);

const EventRow = ({ event }) => {
  const cfg = eventConfig(event);
  const meta = [event.vehiculo_placa, event.ruta_nombre, event.parada_nombre].filter(Boolean).join(' · ');
  return (
    <div className="mv2-event">
      <div className={`mv2-event__icon mv2-event__icon--${cfg.tone}`}>{cfg.icon}</div>
      <div className="mv2-event__body">
        <div className="mv2-event__line">
          <b>{event.conductor_nombre || 'Sistema'}</b> {cfg.text}
        </div>
        <div className="mv2-event__meta">
          <span className="mono">{formatHM(event.timestamp)}</span>
          {meta && <><span>·</span><span className="mv2-event__meta-context">{meta}</span></>}
        </div>
      </div>
    </div>
  );
};

const RiskRow = ({ risk }) => {
  const sev = (risk.nivel_severidad || risk.prioridad || '').toLowerCase();
  const tone = sev.includes('alta') || sev === 'critico' ? 'danger' : sev.includes('media') ? 'warn' : 'info';
  const label = sev || 'baja';
  return (
    <div className="mv2-risk-row">
      <span className={`mv2-pill mv2-pill--${tone}`} style={{ textTransform: 'capitalize' }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="mv2-risk-row__txt">{risk.titulo || risk.descripcion || 'Riesgo reportado'}</div>
        <div className="mv2-risk-row__meta">
          {risk.conductor_nombre || risk.conductor || 'Sistema'} · <span className="mono">{formatHM(risk.fecha_reporte || risk.fechaCreacion)}</span>
        </div>
      </div>
    </div>
  );
};

const FumiRow = ({ fumi }) => {
  const tipo = fumi.tipo_fumigacion === 'externa' ? 'Externa' : 'Interna';
  const tipoClass = fumi.tipo_fumigacion === 'externa' ? 'externa' : 'interna';
  const estado = fumi.estado === 'realizada' ? 'realizada' : 'programada';
  const estadoTone = estado === 'realizada' ? 'mv2-pill--ok' : 'mv2-pill--info';
  return (
    <div className="mv2-fumi-row">
      <div className={`mv2-fumi-row__icon mv2-fumi-row__icon--${tipoClass}`}>
        <SprayCan size={15} />
      </div>
      <div className="mv2-fumi-row__body">
        <div className="mv2-fumi-row__title">{fumi.lugar_nombre || 'Lugar'}</div>
        <div className="mv2-fumi-row__meta">
          {tipo} · <span className="mono">{formatFecha(fumi.fecha)} {fumi.horario_inicio || ''}</span>
        </div>
      </div>
      <span className={`mv2-pill ${estadoTone}`}>{estado}</span>
    </div>
  );
};

// === Helpers ===

function eventConfig(event) {
  switch (event.tipo_evento) {
    case 'parada_completada':
      return {
        tone: 'ok',
        icon: <CheckCircle size={13} />,
        text: `completó parada ${event.parada_nombre ? `"${event.parada_nombre}"` : ''}`.trim(),
      };
    case 'parada_llegada':
      return { tone: 'info', icon: <MapPin size={13} />, text: `llegó a ${event.parada_nombre || 'parada'}` };
    case 'ruta_iniciada':
      return { tone: 'brand', icon: <Play size={13} />, text: `inició ruta ${event.ruta_nombre || ''}`.trim() };
    case 'ruta_completada':
      return { tone: 'ok', icon: <CheckCircle size={13} />, text: `completó ruta ${event.ruta_nombre || ''}`.trim() };
    case 'ruta_terminada_anticipadamente':
      return { tone: 'warn', icon: <XCircle size={13} />, text: `terminó ruta anticipadamente` };
    case 'riesgo_reportado':
      return { tone: 'danger', icon: <AlertTriangle size={13} />, text: `reportó riesgo: ${event.detalles || ''}`.trim() };
    default:
      return { tone: 'neutral', icon: <User size={13} />, text: event.detalles || 'actividad registrada' };
  }
}

function estadoToTone(estado) {
  const e = (estado || '').toLowerCase();
  if (e === 'en_progreso') return 'mv2-pill--ok';
  if (e === 'completada') return 'mv2-pill--info';
  if (e === 'cancelada') return 'mv2-pill--danger';
  return 'mv2-pill--neutral';
}

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '??';
}

function formatHM(ts) {
  if (!ts) return '—';
  try {
    return formatTimeUtil(ts);
  } catch {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toTimeString().slice(0, 5);
  }
}

function formatFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return fecha;
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return `${days[d.getDay()]} ${d.getDate()}`;
}

export default MonitoringV2;
