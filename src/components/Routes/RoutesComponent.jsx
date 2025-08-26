import { useState } from 'react';
import { useSupabaseRoutes } from '../../context/SupabaseRoutesContext';
import EnhancedStopsManager from '../EnhancedStopsManager/EnhancedStopsManager';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './RoutesComponent.css';

// Fix para iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Icono personalizado para paradas
const createStopIcon = (stopNumber) => {
  const iconHtml = `
    <div style="
      background: #43A047;
      color: white;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      border: 3px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    ">
      ${stopNumber}
    </div>
  `;
  
  return L.divIcon({
    html: iconHtml,
    className: 'custom-div-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

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
  const { routes, loading, addRoute, updateRoute, deleteRoute } = useSupabaseRoutes();
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState(emptyRoute);
  const [isEditing, setIsEditing] = useState(false);
  const [mapCenter, setMapCenter] = useState([8.9824, -79.5199]); // Ciudad de Panamá por defecto

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

  const handleSave = async () => {
    if (!editingRoute.nombre.trim()) return alert('Nombre requerido');
    
    try {
      // Preparar datos para Supabase
      const routeData = {
        nombre: editingRoute.nombre,
        descripcion: editingRoute.descripcion || '',
        tipo_servicio: 'recoleccion', // Valor por defecto
        paradas: editingRoute.paradas || [],
        distancia_total: parseFloat(editingRoute.distanciaTotal) || 0,
        tiempo_estimado: parseInt(editingRoute.tiempoEstimado) || 60,
        color: editingRoute.color || '#22c55e',
        fecha_programada: new Date().toISOString().split('T')[0], // Fecha actual por defecto
        estado: 'programada'
      };

      if (isEditing) {
        await updateRoute(editingRoute.id, routeData);
      } else {
        await addRoute(routeData);
      }
      onRoutesChange && onRoutesChange(routes);
      setShowModal(false);
      setEditingRoute(emptyRoute);
    } catch (error) {
      console.error('Error completo:', error);
      alert('Error al guardar la ruta: ' + error.message);
    }
  };

  const handleChange = (field, value) => {
    setEditingRoute(prev => ({ ...prev, [field]: value }));
  };

  const handleStopsChange = (newStops) => {
    setEditingRoute(prev => ({ ...prev, paradas: newStops }));
    
    // Actualizar el centro del mapa cuando se agreguen paradas
    if (newStops.length > 0) {
      const lastStop = newStops[newStops.length - 1];
      if (lastStop.latitud && lastStop.longitud) {
        setMapCenter([lastStop.latitud, lastStop.longitud]);
      }
    }
  };

  if (loading) {
    return (
      <div className="routes-component">
        <div className="routes-header">
          <h3>🗺️ Gestión de Rutas</h3>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div>⏳ Cargando rutas...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="routes-component">
      <div className="routes-header">
        <h3>🗺️ Gestión de Rutas</h3>
        <button className="btn btn--primary" onClick={handleOpenNew}>➕ Nueva Ruta</button>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Total: {routes.length} rutas
        </div>
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
        <div className="modal-overlay route-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content route-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="route-modal-header">
              <div className="modal-header-content">
                <h4>{isEditing ? '✏️ Editar Ruta' : '➕ Nueva Ruta'}</h4>
                <p>Configura los detalles de la ruta y agrega paradas usando el mapa interactivo</p>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <div className="route-modal-body">
              {/* Información básica de la ruta */}
              <div className="route-basic-info">
                <div className="info-grid">
                  <div className="form-group">
                    <label>Nombre de la Ruta *</label>
                    <input 
                      type="text" 
                      value={editingRoute.nombre} 
                      onChange={e => handleChange('nombre', e.target.value)}
                      placeholder="Ej: Ruta Centro - Norte"
                      className="route-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Descripción</label>
                    <textarea 
                      value={editingRoute.descripcion} 
                      onChange={e => handleChange('descripcion', e.target.value)}
                      placeholder="Descripción opcional de la ruta..."
                      className="route-textarea"
                      rows="2"
                    />
                  </div>
                </div>
                
                <div className="route-metrics">
                  <div className="metric-item">
                    <label>📏 Distancia (km)</label>
                    <input 
                      type="number" 
                      value={editingRoute.distanciaTotal} 
                      onChange={e => handleChange('distanciaTotal', e.target.value)}
                      className="metric-input"
                      step="0.1"
                      min="0"
                    />
                  </div>
                  <div className="metric-item">
                    <label>⏱️ Tiempo Est. (min)</label>
                    <input 
                      type="number" 
                      value={editingRoute.tiempoEstimado} 
                      onChange={e => handleChange('tiempoEstimado', e.target.value)}
                      className="metric-input"
                      step="1"
                      min="0"
                    />
                  </div>
                </div>
              </div>
              
              {/* Gestión de paradas y vista previa */}
              <div className="route-content-main">
                <div className="route-stops-section">
                  <EnhancedStopsManager 
                    stops={editingRoute.paradas || []}
                    onStopsChange={handleStopsChange}
                  />
                </div>
                
                <div className="route-preview-section">
                  <div className="preview-header">
                    <h5>🗺️ Vista Previa de la Ruta</h5>
                    <div className="preview-stats">
                      <span className="stat-chip">
                        📍 {editingRoute.paradas?.length || 0} paradas
                      </span>
                      {editingRoute.paradas?.filter(p => p.latitud && p.longitud).length > 0 && (
                        <span className="stat-chip">
                          🗺️ {editingRoute.paradas.filter(p => p.latitud && p.longitud).length} ubicadas
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="route-map-container">
                    <MapContainer 
                      center={mapCenter} 
                      zoom={13} 
                      style={{ height: '100%', width: '100%', minHeight: '450px' }}
                      key={`${mapCenter[0]}-${mapCenter[1]}`}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      
                      {editingRoute.paradas && editingRoute.paradas.map((parada, index) => {
                        if (!parada.latitud || !parada.longitud) return null;
                        
                        return (
                          <Marker
                            key={`stop-${index}`}
                            position={[parada.latitud, parada.longitud]}
                            icon={createStopIcon(index + 1)}
                          >
                            <Popup>
                              <div style={{ minWidth: '200px' }}>
                                <h6 style={{ margin: '0 0 8px 0', color: '#2E7D32' }}>
                                  📍 Parada #{index + 1}
                                </h6>
                                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                                  <strong>Dirección:</strong><br/>
                                  {parada.direccion}
                                </p>
                                {parada.direccion_completa && parada.direccion_completa !== parada.direccion && (
                                  <p style={{ margin: '4px 0', fontSize: '12px', color: '#757575' }}>
                                    {parada.direccion_completa}
                                  </p>
                                )}
                                <p style={{ margin: '4px 0', fontSize: '12px', color: '#757575' }}>
                                  📍 {parada.latitud.toFixed(6)}, {parada.longitud.toFixed(6)}
                                </p>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}
                    </MapContainer>
                    
                    {(!editingRoute.paradas || editingRoute.paradas.length === 0) && (
                      <div className="map-placeholder">
                        <div className="map-placeholder-content">
                          <div className="placeholder-icon">🗺️</div>
                          <h6>Vista previa de la ruta</h6>
                          <p>Agrega paradas para ver las ubicaciones en el mapa</p>
                          <div className="placeholder-features">
                            <span>📍 Ubicaciones exactas</span>
                            <span>🗺️ Mapa interactivo</span>
                            <span>📱 Compatible móvil</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="route-modal-footer">
              <div className="footer-info">
                <span className="validation-info">
                  {!editingRoute.nombre?.trim() && '⚠️ Nombre requerido'}
                  {editingRoute.nombre?.trim() && '✅ Listo para guardar'}
                </span>
              </div>
              <div className="footer-actions">
                <button className="btn btn--secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button 
                  className="btn btn--primary" 
                  onClick={handleSave}
                  disabled={!editingRoute.nombre?.trim()}
                >
                  {isEditing ? '💾 Actualizar Ruta' : '✅ Crear Ruta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutesComponent; 