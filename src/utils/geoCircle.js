/**
 * createCircleGeoJSON — círculo aproximado en GeoJSON Polygon pa' MapLibre.
 * @param {{lat?:number, lng?:number, latitud?:number, longitud?:number}} center
 * @param {number} radiusMeters
 * @param {number} [points=32] resolución del polígono
 */
export function createCircleGeoJSON(center, radiusMeters, points = 32) {
  const lat = center.lat ?? center.latitud;
  const lng = center.lng ?? center.longitud;
  const radiusKm = radiusMeters / 1000;
  const coords = [];

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = radiusKm * Math.cos(angle);
    const dy = radiusKm * Math.sin(angle);
    const newLat = lat + dy / 111.32;
    const newLng = lng + dx / (111.32 * Math.cos((lat * Math.PI) / 180));
    coords.push([newLng, newLat]);
  }

  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: {},
  };
}
