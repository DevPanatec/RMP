import { useState } from 'react';
import { usePersonnel } from '../../context/PersonnelContext';
import { useAuth } from '../../context/AuthContext';
import { Users, Plus, Edit, Trash2, Phone, Mail, Briefcase, CheckCircle, X, Radio, UserPlus, Shield, Lock } from '../Icons';
import './PersonnelComponent.css';

const PersonnelComponent = ({ userType = 'admin' }) => {
  const { getAllEmployees, loading, addEmployee, updateEmployee, deleteEmployee } = usePersonnel();
  const { signUp } = useAuth();
  const personnel = getAllEmployees();

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({
    nombre: '',
    puesto: '',
    telefono: '',
    email: '',
    estado: 'Activo'
  });

  // Profile creation states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    email: '',
    password: '',
    nombre_completo: '',
    tipo_usuario: 'conductor',
    telefono: '',
    documento: ''
  });
  const [profileStatus, setProfileStatus] = useState({ type: '', message: '' });
  const [creatingProfile, setCreatingProfile] = useState(false);

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

  // Profile creation handlers
  const handleOpenProfileModal = () => {
    setProfileForm({
      email: '',
      password: '',
      nombre_completo: '',
      tipo_usuario: 'conductor',
      telefono: '',
      documento: ''
    });
    setProfileStatus({ type: '', message: '' });
    setShowProfileModal(true);
  };

  const handleCloseProfileModal = () => {
    setShowProfileModal(false);
    setProfileForm({
      email: '',
      password: '',
      nombre_completo: '',
      tipo_usuario: 'conductor',
      telefono: '',
      documento: ''
    });
    setProfileStatus({ type: '', message: '' });
  };

  const handleProfileInputChange = (field, value) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
    setProfileStatus({ type: '', message: '' });
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    setCreatingProfile(true);
    setProfileStatus({ type: '', message: '' });

    try {
      // Validate required fields
      if (!profileForm.email || !profileForm.password || !profileForm.nombre_completo) {
        setProfileStatus({
          type: 'error',
          message: 'Email, contraseña y nombre completo son requeridos'
        });
        setCreatingProfile(false);
        return;
      }

      // Validate password strength
      if (profileForm.password.length < 8) {
        setProfileStatus({
          type: 'error',
          message: 'La contraseña debe tener al menos 8 caracteres'
        });
        setCreatingProfile(false);
        return;
      }

      // Create Clerk account + Convex profile
      await signUp(profileForm.email, profileForm.password, {
        nombre_completo: profileForm.nombre_completo,
        tipo_usuario: profileForm.tipo_usuario,
        telefono: profileForm.telefono || undefined,
        documento: profileForm.documento || undefined
      });

      setProfileStatus({
        type: 'success',
        message: `Perfil de ${profileForm.tipo_usuario} creado exitosamente`
      });

      // Close modal after 2 seconds
      setTimeout(() => {
        handleCloseProfileModal();
      }, 2000);

    } catch (error) {
      console.error('Error creando perfil:', error);
      setProfileStatus({
        type: 'error',
        message: error.message || 'Error al crear el perfil. Verifica que el email no esté en uso.'
      });
    } finally {
      setCreatingProfile(false);
    }
  };

  const activePersonnel = personnel.filter(p => p.estado === 'Activo');
  const inactivePersonnel = personnel.filter(p => p.estado !== 'Activo');

  return (
    <div className="personnel-v2">
      {/* Header */}
      <div className="personnel-header-v2">
        <div className="personnel-header-info">
          <div className="personnel-header-icon">
            <Users size={28} />
          </div>
          <div className="personnel-header-text">
            <h2>Gestión de Personal</h2>
            <p>Administra el equipo de trabajo</p>
          </div>
        </div>

        <div className="personnel-header-actions">
          <button className="btn-add-v2" onClick={() => handleOpenModal()}>
            <Plus size={18} />
            Agregar Empleado
          </button>
          <button className="btn-create-profile" onClick={handleOpenProfileModal}>
            <UserPlus size={18} />
            Crear Perfil
          </button>
        </div>

        <div className="personnel-header-stats">
          <div className="personnel-stat-pill success">
            <span className="stat-number">{activePersonnel.length}</span>
            <span className="stat-label">Activos</span>
          </div>
          <div className="personnel-stat-pill">
            <span className="stat-number">{inactivePersonnel.length}</span>
            <span className="stat-label">Inactivos</span>
          </div>
          <div className="personnel-stat-pill info">
            <span className="stat-number">{personnel.length}</span>
            <span className="stat-label">Total</span>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="personnel-loading-v2">
          <div className="loading-spinner"></div>
          <p>Cargando personal...</p>
        </div>
      ) : (
        <div className="personnel-content-v2">
          {/* Active Personnel */}
          {activePersonnel.length > 0 && (
            <div className="personnel-section-v2">
              <div className="section-header">
                <div className="section-indicator active"></div>
                <h3>Personal Activo</h3>
                <span className="section-count">{activePersonnel.length}</span>
              </div>
              <div className="personnel-grid-v2">
                {activePersonnel.map(employee => (
                  <div key={employee.id} className="employee-card-v2">
                    <div className="employee-card-header">
                      <div className="employee-avatar">
                        {employee.nombre?.charAt(0)?.toUpperCase() || 'E'}
                      </div>
                      <div className="employee-card-actions">
                        <button 
                          className="btn-icon-action"
                          onClick={() => handleOpenModal(employee)}
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          className="btn-icon-action danger"
                          onClick={() => handleDelete(employee.id)}
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="employee-card-body">
                      <h4 className="employee-name">{employee.nombre}</h4>
                      <div className="employee-role">
                        <Briefcase size={14} />
                        <span>{employee.puesto || 'Sin puesto asignado'}</span>
                      </div>

                      <div className="employee-details-v2">
                        {employee.telefono && (
                          <div className="employee-detail-item">
                            <Phone size={14} />
                            <span>{employee.telefono}</span>
                          </div>
                        )}
                        {employee.email && (
                          <div className="employee-detail-item">
                            <Mail size={14} />
                            <span>{employee.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="employee-card-footer">
                      <div className="status-badge-v2 active">
                        <Radio size={12} />
                        Activo
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inactive Personnel */}
          {inactivePersonnel.length > 0 && (
            <div className="personnel-section-v2">
              <div className="section-header">
                <div className="section-indicator inactive"></div>
                <h3>Personal Inactivo</h3>
                <span className="section-count">{inactivePersonnel.length}</span>
              </div>
              <div className="personnel-grid-v2">
                {inactivePersonnel.map(employee => (
                  <div key={employee.id} className="employee-card-v2 inactive">
                    <div className="employee-card-header">
                      <div className="employee-avatar inactive">
                        {employee.nombre?.charAt(0)?.toUpperCase() || 'E'}
                      </div>
                      <div className="employee-card-actions">
                        <button 
                          className="btn-icon-action"
                          onClick={() => handleOpenModal(employee)}
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          className="btn-icon-action danger"
                          onClick={() => handleDelete(employee.id)}
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="employee-card-body">
                      <h4 className="employee-name">{employee.nombre}</h4>
                      <div className="employee-role">
                        <Briefcase size={14} />
                        <span>{employee.puesto || 'Sin puesto asignado'}</span>
                      </div>

                      <div className="employee-details-v2">
                        {employee.telefono && (
                          <div className="employee-detail-item">
                            <Phone size={14} />
                            <span>{employee.telefono}</span>
                          </div>
                        )}
                        {employee.email && (
                          <div className="employee-detail-item">
                            <Mail size={14} />
                            <span>{employee.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="employee-card-footer">
                      <div className="status-badge-v2 inactive">
                        {employee.estado}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {personnel.length === 0 && (
            <div className="personnel-empty-state">
              <div className="empty-icon">
                <Users size={48} />
              </div>
              <h3>No hay personal registrado</h3>
              <p>Agrega empleados para comenzar a gestionar tu equipo de trabajo</p>
              <button className="btn-add-v2" onClick={() => handleOpenModal()}>
                <Plus size={18} />
                Agregar Empleado
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showEmployeeModal && (
        <div className="modal-overlay-v2" onClick={handleCloseModal}>
          <div className="modal-content-v2" onClick={e => e.stopPropagation()}>
            <div className="modal-header-v2">
              <h2>{selectedEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}</h2>
              <button className="btn-close-v2" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form-v2">
              <div className="form-group-v2">
                <label>Nombre Completo</label>
                <input
                  type="text"
                  value={employeeForm.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>

              <div className="form-group-v2">
                <label>Puesto / Cargo</label>
                <input
                  type="text"
                  value={employeeForm.puesto}
                  onChange={(e) => handleInputChange('puesto', e.target.value)}
                  placeholder="Ej: Conductor, Supervisor"
                />
              </div>

              <div className="form-divider-v2">
                <Phone size={16} />
                Información de Contacto
              </div>

              <div className="form-row-v2">
                <div className="form-group-v2">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    value={employeeForm.telefono}
                    onChange={(e) => handleInputChange('telefono', e.target.value)}
                    placeholder="+507 6123-4567"
                  />
                </div>

                <div className="form-group-v2">
                  <label>Email</label>
                  <input
                    type="email"
                    value={employeeForm.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="empleado@rmp.com"
                  />
                </div>
              </div>

              <div className="form-group-v2">
                <label>Estado</label>
                <select
                  value={employeeForm.estado}
                  onChange={(e) => handleInputChange('estado', e.target.value)}
                  className="select-v2"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                  <option value="Vacaciones">Vacaciones</option>
                  <option value="Licencia">Licencia</option>
                </select>
              </div>

              <div className="modal-actions-v2">
                <button type="button" className="btn-secondary-v2" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary-v2">
                  <CheckCircle size={16} />
                  {selectedEmployee ? 'Actualizar' : 'Crear'} Empleado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Creation Modal */}
      {showProfileModal && (
        <div className="modal-overlay-v2" onClick={handleCloseProfileModal}>
          <div className="modal-content-v2 modal-profile" onClick={e => e.stopPropagation()}>
            <div className="modal-header-v2">
              <div className="modal-header-title">
                <Shield size={24} />
                <h2>Crear Perfil de Usuario</h2>
              </div>
              <button className="btn-close-v2" onClick={handleCloseProfileModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProfile} className="modal-form-v2">
              {/* Status Message */}
              {profileStatus.message && (
                <div className={`profile-status ${profileStatus.type}`}>
                  {profileStatus.type === 'success' ? <CheckCircle size={16} /> : <X size={16} />}
                  <span>{profileStatus.message}</span>
                </div>
              )}

              <div className="form-divider-v2">
                <Mail size={16} />
                Credenciales de Acceso
              </div>

              <div className="form-group-v2">
                <label>Email *</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => handleProfileInputChange('email', e.target.value)}
                  placeholder="usuario@rmp.com"
                  required
                  disabled={creatingProfile}
                />
              </div>

              <div className="form-group-v2">
                <label>Contraseña *</label>
                <input
                  type="password"
                  value={profileForm.password}
                  onChange={(e) => handleProfileInputChange('password', e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  disabled={creatingProfile}
                  minLength={8}
                />
                <small className="form-hint">
                  Debe contener mayúsculas, minúsculas, números y símbolos
                </small>
              </div>

              <div className="form-divider-v2">
                <Users size={16} />
                Información Personal
              </div>

              <div className="form-group-v2">
                <label>Nombre Completo *</label>
                <input
                  type="text"
                  value={profileForm.nombre_completo}
                  onChange={(e) => handleProfileInputChange('nombre_completo', e.target.value)}
                  placeholder="Ej: Juan Carlos Pérez"
                  required
                  disabled={creatingProfile}
                />
              </div>

              <div className="form-group-v2">
                <label>Tipo de Usuario *</label>
                <select
                  value={profileForm.tipo_usuario}
                  onChange={(e) => handleProfileInputChange('tipo_usuario', e.target.value)}
                  className="select-v2"
                  required
                  disabled={creatingProfile}
                >
                  <option value="conductor">Conductor</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="form-row-v2">
                <div className="form-group-v2">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    value={profileForm.telefono}
                    onChange={(e) => handleProfileInputChange('telefono', e.target.value)}
                    placeholder="+507 6123-4567"
                    disabled={creatingProfile}
                  />
                </div>

                <div className="form-group-v2">
                  <label>Documento / Cédula</label>
                  <input
                    type="text"
                    value={profileForm.documento}
                    onChange={(e) => handleProfileInputChange('documento', e.target.value)}
                    placeholder="8-123-4567"
                    disabled={creatingProfile}
                  />
                </div>
              </div>

              <div className="modal-actions-v2">
                <button
                  type="button"
                  className="btn-secondary-v2"
                  onClick={handleCloseProfileModal}
                  disabled={creatingProfile}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary-v2"
                  disabled={creatingProfile}
                >
                  {creatingProfile ? (
                    <>
                      <div className="spinner-small"></div>
                      Creando...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Crear Perfil
                    </>
                  )}
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
