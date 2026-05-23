import { useState } from 'react';
import { useRiskReports } from '../../context/RiskReportsContext';
import { useFumigation } from '../../context/FumigationContext';
import {
  AlertTriangle, ClipboardList, Wrench, AlertOctagon,
  Eye, CheckCircle, FolderOpen, FileText, Users, Truck,
  MapPin, Calendar, BarChart3, X, Shield, Package, Camera,
  Plus, Trash2
} from '../Icons';
import { StorageImage, EmptyState, SkeletonGrid } from '../UI';
import { formatShort } from '../../utils/dates';
import toast from 'react-hot-toast';
import './RiskComponent.css';

const TIPO_RIESGO_OPTIONS = [
  { value: 'mecanico',            label: 'Mecánico' },
  { value: 'combustible',         label: 'Combustible' },
  { value: 'seguridad',           label: 'Seguridad' },
  { value: 'mantenimiento',       label: 'Mantenimiento' },
  { value: 'bloqueo_via',         label: 'Bloqueo de vía' },
  { value: 'seguridad_ciudadana', label: 'Seguridad ciudadana' },
  { value: 'climatico',           label: 'Climático' },
  { value: 'manifestacion',       label: 'Manifestación' },
  { value: 'accidente',           label: 'Accidente' },
  { value: 'operacional',         label: 'Operacional' },
  { value: 'ambiental',           label: 'Ambiental' },
  { value: 'equipo',              label: 'Equipo' },
];

const BLANK_FORM = {
  titulo: '',
  descripcion: '',
  tipo_riesgo: 'operacional',
  nivel_severidad: 'medio',
  ubicacion: '',
  lugar_id: '',
};

const RiskComponent = ({ userType = 'admin' }) => {
  const { reports, loading, addReport, updateReportStatus, deleteReport, getReportStats } = useRiskReports();
  // Lugares disponibles para vincular el reporte (FUM sites, INV warehouses, MTO locations).
  // useFumigation expone lugares aún si el módulo FUM no está activo — la query
  // listLugares no tiene gate de módulo, solo de org.
  const { lugares: availableLugares } = useFumigation();
  const [selectedReport, setSelectedReport] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [filterEstado, setFilterEstado] = useState('todos');
  const [filterTipo, setFilterTipo] = useState('todos');

  const canUpdateStatus = userType === 'admin' || userType === 'super_admin';
  const canCreate = canUpdateStatus;

  const stats = getReportStats();

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addReport({
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        tipo_riesgo: formData.tipo_riesgo,
        nivel_severidad: formData.nivel_severidad,
        ubicacion: formData.ubicacion || undefined,
        lugar_id: formData.lugar_id || undefined,
      });
      toast.success('Reporte creado');
      setShowCreateModal(false);
      setFormData(BLANK_FORM);
    } catch (err) {
      toast.error(err.message || 'Error al crear reporte');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e, risk) => {
    e.stopPropagation();
    if (!window.confirm(`¿Eliminar reporte "${risk.titulo}"?`)) return;
    const result = await deleteReport(risk.id);
    if (result.success) toast.success('Reporte eliminado');
    else toast.error(result.error || 'Error al eliminar');
  };

  const filteredReports = reports.filter((r) => {
    if (filterEstado !== 'todos' && r.estado !== filterEstado) return false;
    if (filterTipo !== 'todos' && r.tipo !== filterTipo) return false;
    return true;
  });

  // Stats adicionales
  const pendingCount = reports.filter(r => r.estado === 'reportado').length;
  const inReviewCount = reports.filter(r => r.estado === 'en_revision').length;
  const resolvedCount = reports.filter(r => r.estado === 'resuelto').length;

  const getPriorityLevel = (priority) => {
    switch(priority) {
      case 'critica': return 'alto';
      case 'alta': return 'alto';
      case 'media': return 'medio';
      case 'baja': return 'bajo';
      default: return 'medio';
    }
  };

  const formatUbicacion = (risk) => {
    if (risk?.ubicacion) return risk.ubicacion;
    if (risk?.gps_latitud != null && risk?.gps_longitud != null) {
      return `Lat: ${Number(risk.gps_latitud).toFixed(5)}, Lng: ${Number(risk.gps_longitud).toFixed(5)}`;
    }
    return 'No disponible';
  };

  const getPriorityIcon = (priority) => {
    switch(priority) {
      case 'critica': return <AlertTriangle size={14} />;
      case 'alta': return <AlertTriangle size={14} />;
      case 'media': return <AlertTriangle size={14} />;
      case 'baja': return <CheckCircle size={14} />;
      default: return <AlertTriangle size={14} />;
    }
  };

  return (
    <div className="risk-v2">
      {/* Hero Header — title + stat chips + CTA en una franja unificada */}
      <div className="risk-hero">
        <div className="risk-hero__title-row">
          <div className="risk-hero__title-left">
            <div className="risk-hero__icon">
              <Shield strokeWidth={1.75} size={22} />
            </div>
            <div className="risk-hero__text">
              <h2>Reportes de Riesgo</h2>
              <p>{stats.total} {stats.total === 1 ? 'reporte registrado' : 'reportes registrados'} en total</p>
            </div>
          </div>
          {canCreate && (
            <button
              className="risk-hero__cta"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus strokeWidth={2.5} size={16} />
              <span>Nuevo Riesgo</span>
            </button>
          )}
        </div>

        <div className="risk-hero__stats">
          <button
            type="button"
            className={`risk-stat-chip ${filterEstado === 'reportado' ? 'risk-stat-chip--filter-active' : ''}`}
            onClick={() => setFilterEstado(filterEstado === 'reportado' ? 'todos' : 'reportado')}
          >
            <span className="risk-stat-chip__icon risk-stat-chip__icon--warning">
              <AlertTriangle size={16} />
            </span>
            <div className="risk-stat-chip__data">
              <span className="risk-stat-chip__value">{pendingCount}</span>
              <span className="risk-stat-chip__label">Pendientes</span>
            </div>
          </button>

          <button
            type="button"
            className={`risk-stat-chip ${filterEstado === 'en_revision' ? 'risk-stat-chip--filter-active' : ''}`}
            onClick={() => setFilterEstado(filterEstado === 'en_revision' ? 'todos' : 'en_revision')}
          >
            <span className="risk-stat-chip__icon risk-stat-chip__icon--info">
              <Eye size={16} />
            </span>
            <div className="risk-stat-chip__data">
              <span className="risk-stat-chip__value">{inReviewCount}</span>
              <span className="risk-stat-chip__label">En Revisión</span>
            </div>
          </button>

          <button
            type="button"
            className={`risk-stat-chip ${filterEstado === 'resuelto' ? 'risk-stat-chip--filter-active' : ''}`}
            onClick={() => setFilterEstado(filterEstado === 'resuelto' ? 'todos' : 'resuelto')}
          >
            <span className="risk-stat-chip__icon risk-stat-chip__icon--success">
              <CheckCircle size={16} />
            </span>
            <div className="risk-stat-chip__data">
              <span className="risk-stat-chip__value">{resolvedCount}</span>
              <span className="risk-stat-chip__label">Resueltos</span>
            </div>
          </button>

          <button
            type="button"
            className={`risk-stat-chip risk-stat-chip--total ${filterEstado === 'todos' ? 'risk-stat-chip--filter-active' : ''}`}
            onClick={() => setFilterEstado('todos')}
          >
            <span className="risk-stat-chip__icon risk-stat-chip__icon--accent">
              <ClipboardList size={16} />
            </span>
            <div className="risk-stat-chip__data">
              <span className="risk-stat-chip__value">{stats.total}</span>
              <span className="risk-stat-chip__label">Total</span>
            </div>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="risk-loading">
          <SkeletonGrid count={6} minColWidth={280} itemHeight={140} />
        </div>
      ) : (
        <div className="risk-body">

          {/* Grid de reportes */}
          <div className="reports-section">
            <div className="reports-section-header">
              <div className="reports-section-meta">
                <ClipboardList strokeWidth={1.75} size={18} />
                <span className="reports-section-count">
                  Mostrando <strong>{filteredReports.length}</strong> de {stats.total}
                </span>
              </div>
              <div className="reports-filters">
                <div className="reports-filter-segment">
                  <button
                    type="button"
                    className={`reports-segment-btn ${filterTipo === 'todos' ? 'reports-segment-btn--active' : ''}`}
                    onClick={() => setFilterTipo('todos')}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    className={`reports-segment-btn ${filterTipo === 'interno' ? 'reports-segment-btn--active' : ''}`}
                    onClick={() => setFilterTipo('interno')}
                  >
                    <Wrench size={12} />
                    Internos
                  </button>
                  <button
                    type="button"
                    className={`reports-segment-btn ${filterTipo === 'externo' ? 'reports-segment-btn--active' : ''}`}
                    onClick={() => setFilterTipo('externo')}
                  >
                    <AlertOctagon size={12} />
                    Externos
                  </button>
                </div>
              </div>
            </div>
            
            {filteredReports.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No hay reportes de riesgo"
                description={reports.length > 0 ? "Ningún reporte coincide con los filtros." : "Los conductores no han creado reportes de riesgo aún."}
              />
            ) : (
              <div className="reports-responsive-grid">
                {filteredReports.map(risk => (
                <div key={risk.id} className={`report-card report-${getPriorityLevel(risk.prioridad)}`}>
                  {/* Top accent strip — tipo + status + date */}
                  <div className="report-card-strip">
                    <div className="report-card-strip__left">
                      <span className={`report-type-pill report-type-pill--${risk.tipo}`}>
                        {risk.tipo === 'interno' ? <Wrench size={11} /> : <AlertOctagon size={11} />}
                        {risk.tipo.toUpperCase()}
                      </span>
                      <span className={`report-status-pill status-${risk.estado}`}>
                        {risk.estado === 'resuelto' && <CheckCircle size={11} />}
                        {risk.estado === 'en_revision' && <Eye size={11} />}
                        {risk.estado === 'reportado' && <AlertTriangle size={11} />}
                        {risk.estado.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <span className="report-card-date">
                      <Calendar size={11} />
                      {formatShort(risk.fechaCreacion)}
                    </span>
                  </div>

                  {/* Title + category. Priority ya señalada via left border. */}
                  <div className="report-card-titleblock">
                    <h4 className="report-title">{risk.titulo}</h4>
                    <div className="report-card-meta-row">
                      <span className="report-category-chip">
                        <FolderOpen size={11} />
                        {risk.categoria}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="report-description">{risk.descripcion}</p>

                  {/* Info list — inline icon + value */}
                  <ul className="report-info-list">
                    <li className="report-info-item">
                      <Users size={13} strokeWidth={1.75} />
                      <span>{risk.conductor}</span>
                    </li>
                    <li className="report-info-item">
                      <Truck size={13} strokeWidth={1.75} />
                      <span>{risk.camion}</span>
                    </li>
                    <li className="report-info-item">
                      <MapPin size={13} strokeWidth={1.75} />
                      <span>{formatUbicacion(risk)}</span>
                    </li>
                    {risk.parada_nombre && (
                      <li className="report-info-item report-info-item--highlight">
                        <Package size={13} strokeWidth={1.75} />
                        <span>{risk.parada_nombre} <strong>(#{risk.parada_orden})</strong></span>
                      </li>
                    )}
                    {risk.lugar_nombre && (
                      <li className="report-info-item">
                        <FolderOpen size={13} strokeWidth={1.75} />
                        <span>{risk.lugar_nombre}</span>
                      </li>
                    )}
                  </ul>

                  {/* Acciones al pie */}
                  <div className="report-card-footer">
                    <button
                      className="btn btn--sm btn--ghost"
                      onClick={() => setSelectedReport(risk)}
                    >
                      <Eye size={14} />
                      Ver Detalles
                    </button>
                    {canUpdateStatus && risk.estado === 'reportado' && (
                      <button
                        className="btn btn--sm btn--info"
                        onClick={() => updateReportStatus(risk.id, 'en_revision')}
                      >
                        Revisar
                      </button>
                    )}
                    {canUpdateStatus && risk.estado === 'en_revision' && (
                      <button
                        className="btn btn--sm btn--success"
                        onClick={() => updateReportStatus(risk.id, 'resuelto')}
                      >
                        <CheckCircle size={14} />
                        Resuelto
                      </button>
                    )}
                    {canUpdateStatus && (
                      <button
                        className="btn btn--sm btn--ghost risk-btn-delete"
                        onClick={(e) => handleDelete(e, risk)}
                        title="Eliminar reporte"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal crear reporte */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content report-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><AlertTriangle size={20} /> Nuevo Reporte de Riesgo</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="detail-section">
                  <label className="risk-form-label">Título *</label>
                  <input
                    type="text"
                    className="risk-form-input"
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="Ej: Falla mecánica en zona norte"
                    required
                  />
                </div>
                <div className="detail-section">
                  <label className="risk-form-label">Descripción *</label>
                  <textarea
                    className="risk-form-input risk-form-textarea"
                    rows={3}
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Describe el riesgo con detalle..."
                    required
                  />
                </div>
                <div className="risk-form-grid">
                  <div>
                    <label className="risk-form-label">Tipo de riesgo *</label>
                    <select
                      className="risk-form-input"
                      value={formData.tipo_riesgo}
                      onChange={(e) => setFormData({ ...formData, tipo_riesgo: e.target.value })}
                    >
                      {TIPO_RIESGO_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="risk-form-label">Nivel de severidad *</label>
                    <select
                      className="risk-form-input"
                      value={formData.nivel_severidad}
                      onChange={(e) => setFormData({ ...formData, nivel_severidad: e.target.value })}
                    >
                      <option value="bajo">Bajo</option>
                      <option value="medio">Medio</option>
                      <option value="alto">Alto</option>
                      <option value="critico">Crítico</option>
                    </select>
                  </div>
                </div>
                <div className="detail-section">
                  <label className="risk-form-label">Ubicación (opcional)</label>
                  <input
                    type="text"
                    className="risk-form-input"
                    value={formData.ubicacion}
                    onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                    placeholder="Ej: Av. Central, Km 4"
                  />
                </div>
                {availableLugares && availableLugares.length > 0 && (
                  <div className="detail-section">
                    <label className="risk-form-label">Lugar registrado (opcional)</label>
                    <select
                      className="risk-form-input"
                      value={formData.lugar_id}
                      onChange={(e) => setFormData({ ...formData, lugar_id: e.target.value })}
                    >
                      <option value="">— Sin vincular —</option>
                      {availableLugares.map((l) => (
                        <option key={l._id} value={l._id}>{l.nombre}</option>
                      ))}
                    </select>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                      Sitios físicos (fumigación, almacenes, mantenimiento). Útil pa' incidentes en limpieza, almacén, etc.
                    </p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn--secondary" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? 'Guardando...' : 'Crear Reporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de detalles */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal-content report-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><ClipboardList size={20} /> Detalles del Reporte</h3>
              <button className="modal-close" onClick={() => setSelectedReport(null)}><X size={20} /></button>
            </div>
            
            <div className="modal-body">
              <div className="detail-section">
                <h4>{selectedReport.titulo}</h4>
                <div className="detail-badges">
                  <span className={`type-badge type-${selectedReport.tipo}`}>
                    {selectedReport.tipo === 'interno' ? <Wrench size={14} /> : <AlertOctagon size={14} />} {selectedReport.tipo.toUpperCase()}
                  </span>
                  <span className={`priority-badge priority-${selectedReport.prioridad}`}>
                    {getPriorityIcon(selectedReport.prioridad)} {selectedReport.prioridad.toUpperCase()}
                  </span>
                  <span className={`status-badge status-${selectedReport.estado}`}>
                    {selectedReport.estado.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="detail-section">
                <h5><FolderOpen size={16} /> Categoría</h5>
                <p>{selectedReport.categoria}</p>
              </div>

              <div className="detail-section">
                <h5><FileText size={16} /> Descripción</h5>
                <p>{selectedReport.descripcion}</p>
              </div>

              {selectedReport.fotos_storage_ids && selectedReport.fotos_storage_ids.length > 0 && (
                <div className="detail-section">
                  <h5><Camera size={16} /> Fotos ({selectedReport.fotos_storage_ids.length})</h5>
                  <div className="risk-detail-photos">
                    {selectedReport.fotos_storage_ids.map((id, idx) => (
                      <a
                        key={idx}
                        href="#"
                        onClick={(e) => e.preventDefault()}
                        className="risk-detail-photo"
                      >
                        <StorageImage storageId={id} alt={`Foto ${idx + 1}`} className="risk-detail-photo__img" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="detail-section">
                <h5><AlertTriangle size={16} /> Información del Reporte</h5>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label"><Users size={14} /> Conductor:</span>
                    <span className="detail-value">{selectedReport.conductor}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label"><Truck size={14} /> Camión:</span>
                    <span className="detail-value">{selectedReport.camion}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label"><Calendar size={14} /> Fecha de Reporte:</span>
                    <span className="detail-value">
                      {new Date(selectedReport.fechaCreacion).toLocaleDateString('es-ES')} a las {' '}
                      {new Date(selectedReport.fechaCreacion).toLocaleTimeString('es-ES')}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label"><MapPin size={14} /> Ubicación:</span>
                    <span className="detail-value">{formatUbicacion(selectedReport)}</span>
                  </div>
                  {selectedReport.parada_nombre && (
                    <div className="detail-item parada-detail-highlight">
                      <span className="detail-label"><Package size={14} /> Parada Asociada:</span>
                      <span className="detail-value">
                        {selectedReport.parada_nombre} <strong>(Parada #{selectedReport.parada_orden})</strong>
                      </span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="detail-label"><BarChart3 size={14} /> Última Actualización:</span>
                    <span className="detail-value">
                      {new Date(selectedReport.fechaActualizacion).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn--secondary"
                onClick={() => setSelectedReport(null)}
              >
                Cerrar
              </button>
              {canUpdateStatus && selectedReport.estado === 'reportado' && (
                <button
                  className="btn btn--primary"
                  onClick={() => {
                    updateReportStatus(selectedReport.id, 'en_revision');
                    setSelectedReport(null);
                  }}
                >
                  <ClipboardList size={16} /> Marcar en Revisión
                </button>
              )}
              {canUpdateStatus && selectedReport.estado === 'en_revision' && (
                <button
                  className="btn btn--success"
                  onClick={() => {
                    updateReportStatus(selectedReport.id, 'resuelto');
                    setSelectedReport(null);
                  }}
                >
                  <CheckCircle size={16} /> Marcar como Resuelto
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskComponent; 