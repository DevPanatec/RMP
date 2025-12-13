/**
 * Utilidades para exportar rutas GPS en diferentes formatos
 *
 * Soporta: GPX, KML, JSON
 */

/**
 * Exportar ruta como archivo GPX (GPS Exchange Format)
 * Compatible con: Google Maps, Garmin, Strava, etc.
 *
 * @param {Array} locations - Array de puntos GPS con coords, timestamp, speed
 * @param {string} name - Nombre de la ruta
 * @param {string} placa - Placa del vehículo
 */
export const exportToGPX = (locations, name, placa) => {
  if (!locations || locations.length === 0) {
    throw new Error('No hay datos para exportar');
  }

  const trackpoints = locations
    .map((loc) => {
      const lat = loc.coords?.lat || loc.status?.coords?.lat;
      const lon = loc.coords?.lon || loc.status?.coords?.lon;
      const time = loc.timestamp || loc.last_updated;
      const speed = loc.speed || 0;

      if (!lat || !lon) return '';

      return `
    <trkpt lat="${lat}" lon="${lon}">
      <time>${new Date(time).toISOString()}</time>
      <speed>${speed}</speed>
    </trkpt>`;
    })
    .join('');

  const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RMP - Sistema de Gestión de Flotas"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${name || 'Ruta GPS'}</name>
    <desc>Recorrido del vehículo ${placa}</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${placa} - ${name || 'Ruta'}</name>
    <trkseg>${trackpoints}
    </trkseg>
  </trk>
</gpx>`;

  downloadFile(gpxContent, `${placa}_${getDateString()}.gpx`, 'application/gpx+xml');
};

/**
 * Exportar ruta como archivo KML (Keyhole Markup Language)
 * Compatible con: Google Earth, Google Maps
 *
 * @param {Array} locations - Array de puntos GPS
 * @param {string} name - Nombre de la ruta
 * @param {string} placa - Placa del vehículo
 */
export const exportToKML = (locations, name, placa) => {
  if (!locations || locations.length === 0) {
    throw new Error('No hay datos para exportar');
  }

  const coordinates = locations
    .map((loc) => {
      const lat = loc.coords?.lat || loc.status?.coords?.lat;
      const lon = loc.coords?.lon || loc.status?.coords?.lon;
      const alt = loc.altitude || 0;

      if (!lat || !lon) return '';

      // KML usa lon,lat,alt (diferente a GPX)
      return `${lon},${lat},${alt}`;
    })
    .filter(Boolean)
    .join('\n          ');

  const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${placa} - ${name || 'Ruta GPS'}</name>
    <description>Recorrido del vehículo ${placa}</description>
    <Style id="routeStyle">
      <LineStyle>
        <color>ff3D5229</color>
        <width>4</width>
      </LineStyle>
    </Style>
    <Placemark>
      <name>Inicio</name>
      <Point>
        <coordinates>${locations[0].coords?.lon || locations[0].status?.coords?.lon},${
    locations[0].coords?.lat || locations[0].status?.coords?.lat
  },0</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>Recorrido - ${placa}</name>
      <styleUrl>#routeStyle</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>
          ${coordinates}
        </coordinates>
      </LineString>
    </Placemark>
    <Placemark>
      <name>Fin</name>
      <Point>
        <coordinates>${
          locations[locations.length - 1].coords?.lon ||
          locations[locations.length - 1].status?.coords?.lon
        },${
    locations[locations.length - 1].coords?.lat ||
    locations[locations.length - 1].status?.coords?.lat
  },0</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>`;

  downloadFile(kmlContent, `${placa}_${getDateString()}.kml`, 'application/vnd.google-earth.kml+xml');
};

/**
 * Exportar ruta como JSON
 *
 * @param {Array} locations - Array de puntos GPS
 * @param {string} placa - Placa del vehículo
 * @param {object} stats - Estadísticas de la ruta
 */
export const exportToJSON = (locations, placa, stats) => {
  if (!locations || locations.length === 0) {
    throw new Error('No hay datos para exportar');
  }

  const data = {
    vehicle: placa,
    exportDate: new Date().toISOString(),
    statistics: stats,
    locations: locations.map((loc) => ({
      latitude: loc.coords?.lat || loc.status?.coords?.lat,
      longitude: loc.coords?.lon || loc.status?.coords?.lon,
      timestamp: loc.timestamp || loc.last_updated,
      speed: loc.speed || 0,
      course: loc.course,
      battery: loc.battery,
      signal: loc.signal,
    })),
  };

  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `${placa}_${getDateString()}.json`, 'application/json');
};

/**
 * Exportar estadísticas como CSV
 *
 * @param {Array} locations - Array de puntos GPS
 * @param {string} placa - Placa del vehículo
 */
export const exportToCSV = (locations, placa) => {
  if (!locations || locations.length === 0) {
    throw new Error('No hay datos para exportar');
  }

  const headers = ['Timestamp', 'Latitude', 'Longitude', 'Speed (km/h)', 'Course', 'Battery (%)', 'Signal'];
  const rows = locations.map((loc) => [
    loc.timestamp || loc.last_updated,
    loc.coords?.lat || loc.status?.coords?.lat,
    loc.coords?.lon || loc.status?.coords?.lon,
    loc.speed || 0,
    loc.course || '',
    loc.battery || '',
    loc.signal || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  downloadFile(csvContent, `${placa}_${getDateString()}.csv`, 'text/csv');
};

/**
 * Función auxiliar para descargar archivo
 *
 * @param {string} content - Contenido del archivo
 * @param {string} filename - Nombre del archivo
 * @param {string} mimeType - Tipo MIME
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Obtener string de fecha para nombres de archivo
 *
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
function getDateString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Calcular distancia entre dos puntos GPS (fórmula de Haversine)
 *
 * @param {number} lat1 - Latitud punto 1
 * @param {number} lon1 - Longitud punto 1
 * @param {number} lat2 - Latitud punto 2
 * @param {number} lon2 - Longitud punto 2
 * @returns {number} Distancia en kilómetros
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

export default {
  exportToGPX,
  exportToKML,
  exportToJSON,
  exportToCSV,
  calculateDistance,
};
