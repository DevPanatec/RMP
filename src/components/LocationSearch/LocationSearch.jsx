import { useState, useRef, useEffect } from 'react';
import { MapPin, X } from '../Icons';
import './LocationSearch.css';

const LocationSearch = ({ onLocationSelect, placeholder = "Buscar ubicación...", initialValue = "" }) => {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimer = useRef(null);
  const inputRef = useRef(null);

  const searchLocations = async (searchQuery) => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    
    try {
      // Usar Nominatim API (OpenStreetMap) - gratuita y sin necesidad de API key
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=co&addressdetails=1&bounded=1&viewbox=-74.3,-3.8,-73.8,5.2`
      );
      
      if (!response.ok) throw new Error('Error en la búsqueda');
      
      const data = await response.json();

      // Nominatim normalmente devuelve array; si error/objeto, fallback a vacío para no crashear .map.
      if (!Array.isArray(data)) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

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

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.address);
    setSuggestions([]);
    setShowSuggestions(false);
    
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
    <div className="location-search">
      <div className="search-input-container">
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
            <X size={16} />
          </button>
        )}
        
        {isLoading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
          </div>
        )}
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="suggestions-dropdown">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="suggestion-item"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="suggestion-icon"><MapPin size={16} /></div>
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
    </div>
  );
};

export default LocationSearch;