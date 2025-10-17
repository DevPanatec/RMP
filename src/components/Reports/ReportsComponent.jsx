import { useState, useMemo } from 'react';
import { useSupabaseRoutes } from '../../context/SupabaseRoutesContext';
import { useSupabaseCleaning } from '../../context/SupabaseCleaningContext';
import { useSupabaseMaintenance } from '../../context/SupabaseMaintenanceContext';
import { BarChart3, Truck, Zap, Sparkles, Wrench, ChevronRight, MapPin, Calendar, Camera } from '../Icons';
import { Card, Badge } from '../UI';
import ReportsDashboard from './ReportsDashboard';
import RouteHistory from './RouteHistory';
import LocationReportsModal from './LocationReportsModal';
import './ReportsComponent.css';

const ReportsComponent = ({ userType = 'admin' }) => {
  const [activeCategory, setActiveCategory] = useState('dashboard');
  const [selectedRouteType, setSelectedRouteType] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const { routes } = useSupabaseRoutes();
  const { assignments, loading: cleaningLoading, lugares } = useSupabaseCleaning();
  const { tasks: maintenanceTasks, loading: maintenanceLoading } = useSupabaseMaintenance();

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
    const recoleccionPlaces = lugares.filter(lugar =>
      lugar.nombre.includes('Mercado') || lugar.nombre.includes('Complejo')
    ).filter(lugar =>
      !lugar.nombre.includes('Planta de tratamiento')
    );

    return recoleccionPlaces.map(lugar => ({
      ...lugar,
      assignmentsCount: 0, // Por ahora, se puede conectar con historial de rutas después
      completedCount: 0,
      assignments: [] // Aquí irían los reportes de recolección
    }));
  }, [lugares]);

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
                    <span className="report-badge">Próximamente</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedLocation && (
          <LocationReportsModal
            location={selectedLocation}
            onClose={() => setSelectedLocation(null)}
            getPhotoUrl={getPhotoUrl}
            getStatusVariant={getStatusVariant}
          />
        )}
      </div>
    );
  };

  // Filtrar lugares para fumigación (mismos que recolección)
  const fumigacionLocations = useMemo(() => {
    const fumigacionPlaces = lugares.filter(lugar =>
      lugar.nombre.includes('Mercado') || lugar.nombre.includes('Complejo')
    ).filter(lugar =>
      !lugar.nombre.includes('Planta de tratamiento')
    );

    return fumigacionPlaces.map(lugar => ({
      ...lugar,
      assignmentsCount: 0, // Por ahora, se puede conectar con historial de fumigaciones después
      completedCount: 0,
      assignments: [] // Aquí irían los reportes de fumigación
    }));
  }, [lugares]);

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
                    <span className="report-badge">Próximamente</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedLocation && (
          <LocationReportsModal
            location={selectedLocation}
            onClose={() => setSelectedLocation(null)}
            getPhotoUrl={getPhotoUrl}
            getStatusVariant={getStatusVariant}
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
            onClose={() => setSelectedLocation(null)}
            getPhotoUrl={getPhotoUrl}
            getStatusVariant={getStatusVariant}
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
            onClose={() => setSelectedLocation(null)}
            getPhotoUrl={getPhotoUrl}
            getStatusVariant={getStatusVariant}
          />
        )}
      </div>
    );
  };

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'dashboard':
        return <ReportsDashboard onNavigate={setActiveCategory} />;
      case 'recoleccion':
        return renderRecoleccion();
      case 'fumigacion':
        return renderFumigacion();
      case 'limpieza':
        return renderLimpieza();
      case 'mantenimiento':
        return renderMantenimiento();
      default:
        return <ReportsDashboard onNavigate={setActiveCategory} />;
    }
  };

  return (
    <div className="reports-container-new">
      <div className="reports-header-new">
        <div className="reports-title-section">
          <h2>Reportes del Sistema</h2>
          <p>Vista integral de todas las operaciones</p>
        </div>
        
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
      </div>

      <div className="reports-content-new">
        {renderCategoryContent()}
      </div>
    </div>
  );
};

export default ReportsComponent;
