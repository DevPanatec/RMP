import { useState, useMemo, useRef, useCallback } from 'react';
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin, X, Search, CheckCircle } from '../../Icons';
import { createCircleGeoJSON } from '../../../utils/geoCircle';
import { useGooglePlacesAutocomplete } from '../../../hooks/useGooglePlacesAutocomplete';
import './ZoneMapPicker.css';

// OpenFreeMap positron (sin key) — mismo tile que el resto de mapas.
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

// Defaults Panamá City si no hay initial.
const DEFAULT_CENTER = { lat: 8.983333, lng: -79.51667 };
const MIN_RADIO = 30;
const MAX_RADIO = 1000;

/**
 * ZoneMapPicker — modal map picker para zonas de marcación (ASI).
 * UX igual a la creación de geofencing en monitoreo: click → drop pin (draggable)
 * + slider radio + círculo live preview. Search Google Places opcional.
 *
 * Props:
 *   - initial?: { lat, lng, radio } — pre-llena pin si editás zona existente
 *   - onConfirm: ({ lat, lng, radio, direccion? }) => void
 *   - onClose: () => void
 */
const ZoneMapPicker = ({ initial, onConfirm, onClose }) => {
  const startCenter = initial?.lat
    ? { lat: initial.lat, lng: initial.lng }
    : DEFAULT_CENTER;

  const [pin, setPin] = useState(initial?.lat ? { lat: initial.lat, lng: initial.lng } : null);
  const [radio, setRadio] = useState(initial?.radio ?? 100);
  const [direccion, setDireccion] = useState(initial?.direccion ?? '');
  const [viewState, setViewState] = useState({
    longitude: startCenter.lng,
    latitude: startCenter.lat,
    zoom: pin ? 16 : 13,
  });
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const mapRef = useRef(null);

  const { suggestions, isLoading, searchPlaces, getPlaceDetails, isReady } =
    useGooglePlacesAutocomplete();

  // Círculo en GeoJSON (live, recomputa al mover pin o radio)
  const circleGeoJSON = useMemo(() => {
    if (!pin) return null;
    return createCircleGeoJSON(pin, radio, 64);
  }, [pin, radio]);

  // Click en mapa → posiciona pin (o lo mueve si ya existe)
  const handleMapClick = useCallback((e) => {
    const { lng, lat } = e.lngLat;
    setPin({ lat, lng });
  }, []);

  // Drag pin → updatea posición. Marker MapLibre dispara dragend con coords nuevas.
  const handlePinDragEnd = useCallback((e) => {
    const { lng, lat } = e.lngLat;
    setPin({ lat, lng });
  }, []);

  // Search via Google Places (mismo hook que MapLocationPicker existente)
  const handleQueryChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    if (v.length >= 3) {
      searchPlaces(v);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionPick = async (prediction) => {
    try {
      const geo = await getPlaceDetails(prediction.place_id);
      // geo viene del Google Geocoding result; extraer location.
      const loc = geo?.geometry?.location;
      if (!loc) return;
      const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
      const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
      setPin({ lat, lng });
      setDireccion(prediction.description ?? '');
      setQuery(prediction.description ?? '');
      setShowSuggestions(false);
      setViewState({ latitude: lat, longitude: lng, zoom: 17 });
      // FlyTo suave si tenemos ref
      if (mapRef.current) {
        mapRef.current.flyTo({ center: [lng, lat], zoom: 17, duration: 800 });
      }
    } catch (err) {
      console.warn('Geocode falló:', err);
    }
  };

  const handleConfirm = () => {
    if (!pin) return;
    onConfirm({
      lat: pin.lat,
      lng: pin.lng,
      radio,
      direccion: direccion.trim() || undefined,
    });
  };

  const canConfirm = pin && radio >= MIN_RADIO && radio <= MAX_RADIO;

  return (
    <div className="zmp-overlay" onClick={onClose}>
      <div className="zmp-panel" onClick={(e) => e.stopPropagation()}>
        <header className="zmp-header">
          <div>
            <h3>Seleccionar zona en el mapa</h3>
            <p className="zmp-hint">
              {pin
                ? `Pin en ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)} · radio ${radio}m`
                : 'Click en el mapa para colocar el pin · arrástralo pa\' ajustar'}
            </p>
          </div>
          <button className="zmp-icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <div className="zmp-search">
          <Search size={16} className="zmp-search__icon" />
          <input
            type="text"
            className="zmp-search__input"
            placeholder={isReady ? 'Buscar dirección (Google Places)…' : 'Buscar (Google Places no listo)'}
            value={query}
            onChange={handleQueryChange}
            disabled={!isReady}
          />
          {isLoading && <span className="zmp-search__loading">…</span>}
          {showSuggestions && suggestions?.length > 0 && (
            <ul className="zmp-suggestions">
              {suggestions.slice(0, 6).map((s) => (
                <li
                  key={s.place_id}
                  className="zmp-suggestion"
                  onClick={() => handleSuggestionPick(s)}
                >
                  <MapPin size={14} />
                  <span>{s.description}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="zmp-map-wrap">
          <Map
            ref={mapRef}
            {...viewState}
            onMove={(evt) => setViewState(evt.viewState)}
            onClick={handleMapClick}
            mapStyle={MAP_STYLE}
            cursor={pin ? 'grab' : 'crosshair'}
            style={{ width: '100%', height: '100%' }}
          >
            <NavigationControl position="top-right" />

            {circleGeoJSON && (
              <Source id="zone-preview-circle" type="geojson" data={circleGeoJSON}>
                <Layer
                  id="zone-preview-fill"
                  type="fill"
                  paint={{ 'fill-color': '#0078D4', 'fill-opacity': 0.18 }}
                />
                <Layer
                  id="zone-preview-stroke"
                  type="line"
                  paint={{
                    'line-color': '#0078D4',
                    'line-width': 2.5,
                    'line-opacity': 0.85,
                  }}
                />
              </Source>
            )}

            {pin && (
              <Marker
                longitude={pin.lng}
                latitude={pin.lat}
                anchor="bottom"
                draggable
                onDragEnd={handlePinDragEnd}
              >
                <div className="zmp-pin" title="Arrastra pa' ajustar">
                  <MapPin size={28} />
                </div>
              </Marker>
            )}
          </Map>
        </div>

        <div className="zmp-controls">
          <label className="zmp-control">
            <span className="zmp-control__label">
              Radio: <strong>{radio} m</strong>
            </span>
            <input
              type="range"
              min={MIN_RADIO}
              max={MAX_RADIO}
              step={10}
              value={radio}
              onChange={(e) => setRadio(Number(e.target.value))}
            />
            <div className="zmp-control__hints">
              <span>{MIN_RADIO}m</span>
              <span>{MAX_RADIO}m</span>
            </div>
          </label>

          <label className="zmp-control">
            <span className="zmp-control__label">Dirección (opcional)</span>
            <input
              type="text"
              className="zmp-text-input"
              placeholder="Edif. ABC, Calle 50"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
            />
          </label>
        </div>

        <footer className="zmp-footer">
          <button className="zmp-btn" onClick={onClose}>Cancelar</button>
          <button
            className="zmp-btn zmp-btn--primary"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            <CheckCircle size={16} />
            {pin ? 'Usar esta zona' : 'Coloca un pin primero'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ZoneMapPicker;
