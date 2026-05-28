import { lazy, Suspense, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  Calendar,
  MapPin,
  Clock,
  Spray,
  FileText,
  UserCheck,
  CheckCircle,
  Bug,
} from '../Icons';
import ReportLayout from '../Reports/ReportLayout';
import ReportPhotoGallery from '../Reports/ReportPhotoGallery';
import './FumigationReportDetailModal.css';

const MapLibreComponent = lazy(() => import('../Map/MapLibreComponent'));

const parseLocalDate = (s) => {
  if (!s) return new Date();
  if (s.includes('T')) return new Date(s);
  return new Date(s + 'T00:00:00');
};

const calcDuration = (start, end) => {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const FumigationReportDetailModal = ({ isOpen, onClose, assignment, location, onDownload }) => {
  const photos = useQuery(
    api.fumigaciones.getPhotosByAssignment,
    assignment?._id ? { assignment_id: assignment._id } : 'skip'
  );

  const fotosPorEtapa = useMemo(
    () => ({
      antes: photos?.filter((p) => p.etapa === 'antes') || [],
      durante: photos?.filter((p) => p.etapa === 'durante' || !p.etapa) || [],
      despues: photos?.filter((p) => p.etapa === 'despues') || [],
    }),
    [photos]
  );

  if (!isOpen || !assignment) return null;

  const duration = calcDuration(assignment.horario_inicio, assignment.horario_fin);
  const totalFotos =
    fotosPorEtapa.antes.length + fotosPorEtapa.durante.length + fotosPorEtapa.despues.length;

  const lugarParaMapa =
    location?.latitud && location?.longitud
      ? [
          {
            _id: location._id || 'lugar-fumigacion',
            nombre: location.nombre,
            latitud: location.latitud,
            longitud: location.longitud,
            tipo: 'fumigacion',
          },
        ]
      : [];

  const tipoLabel = assignment.tipo_fumigacion === 'interna' ? 'Interna' : 'Externa';
  const productos = assignment.productos_utilizados || [];

  // ============ PAGE 1: RESUMEN + MAPA + PRODUCTOS ============
  const renderResumen = () => (
    <div className="frm-resumen">
      <div className="frm-top">
        <div className="frm-summary">
          <article className="frm-card frm-card--accent">
            <div className="frm-card__icon"><MapPin size={16} strokeWidth={1.75} /></div>
            <div className="frm-card__body">
              <span className="frm-card__label">Lugar</span>
              <span className="frm-card__value">{location?.nombre || '—'}</span>
            </div>
          </article>
          <article className="frm-card">
            <div className="frm-card__icon"><Calendar size={16} strokeWidth={1.75} /></div>
            <div className="frm-card__body">
              <span className="frm-card__label">Fecha</span>
              <span className="frm-card__value">
                {parseLocalDate(assignment.fecha).toLocaleDateString('es-PA', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </article>
          <article className="frm-card">
            <div className="frm-card__icon"><Clock size={16} strokeWidth={1.75} /></div>
            <div className="frm-card__body">
              <span className="frm-card__label">Horario</span>
              <span className="frm-card__value">
                {assignment.horario_inicio || '—'} – {assignment.horario_fin || '—'}
                {duration && <span className="frm-card__extra"> ({duration})</span>}
              </span>
            </div>
          </article>
          {assignment.created_by && (
            <article className="frm-card">
              <div className="frm-card__icon"><UserCheck size={16} strokeWidth={1.75} /></div>
              <div className="frm-card__body">
                <span className="frm-card__label">Realizado por</span>
                <span className="frm-card__value">{assignment.created_by}</span>
              </div>
            </article>
          )}
        </div>
      </div>

      <div className="frm-mid">
        <div className="frm-map">
          <header className="frm-map__header">
            <MapPin size={14} strokeWidth={2} />
            <h3>Ubicación</h3>
          </header>
          {lugarParaMapa.length > 0 ? (
            <div className="frm-map__container">
              <Suspense fallback={<div className="frm-map__loading">Cargando mapa…</div>}>
                <MapLibreComponent
                  key={`map-fumigation-${assignment.fecha}`}
                  camiones={[]}
                  rutas={[]}
                  personnel={[]}
                  lugares={lugarParaMapa}
                  showRealTime={false}
                />
              </Suspense>
            </div>
          ) : (
            <div className="frm-map__empty">
              <MapPin size={24} strokeWidth={1.5} />
              <p>Sin coordenadas GPS</p>
            </div>
          )}
        </div>

        <aside className="frm-productos">
          <header className="frm-productos__header">
            <Spray size={14} strokeWidth={2} />
            <h3>Productos utilizados</h3>
            <span className="frm-productos__count">{productos.length}</span>
          </header>
          {productos.length === 0 ? (
            <p className="frm-empty">Sin productos registrados.</p>
          ) : (
            <ul className="frm-productos__list">
              {productos.map((p, i) => (
                <li key={i}>
                  <CheckCircle size={14} strokeWidth={2} />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );

  // ============ PAGE 2: EVIDENCIA + OBSERVACIONES ============
  const renderEvidencia = () => (
    <div className="frm-evidencia">
      <section className="frm-section frm-section--photos">
        <header className="frm-section__header">
          <Bug size={14} strokeWidth={2} />
          <h3>Evidencia fotográfica</h3>
          <span className="frm-section__count">{totalFotos}</span>
        </header>
        {!photos ? (
          <div className="frm-loading">Cargando fotos…</div>
        ) : (
          <ReportPhotoGallery groups={fotosPorEtapa} />
        )}
      </section>

      <section className="frm-section">
        <header className="frm-section__header">
          <FileText size={14} strokeWidth={2} />
          <h3>Observaciones</h3>
        </header>
        {assignment.observaciones ? (
          <div className="frm-obs">{assignment.observaciones}</div>
        ) : (
          <p className="frm-empty">Sin observaciones registradas.</p>
        )}
      </section>
    </div>
  );

  return (
    <ReportLayout
      module="fum"
      icon={<Bug size={22} strokeWidth={1.75} />}
      title="Reporte de Fumigación"
      subtitle={`${tipoLabel} · ${location?.nombre || 'sin ubicación'}`}
      statusBadge={{ label: tipoLabel, variant: 'warning' }}
      onClose={onClose}
      onDownloadPDF={onDownload}
      pages={[
        { id: 'resumen', label: 'Resumen', content: renderResumen() },
        { id: 'evidencia', label: 'Evidencia', content: renderEvidencia() },
      ]}
    />
  );
};

export default FumigationReportDetailModal;
