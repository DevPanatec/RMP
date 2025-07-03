import { useState } from 'react';
import './RoutesComponent.css';

const generateId = (name = '') => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();

const emptyRoute = {
  id: '',
  nombre: '',
  descripcion: '',
  distanciaTotal: 0,
  tiempoEstimado: 0,
  paradas: []
};

const RoutesComponent = ({ initialRoutes = [], onRoutesChange }) => {
  const [routes, setRoutes] = useState(initialRoutes);
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState(emptyRoute);
  const [isEditing, setIsEditing] = useState(false);

  const handleOpenNew = () => {
    setEditingRoute({ ...emptyRoute });
    setIsEditing(false);
    setShowModal(true);
  };

  const handleEdit = (route) => {
    setEditingRoute({ ...route });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar esta ruta?')) {
      const updated = routes.filter(r => r.id !== id);
      setRoutes(updated);
      onRoutesChange && onRoutesChange(updated);
    }
  };

  const handleSave = () => {
    if (!editingRoute.nombre.trim()) return alert('Nombre requerido');
    let updatedRoutes;
    if (isEditing) {
      updatedRoutes = routes.map(r => r.id === editingRoute.id ? editingRoute : r);
    } else {
      const newRoute = { ...editingRoute, id: generateId(editingRoute.nombre) };
      updatedRoutes = [...routes, newRoute];
    }
    setRoutes(updatedRoutes);
    onRoutesChange && onRoutesChange(updatedRoutes);
    setShowModal(false);
  };

  const handleChange = (field, value) => {
    setEditingRoute(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="routes-component">
      <div className="routes-header">
        <h3>🗺️ Gestión de Rutas</h3>
        <button className="btn btn--primary" onClick={handleOpenNew}>➕ Nueva Ruta</button>
      </div>
      <table className="table routes-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Descripción</th>
            <th>Distancia (km)</th>
            <th>Tiempo Est. (min)</th>
            <th>Paradas</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {routes.map(r => (
            <tr key={r.id}>
              <td>{r.nombre}</td>
              <td>{r.descripcion || '-'}</td>
              <td>{r.distanciaTotal}</td>
              <td>{r.tiempoEstimado}</td>
              <td>{r.paradas.length}</td>
              <td>
                <button className="btn btn--sm btn--outline" onClick={() => handleEdit(r)}>✏️ Editar</button>
                <button className="btn btn--sm btn--danger" onClick={() => handleDelete(r.id)}>🗑️ Eliminar</button>
              </td>
            </tr>
          ))}
          {routes.length === 0 && (
            <tr><td colSpan="6" style={{ textAlign: 'center' }}>No hay rutas registradas</td></tr>
          )}
        </tbody>
      </table>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>{isEditing ? 'Editar Ruta' : 'Nueva Ruta'}</h4>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <label>Nombre:</label>
              <input type="text" value={editingRoute.nombre} onChange={e => handleChange('nombre', e.target.value)} />
              <label>Descripción:</label>
              <textarea value={editingRoute.descripcion} onChange={e => handleChange('descripcion', e.target.value)} />
              <div className="field-row">
                <div>
                  <label>Distancia (km):</label>
                  <input type="number" value={editingRoute.distanciaTotal} onChange={e => handleChange('distanciaTotal', e.target.value)} />
                </div>
                <div>
                  <label>Tiempo Est. (min):</label>
                  <input type="number" value={editingRoute.tiempoEstimado} onChange={e => handleChange('tiempoEstimado', e.target.value)} />
                </div>
              </div>
              {/* Nota: Gestión de paradas simplificada */}
            </div>
            <div className="modal-actions">
              <button className="btn btn--outline" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn--primary" onClick={handleSave}>{isEditing ? 'Actualizar' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutesComponent; 