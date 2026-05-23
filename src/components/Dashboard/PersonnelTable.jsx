import { Edit, Trash2, Settings, Users, Phone, IdCard, ChevronLeft, ChevronRight } from '../Icons';
import { EmptyState, SkeletonRow, SortableHeader } from '../UI';
import useSortableData from '../../hooks/useSortableData';
import './PersonnelTable.css';

export const PersonnelTable = ({
  personnel,
  loading = false,
  onEdit,
  onDelete,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  userRole = 'admin'
}) => {
  const canWrite = userRole === 'admin' || userRole === 'super_admin';
  const getStatusColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'activo': return 'success';
      case 'en ruta': return 'warning';
      case 'vacaciones':
      case 'licencia':
      case 'descanso': return 'info';
      case 'inactivo': return 'default';
      default: return 'default';
    }
  };

  const getStatusDotClass = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'activo': return 'status-dot--success';
      case 'en ruta': return 'status-dot--warning';
      case 'vacaciones':
      case 'licencia':
      case 'descanso': return 'status-dot--info';
      case 'inactivo': return 'status-dot--error';
      default: return 'status-dot--muted';
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (cargo) => {
    if (!cargo) return 'default';
    const role = cargo.toLowerCase();
    if (role.includes('conductor') || role.includes('driver')) return 'conductor';
    if (role.includes('ayudante') || role.includes('helper') || role.includes('recolector')) return 'ayudante';
    if (role.includes('supervisor') || role.includes('admin')) return 'supervisor';
    return 'default';
  };

  const { sortedData, sortKey, sortDir, requestSort } = useSortableData(personnel || [], 'nombre');

  const itemsPerPage = 8;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPersonnel = sortedData.slice(startIndex, endIndex);

  if (loading && (!personnel || personnel.length === 0)) {
    return (
      <div className="personnel-table-container">
        <div className="personnel-table-wrapper">
          <table className="personnel-table">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Puesto</th>
                <th>Estado</th>
                <th>Asignación</th>
                {canWrite && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={canWrite ? 5 : 4} />)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!personnel || personnel.length === 0) {
    return (
      <div className="personnel-table-container">
        <EmptyState
          icon={Users}
          title="No hay personal registrado"
          description="Comienza agregando empleados al sistema."
        />
      </div>
    );
  }

  return (
    <div className="personnel-table-container">
      <div className="personnel-table-wrapper">
        <table className="personnel-table">
          <thead>
            <tr>
              <SortableHeader column="nombre" label="Empleado" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              <SortableHeader column="cargo" label="Puesto" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              <SortableHeader column="activo" label="Estado" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              <SortableHeader column="asignacion" label="Asignación" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              {canWrite && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {currentPersonnel.map(employee => (
              <tr key={employee._id || employee.id}>
                <td>
                  <div className="employee-cell">
                    <div className="employee-avatar">
                      {getInitials(`${employee.nombre} ${employee.apellido || ''}`)}
                    </div>
                    <div className="employee-info">
                      <div className="employee-name">
                        {employee.nombre} {employee.apellido || ''}
                      </div>
                      <div className="employee-contact">
                        {employee.telefono && (
                          <span><Phone size={12} aria-hidden="true" /> {employee.telefono}</span>
                        )}
                        {employee.cedula && (
                          <span><IdCard size={12} aria-hidden="true" /> {employee.cedula}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`role-badge role-badge--${getRoleBadge(employee.cargo || employee.puesto)}`}>
                    {employee.cargo || employee.puesto || 'Sin Puesto'}
                  </span>
                </td>
                <td>
                  <span className={`status-badge-table status-badge-table--${getStatusColor(employee.activo ? 'Activo' : 'Inactivo')}`}>
                    <span className={`status-dot ${getStatusDotClass(employee.activo ? 'Activo' : 'Inactivo')}`} aria-hidden="true" />
                    {employee.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <span className="assignment-info">
                    {employee.asignacion || 'Sin asignar'}
                  </span>
                </td>
                {canWrite && (
                  <td>
                    <div className="table-actions">
                      <button
                        className="action-btn action-btn--edit"
                        onClick={() => onEdit(employee)}
                        title="Editar"
                        aria-label="Editar empleado"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="action-btn action-btn--delete"
                        onClick={() => onDelete(employee._id || employee.id)}
                        title="Eliminar"
                        aria-label="Eliminar empleado"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="table-pagination">
          <button
            className="pagination-btn"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Página anterior"
          >
            <ChevronLeft size={14} aria-hidden="true" /> Anterior
          </button>

          <span className="pagination-info">
            Página {currentPage} de {totalPages}
          </span>

          <button
            className="pagination-btn"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Página siguiente"
          >
            Siguiente <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
};

export default PersonnelTable;
