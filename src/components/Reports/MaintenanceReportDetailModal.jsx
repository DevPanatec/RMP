import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  Wrench,
  Calendar,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  UserCheck,
  Truck,
  FileText,
} from '../Icons';
import { generateMantenimientoPDFComplete } from '../../utils/lazyPdf';
import ReportLayout from './ReportLayout';
import ReportPhotoGallery from './ReportPhotoGallery';
import './MaintenanceReportDetailModal.css';

const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr.includes('T')) return new Date(dateStr);
  return new Date(dateStr + 'T00:00:00');
};

const formatDate = (d) =>
  d.toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' });

const TIPO_LABEL = {
  preventivo: 'Preventivo',
  correctivo: 'Correctivo',
  inspeccion: 'Inspección',
};

const MaintenanceReportDetailModal = ({ report: initialReport, onClose }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const fullReport = useQuery(
    api.maintenance.getReportById,
    initialReport?._id ? { id: initialReport._id } : 'skip'
  );

  const report = fullReport || initialReport;
  if (!initialReport) return null;
  const isLoadingPhotos = !fullReport && initialReport;

  const fechaProgramada = report.fecha_programada ? parseLocalDate(report.fecha_programada) : null;
  const fechaCompletada = parseLocalDate(report.fecha_completada);
  const completadoATiempo = fechaProgramada ? fechaCompletada <= fechaProgramada : true;

  const fotosPorEtapa = {
    antes: report.fotos_antes || [],
    durante: report.fotos_durante || [],
    despues: report.fotos_despues || [],
  };
  const totalFotos =
    fotosPorEtapa.antes.length + fotosPorEtapa.durante.length + fotosPorEtapa.despues.length;

  const trabajos = report.observaciones
    ? report.observaciones.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  const handleDownloadPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const fecha = report.fecha_reporte || report.fecha_completada;
      const dateRange = { desde: fecha, hasta: fecha };
      await generateMantenimientoPDFComplete([report], dateRange);
    } catch (err) {
      console.error('PDF error:', err);
      alert('Error al generar el PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  // ============ PAGE 1: RESUMEN ============
  const renderResumen = () => (
    <div className="mrm-resumen">
      <div className="mrm-badges">
        <span className={`mrm-badge mrm-badge--${report.tipo}`}>
          <Wrench size={12} strokeWidth={2} />
          {TIPO_LABEL[report.tipo] || report.tipo || 'General'}
        </span>
        <span
          className={`mrm-badge ${completadoATiempo ? 'mrm-badge--ok' : 'mrm-badge--late'}`}
        >
          {completadoATiempo ? (
            <CheckCircle size={12} strokeWidth={2} />
          ) : (
            <AlertTriangle size={12} strokeWidth={2} />
          )}
          {completadoATiempo ? 'A tiempo' : 'Con retraso'}
        </span>
        {report.prioridad && (
          <span className={`mrm-badge mrm-badge--prio-${report.prioridad}`}>
            Prioridad {report.prioridad}
          </span>
        )}
      </div>

      <div className="mrm-summary">
        {report.fecha_programada && (
          <article className="mrm-card">
            <div className="mrm-card__icon"><Calendar size={16} strokeWidth={1.75} /></div>
            <div className="mrm-card__body">
              <span className="mrm-card__label">Programada</span>
              <span className="mrm-card__value">{formatDate(parseLocalDate(report.fecha_programada))}</span>
            </div>
          </article>
        )}
        <article className="mrm-card mrm-card--accent">
          <div className="mrm-card__icon"><CheckCircle size={16} strokeWidth={1.75} /></div>
          <div className="mrm-card__body">
            <span className="mrm-card__label">Completada</span>
            <span className="mrm-card__value">{formatDate(fechaCompletada)}</span>
          </div>
        </article>
        {report.costo != null && (
          <article className="mrm-card">
            <div className="mrm-card__icon"><DollarSign size={16} strokeWidth={1.75} /></div>
            <div className="mrm-card__body">
              <span className="mrm-card__label">Costo</span>
              <span className="mrm-card__value">B/. {Number(report.costo).toFixed(2)}</span>
            </div>
          </article>
        )}
        {report.vehiculo_placa && (
          <article className="mrm-card">
            <div className="mrm-card__icon"><Truck size={16} strokeWidth={1.75} /></div>
            <div className="mrm-card__body">
              <span className="mrm-card__label">Vehículo</span>
              <span className="mrm-card__value">{report.vehiculo_placa}</span>
            </div>
          </article>
        )}
        {report.usuario_completo && (
          <article className="mrm-card">
            <div className="mrm-card__icon"><UserCheck size={16} strokeWidth={1.75} /></div>
            <div className="mrm-card__body">
              <span className="mrm-card__label">Completado por</span>
              <span className="mrm-card__value">{report.usuario_completo}</span>
            </div>
          </article>
        )}
        {report.mecanico && report.mecanico !== 'N/A' && (
          <article className="mrm-card">
            <div className="mrm-card__icon"><Wrench size={16} strokeWidth={1.75} /></div>
            <div className="mrm-card__body">
              <span className="mrm-card__label">Mecánico</span>
              <span className="mrm-card__value">{report.mecanico}</span>
            </div>
          </article>
        )}
      </div>

      {report.descripcion && (
        <section className="mrm-section">
          <header className="mrm-section__header">
            <FileText size={14} strokeWidth={2} />
            <h3>Descripción</h3>
          </header>
          <p className="mrm-desc">{report.descripcion}</p>
        </section>
      )}
    </div>
  );

  // ============ PAGE 2: EVIDENCIA + TRABAJOS ============
  const renderEvidencia = () => (
    <div className="mrm-evidencia">
      {trabajos.length > 0 && (
        <section className="mrm-section">
          <header className="mrm-section__header">
            <CheckCircle size={14} strokeWidth={2} />
            <h3>Trabajos realizados</h3>
            <span className="mrm-section__count">{trabajos.length}</span>
          </header>
          <ol className="mrm-trabajos">
            {trabajos.map((t, i) => (
              <li key={i}>
                <span className="mrm-trabajos__num">{i + 1}</span>
                <span className="mrm-trabajos__text">{t}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mrm-section mrm-section--photos">
        <header className="mrm-section__header">
          <Wrench size={14} strokeWidth={2} />
          <h3>Evidencia fotográfica</h3>
          {!isLoadingPhotos && <span className="mrm-section__count">{totalFotos}</span>}
        </header>
        {isLoadingPhotos ? (
          <div className="mrm-loading">Cargando fotos…</div>
        ) : (
          <ReportPhotoGallery groups={fotosPorEtapa} />
        )}
      </section>
    </div>
  );

  return (
    <ReportLayout
      module="mto"
      icon={<Wrench size={22} strokeWidth={1.75} />}
      title={report.titulo || 'Mantenimiento'}
      subtitle={`Mantenimiento · ${TIPO_LABEL[report.tipo] || 'General'}`}
      statusBadge={{
        label: completadoATiempo ? 'A tiempo' : 'Con retraso',
        variant: completadoATiempo ? 'success' : 'warning',
      }}
      onClose={onClose}
      onDownloadPDF={handleDownloadPDF}
      downloading={isDownloading}
      pages={[
        { id: 'resumen', label: 'Resumen', content: renderResumen() },
        { id: 'evidencia', label: 'Evidencia', content: renderEvidencia() },
      ]}
    />
  );
};

export default MaintenanceReportDetailModal;
