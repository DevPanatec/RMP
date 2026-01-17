// Map Components Barrel Export
// Leaflet version (legacy)
export { default as MapComponent } from './MapComponent';

// MapLibre version (new - smooth vector tiles)
export { default as MapLibreComponent } from './MapLibreComponent';

// Default export is MapLibre for new implementations
export { default } from './MapLibreComponent';
