// Google Maps helpers. Key viene de VITE_GOOGLE_MAPS_API_KEY (env, gitignored).
// Las restricciones reales de uso viven en Google Cloud Console
// (HTTP referrer + API allowlist) — NO acá.

export const GMAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Embed iframe URL (Maps Embed API). `query` ya debe venir encoded
// (lat,lng o encodeURIComponent('Nombre, Panama City, Panama')).
export function buildGmapsEmbedUrl(query, zoom = 16) {
  if (!GMAPS_API_KEY) {
    console.warn('[gmaps] VITE_GOOGLE_MAPS_API_KEY no definida; embed iframe no funcionará.');
  }
  return `https://www.google.com/maps/embed/v1/place?key=${GMAPS_API_KEY}&q=${query}&zoom=${zoom}`;
}

// External URL para abrir Google Maps en nueva tab (no usa API key).
export function buildGmapsSearchUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
