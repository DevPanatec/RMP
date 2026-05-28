import { lazy, Suspense, useMemo } from 'react';
import { MapPin, Building, Calendar, Clock, Sparkles, FileText } from '../Icons';
import ReportLayout from '../Reports/ReportLayout';
import ReportPhotoGallery from '../Reports/ReportPhotoGallery';
import './ReportDetailModal.css';

const MapLibreComponent = lazy(() => import('../Map/MapLibreComponent'));

const parseLocalDate = (s) => {
  if (!s) return new Date();
  if (s.includes('T')) return new Date(s);
  return new Date(s + 'T00:00:00');
};

const ReportDetailModal = ({ isOpen, onClose, report, location }) => {
  const fotosPorEtapa = useMemo(() => {
    const fotos = report?.rawAssignment?.fotos || [];
    return {
      antes: fotos.filter((f) => f.etapa === 'antes'),
      durante: fotos.filter((f) => f.etapa === 'durante'),
      despues: fotos.filter((f) => f.etapa === 'despues'),
    };
  }, [report]);

  if (!isOpen || !report) return null;

  const totalFotos =
    fotosPorEtapa.antes.length + fotosPorEtapa.durante.length + fotosPorEtapa.despues.length;

  const lugarParaMapa =
    location?.latitud && location?.longitud
      ? [
          {
            _id: location._id || 'lugar-limpieza',
            nombre: report.sala || location.nombre,
            latitud: location.latitud,
            longitud: location.longitud,
            tipo: 'limpieza',
          },
        ]
      : [];

  const observaciones = report.rawAssignment?.observaciones || report.observaciones;
  const usuario = report.rawAssignment?.usuario_completo;

  // ============ PAGE 1: RESUMEN + MAPA ============
  const renderResumen = () => (
    <div className="lrm-resumen">
      <div className="lrm-summary">
        <article className="lrm-card lrm-card--accent">
          <div className="lrm-card__icon"><Building size={16} strokeWidth={1.75} /></div>
          <div className="lrm-card__body">
            <span className="lrm-card__label">Sala</span>
            <span className="lrm-card__value">{report.sala || '—'}</span>
          </div>
        </article>
        <article className="lrm-card">
          <div className="lrm-card__icon"><MapPin size={16} strokeWidth={1.75} /></div>
          <div className="lrm-card__body">
            <span className="lrm-card__label">Área</span>
            <span className="lrm-card__value">{report.area || '—'}</span>
          </div>
        </article>
        <article className="lrm-card">
          <div className="lrm-card__icon"><Calendar size={16} strokeWidth={1.75} /></div>
          <div className="lrm-card__body">
            <span className="lrm-card__label">Fecha</span>
            <span className="lrm-card__value">
              {parseLocalDate(report.fecha).toLocaleDateString('es-PA', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </article>
        <article className="lrm-card">
          <div className="lrm-card__icon"><Clock size={16} strokeWidth={1.75} /></div>
          <div className="lrm-card__body">
            <span className="lrm-card__label">Hora</span>
            <span className="lrm-card__value">{report.hora || '—'}</span>
          </div>
        </article>
      </div>

      <div className="lrm-mid">
        <div className="lrm-map">
          <header className="lrm-map__header">
            <MapPin size={14} strokeWidth={2} />
            <h3>Ubicación</h3>
          </header>
          {lugarParaMapa.length > 0 ? (
            <div className="lrm-map__container">
              <Suspense fallback={<div className="lrm-map__loading">Cargando mapa…</div>}>
                <MapLibreComponent
                  key={`map-cleaning-${report.fecha}`}
                  camiones={[]}
                  rutas={[]}
                  personnel={[]}
                  lugares={lugarParaMapa}
                  showRealTime={false}
                />
              </Suspense>
            </div>
          ) : (
            <div className="lrm-map__empty">
              <MapPin size={24} strokeWidth={1.5} />
              <p>Sin coordenadas GPS</p>
            </div>
          )}
        </div>

        <aside className="lrm-side">
          <div className="lrm-counts">
            <div className="lrm-count">
              <span className="lrm-count__num">{fotosPorEtapa.antes.length}</span>
              <span className="lrm-count__label">Antes</span>
            </div>
            <div className="lrm-count">
              <span className="lrm-count__num">{fotosPorEtapa.durante.length}</span>
              <span className="lrm-count__label">Durante</span>
            </div>
            <div className="lrm-count">
              <span className="lrm-count__num">{fotosPorEtapa.despues.length}</span>
              <span className="lrm-count__label">Después</span>
            </div>
          </div>
          {usuario && (
            <div className="lrm-by">
              <span className="lrm-by__label">Realizado por</span>
              <span className="lrm-by__value">{usuario}</span>
            </div>
          )}
        </aside>
      </div>
    </div>
  );

  // ============ PAGE 2: EVIDENCIA + OBSERVACIONES ============
  const renderEvidencia = () => (
    <div className="lrm-evidencia">
      <section className="lrm-section lrm-section--photos">
        <header className="lrm-section__header">
          <Sparkles size={14} strokeWidth={2} />
          <h3>Evidencia fotográfica</h3>
          <span className="lrm-section__count">{totalFotos}</span>
        </header>
        <ReportPhotoGallery groups={fotosPorEtapa} />
      </section>

      <section className="lrm-section">
        <header className="lrm-section__header">
          <FileText size={14} strokeWidth={2} />
          <h3>Observaciones</h3>
        </header>
        {observaciones ? (
          <div className="lrm-obs">{observaciones}</div>
        ) : (
          <p className="lrm-empty">Sin observaciones registradas.</p>
        )}
      </section>
    </div>
  );

  return (
    <ReportLayout
      module="lim"
      icon={<Sparkles size={22} strokeWidth={1.75} />}
      title="Reporte de Limpieza"
      subtitle={`${report.sala || 'Sin sala'} · ${report.area || 'Sin área'}`}
      statusBadge={{ label: 'Completado', variant: 'success' }}
      onClose={onClose}
      pages={[
        { id: 'resumen', label: 'Resumen', content: renderResumen() },
        { id: 'evidencia', label: 'Evidencia', content: renderEvidencia() },
      ]}
    />
  );
};

export default ReportDetailModal;
