import { lazy, Suspense } from 'react';
import {
  Truck,
  MapPin,
  Clock,
  UserCheck,
  Package,
  Calendar,
  FileText,
  AlertTriangle,
  Wrench,
  AlertOctagon,
} from '../Icons';
import { StorageImage } from '../UI';
import { useRiskReports } from '../../context/RiskReportsContext';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import ReportLayout from './ReportLayout';
import './RouteReportDetailModal.css';

const MapLibreComponent = lazy(() => import('../Map/MapLibreComponent'));

const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr.includes('T')) return new Date(dateStr);
  return new Date(dateStr + 'T00:00:00');
};

const formatDuration = (seconds) => {
  if (seconds == null) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
};

const formatTime = (ts) => {
  if (!ts) return null;
  try {
    const d = typeof ts === 'string' ? new Date(ts) : new Date(ts);
    return d.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return null;
  }
};

const formatElapsed = (a, b) => {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (ms <= 0) return null;
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
};

const CARGA_LABEL = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
  ninguna: 'Ninguna',
};

const RouteReportDetailModal = ({ report, onClose }) => {
  const { reports: allRiskReports } = useRiskReports();

  const vehicleHistory = useQuery(
    api.vehicleHistory.getVehicleHistory,
    report?.vehiculo_id
      ? {
          vehiculoId: report.vehiculo_id,
          startDate: new Date(report.fecha_inicio).getTime(),
          endDate: new Date(report.fecha_completacion).getTime(),
        }
      : 'skip'
  );

  // route_events: timeline real con hora de llegada + hora de completado por parada.
  // El snapshot paradas_completadas guarda mismo timestamp pa' los dos — los
  // tiempos reales viven en route_events.
  const eventsByAsignacion = useQuery(
    api.route_events.getByAsignacion,
    report?.asignacion_id ? { asignacion_id: report.asignacion_id } : 'skip'
  );

  const eventsByParadaIndex = (eventsByAsignacion || []).reduce((acc, ev) => {
    if (ev.parada_index == null) return acc;
    const key = ev.parada_index;
    if (!acc[key]) acc[key] = {};
    if (ev.tipo_evento === 'parada_llegada') acc[key].llegada = ev.timestamp;
    else if (ev.tipo_evento === 'parada_salida') acc[key].salida = ev.timestamp;
    else if (ev.tipo_evento === 'parada_completada') acc[key].completada = ev.timestamp;
    return acc;
  }, {});

  const gpsTrailData =
    vehicleHistory?.locations?.map((loc) => ({
      lat: loc.gps_latitud,
      lng: loc.gps_longitud,
    })) || [];

  if (!report) return null;

  const associatedRiskReports = (report.reportes_riesgo_ids || [])
    .map((riskId) => allRiskReports.find((r) => (r._id || r.id) === riskId))
    .filter(Boolean);

  const completadasByIndex = (report.paradas_completadas || []).reduce(
    (acc, p, idx) => {
      const key = p.parada_index ?? p.index ?? idx;
      acc[key] = p;
      return acc;
    },
    {}
  );

  const rutaParaMapa = [
    {
      _id: report._id || report.ruta_id || 'reporte-ruta',
      nombre: report.ruta_nombre,
      paradas: (report.ruta_paradas || [])
        .map((p, idx) => {
          const lat = p.lat || p.latitud || p.gps_completada?.lat || p.gps_completada?.latitud;
          const lng = p.lng || p.longitud || p.gps_completada?.lng || p.gps_completada?.longitud;
          const completedInfo = completadasByIndex[idx];
          return {
            nombre: p.direccion || p.nombre || `Parada ${idx + 1}`,
            direccion: p.direccion || p.nombre,
            lat,
            lng,
            latitud: lat,
            longitud: lng,
            orden: p.orden || idx + 1,
            completada: completedInfo ? completedInfo.completada !== false : false,
            motivo_no_completada: completedInfo?.motivo_no_completada,
          };
        })
        .filter((p) => p.lat && p.lng),
    },
  ];

  const totalParadas = report.paradas_completadas?.length || 0;
  const completadas = report.paradas_completadas?.filter((p) => p.completada).length || 0;
  const porcentaje = totalParadas > 0 ? Math.round((completadas / totalParadas) * 100) : 0;
  const hasMapData = rutaParaMapa[0]?.paradas?.length > 0;

  // ============ PAGE 1: RESUMEN ============
  const renderResumen = () => (
    <div className="rrm-resumen">
      <div className="rrm-stats">
        <article className="rrm-stat">
          <div className="rrm-stat__icon"><UserCheck size={18} strokeWidth={1.75} /></div>
          <div className="rrm-stat__body">
            <span className="rrm-stat__label">Conductor</span>
            <span className="rrm-stat__value">{report.conductor_nombre || '—'}</span>
          </div>
        </article>
        <article className="rrm-stat">
          <div className="rrm-stat__icon"><Truck size={18} strokeWidth={1.75} /></div>
          <div className="rrm-stat__body">
            <span className="rrm-stat__label">Vehículo</span>
            <span className="rrm-stat__value">{report.vehiculo_placa || '—'}</span>
          </div>
        </article>
        <article className="rrm-stat">
          <div className="rrm-stat__icon"><Clock size={18} strokeWidth={1.75} /></div>
          <div className="rrm-stat__body">
            <span className="rrm-stat__label">Tiempo total</span>
            <span className="rrm-stat__value">{formatDuration(report.tiempo_total_segundos)}</span>
          </div>
        </article>
        <article className="rrm-stat">
          <div className="rrm-stat__icon"><Calendar size={18} strokeWidth={1.75} /></div>
          <div className="rrm-stat__body">
            <span className="rrm-stat__label">Fecha</span>
            <span className="rrm-stat__value">
              {parseLocalDate(report.fecha_completacion).toLocaleDateString('es-PA', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </article>
        <article className="rrm-stat rrm-stat--wide">
          <div className="rrm-stat__icon"><Package size={18} strokeWidth={1.75} /></div>
          <div className="rrm-stat__body">
            <span className="rrm-stat__label">Paradas completadas</span>
            <span className="rrm-stat__value">
              {completadas} <span className="rrm-stat__divider">/</span> {totalParadas}
              <span className="rrm-stat__pct"> · {porcentaje}%</span>
            </span>
          </div>
        </article>
      </div>

      <div className="rrm-map">
        <header className="rrm-map__header">
          <MapPin size={16} strokeWidth={2} />
          <h3>Mapa de Ruta</h3>
          <span className="rrm-map__count">{rutaParaMapa[0]?.paradas?.length || 0} paradas</span>
        </header>
        {hasMapData ? (
          <div className="rrm-map__container">
            <Suspense fallback={<div className="rrm-map__loading">Cargando mapa…</div>}>
              <MapLibreComponent
                key={`map-${report._id}`}
                camiones={[]}
                rutas={rutaParaMapa}
                personnel={[]}
                lugares={[]}
                showRealTime={false}
                gpsTrail={gpsTrailData}
                showMapboxRoute={false}
              />
            </Suspense>
          </div>
        ) : (
          <div className="rrm-map__empty">
            <MapPin size={28} strokeWidth={1.5} />
            <p>Sin coordenadas GPS pa' esta ruta</p>
          </div>
        )}
      </div>
    </div>
  );

  // ============ PAGE 2: PARADAS ============
  const renderParadas = () => (
    <div className="rrm-paradas">
      {totalParadas === 0 ? (
        <div className="rrm-empty">
          <Package size={32} strokeWidth={1.5} />
          <p>Sin paradas registradas</p>
        </div>
      ) : (
        <ul className="rrm-paradas__list">
          {(report.paradas_completadas || []).map((parada, idx) => {
            const paradaIndex = parada.parada_index ?? parada.index ?? idx;
            const ev = eventsByParadaIndex[paradaIndex] || {};
            // Fallback: si no hay event timestamps, usar el snapshot
            const horaLlegada =
              formatTime(ev.llegada) || formatTime(parada.timestamp_llegada || parada.timestamp);
            const horaCompletada =
              formatTime(ev.completada) || formatTime(parada.timestamp_salida);
            const elapsed = formatElapsed(ev.llegada, ev.completada);
            const carga = parada.categoria_carga || parada.category;
            const cargaKey = carga ? String(carga).toLowerCase() : null;
            return (
              <li
                key={idx}
                className={`rrm-parada ${parada.completada ? 'rrm-parada--done' : 'rrm-parada--skip'}`}
              >
                <div className="rrm-parada__num">{parada.orden || idx + 1}</div>
                <div className="rrm-parada__main">
                  <div className="rrm-parada__row">
                    <span className="rrm-parada__addr">
                      {parada.direccion || parada.parada_nombre || `Parada ${idx + 1}`}
                    </span>
                    <span
                      className={`rrm-parada__badge ${
                        parada.completada ? 'rrm-parada__badge--ok' : 'rrm-parada__badge--skip'
                      }`}
                    >
                      {parada.completada ? 'Completada' : 'No completada'}
                    </span>
                  </div>

                  {parada.completada && (
                    <>
                      <div className="rrm-parada__chips">
                        {cargaKey && (
                          <span className={`rrm-chip rrm-chip--carga rrm-chip--carga-${cargaKey}`}>
                            <Package size={11} strokeWidth={2} />
                            Carga {CARGA_LABEL[cargaKey] || carga}
                          </span>
                        )}
                        {parada.bolsas != null && (
                          <span className="rrm-chip rrm-chip--bolsas">
                            <Package size={11} strokeWidth={2} />
                            {parada.bolsas} bolsa{parada.bolsas === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>

                      {(horaLlegada || horaCompletada) && (
                        <div className="rrm-parada__times">
                          {horaLlegada && (
                            <div className="rrm-time">
                              <span className="rrm-time__label">Llegada</span>
                              <span className="rrm-time__value">
                                <Clock size={11} strokeWidth={2} /> {horaLlegada}
                              </span>
                            </div>
                          )}
                          {horaCompletada && (
                            <div className="rrm-time">
                              <span className="rrm-time__label">Completada</span>
                              <span className="rrm-time__value">
                                <Clock size={11} strokeWidth={2} /> {horaCompletada}
                              </span>
                            </div>
                          )}
                          {elapsed && (
                            <div className="rrm-time rrm-time--elapsed">
                              <span className="rrm-time__label">Tiempo en parada</span>
                              <span className="rrm-time__value">{elapsed}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {!parada.completada && parada.motivo_no_completada && (
                    <div className="rrm-parada__motivo">
                      <strong>Motivo:</strong> {parada.motivo_no_completada}
                    </div>
                  )}
                </div>
                {parada.completada && parada.foto_storage_id && (
                  <div className="rrm-parada__photo">
                    <StorageImage
                      storageId={parada.foto_storage_id}
                      alt={`Foto parada ${parada.orden || idx + 1}`}
                      className="rrm-parada__photo-img"
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  // ============ PAGE 3: RIESGOS & OBSERVACIONES ============
  const renderRiesgos = () => (
    <div className="rrm-riesgos">
      {report.terminacion_anticipada && (
        <div className="rrm-warning">
          <AlertTriangle size={18} strokeWidth={2} />
          <div>
            <strong>Ruta terminada anticipadamente</strong>
            <p>{report.motivo_terminacion || 'Sin motivo especificado'}</p>
          </div>
        </div>
      )}

      <section className="rrm-section">
        <header className="rrm-section__header">
          <AlertTriangle size={16} strokeWidth={2} />
          <h3>Reportes de riesgo</h3>
          <span className="rrm-section__count">{associatedRiskReports.length}</span>
        </header>
        {associatedRiskReports.length === 0 ? (
          <p className="rrm-section__empty">Sin reportes de riesgo asociados.</p>
        ) : (
          <div className="rrm-risks">
            {associatedRiskReports.map((r, idx) => (
              <article
                key={idx}
                className={`rrm-risk rrm-risk--${r.nivel_severidad || r.prioridad || 'medio'}`}
              >
                <header className="rrm-risk__header">
                  <span className="rrm-risk__type">
                    {r.tipo === 'interno' ? (
                      <><Wrench size={14} strokeWidth={2} /> Interno</>
                    ) : (
                      <><AlertOctagon size={14} strokeWidth={2} /> Externo</>
                    )}
                  </span>
                  <span className="rrm-risk__sev">
                    {(r.nivel_severidad || r.prioridad || '').toUpperCase()}
                  </span>
                </header>
                <h4>{r.titulo}</h4>
                <p className="rrm-risk__cat">{r.tipo_riesgo || r.categoria}</p>
                <p className="rrm-risk__desc">{r.descripcion}</p>
                <footer className="rrm-risk__footer">
                  <span>
                    <Clock size={12} strokeWidth={2} />{' '}
                    {parseLocalDate(r.fecha_reporte || r.fechaCreacion).toLocaleString('es-PA')}
                  </span>
                  {r.ubicacion && (
                    <span>
                      <MapPin size={12} strokeWidth={2} /> {r.ubicacion}
                    </span>
                  )}
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rrm-section">
        <header className="rrm-section__header">
          <FileText size={16} strokeWidth={2} />
          <h3>Observaciones</h3>
        </header>
        {report.observaciones ? (
          <div className="rrm-obs">{report.observaciones}</div>
        ) : (
          <p className="rrm-section__empty">Sin observaciones.</p>
        )}
      </section>
    </div>
  );

  return (
    <ReportLayout
      module="rec"
      icon={<Truck size={22} strokeWidth={1.75} />}
      title={report.ruta_nombre || 'Reporte de Ruta'}
      subtitle="Recolección · ruta completada"
      statusBadge={{ label: 'Completada', variant: 'success' }}
      onClose={onClose}
      pages={[
        { id: 'resumen', label: 'Resumen', content: renderResumen() },
        { id: 'paradas', label: `Paradas (${totalParadas})`, content: renderParadas() },
        { id: 'riesgos', label: 'Riesgos & notas', content: renderRiesgos() },
      ]}
    />
  );
};

export default RouteReportDetailModal;
