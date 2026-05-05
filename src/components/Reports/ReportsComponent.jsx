import { useState, useMemo, useEffect, memo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useCleaning } from '../../context/CleaningContext';
import { useFumigation } from '../../context/FumigationContext';
import { useMaintenance } from '../../context/MaintenanceContext';
import { useReports } from '../../context/ReportsContext';
import { useRoutes } from '../../context/RoutesContext';
import { useAuth } from '../../context/AuthContext';
import { BarChart3, Truck, Bug, Sparkles, Wrench, MapPin, Download, Calendar } from '../Icons';
import ReportsDashboard from './ReportsDashboard';
import LocationReportsModal from './LocationReportsModal';
import RouteReportsListModal from './RouteReportsListModal';
import RouteReportDetailModal from './RouteReportDetailModal';
import MaintenanceReportDetailModal from './MaintenanceReportDetailModal';
import FumigationReportsPage from './FumigationReportsPage';
import { DEMO_LUGARES, DEMO_CLEANING_ASSIGNMENTS, mergeDemoData } from '../../utils/demoData';
import { useDemoMode } from '../../hooks/useDemoMode';
import {
  generateRecoleccionPDFComplete,
  generateFumigacionPDFComplete,
  generateLimpiezaPDFComplete,
  generateMantenimientoPDFComplete
} from '../../utils/reportPdfGenerator';
import './ReportsComponent.css';

// Helper para parsear fechas sin problemas de timezone
// "2026-01-13" -> Date local (no UTC)
const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  // Si ya tiene hora (ISO string completo), usar directamente
  if (dateStr.includes('T')) return new Date(dateStr);
  // Si es solo fecha "YYYY-MM-DD", agregar T00:00:00 para que sea hora local
  return new Date(dateStr + 'T00:00:00');
};

const ReportsComponent = ({ preSelectedLocationId = null, onClearSelection = null }) => {
  const [activeCategory, setActiveCategory] = useState('dashboard');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedRouteReport, setSelectedRouteReport] = useState(null);
  const [selectedRouteCard, setSelectedRouteCard] = useState(null);
  const [selectedMaintenanceReport, setSelectedMaintenanceReport] = useState(null);
  const { isDemoMode } = useDemoMode();
  const [routeReports, setRouteReports] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // Estados para descarga por módulo
  const [moduleDownloading, setModuleDownloading] = useState(null);
  const [moduleDateRanges, setModuleDateRanges] = useState({
    recoleccion: {
      desde: new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0],
      hasta: new Date().toISOString().split('T')[0]
    },
    fumigacion: {
      desde: new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0],
      hasta: new Date().toISOString().split('T')[0]
    },
    limpieza: {
      desde: new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0],
      hasta: new Date().toISOString().split('T')[0]
    },
    mantenimiento: {
      desde: new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0],
      hasta: new Date().toISOString().split('T')[0]
    }
  });

  const { user } = useAuth();
  const { assignments, loading: cleaningLoading, lugares } = useCleaning();
  const {
    assignments: fumigationAssignments,
    lugares: fumigationLugares,
    loading: fumigationLoading
  } = useFumigation();
  const { tasks: maintenanceTasks, loading: maintenanceLoading } = useMaintenance();
  const { reports: reportsData } = useReports();
  const { routes: allRoutes } = useRoutes();

  // Query para reportes de mantenimiento
  const maintenanceReportsData = useQuery(api.maintenance.listReports);
  const maintenanceReports = maintenanceReportsData || [];

  // Queries para reportes COMPLETOS con fotos (para descarga profesional)
  const fumigationReportsWithPhotos = useQuery(api.fumigaciones.listReportsWithPhotos, {});
  const cleaningReportsWithPhotos = useQuery(api.cleaning.listReportsWithPhotos, {});
  const maintenanceReportsWithPhotos = useQuery(api.maintenance.listReportsWithPhotos, {});

  // Resetear página cuando cambie de categoría
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory]);

  // Cargar reportes de rutas completadas
  useEffect(() => {
    if (activeCategory === 'recoleccion' && reportsData) {
      setRouteReports(reportsData);
    }
  }, [activeCategory, reportsData]);

  // Mergear datos demo con datos reales si el modo demo está activo
  const displayLugares = isDemoMode ? mergeDemoData(lugares, DEMO_LUGARES) : lugares;
  const displayAssignments = isDemoMode ? mergeDemoData(assignments, DEMO_CLEANING_ASSIGNMENTS) : assignments;

  // Manejar pre-selección de ubicación desde mapa
  useEffect(() => {
    if (preSelectedLocationId) {
      // Buscar primero en fumigationLugares (lugares de fumigación)
      const fumigationMatch = fumigationLugares.find(l => l._id === preSelectedLocationId);
      if (fumigationMatch) {
        const enrichedLocation = {
          ...fumigationMatch,
          id: fumigationMatch._id,
          assignmentsCount: 0,
          completedCount: 0,
          assignments: []
        };
        setActiveCategory('fumigacion');
        setSelectedLocation(enrichedLocation);
        return;
      }

      // Luego buscar en displayLugares (limpieza - tabla salas)
      const cleaningMatch = displayLugares.find(l => l.id === preSelectedLocationId);
      if (cleaningMatch) {
        const lugarAssignments = displayAssignments.filter(a => {
          const matchLocation = a.lugar?.id === cleaningMatch.id || a.lugar_id === cleaningMatch.id;
          return matchLocation;
        });

        const enrichedLocation = {
          ...cleaningMatch,
          assignmentsCount: lugarAssignments.length,
          completedCount: lugarAssignments.filter(a => a.estado === 'completado').length,
          assignments: lugarAssignments
        };
        setActiveCategory('limpieza');
        setSelectedLocation(enrichedLocation);
      }
    }
  }, [preSelectedLocationId, fumigationLugares, displayLugares, displayAssignments]);

  const categories = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'recoleccion', label: 'Recolección', icon: Truck },
    { id: 'fumigacion', label: 'Fumigación', icon: Bug },
    { id: 'limpieza', label: 'Limpieza', icon: Sparkles },
    { id: 'mantenimiento', label: 'Mantenimiento', icon: Wrench }
  ];

  const getStatusVariant = (estado) => {
    switch (estado) {
      case 'completado': return 'success';
      case 'en_progreso': return 'primary';
      case 'pendiente': return 'warning';
      case 'cancelado': return 'error';
      default: return 'default';
    }
  };

  // Función para descargar reportes por módulo (usa generador profesional con logos, mapas, fotos)
  const handleModuleDownload = async (module) => {
    if (user?.tipo === 'conductor') {
      alert('No tiene permisos para descargar reportes');
      return;
    }

    const dateRange = moduleDateRanges[module];

    if (dateRange.desde > dateRange.hasta) {
      alert('La fecha "Desde" debe ser anterior a la fecha "Hasta"');
      return;
    }

    setModuleDownloading(module);

    try {
      let result;
      const generators = {
        recoleccion: () => generateRecoleccionPDFComplete(reportsData || [], dateRange),
        fumigacion: () => generateFumigacionPDFComplete(fumigationReportsWithPhotos || [], dateRange),
        limpieza: () => generateLimpiezaPDFComplete(cleaningReportsWithPhotos || [], dateRange),
        mantenimiento: () => generateMantenimientoPDFComplete(maintenanceReportsWithPhotos || [], dateRange)
      };

      result = await generators[module]();
      console.log(`📄 PDF profesional de ${module} generado:`, result);
    } catch (error) {
      console.error(`Error generando PDF de ${module}:`, error);
      alert(`Error al generar el reporte de ${module}. Por favor intenta nuevamente.`);
    } finally {
      setModuleDownloading(null);
    }
  };

  // Actualizar rango de fechas por módulo
  const updateModuleDateRange = (module, field, value) => {
    setModuleDateRanges(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [field]: value
      }
    }));
  };

  // Cards de recolección — un card por RUTA (con sus reportes adentro) + huérfanos (reportes cuya ruta fue borrada)
  const recoleccionCards = useMemo(() => {
    const recoleccionRoutes = (allRoutes || []).filter(r => r.tipo_servicio === 'recoleccion');
    const reportsByRutaId = new Map();
    for (const report of routeReports) {
      const key = report.ruta_id || '__sin_ruta__';
      if (!reportsByRutaId.has(key)) reportsByRutaId.set(key, []);
      reportsByRutaId.get(key).push(report);
    }

    const routeCards = recoleccionRoutes.map(ruta => {
      const reports = reportsByRutaId.get(ruta._id) || [];
      const ubicacion = ruta.ubicacion_principal
        || (Array.isArray(ruta.paradas) && ruta.paradas[0]?.latitud && ruta.paradas[0]?.longitud
            ? { latitud: ruta.paradas[0].latitud, longitud: ruta.paradas[0].longitud, nombre: ruta.nombre }
            : null);
      const lastReport = reports.length > 0
        ? reports.reduce((acc, r) => (!acc || r.fecha_completacion > acc.fecha_completacion ? r : acc), null)
        : null;
      return {
        _id: ruta._id,
        ruta,
        reports,
        orphan: false,
        nombre: ruta.nombre,
        foto_storage_id: ruta.foto_portada_storage_id || null,
        ubicacion,
        paradasCount: Array.isArray(ruta.paradas) ? ruta.paradas.length : 0,
        reportsCount: reports.length,
        fechaLabel: lastReport
          ? parseLocalDate(lastReport.fecha_completacion).toLocaleDateString('es-ES')
          : 'Sin ejecuciones',
      };
    });

    // Reportes huérfanos: ruta_id no coincide con ninguna ruta existente. Agrupar por ruta_id.
    const knownRutaIds = new Set(recoleccionRoutes.map(r => r._id));
    const orphanGroups = new Map();
    for (const report of routeReports) {
      if (report.ruta_id && knownRutaIds.has(report.ruta_id)) continue;
      const key = report.ruta_id || `__sin_ruta_${report._id}`;
      if (!orphanGroups.has(key)) orphanGroups.set(key, []);
      orphanGroups.get(key).push(report);
    }
    const orphanCards = Array.from(orphanGroups.entries()).map(([key, reports]) => {
      const sample = reports[0];
      const ubicacion = sample.ruta_ubicacion_principal
        || (Array.isArray(sample.ruta_paradas) && sample.ruta_paradas[0]?.latitud && sample.ruta_paradas[0]?.longitud
            ? { latitud: sample.ruta_paradas[0].latitud, longitud: sample.ruta_paradas[0].longitud, nombre: sample.ruta_nombre }
            : null);
      const lastReport = reports.reduce((acc, r) => (!acc || r.fecha_completacion > acc.fecha_completacion ? r : acc), null);
      return {
        _id: `orphan_${key}`,
        ruta: null,
        reports,
        orphan: true,
        nombre: `${sample.ruta_nombre || 'Ruta sin nombre'} (eliminada)`,
        foto_storage_id: sample.ruta_foto_portada_storage_id || null,
        ubicacion,
        paradasCount: Array.isArray(sample.ruta_paradas) ? sample.ruta_paradas.length : 0,
        reportsCount: reports.length,
        fechaLabel: lastReport
          ? parseLocalDate(lastReport.fecha_completacion).toLocaleDateString('es-ES')
          : '—',
      };
    });

    return [...routeCards, ...orphanCards];
  }, [allRoutes, routeReports]);

  // Tarjeta de reporte de recolección — foto subida o fallback a iframe Google Maps
  const RecoleccionReportCard = memo(({ card, onClick }) => {
    const remoteUrl = useQuery(
      api.files.getUrl,
      card.foto_storage_id ? { storageId: card.foto_storage_id } : 'skip'
    );
    const ubic = card.ubicacion;
    const hasCoords = ubic?.latitud && ubic?.longitud;
    const mapQuery = hasCoords
      ? `${ubic.latitud},${ubic.longitud}`
      : encodeURIComponent((ubic?.nombre || card.nombre) + ', Panama City, Panama');
    const embedUrl = `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${mapQuery}&zoom=16`;

    return (
      <div
        className="location-map-card"
        onClick={onClick}
        style={{ cursor: 'pointer' }}
      >
        <div className="location-image-wrapper">
          {remoteUrl ? (
            <img
              src={remoteUrl}
              alt={card.nombre}
              className="location-image"
              loading="lazy"
              decoding="async"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <iframe
              src={embedUrl}
              className="location-map-iframe"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Mapa de ${card.nombre}`}
              style={{ width: '100%', height: '100%', border: 0, pointerEvents: 'none' }}
            />
          )}
        </div>
        <div className="map-card-overlay">
          <h4>{card.nombre}</h4>
          <span className="report-badge">
            {card.reportsCount} reporte{card.reportsCount === 1 ? '' : 's'} · {card.paradasCount} paradas · {card.fechaLabel}
          </span>
        </div>
      </div>
    );
  });

  const renderRecoleccion = () => {
    const totalPages = Math.ceil(recoleccionCards.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedCards = recoleccionCards.slice(startIndex, endIndex);

    return (
      <div className="reports-category reports-recoleccion">
        <div className="category-header">
          <h3>Reportes de Recolección</h3>
          <p>
            {recoleccionCards.length === 0
              ? 'Crea una ruta de recolección desde el módulo Rutas para verla aquí.'
              : `${recoleccionCards.length} ruta${recoleccionCards.length === 1 ? '' : 's'} — click en una tarjeta para ver sus reportes de ejecución.`}
          </p>
        </div>

        {recoleccionCards.length === 0 ? (
          <div className="empty-state">
            <Truck size={48} />
            <h4>No hay rutas de recolección todavía</h4>
            <p>Crea una ruta desde el módulo Rutas. Cada vez que un conductor la complete, aparecerá un reporte adentro.</p>
          </div>
        ) : (
          <>
            <div className="locations-grid">
              {paginatedCards.map(card => (
                <RecoleccionReportCard
                  key={card._id}
                  card={card}
                  onClick={() => setSelectedRouteCard(card)}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ← Anterior
                </button>
                <span className="pagination-info">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // Tarjeta compartida para limpieza/fumigación — usa foto_storage_id si existe, else iframe Google Maps con coords, else placeholder
  const LocationCard = memo(({ location, onClick, FallbackIcon }) => {
    const remoteUrl = useQuery(
      api.files.getUrl,
      location.foto_storage_id ? { storageId: location.foto_storage_id } : 'skip'
    );
    const hasCoords = typeof location.latitud === 'number' && typeof location.longitud === 'number';
    const mapQuery = hasCoords
      ? `${location.latitud},${location.longitud}`
      : encodeURIComponent(location.nombre + ', Panama City, Panama');
    const embedUrl = `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${mapQuery}&zoom=16`;

    return (
      <div
        className="location-map-card"
        onClick={onClick}
        style={{ cursor: 'pointer' }}
      >
        <div className="location-image-wrapper">
          {remoteUrl ? (
            <img
              src={remoteUrl}
              alt={location.nombre}
              className="location-image"
              loading="lazy"
              decoding="async"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : hasCoords ? (
            <iframe
              src={embedUrl}
              className="location-map-iframe"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Mapa de ${location.nombre}`}
              style={{ width: '100%', height: '100%', border: 0, pointerEvents: 'none' }}
            />
          ) : (
            <div className="location-image-fallback" style={{ display: 'flex' }}>
              {FallbackIcon && <FallbackIcon size={48} />}
              <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
                {location.nombre}
              </p>
            </div>
          )}
        </div>
        <div className="map-card-overlay">
          <h4>{location.nombre}</h4>
          <span className="report-badge">{location.assignmentsCount} reportes</span>
        </div>
      </div>
    );
  });

  // Agrupar fumigaciones por lugar
  const fumigacionByLocation = useMemo(() => {
    return fumigationLugares
      .filter(lugar => lugar.activo !== false)
      .map(lugar => {
        const lugarFumigations = fumigationAssignments.filter(a =>
          a.lugar_id === lugar._id
        );

        // Calcular cumplimiento de frecuencia
        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const thisWeekStart = new Date(now);
        thisWeekStart.setDate(now.getDate() - now.getDay());
        const thisWeekStartStr = thisWeekStart.toISOString().split('T')[0];

        const internasThisMonth = lugarFumigations.filter(f =>
          f.tipo_fumigacion === 'interna' &&
          f.fecha.startsWith(thisMonth)
        ).length;

        const externasThisWeek = lugarFumigations.filter(f =>
          f.tipo_fumigacion === 'externa' &&
          f.fecha >= thisWeekStartStr
        ).length;

        // Calcular compliance para AMBOS tipos (todos los lugares pueden tener ambos)
        const internaCompliance = Math.min((internasThisMonth / 1) * 100, 100);
        const externaCompliance = Math.min((externasThisWeek / 3) * 100, 100);

        return {
          ...lugar,
          id: lugar._id, // Para compatibilidad con MapCard
          assignmentsCount: lugarFumigations.length,
          completedCount: lugarFumigations.filter(a => a.estado === 'reportada').length,
          assignments: lugarFumigations,
          internaCompliance,
          externaCompliance,
          internasThisMonth,
          externasThisWeek
        };
      });
  }, [fumigationLugares, fumigationAssignments]);

  const renderFumigacion = () => {
    // Paginación
    const totalPages = Math.ceil(fumigacionByLocation.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedLocations = fumigacionByLocation.slice(startIndex, endIndex);

    return (
      <div className="reports-category reports-fumigacion">
        <div className="category-header">
          <h3>🦟 Reportes de Fumigación</h3>
          <p>Visualiza fumigaciones internas (mensuales) y externas (semanales) por ubicación</p>
        </div>

        {/* Controles de descarga */}
        <div className="module-download-controls">
          <div className="download-date-inputs">
            <div className="date-input-small">
              <label><Calendar size={14} /> Desde</label>
              <input
                type="date"
                value={moduleDateRanges.fumigacion.desde}
                onChange={(e) => updateModuleDateRange('fumigacion', 'desde', e.target.value)}
                max={moduleDateRanges.fumigacion.hasta}
              />
            </div>
            <div className="date-input-small">
              <label><Calendar size={14} /> Hasta</label>
              <input
                type="date"
                value={moduleDateRanges.fumigacion.hasta}
                onChange={(e) => updateModuleDateRange('fumigacion', 'hasta', e.target.value)}
                min={moduleDateRanges.fumigacion.desde}
              />
            </div>
          </div>
          <button
            className="btn-download-module"
            onClick={() => handleModuleDownload('fumigacion')}
            disabled={moduleDownloading === 'fumigacion'}
          >
            <Download size={18} />
            {moduleDownloading === 'fumigacion' ? 'Generando PDF...' : 'Descargar Fumigación'}
          </button>
        </div>

        {fumigationLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Cargando ubicaciones...</p>
          </div>
        ) : fumigacionByLocation.length === 0 ? (
          <div className="empty-state">
            <Bug size={48} />
            <h4>No hay lugares de fumigación registrados</h4>
            <p>Registra lugares internos o externos en Asignaciones → Fumigación</p>
          </div>
        ) : (
          <>
            <div className="locations-grid limpieza-grid-3col">
              {paginatedLocations.map(location => (
                <LocationCard
                  key={location._id || location.id}
                  location={location}
                  onClick={() => setSelectedLocation(location)}
                  FallbackIcon={Bug}
                />
              ))}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </button>
                <span className="pagination-info">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}

        {selectedLocation && (
          <FumigationReportsPage
            location={selectedLocation}
            onClose={() => {
              setSelectedLocation(null);
              if (onClearSelection) {
                onClearSelection();
              }
            }}
            getStatusVariant={getStatusVariant}
          />
        )}
      </div>
    );
  };

  // Agrupar asignaciones por lugar (useMemo para performance)
  const assignmentsByLocation = useMemo(() => {
    // Mostrar TODOS los lugares activos, no solo los que tienen asignaciones
    return lugares
      .filter(lugar => lugar.activo !== false)
      .map(lugar => {
        const lugarAssignments = assignments.filter(a => {
          // Intentar múltiples formas de match
          return a.lugar?.id === lugar.id ||
                 a.lugar_id === lugar.id;
        });

        return {
          ...lugar,
          assignmentsCount: lugarAssignments.length,
          completedCount: lugarAssignments.filter(a => a.estado === 'completado').length,
          assignments: lugarAssignments
        };
      });
      // ELIMINADO: .filter(l => l.assignmentsCount > 0) - Ahora mostramos todos
  }, [lugares, assignments]);

  const renderLimpieza = () => {
    // Paginación
    const totalPages = Math.ceil(assignmentsByLocation.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedLocations = assignmentsByLocation.slice(startIndex, endIndex);

    return (
      <div className="reports-category reports-limpieza">
        <div className="category-header">
          <h3>Reportes de Limpieza por Ubicación</h3>
          <p>Selecciona una ubicación para ver sus reportes detallados ({assignmentsByLocation.length} lugares)</p>
        </div>

        {cleaningLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Cargando reportes de limpieza...</p>
          </div>
        ) : assignmentsByLocation.length === 0 ? (
          <div className="empty-state">
            <Sparkles size={48} />
            <p>No hay lugares registrados</p>
          </div>
        ) : (
          <>
            <div className="locations-grid limpieza-grid-3col">
              {paginatedLocations.map(location => (
                <LocationCard
                  key={location._id || location.id}
                  location={location}
                  onClick={() => setSelectedLocation(location)}
                  FallbackIcon={MapPin}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ← Anterior
                </button>
                <span className="pagination-info">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}

        {selectedLocation && (
          <LocationReportsModal
            location={selectedLocation}
            onClose={() => {
              setSelectedLocation(null);
              if (onClearSelection) {
                onClearSelection();
              }
            }}
            getStatusVariant={getStatusVariant}
            modalType="limpieza"
          />
        )}
      </div>
    );
  };

  // maintenanceByLocation removed - maintenance tasks are grouped by vehicle, not location

  const renderMantenimiento = () => {
    // Paginación para reportes
    const totalPages = Math.ceil(maintenanceReports.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedReports = maintenanceReports.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Formatear tipo de mantenimiento
    const getTipoLabel = (tipo) => {
      switch (tipo) {
        case 'preventivo': return 'Preventivo';
        case 'correctivo': return 'Correctivo';
        case 'inspección': return 'Inspección';
        default: return tipo;
      }
    };

    // Formatear prioridad con colores
    const getPrioridadClass = (prioridad) => {
      switch (prioridad) {
        case 'urgente': return 'priority-urgente';
        case 'alta': return 'priority-alta';
        case 'media': return 'priority-media';
        default: return 'priority-baja';
      }
    };

    return (
      <div className="reports-category reports-mantenimiento">
        <div className="category-header">
          <h3>Reportes de Mantenimiento</h3>
          <p>Historial de tareas de mantenimiento completadas ({maintenanceReports.length} reportes)</p>
        </div>

        {/* Controles de descarga */}
        <div className="module-download-controls">
          <div className="download-date-inputs">
            <div className="date-input-small">
              <label><Calendar size={14} /> Desde</label>
              <input
                type="date"
                value={moduleDateRanges.mantenimiento.desde}
                onChange={(e) => updateModuleDateRange('mantenimiento', 'desde', e.target.value)}
                max={moduleDateRanges.mantenimiento.hasta}
              />
            </div>
            <div className="date-input-small">
              <label><Calendar size={14} /> Hasta</label>
              <input
                type="date"
                value={moduleDateRanges.mantenimiento.hasta}
                onChange={(e) => updateModuleDateRange('mantenimiento', 'hasta', e.target.value)}
                min={moduleDateRanges.mantenimiento.desde}
              />
            </div>
          </div>
          <button
            className="btn-download-module"
            onClick={() => handleModuleDownload('mantenimiento')}
            disabled={moduleDownloading === 'mantenimiento'}
          >
            <Download size={18} />
            {moduleDownloading === 'mantenimiento' ? 'Generando PDF...' : 'Descargar Mantenimiento'}
          </button>
        </div>

        {maintenanceLoading || maintenanceReportsData === undefined ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Cargando reportes de mantenimiento...</p>
          </div>
        ) : maintenanceReports.length === 0 ? (
          <div className="empty-state">
            <Wrench size={48} />
            <h4>No hay reportes de mantenimiento</h4>
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
              Completa tareas de mantenimiento para generar reportes
            </p>
            <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
              ({maintenanceTasks.length} tareas en sistema)
            </p>
          </div>
        ) : (
          <>
            {/* Grid de reportes */}
            <div className="route-reports-grid">
              {paginatedReports.map((report) => (
                <div
                  key={report._id}
                  className="route-report-card"
                  onClick={() => setSelectedMaintenanceReport(report)}
                >
                  <div className="route-report-card-header">
                    <h4 className="route-report-card-title">{report.titulo}</h4>
                    <div className="maintenance-badges-mini">
                      <span className={`maintenance-badge-mini tipo-${report.tipo}`}>
                        {getTipoLabel(report.tipo)}
                      </span>
                      <span className={`maintenance-badge-mini ${getPrioridadClass(report.prioridad)}`}>
                        {report.prioridad}
                      </span>
                    </div>
                  </div>
                  <div className="route-report-meta">
                    {report.vehiculo_placa && (
                      <span className="route-report-meta-item">
                        🚛 {report.vehiculo_placa}
                      </span>
                    )}
                    {report.mecanico && (
                      <span className="route-report-meta-item">
                        👤 {report.mecanico}
                      </span>
                    )}
                    {report.costo !== undefined && report.costo !== null && (
                      <span className="route-report-meta-item">
                        💰 ${report.costo.toFixed(2)}
                      </span>
                    )}
                    <span className="route-report-meta-item">
                      📅 {parseLocalDate(report.fecha_completada).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  <p className="route-report-hint">
                    Click para ver detalles completos y fotos
                  </p>
                </div>
              ))}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </button>
                <span className="pagination-info">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderCategoriesNav = () => (
    <div className="reports-categories">
      {categories.map(category => (
        <button
          key={category.id}
          className={`category-tab ${activeCategory === category.id ? 'category-tab--active' : ''}`}
          onClick={() => {
            setActiveCategory(category.id);
          }}
        >
          <category.icon size={20} strokeWidth={1.5} />
          <span>{category.label}</span>
        </button>
      ))}
    </div>
  );

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'dashboard':
        return <ReportsDashboard onNavigate={setActiveCategory} categoriesNav={renderCategoriesNav()} />;
      case 'recoleccion':
        return renderRecoleccion();
      case 'fumigacion':
        return renderFumigacion();
      case 'limpieza':
        return renderLimpieza();
      case 'mantenimiento':
        return renderMantenimiento();
      default:
        return <ReportsDashboard onNavigate={setActiveCategory} categoriesNav={renderCategoriesNav()} />;
    }
  };

  return (
    <div className="reports-container-new">
      {activeCategory === 'dashboard' ? (
        renderCategoryContent()
      ) : (
        <>
          {renderCategoriesNav()}
          <div className="reports-content-new">
            {renderCategoryContent()}
          </div>
        </>
      )}

      {/* Modal de lista de reportes por ruta */}
      {selectedRouteCard && (
        <RouteReportsListModal
          card={selectedRouteCard}
          onClose={() => setSelectedRouteCard(null)}
          onSelectReport={(report) => setSelectedRouteReport(report)}
          getStatusVariant={getStatusVariant}
        />
      )}

      {/* Modal de detalle de reporte de ruta */}
      {selectedRouteReport && (
        <RouteReportDetailModal
          report={selectedRouteReport}
          onClose={() => setSelectedRouteReport(null)}
        />
      )}

      {/* Modal de detalle de reporte de mantenimiento */}
      {selectedMaintenanceReport && (
        <MaintenanceReportDetailModal
          report={selectedMaintenanceReport}
          onClose={() => setSelectedMaintenanceReport(null)}
        />
      )}
    </div>
  );
};

export default ReportsComponent;
