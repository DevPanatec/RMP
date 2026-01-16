import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Search, MapPin, CheckCircle, Navigation, Lightbulb, Home } from '../Icons';
import { useGooglePlacesAutocomplete } from '../../hooks/useGooglePlacesAutocomplete';
import { mapGooglePlaceToLocation } from '../../utils/googlePlacesMapper';
import 'leaflet/dist/leaflet.css';
import './MapLocationPicker.css';

// Fix para iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Icono personalizado para nueva ubicación
const createLocationIcon = () => {
  const iconHtml = `
    <div style="
      background: linear-gradient(135deg, #2E7D32, #43A047);
      color: white;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 16px;
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(46, 125, 50, 0.4);
      cursor: pointer;
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
    </div>
  `;
  
  return L.divIcon({
    html: iconHtml,
    className: 'custom-location-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

// Componente para manejar clicks en el mapa
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    }
  });
  return null;
};

const MapLocationPicker = ({
  onLocationSelect,
  placeholder = "Buscar ubicación...",
  initialLocation = null,
  showCoordinateInput = true,
  height = "400px"
}) => {
  // Google Places hook
  const {
    suggestions,
    isLoading,
    searchPlaces,
    getPlaceDetails,
    reverseGeocode,
    isReady
  } = useGooglePlacesAutocomplete();

  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapCenter, setMapCenter] = useState(initialLocation || [8.9824, -79.5199]); // Ciudad de Panamá por defecto
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCoords, setManualCoords] = useState({ lat: '', lng: '' });
  const inputRef = useRef(null);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length >= 3) {
      searchPlaces(value); // Llama a Google API (con debounce)
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = async (prediction) => {
    try {
      // Paso 1: Obtener detalles completos (incluye coordenadas)
      const geocodeResult = await getPlaceDetails(prediction.place_id);

      // Paso 2: Mapear a estructura RMP
      const locationData = mapGooglePlaceToLocation(prediction, geocodeResult);

      setQuery(locationData.direccion);
      setShowSuggestions(false);
      setMapCenter([locationData.latitud, locationData.longitud]);
      setSelectedLocation([locationData.latitud, locationData.longitud]);

      if (onLocationSelect) {
        onLocationSelect(locationData);
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      alert('Error al obtener detalles de la ubicación');
    }
  };

  const handleMapClick = async (latlng) => {
    const newLocation = [latlng.lat, latlng.lng];
    setSelectedLocation(newLocation);
    setMapCenter(newLocation);

    try {
      const locationData = await reverseGeocode(latlng.lat, latlng.lng);
      setQuery(locationData.direccion);

      if (onLocationSelect) {
        onLocationSelect(locationData);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      // Fallback a coordenadas
      const fallbackData = {
        direccion: `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`,
        direccion_completa: `Coordenadas: ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`,
        latitud: latlng.lat,
        longitud: latlng.lng
      };
      setQuery(fallbackData.direccion);
      if (onLocationSelect) onLocationSelect(fallbackData);
    }
  };

  const handleManualCoordinates = async () => {
    const lat = parseFloat(manualCoords.lat);
    const lng = parseFloat(manualCoords.lng);

    if (isNaN(lat) || isNaN(lng)) {
      alert('Por favor ingresa coordenadas válidas');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Coordenadas fuera del rango válido');
      return;
    }

    const newLocation = [lat, lng];
    setSelectedLocation(newLocation);
    setMapCenter(newLocation);

    try {
      const locationData = await reverseGeocode(lat, lng);
      setQuery(locationData.direccion);

      if (onLocationSelect) {
        onLocationSelect(locationData);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      // Fallback a coordenadas
      const fallbackData = {
        direccion: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        direccion_completa: `Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        latitud: lat,
        longitud: lng
      };
      setQuery(fallbackData.direccion);
      if (onLocationSelect) onLocationSelect(fallbackData);
    }

    setShowManualInput(false);
    setManualCoords({ lat: '', lng: '' });
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Delay para permitir click en sugerencias
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedLocation(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };


  return (
    <div className="map-location-picker">
      {/* Barra de búsqueda */}
      <div className="search-section">
        <div className="search-input-container">
          <div className="search-icon">
            <Search size={18} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="search-input"
          />
          
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="clear-button"
              title="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
          
          {isLoading && (
            <div className="loading-indicator">
              <div className="spinner"></div>
            </div>
          )}
        </div>

        {/* Botones de acciones adicionales */}
        <div className="search-actions">
          {showCoordinateInput && (
            <button
              type="button"
              className="btn btn--sm btn--outline"
              onClick={() => setShowManualInput(!showManualInput)}
              title="Ingresar coordenadas manualmente"
            >
              <Navigation size={14} />
              <span>Coordenadas</span>
            </button>
          )}
          
          <button
            type="button"
            className="btn btn--sm btn--secondary"
            onClick={() => {
              setMapCenter([8.9824, -79.5199]);
              setSelectedLocation(null);
              setQuery('');
            }}
            title="Centrar en Ciudad de Panamá"
          >
            <Home size={14} />
            <span>Panamá</span>
          </button>
        </div>
      </div>

      {/* Input de coordenadas manuales */}
      {showManualInput && (
        <div className="coordinate-input-section">
          <div className="coordinate-inputs">
            <div className="coord-group">
              <label>Latitud:</label>
              <input
                type="number"
                step="any"
                value={manualCoords.lat}
                onChange={(e) => setManualCoords(prev => ({ ...prev, lat: e.target.value }))}
                placeholder="8.9824"
                className="coord-input"
              />
            </div>
            <div className="coord-group">
              <label>Longitud:</label>
              <input
                type="number"
                step="any"
                value={manualCoords.lng}
                onChange={(e) => setManualCoords(prev => ({ ...prev, lng: e.target.value }))}
                placeholder="-79.5199"
                className="coord-input"
              />
            </div>
            <button
              type="button"
              className="btn btn--sm btn--primary"
              onClick={handleManualCoordinates}
            >
              <CheckCircle size={14} />
              <span>Aplicar</span>
            </button>
          </div>
          <div className="coordinate-help">
            <Lightbulb size={14} />
            <span>Ingresa las coordenadas en formato decimal (ej: 8.9824, -79.5199)</span>
          </div>
        </div>
      )}

      {/* Estado de carga del servicio */}
      {!isReady && (
        <div style={{ padding: '8px', textAlign: 'center', color: '#6b7280' }}>
          Cargando servicios de mapas...
        </div>
      )}

      {/* Dropdown de sugerencias */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="suggestions-dropdown">
          {suggestions.map((prediction) => (
            <div
              key={prediction.place_id}
              className="suggestion-item"
              onClick={() => handleSuggestionClick(prediction)}
            >
              <div className="suggestion-icon">
                <MapPin size={16} />
              </div>
              <div className="suggestion-text">
                <div className="suggestion-address">
                  {prediction.structured_formatting?.main_text ||
                   prediction.description.split(',')[0]}
                </div>
                <div className="suggestion-full-address">
                  {prediction.structured_formatting?.secondary_text ||
                   prediction.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showSuggestions && query.length >= 3 && suggestions.length === 0 && !isLoading && (
        <div className="suggestions-dropdown">
          <div className="no-results">
            No se encontraron resultados para "{query}"
          </div>
        </div>
      )}

      {/* Mapa interactivo */}
      <div className="map-container" style={{ height }}>
        <MapContainer 
          center={mapCenter} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
          key={`${mapCenter[0]}-${mapCenter[1]}`}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <MapClickHandler onMapClick={handleMapClick} />
          
          {selectedLocation && (
            <Marker
              position={selectedLocation}
              icon={createLocationIcon()}
            />
          )}
        </MapContainer>
        
        {/* Instrucciones del mapa */}
        <div className="map-instructions">
          <MapPin size={14} />
          <span>Haz clic en el mapa para seleccionar una ubicación</span>
        </div>
      </div>

      {/* Información de la ubicación seleccionada */}
      {selectedLocation && (
        <div className="selected-location-info">
          <div className="location-preview">
            <div className="location-icon">
              <MapPin size={20} />
            </div>
            <div className="location-details">
              <div className="location-address">{query}</div>
              <div className="location-coordinates">
                {selectedLocation[0].toFixed(6)}, {selectedLocation[1].toFixed(6)}
              </div>
            </div>
            <div className="location-status">
              <CheckCircle size={20} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapLocationPicker;