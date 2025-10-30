import { useState } from 'react';
import { usePersonnel } from '../../context/PersonnelContext';
import { Users, Plus, Edit, Trash2, Phone, Mail, Briefcase, CheckCircle, X } from '../Icons';
import './PersonnelComponent.css';

const PersonnelComponent = ({ userType = 'admin' }) => {
  const { getAllEmployees, loading, addEmployee, updateEmployee, deleteEmployee } = usePersonnel();
  const personnel = getAllEmployees(); // Convert object to array
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({
    nombre: '',
    puesto: '',
    telefono: '',
    email: '',
    estado: 'Activo'
  });

  const handleOpenModal = (employee = null) => {
    if (employee) {
      setSelectedEmployee(employee);
      setEmployeeForm({
        nombre: employee.nombre || '',
        puesto: employee.puesto || '',
        telefono: employee.telefono || '',
        email: employee.email || '',
        estado: employee.estado || 'Activo'
      });
    } else {
      setSelectedEmployee(null);
      setEmployeeForm({
        nombre: '',
        puesto: '',
        telefono: '',
        email: '',
        estado: 'Activo'
      });
    }
    setShowEmployeeModal(true);
  };

  const handleCloseModal = () => {
    setShowEmployeeModal(false);
    setSelectedEmployee(null);
    setEmployeeForm({
      nombre: '',
      puesto: '',
      telefono: '',
      email: '',
      estado: 'Activo'
    });
  };

  const handleInputChange = (field, value) => {
    setEmployeeForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!employeeForm.nombre.trim()) {
      alert('El nombre es requerido');
      return;
    }

    if (selectedEmployee) {
      await updateEmployee(selectedEmployee.id, employeeForm);
    } else {
      await addEmployee(employeeForm);
    }

    handleCloseModal();
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este empleado?')) {
      await deleteEmployee(id);
    }
  };

  const activePersonnel = personnel.filter(p => p.estado === 'Activo');
  const inactivePersonnel = personnel.filter(p => p.estado !== 'Activo');

  return (
    <div className="personnel-container">
      <div className="personnel-header">
        <div className="personnel-title">
          <h2><Users size={24} /> Gestión de Personal</h2>
          <p>Administra el personal de la empresa</p>
        </div>
        <button className="btn btn--primary" onClick={() => handleOpenModal()}>
          <Plus size={16} /> Agregar Empleado
        </button>
      </div>

      {loading ? (
        <div className="personnel-loading">
          <div className="spinner"></div>
          <p>Cargando personal...</p>
        </div>
      ) : (
        <div className="personnel-content">
          {/* Personal Activo */}
          <div className="personnel-section">
            <h3>Personal Activo ({activePersonnel.length})</h3>
            <div className="personnel-grid">
              {activePersonnel.map(employee => (
                <div key={employee.id} className="employee-card">
                  <div className="employee-header">
                    <div className="employee-info">
                      <h4>{employee.nombre}</h4>
                      <span className="employee-role">
                        <Briefcase size={14} /> {employee.puesto || 'Sin puesto'}
                      </span>
                    </div>
                    <span className="status-badge status-badge--success">
                      <CheckCircle size={14} /> Activo
                    </span>
                  </div>
                  
                  <div className="employee-details">
                    {employee.telefono && (
                      <div className="employee-detail">
                        <Phone size={14} />
                        <span>{employee.telefono}</span>
                      </div>
                    )}
                    {employee.email && (
                      <div className="employee-detail">
                        <Mail size={14} />
                        <span>{employee.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="employee-actions">
                    <button 
                      className="btn btn--sm btn--outline"
                      onClick={() => handleOpenModal(employee)}
                    >
                      <Edit size={14} /> Editar
                    </button>
                    <button 
                      className="btn btn--sm btn--danger"
                      onClick={() => handleDelete(employee.id)}
                    >
                      <Trash2 size={14} /> Eliminar
                    </button>
                  </div>
                </div>
              ))}

              {activePersonnel.length === 0 && (
                <div className="empty-state">
                  <Users size={48} />
                  <h4>No hay personal activo</h4>
                  <p>Agrega empleados para comenzar</p>
                </div>
              )}
            </div>
          </div>

          {/* Personal Inactivo */}
          {inactivePersonnel.length > 0 && (
            <div className="personnel-section">
              <h3>Personal Inactivo ({inactivePersonnel.length})</h3>
              <div className="personnel-grid">
                {inactivePersonnel.map(employee => (
                  <div key={employee.id} className="employee-card employee-card--inactive">
                    <div className="employee-header">
                      <div className="employee-info">
                        <h4>{employee.nombre}</h4>
                        <span className="employee-role">
                          <Briefcase size={14} /> {employee.puesto || 'Sin puesto'}
                        </span>
                      </div>
                      <span className="status-badge status-badge--inactive">
                        Inactivo
                      </span>
                    </div>
                    
                    <div className="employee-details">
                      {employee.telefono && (
                        <div className="employee-detail">
                          <Phone size={14} />
                          <span>{employee.telefono}</span>
                        </div>
                      )}
                      {employee.email && (
                        <div className="employee-detail">
                          <Mail size={14} />
                          <span>{employee.email}</span>
                        </div>
                      )}
                    </div>

                    <div className="employee-actions">
                      <button 
                        className="btn btn--sm btn--outline"
                        onClick={() => handleOpenModal(employee)}
                      >
                        <Edit size={14} /> Editar
                      </button>
                      <button 
                        className="btn btn--sm btn--danger"
                        onClick={() => handleDelete(employee.id)}
                      >
                        <Trash2 size={14} /> Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal para agregar/editar empleado */}
      {showEmployeeModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {selectedEmployee ? (
                  <><Edit size={20} /> Editar Empleado</>
                ) : (
                  <><Plus size={20} /> Nuevo Empleado</>
                )}
              </h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>Nombre Completo *</label>
                <input
                  type="text"
                  value={employeeForm.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>

              <div className="form-group">
                <label>Puesto</label>
                <input
                  type="text"
                  value={employeeForm.puesto}
                  onChange={(e) => handleInputChange('puesto', e.target.value)}
                  placeholder="Ej: Conductor, Supervisor, etc."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    value={employeeForm.telefono}
                    onChange={(e) => handleInputChange('telefono', e.target.value)}
                    placeholder="+507 6123-4567"
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={employeeForm.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="empleado@rmp.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Estado</label>
                <select
                  value={employeeForm.estado}
                  onChange={(e) => handleInputChange('estado', e.target.value)}
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                  <option value="Vacaciones">Vacaciones</option>
                  <option value="Licencia">Licencia</option>
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn--outline" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary">
                  <CheckCircle size={16} /> {selectedEmployee ? 'Actualizar' : 'Crear'} Empleado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonnelComponent;
