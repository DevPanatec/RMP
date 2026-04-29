import { useState, useMemo } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  Briefcase, Plus, Edit3, Trash2, Users as UsersIcon, X, Save,
  CheckCircle, AlertTriangle, UserPlus, Mail, Lock, Phone
} from '../Icons';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import './ProyectosComponent.css';

const initialProjectForm = {
  nombre: '',
  cliente: '',
  descripcion: '',
  fecha_inicio: '',
  fecha_fin: '',
};

const initialUserForm = {
  email: '',
  password: '',
  nombre_completo: '',
  telefono: '',
  documento: '',
};

const ProyectosComponent = () => {
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();
  const isSuperAdmin = user?.tipo === 'super_admin';
  const orgIdForCreate = isSuperAdmin ? currentOrgId : (user?.organizacion_id ?? null);

  const proyectos = useQuery(
    api.proyectos.list,
    currentOrgId ? { organizacion_id: currentOrgId } : {}
  ) ?? [];
  const addProyecto = useMutation(api.proyectos.add);
  const updateProyecto = useMutation(api.proyectos.update);
  const removeProyecto = useMutation(api.proyectos.remove);
  const createUserAction = useAction(api.perfiles.createUserWithClerk);
  const setUserProyecto = useMutation(api.perfiles.setProyecto);

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectForm, setProjectForm] = useState(initialProjectForm);

  const [showUserModal, setShowUserModal] = useState(false);
  const [userTargetProject, setUserTargetProject] = useState(null);
  const [userForm, setUserForm] = useState(initialUserForm);

  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const enterprisesData = useQuery(
    api.perfiles.listEnterprisesByProyecto,
    selectedProjectId ? { proyecto_id: selectedProjectId } : 'skip'
  );
  const enterprises = enterprisesData ?? [];

  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);

  const proyectosOrdenados = useMemo(
    () => [...proyectos].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [proyectos]
  );

  const flash = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3500);
  };

  const openCreateProject = () => {
    setEditingProject(null);
    setProjectForm(initialProjectForm);
    setShowProjectModal(true);
  };

  const openEditProject = (p) => {
    setEditingProject(p);
    setProjectForm({
      nombre: p.nombre || '',
      cliente: p.cliente || '',
      descripcion: p.descripcion || '',
      fecha_inicio: p.fecha_inicio || '',
      fecha_fin: p.fecha_fin || '',
    });
    setShowProjectModal(true);
  };

  const submitProject = async (e) => {
    e.preventDefault();
    if (!projectForm.nombre.trim()) {
      flash('error', 'El nombre es requerido');
      return;
    }
    if (!editingProject && isSuperAdmin && !orgIdForCreate) {
      flash('error', 'Selecciona una organización en el header antes de crear');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        nombre: projectForm.nombre.trim(),
        cliente: projectForm.cliente.trim() || undefined,
        descripcion: projectForm.descripcion.trim() || undefined,
        fecha_inicio: projectForm.fecha_inicio || undefined,
        fecha_fin: projectForm.fecha_fin || undefined,
      };
      if (editingProject) {
        await updateProyecto({ id: editingProject._id, ...payload });
        flash('ok', 'Proyecto actualizado');
      } else {
        await addProyecto({
          ...payload,
          ...(isSuperAdmin && orgIdForCreate ? { organizacion_id: orgIdForCreate } : {}),
        });
        flash('ok', 'Proyecto creado');
      }
      setShowProjectModal(false);
    } catch (err) {
      flash('error', err.message || 'Error al guardar proyecto');
    } finally {
      setBusy(false);
    }
  };

  const toggleActivo = async (p) => {
    try {
      await updateProyecto({ id: p._id, activo: !p.activo });
      flash('ok', p.activo ? 'Proyecto archivado' : 'Proyecto reactivado');
    } catch (err) {
      flash('error', err.message);
    }
  };

  const deleteProject = async (p) => {
    if (!window.confirm(`¿Eliminar proyecto "${p.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await removeProyecto({ id: p._id });
      flash('ok', 'Proyecto eliminado');
      if (selectedProjectId === p._id) setSelectedProjectId(null);
    } catch (err) {
      flash('error', err.message);
    }
  };

  const openCreateEnterprise = (p) => {
    setUserTargetProject(p);
    setUserForm(initialUserForm);
    setShowUserModal(true);
  };

  const submitEnterprise = async (e) => {
    e.preventDefault();
    if (!userForm.email || !userForm.password || !userForm.nombre_completo) {
      flash('error', 'Email, contraseña y nombre son requeridos');
      return;
    }
    if (userForm.password.length < 8) {
      flash('error', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setBusy(true);
    try {
      await createUserAction({
        email: userForm.email.trim(),
        password: userForm.password,
        nombre_completo: userForm.nombre_completo.trim(),
        tipo_usuario: 'enterprise',
        telefono: userForm.telefono.trim() || undefined,
        documento: userForm.documento.trim() || undefined,
        organizacion_id: userTargetProject.organizacion_id,
        proyecto_id: userTargetProject._id,
      });
      flash('ok', `Enterprise creado para "${userTargetProject.nombre}"`);
      setShowUserModal(false);
    } catch (err) {
      flash('error', err.message || 'Error al crear usuario enterprise');
    } finally {
      setBusy(false);
    }
  };

  const unlinkEnterprise = async (perfilId) => {
    if (!window.confirm('¿Desvincular este enterprise del proyecto?')) return;
    try {
      await setUserProyecto({ perfil_id: perfilId, proyecto_id: undefined });
      flash('ok', 'Enterprise desvinculado');
    } catch (err) {
      flash('error', err.message);
    }
  };

  return (
    <div className="proyectos-component">
      <div className="proyectos-header">
        <div className="proyectos-header-text">
          <Briefcase size={24} />
          <div>
            <h2>Proyectos</h2>
            <p>Gestión de proyectos y asignación de Enterprises</p>
          </div>
        </div>
        <button className="btn-primary" onClick={openCreateProject}>
          <Plus size={16} /> Nuevo proyecto
        </button>
      </div>

      {feedback && (
        <div className={`proyectos-feedback proyectos-feedback--${feedback.type}`}>
          {feedback.type === 'ok' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          <span>{feedback.msg}</span>
        </div>
      )}

      <div className="proyectos-grid">
        <div className="proyectos-list">
          {proyectosOrdenados.length === 0 && (
            <div className="proyectos-empty">No hay proyectos creados todavía.</div>
          )}
          <table className="proyectos-table">
            <thead>
              <tr>
                <th>Proyecto</th>
                <th>Cliente</th>
                <th>Periodo</th>
                <th>Estado</th>
                <th className="proyectos-th-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proyectosOrdenados.map((p) => (
                <tr
                  key={p._id}
                  className={selectedProjectId === p._id ? 'proyectos-row-active' : ''}
                  onClick={() => setSelectedProjectId(p._id)}
                >
                  <td>
                    <div className="proyectos-name">{p.nombre}</div>
                    {p.descripcion && <div className="proyectos-desc">{p.descripcion}</div>}
                  </td>
                  <td>{p.cliente || '—'}</td>
                  <td className="proyectos-period">
                    {p.fecha_inicio || '—'} → {p.fecha_fin || '—'}
                  </td>
                  <td>
                    <span className={`proyectos-badge ${p.activo ? 'proyectos-badge--ok' : 'proyectos-badge--off'}`}>
                      {p.activo ? 'Activo' : 'Archivado'}
                    </span>
                  </td>
                  <td className="proyectos-actions" onClick={(e) => e.stopPropagation()}>
                    <button title="Crear enterprise" onClick={() => openCreateEnterprise(p)}>
                      <UserPlus size={16} />
                    </button>
                    <button title="Editar" onClick={() => openEditProject(p)}>
                      <Edit3 size={16} />
                    </button>
                    <button title={p.activo ? 'Archivar' : 'Reactivar'} onClick={() => toggleActivo(p)}>
                      {p.activo ? <X size={16} /> : <CheckCircle size={16} />}
                    </button>
                    <button title="Eliminar" className="proyectos-btn-danger" onClick={() => deleteProject(p)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="proyectos-side">
          <div className="proyectos-side-header">
            <UsersIcon size={18} />
            <h3>Enterprises del proyecto</h3>
          </div>
          {!selectedProjectId && (
            <p className="proyectos-side-empty">Selecciona un proyecto para ver sus enterprises.</p>
          )}
          {selectedProjectId && (
            <>
              {enterprises.length === 0 && (
                <p className="proyectos-side-empty">Sin enterprises asignados.</p>
              )}
              <ul className="proyectos-enterprise-list">
                {enterprises.map((e) => (
                  <li key={e._id}>
                    <div>
                      <div className="proyectos-enterprise-name">{e.nombre_completo}</div>
                      <div className="proyectos-enterprise-email">{e.email}</div>
                    </div>
                    <button
                      title="Desvincular"
                      className="proyectos-btn-danger"
                      onClick={() => unlinkEnterprise(e._id)}
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              {(() => {
                const proj = proyectos.find((p) => p._id === selectedProjectId);
                if (!proj) return null;
                return (
                  <button className="btn-secondary proyectos-add-enterprise" onClick={() => openCreateEnterprise(proj)}>
                    <UserPlus size={14} /> Agregar enterprise
                  </button>
                );
              })()}
            </>
          )}
        </aside>
      </div>

      {showProjectModal && (
        <div className="proyectos-overlay" onClick={() => !busy && setShowProjectModal(false)}>
          <div className="proyectos-modal" onClick={(e) => e.stopPropagation()}>
            <div className="proyectos-modal-header">
              <h3>{editingProject ? 'Editar proyecto' : 'Nuevo proyecto'}</h3>
              <button onClick={() => setShowProjectModal(false)} disabled={busy}><X size={18} /></button>
            </div>
            <form onSubmit={submitProject} className="proyectos-form">
              <label>
                <span>Nombre *</span>
                <input
                  type="text"
                  value={projectForm.nombre}
                  onChange={(e) => setProjectForm({ ...projectForm, nombre: e.target.value })}
                  required
                  autoFocus
                />
              </label>
              <label>
                <span>Cliente</span>
                <input
                  type="text"
                  value={projectForm.cliente}
                  onChange={(e) => setProjectForm({ ...projectForm, cliente: e.target.value })}
                />
              </label>
              <label>
                <span>Descripción</span>
                <textarea
                  value={projectForm.descripcion}
                  onChange={(e) => setProjectForm({ ...projectForm, descripcion: e.target.value })}
                  rows={3}
                />
              </label>
              <div className="proyectos-form-row">
                <label>
                  <span>Fecha inicio</span>
                  <input
                    type="date"
                    value={projectForm.fecha_inicio}
                    onChange={(e) => setProjectForm({ ...projectForm, fecha_inicio: e.target.value })}
                  />
                </label>
                <label>
                  <span>Fecha fin</span>
                  <input
                    type="date"
                    value={projectForm.fecha_fin}
                    onChange={(e) => setProjectForm({ ...projectForm, fecha_fin: e.target.value })}
                  />
                </label>
              </div>
              <div className="proyectos-form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowProjectModal(false)} disabled={busy}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={busy}>
                  <Save size={16} /> {editingProject ? 'Guardar cambios' : 'Crear proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUserModal && userTargetProject && (
        <div className="proyectos-overlay" onClick={() => !busy && setShowUserModal(false)}>
          <div className="proyectos-modal" onClick={(e) => e.stopPropagation()}>
            <div className="proyectos-modal-header">
              <h3>Nuevo Enterprise · {userTargetProject.nombre}</h3>
              <button onClick={() => setShowUserModal(false)} disabled={busy}><X size={18} /></button>
            </div>
            <form onSubmit={submitEnterprise} className="proyectos-form">
              <label>
                <span><Mail size={14} /> Email *</span>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  required
                  autoFocus
                />
              </label>
              <label>
                <span><Lock size={14} /> Contraseña *</span>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  minLength={8}
                  required
                  placeholder="Mín. 8 caracteres, mayús, núm, símbolo"
                />
              </label>
              <label>
                <span>Nombre completo *</span>
                <input
                  type="text"
                  value={userForm.nombre_completo}
                  onChange={(e) => setUserForm({ ...userForm, nombre_completo: e.target.value })}
                  required
                />
              </label>
              <div className="proyectos-form-row">
                <label>
                  <span><Phone size={14} /> Teléfono</span>
                  <input
                    type="tel"
                    value={userForm.telefono}
                    onChange={(e) => setUserForm({ ...userForm, telefono: e.target.value })}
                  />
                </label>
                <label>
                  <span>Cédula</span>
                  <input
                    type="text"
                    value={userForm.documento}
                    onChange={(e) => setUserForm({ ...userForm, documento: e.target.value })}
                  />
                </label>
              </div>
              <div className="proyectos-form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowUserModal(false)} disabled={busy}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={busy}>
                  <UserPlus size={16} /> {busy ? 'Creando...' : 'Crear Enterprise'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProyectosComponent;
