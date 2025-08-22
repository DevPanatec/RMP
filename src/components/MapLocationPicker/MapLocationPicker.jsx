import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
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
      📍
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
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState(initialLocation || [4.6097100, -74.0817500]); // Bogotá por defecto
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCoords, setManualCoords] = useState({ lat: '', lng: '' });
  const debounceTimer = useRef(null);
  const inputRef = useRef(null);

  // Función para buscar ubicaciones
  const searchLocations = async (searchQuery) => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    
    try {
      // Usar Nominatim API con enfoque en Colombia
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=8&countrycodes=co&addressdetails=1&bounded=1&viewbox=-74.3,-3.8,-73.8,5.2`
      );
      
      if (!response.ok) throw new Error('Error en la búsqueda');
      
      const data = await response.json();
      
      const formattedSuggestions = data.map(item => ({
        id: item.place_id,
        display_name: item.display_name,
        address: item.display_name.split(',')[0],
        full_address: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        type: item.type || 'place'
      }));
      
      setSuggestions(formattedSuggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error searching locations:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para obtener dirección desde coordenadas (geocodificación inversa)
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      
      if (!response.ok) throw new Error('Error en geocodificación inversa');
      
      const data = await response.json();
      return {
        address: data.display_name?.split(',')[0] || `${lat}, ${lng}`,
        full_address: data.display_name || `${lat}, ${lng}`,
        latitude: lat,
        longitude: lng
      };
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return {
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        full_address: `Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        latitude: lat,
        longitude: lng
      };
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    
    // Cancelar búsqueda anterior
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Nueva búsqueda con delay
    debounceTimer.current = setTimeout(() => {
      searchLocations(value);
    }, 300);
  };

  const handleSuggestionClick = async (suggestion) => {
    setQuery(suggestion.address);
    setSuggestions([]);
    setShowSuggestions(false);
    
    const newLocation = [suggestion.lat, suggestion.lon];
    setMapCenter(newLocation);
    setSelectedLocation(newLocation);
    
    // Llamar callback con los datos de la ubicación
    if (onLocationSelect) {
      onLocationSelect({
        address: suggestion.address,
        full_address: suggestion.full_address,
        latitude: suggestion.lat,
        longitude: suggestion.lon,
        display_name: suggestion.display_name
      });
    }
  };

  const handleMapClick = async (latlng) => {
    const newLocation = [latlng.lat, latlng.lng];
    setSelectedLocation(newLocation);
    setMapCenter(newLocation);
    
    // Obtener dirección de las coordenadas
    const locationData = await reverseGeocode(latlng.lat, latlng.lng);
    setQuery(locationData.address);
    
    // Llamar callback
    if (onLocationSelect) {
      onLocationSelect(locationData);
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
    
    // Obtener dirección de las coordenadas
    const locationData = await reverseGeocode(lat, lng);
    setQuery(locationData.address);
    
    // Llamar callback
    if (onLocationSelect) {
      onLocationSelect(locationData);
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

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <div className="map-location-picker">
      {/* Barra de búsqueda */}
      <div className="search-section">
        <div className="search-input-container">
          <div className="search-icon">🔍</div>
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
              📍 Coordenadas
            </button>
          )}
          
          <button
            type="button"
            className="btn btn--sm btn--secondary"
            onClick={() => {
              setMapCenter([4.6097100, -74.0817500]);
              setSelectedLocation(null);
              setQuery('');
            }}
            title="Centrar en Bogotá"
          >
            🏠 Bogotá
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
                placeholder="4.6097"
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
                placeholder="-74.0817"
                className="coord-input"
              />
            </div>
            <button
              type="button"
              className="btn btn--sm btn--primary"
              onClick={handleManualCoordinates}
            >
              ✅ Aplicar
            </button>
          </div>
          <div className="coordinate-help">
            💡 Ingresa las coordenadas en formato decimal (ej: 4.6097, -74.0817)
          </div>
        </div>
      )}

      {/* Dropdown de sugerencias */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="suggestions-dropdown">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="suggestion-item"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="suggestion-icon">📍</div>
              <div className="suggestion-text">
                <div className="suggestion-address">{suggestion.address}</div>
                <div className="suggestion-full-address">{suggestion.full_address}</div>
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
          📍 Haz clic en el mapa para seleccionar una ubicación
        </div>
      </div>

      {/* Información de la ubicación seleccionada */}
      {selectedLocation && (
        <div className="selected-location-info">
          <div className="location-preview">
            <div className="location-icon">📍</div>
            <div className="location-details">
              <div className="location-address">{query}</div>
              <div className="location-coordinates">
                {selectedLocation[0].toFixed(6)}, {selectedLocation[1].toFixed(6)}
              </div>
            </div>
            <div className="location-status">✅</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapLocationPicker;