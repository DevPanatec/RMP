import { useState } from 'react';
import { useRoutes } from '../../context/RoutesContext';
import RouteModal from '../RouteModal/RouteModal';
import { Map, Edit, Trash2, MapPin, Clock, Truck, Plus, Route } from '../Icons';
import './RoutesComponent.css';

// Helper para convertir formato 24h a 12h (AM/PM)
const formatTime12h = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const period = hour >= 12 ? 'p.m.' : 'a.m.';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${minutes} ${period}`;
};

const RoutesComponent = ({ initialRoutes = [], onRoutesChange }) => {
  const { routes, loading, addRoute, updateRoute, deleteRoute } = useRoutes();
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
      if (isEditing && (editingRoute?._id || editingRoute?.id)) {
        await updateRoute(editingRoute._id || editingRoute.id, routeData);
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

  // Stats
  const recoleccionRoutes = routes.filter(r => (r.tipo_servicio || r.tipoServicio) === 'recoleccion');
  const fumigacionRoutes = routes.filter(r => (r.tipo_servicio || r.tipoServicio) === 'fumigacion');

  return (
    <div className="routes-v2">
      {/* Header */}
      <div className="routes-header-v2">
        <div className="routes-header-info">
          <div className="routes-header-icon">
            <Route size={28} />
          </div>
          <div className="routes-header-text">
            <h2>Gestión de Rutas</h2>
            <p>Administra las rutas de servicio</p>
          </div>
        </div>

        <div className="routes-header-stats">
          <div className="routes-stat-pill success">
            <span className="stat-number">{recoleccionRoutes.length}</span>
            <span className="stat-label">Recolección</span>
          </div>
          <div className="routes-stat-pill info">
            <span className="stat-number">{fumigacionRoutes.length}</span>
            <span className="stat-label">Fumigación</span>
          </div>
          <div className="routes-stat-pill">
            <span className="stat-number">{routes.length}</span>
            <span className="stat-label">Total</span>
          </div>
        </div>

        <button className="btn-add-v2" onClick={handleOpenNew}>
          <Plus size={18} />
          Nueva Ruta
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="routes-loading-v2">
          <div className="loading-spinner"></div>
          <p>Cargando rutas...</p>
        </div>
      ) : routes.length > 0 ? (
        <div className="routes-grid-v2">
          {routes.map((route, index) => {
            const paradas = route.paradas || route.stops || [];
            const paradasArray = typeof paradas === 'string' ? JSON.parse(paradas) : paradas;
            const tipoServicio = route.tipo_servicio || route.tipoServicio || 'recoleccion';

            return (
              <div key={route._id || route.id} className="route-card-v2" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="route-card-header">
                  <div className={`route-card-icon ${tipoServicio}`}>
                    {tipoServicio === 'recoleccion' ? <Truck size={22} /> : <Map size={22} />}
                  </div>
                  <div className="route-card-actions">
                    <button 
                      className="btn-icon-action"
                      onClick={() => handleEdit(route)}
                      title="Editar"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="btn-icon-action danger"
                      onClick={() => handleDelete(route._id || route.id)}
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="route-card-body">
                  <h4 className="route-name">{route.name || route.nombre}</h4>
                  <div className={`route-type-badge-v2 ${tipoServicio}`}>
                    {tipoServicio === 'recoleccion' ? 'Recolección' : 'Fumigación'}
                  </div>

                  {route.descripcion && (
                    <p className="route-description-v2">{route.descripcion}</p>
                  )}

                  <div className="route-metrics">
                    <div className="route-metric">
                      <MapPin size={16} />
                      <span className="metric-value">{paradasArray.length}</span>
                      <span className="metric-label">Paradas</span>
                    </div>
                    <div className="route-metric">
                      <Clock size={16} />
                      <span className="metric-value">{route.tiempo_estimado || route.tiempoEstimado || 0}</span>
                      <span className="metric-label">Min</span>
                    </div>
                    <div className="route-metric">
                      <Map size={16} />
                      <span className="metric-value">{route.distancia_total || route.distanciaTotal || 0}</span>
                      <span className="metric-label">Km</span>
                    </div>
                  </div>
                </div>

                {route.hora_inicio && (
                  <div className="route-card-footer">
                    <div className="route-schedule-v2">
                      <Clock size={14} />
                      <span>{formatTime12h(route.hora_inicio)}</span>
                      {route.hora_fin && <span className="schedule-separator">-</span>}
                      {route.hora_fin && <span>{formatTime12h(route.hora_fin)}</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="routes-empty-state">
          <div className="empty-icon">
            <Route size={48} />
          </div>
          <h3>No hay rutas registradas</h3>
          <p>Usa el botón "Nueva Ruta" arriba para crear tu primera ruta de servicio</p>
        </div>
      )}

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
