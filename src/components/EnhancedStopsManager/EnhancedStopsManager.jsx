import { useState } from 'react';
import MapLocationPicker from '../MapLocationPicker/MapLocationPicker';
import { Map, MapPin, Plus, X, Edit, Trash2, ClipboardList, AlertTriangle, Ruler } from '../Icons';
import './EnhancedStopsManager.css';

const EnhancedStopsManager = ({ stops = [], onStopsChange, showHeader = true }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  console.log('EnhancedStopsManager renderizando:', { stops, showAddForm });
  const [editingStop, setEditingStop] = useState(null);

  const handleLocationSelect = (locationData) => {
    const newStop = {
      id: Date.now(),
      direccion: locationData.address,
      direccion_completa: locationData.full_address,
      latitud: locationData.latitude,
      longitud: locationData.longitude,
      orden: stops.length + 1,
      completada: false
    };

    const updatedStops = [...stops, newStop];
    onStopsChange && onStopsChange(updatedStops);
    setShowAddForm(false);
  };

  const handleEditLocationSelect = (locationData) => {
    if (!editingStop) return;

    const updatedStops = stops.map(stop => 
      stop.id === editingStop.id ? {
        ...stop,
        direccion: locationData.address,
        direccion_completa: locationData.full_address,
        latitud: locationData.latitude,
        longitud: locationData.longitude
      } : stop
    );

    onStopsChange && onStopsChange(updatedStops);
    setEditingStop(null);
  };

  const handleRemoveStop = (stopId) => {
    if (window.confirm('¿Eliminar esta parada?')) {
      const updatedStops = stops.filter(stop => stop.id !== stopId);
      // Reordenar
      const reorderedStops = updatedStops.map((stop, index) => ({
        ...stop,
        orden: index + 1
      }));
      onStopsChange && onStopsChange(reorderedStops);
    }
  };

  const handleMoveStop = (stopId, direction) => {
    const currentIndex = stops.findIndex(stop => stop.id === stopId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' 
      ? Math.max(0, currentIndex - 1)
      : Math.min(stops.length - 1, currentIndex + 1);

    if (currentIndex === newIndex) return;

    const updatedStops = [...stops];
    [updatedStops[currentIndex], updatedStops[newIndex]] = [updatedStops[newIndex], updatedStops[currentIndex]];
    
    // Reordenar números
    const reorderedStops = updatedStops.map((stop, index) => ({
      ...stop,
      orden: index + 1
    }));
    
    onStopsChange && onStopsChange(reorderedStops);
  };

  const handleEditStop = (stop) => {
    setEditingStop(stop);
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingStop(null);
  };

  return (
    <div className="enhanced-stops-manager">
      {showHeader && (
        <div className="stops-header">
          <div className="header-content">
            <h4><Map size={20} /> Paradas de la Ruta</h4>
            <p>Agrega y organiza las paradas usando el mapa interactivo</p>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className={`btn btn--primary ${showAddForm ? 'btn--active' : ''}`}
              onClick={() => {
                setShowAddForm(!showAddForm);
                setEditingStop(null);
              }}
            >
              {showAddForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Agregar Parada</>}
            </button>
          </div>
        </div>
      )}

      {/* Formulario para agregar nueva parada */}
      {showAddForm && (
        <div className="add-stop-section">
          <div className="add-stop-header">
            <h5><MapPin size={18} /> Nueva Parada</h5>
            <p>Busca una ubicación o haz clic en el mapa para agregar una parada</p>
          </div>
          <MapLocationPicker
            onLocationSelect={handleLocationSelect}
            placeholder="Buscar ubicación para nueva parada..."
            showCoordinateInput={true}
            height="350px"
          />
        </div>
      )}

      {editingStop && (
        <div className="edit-stop-section">
          <div className="edit-stop-header">
            <h5><Edit size={18} /> Editar Parada #{editingStop.orden}</h5>
            <div className="edit-actions">
              <button
                type="button"
                className="btn btn--sm btn--outline"
                onClick={cancelEdit}
              >
                Cancelar
              </button>
            </div>
          </div>
          <MapLocationPicker
            onLocationSelect={handleEditLocationSelect}
            placeholder="Buscar nueva ubicación..."
            initialLocation={editingStop.latitud && editingStop.longitud ? [editingStop.latitud, editingStop.longitud] : null}
            showCoordinateInput={true}
            height="350px"
          />
        </div>
      )}

      {/* Formulario para editar parada existente */}
      {editingStop && (
        <div className="edit-stop-section">
          <div className="edit-stop-header">
            <h5>✏️ Editar Parada #{editingStop.orden}</h5>
            <div className="edit-actions">
              <button
                type="button"
                className="btn btn--sm btn--outline"
                onClick={cancelEdit}
              >
                Cancelar
              </button>
            </div>
          </div>
          <MapLocationPicker
            onLocationSelect={handleEditLocationSelect}
            placeholder="Buscar nueva ubicación..."
            initialLocation={editingStop.latitud && editingStop.longitud ? [editingStop.latitud, editingStop.longitud] : null}
            showCoordinateInput={true}
            height="350px"
          />
        </div>
      )}

      {/* Botón flotante para agregar paradas cuando no hay header */}
      {!showHeader && !showAddForm && !editingStop && (
        <button
          type="button"
          className="btn btn--primary floating-add-btn"
          onClick={() => setShowAddForm(true)}
        >
          <Plus size={16} /> Agregar Parada
        </button>
      )}

      {/* Lista de paradas */}
      {stops.length > 0 ? (
        <div className="stops-list">
          {showHeader && (
            <div className="stops-list-header">
              <h5><ClipboardList size={18} /> Paradas Definidas ({stops.length})</h5>
            </div>
          )}
          {stops.map((stop, index) => (
            <div key={stop.id || index} className={`stop-item ${editingStop?.id === stop.id ? 'editing' : ''}`}>
              <div className="stop-order">
                <span className="stop-number">{stop.orden}</span>
              </div>
              
              <div className="stop-content">
                <div className="stop-address">
                  <strong>{stop.direccion}</strong>
                </div>
                {stop.direccion_completa && stop.direccion_completa !== stop.direccion && (
                  <div className="stop-full-address">
                    {stop.direccion_completa}
                  </div>
                )}
                {stop.latitud && stop.longitud ? (
                  <div className="stop-coordinates">
                    <MapPin size={12} /> {stop.latitud.toFixed(6)}, {stop.longitud.toFixed(6)}
                  </div>
                ) : (
                  <div className="stop-coordinates missing">
                    <AlertTriangle size={12} /> Sin coordenadas - Haz clic en "Editar" para agregar ubicación exacta
                  </div>
                )}
              </div>
              
              <div className="stop-actions">
                <button
                  type="button"
                  className="btn btn--xs btn--outline"
                  onClick={() => handleMoveStop(stop.id || index, 'up')}
                  disabled={index === 0}
                  title="Mover hacia arriba"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn--xs btn--outline"
                  onClick={() => handleMoveStop(stop.id || index, 'down')}
                  disabled={index === stops.length - 1}
                  title="Mover hacia abajo"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn btn--xs btn--primary"
                  onClick={() => handleEditStop(stop)}
                  title="Editar ubicación"
                >
                  <Edit size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn--xs btn--danger"
                  onClick={() => handleRemoveStop(stop.id || index)}
                  title="Eliminar parada"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-stops">
          <div className="no-stops-content">
            <div className="no-stops-icon"><Map size={64} strokeWidth={1.5} /></div>
            <h4>No hay paradas definidas</h4>
            <p>Agrega paradas usando el buscador de ubicaciones con mapa interactivo</p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setShowAddForm(true)}
            >
              <Plus size={16} /> Agregar Primera Parada
            </button>
          </div>
        </div>
      )}

      {/* Resumen de paradas */}
      {stops.length > 0 && (
        <div className="stops-summary">
          <div className="summary-stats">
            <div className="stat-item">
              <div className="stat-icon"><MapPin size={20} /></div>
              <div className="stat-info">
                <span className="stat-value">{stops.length}</span>
                <span className="stat-label">Parada{stops.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-icon"><Map size={20} /></div>
              <div className="stat-info">
                <span className="stat-value">{stops.filter(s => s.latitud && s.longitud).length}</span>
                <span className="stat-label">Con coordenadas</span>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-icon"><Ruler size={20} /></div>
              <div className="stat-info">
                <span className="stat-value">~{Math.round(stops.length * 2.5)} km</span>
                <span className="stat-label">Distancia est.</span>
              </div>
            </div>
          </div>
          
          {stops.filter(s => !s.latitud || !s.longitud).length > 0 && (
            <div className="summary-warning">
              <AlertTriangle size={16} /> {stops.filter(s => !s.latitud || !s.longitud).length} parada(s) sin coordenadas exactas. 
              Edítalas para mejorar la precisión del mapa.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedStopsManager;