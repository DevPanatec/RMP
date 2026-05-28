import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Camera, Image as ImageIcon } from '../Icons';
import './ReportPhotoGallery.css';

const ETAPA_LABELS = {
  antes: 'Antes',
  durante: 'Durante',
  despues: 'Después',
};

/**
 * Galería de evidencias fotográficas por etapa (antes/durante/después).
 *
 * En pantalla: 3 columnas lado a lado, thumbs compactos.
 * Al imprimir: misma estructura, thumbs siguen visibles.
 * Click en thumb → lightbox con prev/next dentro de la etapa.
 *
 * Props:
 *  - groups: { antes: Photo[], durante: Photo[], despues: Photo[] }
 *    Photo: { _id|id, url, etapa?, file_name? }
 *  - emptyText?: string
 */
const ReportPhotoGallery = ({ groups, emptyText = 'Sin evidencias fotográficas' }) => {
  const safeGroups = useMemo(
    () => ({
      antes: groups?.antes || [],
      durante: groups?.durante || [],
      despues: groups?.despues || [],
    }),
    [groups]
  );

  const total =
    safeGroups.antes.length + safeGroups.durante.length + safeGroups.despues.length;

  const [lightbox, setLightbox] = useState(null); // { etapa, idx }

  const openLightbox = (etapa, idx) => setLightbox({ etapa, idx });
  const closeLightbox = useCallback(() => setLightbox(null), []);

  const navigate = useCallback(
    (dir) => {
      setLightbox((lb) => {
        if (!lb) return lb;
        const arr = safeGroups[lb.etapa];
        const nextIdx = (lb.idx + dir + arr.length) % arr.length;
        return { ...lb, idx: nextIdx };
      });
    },
    [safeGroups]
  );

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e) => {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') navigate(-1);
      else if (e.key === 'ArrowRight') navigate(1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, closeLightbox, navigate]);

  if (total === 0) {
    return (
      <div className="rpg-empty">
        <ImageIcon size={32} strokeWidth={1.5} />
        <p>{emptyText}</p>
      </div>
    );
  }

  const currentPhoto = lightbox ? safeGroups[lightbox.etapa][lightbox.idx] : null;

  return (
    <>
      <div className="rpg">
        {(['antes', 'durante', 'despues']).map((etapa) => {
          const photos = safeGroups[etapa];
          return (
            <div key={etapa} className={`rpg__col rpg__col--${etapa}`}>
              <header className="rpg__col-header">
                <Camera size={14} strokeWidth={2} />
                <h4>{ETAPA_LABELS[etapa]}</h4>
                <span className="rpg__col-count">{photos.length}</span>
              </header>
              {photos.length === 0 ? (
                <div className="rpg__col-empty">
                  <span>—</span>
                </div>
              ) : (
                <div className="rpg__grid">
                  {photos.map((photo, idx) => (
                    <button
                      key={photo._id || photo.id || idx}
                      type="button"
                      className="rpg__thumb"
                      onClick={() => openLightbox(etapa, idx)}
                      aria-label={`Ver foto ${idx + 1} de ${ETAPA_LABELS[etapa].toLowerCase()}`}
                    >
                      {photo.url ? (
                        <img src={photo.url} alt={photo.file_name || `${etapa} ${idx + 1}`} loading="lazy" />
                      ) : (
                        <div className="rpg__thumb-placeholder">
                          <ImageIcon size={20} strokeWidth={1.5} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {lightbox && currentPhoto && (
        <div className="rpg-lightbox" onClick={(e) => e.target === e.currentTarget && closeLightbox()}>
          <button
            type="button"
            className="rpg-lightbox__close"
            onClick={closeLightbox}
            aria-label="Cerrar"
          >
            <X size={20} strokeWidth={2} />
          </button>
          {safeGroups[lightbox.etapa].length > 1 && (
            <>
              <button
                type="button"
                className="rpg-lightbox__nav rpg-lightbox__nav--prev"
                onClick={() => navigate(-1)}
                aria-label="Anterior"
              >
                <ChevronLeft size={24} strokeWidth={2} />
              </button>
              <button
                type="button"
                className="rpg-lightbox__nav rpg-lightbox__nav--next"
                onClick={() => navigate(1)}
                aria-label="Siguiente"
              >
                <ChevronRight size={24} strokeWidth={2} />
              </button>
            </>
          )}
          <figure className="rpg-lightbox__figure">
            <img src={currentPhoto.url} alt={currentPhoto.file_name || 'Evidencia'} />
            <figcaption>
              <span>{ETAPA_LABELS[lightbox.etapa]}</span>
              <span>
                {lightbox.idx + 1} / {safeGroups[lightbox.etapa].length}
              </span>
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
};

export default ReportPhotoGallery;
