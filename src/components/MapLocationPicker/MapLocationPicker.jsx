import { useState, useRef, useEffect, useCallback } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import { Search, MapPin, CheckCircle, Navigation, Lightbulb, Home, X } from '../Icons';
import { useGooglePlacesAutocomplete } from '../../hooks/useGooglePlacesAutocomplete';
import { mapGooglePlaceToLocation } from '../../utils/googlePlacesMapper';
import 'maplibre-gl/dist/maplibre-gl.css';
import './MapLocationPicker.css';

// OpenFreeMap Positron — same tiles used by the dashboard map (no key required).
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

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
  const [viewState, setViewState] = useState({
    longitude: initialLocation ? initialLocation[1] : -79.5199,
    latitude: initialLocation ? initialLocation[0] : 8.9824,
    zoom: 13
  });
  const [selectedLocation, setSelectedLocation] = useState(
    initialLocation ? { lat: initialLocation[0], lng: initialLocation[1] } : null
  );
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCoords, setManualCoords] = useState({ lat: '', lng: '' });
  const inputRef = useRef(null);

  // Update view when initialLocation changes
  useEffect(() => {
    if (initialLocation) {
      setViewState(prev => ({
        ...prev,
        latitude: initialLocation[0],
        longitude: initialLocation[1]
      }));
      setSelectedLocation({ lat: initialLocation[0], lng: initialLocation[1] });
    }
  }, [initialLocation]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    console.log('Search input:', value, '| isReady:', isReady, '| length:', value.length);

    if (value.length >= 3) {
      searchPlaces(value);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = async (prediction) => {
    try {
      const geocodeResult = await getPlaceDetails(prediction.place_id);
      const locationData = mapGooglePlaceToLocation(prediction, geocodeResult);

      setQuery(locationData.direccion);
      setShowSuggestions(false);
      setViewState(prev => ({
        ...prev,
        latitude: locationData.latitud,
        longitude: locationData.longitud,
        zoom: 16
      }));
      setSelectedLocation({ lat: locationData.latitud, lng: locationData.longitud });

      if (onLocationSelect) {
        onLocationSelect(locationData);
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      alert('Error al obtener detalles de la ubicación');
    }
  };

  const handleMapClick = useCallback(async (event) => {
    const { lng, lat } = event.lngLat;
    setSelectedLocation({ lat, lng });

    try {
      const locationData = await reverseGeocode(lat, lng);
      setQuery(locationData.direccion);

      if (onLocationSelect) {
        onLocationSelect(locationData);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      const fallbackData = {
        direccion: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        direccion_completa: `Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        latitud: lat,
        longitud: lng
      };
      setQuery(fallbackData.direccion);
      if (onLocationSelect) onLocationSelect(fallbackData);
    }
  }, [onLocationSelect, reverseGeocode]);

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

    setSelectedLocation({ lat, lng });
    setViewState(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      zoom: 16
    }));

    try {
      const locationData = await reverseGeocode(lat, lng);
      setQuery(locationData.direccion);

      if (onLocationSelect) {
        onLocationSelect(locationData);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
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
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const clearSearch = () => {
    setQuery('');
    setShowSuggestions(false);
    setSelectedLocation(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const resetToPanama = () => {
    setViewState(prev => ({
      ...prev,
      latitude: 8.9824,
      longitude: -79.5199,
      zoom: 13
    }));
    setSelectedLocation(null);
    setQuery('');
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
              aria-label="Limpiar búsqueda"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}

          {isLoading && (
            <div className="loading-indicator">
              <div className="spinner"></div>
            </div>
          )}

          {/* Dropdown de sugerencias - dentro del input container para posición absoluta */}
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
            onClick={resetToPanama}
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

      {/* Mapa interactivo - MapLibre */}
      <div className="map-container" style={{ height }}>
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          onClick={handleMapClick}
          mapStyle={MAP_STYLE}
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="top-right" />

          {selectedLocation && (
            <Marker
              longitude={selectedLocation.lng}
              latitude={selectedLocation.lat}
              anchor="bottom"
            >
              <div className="maplibre-location-marker">
                <MapPin size={32} strokeWidth={2.5} />
              </div>
            </Marker>
          )}
        </Map>

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
                {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
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
