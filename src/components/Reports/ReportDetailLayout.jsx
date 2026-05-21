import { lazy, Suspense } from 'react';
import { Modal } from '../UI';
import { StorageImage } from '../UI';
import { Download } from '../Icons';
import './ReportDetailLayout.css';

const MapLibreComponent = lazy(() => import('../Map/MapLibreComponent'));

/**
 * Layout compartido para detalle de reportes (recolección, fumigación, limpieza, mantenimiento).
 *
 * Wraps el Modal primitive y expone slots/secciones plug-and-play. Cada DetailModal
 * de servicio puede migrarse a este layout en lugar de replicar overlay/header/footer.
 *
 * Props:
 *   open         — boolean (default true; el caller monta/desmonta)
 *   onClose      — callback
 *   title        — string para el header
 *   icon         — ReactNode (icono Fluent del header, ej. <Truck size={18} />)
 *   stats        — array [{ label, value, icon?, accent? }] — cards en grid 4-col
 *   gpsCoords    — { lat, lng } para mostrar marker; null para esconder mapa
 *   gpsTrail     — array [{ lat, lng }] para trail (rutas con histórico)
 *   stopsForMap  — paradas con coords para markers
 *   photos       — { antes: storageIds[], durante: storageIds[], despues: storageIds[] }
 *                  o array plano [storageIds] si no aplica por etapa
 *   observations — string (mostrado en card al final)
 *   onDownload   — callback botón "Descargar PDF" (null = oculta botón)
 *   children     — slot para campos service-specific entre stats y photos
 */
export const ReportDetailLayout = ({
  open = true,
  onClose,
  title,
  icon,
  stats = [],
  gpsCoords,
  gpsTrail,
  stopsForMap,
  photos,
  observations,
  onDownload,
  children,
}) => {
  const hasMap = gpsCoords && Number.isFinite(gpsCoords.lat) && Number.isFinite(gpsCoords.lng);
  const isPhotosByStage = photos && !Array.isArray(photos) && typeof photos === 'object';
  const hasPhotos = isPhotosByStage
    ? Object.values(photos).some((arr) => Array.isArray(arr) && arr.length > 0)
    : Array.isArray(photos) && photos.length > 0;

  return (
    <Modal open={open} onClose={onClose} size="lg" variant="detail">
      <Modal.Header icon={icon} onClose={onClose} id="report-detail-title">
        {title}
      </Modal.Header>

      <Modal.Body>
        {stats.length > 0 && (
          <section className="report-detail__stats">
            {stats.map((s, i) => (
              <div
                key={i}
                className={`report-detail__stat ${s.accent ? `report-detail__stat--${s.accent}` : ''}`}
              >
                {s.icon && <div className="report-detail__stat-icon">{s.icon}</div>}
                <div>
                  <div className="report-detail__stat-label">{s.label}</div>
                  <div className="report-detail__stat-value">{s.value}</div>
                </div>
              </div>
            ))}
          </section>
        )}

        {children && <section className="report-detail__service">{children}</section>}

        {hasMap && (
          <section className="report-detail__map">
            <h3 className="report-detail__section-title">Ubicación</h3>
            <div className="report-detail__map-container">
              <Suspense fallback={<div className="report-detail__map-loading">Cargando mapa…</div>}>
                <MapLibreComponent
                  camiones={[]}
                  rutas={[]}
                  personnel={[]}
                  showRealTime={false}
                  center={[gpsCoords.lng, gpsCoords.lat]}
                  zoom={15}
                  customMarkers={[
                    { lat: gpsCoords.lat, lng: gpsCoords.lng, label: title },
                    ...(stopsForMap || []),
                  ]}
                  customTrail={gpsTrail}
                />
              </Suspense>
            </div>
          </section>
        )}

        {hasPhotos && (
          <section className="report-detail__photos">
            <h3 className="report-detail__section-title">Evidencia fotográfica</h3>
            {isPhotosByStage ? (
              <div className="report-detail__photos-stages">
                {['antes', 'durante', 'despues'].map((etapa) => {
                  const ids = photos[etapa] || [];
                  if (ids.length === 0) return null;
                  return (
                    <div key={etapa} className="report-detail__photos-stage">
                      <div className={`report-detail__photos-stage-label report-detail__photos-stage-label--${etapa}`}>
                        {etapa === 'antes' && 'Antes'}
                        {etapa === 'durante' && 'Durante'}
                        {etapa === 'despues' && 'Después'}
                        <span className="report-detail__photos-count">{ids.length}</span>
                      </div>
                      <div className="report-detail__photos-grid">
                        {ids.map((id, idx) => (
                          <a
                            key={`${etapa}-${idx}`}
                            href="#"
                            onClick={(e) => e.preventDefault()}
                            className="report-detail__photo"
                          >
                            <StorageImage storageId={id} alt={`${etapa} ${idx + 1}`} />
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="report-detail__photos-grid">
                {photos.map((id, idx) => (
                  <a
                    key={idx}
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="report-detail__photo"
                  >
                    <StorageImage storageId={id} alt={`Foto ${idx + 1}`} />
                  </a>
                ))}
              </div>
            )}
          </section>
        )}

        {observations && (
          <section className="report-detail__observations">
            <h3 className="report-detail__section-title">Observaciones</h3>
            <p>{observations}</p>
          </section>
        )}
      </Modal.Body>

      <Modal.Footer align="between">
        {onDownload ? (
          <button
            type="button"
            className="report-detail__btn report-detail__btn--primary"
            onClick={onDownload}
          >
            <Download size={16} />
            Descargar PDF
          </button>
        ) : <span />}
        <button
          type="button"
          className="report-detail__btn report-detail__btn--secondary"
          onClick={onClose}
        >
          Cerrar
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default ReportDetailLayout;
