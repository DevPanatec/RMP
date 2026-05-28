import { lazy, Suspense } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  Wrench,
  MapPin,
  Calendar,
  Clock,
  UserCheck,
  Truck,
  Package,
  FileText,
  Camera,
} from '../Icons';
import { StorageImage } from '../UI';
import ReportLayout from './ReportLayout';
import './RiskReportDetailModal.css';

const MapLibreComponent = lazy(() => import('../Map/MapLibreComponent'));

const parseDate = (s) => {
  if (!s) return new Date();
  if (typeof s === 'number') return new Date(s);
  if (s.includes('T')) return new Date(s);
  return new Date(s + 'T00:00:00');
};

const formatDate = (d) =>
  d.toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' });

const formatTime = (d) =>
  d.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' });

const SEV_LABEL = {
  critico: 'Crítico',
  alto: 'Alto',
  medio: 'Medio',
  bajo: 'Bajo',
};

const SEV_VARIANT = {
  critico: 'error',
  alto: 'error',
  medio: 'warning',
  bajo: 'success',
};

const TIPO_RIESGO_LABEL = {
  mecanico: 'Mecánico',
  combustible: 'Combustible',
  seguridad: 'Seguridad',
  mantenimiento: 'Mantenimiento',
  bloqueo_via: 'Bloqueo de vía',
  seguridad_ciudadana: 'Seguridad ciudadana',
  climatico: 'Climático',
  manifestacion: 'Manifestación',
  accidente: 'Accidente',
  operacional: 'Operacional',
};

const RiskReportDetailModal = ({ report, onClose }) => {
  if (!report) return null;

  const fecha = parseDate(report.fecha_reporte || report.fechaCreacion);
  const sev = (report.nivel_severidad || '').toLowerCase();
  const tipoLabel = TIPO_RIESGO_LABEL[report.tipo_riesgo] || report.tipo_riesgo || 'General';
  const esExterno = report.tipo === 'externo';
  const fotos = report.fotos_storage_ids || [];

  const hasGps = report.gps_latitud && report.gps_longitud;
  const hasParada = report.parada_nombre || report.parada_orden != null;

  // Si el riesgo está atado a una parada: pasamos por `rutas` pa' que el mapa
  // dibuje un StopMarker numerado (mismo look que reportes de ruta). Si no,
  // fallback a `lugares` con marker de "lugar" genérico.
  const rutasParaMapa =
    hasGps && hasParada
      ? [
          {
            _id: report._id || 'riesgo-ruta',
            nombre: report.rutaNombre || 'Reporte de riesgo',
            paradas: [
              {
                orden: report.parada_orden ?? 1,
                nombre: report.parada_nombre || report.titulo,
                direccion: report.parada_nombre || report.ubicacion,
                lat: report.gps_latitud,
                lng: report.gps_longitud,
                latitud: report.gps_latitud,
                longitud: report.gps_longitud,
                completada: false,
                motivo_no_completada: report.titulo,
              },
            ],
          },
        ]
      : [];

  const lugarParaMapa =
    hasGps && !hasParada
      ? [
          {
            _id: report._id || 'riesgo',
            nombre: report.titulo || 'Reporte de riesgo',
            latitud: report.gps_latitud,
            longitud: report.gps_longitud,
            tipo: 'riesgo',
          },
        ]
      : [];

  const ubicacionTexto = report.ubicacion || report.lugar_nombre || report.parada_nombre;

  // ============ PAGE 1: RESUMEN + MAPA ============
  const renderResumen = () => (
    <div className="risk-resumen">
      <div className="risk-badges">
        <span className={`risk-badge ${esExterno ? 'risk-badge--externo' : 'risk-badge--interno'}`}>
          {esExterno ? <AlertOctagon size={12} strokeWidth={2} /> : <Wrench size={12} strokeWidth={2} />}
          {esExterno ? 'Externo' : 'Interno'}
        </span>
        <span className={`risk-badge risk-badge--sev-${sev}`}>
          <AlertTriangle size={12} strokeWidth={2} />
          {SEV_LABEL[sev] || report.nivel_severidad}
        </span>
        <span className="risk-badge risk-badge--tipo">{tipoLabel}</span>
        {report.estado && (
          <span className={`risk-badge risk-badge--estado-${report.estado}`}>
            {String(report.estado).replace('_', ' ').toUpperCase()}
          </span>
        )}
      </div>

      <h3 className="risk-titulo">{report.titulo}</h3>

      <div className="risk-summary">
        <article className="risk-card">
          <div className="risk-card__icon"><Calendar size={14} strokeWidth={1.75} /></div>
          <div className="risk-card__body">
            <span className="risk-card__label">Fecha</span>
            <span className="risk-card__value">{formatDate(fecha)} · {formatTime(fecha)}</span>
          </div>
        </article>
        {report.conductor && report.conductor !== 'Desconocido' && (
          <article className="risk-card">
            <div className="risk-card__icon"><UserCheck size={14} strokeWidth={1.75} /></div>
            <div className="risk-card__body">
              <span className="risk-card__label">Reportado por</span>
              <span className="risk-card__value">{report.conductor}</span>
            </div>
          </article>
        )}
        {report.camion && report.camion !== 'N/A' && (
          <article className="risk-card">
            <div className="risk-card__icon"><Truck size={14} strokeWidth={1.75} /></div>
            <div className="risk-card__body">
              <span className="risk-card__label">Vehículo</span>
              <span className="risk-card__value">{report.camion}</span>
            </div>
          </article>
        )}
        {report.rutaNombre && report.rutaNombre !== 'N/A' && (
          <article className="risk-card">
            <div className="risk-card__icon"><Package size={14} strokeWidth={1.75} /></div>
            <div className="risk-card__body">
              <span className="risk-card__label">Ruta</span>
              <span className="risk-card__value">{report.rutaNombre}</span>
            </div>
          </article>
        )}
        {report.parada_nombre && (
          <article className="risk-card risk-card--accent">
            <div className="risk-card__icon"><MapPin size={14} strokeWidth={1.75} /></div>
            <div className="risk-card__body">
              <span className="risk-card__label">Parada</span>
              <span className="risk-card__value">{report.parada_nombre}</span>
            </div>
          </article>
        )}
      </div>

      <div className="risk-mid">
        <div className="risk-map">
          <header className="risk-map__header">
            <MapPin size={14} strokeWidth={2} />
            <h4>Ubicación</h4>
            {ubicacionTexto && <span className="risk-map__sub">{ubicacionTexto}</span>}
          </header>
          {hasGps ? (
            <div className="risk-map__container">
              <Suspense fallback={<div className="risk-map__loading">Cargando mapa…</div>}>
                <MapLibreComponent
                  key={`map-risk-${report._id}`}
                  camiones={[]}
                  rutas={rutasParaMapa}
                  personnel={[]}
                  lugares={lugarParaMapa}
                  showRealTime={false}
                />
              </Suspense>
            </div>
          ) : (
            <div className="risk-map__empty">
              <MapPin size={24} strokeWidth={1.5} />
              <p>Sin coordenadas GPS</p>
              {ubicacionTexto && <p className="risk-map__addr">{ubicacionTexto}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ============ PAGE 2: EVIDENCIA + DESCRIPCIÓN ============
  const renderEvidencia = () => (
    <div className="risk-evidencia">
      <section className="risk-section">
        <header className="risk-section__header">
          <FileText size={14} strokeWidth={2} />
          <h3>Descripción</h3>
        </header>
        <div className="risk-desc">{report.descripcion || 'Sin descripción.'}</div>
      </section>

      <section className="risk-section risk-section--photos">
        <header className="risk-section__header">
          <Camera size={14} strokeWidth={2} />
          <h3>Evidencia fotográfica</h3>
          <span className="risk-section__count">{fotos.length}</span>
        </header>
        {fotos.length === 0 ? (
          <p className="risk-empty">Sin fotos adjuntas.</p>
        ) : (
          <div className="risk-photos">
            {fotos.map((id, idx) => (
              <div key={idx} className="risk-photo">
                <StorageImage storageId={id} alt={`Foto ${idx + 1}`} className="risk-photo__img" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  return (
    <ReportLayout
      module="rec"
      icon={<AlertTriangle size={22} strokeWidth={1.75} />}
      title={report.titulo || 'Reporte de Riesgo'}
      subtitle={`Riesgo · ${tipoLabel}`}
      statusBadge={{ label: SEV_LABEL[sev] || report.nivel_severidad, variant: SEV_VARIANT[sev] || 'default' }}
      onClose={onClose}
      pages={[
        { id: 'resumen', label: 'Resumen', content: renderResumen() },
        { id: 'evidencia', label: 'Evidencia', content: renderEvidencia() },
      ]}
    />
  );
};

export default RiskReportDetailModal;
