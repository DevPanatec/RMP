import { useEffect, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Printer } from '../Icons';
import './ReportLayout.css';

/**
 * Shell compartido para los 4 modales de reportes (REC/LIM/FUM/MTO).
 *
 * UX en pantalla: una "página" visible a la vez con paginador.
 * UX al imprimir (Ctrl+P): @media print muestra todas las páginas stackeadas
 * con page-break-after entre cada una.
 *
 * Props:
 *  - title, subtitle, module ('rec'|'lim'|'fum'|'mto')
 *  - statusBadge?: { label, variant }
 *  - icon: ReactNode (header icon)
 *  - pages: [{ id, label, content }] — content puede ser nodo o función ({ printMode }) => node
 *  - onClose: () => void
 *  - onDownloadPDF?: () => void
 *  - downloading?: boolean
 */
const ReportLayout = ({
  title,
  subtitle,
  module,
  icon,
  statusBadge,
  pages,
  onClose,
  onDownloadPDF,
  downloading,
}) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const total = pages.length;

  const goPrev = useCallback(() => setActiveIdx((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(
    () => setActiveIdx((i) => Math.min(total - 1, i + 1)),
    [total]
  );

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && !e.target.matches('input,textarea')) goPrev();
      else if (e.key === 'ArrowRight' && !e.target.matches('input,textarea')) goNext();
    };
    window.addEventListener('keydown', handler);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, goPrev, goNext]);

  const handlePrint = () => {
    // Cambiar título doc temporalmente → el navegador inyecta este texto
    // como header central de la hoja impresa (en vez de "RMP – Sistema...").
    // URL (localhost) y page number siguen apareciendo si el usuario tiene
    // activado "Headers and footers" en el diálogo de impresión — eso solo
    // se puede desactivar manualmente, no por CSS.
    const original = document.title;
    document.title = `Reporte ${title}`;
    window.print();
    // Restaurar después de que el diálogo se cierre
    setTimeout(() => {
      document.title = original;
    }, 500);
  };

  const renderContent = (page, printMode) =>
    typeof page.content === 'function' ? page.content({ printMode }) : page.content;

  return (
    <div className="rlayout__backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`rlayout rlayout--${module}`} role="dialog" aria-label={title}>
        {/* PRINT-ONLY HEADER — logos de certificación + módulo. Hidden en screen. */}
        <div className="rlayout__print-header" aria-hidden="true">
          <img src="/icons/modules/sgs-iso.png" alt="SGS ISO" className="rlayout__print-logo" />
          <img src="/icons/modules/logo-hb-new.png" alt="Hombres de Blanco" className="rlayout__print-logo rlayout__print-logo--center" />
          <img src="/icons/modules/issa.png" alt="ISSA" className="rlayout__print-logo" />
        </div>

        {/* HEADER */}
        <header className={`rlayout__header rlayout__header--${module}`}>
          <div className={`rlayout__icon rlayout__icon--${module}`}>{icon}</div>
          <div className="rlayout__title">
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {statusBadge && (
            <span className={`rlayout__status rlayout__status--${statusBadge.variant || 'default'}`}>
              {statusBadge.label}
            </span>
          )}
          <button
            type="button"
            className="rlayout__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        {/* SCREEN: only active page visible. PRINT: all stacked via CSS. */}
        <div className="rlayout__pages">
          {pages.map((p, i) => (
            <section
              key={p.id}
              className={`rlayout__page ${i === activeIdx ? 'rlayout__page--active' : ''}`}
              data-page-label={p.label}
              aria-hidden={i !== activeIdx}
            >
              <div className="rlayout__page-header" aria-hidden="true">
                <span className="rlayout__page-label">{p.label}</span>
                <span className="rlayout__page-num">
                  Página {i + 1} de {total}
                </span>
              </div>
              <div className="rlayout__page-body">{renderContent(p, false)}</div>
            </section>
          ))}
        </div>

        {/* FOOTER — paginator + actions. Hidden in print. */}
        <footer className="rlayout__footer">
          <div className="rlayout__paginator">
            <button
              type="button"
              className="rlayout__pagebtn"
              onClick={goPrev}
              disabled={activeIdx === 0}
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} strokeWidth={2} />
              <span>Anterior</span>
            </button>
            <div className="rlayout__pagedots" role="tablist">
              {pages.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={i === activeIdx}
                  className={`rlayout__pagedot ${i === activeIdx ? 'rlayout__pagedot--active' : ''}`}
                  onClick={() => setActiveIdx(i)}
                  title={p.label}
                >
                  <span className="rlayout__pagedot-num">{i + 1}</span>
                  <span className="rlayout__pagedot-label">{p.label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="rlayout__pagebtn"
              onClick={goNext}
              disabled={activeIdx === total - 1}
              aria-label="Página siguiente"
            >
              <span>Siguiente</span>
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
          <div className="rlayout__actions">
            <button
              type="button"
              className="rlayout__btn rlayout__btn--ghost"
              onClick={handlePrint}
              title="Imprimir reporte completo"
            >
              <Printer size={14} strokeWidth={2} />
              Imprimir
            </button>
            {onDownloadPDF && (
              <button
                type="button"
                className="rlayout__btn rlayout__btn--ghost"
                onClick={onDownloadPDF}
                disabled={downloading}
              >
                <Download size={14} strokeWidth={2} />
                {downloading ? 'Generando…' : 'PDF'}
              </button>
            )}
            <button
              type="button"
              className={`rlayout__btn rlayout__btn--primary rlayout__btn--${module}`}
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ReportLayout;
