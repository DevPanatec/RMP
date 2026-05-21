import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  Building, Plus, Edit3, X, Save, CheckCircle, AlertTriangle,
  Mail, Phone, Globe, Power
} from '../Icons';
import { ConfirmDialog } from '../UI';
import './OrganizacionesComponent.css';

const initialForm = {
  nombre: '',
  slug: '',
  descripcion: '',
  contacto_email: '',
  contacto_telefono: '',
  logo_url: '',
};

const slugify = (s) =>
  s.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const OrganizacionesComponent = () => {
  const orgs = useQuery(api.organizaciones.list) ?? [];
  const addOrg = useMutation(api.organizaciones.add);
  const updateOrg = useMutation(api.organizaciones.update);
  const setActiveOrg = useMutation(api.organizaciones.setActive);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [orgToToggle, setOrgToToggle] = useState(null);

  const orgsOrdenadas = useMemo(
    () => [...orgs].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [orgs]
  );

  const flash = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3500);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setShowModal(true);
  };

  const openEdit = (o) => {
    setEditing(o);
    setForm({
      nombre: o.nombre || '',
      slug: o.slug || '',
      descripcion: o.descripcion || '',
      contacto_email: o.contacto_email || '',
      contacto_telefono: o.contacto_telefono || '',
      logo_url: o.logo_url || '',
    });
    setShowModal(true);
  };

  const handleNombreChange = (val) => {
    setForm((prev) => {
      const next = { ...prev, nombre: val };
      if (!editing && (!prev.slug || prev.slug === slugify(prev.nombre))) {
        next.slug = slugify(val);
      }
      return next;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.slug.trim()) {
      flash('error', 'Nombre y slug son requeridos');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        slug: slugify(form.slug.trim()),
        descripcion: form.descripcion.trim() || undefined,
        contacto_email: form.contacto_email.trim() || undefined,
        contacto_telefono: form.contacto_telefono.trim() || undefined,
        logo_url: form.logo_url.trim() || undefined,
      };
      if (editing) {
        await updateOrg({ id: editing._id, ...payload });
        flash('ok', 'Organización actualizada');
      } else {
        await addOrg(payload);
        flash('ok', 'Organización creada');
      }
      setShowModal(false);
    } catch (err) {
      flash('error', err.message || 'Error al guardar organización');
    } finally {
      setBusy(false);
    }
  };

  const toggleActivo = (o) => {
    setOrgToToggle(o);
  };

  const confirmToggleActivo = async () => {
    if (!orgToToggle) return;
    try {
      await setActiveOrg({ id: orgToToggle._id, activo: !orgToToggle.activo });
      flash('ok', `Organización ${orgToToggle.activo ? 'desactivada' : 'reactivada'}`);
    } catch (err) {
      flash('error', err.message);
    } finally {
      setOrgToToggle(null);
    }
  };

  return (
    <div className="orgs-component">
      <div className="orgs-header">
        <div className="orgs-header-text">
          <Building size={24} />
          <div>
            <h2>Organizaciones</h2>
            <p>Gestión de tenants. Cada organización agrupa proyectos, usuarios y data aislada.</p>
          </div>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Nueva organización
        </button>
      </div>

      {feedback && (
        <div className={`orgs-feedback orgs-feedback--${feedback.type}`}>
          {feedback.type === 'ok' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          <span>{feedback.msg}</span>
        </div>
      )}

      <div className="orgs-list">
        {orgsOrdenadas.length === 0 && (
          <div className="orgs-empty">No hay organizaciones todavía. Crea la primera.</div>
        )}
        <table className="orgs-table">
          <thead>
            <tr>
              <th>Organización</th>
              <th>Slug</th>
              <th>Contacto</th>
              <th>Estado</th>
              <th className="orgs-th-actions">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orgsOrdenadas.map((o) => (
              <tr key={o._id}>
                <td>
                  <div className="orgs-name">{o.nombre}</div>
                  {o.descripcion && <div className="orgs-desc">{o.descripcion}</div>}
                </td>
                <td><code className="orgs-slug">{o.slug}</code></td>
                <td className="orgs-contact">
                  {o.contacto_email && (
                    <div><Mail size={12} /> {o.contacto_email}</div>
                  )}
                  {o.contacto_telefono && (
                    <div><Phone size={12} /> {o.contacto_telefono}</div>
                  )}
                  {!o.contacto_email && !o.contacto_telefono && '—'}
                </td>
                <td>
                  <span className={`orgs-badge ${o.activo ? 'orgs-badge--ok' : 'orgs-badge--off'}`}>
                    {o.activo ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="orgs-actions">
                  <button title="Editar" onClick={() => openEdit(o)}>
                    <Edit3 size={16} />
                  </button>
                  <button
                    title={o.activo ? 'Desactivar' : 'Reactivar'}
                    className={o.activo ? 'orgs-btn-danger' : ''}
                    onClick={() => toggleActivo(o)}
                  >
                    <Power size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="orgs-overlay" onClick={() => !busy && setShowModal(false)}>
          <div className="orgs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="orgs-modal-header">
              <h3>{editing ? 'Editar organización' : 'Nueva organización'}</h3>
              <button onClick={() => setShowModal(false)} disabled={busy}><X size={18} /></button>
            </div>
            <form onSubmit={submit} className="orgs-form">
              <label>
                <span>Nombre *</span>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => handleNombreChange(e.target.value)}
                  required
                  autoFocus
                  placeholder="Ej. Cliente Gobierno Panamá"
                />
              </label>
              <label>
                <span>Slug * <small>(URL-friendly, solo letras/números/guiones)</small></span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  required
                  placeholder="cliente-gobierno-panama"
                />
              </label>
              <label>
                <span>Descripción</span>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  rows={2}
                />
              </label>
              <div className="orgs-form-row">
                <label>
                  <span><Mail size={12} /> Email contacto</span>
                  <input
                    type="email"
                    value={form.contacto_email}
                    onChange={(e) => setForm({ ...form, contacto_email: e.target.value })}
                  />
                </label>
                <label>
                  <span><Phone size={12} /> Teléfono</span>
                  <input
                    type="tel"
                    value={form.contacto_telefono}
                    onChange={(e) => setForm({ ...form, contacto_telefono: e.target.value })}
                  />
                </label>
              </div>
              <label>
                <span><Globe size={12} /> Logo URL</span>
                <input
                  type="url"
                  value={form.logo_url}
                  onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                  placeholder="https://..."
                />
              </label>
              <div className="orgs-form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} disabled={busy}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={busy}>
                  <Save size={16} /> {editing ? 'Guardar cambios' : 'Crear organización'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {orgToToggle && (
        <ConfirmDialog
          open
          destructive={orgToToggle.activo}
          title={orgToToggle.activo ? '¿Desactivar organización?' : '¿Reactivar organización?'}
          message={`${orgToToggle.activo ? 'Vas a desactivar' : 'Vas a reactivar'} "${orgToToggle.nombre}". ${orgToToggle.activo ? 'Los usuarios no podrán acceder.' : 'Los usuarios recuperarán acceso.'}`}
          confirmLabel={orgToToggle.activo ? 'Desactivar' : 'Reactivar'}
          cancelLabel="Cancelar"
          onConfirm={confirmToggleActivo}
          onCancel={() => setOrgToToggle(null)}
        />
      )}
    </div>
  );
};

export default OrganizacionesComponent;
