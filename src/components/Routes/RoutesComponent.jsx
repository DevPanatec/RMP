import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
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

const MAPBOX_TOKEN = 'pk.eyJ1Ijoia2V2aW5uMjMiLCJhIjoiY204Y2J0bWN1MTg5ZzJtb2xobXljODM0MiJ9.48MFADtQhp_sFuQjewLFeA';

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
  const [showMap, setShowMap] = useState(false);
  const [newStop, setNewStop] = useState({ nombre: '', direccion: '', tipo: 'normal' });
  const [mapCenter] = useState([8.9833, -79.5167]); // Ciudad de Panamá

  const handleOpenNew = () => {
    setEditingRoute({ ...emptyRoute, paradas: [] });
    setIsEditing(false);
    setShowModal(true);
    setShowMap(true);
  };

  const handleEdit = (route) => {
    setEditingRoute({ ...route });
    setIsEditing(true);
    setShowModal(true);
    setShowMap(true);
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
    if (editingRoute.paradas.length === 0) return alert('Debe agregar al menos una parada');
    
    // Calcular distancia total automáticamente
    const distanciaTotal = calculateTotalDistance(editingRoute.paradas);
    const tiempoEstimado = Math.round(distanciaTotal * 3); // 3 min por km
    
    let updatedRoutes;
    if (isEditing) {
      updatedRoutes = routes.map(r => r.id === editingRoute.id ? 
        { ...editingRoute, distanciaTotal, tiempoEstimado } : r);
    } else {
      const newRoute = { 
        ...editingRoute, 
        id: generateId(editingRoute.nombre),
        distanciaTotal,
        tiempoEstimado
      };
      updatedRoutes = [...routes, newRoute];
    }
    setRoutes(updatedRoutes);
    onRoutesChange && onRoutesChange(updatedRoutes);
    setShowModal(false);
    setShowMap(false);
  };

  const handleChange = (field, value) => {
    setEditingRoute(prev => ({ ...prev, [field]: value }));
  };

  const addStop = () => {
    if (!newStop.nombre.trim() || !newStop.direccion.trim()) {
      alert('Debe completar nombre y dirección de la parada');
      return;
    }

    // Simular geocodificación (en un caso real usaría una API de geocodificación)
    const lat = mapCenter[0] + (Math.random() - 0.5) * 0.01;
    const lng = mapCenter[1] + (Math.random() - 0.5) * 0.01;
    
    const stop = {
      nombre: newStop.nombre,
      direccion: newStop.direccion,
      tipo: newStop.tipo,
      lat,
      lng,
      estimado: `${Math.floor(Math.random() * 12) + 8}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
      pesoRecolectado: Math.floor(Math.random() * 50) + 10
    };

    setEditingRoute(prev => ({
      ...prev,
      paradas: [...prev.paradas, stop]
    }));

    setNewStop({ nombre: '', direccion: '', tipo: 'normal' });
  };

  const removeStop = (index) => {
    setEditingRoute(prev => ({
      ...prev,
      paradas: prev.paradas.filter((_, i) => i !== index)
    }));
  };

  const calculateTotalDistance = (paradas) => {
    if (paradas.length < 2) return 0;
    
    let total = 0;
    for (let i = 0; i < paradas.length - 1; i++) {
      const p1 = paradas[i];
      const p2 = paradas[i + 1];
      total += calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
    }
    return Math.round(total * 100) / 100;
  };

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getStopIcon = (stopNumber, tipo) => {
    const iconos = {
      'inicio': '🏁',
      'residencial': '🏠',
      'comercial': '🏢',
      'turistico': '🏛️',
      'normal': stopNumber
    };

    const iconHtml = `
      <div class="route-stop-marker" style="background: var(--color-info); color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white;">
        ${iconos[tipo] || stopNumber}
      </div>
    `;
    
    return L.divIcon({
      html: iconHtml,
      className: 'custom-div-icon',
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    });
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
          <div className="modal-content route-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>{isEditing ? 'Editar Ruta' : 'Nueva Ruta'}</h4>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="route-form-section">
                <div className="form-group">
                  <label>Nombre de la Ruta:</label>
                  <input 
                    type="text" 
                    value={editingRoute.nombre} 
                    onChange={e => handleChange('nombre', e.target.value)}
                    placeholder="Ej: Ruta Centro Comercial"
                  />
                </div>
                
                <div className="form-group">
                  <label>Descripción:</label>
                  <textarea 
                    value={editingRoute.descripcion} 
                    onChange={e => handleChange('descripcion', e.target.value)}
                    placeholder="Descripción de la ruta..."
                  />
                </div>

                <div className="route-stats">
                  <div className="stat-item">
                    <strong>Distancia Total:</strong> {calculateTotalDistance(editingRoute.paradas)} km
                  </div>
                  <div className="stat-item">
                    <strong>Tiempo Estimado:</strong> {Math.round(calculateTotalDistance(editingRoute.paradas) * 3)} min
                  </div>
                  <div className="stat-item">
                    <strong>Paradas:</strong> {editingRoute.paradas.length}
                  </div>
                </div>
              </div>

              {showMap && (
                <div className="map-section">
                  <h5>🗺️ Mapa de la Ruta</h5>
                  <div style={{ height: '400px', width: '100%', marginBottom: '20px' }}>
                    <MapContainer 
                      center={mapCenter} 
                      zoom={13} 
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        url={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`}
                        attribution='&copy; <a href="https://www.mapbox.com/">Mapbox</a>'
                      />
                      
                      {editingRoute.paradas.map((parada, index) => (
                        <Marker
                          key={index}
                          position={[parada.lat, parada.lng]}
                          icon={getStopIcon(index + 1, parada.tipo)}
                        >
                          <Popup>
                            <div>
                              <h6>📍 Parada {index + 1}</h6>
                              <p><strong>{parada.nombre}</strong></p>
                              <p>{parada.direccion}</p>
                              <p>Tipo: {parada.tipo}</p>
                              <p>Estimado: {parada.estimado}</p>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                      
                      {editingRoute.paradas.length > 1 && (
                        <Polyline
                          positions={editingRoute.paradas.map(p => [p.lat, p.lng])}
                          color="var(--color-info)"
                          weight={4}
                          opacity={0.8}
                        />
                      )}
                    </MapContainer>
                  </div>
                </div>
              )}

              <div className="stops-section">
                <h5>📍 Gestión de Paradas</h5>
                
                <div className="add-stop-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Nombre de la Parada:</label>
                      <input 
                        type="text" 
                        value={newStop.nombre}
                        onChange={e => setNewStop(prev => ({ ...prev, nombre: e.target.value }))}
                        placeholder="Ej: Plaza Catedral"
                      />
                    </div>
                    <div className="form-group">
                      <label>Dirección:</label>
                      <input 
                        type="text" 
                        value={newStop.direccion}
                        onChange={e => setNewStop(prev => ({ ...prev, direccion: e.target.value }))}
                        placeholder="Ej: Casco Viejo, Panamá"
                      />
                    </div>
                    <div className="form-group">
                      <label>Tipo:</label>
                      <select 
                        value={newStop.tipo}
                        onChange={e => setNewStop(prev => ({ ...prev, tipo: e.target.value }))}
                      >
                        <option value="normal">Normal</option>
                        <option value="inicio">Inicio</option>
                        <option value="residencial">Residencial</option>
                        <option value="comercial">Comercial</option>
                        <option value="turistico">Turístico</option>
                      </select>
                    </div>
                    <button className="btn btn--primary" onClick={addStop}>➕ Agregar Parada</button>
                  </div>
                </div>

                <div className="stops-list">
                  <h6>Paradas de la Ruta:</h6>
                  {editingRoute.paradas.map((parada, index) => (
                    <div key={index} className="stop-item">
                      <div className="stop-number">{index + 1}</div>
                      <div className="stop-info">
                        <div className="stop-name">{parada.nombre}</div>
                        <div className="stop-address">{parada.direccion}</div>
                        <div className="stop-type">Tipo: {parada.tipo}</div>
                      </div>
                      <button 
                        className="btn btn--sm btn--danger"
                        onClick={() => removeStop(index)}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                  {editingRoute.paradas.length === 0 && (
                    <p className="no-stops">No hay paradas agregadas. Agregue al menos una parada.</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="btn btn--outline" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn--primary" onClick={handleSave}>
                {isEditing ? 'Actualizar' : 'Crear'} Ruta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutesComponent; 