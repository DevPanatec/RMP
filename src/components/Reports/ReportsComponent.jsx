import { useState, useMemo, useEffect, memo } from 'react';
import { useCleaning } from '../../context/CleaningContext';
import { useFumigation } from '../../context/FumigationContext';
import { useMaintenance } from '../../context/MaintenanceContext';
import { useReports } from '../../context/ReportsContext';
import { useAuth } from '../../context/AuthContext';
import { BarChart3, Truck, Bug, Sparkles, Wrench, MapPin, Download, Calendar } from '../Icons';
import ReportsDashboard from './ReportsDashboard';
import LocationReportsModal from './LocationReportsModal';
import RouteReportDetailModal from './RouteReportDetailModal';
import FumigationReportsPage from './FumigationReportsPage';
import { DEMO_LUGARES, DEMO_CLEANING_ASSIGNMENTS, mergeDemoData } from '../../utils/demoData';
import { useDemoMode } from '../../hooks/useDemoMode';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import './ReportsComponent.css';

pdfMake.vfs = pdfFonts.vfs;

const ReportsComponent = ({ preSelectedLocationId = null, onClearSelection = null }) => {
  const [activeCategory, setActiveCategory] = useState('dashboard');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedRouteReport, setSelectedRouteReport] = useState(null);
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

  // TODO: Implement with Convex File Storage
  const getPhotoUrl = (filePath) => {
    // Placeholder - Convex File Storage not implemented yet
    console.warn('Photo URLs disabled - needs Convex File Storage implementation');
    return null;
  };

  // Función para descargar reportes por módulo
  const handleModuleDownload = async (module) => {
    // Validar permisos
    if (user?.tipo === 'conductor') {
      alert('No tiene permisos para descargar reportes');
      return;
    }

    const dateRange = moduleDateRanges[module];

    // Validar rango de fechas
    if (dateRange.desde > dateRange.hasta) {
      alert('La fecha "Desde" debe ser anterior a la fecha "Hasta"');
      return;
    }

    setModuleDownloading(module);

    try {
      const content = [];
      const desde = new Date(dateRange.desde);
      const hasta = new Date(dateRange.hasta);

      // Header
      const moduleNames = {
        recoleccion: 'RECOLECCIÓN',
        fumigacion: 'FUMIGACIÓN',
        limpieza: 'LIMPIEZA',
        mantenimiento: 'MANTENIMIENTO'
      };

      content.push({
        text: `REPORTES DE ${moduleNames[module]} - RMP`,
        style: 'header',
        alignment: 'center',
        margin: [0, 0, 0, 10]
      });

      content.push({
        columns: [
          { text: `Periodo: ${desde.toLocaleDateString('es-ES')} - ${hasta.toLocaleDateString('es-ES')}`, width: '*' },
          { text: `Generado: ${new Date().toLocaleString('es-ES')}`, width: 'auto', alignment: 'right' }
        ],
        margin: [0, 0, 0, 20]
      });

      content.push({
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }],
        margin: [0, 0, 0, 20]
      });

      // Generar contenido según el módulo
      if (module === 'recoleccion') {
        const filtered = reportsData.filter(r => {
          const rDate = new Date(r.fecha_completacion);
          return rDate >= desde && rDate <= hasta;
        });

        content.push({ text: `Total de reportes: ${filtered.length}`, margin: [0, 0, 0, 15], bold: true });

        if (filtered.length > 0) {
          filtered.forEach((report, idx) => {
            content.push({
              text: `${idx + 1}. ${report.ruta_nombre || 'Ruta'}`,
              style: 'reportTitle',
              margin: [0, 10, 0, 5]
            });
            content.push({ text: `Fecha: ${new Date(report.fecha_completacion).toLocaleDateString('es-ES')}`, margin: [10, 0, 0, 2], fontSize: 10 });
            content.push({ text: `Conductor: ${report.conductor_nombre}`, margin: [10, 0, 0, 2], fontSize: 10 });
            content.push({ text: `Vehículo: ${report.vehiculo_placa}`, margin: [10, 0, 0, 2], fontSize: 10 });
            content.push({ text: `Paradas completadas: ${report.paradas_completadas?.length || 0}`, margin: [10, 0, 0, 5], fontSize: 10 });
          });
        } else {
          content.push({ text: 'No hay reportes en el periodo seleccionado', italics: true, color: '#999', margin: [0, 10, 0, 0] });
        }
      } else if (module === 'fumigacion' && fumigationAssignments) {
        const filtered = fumigationAssignments.filter(f => {
          const fDate = new Date(f.fecha);
          return fDate >= desde && fDate <= hasta;
        });

        content.push({ text: `Total de reportes: ${filtered.length}`, margin: [0, 0, 0, 15], bold: true });

        if (filtered.length > 0) {
          filtered.forEach((fumigation, idx) => {
            const tipo = fumigation.tipo_fumigacion === 'interna' ? 'Interna' : 'Externa';
            content.push({
              text: `${idx + 1}. Fumigación ${tipo} - ${fumigation.lugar_nombre}`,
              style: 'reportTitle',
              margin: [0, 10, 0, 5]
            });
            content.push({ text: `Fecha: ${new Date(fumigation.fecha).toLocaleDateString('es-ES')}`, margin: [10, 0, 0, 2], fontSize: 10 });
            content.push({ text: `Horario: ${fumigation.horario_inicio} - ${fumigation.horario_fin}`, margin: [10, 0, 0, 2], fontSize: 10 });
            if (fumigation.observaciones) {
              content.push({ text: `Observaciones: ${fumigation.observaciones}`, margin: [10, 0, 0, 5], fontSize: 10 });
            }
          });
        } else {
          content.push({ text: 'No hay reportes en el periodo seleccionado', italics: true, color: '#999', margin: [0, 10, 0, 0] });
        }
      } else if (module === 'limpieza' && assignments) {
        const filtered = assignments.filter(a => {
          const aDate = new Date(a.fecha);
          return aDate >= desde && aDate <= hasta;
        });

        content.push({ text: `Total de reportes: ${filtered.length}`, margin: [0, 0, 0, 15], bold: true });

        if (filtered.length > 0) {
          filtered.forEach((cleaning, idx) => {
            content.push({
              text: `${idx + 1}. ${cleaning.lugar?.nombre || 'Lugar'} - ${cleaning.area?.nombre || 'Área'}`,
              style: 'reportTitle',
              margin: [0, 10, 0, 5]
            });
            content.push({ text: `Fecha: ${new Date(cleaning.fecha).toLocaleDateString('es-ES')}`, margin: [10, 0, 0, 2], fontSize: 10 });
            content.push({ text: `Hora: ${cleaning.hora}`, margin: [10, 0, 0, 2], fontSize: 10 });
            content.push({ text: `Estado: ${cleaning.estado}`, margin: [10, 0, 0, 5], fontSize: 10 });
          });
        } else {
          content.push({ text: 'No hay reportes en el periodo seleccionado', italics: true, color: '#999', margin: [0, 10, 0, 0] });
        }
      } else if (module === 'mantenimiento' && maintenanceTasks) {
        const filtered = maintenanceTasks.filter(t => {
          const tDate = new Date(t.scheduled_date);
          return tDate >= desde && tDate <= hasta;
        });

        content.push({ text: `Total de reportes: ${filtered.length}`, margin: [0, 0, 0, 15], bold: true });

        if (filtered.length > 0) {
          filtered.forEach((task, idx) => {
            content.push({
              text: `${idx + 1}. Mantenimiento ${task.type}`,
              style: 'reportTitle',
              margin: [0, 10, 0, 5]
            });
            content.push({ text: `Fecha programada: ${new Date(task.scheduled_date).toLocaleDateString('es-ES')}`, margin: [10, 0, 0, 2], fontSize: 10 });
            content.push({ text: `Hora: ${task.scheduled_time || 'No especificada'}`, margin: [10, 0, 0, 2], fontSize: 10 });
            content.push({ text: `Estado: ${task.status}`, margin: [10, 0, 0, 2], fontSize: 10 });
            if (task.observations) {
              content.push({ text: `Observaciones: ${task.observations}`, margin: [10, 0, 0, 5], fontSize: 10 });
            }
          });
        } else {
          content.push({ text: 'No hay reportes en el periodo seleccionado', italics: true, color: '#999', margin: [0, 10, 0, 0] });
        }
      }

      // Generar PDF
      const docDefinition = {
        content,
        footer: (currentPage, pageCount) => ({
          text: `Página ${currentPage} de ${pageCount} | RMP - ${moduleNames[module]}`,
          alignment: 'center',
          fontSize: 8,
          italics: true,
          margin: [0, 10, 0, 0]
        }),
        styles: {
          header: {
            fontSize: 18,
            bold: true
          },
          reportTitle: {
            fontSize: 12,
            bold: true,
            color: '#3D5229'
          }
        },
        defaultStyle: {
          fontSize: 11
        }
      };

      const fileName = `${moduleNames[module]}_${desde.toISOString().split('T')[0]}_${hasta.toISOString().split('T')[0]}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);

      console.log(`✅ PDF de ${module} generado exitosamente:`, fileName);
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

  // Filtrar lugares para recolección - solo mercados y Mi Pueblito
  const recoleccionLocations = useMemo(() => {
    const recoleccionPlaces = displayLugares.filter(lugar =>
      (lugar.nombre.includes('Mercado') || lugar.nombre.includes('Complejo')) &&
      !lugar.nombre.includes('Planta de tratamiento') &&
      lugar.activo !== false
    );
    console.log('🏢 Total lugares de recolección:', recoleccionPlaces.length);
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

  // ⚡ Component para tarjeta con imagen estática de mapa (carga rápida)
  const MapCard = memo(({ location, icon: Icon }) => {
    // Mapeo de lugares a imágenes de mapa estático
    const mapImageMap = {
      'Complejo Turístico Mi Pueblito': 'mi-pueblito-map.png',
      'Mercado de Alcalde Díaz': 'alcalde-diaz-map.png',
      'Mercado de Pacora': 'pacora-map.png',
      'Mercado de Pueblo Nuevo': 'pueblo-nuevo-map.png',
      'Mercado del Marisco': 'marisco-map.png',
      'Mercado San Felipe Neri': 'san-felipe-map.png'
    };

    const mapImage = mapImageMap[location.nombre];
    const imageUrl = mapImage ? `/mapas/${mapImage}` : null;

    return (
      <div
        className="location-map-card"
        onClick={() => setSelectedLocation(location)}
        style={{ cursor: 'pointer' }}
      >
        <div className="location-image-wrapper">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`Mapa de ${location.nombre}`}
              className="location-image"
              loading="lazy"
              onError={(e) => {
                console.error('Error cargando imagen de mapa:', imageUrl);
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className="location-image-fallback" style={{ display: imageUrl ? 'none' : 'flex' }}>
            <Icon size={48} />
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
  });

  const renderRecoleccion = () => {
    // Paginación
    const totalPages = Math.ceil(recoleccionLocations.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedLocations = recoleccionLocations.slice(startIndex, endIndex);


    return (
      <div className="reports-category reports-recoleccion">
        <div className="category-header">
          <h3>Reportes de Recolección por Ubicación</h3>
          <p>Selecciona un lugar para ver sus reportes de recolección ({recoleccionLocations.length} lugares)</p>
        </div>

        {/* 📊 Reportes de Recolección Completados */}
        {routeReports.length > 0 && (
          <div className="route-reports-section">
            <h3 className="route-reports-header">
              📋 Reportes Completados ({routeReports.length})
            </h3>
            <div className="route-reports-grid">
              {routeReports.map((report, idx) => (
                <div
                  key={idx}
                  className="route-report-card"
                  onClick={() => {
                    console.log('📊 Abriendo reporte:', report.ruta_nombre);
                    setSelectedRouteReport(report);
                  }}
                >
                  <div className="route-report-card-header">
                    <h4 className="route-report-card-title">{report.ruta_nombre}</h4>
                    <span className="route-report-badge">
                      ✓ Completada
                    </span>
                  </div>
                  <div className="route-report-meta">
                    <span className="route-report-meta-item">
                      👤 {report.conductor_nombre}
                    </span>
                    <span className="route-report-meta-item">
                      🚛 {report.vehiculo_placa}
                    </span>
                    <span className="route-report-meta-item">
                      📦 {report.paradas_completadas?.length || 0} paradas
                    </span>
                    <span className="route-report-meta-item">
                      📅 {new Date(report.fecha_completacion).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  <p className="route-report-hint">
                    Click para ver detalles completos y mapa de ruta
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

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
              {paginatedLocations.map(location => (
                <MapCard key={location.id} location={location} icon={Truck} />
              ))}
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
          <div className="category-header-content">
            <h3>🦟 Reportes de Fumigación</h3>
            <p>Visualiza fumigaciones internas (mensuales) y externas (semanales) por ubicación</p>
          </div>
          <div className="category-stats">
            <div className="stat-badge">
              <span className="stat-value">{fumigationAssignments.length}</span>
              <span className="stat-label">Total Fumigaciones</span>
            </div>
            <div className="stat-badge stat-badge--success">
              <span className="stat-value">{fumigationAssignments.filter(f => f.estado === 'reportada').length}</span>
              <span className="stat-label">Reportadas</span>
            </div>
            <div className="stat-badge stat-badge--warning">
              <span className="stat-value">{fumigationLugares.length}</span>
              <span className="stat-label">Lugares</span>
            </div>
          </div>
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
              {paginatedLocations.map(location => {
                // Mapeo de imágenes para lugares
                const imageMap = {
                  'Mercado de Mariscos': 'mercado de mariscos.jpg',
                  'Mercado San Felipe Neri': 'san felipe neri.jpeg',
                  'Mercado de Alcalde Díaz': 'Mercado Alcalde Diaz.jpeg',
                  'Mercado de Pueblo Nuevo': 'Mercado Pueblo Nuevo.jpg',
                  'Mercado de Pacora': 'Mercado de Pacora.jpg',
                  'Complejo Turístico Mi Pueblito': 'Mi Pueblito.jpeg'
                };

                const imageName = imageMap[location.nombre];
                const imageUrl = imageName ? `/lugares/${imageName}` : null;

                return (
                  <div
                    key={location.id}
                    className="location-map-card"
                    onClick={() => setSelectedLocation(location)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="location-image-wrapper">
                      {imageUrl ? (
                        <>
                          <img
                            src={imageUrl}
                            alt={location.nombre}
                            className="location-image"
                            loading="eager"
                            decoding="async"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'flex';
                            }}
                          />
                          <div className="location-image-fallback" style={{ display: 'none' }}>
                            <Bug size={48} />
                            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
                              {location.nombre}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="location-image-fallback" style={{ display: 'flex' }}>
                          <Bug size={48} />
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
                  style={{ cursor: 'pointer' }}
                >
                  <div className="location-image-wrapper">
                    {imageUrl ? (
                      <>
                        <img
                          src={imageUrl}
                          alt={location.nombre}
                          className="location-image"
                          loading="eager"
                          decoding="async"
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
    // Buscar San Felipe Neri en los lugares disponibles
    const sanFelipeNeri = displayLugares.find(l =>
      l.nombre === 'Mercado San Felipe Neri' ||
      l.nombre === 'Planta de tratamiento (Mercado San Felipe Neri)'
    );

    // Si no hay tareas pero existe el lugar, mostrar la ubicación sin tareas
    if (maintenanceTasks.length === 0) {
      if (sanFelipeNeri) {
        return [{
          id: sanFelipeNeri.id,
          nombre: sanFelipeNeri.nombre,
          latitud: sanFelipeNeri.latitud,
          longitud: sanFelipeNeri.longitud,
          assignments: [],
          assignmentsCount: 0,
          completedCount: 0
        }];
      }
      // Si no existe el lugar, crear uno por defecto
      return [{
        id: 'san-felipe-default',
        nombre: 'Planta de tratamiento (Mercado San Felipe Neri)',
        latitud: null,
        longitud: null,
        assignments: [],
        assignmentsCount: 0,
        completedCount: 0
      }];
    }

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
  }, [maintenanceTasks, displayLugares]);

  const renderMantenimiento = () => {
    console.log('🔧 DEBUG Mantenimiento:', {
      maintenanceLoading,
      maintenanceTasks: maintenanceTasks.length,
      maintenanceByLocation: maintenanceByLocation.length,
      locations: maintenanceByLocation
    });

    return (
      <div className="reports-category reports-mantenimiento">
        <div className="category-header">
          <h3>Reportes de Mantenimiento - Planta de Tratamiento</h3>
          <p>Mercado San Felipe Neri ({maintenanceByLocation.length} ubicaciones)</p>
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
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
              Debug: {maintenanceTasks.length} tareas encontradas
            </p>
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
                  style={{ cursor: 'pointer' }}
                >
                  <div className="location-image-wrapper">
                    <img
                      src={imageUrl}
                      alt={location.nombre}
                      className="location-image"
                      loading="eager"
                      decoding="async"
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

      {/* Modal de detalle de reporte de ruta */}
      {selectedRouteReport && (
        <RouteReportDetailModal
          report={selectedRouteReport}
          onClose={() => setSelectedRouteReport(null)}
        />
      )}
    </div>
  );
};

export default ReportsComponent;
