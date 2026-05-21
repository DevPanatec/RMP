import { useState } from 'react';
import { useRiskReports } from '../../context/RiskReportsContext';
import {
  AlertTriangle, ClipboardList, Wrench, AlertOctagon,
  Eye, CheckCircle, FolderOpen, FileText, Users, Truck,
  MapPin, Calendar, BarChart3, X, Shield, Package, Camera,
  Plus, Trash2
} from '../Icons';
import { StorageImage, EmptyState } from '../UI';
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
};

const RiskComponent = ({ userType = 'admin' }) => {
  const { reports, loading, addReport, updateReportStatus, deleteReport, getReportStats } = useRiskReports();
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
      {/* Header V2 - Compacto */}
      <div className="risk-header-v2">
        <div className="risk-header-left">
          <div className="risk-header-icon">
            <Shield size={20} />
          </div>
          <div className="risk-header-text">
            <h2>Reportes de Riesgo</h2>
            <p>Gestión de reportes de conductores</p>
          </div>
        </div>

        <div className="risk-header-right">
          <div className="risk-header-stats">
            <div className="risk-stat-compact">
              <span className="stat-value">{pendingCount}</span>
              <span className="stat-label">Pendientes</span>
            </div>
            <div className="risk-stat-compact">
              <span className="stat-value">{inReviewCount}</span>
              <span className="stat-label">En Revisión</span>
            </div>
            <div className="risk-stat-compact">
              <span className="stat-value">{resolvedCount}</span>
              <span className="stat-label">Resueltos</span>
            </div>
            <div className="risk-stat-compact total">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>
          {canCreate && (
            <button
              className="btn btn--sm btn--primary risk-btn-new"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={14} />
              Nuevo Riesgo
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="risk-loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Cargando reportes de riesgo...</p>
          </div>
        </div>
      ) : (
        <div className="risk-body">

          {/* Grid de reportes */}
          <div className="reports-section">
            <div className="reports-section-header">
              <h3><ClipboardList size={20} /> Reportes de Conductores</h3>
              <div className="reports-filters">
                <select
                  className="reports-filter-select"
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                >
                  <option value="todos">Todos los reportes</option>
                  <option value="reportado">Pendientes</option>
                  <option value="en_revision">En revisión</option>
                  <option value="resuelto">Resueltos</option>
                </select>
                <select
                  className="reports-filter-select"
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value)}
                >
                  <option value="todos">Todos los tipos</option>
                  <option value="interno">Internos</option>
                  <option value="externo">Externos</option>
                </select>
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
                  {/* Header simplificado */}
                  <div className="report-card-header">
                    <div className="report-badges">
                      <span className="report-type-badge">
                        {risk.tipo === 'interno' ? <Wrench size={12} /> : <AlertOctagon size={12} />}
                        {risk.tipo.toUpperCase()}
                      </span>
                      <span className={`report-status-badge status-${risk.estado}`}>
                        {risk.estado.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <span className="report-date-compact">
                      {formatShort(risk.fechaCreacion)}
                    </span>
                  </div>

                  {/* Contenido principal */}
                  <div className="report-card-body">
                    <h4 className="report-title">{risk.titulo}</h4>
                    <p className="report-category-compact">
                      <FolderOpen size={12} />
                      <span>{risk.categoria}</span>
                    </p>
                    <p className="report-description-compact">{risk.descripcion}</p>

                    {/* Info grid compacta */}
                    <div className="report-info-grid">
                      <div className="info-item">
                        <Users size={14} />
                        <div className="info-content">
                          <span className="info-label">Conductor</span>
                          <span className="info-value">{risk.conductor}</span>
                        </div>
                      </div>
                      <div className="info-item">
                        <Truck size={14} />
                        <div className="info-content">
                          <span className="info-label">Camión</span>
                          <span className="info-value">{risk.camion}</span>
                        </div>
                      </div>
                      <div className="info-item full-width">
                        <MapPin size={14} />
                        <div className="info-content">
                          <span className="info-label">Ubicación</span>
                          <span className="info-value">{formatUbicacion(risk)}</span>
                        </div>
                      </div>
                      {risk.parada_nombre && (
                        <div className="info-item parada-highlight full-width">
                          <Package size={14} />
                          <div className="info-content">
                            <span className="info-label">Parada</span>
                            <span className="info-value">
                              {risk.parada_nombre} <strong>(#{risk.parada_orden})</strong>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Prioridad separada */}
                    <div className="report-priority-row">
                      <span className={`priority-badge-compact priority-${risk.prioridad}`}>
                        {getPriorityIcon(risk.prioridad)}
                        {risk.prioridad.toUpperCase()}
                      </span>
                    </div>
                  </div>

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
                        className="btn btn--sm btn--primary"
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