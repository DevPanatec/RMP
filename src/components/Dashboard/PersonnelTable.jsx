import { Edit, Trash2, Settings, Users } from '../Icons';
import './PersonnelTable.css';

export const PersonnelTable = ({
  personnel,
  onEdit,
  onDelete,
  currentPage = 1,
  totalPages = 1,
  onPageChange
}) => {
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

  const getStatusIcon = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'activo': return '🟢';
      case 'en ruta': return '🟡';
      case 'vacaciones':
      case 'licencia':
      case 'descanso': return '⚪';
      case 'inactivo': return '🔴';
      default: return '⚪';
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

  const getRoleBadge = (puesto) => {
    if (!puesto) return 'default';
    const role = puesto.toLowerCase();
    if (role.includes('conductor') || role.includes('driver')) return 'conductor';
    if (role.includes('ayudante') || role.includes('helper')) return 'ayudante';
    if (role.includes('supervisor') || role.includes('admin')) return 'supervisor';
    return 'default';
  };

  const itemsPerPage = 8;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPersonnel = (personnel || []).slice(startIndex, endIndex);

  if (!personnel || personnel.length === 0) {
    return (
      <div className="personnel-table-container">
        <div className="empty-state">
          <div className="empty-icon"><Users size={48} /></div>
          <h4>No hay personal registrado</h4>
          <p>Comienza agregando empleados al sistema</p>
        </div>
      </div>
    );
  }

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
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentPersonnel.map(employee => (
              <tr key={employee.id}>
                <td>
                  <div className="employee-cell">
                    <div className="employee-avatar">
                      {getInitials(employee.nombre)}
                    </div>
                    <div className="employee-info">
                      <div className="employee-name">{employee.nombre}</div>
                      <div className="employee-contact">
                        {employee.telefono && <span>📞 {employee.telefono}</span>}
                        {employee.email && <span>✉️ {employee.email}</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`role-badge role-badge--${getRoleBadge(employee.puesto)}`}>
                    {employee.puesto || 'Sin puesto'}
                  </span>
                </td>
                <td>
                  <span className={`status-badge-table status-badge-table--${getStatusColor(employee.estado)}`}>
                    {getStatusIcon(employee.estado)} {employee.estado}
                  </span>
                </td>
                <td>
                  <span className="assignment-info">
                    {employee.asignacion || 'Sin asignar'}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      className="action-btn action-btn--edit"
                      onClick={() => onEdit(employee)}
                      title="Editar"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="action-btn action-btn--delete"
                      onClick={() => onDelete(employee.id)}
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
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
          >
            ← Anterior
          </button>

          <span className="pagination-info">
            Página {currentPage} de {totalPages}
          </span>

          <button
            className="pagination-btn"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
};

export default PersonnelTable;
