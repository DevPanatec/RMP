import { useState } from 'react';
import MapLocationPicker from '../MapLocationPicker/MapLocationPicker';
import { Map, MapPin, Plus, X, Edit, Trash2, ClipboardList, AlertTriangle, Ruler, ChevronUp, ChevronDown } from '../Icons';
import { ConfirmDialog } from '../UI';
import './EnhancedStopsManager.css';

const EnhancedStopsManager = ({ stops = [], onStopsChange, showHeader = true }) => {
  const [mapMode, setMapMode] = useState('add'); // 'add' or 'edit'
  const [editingStop, setEditingStop] = useState(null);
  const [stopToDelete, setStopToDelete] = useState(null);

  const handleLocationSelect = (locationData) => {
    if (mapMode === 'edit' && editingStop) {
      // Modo edición
      const updatedStops = stops.map(stop =>
        stop.id === editingStop.id ? {
          ...stop,
          direccion: locationData.direccion,
          direccion_completa: locationData.direccion_completa,
          latitud: locationData.latitud,
          longitud: locationData.longitud
        } : stop
      );
      onStopsChange && onStopsChange(updatedStops);
      setEditingStop(null);
      setMapMode('add');
    } else {
      // Modo agregar
      const newStop = {
        id: Date.now(),
        direccion: locationData.direccion,
        direccion_completa: locationData.direccion_completa,
        latitud: locationData.latitud,
        longitud: locationData.longitud,
        orden: stops.length + 1,
        completada: false
      };
      const updatedStops = [...stops, newStop];
      onStopsChange && onStopsChange(updatedStops);
    }
  };

  const handleRemoveStop = (stopId) => {
    const stop = stops.find(s => s.id === stopId);
    setStopToDelete(stop || { id: stopId });
  };

  const confirmRemoveStop = () => {
    if (!stopToDelete) return;
    const updatedStops = stops.filter(stop => stop.id !== stopToDelete.id);
    const reorderedStops = updatedStops.map((stop, index) => ({
      ...stop,
      orden: index + 1
    }));
    onStopsChange && onStopsChange(reorderedStops);
    setStopToDelete(null);
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
    setMapMode('edit');
  };

  const cancelEdit = () => {
    setEditingStop(null);
    setMapMode('add');
  };

  return (
    <div className="enhanced-stops-manager">
      {/* Layout 2 columnas: Mapa + Lista */}
      <div className="stops-grid-layout">
        {/* Columna Izquierda: Mapa */}
        <div className="map-column">
          <div className="map-header">
            <div className="map-header-content">
              <MapPin size={20} />
              <div>
                <h5>
                  {mapMode === 'edit' && editingStop
                    ? `Editando Parada #${editingStop.orden}`
                    : 'Agregar Nueva Parada'}
                </h5>
                <p>
                  {mapMode === 'edit'
                    ? 'Busca una nueva ubicación o haz clic en el mapa'
                    : 'Busca una dirección o haz clic en el mapa para agregar'}
                </p>
              </div>
            </div>
            {mapMode === 'edit' && editingStop && (
              <button
                type="button"
                className="btn btn--sm btn--outline"
                onClick={cancelEdit}
              >
                <X size={14} />
                Cancelar
              </button>
            )}
          </div>

          <MapLocationPicker
            key={editingStop ? `edit-${editingStop.id}` : 'add'}
            onLocationSelect={handleLocationSelect}
            placeholder={mapMode === 'edit' ? 'Buscar nueva ubicación...' : 'Buscar ubicación...'}
            initialLocation={editingStop?.latitud && editingStop?.longitud ? [editingStop.latitud, editingStop.longitud] : null}
            showCoordinateInput={true}
            height="500px"
          />
        </div>

        {/* Columna Derecha: Lista de paradas */}
        <div className="stops-column">
          <div className="stops-list-header">
            <div className="header-left">
              <ClipboardList size={20} />
              <div>
                <h5>Paradas de la Ruta</h5>
                <p>{stops.length} parada{stops.length !== 1 ? 's' : ''} definida{stops.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          {stops.length > 0 ? (
            <>
              <div className="stops-list">
                {stops.map((stop, index) => (
                  <div
                    key={stop.id || index}
                    className={`stop-item ${editingStop?.id === stop.id ? 'editing' : ''}`}
                  >
                    <div className="stop-number-badge">
                      {stop.orden}
                    </div>

                    <div className="stop-content">
                      <div className="stop-address">
                        {stop.direccion}
                      </div>
                      {stop.direccion_completa && stop.direccion_completa !== stop.direccion && (
                        <div className="stop-full-address">
                          {stop.direccion_completa}
                        </div>
                      )}
                      {stop.latitud && stop.longitud ? (
                        <div className="stop-coordinates">
                          <MapPin size={12} />
                          <span>{stop.latitud.toFixed(6)}, {stop.longitud.toFixed(6)}</span>
                        </div>
                      ) : (
                        <div className="stop-coordinates missing">
                          <AlertTriangle size={12} />
                          <span>Sin coordenadas</span>
                        </div>
                      )}
                    </div>

                    <div className="stop-actions">
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => handleMoveStop(stop.id || index, 'up')}
                        disabled={index === 0}
                        title="Mover arriba"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => handleMoveStop(stop.id || index, 'down')}
                        disabled={index === stops.length - 1}
                        title="Mover abajo"
                      >
                        <ChevronDown size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-icon--primary"
                        onClick={() => handleEditStop(stop)}
                        title="Editar ubicación"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-icon--danger"
                        onClick={() => handleRemoveStop(stop.id || index)}
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resumen */}
              <div className="stops-summary">
                <div className="summary-stats">
                  <div className="stat-item">
                    <MapPin size={18} />
                    <div>
                      <span className="stat-value">{stops.length}</span>
                      <span className="stat-label">Paradas</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <Map size={18} />
                    <div>
                      <span className="stat-value">{stops.filter(s => s.latitud && s.longitud).length}</span>
                      <span className="stat-label">Con GPS</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <Ruler size={18} />
                    <div>
                      <span className="stat-value">~{Math.round(stops.length * 2.5)} km</span>
                      <span className="stat-label">Distancia</span>
                    </div>
                  </div>
                </div>

                {stops.filter(s => !s.latitud || !s.longitud).length > 0 && (
                  <div className="summary-warning">
                    <AlertTriangle size={16} />
                    <span>
                      {stops.filter(s => !s.latitud || !s.longitud).length} parada(s) sin coordenadas.
                      Edítalas para mejorar la precisión.
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-stops">
              <Map size={32} strokeWidth={2} />
              <h4>Sin paradas</h4>
              <p>Usa el mapa de la izquierda para agregar ubicaciones</p>
            </div>
          )}
        </div>
      </div>

      {stopToDelete && (
        <ConfirmDialog
          open
          destructive
          title="¿Eliminar parada?"
          message={`Vas a eliminar la parada #${stopToDelete.orden || ''}${stopToDelete.direccion ? ` (${stopToDelete.direccion})` : ''}.`}
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          onConfirm={confirmRemoveStop}
          onCancel={() => setStopToDelete(null)}
        />
      )}
    </div>
  );
};

export default EnhancedStopsManager;