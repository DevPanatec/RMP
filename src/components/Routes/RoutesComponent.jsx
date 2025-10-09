import { useState } from 'react';
import { useSupabaseRoutes } from '../../context/SupabaseRoutesContext';
import RouteModal from '../RouteModal/RouteModal';
import { Map, Edit, Trash2 } from '../Icons';
import './RoutesComponent.css';

const RoutesComponent = ({ initialRoutes = [], onRoutesChange }) => {
  const { routes, loading, addRoute, updateRoute, deleteRoute } = useSupabaseRoutes();
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleOpenNew = () => {
    setEditingRoute(null);
    setIsEditing(false);
    setShowModal(true);
  };

  const handleEdit = (route) => {
    setEditingRoute(route);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar esta ruta?')) {
      try {
        await deleteRoute(id);
        onRoutesChange && onRoutesChange(routes);
      } catch (error) {
        alert('Error al eliminar la ruta: ' + error.message);
      }
    }
  };

  const handleSave = async (routeData) => {
    try {
      if (isEditing && editingRoute?.id) {
        await updateRoute(editingRoute.id, routeData);
      } else {
        await addRoute(routeData);
      }
      onRoutesChange && onRoutesChange(routes);
      setShowModal(false);
      setEditingRoute(null);
    } catch (error) {
      console.error('Error completo:', error);
      alert('Error al guardar la ruta: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="routes-component">
        <div className="routes-header">
          <h3><Map size={24} /> Gestión de Rutas</h3>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div>Cargando rutas...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="routes-component">
      <div className="routes-header">
        <div className="routes-header-left">
          <h3><Map size={24} /> Gestión de Rutas</h3>
          <div className="routes-count">
            {routes.length} {routes.length === 1 ? 'ruta' : 'rutas'}
          </div>
        </div>
        <button className="btn-new-route" onClick={handleOpenNew}>
          <span className="btn-icon">+</span>
          Nueva Ruta
        </button>
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
              <td>{r.name || r.nombre}</td>
              <td>{r.descripcion || r.description || '-'}</td>
              <td>{r.distanciaTotal || r.distancia_total || 0}</td>
              <td>{r.tiempoEstimado || r.tiempo_estimado || 0}</td>
              <td>{(r.paradas || r.stops || []).length}</td>
              <td>
                <button className="btn btn--sm btn--outline" onClick={() => handleEdit(r)}>
                  <Edit size={14} /> Editar
                </button>
                <button className="btn btn--sm btn--danger" onClick={() => handleDelete(r.id)}>
                  <Trash2 size={14} /> Eliminar
                </button>
              </td>
            </tr>
          ))}
          {routes.length === 0 && (
            <tr><td colSpan="6" style={{ textAlign: 'center' }}>No hay rutas registradas</td></tr>
          )}
        </tbody>
      </table>

      <RouteModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        route={editingRoute}
        onSave={handleSave}
        isEditing={isEditing}
      />
    </div>
  );
};

export default RoutesComponent; 