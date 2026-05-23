import { useState, useEffect, useMemo } from 'react';
import { Search, Eye, Trash2, Filter, FileText } from '../Icons';
import { Button, Card, ConfirmDialog, SkeletonList } from '../UI';
import { useCleaning } from '../../context/CleaningContext';
import ReportDetailModal from './ReportDetailModal';
import useInputDebounce from '../../hooks/useInputDebounce';
import toast from 'react-hot-toast';
import './CleaningReports.css';

const CleaningReports = ({ userRole }) => {
  const { assignments, loading, deleteAssignment } = useCleaning();
  const [filters, setFilters] = useState({
    fecha: '',
    lugar: '',
    area: '',
    search: '',
  });
  const debouncedSearch = useInputDebounce(filters.search, 300);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  };

  const handleDeleteReport = (report) => {
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      toast.error('No tienes permisos para eliminar reportes');
      return;
    }
    setReportToDelete(report);
  };

  const confirmDeleteReport = async () => {
    if (!reportToDelete) return;
    const result = await deleteAssignment(reportToDelete.id);
    if (result.success) {
      toast.success('Reporte eliminado con éxito');
    } else {
      toast.error(`Error al eliminar: ${result.error}`);
    }
    setReportToDelete(null);
  };

  // Preparar reportes con conteo de fotos
  const reports = useMemo(() => {
    return assignments.map((assignment) => {
      const photos = assignment.fotos || [];
      return {
        id: assignment.id,
        fecha: assignment.fecha,
        hora: assignment.hora,
        lugar: assignment.lugar?.nombre || '',
        area: assignment.area?.nombre || '',
        fotos: {
          antes: photos.filter((p) => p.etapa === 'antes').length,
          durante: photos.filter((p) => p.etapa === 'durante').length,
          despues: photos.filter((p) => p.etapa === 'despues').length,
        },
        createdAt: assignment.created_at,
        rawAssignment: assignment,
      };
    });
  }, [assignments]);

  // Filtrar reportes
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (filters.fecha && report.fecha !== filters.fecha) return false;
      if (filters.lugar && report.lugar !== filters.lugar) return false;
      if (filters.area && report.area !== filters.area) return false;
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        return (
          report.lugar.toLowerCase().includes(searchLower) ||
          report.area.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [reports, filters.fecha, filters.lugar, filters.area, debouncedSearch]);

  // Obtener lugars y áreas únicas para los filtros
  const uniqueLugars = useMemo(() => [...new Set(reports.map((r) => r.lugar))], [reports]);
  const uniqueAreas = useMemo(() => [...new Set(reports.map((r) => r.area))], [reports]);

  if (loading) {
    return (
      <div className="cleaning-reports">
        <SkeletonList count={4} itemHeight={100} />
      </div>
    );
  }

  return (
    <div className="cleaning-reports">
      {/* Filtros */}
      <Card className="cleaning-reports__filters">
        <div className="cleaning-filters">
          <div className="cleaning-filters__search">
            <Search size={18} color="#999" />
            <input
              type="text"
              placeholder="Buscar por lugar o área..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="cleaning-filters__search-input"
            />
          </div>

          <select
            value={filters.fecha}
            onChange={(e) => handleFilterChange('fecha', e.target.value)}
            className="cleaning-filters__select"
          >
            <option value="">Todas las fechas</option>
            {[...new Set(reports.map((r) => r.fecha))].map((fecha) => (
              <option key={fecha} value={fecha}>
                {new Date(fecha).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </option>
            ))}
          </select>

          <select
            value={filters.lugar}
            onChange={(e) => handleFilterChange('lugar', e.target.value)}
            className="cleaning-filters__select"
          >
            <option value="">Todas las lugars</option>
            {uniqueLugars.map((lugar) => (
              <option key={lugar} value={lugar}>
                {lugar}
              </option>
            ))}
          </select>

          <select
            value={filters.area}
            onChange={(e) => handleFilterChange('area', e.target.value)}
            className="cleaning-filters__select"
          >
            <option value="">Todas las áreas</option>
            {uniqueAreas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

          {(filters.fecha || filters.lugar || filters.area || filters.search) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setFilters({ fecha: '', lugar: '', area: '', search: '' })
              }
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      </Card>

      {/* Estadísticas */}
      <div className="cleaning-reports__stats">
        <div className="cleaning-stat">
          <FileText size={24} style={{ color: 'var(--color-success)' }} />
          <div>
            <div className="cleaning-stat__value">{reports.length}</div>
            <div className="cleaning-stat__label">Total Reportes</div>
          </div>
        </div>
        <div className="cleaning-stat">
          <FileText size={24} color="#007aff" />
          <div>
            <div className="cleaning-stat__value">{filteredReports.length}</div>
            <div className="cleaning-stat__label">Filtrados</div>
          </div>
        </div>
      </div>

      {/* Tabla de reportes */}
      <Card title="Reportes de Limpieza">
        {filteredReports.length === 0 ? (
          <div className="cleaning-reports__empty">
            <FileText size={48} color="#ccc" />
            <p>No se encontraron reportes</p>
          </div>
        ) : (
          <div className="cleaning-table-wrapper">
            <table className="cleaning-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Lugar</th>
                  <th>Área</th>
                  <th>Evidencias</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <div className="cleaning-table__date">
                        <div className="cleaning-table__date-day">
                          {new Date(report.fecha).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </div>
                        <div className="cleaning-table__date-time">
                          {report.hora}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="cleaning-table__lugar">{report.lugar}</div>
                    </td>
                    <td>
                      <div className="cleaning-table__area">{report.area}</div>
                    </td>
                    <td>
                      <div className="cleaning-table__photos">
                        <span className="cleaning-table__photo-badge cleaning-table__photo-badge--antes">
                          {report.fotos.antes}
                        </span>
                        <span className="cleaning-table__photo-badge cleaning-table__photo-badge--durante">
                          {report.fotos.durante}
                        </span>
                        <span className="cleaning-table__photo-badge cleaning-table__photo-badge--despues">
                          {report.fotos.despues}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="cleaning-table__actions">
                        <button
                          className="cleaning-table__action cleaning-table__action--view"
                          onClick={() => handleViewReport(report)}
                          title="Ver reporte"
                        >
                          <Eye size={16} />
                        </button>
                        {(userRole === 'admin' || userRole === 'super_admin') && (
                          <button
                            className="cleaning-table__action cleaning-table__action--delete"
                            onClick={() => handleDeleteReport(report)}
                            title="Eliminar reporte"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Detalle */}
      {showDetailModal && selectedReport && (
        <ReportDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          report={selectedReport}
        />
      )}

      {reportToDelete && (
        <ConfirmDialog
          open
          destructive
          title="¿Eliminar reporte de limpieza?"
          message={`Vas a eliminar el reporte de ${reportToDelete.lugar} · ${reportToDelete.area}. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          onConfirm={confirmDeleteReport}
          onCancel={() => setReportToDelete(null)}
        />
      )}
    </div>
  );
};

export default CleaningReports;
