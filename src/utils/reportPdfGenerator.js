/**
 * Utilidad de generacion de PDFs para reportes COMPLETOS
 * Genera un PDF con diseño profesional replicando los modales de detalle
 * Incluye mapas estaticos, fotos en 3 columnas, y stats cards
 */
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.vfs;

// ============================================
// CONSTANTES DE DISEÑO - FLUENT DESIGN SYSTEM
// ============================================
const COLORS = {
  // Colores por servicio
  recoleccion: '#107C10',       // Fluent Green
  fumigacion: '#0078D4',         // Microsoft Blue
  limpieza: '#8764B8',           // Purple
  mantenimiento: '#CA5010',      // Orange

  // Colores base Fluent
  primary: '#0078D4',            // Microsoft Blue
  surface: '#FFFFFF',            // Pure White
  surfaceSecondary: '#F3F2F1',   // Warm Gray
  background: '#F3F2F1',         // Warm Gray (alias)

  // Text Fluent
  text: '#323130',               // Fluent Charcoal
  textSecondary: '#605E5C',      // Fluent Gray
  textTertiary: '#9CA3AF',       // Light Gray

  // Borders Fluent
  border: '#EDEBE9',             // Fluent Neutral Stroke
  borderStrong: '#D2D0CE',       // Fluent Strong Stroke

  // System colors Fluent
  success: '#107C10',            // Fluent Green
  successLight: '#E6F2E6',        // Light green (hex for pdfmake)
  warning: '#FFB900',            // Fluent Amber
  warningLight: '#FFF8E1',       // Light amber
  error: '#D13438',              // Fluent Red
  errorLight: '#FDEDED',         // Light red
  info: '#0078D4',               // Fluent Blue
  infoLight: '#E6F0FA',          // Light blue

  // Colores de fotos (estados visuales)
  fotoAntes: '#dc2626',          // Rojo
  fotoAntesLight: '#FEE8E8',     // Light red
  fotoDurante: '#d97706',        // Naranja
  fotoDuranteLight: '#FEF3E2',   // Light orange
  fotoDespues: '#16a34a',        // Verde
  fotoDespuesLight: '#E8F8EE',   // Light green
};

// ============================================
// HELPERS
// ============================================
const formatProjectLine = (proyecto) =>
  proyecto?.nombre ? `Proyecto: ${proyecto.nombre}` : null;

const projectFilenameSuffix = (proyecto) =>
  proyecto?.nombre
    ? `_${String(proyecto.nombre).replace(/[^a-zA-Z0-9]+/g, '-')}`
    : '';

const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  if (typeof dateStr === 'number') return new Date(dateStr);
  if (dateStr.includes('T')) return new Date(dateStr);
  return new Date(dateStr + 'T00:00:00');
};

const formatDate = (dateStr) => {
  return parseLocalDate(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return '-';
  return parseLocalDate(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatTime = (timeStr) => {
  if (!timeStr) return '-';
  return timeStr;
};

const formatDuration = (minutes) => {
  if (minutes === null || minutes === undefined) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

const formatSeconds = (seconds) => {
  if (seconds === null || seconds === undefined) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

/**
 * Filtra reportes por rango de fechas usando comparación de Date objects
 * Evita bugs de comparación de strings con formatos ISO/timestamps
 */
const filterByDateRangeProper = (reports, dateField, desde, hasta) => {
  const desdeDate = parseLocalDate(desde);
  const hastaDate = parseLocalDate(hasta);
  hastaDate.setHours(23, 59, 59, 999);
  return reports.filter(item => {
    const dateValue = typeof dateField === 'function' ? dateField(item) : item[dateField];
    const itemDate = parseLocalDate(dateValue);
    return itemDate >= desdeDate && itemDate <= hastaDate;
  });
};

/**
 * Convierte una URL de imagen a base64
 */
const imageUrlToBase64 = async (url) => {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`❌ Fetch failed for ${url}: ${response.status} ${response.statusText}`);
      return null;
    }
    const blob = await response.blob();
    console.log(`📄 Blob loaded: ${url} (${blob.type}, ${blob.size} bytes)`);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = (e) => {
        console.warn(`❌ FileReader error for ${url}:`, e);
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('❌ Error convirtiendo imagen a base64:', url, error);
    return null;
  }
};

/**
 * Genera URL de mapa estatico usando Mapbox Static Images API
 * Usa el tema OSCURO (dark-v11) similar al mapa de monitoreo
 * Docs: https://docs.mapbox.com/api/maps/static-images/
 */
const MAPBOX_TOKEN = 'pk.eyJ1Ijoia2V2aW5uMjMiLCJhIjoiY204Y2J0bWN1MTg5ZzJtb2xobXljODM0MiJ9.48MFADtQhp_sFuQjewLFeA';
const MAP_STYLE = 'mapbox/dark-v11'; // Estilo oscuro similar al de monitoreo

const getStaticMapWithMarker = (lat, lng, zoom = 15) => {
  if (!lat || !lng) return null;
  const marker = `pin-l+2DD4BF(${lng},${lat})`;
  // Ratio 3:1 compacto para caber en 1 página (600x200)
  return `https://api.mapbox.com/styles/v1/${MAP_STYLE}/static/${marker}/${lng},${lat},${zoom},0/600x200@2x?access_token=${MAPBOX_TOKEN}&attribution=false&logo=false`;
};

/**
 * Genera URL de mapa estatico con multiples markers (para rutas)
 * Formato horizontal para PDFs (ratio 1.8:1)
 */
const getStaticMapWithRoute = (paradas, zoom = 12) => {
  if (!paradas || paradas.length === 0) return null;

  // Calcular centro y bounds
  const lats = paradas.map(p => p.lat).filter(Boolean);
  const lngs = paradas.map(p => p.lng).filter(Boolean);
  if (lats.length === 0) return null;

  const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

  // Calcular zoom basado en la extension de las paradas
  const latDiff = Math.max(...lats) - Math.min(...lats);
  const lngDiff = Math.max(...lngs) - Math.min(...lngs);
  const maxDiff = Math.max(latDiff, lngDiff);
  let autoZoom = 14;
  if (maxDiff > 0.1) autoZoom = 11;
  else if (maxDiff > 0.05) autoZoom = 12;
  else if (maxDiff > 0.02) autoZoom = 13;

  // Crear markers para cada parada (maximo 10)
  // Mapbox formato: pin-{size}-{label}+{color}({lng},{lat})
  // Color turquesa/verde como en el modal: 2DD4BF
  const markersArr = paradas
    .filter(p => p.lat && p.lng)
    .slice(0, 10)
    .map((p, idx) => `pin-s-${idx + 1}+2DD4BF(${p.lng},${p.lat})`);

  const markersStr = markersArr.join(',');

  // Ratio 3:1 compacto para caber en 1 página (600x200)
  return `https://api.mapbox.com/styles/v1/${MAP_STYLE}/static/${markersStr}/${centerLng},${centerLat},${autoZoom},0/600x200@2x?access_token=${MAPBOX_TOKEN}&attribution=false&logo=false`;
};

/**
 * Carga multiples imagenes y las convierte a base64
 */
const loadPhotosAsBase64 = async (photos, maxPhotos = 3) => {
  if (!photos || photos.length === 0) return [];
  const results = await Promise.all(
    photos.slice(0, maxPhotos).map(async (photo) => {
      const base64 = await imageUrlToBase64(photo.url);
      return base64 ? { base64, name: photo.file_name || 'foto' } : null;
    })
  );
  return results.filter(Boolean);
};

/**
 * Carga los logos de certificación + logo del servicio
 * @param {string} serviceType - 'recoleccion' | 'limpieza' | 'fumigacion' | 'mantenimiento' | null
 */
const loadCertificationLogos = async (serviceType = null) => {
  const baseUrl = window.location.origin;

  const serviceLogos = {
    recoleccion: `${baseUrl}/icons/modules/recoleccion-small.png`,
    limpieza: `${baseUrl}/icons/modules/limpieza-small.png`,
    fumigacion: `${baseUrl}/icons/modules/fumigacion-small.png`,
    mantenimiento: `${baseUrl}/icons/modules/mantenimiento-small.png`
  };

  const urls = {
    sgs: `${baseUrl}/icons/modules/sgs-iso.png`,
    hombres: `${baseUrl}/icons/modules/logo-hb-new.png`,
    issa: `${baseUrl}/icons/modules/issa.png`,
    service: serviceType ? serviceLogos[serviceType] : null
  };

  console.log('🖼️ Cargando logos desde:', urls);

  const [sgs, hombres, issa, service] = await Promise.all([
    imageUrlToBase64(urls.sgs),
    imageUrlToBase64(urls.hombres),
    imageUrlToBase64(urls.issa),
    urls.service ? imageUrlToBase64(urls.service) : Promise.resolve(null)
  ]);

  console.log('🖼️ Logos cargados:', {
    sgs: sgs ? `✅ (${sgs.length} chars)` : '❌ null',
    hombres: hombres ? `✅ (${hombres.length} chars)` : '❌ null',
    issa: issa ? `✅ (${issa.length} chars)` : '❌ null',
    service: service ? `✅ (${service.length} chars)` : '❌ null'
  });

  return { sgs, hombresBlanco: hombres, issa, service };
};

/**
 * Crea el header con logos de certificación distribuidos: izquierda, centro, derecha
 * Layout: [SGS ISO] ---- [Hombres de Blanco] ---- [ISSA]
 */
const createCertificationHeader = (logos) => {
  if (!logos) return null;

  const { sgs, hombresBlanco, issa } = logos;
  if (!sgs && !hombresBlanco && !issa) return null;

  return (currentPage, pageCount, pageSize) => {
    // Columns para distribuir logos: izquierda, centro, derecha
    // Usamos width '*' para distribuir espacio equitativamente
    // y alignment en el stack para posicionar cada logo
    return {
      margin: [40, 12, 40, 0],
      columns: [
        {
          width: '*',
          alignment: 'left',
          stack: sgs ? [{ image: sgs, width: 50 }] : [{ text: '' }]
        },
        {
          width: '*',
          alignment: 'center',
          stack: hombresBlanco ? [{ image: hombresBlanco, width: 55 }] : [{ text: '' }]
        },
        {
          width: '*',
          alignment: 'right',
          stack: issa ? [{ image: issa, width: 75 }] : [{ text: '' }]
        }
      ]
    };
  };
};

// ============================================
// ESTILOS COMPARTIDOS - FLUENT TYPOGRAPHY
// ============================================
const defaultStyles = {
  header: {
    fontSize: 21,
    bold: true,
    color: COLORS.text,
    margin: [0, 0, 0, 8]
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    margin: [0, 0, 0, 16]
  },
  sectionTitle: {
    fontSize: 13,
    bold: true,
    color: COLORS.text,
    margin: [0, 14, 0, 8]
  },
  label: {
    fontSize: 11,
    color: COLORS.textSecondary,
    bold: true,
    margin: [0, 0, 0, 4]
  },
  value: {
    fontSize: 14,
    bold: true,
    color: COLORS.text
  },
  bodyText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 1.5
  },
  smallText: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  tableHeader: {
    fontSize: 11,
    bold: true,
    color: COLORS.textSecondary,
    fillColor: COLORS.surfaceSecondary
  },
  noData: {
    fontSize: 12,
    italics: true,
    color: COLORS.textTertiary,
    alignment: 'center'
  }
};

// ============================================
// COMPONENTES DE PDF REUTILIZABLES
// ============================================

/**
 * Header del reporte con titulo, subtitulo y badge de servicio - COMPACTO
 * Diseño Fluent: Título 18px, badge profesional, línea divisoria sutil
 */
const createReportHeader = (titulo, subtitulo, serviceColor, badgeText) => {
  return [
    {
      columns: [
        {
          stack: [
            {
              text: titulo,
              fontSize: 18,
              bold: true,
              color: COLORS.text,
              margin: [0, 0, 0, 2]
            },
            {
              text: subtitulo,
              fontSize: 11,
              color: COLORS.textSecondary
            }
          ],
          width: '*'
        },
        {
          // Badge dentro de tabla para que fillColor funcione en pdfMake
          width: 'auto',
          table: {
            body: [[{
              text: badgeText,
              fontSize: 10,
              bold: true,
              color: 'white',
              fillColor: serviceColor,
              alignment: 'center',
              margin: [8, 4, 8, 4]
            }]]
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: () => 0
          },
          margin: [0, 2, 0, 2]
        }
      ],
      margin: [0, 0, 0, 6]
    },
    // Linea de acento con el color del servicio
    {
      canvas: [{
        type: 'line',
        x1: 0, y1: 0,
        x2: 515, y2: 0,
        lineWidth: 2.5,
        lineColor: serviceColor
      }],
      margin: [0, 0, 0, 8]
    }
  ];
};

/**
 * Grid de stats cards (4 columnas por fila) - COMPACTO
 * Diseño Fluent: Cards con fondo gris claro, labels uppercase, valores en negrita
 */
const createStatsGrid = (stats) => {
  // stats = [{ label, value, icon?, color? }, ...]
  // Usa tabla para que fillColor funcione correctamente en pdfMake
  const rows = [];

  for (let i = 0; i < stats.length; i += 4) {
    const rowStats = stats.slice(i, i + 4);
    const cells = rowStats.map(stat => ({
      stack: [
        {
          text: stat.label.toUpperCase(),
          fontSize: 9,
          color: COLORS.textSecondary,
          bold: true,
          margin: [6, 6, 6, 2]
        },
        {
          text: stat.value,
          fontSize: 11,
          bold: true,
          color: stat.color || COLORS.text,
          margin: [6, 0, 6, 6]
        }
      ],
      fillColor: COLORS.surfaceSecondary
    }));

    // Rellenar celdas faltantes
    while (cells.length < 4) {
      cells.push({ text: '', fillColor: COLORS.surface });
    }

    rows.push(cells);
  }

  if (rows.length === 0) return [];

  return [{
    table: {
      widths: ['25%', '25%', '25%', '25%'],
      body: rows
    },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => COLORS.border,
      vLineColor: () => COLORS.border,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0
    },
    margin: [0, 0, 0, 6]
  }];
};

/**
 * Seccion de mapa
 * Diseño Fluent: Imagen completa con label debajo (NO 2 columnas)
 */
const createMapSection = async (lat, lng, locationName, isRoute = false, paradas = null) => {
  let mapUrl;
  let mapBase64;

  if (isRoute && paradas && paradas.length > 0) {
    mapUrl = getStaticMapWithRoute(paradas);
  } else if (lat && lng) {
    mapUrl = getStaticMapWithMarker(lat, lng);
  }

  if (mapUrl) {
    mapBase64 = await imageUrlToBase64(mapUrl);
  }

  if (!mapBase64) {
    return [
      {
        text: isRoute ? 'MAPA DE RUTA' : 'UBICACIÓN',
        fontSize: 13,
        bold: true,
        color: COLORS.text,
        margin: [0, 14, 0, 8]
      },
      {
        table: {
          widths: ['*'],
          body: [[{
            text: locationName ? `${locationName}\nCoordenadas: ${lat?.toFixed(6) || 'N/A'}, ${lng?.toFixed(6) || 'N/A'}` : 'Ubicación no disponible',
            alignment: 'center',
            color: COLORS.textTertiary,
            fontSize: 11,
            margin: [0, 20, 0, 20]
          }]]
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => COLORS.border,
          vLineColor: () => COLORS.border
        },
        margin: [0, 0, 0, 6]
      }
    ];
  }

  // Ratio 3:1 compacto: width 515 -> height ~172
  return [
    {
      text: isRoute ? 'MAPA DE RUTA' : 'UBICACIÓN',
      fontSize: 13,
      bold: true,
      color: COLORS.text,
      margin: [0, 8, 0, 4]
    },
    {
      image: mapBase64,
      width: 515,
      height: 172,
      margin: [0, 0, 0, 4]
    },
    {
      text: [
        { text: 'Ubicación: ', fontSize: 9, color: COLORS.textSecondary },
        { text: locationName || 'N/A', fontSize: 9, bold: true, color: COLORS.text }
      ],
      margin: [0, 0, 0, 6]
    }
  ];
};

/**
 * Seccion de fotos en 3 columnas HORIZONTALES (Antes/Durante/Después) - COMPACTO
 * Diseño Fluent: Headers con colores específicos (rojo, naranja, verde) + backgrounds light
 */
const createPhotosSection = (fotosAntes, fotosDurante, fotosDespues) => {
  const hasPhotos = fotosAntes.length > 0 || fotosDurante.length > 0 || fotosDespues.length > 0;

  if (!hasPhotos) return [];

  const createPhotoColumn = (title, photos, headerColor, headerBg) => {
    const column = [];

    // Header de columna con color específico (wrapped in table for fillColor support)
    column.push({
      table: {
        widths: ['*'],
        body: [[{
          text: `${title} (${photos.length})`,
          fontSize: 9,
          bold: true,
          color: headerColor,
          fillColor: headerBg,
          alignment: 'center',
          margin: [2, 4, 2, 4]
        }]]
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 6]
    });

    // Fotos (max 1 por columna para caber en 1 página)
    if (photos.length > 0) {
      photos.slice(0, 1).forEach(photo => {
        column.push({
          image: photo.base64,
          width: 140,
          height: 78,
          margin: [0, 0, 0, 2]
        });
      });

      if (photos.length > 1) {
        column.push({
          text: `+${photos.length - 1} más`,
          fontSize: 8,
          color: COLORS.textTertiary,
          italics: true,
          alignment: 'center'
        });
      }
    } else {
      column.push({
        text: 'Sin fotos',
        fontSize: 8,
        color: COLORS.textTertiary,
        italics: true,
        alignment: 'center',
        margin: [0, 15, 0, 15]
      });
    }

    return { stack: column, width: '33%' };
  };

  return [
    {
      text: 'EVIDENCIA FOTOGRÁFICA',
      fontSize: 13,
      bold: true,
      color: COLORS.text,
      margin: [0, 6, 0, 4]
    },
    {
      columns: [
        createPhotoColumn('ANTES', fotosAntes, COLORS.fotoAntes, COLORS.fotoAntesLight),
        createPhotoColumn('DURANTE', fotosDurante, COLORS.fotoDurante, COLORS.fotoDuranteLight),
        createPhotoColumn('DESPUÉS', fotosDespues, COLORS.fotoDespues, COLORS.fotoDespuesLight)
      ],
      columnGap: 6,
      margin: [0, 0, 0, 6]
    }
  ];
};

/**
 * Seccion de observaciones - UNBREAKABLE para evitar cortes de página
 */
const createObservacionesSection = (observaciones) => {
  if (!observaciones) return [];
  return [
    {
      unbreakable: true,
      stack: [
        { text: 'OBSERVACIONES', style: 'sectionTitle' },
        {
          table: {
            widths: ['*'],
            body: [[{
              text: observaciones,
              fontSize: 10,
              color: COLORS.text,
              margin: [8, 8, 8, 8]
            }]]
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => COLORS.border,
            vLineColor: () => COLORS.border
          }
        }
      ],
      margin: [0, 0, 0, 12]
    }
  ];
};

/**
 * Crea tabla índice de todos los reportes
 * Columnas: Categoría | Lugar | Fecha
 */
const createIndexTable = (allReports) => {
  const tableBody = [
    // Header row
    [
      { text: 'CATEGORÍA', style: 'tableHeader', alignment: 'center' },
      { text: 'LUGAR', style: 'tableHeader' },
      { text: 'FECHA', style: 'tableHeader', alignment: 'center' }
    ],
    // Data rows
    ...allReports.map(r => [
      { text: r.categoria, fontSize: 10, color: r.color || COLORS.text, bold: true, alignment: 'center' },
      { text: r.lugar, fontSize: 10, color: COLORS.text },
      { text: r.fecha, fontSize: 10, color: COLORS.textSecondary, alignment: 'center' }
    ])
  ];

  return {
    table: {
      headerRows: 1,
      widths: ['20%', '50%', '30%'],
      body: tableBody
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => COLORS.border,
      vLineColor: () => COLORS.border,
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 6,
      paddingBottom: () => 6
    },
    margin: [0, 0, 0, 20]
  };
};

/**
 * Construye datos para la tabla índice extrayendo info de cada tipo de reporte
 */
const buildIndexData = (data, selectedServices, dateRange) => {
  const indexItems = [];
  const desde = parseLocalDate(dateRange.desde);
  const hasta = parseLocalDate(dateRange.hasta);
  hasta.setHours(23, 59, 59, 999);

  // Recolección
  if (selectedServices.recoleccion && data.recoleccion) {
    data.recoleccion.forEach(r => {
      const fecha = parseLocalDate(r.fecha_completacion);
      if (fecha >= desde && fecha <= hasta) {
        indexItems.push({
          categoria: 'Recolección',
          lugar: r.ruta_nombre || 'Sin nombre',
          fecha: formatDateShort(r.fecha_completacion),
          fechaRaw: fecha,
          color: COLORS.recoleccion
        });
      }
    });
  }

  // Limpieza
  if (selectedServices.limpieza && data.limpieza) {
    data.limpieza.forEach(r => {
      const fecha = parseLocalDate(r.fecha_completacion || r.fecha);
      if (fecha >= desde && fecha <= hasta) {
        const lugar = [r.sala_nombre, r.area_nombre].filter(Boolean).join(' - ') || 'Sin nombre';
        indexItems.push({
          categoria: 'Limpieza',
          lugar,
          fecha: formatDateShort(r.fecha_completacion || r.fecha),
          fechaRaw: fecha,
          color: COLORS.limpieza
        });
      }
    });
  }

  // Fumigación
  if (selectedServices.fumigacion && data.fumigacion) {
    data.fumigacion.forEach(r => {
      const fecha = parseLocalDate(r.fecha_completacion || r.fecha);
      if (fecha >= desde && fecha <= hasta) {
        indexItems.push({
          categoria: 'Fumigación',
          lugar: r.lugar_nombre || 'Sin nombre',
          fecha: formatDateShort(r.fecha_completacion || r.fecha),
          fechaRaw: fecha,
          color: COLORS.fumigacion
        });
      }
    });
  }

  // Mantenimiento
  if (selectedServices.mantenimiento && data.mantenimiento) {
    data.mantenimiento.forEach(r => {
      const fecha = parseLocalDate(r.fecha_reporte || r.fecha_completada || r.fecha_programada);
      if (fecha >= desde && fecha <= hasta) {
        indexItems.push({
          categoria: 'Mantenimiento',
          lugar: r.titulo || r.vehiculo_placa || 'Sin título',
          fecha: formatDateShort(r.fecha_reporte || r.fecha_completada || r.fecha_programada),
          fechaRaw: fecha,
          color: COLORS.mantenimiento
        });
      }
    });
  }

  // Ordenar por fecha (más reciente primero)
  indexItems.sort((a, b) => b.fechaRaw - a.fechaRaw);

  return indexItems;
};

// ============================================
// GENERADORES DE PDF POR SERVICIO
// ============================================

/**
 * Genera PDF de reportes de Recoleccion
 */
export const generateRecoleccionPDFComplete = async (reports, dateRange, onProgress = null, proyecto = null) => {
  const { desde, hasta } = dateRange;
  const proyectoLine = formatProjectLine(proyecto);
  const fileSuffix = projectFilenameSuffix(proyecto);

  // Cargar logos de certificación + logo de recolección
  const certLogos = await loadCertificationLogos('recoleccion');

  const filtered = filterByDateRangeProper(reports, 'fecha_completacion', desde, hasta);

  if (filtered.length === 0) {
    const docDefinition = {
      header: createCertificationHeader(certLogos),
      content: [
        { text: 'REPORTES DE RECOLECCION', style: 'header', alignment: 'center' },
        ...(proyectoLine ? [{ text: proyectoLine, alignment: 'center', margin: [0, 0, 0, 4] }] : []),
        { text: `Periodo: ${formatDate(desde)} - ${formatDate(hasta)}`, alignment: 'center', margin: [0, 0, 0, 20] },
        { text: 'No hay reportes en el periodo seleccionado', style: 'noData', margin: [0, 50, 0, 0] }
      ],
      styles: defaultStyles
    };
    pdfMake.createPdf(docDefinition).download(`Recoleccion${fileSuffix}_${desde}_${hasta}.pdf`);
    return { success: true, count: 0 };
  }

  const content = [];

  for (let i = 0; i < filtered.length; i++) {
    const report = filtered[i];
    if (onProgress) onProgress((i + 1) / filtered.length * 100);

    // Header
    content.push(...createReportHeader(
      report.ruta_nombre || 'Ruta de Recoleccion',
      `Reporte #${i + 1} de ${filtered.length}`,
      COLORS.recoleccion,
      'RECOLECCION'
    ));

    // Stats
    content.push(...createStatsGrid([
      { label: 'Conductor', value: report.conductor_nombre || '-' },
      { label: 'Vehiculo', value: report.vehiculo_placa || '-' },
      { label: 'Tiempo Total', value: formatSeconds(report.tiempo_total_segundos) },
      { label: 'Fecha', value: formatDateShort(report.fecha_completacion) },
      { label: 'Paradas Completadas', value: `${report.paradas_completadas?.length || 0}`, color: COLORS.success },
      { label: 'Tipo', value: report.tipo_ruta || 'Recoleccion' }
    ]));

    // Mapa de ruta - extraer coordenadas de paradas
    const extraerCoordenadas = (p) => {
      let lat = null, lng = null;
      if (p.lat && p.lng) {
        lat = p.lat; lng = p.lng;
      } else if (p.latitud && p.longitud) {
        lat = p.latitud; lng = p.longitud;
      } else if (p.gps_completada?.lat && p.gps_completada?.lng) {
        lat = p.gps_completada.lat; lng = p.gps_completada.lng;
      } else if (p.coordenadas && Array.isArray(p.coordenadas) && p.coordenadas.length >= 2) {
        lat = p.coordenadas[0]; lng = p.coordenadas[1];
      } else if (p.coordinates && Array.isArray(p.coordinates) && p.coordinates.length >= 2) {
        lat = p.coordinates[0]; lng = p.coordinates[1];
      }
      return { lat, lng, nombre: p.direccion || p.nombre || p.parada_nombre || `Parada` };
    };

    const paradasParaMapa = (report.ruta_paradas || report.paradas_completadas || [])
      .map(extraerCoordenadas)
      .filter(p => p.lat && p.lng);

    const centerLat = paradasParaMapa.length > 0 ? paradasParaMapa[0].lat : null;
    const centerLng = paradasParaMapa.length > 0 ? paradasParaMapa[0].lng : null;

    // ⭐ LAYOUT HORIZONTAL: Mapa full-width arriba, paradas abajo
    let paradas = report.paradas_completadas || [];
    if (paradas.length === 0 && report.ruta_paradas && report.ruta_paradas.length > 0) {
      paradas = report.ruta_paradas;
    } else if (paradas.length === 0 && report.paradas && report.paradas.length > 0) {
      paradas = report.paradas;
    }

    // Generar mapa
    let mapUrl;
    let mapBase64;
    if (paradasParaMapa.length > 0) {
      mapUrl = getStaticMapWithRoute(paradasParaMapa);
      if (mapUrl) {
        mapBase64 = await imageUrlToBase64(mapUrl);
      }
    }

    // SECCIÓN MAPA (full-width, formato compacto para 1 página)
    content.push({
      text: 'MAPA DE RUTA',
      fontSize: 13,
      bold: true,
      color: COLORS.text,
      margin: [0, 8, 0, 4]
    });

    if (mapBase64) {
      content.push({
        image: mapBase64,
        width: 515,
        height: 172,
        margin: [0, 0, 0, 4]
      });
    } else {
      content.push({
        table: {
          widths: ['*'],
          body: [[{
            text: 'Mapa no disponible',
            fontSize: 11,
            color: COLORS.textTertiary,
            alignment: 'center',
            margin: [0, 20, 0, 20]
          }]]
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => COLORS.border,
          vLineColor: () => COLORS.border
        },
        margin: [0, 0, 0, 6]
      });
    }

    // TABLA DE PARADAS (misma página, max 8 filas)
    if (paradas && paradas.length > 0) {
      const paradasToShow = paradas.slice(0, 8);
      content.push({
        text: `PARADAS (${paradas.length})`,
        fontSize: 13,
        bold: true,
        color: COLORS.text,
        margin: [0, 6, 0, 4]
      });

      const paradasBody = [
        [
          { text: '#', fontSize: 10, bold: true, fillColor: COLORS.surfaceSecondary, alignment: 'center' },
          { text: 'DIRECCIÓN', fontSize: 10, bold: true, fillColor: COLORS.surfaceSecondary },
          { text: 'ESTADO', fontSize: 10, bold: true, fillColor: COLORS.surfaceSecondary, alignment: 'center' }
        ]
      ];

      paradasToShow.forEach((parada, idx) => {
        const direccion = parada.direccion ||
                         parada.parada_nombre ||
                         parada.nombre ||
                         parada.address ||
                         `Parada ${idx + 1}`;

        const completada = parada.completada !== false;
        const estadoTexto = parada.completada === false ? 'No completada' : 'Completada';

        paradasBody.push([
          { text: `${parada.orden || idx + 1}`, fontSize: 9, alignment: 'center', bold: true },
          { text: direccion, fontSize: 9 },
          {
            text: estadoTexto,
            fontSize: 9,
            color: completada ? COLORS.success : COLORS.warning,
            bold: true,
            alignment: 'center'
          }
        ]);
      });

      if (paradas.length > 8) {
        paradasBody.push([
          { text: '', fontSize: 8 },
          { text: `... y ${paradas.length - 8} paradas más`, fontSize: 8, color: COLORS.textTertiary, italics: true },
          { text: '', fontSize: 8 }
        ]);
      }

      content.push({
        table: {
          headerRows: 1,
          widths: [30, '*', 85],
          body: paradasBody
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => COLORS.border,
          vLineColor: () => COLORS.border,
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 2,
          paddingBottom: () => 2
        },
        margin: [0, 0, 0, 6]
      });
    }

    // Observaciones
    content.push(...createObservacionesSection(report.observaciones));

    // Page break
    if (i < filtered.length - 1) {
      content.push({ text: '', pageBreak: 'after' });
    }
  }

  const docDefinition = {
    header: createCertificationHeader(certLogos),
    content,
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: `RMP - Reportes de Recoleccion${proyectoLine ? ` · ${proyecto.nombre}` : ''}`, fontSize: 8, color: COLORS.textSecondary },
        { text: `${formatDate(desde)} - ${formatDate(hasta)}`, fontSize: 8, color: COLORS.textSecondary, alignment: 'center' },
        { text: `Pagina ${currentPage} de ${pageCount}`, fontSize: 8, color: COLORS.textSecondary, alignment: 'right' }
      ],
      margin: [40, 10, 40, 0]
    }),
    styles: defaultStyles,
    pageMargins: [40, 70, 40, 50] // Reducido para más espacio de contenido
  };

  pdfMake.createPdf(docDefinition).download(`Recoleccion${fileSuffix}_${desde}_${hasta}.pdf`);
  return { success: true, count: filtered.length };
};

/**
 * Genera PDF de reportes de Limpieza
 */
export const generateLimpiezaPDFComplete = async (reports, dateRange, onProgress = null, proyecto = null) => {
  const { desde, hasta } = dateRange;
  const proyectoLine = formatProjectLine(proyecto);
  const fileSuffix = projectFilenameSuffix(proyecto);

  // Cargar logos de certificación + logo de limpieza
  const certLogos = await loadCertificationLogos('limpieza');

  const filtered = filterByDateRangeProper(reports, r => r.fecha_completacion || r.fecha, desde, hasta);

  if (filtered.length === 0) {
    const docDefinition = {
      header: createCertificationHeader(certLogos),
      content: [
        { text: 'REPORTES DE LIMPIEZA', style: 'header', alignment: 'center', color: COLORS.limpieza },
        { text: `Periodo: ${formatDate(desde)} - ${formatDate(hasta)}`, alignment: 'center', margin: [0, 0, 0, 20] },
        { text: 'No hay reportes en el periodo seleccionado', style: 'noData', margin: [0, 50, 0, 0] }
      ],
      styles: defaultStyles
    };
    pdfMake.createPdf(docDefinition).download(`Limpieza${fileSuffix}_${desde}_${hasta}.pdf`);
    return { success: true, count: 0 };
  }

  const content = [];

  for (let i = 0; i < filtered.length; i++) {
    const report = filtered[i];
    if (onProgress) onProgress((i + 1) / filtered.length * 100);

    // Cargar fotos
    const fotosAntes = await loadPhotosAsBase64(report.fotos_antes || []);
    const fotosDurante = await loadPhotosAsBase64(report.fotos_durante || []);
    const fotosDespues = await loadPhotosAsBase64(report.fotos_despues || []);

    // Header
    content.push(...createReportHeader(
      report.sala_nombre || 'Limpieza',
      `${report.area_nombre || ''} - Reporte #${i + 1} de ${filtered.length}`,
      COLORS.limpieza,
      'LIMPIEZA'
    ));

    // Stats
    content.push(...createStatsGrid([
      { label: 'Fecha', value: formatDateShort(report.fecha) },
      { label: 'Horario', value: `${formatTime(report.hora_inicio)} - ${formatTime(report.hora_fin)}` },
      { label: 'Duracion', value: formatDuration(report.duracion_minutos), color: COLORS.success },
      { label: 'Realizado por', value: report.usuario_completo || '-' }
    ]));

    // Mapa
    const mapSection = await createMapSection(report.latitud, report.longitud, report.sala_nombre);
    content.push(...mapSection);

    // Fotos
    content.push(...createPhotosSection(fotosAntes, fotosDurante, fotosDespues));

    // Observaciones
    content.push(...createObservacionesSection(report.observaciones));

    // Page break
    if (i < filtered.length - 1) {
      content.push({ text: '', pageBreak: 'after' });
    }
  }

  const docDefinition = {
    header: createCertificationHeader(certLogos),
    content,
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: 'RMP - Reportes de Limpieza', fontSize: 8, color: COLORS.textSecondary },
        { text: `${formatDate(desde)} - ${formatDate(hasta)}`, fontSize: 8, color: COLORS.textSecondary, alignment: 'center' },
        { text: `Pagina ${currentPage} de ${pageCount}`, fontSize: 8, color: COLORS.textSecondary, alignment: 'right' }
      ],
      margin: [40, 10, 40, 0]
    }),
    styles: defaultStyles,
    pageMargins: [40, 70, 40, 50] // Reducido para más espacio de contenido
  };

  pdfMake.createPdf(docDefinition).download(`Limpieza${fileSuffix}_${desde}_${hasta}.pdf`);
  return { success: true, count: filtered.length };
};

/**
 * Genera PDF de reportes de Fumigacion
 */
export const generateFumigacionPDFComplete = async (reports, dateRange, onProgress = null, proyecto = null) => {
  const { desde, hasta } = dateRange;
  const proyectoLine = formatProjectLine(proyecto);
  const fileSuffix = projectFilenameSuffix(proyecto);

  // Cargar logos de certificación + logo de fumigación
  const certLogos = await loadCertificationLogos('fumigacion');

  const filtered = filterByDateRangeProper(reports, r => r.fecha_completacion || r.fecha, desde, hasta);

  if (filtered.length === 0) {
    const docDefinition = {
      header: createCertificationHeader(certLogos),
      content: [
        { text: 'REPORTES DE FUMIGACION', style: 'header', alignment: 'center', color: COLORS.fumigacion },
        { text: `Periodo: ${formatDate(desde)} - ${formatDate(hasta)}`, alignment: 'center', margin: [0, 0, 0, 20] },
        { text: 'No hay reportes en el periodo seleccionado', style: 'noData', margin: [0, 50, 0, 0] }
      ],
      styles: defaultStyles
    };
    pdfMake.createPdf(docDefinition).download(`Fumigacion${fileSuffix}_${desde}_${hasta}.pdf`);
    return { success: true, count: 0 };
  }

  const content = [];

  for (let i = 0; i < filtered.length; i++) {
    const report = filtered[i];
    if (onProgress) onProgress((i + 1) / filtered.length * 100);

    // Cargar fotos
    const fotosAntes = await loadPhotosAsBase64(report.fotos_antes || []);
    const fotosDurante = await loadPhotosAsBase64(report.fotos_durante || []);
    const fotosDespues = await loadPhotosAsBase64(report.fotos_despues || []);

    const tipoLabel = report.tipo_fumigacion === 'interna' ? 'INTERNA' : 'EXTERNA';

    // Header
    content.push(...createReportHeader(
      report.lugar_nombre || 'Fumigacion',
      `Fumigacion ${tipoLabel} - Reporte #${i + 1} de ${filtered.length}`,
      COLORS.fumigacion,
      tipoLabel
    ));

    // Stats
    content.push(...createStatsGrid([
      { label: 'Fecha', value: formatDateShort(report.fecha) },
      { label: 'Horario', value: `${report.horario_inicio || '-'} - ${report.horario_fin || '-'}` },
      { label: 'Duracion', value: formatDuration(report.duracion_minutos), color: COLORS.success },
      { label: 'Realizado por', value: report.usuario_completo || '-' }
    ]));

    // Mapa
    const mapSection = await createMapSection(report.latitud, report.longitud, report.lugar_nombre);
    content.push(...mapSection);

    // Productos utilizados
    if (report.productos_utilizados && report.productos_utilizados.length > 0) {
      content.push({
        text: 'PRODUCTOS UTILIZADOS',
        fontSize: 13,
        bold: true,
        color: COLORS.text,
        margin: [0, 6, 0, 4]
      });
      content.push({
        ul: report.productos_utilizados,
        fontSize: 10,
        color: COLORS.text,
        margin: [20, 0, 0, 6]
      });
    }

    // Fotos
    content.push(...createPhotosSection(fotosAntes, fotosDurante, fotosDespues));

    // Observaciones
    content.push(...createObservacionesSection(report.observaciones));

    // Page break
    if (i < filtered.length - 1) {
      content.push({ text: '', pageBreak: 'after' });
    }
  }

  const docDefinition = {
    header: createCertificationHeader(certLogos),
    content,
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: 'RMP - Reportes de Fumigacion', fontSize: 8, color: COLORS.textSecondary },
        { text: `${formatDate(desde)} - ${formatDate(hasta)}`, fontSize: 8, color: COLORS.textSecondary, alignment: 'center' },
        { text: `Pagina ${currentPage} de ${pageCount}`, fontSize: 8, color: COLORS.textSecondary, alignment: 'right' }
      ],
      margin: [40, 10, 40, 0]
    }),
    styles: defaultStyles,
    pageMargins: [40, 70, 40, 50] // Reducido para más espacio de contenido
  };

  pdfMake.createPdf(docDefinition).download(`Fumigacion${fileSuffix}_${desde}_${hasta}.pdf`);
  return { success: true, count: filtered.length };
};

/**
 * Genera PDF de reportes de Mantenimiento
 */
export const generateMantenimientoPDFComplete = async (reports, dateRange, onProgress = null, proyecto = null) => {
  const proyectoLine = formatProjectLine(proyecto);
  const fileSuffix = projectFilenameSuffix(proyecto);
  const { desde, hasta } = dateRange;

  // Cargar logos de certificación + logo de mantenimiento
  const certLogos = await loadCertificationLogos('mantenimiento');

  const filtered = filterByDateRangeProper(reports, r => r.fecha_reporte || r.fecha_completada, desde, hasta);

  if (filtered.length === 0) {
    const docDefinition = {
      header: createCertificationHeader(certLogos),
      content: [
        { text: 'REPORTES DE MANTENIMIENTO', style: 'header', alignment: 'center', color: COLORS.mantenimiento },
        { text: `Periodo: ${formatDate(desde)} - ${formatDate(hasta)}`, alignment: 'center', margin: [0, 0, 0, 20] },
        { text: 'No hay reportes en el periodo seleccionado', style: 'noData', margin: [0, 50, 0, 0] }
      ],
      styles: defaultStyles
    };
    pdfMake.createPdf(docDefinition).download(`Mantenimiento${fileSuffix}_${desde}_${hasta}.pdf`);
    return { success: true, count: 0 };
  }

  const content = [];

  for (let i = 0; i < filtered.length; i++) {
    const report = filtered[i];
    if (onProgress) onProgress((i + 1) / filtered.length * 100);

    // Cargar fotos
    const fotosAntes = await loadPhotosAsBase64(report.fotos_antes || []);
    const fotosDurante = await loadPhotosAsBase64(report.fotos_durante || []);
    const fotosDespues = await loadPhotosAsBase64(report.fotos_despues || []);

    const tipoLabel = report.tipo === 'preventivo' ? 'PREVENTIVO' :
                      report.tipo === 'correctivo' ? 'CORRECTIVO' : 'INSPECCION';

    // Header
    content.push(...createReportHeader(
      report.titulo || 'Mantenimiento',
      `${tipoLabel} - Reporte #${i + 1} de ${filtered.length}`,
      COLORS.mantenimiento,
      tipoLabel
    ));

    // Stats
    content.push(...createStatsGrid([
      { label: 'Vehiculo', value: report.vehiculo_placa || '-' },
      { label: 'Fecha Programada', value: formatDateShort(report.fecha_programada) },
      { label: 'Fecha Completada', value: formatDateShort(report.fecha_completada), color: COLORS.success },
      { label: 'Mecanico', value: report.mecanico || '-' },
      { label: 'Costo', value: report.costo ? `B/. ${report.costo.toFixed(2)}` : '-', color: COLORS.success },
      { label: 'Prioridad', value: report.prioridad || '-' },
      { label: 'Realizado por', value: report.usuario_completo || '-' }
    ]));

    // Mapa de ubicación (si existe)
    if (report.latitud && report.longitud) {
      const mapSection = await createMapSection(
        report.latitud,
        report.longitud,
        `Vehículo ${report.vehiculo_placa || 'N/A'}`
      );
      content.push(...mapSection);
    }

    // Descripcion
    if (report.descripcion) {
      content.push({
        text: 'DESCRIPCIÓN DEL TRABAJO',
        fontSize: 13,
        bold: true,
        color: COLORS.text,
        margin: [0, 6, 0, 4]
      });
      content.push({
        text: report.descripcion,
        fontSize: 10,
        color: COLORS.text,
        margin: [0, 0, 0, 6]
      });
    }

    // Fotos
    content.push(...createPhotosSection(fotosAntes, fotosDurante, fotosDespues));

    // Observaciones
    content.push(...createObservacionesSection(report.observaciones));

    // Page break
    if (i < filtered.length - 1) {
      content.push({ text: '', pageBreak: 'after' });
    }
  }

  const docDefinition = {
    header: createCertificationHeader(certLogos),
    content,
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: 'RMP - Reportes de Mantenimiento', fontSize: 8, color: COLORS.textSecondary },
        { text: `${formatDate(desde)} - ${formatDate(hasta)}`, fontSize: 8, color: COLORS.textSecondary, alignment: 'center' },
        { text: `Pagina ${currentPage} de ${pageCount}`, fontSize: 8, color: COLORS.textSecondary, alignment: 'right' }
      ],
      margin: [40, 10, 40, 0]
    }),
    styles: defaultStyles,
    pageMargins: [40, 70, 40, 50] // Reducido para más espacio de contenido
  };

  pdfMake.createPdf(docDefinition).download(`Mantenimiento${fileSuffix}_${desde}_${hasta}.pdf`);
  return { success: true, count: filtered.length };
};

/**
 * Genera PDF COMPLETO combinado con todos los servicios
 * @param {Object} data - Datos de reportes por servicio
 * @param {Object} dateRange - Rango de fechas {desde, hasta}
 * @param {Object} selectedServices - Servicios seleccionados
 * @param {Function} onProgress - Callback de progreso
 * @param {Object} options - Opciones adicionales {includeIndex: boolean}
 */
export const generateCombinedPDFComplete = async (data, dateRange, selectedServices, onProgress = null, options = {}) => {
  const { desde, hasta } = dateRange;
  const { includeIndex = false } = options;

  // Cargar logos de certificación
  const certLogos = await loadCertificationLogos();

  const content = [];
  let totalReports = 0;
  let processedReports = 0;

  // Contar total de reportes usando comparación de fechas proper
  let totalToProcess = 0;
  if (selectedServices.recoleccion && data.recoleccion) {
    totalToProcess += filterByDateRangeProper(data.recoleccion, 'fecha_completacion', desde, hasta).length;
  }
  if (selectedServices.fumigacion && data.fumigacion) {
    totalToProcess += filterByDateRangeProper(data.fumigacion, r => r.fecha_completacion || r.fecha, desde, hasta).length;
  }
  if (selectedServices.limpieza && data.limpieza) {
    totalToProcess += filterByDateRangeProper(data.limpieza, r => r.fecha_completacion || r.fecha, desde, hasta).length;
  }
  if (selectedServices.mantenimiento && data.mantenimiento) {
    totalToProcess += filterByDateRangeProper(data.mantenimiento, r => r.fecha_reporte || r.fecha_completada, desde, hasta).length;
  }

  if (totalToProcess === 0) {
    const docDefinition = {
      header: createCertificationHeader(certLogos),
      content: [
        { text: 'REPORTE UNIFICADO', style: 'header', alignment: 'center' },
        { text: `Periodo: ${formatDate(desde)} - ${formatDate(hasta)}`, alignment: 'center', margin: [0, 0, 0, 20] },
        { text: 'No hay reportes en el periodo seleccionado', style: 'noData', margin: [0, 50, 0, 0] }
      ],
      styles: defaultStyles
    };
    pdfMake.createPdf(docDefinition).download(`Reporte_Unificado_${desde}_${hasta}.pdf`);
    return { success: true, totalReports: 0 };
  }

  // Portada
  content.push({ text: 'REPORTE UNIFICADO', style: 'header', alignment: 'center', fontSize: 28, margin: [0, 100, 0, 10] });
  content.push({ text: 'RMP - Sistema de Gestion', fontSize: 14, alignment: 'center', color: COLORS.textSecondary, margin: [0, 0, 0, 30] });
  content.push({ text: `Periodo: ${formatDate(desde)} - ${formatDate(hasta)}`, fontSize: 12, alignment: 'center', margin: [0, 0, 0, 50] });

  const serviciosIncluidos = [];
  if (selectedServices.recoleccion) serviciosIncluidos.push({ text: 'Recoleccion', color: COLORS.recoleccion });
  if (selectedServices.fumigacion) serviciosIncluidos.push({ text: 'Fumigacion', color: COLORS.fumigacion });
  if (selectedServices.limpieza) serviciosIncluidos.push({ text: 'Limpieza', color: COLORS.limpieza });
  if (selectedServices.mantenimiento) serviciosIncluidos.push({ text: 'Mantenimiento', color: COLORS.mantenimiento });

  content.push({ text: 'Servicios incluidos:', fontSize: 11, bold: true, alignment: 'center', margin: [0, 0, 0, 10] });
  content.push({
    columns: serviciosIncluidos.map(s => ({
      text: s.text,
      fontSize: 10,
      color: s.color,
      bold: true,
      alignment: 'center'
    })),
    margin: [50, 0, 50, 0]
  });
  content.push({ text: `Total: ${totalToProcess} reportes`, fontSize: 11, alignment: 'center', margin: [0, 30, 0, 0] });
  content.push({ text: '', pageBreak: 'after' });

  // === ÍNDICE DE REPORTES (opcional) ===
  if (includeIndex) {
    const indexData = buildIndexData(data, selectedServices, dateRange);

    if (indexData.length > 0) {
      // Título de sección
      content.push({
        text: 'ÍNDICE DE REPORTES',
        fontSize: 21,
        bold: true,
        color: COLORS.text,
        alignment: 'center',
        margin: [0, 0, 0, 10]
      });

      // Subtítulo con rango de fechas
      content.push({
        text: `Período: ${formatDateShort(dateRange.desde)} - ${formatDateShort(dateRange.hasta)}`,
        fontSize: 12,
        color: COLORS.textSecondary,
        alignment: 'center',
        margin: [0, 0, 0, 20]
      });

      // Tabla índice
      content.push(createIndexTable(indexData));

      // Salto de página antes de los reportes detallados
      content.push({ text: '', pageBreak: 'after' });
    }
  }

  // === RECOLECCION ===
  if (selectedServices.recoleccion && data.recoleccion) {
    const filtered = filterByDateRangeProper(data.recoleccion, 'fecha_completacion', desde, hasta);

    for (let i = 0; i < filtered.length; i++) {
      const report = filtered[i];
      processedReports++;
      if (onProgress) onProgress((processedReports / totalToProcess) * 100);

      content.push(...createReportHeader(
        report.ruta_nombre || 'Ruta',
        `Recoleccion #${i + 1} de ${filtered.length}`,
        COLORS.recoleccion,
        'RECOLECCION'
      ));

      content.push(...createStatsGrid([
        { label: 'Conductor', value: report.conductor_nombre || '-' },
        { label: 'Vehiculo', value: report.vehiculo_placa || '-' },
        { label: 'Tiempo', value: formatSeconds(report.tiempo_total_segundos) },
        { label: 'Fecha', value: formatDateShort(report.fecha_completacion) },
        { label: 'Paradas', value: `${report.paradas_completadas?.length || 0}`, color: COLORS.success }
      ]));

      // ⭐ LAYOUT HORIZONTAL: Mapa full-width arriba, paradas abajo
      const extraerCoordenadas = (p) => {
        let lat = null, lng = null;
        if (p.lat && p.lng) { lat = p.lat; lng = p.lng; }
        else if (p.latitud && p.longitud) { lat = p.latitud; lng = p.longitud; }
        else if (p.gps_completada?.lat && p.gps_completada?.lng) { lat = p.gps_completada.lat; lng = p.gps_completada.lng; }
        else if (p.coordenadas && Array.isArray(p.coordenadas)) { lat = p.coordenadas[0]; lng = p.coordenadas[1]; }
        else if (p.coordinates && Array.isArray(p.coordinates)) { lat = p.coordinates[0]; lng = p.coordinates[1]; }
        return { lat, lng, nombre: p.direccion || p.nombre || 'Parada' };
      };
      const paradasParaMapa = (report.ruta_paradas || report.paradas_completadas || [])
        .map(extraerCoordenadas)
        .filter(p => p.lat && p.lng);

      let paradas = report.paradas_completadas || [];
      if (paradas.length === 0 && report.ruta_paradas && report.ruta_paradas.length > 0) {
        paradas = report.ruta_paradas;
      } else if (paradas.length === 0 && report.paradas && report.paradas.length > 0) {
        paradas = report.paradas;
      }

      // Generar mapa
      let mapUrl;
      let mapBase64;
      if (paradasParaMapa.length > 0) {
        mapUrl = getStaticMapWithRoute(paradasParaMapa);
        if (mapUrl) {
          mapBase64 = await imageUrlToBase64(mapUrl);
        }
      }

      // SECCIÓN MAPA (full-width, compacto para 1 página)
      content.push({
        text: 'MAPA DE RUTA',
        fontSize: 13,
        bold: true,
        color: COLORS.text,
        margin: [0, 8, 0, 4]
      });

      if (mapBase64) {
        content.push({
          image: mapBase64,
          width: 515,
          height: 172,
          margin: [0, 0, 0, 4]
        });
      } else {
        content.push({
          table: {
            widths: ['*'],
            body: [[{
              text: 'Mapa no disponible',
              fontSize: 11,
              color: COLORS.textTertiary,
              alignment: 'center',
              margin: [0, 20, 0, 20]
            }]]
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => COLORS.border,
            vLineColor: () => COLORS.border
          },
          margin: [0, 0, 0, 6]
        });
      }

      // TABLA DE PARADAS (misma página, max 8 filas)
      if (paradas && paradas.length > 0) {
        const paradasToShow = paradas.slice(0, 8);
        content.push({
          text: `PARADAS (${paradas.length})`,
          fontSize: 13,
          bold: true,
          color: COLORS.text,
          margin: [0, 6, 0, 4]
        });

        const paradasBody = [
          [
            { text: '#', fontSize: 10, bold: true, fillColor: COLORS.surfaceSecondary, alignment: 'center' },
            { text: 'DIRECCIÓN', fontSize: 10, bold: true, fillColor: COLORS.surfaceSecondary },
            { text: 'ESTADO', fontSize: 10, bold: true, fillColor: COLORS.surfaceSecondary, alignment: 'center' }
          ]
        ];

        paradasToShow.forEach((parada, idx) => {
          const direccion = parada.direccion ||
                           parada.parada_nombre ||
                           parada.nombre ||
                           parada.address ||
                           `Parada ${idx + 1}`;

          const completada = parada.completada !== false;
          const estadoTexto = parada.completada === false ? 'No completada' : 'Completada';

          paradasBody.push([
            { text: `${parada.orden || idx + 1}`, fontSize: 9, alignment: 'center', bold: true },
            { text: direccion, fontSize: 9 },
            {
              text: estadoTexto,
              fontSize: 9,
              color: completada ? COLORS.success : COLORS.warning,
              bold: true,
              alignment: 'center'
            }
          ]);
        });

        if (paradas.length > 8) {
          paradasBody.push([
            { text: '', fontSize: 8 },
            { text: `... y ${paradas.length - 8} paradas más`, fontSize: 8, color: COLORS.textTertiary, italics: true },
            { text: '', fontSize: 8 }
          ]);
        }

        content.push({
          table: {
            headerRows: 1,
            widths: [30, '*', 85],
            body: paradasBody
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => COLORS.border,
            vLineColor: () => COLORS.border,
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 2,
            paddingBottom: () => 2
          },
          margin: [0, 0, 0, 6]
        });
      }

      content.push(...createObservacionesSection(report.observaciones));
      content.push({ text: '', pageBreak: 'after' });
      totalReports++;
    }
  }

  // === FUMIGACION ===
  if (selectedServices.fumigacion && data.fumigacion) {
    const filtered = filterByDateRangeProper(data.fumigacion, r => r.fecha_completacion || r.fecha, desde, hasta);

    for (let i = 0; i < filtered.length; i++) {
      const report = filtered[i];
      processedReports++;
      if (onProgress) onProgress((processedReports / totalToProcess) * 100);

      const fotosAntes = await loadPhotosAsBase64(report.fotos_antes || []);
      const fotosDurante = await loadPhotosAsBase64(report.fotos_durante || []);
      const fotosDespues = await loadPhotosAsBase64(report.fotos_despues || []);

      const tipoLabel = report.tipo_fumigacion === 'interna' ? 'INTERNA' : 'EXTERNA';

      content.push(...createReportHeader(
        report.lugar_nombre || 'Fumigacion',
        `Fumigacion ${tipoLabel} #${i + 1} de ${filtered.length}`,
        COLORS.fumigacion,
        tipoLabel
      ));

      content.push(...createStatsGrid([
        { label: 'Fecha', value: formatDateShort(report.fecha) },
        { label: 'Horario', value: `${report.horario_inicio || '-'} - ${report.horario_fin || '-'}` },
        { label: 'Duracion', value: formatDuration(report.duracion_minutos), color: COLORS.success },
        { label: 'Realizado por', value: report.usuario_completo || '-' }
      ]));

      const mapSection = await createMapSection(report.latitud, report.longitud, report.lugar_nombre);
      content.push(...mapSection);

      if (report.productos_utilizados?.length > 0) {
        content.push({
          text: 'PRODUCTOS UTILIZADOS',
          fontSize: 13,
          bold: true,
          color: COLORS.text,
          margin: [0, 6, 0, 4]
        });
        content.push({
          ul: report.productos_utilizados,
          fontSize: 10,
          color: COLORS.text,
          margin: [20, 0, 0, 6]
        });
      }

      content.push(...createPhotosSection(fotosAntes, fotosDurante, fotosDespues));
      content.push(...createObservacionesSection(report.observaciones));

      if (i < filtered.length - 1 || selectedServices.limpieza || selectedServices.mantenimiento) {
        content.push({ text: '', pageBreak: 'after' });
      }
      totalReports++;
    }
  }

  // === LIMPIEZA ===
  if (selectedServices.limpieza && data.limpieza) {
    const filtered = filterByDateRangeProper(data.limpieza, r => r.fecha_completacion || r.fecha, desde, hasta);

    for (let i = 0; i < filtered.length; i++) {
      const report = filtered[i];
      processedReports++;
      if (onProgress) onProgress((processedReports / totalToProcess) * 100);

      const fotosAntes = await loadPhotosAsBase64(report.fotos_antes || []);
      const fotosDurante = await loadPhotosAsBase64(report.fotos_durante || []);
      const fotosDespues = await loadPhotosAsBase64(report.fotos_despues || []);

      content.push(...createReportHeader(
        report.sala_nombre || 'Limpieza',
        `${report.area_nombre || ''} - Limpieza #${i + 1} de ${filtered.length}`,
        COLORS.limpieza,
        'LIMPIEZA'
      ));

      content.push(...createStatsGrid([
        { label: 'Fecha', value: formatDateShort(report.fecha) },
        { label: 'Horario', value: `${formatTime(report.hora_inicio)} - ${formatTime(report.hora_fin)}` },
        { label: 'Duracion', value: formatDuration(report.duracion_minutos), color: COLORS.success },
        { label: 'Realizado por', value: report.usuario_completo || '-' }
      ]));

      const mapSection = await createMapSection(report.latitud, report.longitud, report.sala_nombre);
      content.push(...mapSection);

      content.push(...createPhotosSection(fotosAntes, fotosDurante, fotosDespues));
      content.push(...createObservacionesSection(report.observaciones));

      if (i < filtered.length - 1 || selectedServices.mantenimiento) {
        content.push({ text: '', pageBreak: 'after' });
      }
      totalReports++;
    }
  }

  // === MANTENIMIENTO ===
  if (selectedServices.mantenimiento && data.mantenimiento) {
    const filtered = filterByDateRangeProper(data.mantenimiento, r => r.fecha_reporte || r.fecha_completada, desde, hasta);

    for (let i = 0; i < filtered.length; i++) {
      const report = filtered[i];
      processedReports++;
      if (onProgress) onProgress((processedReports / totalToProcess) * 100);

      const fotosAntes = await loadPhotosAsBase64(report.fotos_antes || []);
      const fotosDurante = await loadPhotosAsBase64(report.fotos_durante || []);
      const fotosDespues = await loadPhotosAsBase64(report.fotos_despues || []);

      const tipoLabel = report.tipo === 'preventivo' ? 'PREVENTIVO' :
                        report.tipo === 'correctivo' ? 'CORRECTIVO' : 'INSPECCION';

      content.push(...createReportHeader(
        report.titulo || 'Mantenimiento',
        `${tipoLabel} #${i + 1} de ${filtered.length}`,
        COLORS.mantenimiento,
        tipoLabel
      ));

      content.push(...createStatsGrid([
        { label: 'Vehiculo', value: report.vehiculo_placa || '-' },
        { label: 'Fecha Completada', value: formatDateShort(report.fecha_completada), color: COLORS.success },
        { label: 'Costo', value: report.costo ? `B/. ${report.costo.toFixed(2)}` : '-', color: COLORS.success },
        { label: 'Mecanico', value: report.mecanico || '-' }
      ]));

      // Mapa de ubicación (si existe)
      if (report.latitud && report.longitud) {
        const mapSection = await createMapSection(
          report.latitud,
          report.longitud,
          `Vehículo ${report.vehiculo_placa || 'N/A'}`
        );
        content.push(...mapSection);
      }

      if (report.descripcion) {
        content.push({
          text: 'DESCRIPCIÓN DEL TRABAJO',
          fontSize: 13,
          bold: true,
          color: COLORS.text,
          margin: [0, 6, 0, 4]
        });
        content.push({
          text: report.descripcion,
          fontSize: 10,
          color: COLORS.text,
          margin: [0, 0, 0, 6]
        });
      }

      content.push(...createPhotosSection(fotosAntes, fotosDurante, fotosDespues));
      content.push(...createObservacionesSection(report.observaciones));

      if (i < filtered.length - 1) {
        content.push({ text: '', pageBreak: 'after' });
      }
      totalReports++;
    }
  }

  const docDefinition = {
    header: createCertificationHeader(certLogos),
    content,
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: 'RMP - Reporte Unificado', fontSize: 8, color: COLORS.textSecondary },
        { text: `${formatDate(desde)} - ${formatDate(hasta)}`, fontSize: 8, color: COLORS.textSecondary, alignment: 'center' },
        { text: `Pagina ${currentPage} de ${pageCount}`, fontSize: 8, color: COLORS.textSecondary, alignment: 'right' }
      ],
      margin: [40, 10, 40, 0]
    }),
    styles: defaultStyles,
    pageMargins: [40, 70, 40, 50] // Reducido para más espacio de contenido
  };

  pdfMake.createPdf(docDefinition).download(`Reporte_Unificado_${desde}_${hasta}.pdf`);
  return { success: true, totalReports };
};

// ============================================
// FUNCIONES LEGACY (para compatibilidad)
// ============================================
const filterByDateRange = (data, dateField, desde, hasta) => {
  const desdeDate = parseLocalDate(desde);
  const hastaDate = parseLocalDate(hasta);
  hastaDate.setHours(23, 59, 59, 999);
  return data.filter(item => {
    const itemDate = parseLocalDate(item[dateField]);
    return itemDate >= desdeDate && itemDate <= hastaDate;
  });
};

export const generateRecoleccionPDF = (reports, dateRange) => {
  return generateRecoleccionPDFComplete(reports, dateRange);
};

export const generateFumigacionPDF = (reports, dateRange) => {
  return generateFumigacionPDFComplete(reports, dateRange);
};

export const generateLimpiezaPDF = (reports, dateRange) => {
  return generateLimpiezaPDFComplete(reports, dateRange);
};

export const generateMantenimientoPDF = (reports, dateRange) => {
  return generateMantenimientoPDFComplete(reports, dateRange);
};

export const generateCombinedPDF = (data, dateRange, selectedServices) => {
  return generateCombinedPDFComplete(data, dateRange, selectedServices);
};

/**
 * Genera PDF de un SOLO reporte de ruta (usado al completar/terminar ruta)
 * Mismo formato profesional que generateRecoleccionPDFComplete pero para 1 reporte
 */
export const generateSingleRouteReportPDF = async (report, riskReports = [], observaciones = '') => {
  const certLogos = await loadCertificationLogos('recoleccion');
  const content = [];

  // Header
  const isTerminada = report.terminacion_anticipada || report.porcentaje_completado < 100;
  content.push(...createReportHeader(
    report.ruta_nombre || 'Ruta de Recoleccion',
    isTerminada ? 'Terminacion Anticipada' : 'Ruta Completada',
    isTerminada ? COLORS.warning : COLORS.recoleccion,
    'RECOLECCION'
  ));

  // Stats grid
  const totalParadas = report.ruta_paradas?.length || report.paradas?.length || 0;
  const completadas = report.paradas_completadas?.length || 0;
  content.push(...createStatsGrid([
    { label: 'Conductor', value: report.conductor_nombre || '-' },
    { label: 'Vehiculo', value: report.vehiculo_placa || '-' },
    { label: 'Tiempo Total', value: formatSeconds(report.tiempoTotal || report.tiempo_total_segundos || 0) },
    { label: 'Fecha', value: formatDateShort(report.fechaCompletacion || report.fecha_completacion) },
    { label: 'Paradas', value: `${completadas}/${totalParadas}`, color: completadas === totalParadas ? COLORS.success : COLORS.warning },
    { label: 'Tipo', value: report.tipo_ruta || 'Recoleccion' }
  ]));

  // Map
  const extraerCoordenadas = (p) => {
    let lat = null, lng = null;
    if (p.lat && p.lng) { lat = p.lat; lng = p.lng; }
    else if (p.latitud && p.longitud) { lat = p.latitud; lng = p.longitud; }
    else if (p.gps_completada?.lat && p.gps_completada?.lng) { lat = p.gps_completada.lat; lng = p.gps_completada.lng; }
    return { lat, lng, nombre: p.direccion || p.nombre || p.parada_nombre || 'Parada' };
  };

  const paradasParaMapa = (report.ruta_paradas || report.paradas_completadas || report.paradas || [])
    .map(extraerCoordenadas)
    .filter(p => p.lat && p.lng);

  content.push({
    text: 'MAPA DE RUTA',
    fontSize: 13, bold: true, color: COLORS.text, margin: [0, 8, 0, 4]
  });

  if (paradasParaMapa.length > 0) {
    const mapUrl = getStaticMapWithRoute(paradasParaMapa);
    if (mapUrl) {
      const mapBase64 = await imageUrlToBase64(mapUrl);
      if (mapBase64) {
        content.push({ image: mapBase64, width: 515, height: 172, margin: [0, 0, 0, 4] });
      }
    }
  } else {
    content.push({
      table: { widths: ['*'], body: [[{ text: 'Mapa no disponible', fontSize: 11, color: COLORS.textTertiary, alignment: 'center', margin: [0, 20, 0, 20] }]] },
      layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => COLORS.border, vLineColor: () => COLORS.border },
      margin: [0, 0, 0, 6]
    });
  }

  // Stops table
  const allParadas = report.paradas_completadas || report.paradas || [];
  const noCompletadas = report.paradas_no_completadas || [];

  if (allParadas.length > 0 || noCompletadas.length > 0) {
    const combinedParadas = [...allParadas, ...noCompletadas];
    content.push({
      text: `PARADAS (${combinedParadas.length})`,
      fontSize: 13, bold: true, color: COLORS.text, margin: [0, 6, 0, 4]
    });

    const paradasBody = [
      [
        { text: '#', fontSize: 10, bold: true, fillColor: COLORS.surfaceSecondary, alignment: 'center' },
        { text: 'DIRECCION', fontSize: 10, bold: true, fillColor: COLORS.surfaceSecondary },
        { text: 'CARGA', fontSize: 10, bold: true, fillColor: COLORS.surfaceSecondary, alignment: 'center' },
        { text: 'ESTADO', fontSize: 10, bold: true, fillColor: COLORS.surfaceSecondary, alignment: 'center' }
      ]
    ];

    allParadas.forEach((p, idx) => {
      paradasBody.push([
        { text: `${p.orden || idx + 1}`, fontSize: 9, alignment: 'center', bold: true },
        { text: p.direccion || p.nombre || `Parada ${idx + 1}`, fontSize: 9 },
        { text: p.categoria_carga || '-', fontSize: 9, alignment: 'center' },
        { text: 'Completada', fontSize: 9, color: COLORS.success, bold: true, alignment: 'center' }
      ]);
    });

    noCompletadas.forEach((p) => {
      paradasBody.push([
        { text: `${p.orden || '-'}`, fontSize: 9, alignment: 'center', bold: true },
        { text: p.direccion || p.nombre || 'Parada', fontSize: 9 },
        { text: '-', fontSize: 9, alignment: 'center' },
        { text: 'No completada', fontSize: 9, color: COLORS.error, bold: true, alignment: 'center' }
      ]);
    });

    content.push({
      table: { headerRows: 1, widths: [30, '*', 70, 85], body: paradasBody },
      layout: {
        hLineWidth: () => 0.5, vLineWidth: () => 0.5,
        hLineColor: () => COLORS.border, vLineColor: () => COLORS.border,
        paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 2, paddingBottom: () => 2
      },
      margin: [0, 0, 0, 6]
    });
  }

  // Risk reports section
  if (riskReports.length > 0) {
    content.push({
      text: `REPORTES DE RIESGO (${riskReports.length})`,
      fontSize: 13, bold: true, color: COLORS.warning, margin: [0, 8, 0, 4]
    });

    riskReports.forEach((risk) => {
      content.push({
        table: {
          widths: ['*'],
          body: [[{
            stack: [
              { text: risk.titulo || 'Sin titulo', fontSize: 11, bold: true, color: COLORS.text },
              { text: `${risk.tipo || '-'} | Prioridad: ${risk.prioridad || '-'}`, fontSize: 9, color: COLORS.textSecondary, margin: [0, 2, 0, 2] },
              ...(risk.descripcion ? [{ text: risk.descripcion, fontSize: 9, color: COLORS.textSecondary }] : [])
            ],
            margin: [8, 6, 8, 6]
          }]]
        },
        layout: {
          hLineWidth: () => 1, vLineWidth: () => 1,
          hLineColor: () => COLORS.warning, vLineColor: () => COLORS.warning
        },
        margin: [0, 0, 0, 4]
      });
    });
  }

  // Observations
  const finalObs = observaciones || report.observaciones || '';
  content.push(...createObservacionesSection(finalObs));

  // Build PDF
  const fechaStr = new Date().toISOString().split('T')[0];
  const docDefinition = {
    header: createCertificationHeader(certLogos),
    content,
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: 'RMP - Reporte de Ruta', fontSize: 8, color: COLORS.textSecondary },
        { text: report.ruta_nombre || '', fontSize: 8, color: COLORS.textSecondary, alignment: 'center' },
        { text: `Pagina ${currentPage} de ${pageCount}`, fontSize: 8, color: COLORS.textSecondary, alignment: 'right' }
      ],
      margin: [40, 10, 40, 0]
    }),
    styles: defaultStyles,
    pageMargins: [40, 70, 40, 50]
  };

  pdfMake.createPdf(docDefinition).download(`Reporte_Ruta_${(report.ruta_nombre || 'ruta').replace(/\s+/g, '_')}_${fechaStr}.pdf`);
  return { success: true };
};

export default {
  generateLimpiezaPDFComplete,
  generateFumigacionPDFComplete,
  generateMantenimientoPDFComplete,
  generateRecoleccionPDFComplete,
  generateCombinedPDFComplete,
  generateRecoleccionPDF,
  generateFumigacionPDF,
  generateLimpiezaPDF,
  generateMantenimientoPDF,
  generateCombinedPDF,
  generateSingleRouteReportPDF
};
