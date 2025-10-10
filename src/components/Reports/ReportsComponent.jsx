import { useState } from 'react';
import { useSupabaseRoutes } from '../../context/SupabaseRoutesContext';
import { useSupabaseCleaning } from '../../context/SupabaseCleaningContext';
import { BarChart3, Truck, Zap, Sparkles, ChevronRight, MapPin, Calendar, Camera } from '../Icons';
import { Card, Badge } from '../UI';
import ReportsDashboard from './ReportsDashboard';
import RouteHistory from './RouteHistory';
import './ReportsComponent.css';

const ReportsComponent = ({ userType = 'admin' }) => {
  const [activeCategory, setActiveCategory] = useState('dashboard');
  const [selectedRouteType, setSelectedRouteType] = useState(null);
  
  const { routes } = useSupabaseRoutes();
  const { assignments, loading: cleaningLoading } = useSupabaseCleaning();

  const rutasRecoleccion = routes.filter(r => r.type === 'recoleccion' || r.tipoServicio === 'recoleccion');
  const rutasFumigacion = routes.filter(r => r.type === 'fumigacion' || r.tipoServicio === 'fumigacion');

  const categories = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'recoleccion', label: 'Recolección', icon: Truck },
    { id: 'fumigacion', label: 'Fumigación', icon: Zap },
    { id: 'limpieza', label: 'Limpieza', icon: Sparkles }
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

  const renderRecoleccion = () => {
    if (selectedRouteType === 'recoleccion') {
      return (
        <RouteHistory 
          routeType="recoleccion"
          onBack={() => setSelectedRouteType(null)}
        />
      );
    }

    return (
      <div className="reports-category">
        <div className="category-header">
          <h3>Rutas de Recolección</h3>
          <p>Selecciona una ruta para ver su historial completo</p>
        </div>

        <div className="routes-grid">
          {rutasRecoleccion.length === 0 ? (
            <div className="empty-state">
              <Truck size={48} />
              <p>No hay rutas de recolección configuradas</p>
            </div>
          ) : (
            rutasRecoleccion.map(ruta => (
              <Card 
                key={ruta.id} 
                className="route-card"
                hoverable
                onClick={() => setSelectedRouteType('recoleccion')}
              >
                <div className="route-card-content">
                  <div className="route-card-header">
                    <MapPin size={24} strokeWidth={1.5} />
                    <h4>{ruta.nombre || ruta.name}</h4>
                  </div>
                  <div className="route-card-stats">
                    <span className="route-stat">
                      {ruta.paradas?.length || 0} paradas
                    </span>
                    <span className={`route-status route-status--${ruta.estado}`}>
                      {ruta.estado}
                    </span>
                  </div>
                  <div className="route-card-action">
                    <span>Ver historial</span>
                    <ChevronRight size={16} />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderFumigacion = () => {
    if (selectedRouteType === 'fumigacion') {
      return (
        <RouteHistory 
          routeType="fumigacion"
          onBack={() => setSelectedRouteType(null)}
        />
      );
    }

    return (
      <div className="reports-category">
        <div className="category-header">
          <h3>Rutas de Fumigación</h3>
          <p>Selecciona una ruta para ver su historial completo</p>
        </div>

        <div className="routes-grid">
          {rutasFumigacion.length === 0 ? (
            <div className="empty-state">
              <Zap size={48} />
              <p>No hay rutas de fumigación configuradas</p>
            </div>
          ) : (
            rutasFumigacion.map(ruta => (
              <Card 
                key={ruta.id} 
                className="route-card"
                hoverable
                onClick={() => setSelectedRouteType('fumigacion')}
              >
                <div className="route-card-content">
                  <div className="route-card-header">
                    <Zap size={24} strokeWidth={1.5} />
                    <h4>{ruta.nombre || ruta.name}</h4>
                  </div>
                  <div className="route-card-stats">
                    <span className="route-stat">
                      {ruta.paradas?.length || 0} paradas
                    </span>
                    <span className={`route-status route-status--${ruta.estado}`}>
                      {ruta.estado}
                    </span>
                  </div>
                  <div className="route-card-action">
                    <span>Ver historial</span>
                    <ChevronRight size={16} />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderLimpieza = () => {
    return (
      <div className="reports-category reports-limpieza">
        <div className="category-header">
          <h3>Reportes de Limpieza</h3>
          <p>Asignaciones completadas con evidencias fotográficas</p>
        </div>

        {cleaningLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Cargando reportes de limpieza...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="empty-state">
            <Sparkles size={48} />
            <p>No hay asignaciones de limpieza registradas</p>
          </div>
        ) : (
          <div className="limpieza-reports">
            {assignments.map(assignment => (
              <Card key={assignment.id} className="assignment-report-card">
                <div className="assignment-header">
                  <div className="assignment-info">
                    <h4>{assignment.sala?.nombre} - {assignment.area?.nombre}</h4>
                    <span className="assignment-date">
                      <Calendar size={14} />
                      {assignment.fecha} - {assignment.hora}
                    </span>
                  </div>
                  <Badge 
                    variant={getStatusVariant(assignment.estado)}
                    text={assignment.estado}
                  />
                </div>

                {assignment.fotos && assignment.fotos.length > 0 && (
                  <div className="assignment-photos">
                    <h5>
                      <Camera size={16} />
                      Evidencias Fotográficas ({assignment.fotos.length})
                    </h5>
                    <div className="photos-grid">
                      {assignment.fotos.map(foto => (
                        <div key={foto.id} className="photo-item">
                          <img 
                            src={getPhotoUrl(foto.file_path)} 
                            alt={foto.etapa}
                          />
                          <span className="photo-label">{foto.etapa}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {assignment.notas && (
                  <div className="assignment-notes">
                    <strong>Notas:</strong> {assignment.notas}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'dashboard':
        return <ReportsDashboard />;
      case 'recoleccion':
        return renderRecoleccion();
      case 'fumigacion':
        return renderFumigacion();
      case 'limpieza':
        return renderLimpieza();
      default:
        return <ReportsDashboard />;
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
