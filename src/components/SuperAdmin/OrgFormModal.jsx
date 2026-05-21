import { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { X, Save, Mail, Phone, Globe } from '../../components/Icons';

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

// Modal reusable para crear/editar organización.
// Props:
//   editing  → org object si se edita (null → crear)
//   onClose  → cerrar sin guardar
//   onSaved  → callback (org) tras guardar exitoso
export function OrgFormModal({ editing = null, onClose, onSaved }) {
  const addOrg = useMutation(api.organizaciones.add);
  const updateOrg = useMutation(api.organizaciones.update);

  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (editing) {
      setForm({
        nombre: editing.nombre || '',
        slug: editing.slug || '',
        descripcion: editing.descripcion || '',
        contacto_email: editing.contacto_email || '',
        contacto_telefono: editing.contacto_telefono || '',
        logo_url: editing.logo_url || '',
      });
    } else {
      setForm(initialForm);
    }
    setError(null);
  }, [editing]);

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
      setError('Nombre y slug son requeridos');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        slug: slugify(form.slug.trim()),
        descripcion: form.descripcion.trim() || undefined,
        contacto_email: form.contacto_email.trim() || undefined,
        contacto_telefono: form.contacto_telefono.trim() || undefined,
        logo_url: form.logo_url.trim() || undefined,
      };
      let result;
      if (editing) {
        result = await updateOrg({ id: editing._id, ...payload });
      } else {
        result = await addOrg(payload);
      }
      onSaved?.(result);
      onClose?.();
    } catch (err) {
      setError(err.message || 'Error al guardar organización');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="orgs-overlay" onClick={() => !busy && onClose?.()}>
      <div className="orgs-modal" onClick={(e) => e.stopPropagation()}>
        <div className="orgs-modal-header">
          <h3>{editing ? 'Editar organización' : 'Nueva organización'}</h3>
          <button onClick={onClose} disabled={busy} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="orgs-form">
          {error && (
            <div className="orgs-form-error" role="alert">{error}</div>
          )}
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
            <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              <Save size={16} /> {editing ? 'Guardar cambios' : 'Crear organización'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OrgFormModal;
