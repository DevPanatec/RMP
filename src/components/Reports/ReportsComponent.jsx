import { useState, useMemo, useEffect } from 'react';
import { useSupabaseRoutes } from '../../context/SupabaseRoutesContext';
import { useSupabaseCleaning } from '../../context/SupabaseCleaningContext';
import { useSupabaseMaintenance } from '../../context/SupabaseMaintenanceContext';
import { useSupabaseReports } from '../../context/SupabaseReportsContext';
import { BarChart3, Truck, Zap, Sparkles, Wrench, ChevronRight, MapPin, Calendar, Camera } from '../Icons';
import { Card, Badge } from '../UI';
import ReportsDashboard from './ReportsDashboard';
import RouteHistory from './RouteHistory';
import LocationReportsModal from './LocationReportsModal';
import { DEMO_LUGARES, DEMO_CLEANING_ASSIGNMENTS, mergeDemoData } from '../../utils/demoData';
import { useDemoMode } from '../../hooks/useDemoMode';
import './ReportsComponent.css';

const ReportsComponent = ({ userType = 'admin', preSelectedLocationId = null, onClearSelection = null }) => {
  const [activeCategory, setActiveCategory] = useState('dashboard');
  const [selectedRouteType, setSelectedRouteType] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const { isDemoMode } = useDemoMode();
  const [routeReports, setRouteReports] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const { routes } = useSupabaseRoutes();
  const { assignments, loading: cleaningLoading, lugares } = useSupabaseCleaning();
  const { tasks: maintenanceTasks, loading: maintenanceLoading } = useSupabaseMaintenance();
  const { getRouteCompletionReports } = useSupabaseReports();

  // Resetear página cuando cambie de categoría
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory]);

  // Cargar reportes de rutas completadas
  useEffect(() => {
    const loadRouteReports = async () => {
      try {
        const reports = await getRouteCompletionReports({ tipo_ruta: 'recoleccion' });
        console.log('📊 Reportes cargados:', reports);
        setRouteReports(reports);
      } catch (error) {
        console.error('Error cargando reportes de rutas:', error);
      }
    };
    if (activeCategory === 'recoleccion') {
      loadRouteReports();
    }
  }, [activeCategory, getRouteCompletionReports]);

  // Mergear datos demo con datos reales si el modo demo está activo
  const displayLugares = isDemoMode ? mergeDemoData(lugares, DEMO_LUGARES) : lugares;
  const displayAssignments = isDemoMode ? mergeDemoData(assignments, DEMO_CLEANING_ASSIGNMENTS) : assignments;

  // Manejar pre-selección de ubicación desde mapa
  useEffect(() => {
    if (preSelectedLocationId) {
      const location = displayLugares.find(l => l.id === preSelectedLocationId);
      if (location) {
        // Enriquecer el lugar con los assignments
        const lugarAssignments = displayAssignments.filter(a => {
          const matchLocation = a.lugar?.id === location.id || a.lugar_id === location.id;
          return matchLocation;
        });

        const enrichedLocation = {
          ...location,
          assignmentsCount: lugarAssignments.length,
          completedCount: lugarAssignments.filter(a => a.estado === 'completado').length,
          assignments: lugarAssignments
        };

        setActiveCategory('recoleccion'); // o 'limpieza' según el tipo
        setSelectedLocation(enrichedLocation);
      }
    }
  }, [preSelectedLocationId, displayLugares, displayAssignments]);

  const rutasRecoleccion = routes.filter(r => r.type === 'recoleccion' || r.tipoServicio === 'recoleccion');
  const rutasFumigacion = routes.filter(r => r.type === 'fumigacion' || r.tipoServicio === 'fumigacion');

  const categories = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'recoleccion', label: 'Recolección', icon: Truck },
    { id: 'fumigacion', label: 'Fumigación', icon: Zap },
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

  const getPhotoUrl = (filePath) => {
    return `https://your-supabase-url.supabase.co/storage/v1/object/public/${filePath}`;
  };

  // Mostrar TODOS los lugares para recolección
  const recoleccionLocations = useMemo(() => {
    const recoleccionPlaces = displayLugares.filter(lugar => lugar.activo !== false);
    console.log('🏢 Total lugares activos:', recoleccionPlaces.length);
    console.log('🏢 Lugares:', recoleccionPlaces.map(l => l.nombre));

    return recoleccionPlaces.map(lugar => {
      // Obtener assignments del lugar
      const lugarAssignments = displayAssignments.filter(a => {
        const matchLocation = a.lugar?.id === lugar.id || a.lugar_id === lugar.id;
        const matchType = a.tipo === 'recoleccion' || a.tipoServicio === 'recoleccion';
        return matchLocation && matchType;
      });

      // Buscar reportes de rutas que pasaron por este lugar
      const lugarReports = [];
      routeReports.forEach(report => {
        if (report.paradas_completadas && Array.isArray(report.paradas_completadas)) {
          report.paradas_completadas.forEach(parada => {
            const paradaDireccion = (parada.direccion || '').toLowerCase();
            const lugarNombre = lugar.nombre.toLowerCase();

            // Verificar si la parada pertenece a este lugar
            if (paradaDireccion.includes(lugarNombre) || lugarNombre.includes(paradaDireccion.split(' ')[0])) {
              lugarReports.push({
                ...report,
                tipo: 'recoleccion',
                tipoServicio: 'recoleccion',
                fecha: report.fecha_completacion,
                estado: 'completado',
                notas: report.observaciones,
                parada_info: parada
              });
            }
          });
        }
      });

      // Combinar assignments y reportes
      const allReports = [...lugarAssignments, ...lugarReports];

      return {
        ...lugar,
        assignmentsCount: allReports.length,
        completedCount: allReports.length,
        assignments: allReports
      };
    });
  }, [displayLugares, displayAssignments, routeReports]);

  const renderRecoleccion = () => {
    // Paginación
    const totalPages = Math.ceil(recoleccionLocations.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedLocations = recoleccionLocations.slice(startIndex, endIndex);

    console.log('📄 Paginación:', {
      total: recoleccionLocations.length,
      currentPage,
      totalPages,
      startIndex,
      endIndex,
      showing: paginatedLocations.length
    });

    return (
      <div className="reports-category reports-recoleccion">
        <div className="category-header">
          <h3>Reportes de Recolección por Ubicación</h3>
          <p>Selecciona un lugar para ver sus reportes de recolección ({recoleccionLocations.length} lugares)</p>
        </div>

        {cleaningLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Cargando ubicaciones...</p>
          </div>
        ) : recoleccionLocations.length === 0 ? (
          <div className="empty-state">
            <Truck size={48} />
            <p>No hay ubicaciones de recolección registradas</p>
          </div>
        ) : (
          <>
            <div className="locations-grid">
              {paginatedLocations.map(location => {
                const imageMap = {
                  'Mercado de Alcalde Díaz': 'Mercado Alcalde Diaz.jpeg',
                  'Mercado del Marisco': 'mercado de mariscos.jpg',
                  'Mercado de Pacora': 'Mercado de Pacora.jpg',
                  'Mercado San Felipe Neri': 'san felipe neri.jpeg',
                  'Mercado de Pueblo Nuevo': 'Mercado Pueblo Nuevo.jpg',
                  'Complejo Turístico Mi Pueblito': 'mi-pueblito.jpg',
                  'Almacén Central': 'almacen-central.jpg',
                  'Casa de la Municipalidad': 'casa-municipalidad.jpg',
                  'Casa Góngora': 'casa-gongora.jpg',
                  'Centro de Recaudación Magna Corp.': 'centro-recaudacion.jpg',
                  'Edificio Hatillo': 'edificio-hatillo.jpg',
                  'Oficinas del Parque Summit': 'parque-summit.jpg',
                  'Palacio Municipal': 'palacio-municipal.jpg',
                  'Planta de tratamiento (Mercado San Felipe Neri)': 'planta-tratamiento.jpg',
                  'Taller': 'taller.jpg'
                };

              // Usar Google Static Maps API para carga más rápida en tarjetas
              const staticMapUrl = location.nombre
                ? `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(location.nombre + ', Panama City, Panama')}&zoom=16&size=600x400&markers=color:red%7C${encodeURIComponent(location.nombre + ', Panama City, Panama')}&key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&style=feature:poi|visibility:on&style=feature:transit|visibility:simplified`
                : null;

              return (
                <div
                  key={location.id}
                  className="location-map-card"
                  onClick={() => setSelectedLocation(location)}
                >
                  <div className="location-image-wrapper">
                    {staticMapUrl ? (
                      <img
                        src={staticMapUrl}
                        alt={`Mapa de ${location.nombre}`}
                        className="location-map-static"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="location-image-fallback" style={{ display: staticMapUrl ? 'none' : 'flex' }}>
                      <Truck size={48} />
                      <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
                        {location.nombre}
                      </p>
                    </div>
                  </div>
                  <div className="map-card-overlay">
                    <h4>{location.nombre}</h4>
                    <span className="report-badge">{location.assignmentsCount} reportes</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="pagination-controls" style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
              marginTop: '24px',
              padding: '20px'
            }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  background: currentPage === 1 ? '#f3f4f6' : 'white',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: currentPage === 1 ? '#9ca3af' : '#374151'
                }}
              >
                ← Anterior
              </button>

              <span style={{
                fontSize: '14px',
                color: '#6b7280',
                fontWeight: '500'
              }}>
                Página {currentPage} de {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  background: currentPage === totalPages ? '#f3f4f6' : 'white',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: currentPage === totalPages ? '#9ca3af' : '#374151'
                }}
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
            getPhotoUrl={getPhotoUrl}
            getStatusVariant={getStatusVariant}
            modalType="recoleccion"
          />
        )}
      </div>
    );
  };

  // Filtrar lugares para fumigación
  const fumigacionLocations = useMemo(() => {
    const fumigacionPlaces = lugares.filter(lugar =>
      lugar.nombre.includes('Mercado') || lugar.nombre.includes('Complejo')
    ).filter(lugar =>
      !lugar.nombre.includes('Planta de tratamiento')
    );

    return fumigacionPlaces.map(lugar => {
      const lugarAssignments = assignments.filter(a => {
        const matchLocation = a.lugar?.id === lugar.id || a.lugar_id === lugar.id;
        const matchType = a.tipo === 'fumigacion' || a.tipoServicio === 'fumigacion';
        return matchLocation && matchType;
      });

      return {
        ...lugar,
        assignmentsCount: lugarAssignments.length,
        completedCount: lugarAssignments.filter(a => a.estado === 'completado').length,
        assignments: lugarAssignments
      };
    });
  }, [lugares, assignments]);

  const renderFumigacion = () => {
    return (
      <div className="reports-category reports-fumigacion">
        <div className="category-header">
          <h3>Reportes de Fumigación por Ubicación</h3>
          <p>Selecciona un mercado para ver sus reportes de fumigación</p>
        </div>

        {cleaningLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Cargando ubicaciones...</p>
          </div>
        ) : fumigacionLocations.length === 0 ? (
          <div className="empty-state">
            <Zap size={48} />
            <p>No hay ubicaciones de fumigación registradas</p>
          </div>
        ) : (
          <div className="locations-grid">
            {fumigacionLocations.map(location => {
              const imageMap = {
                'Mercado de Alcalde Díaz': 'Mercado Alcalde Diaz.jpeg',
                'Mercado del Marisco': 'mercado de mariscos.jpg',
                'Mercado de Pacora': 'Mercado de Pacora.jpg',
                'Mercado San Felipe Neri': 'san felipe neri.jpeg',
                'Mercado de Pueblo Nuevo': 'Mercado Pueblo Nuevo.jpg',
                'Complejo Turístico Mi Pueblito': 'mi-pueblito.jpg'
              };

              // Usar Google Static Maps API para carga más rápida en tarjetas
              const staticMapUrl = location.nombre
                ? `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(location.nombre + ', Panama City, Panama')}&zoom=16&size=600x400&markers=color:red%7C${encodeURIComponent(location.nombre + ', Panama City, Panama')}&key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&style=feature:poi|visibility:on&style=feature:transit|visibility:simplified`
                : null;

              return (
                <div
                  key={location.id}
                  className="location-map-card"
                  onClick={() => setSelectedLocation(location)}
                >
                  <div className="location-image-wrapper">
                    {staticMapUrl ? (
                      <img
                        src={staticMapUrl}
                        alt={`Mapa de ${location.nombre}`}
                        className="location-map-static"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="location-image-fallback" style={{ display: staticMapUrl ? 'none' : 'flex' }}>
                      <Zap size={48} />
                      <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
                        {location.nombre}
                      </p>
                    </div>
                  </div>
                  <div className="map-card-overlay">
                    <h4>{location.nombre}</h4>
                    <span className="report-badge">{location.assignmentsCount} reportes</span>
                  </div>
                </div>
              );
            })}
          </div>
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
            getPhotoUrl={getPhotoUrl}
            getStatusVariant={getStatusVariant}
            modalType="fumigacion"
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

    console.log('🔍 DEBUG - lugares:', lugares);
    console.log('🔍 DEBUG - assignments:', assignments);
    console.log('🔍 DEBUG - assignmentsByLocation:', assignmentsByLocation);
    console.log('🏢 Total lugares para limpieza:', assignmentsByLocation.length);
    console.log('📄 Paginación limpieza:', {
      total: assignmentsByLocation.length,
      currentPage,
      totalPages,
      showing: paginatedLocations.length
    });

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
              {paginatedLocations.map(location => {
                // Mapeo exacto entre nombres de BD y nombres de archivos
                const imageMap = {
                  'Almacén Central del MINSA': 'Almacen Central MINSA.jpg',
                  'Casa de la Municipalidad': 'Casa de la Municipidad.jpg',
                  'Casa Góngora': 'Plaza Gongora.jpg',
                  'Centro de Recaudación Magna Corp.': 'Centro de Recaudacion Magna Corp..jpg',
                  'Complejo Turístico Mi Pueblito': 'Mi Pueblito.jpeg',
                  'Edificio Hatillo': 'Edificio Hatillo.jpeg',
                  'Mercado de Alcalde Díaz': 'Mercado Alcalde Diaz.jpeg',
                  'Mercado del Marisco': 'mercado de mariscos.jpg',
                  'Mercado de Pacora': 'Mercado de Pacora.jpg',
                  'Mercado San Felipe Neri': 'san felipe neri.jpeg',
                  'Mercado de Pueblo Nuevo': 'Mercado Pueblo Nuevo.jpg',
                  'Oficinas del Parque Summit': 'Oficina del Parque Summit.jpg',
                  'Palacio Municipal': 'Palacio Municipal.jpg',
                  'Planta de tratamiento (Mercado San Felipe Neri)': 'san felipe neri.jpeg',
                  'Taller': 'Taller.jpg'
                };

              const imageName = imageMap[location.nombre];
              const imageUrl = imageName ? `/lugares/${imageName}` : null;

              console.log('🖼️ Lugar:', location.nombre, '| Imagen:', imageName, '| URL:', imageUrl);

              return (
                <div
                  key={location.id}
                  className="location-map-card"
                  onClick={() => setSelectedLocation(location)}
                >
                  <div className="location-image-wrapper">
                    {imageUrl ? (
                      <>
                        <img
                          src={imageUrl}
                          alt={location.nombre}
                          className="location-image"
                          onError={(e) => {
                            console.error('Error cargando imagen:', imageUrl);
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                        <div className="location-image-fallback" style={{ display: 'none' }}>
                          <MapPin size={48} />
                          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
                            {location.nombre}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="location-image-fallback" style={{ display: 'flex' }}>
                        <MapPin size={48} />
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
            })}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="pagination-controls" style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
              marginTop: '24px',
              padding: '20px'
            }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  background: currentPage === 1 ? '#f3f4f6' : 'white',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: currentPage === 1 ? '#9ca3af' : '#374151',
                  transition: 'all 0.2s ease'
                }}
              >
                ← Anterior
              </button>

              <span style={{
                fontSize: '14px',
                color: '#6b7280',
                fontWeight: '500'
              }}>
                Página {currentPage} de {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  background: currentPage === totalPages ? '#f3f4f6' : 'white',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: currentPage === totalPages ? '#9ca3af' : '#374151',
                  transition: 'all 0.2s ease'
                }}
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
            getPhotoUrl={getPhotoUrl}
            getStatusVariant={getStatusVariant}
            modalType="limpieza"
          />
        )}
      </div>
    );
  };

  // Agrupar tareas de mantenimiento por lugar (Planta de Tratamiento San Felipe Neri)
  const maintenanceByLocation = useMemo(() => {
    // Agrupar tareas por lugar_id
    const locationMap = new Map();

    maintenanceTasks.forEach(task => {
      if (task.lugar_id && task.lugar) {
        const key = task.lugar_id;
        if (!locationMap.has(key)) {
          locationMap.set(key, {
            id: task.lugar.id,
            nombre: task.lugar.nombre,
            latitud: task.lugar.latitud,
            longitud: task.lugar.longitud,
            assignments: []
          });
        }

        // Convertir la tarea al formato esperado por LocationMapModal
        locationMap.get(key).assignments.push({
          id: task.id,
          fecha: task.scheduled_date,
          hora: task.scheduled_time,
          estado: task.status === 'completada' ? 'completado' : task.status === 'en_proceso' ? 'en_progreso' : 'pendiente',
          notas: task.observations,
          area: { nombre: task.type === 'preventivo' ? 'Mantenimiento Preventivo' : task.type === 'correctivo' ? 'Mantenimiento Correctivo' : 'Contingencia' },
          fotos: [
            ...(task.images_before || []).map((img, idx) => ({ id: `before-${idx}`, file_path: img, etapa: 'antes' })),
            ...(task.images_during || []).map((img, idx) => ({ id: `during-${idx}`, file_path: img, etapa: 'durante' })),
            ...(task.images_after || []).map((img, idx) => ({ id: `after-${idx}`, file_path: img, etapa: 'despues' }))
          ]
        });
      }
    });

    return Array.from(locationMap.values()).map(location => ({
      ...location,
      assignmentsCount: location.assignments.length,
      completedCount: location.assignments.filter(a => a.estado === 'completado').length
    }));
  }, [maintenanceTasks]);

  const renderMantenimiento = () => {
    return (
      <div className="reports-category reports-mantenimiento">
        <div className="category-header">
          <h3>Reportes de Mantenimiento - Planta de Tratamiento</h3>
          <p>Mercado San Felipe Neri</p>
        </div>

        {maintenanceLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Cargando reportes de mantenimiento...</p>
          </div>
        ) : maintenanceByLocation.length === 0 ? (
          <div className="empty-state">
            <Wrench size={48} />
            <p>No hay reportes de mantenimiento registrados</p>
          </div>
        ) : (
          <div className="locations-grid">
            {maintenanceByLocation.map(location => {
              const imageUrl = '/lugares/san felipe neri.jpeg';

              return (
                <div
                  key={location.id}
                  className="location-map-card"
                  onClick={() => setSelectedLocation(location)}
                >
                  <div className="location-image-wrapper">
                    <img
                      src={imageUrl}
                      alt={location.nombre}
                      className="location-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                    <div className="location-image-fallback" style={{ display: 'none' }}>
                      <Wrench size={48} />
                      <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
                        {location.nombre}
                      </p>
                    </div>
                  </div>
                  <div className="map-card-overlay">
                    <h4>{location.nombre}</h4>
                    <span className="report-badge">{location.assignmentsCount} reportes</span>
                  </div>
                </div>
              );
            })}
          </div>
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
            getPhotoUrl={getPhotoUrl}
            getStatusVariant={getStatusVariant}
            modalType="mantenimiento"
          />
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
            setSelectedRouteType(null);
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
    </div>
  );
};

export default ReportsComponent;
