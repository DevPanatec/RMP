import { useState } from 'react';
import { useSupabaseRoutes } from '../../context/SupabaseRoutesContext';
import RouteModal from '../RouteModal/RouteModal';
import { Map, Edit, Trash2, MapPin, Clock, Truck } from '../Icons';
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

      {routes.length > 0 ? (
        <div className="routes-grid">
          {routes.map((route, index) => {
            const paradas = route.paradas || route.stops || [];
            const paradasArray = typeof paradas === 'string' ? JSON.parse(paradas) : paradas;
            const tipoServicio = route.tipo_servicio || route.tipoServicio || 'recoleccion';

            return (
              <div key={route.id} className="route-card" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="route-card-header">
                  <div className="route-icon">
                    <Map size={24} />
                  </div>
                  <div className="route-info">
                    <h4>{route.name || route.nombre}</h4>
                    <span className={`route-type-badge type-${tipoServicio}`}>
                      {tipoServicio === 'recoleccion' ? <><Truck size={12} /> Recolección</> : <><Map size={12} /> Fumigación</>}
                    </span>
                  </div>
                </div>

                {route.descripcion && (
                  <p className="route-description">{route.descripcion}</p>
                )}

                <div className="route-stats">
                  <div className="route-stat">
                    <MapPin size={16} className="stat-icon" />
                    <div>
                      <span className="stat-value">{paradasArray.length}</span>
                      <span className="stat-label">Paradas</span>
                    </div>
                  </div>
                  <div className="route-stat">
                    <Clock size={16} className="stat-icon" />
                    <div>
                      <span className="stat-value">{route.tiempo_estimado || route.tiempoEstimado || 0}</span>
                      <span className="stat-label">Min</span>
                    </div>
                  </div>
                  <div className="route-stat">
                    <Map size={16} className="stat-icon" />
                    <div>
                      <span className="stat-value">{route.distancia_total || route.distanciaTotal || 0}</span>
                      <span className="stat-label">Km</span>
                    </div>
                  </div>
                </div>

                {route.hora_inicio && (
                  <div className="route-schedule">
                    <Clock size={16} className="schedule-icon" />
                    <span>{formatTime12h(route.hora_inicio)}</span>
                    {route.hora_fin && <span> - {formatTime12h(route.hora_fin)}</span>}
                  </div>
                )}

                <div className="route-actions">
                  <button className="btn-route-edit" onClick={() => handleEdit(route)}>
                    <Edit size={16} />
                    <span>Editar</span>
                  </button>
                  <button className="btn-route-delete" onClick={() => handleDelete(route.id)}>
                    <Trash2 size={16} />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-routes">
          <Map size={64} />
          <h3>No hay rutas registradas</h3>
          <p>Crea tu primera ruta para comenzar</p>
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