import { useState, useMemo, useEffect } from 'react';
import { useSupabaseRoutes } from '../../context/SupabaseRoutesContext';
import { useSupabaseCleaning } from '../../context/SupabaseCleaningContext';
import { useSupabaseMaintenance } from '../../context/SupabaseMaintenanceContext';
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

  const { routes } = useSupabaseRoutes();
  const { assignments, loading: cleaningLoading, lugares } = useSupabaseCleaning();
  const { tasks: maintenanceTasks, loading: maintenanceLoading } = useSupabaseMaintenance();

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

  // Filtrar lugares para recolección
  const recoleccionLocations = useMemo(() => {
    const recoleccionPlaces = displayLugares.filter(lugar =>
      lugar.nombre.includes('Mercado') || lugar.nombre.includes('Complejo')
    ).filter(lugar =>
      !lugar.nombre.includes('Planta de tratamiento')
    );

    return recoleccionPlaces.map(lugar => {
      const lugarAssignments = displayAssignments.filter(a => {
        const matchLocation = a.lugar?.id === lugar.id || a.lugar_id === lugar.id;
        const matchType = a.tipo === 'recoleccion' || a.tipoServicio === 'recoleccion';
        return matchLocation && matchType;
      });

      return {
        ...lugar,
        assignmentsCount: lugarAssignments.length,
        completedCount: lugarAssignments.filter(a => a.estado === 'completado').length,
        assignments: lugarAssignments
      };
    });
  }, [displayLugares, displayAssignments]);

  const renderRecoleccion = () => {
    return (
      <div className="reports-category reports-recoleccion">
        <div className="category-header">
          <h3>Reportes de Recolección por Ubicación</h3>
          <p>Selecciona un mercado para ver sus reportes de recolección</p>
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
          <div className="locations-grid">
            {recoleccionLocations.map(location => {
              const imageMap = {
                'Mercado de Alcalde Díaz': 'Mercado Alcalde Diaz.jpeg',
                'Mercado del Marisco': 'mercado de mariscos.jpg',
                'Mercado de Pacora': 'Mercado de Pacora.jpg',
                'Mercado San Felipe Neri': 'san felipe neri.jpeg',
                'Mercado de Pueblo Nuevo': 'Mercado Pueblo Nuevo.jpg',
                'Complejo Turístico Mi Pueblito': 'mi-pueblito.jpg'
              };

              const mapEmbedUrl = location.latitud && location.longitud
                ? `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(location.nombre)}&zoom=15`
                : null;

              return (
                <div
                  key={location.id}
                  className="location-map-card"
                  onClick={() => setSelectedLocation(location)}
                >
                  <div className="location-image-wrapper">
                    {mapEmbedUrl ? (
                      <iframe
                        src={mapEmbedUrl}
                        width="100%"
                        height="100%"
                        style={{ border: 0, pointerEvents: 'none' }}
                        allowFullScreen=""
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title={`Mapa de ${location.nombre}`}
                      />
                    ) : (
                      <div className="location-image-fallback" style={{ display: 'flex' }}>
                        <Truck size={48} />
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

              const mapEmbedUrl = location.latitud && location.longitud
                ? `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(location.nombre)}&zoom=15`
                : null;

              return (
                <div
                  key={location.id}
                  className="location-map-card"
                  onClick={() => setSelectedLocation(location)}
                >
                  <div className="location-image-wrapper">
                    {mapEmbedUrl ? (
                      <iframe
                        src={mapEmbedUrl}
                        width="100%"
                        height="100%"
                        style={{ border: 0, pointerEvents: 'none' }}
                        allowFullScreen=""
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title={`Mapa de ${location.nombre}`}
                      />
                    ) : (
                      <div className="location-image-fallback" style={{ display: 'flex' }}>
                        <Zap size={48} />
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
    return lugares.map(lugar => {
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
    }).filter(l => l.assignmentsCount > 0);
  }, [lugares, assignments]);

  const renderLimpieza = () => {
    console.log('🔍 DEBUG - lugares:', lugares);
    console.log('🔍 DEBUG - assignments:', assignments);
    console.log('🔍 DEBUG - assignmentsByLocation:', assignmentsByLocation);

    return (
      <div className="reports-category reports-limpieza">
        <div className="category-header">
          <h3>Reportes de Limpieza por Ubicación</h3>
          <p>Selecciona una ubicación para ver sus reportes detallados</p>
        </div>

        {cleaningLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Cargando reportes de limpieza...</p>
          </div>
        ) : assignmentsByLocation.length === 0 ? (
          <div className="empty-state">
            <Sparkles size={48} />
            <p>No hay asignaciones de limpieza registradas</p>
          </div>
        ) : (
          <div className="locations-grid limpieza-grid-3col">
            {assignmentsByLocation.map(location => {
              const imageMap = {
                'Mercado de Alcalde Díaz': 'Mercado Alcalde Diaz.jpeg',
                'Mercado de Alcalde Diaz': 'Mercado Alcalde Diaz.jpeg',
                'Mercado del Marisco': 'mercado de mariscos.jpg',
                'Mercado de Pacora': 'Mercado de Pacora.jpg',
                'Mercado San Felipe Neri': 'san felipe neri.jpeg',
                'Mercado de Pueblo Nuevo': 'Mercado Pueblo Nuevo.jpg'
              };

              const imageName = imageMap[location.nombre] || `${location.nombre}.jpg`;
              const imageUrl = `/lugares/${imageName}`;

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
                      <MapPin size={48} />
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
