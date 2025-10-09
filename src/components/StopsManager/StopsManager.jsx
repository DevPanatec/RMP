import { useState } from 'react';
import LocationSearch from '../LocationSearch/LocationSearch';
import { Plus, X, Lightbulb } from '../Icons';
import './StopsManager.css';

const StopsManager = ({ stops = [], onStopsChange }) => {
  const [showAddForm, setShowAddForm] = useState(false);

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

  const handleRemoveStop = (stopId) => {
    const updatedStops = stops.filter(stop => stop.id !== stopId);
    // Reordenar
    const reorderedStops = updatedStops.map((stop, index) => ({
      ...stop,
      orden: index + 1
    }));
    onStopsChange && onStopsChange(reorderedStops);
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

  return (
    <div className="stops-manager">
      <div className="stops-header">
        <label>Paradas de la Ruta:</label>
        <button 
          type="button"
          className="btn btn--sm btn--primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? <><X size={14} /> Cancelar</> : <><Plus size={14} /> Agregar Parada</>}
        </button>
      </div>

      {showAddForm && (
        <div className="add-stop-form">
          <LocationSearch
            placeholder="Buscar ubicación para nueva parada..."
            onLocationSelect={handleLocationSelect}
          />
          <div className="add-stop-help">
            <Lightbulb size={16} /> Escribe una dirección y selecciona de las sugerencias para agregar coordenadas exactas
          </div>
        </div>
      )}

      {stops.length > 0 ? (
        <div className="stops-list">
          {stops.map((stop, index) => (
            <div key={stop.id || index} className="stop-item">
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
                {stop.latitud && stop.longitud && (
                  <div className="stop-coordinates">
                    📍 {stop.latitud.toFixed(6)}, {stop.longitud.toFixed(6)}
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
                  className="btn btn--xs btn--danger"
                  onClick={() => handleRemoveStop(stop.id || index)}
                  title="Eliminar parada"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-stops">
          <div className="no-stops-icon">📍</div>
          <div>No hay paradas definidas</div>
          <div className="no-stops-help">
            Agrega paradas usando el buscador de ubicaciones
          </div>
        </div>
      )}

      {stops.length > 0 && (
        <div className="stops-summary">
          <strong>Total: {stops.length} parada{stops.length !== 1 ? 's' : ''}</strong>
          {stops.filter(s => s.latitud && s.longitud).length > 0 && (
            <span className="stops-with-coords">
              • {stops.filter(s => s.latitud && s.longitud).length} con coordenadas
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StopsManager;