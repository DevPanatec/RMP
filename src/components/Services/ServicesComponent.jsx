import { useState, useEffect } from 'react';
import './ServicesComponent.css';

const ServicesComponent = ({ userType = 'admin' }) => {
  const [activeServiceTab, setActiveServiceTab] = useState('overview');
  const [services, setServices] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [serviceSchedules, setServiceSchedules] = useState([]);
  const [serviceTeams, setServiceTeams] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  useEffect(() => {
    loadServicesData();
  }, []);

  const loadServicesData = () => {
    setIsLoading(true);
    
    setTimeout(() => {
      // Tipos de servicios
      const typesData = [
        {
          id: 'limpieza',
          nombre: 'Limpieza General',
          descripcion: 'Limpieza de espacios públicos y privados',
          color: '#3b82f6',
          icon: '🧹',
          serviciosIncluidos: [
            'Barrido de calles',
            'Limpieza de aceras',
            'Mantenimiento de parques',
            'Limpieza de edificios públicos'
          ]
        },
        {
          id: 'aseo',
          nombre: 'Aseo Urbano',
          descripcion: 'Mantenimiento de limpieza urbana',
          color: '#10b981',
          icon: '🏢',
          serviciosIncluidos: [
            'Limpieza de plazas',
            'Mantenimiento de mobiliario urbano',
            'Limpieza de paradas de autobús',
            'Aseo de mercados'
          ]
        },
        {
          id: 'desinfeccion',
          nombre: 'Desinfección',
          descripcion: 'Desinfección preventiva y correctiva',
          color: '#f59e0b',
          icon: '🧴',
          serviciosIncluidos: [
            'Desinfección de espacios públicos',
            'Tratamiento sanitario',
            'Desinfección de vehículos',
            'Protocolos COVID-19'
          ]
        },
        {
          id: 'fumigacion',
          nombre: 'Fumigación',
          descripcion: 'Control de plagas y fumigación',
          color: '#ef4444',
          icon: '🦟',
          serviciosIncluidos: [
            'Control de roedores',
            'Fumigación de insectos',
            'Tratamiento de plagas',
            'Prevención sanitaria'
          ]
        }
      ];

      // Servicios activos
      const servicesData = [
        {
          id: 'SERV001',
          tipo: 'limpieza',
          nombre: 'Limpieza Centro Histórico',
          ubicacion: 'Casco Viejo, Panamá',
          estado: 'En Proceso',
          prioridad: 'Alta',
          fechaInicio: '2024-01-28',
          fechaFin: '2024-01-30',
          equipoAsignado: 'Equipo A',
          supervisor: 'Carlos Méndez',
          progreso: 65,
          observaciones: 'Limpieza profunda para evento turístico',
          coordenadas: { lat: 8.9536, lng: -79.5356 }
        },
        {
          id: 'SERV002',
          tipo: 'desinfeccion',
          nombre: 'Desinfección Hospital Nacional',
          ubicacion: 'Av. Cuba, Panamá',
          estado: 'Programado',
          prioridad: 'Crítica',
          fechaInicio: '2024-01-29',
          fechaFin: '2024-01-29',
          equipoAsignado: 'Equipo B',
          supervisor: 'María García',
          progreso: 0,
          observaciones: 'Protocolo especial área médica',
          coordenadas: { lat: 8.9670, lng: -79.5335 }
        },
        {
          id: 'SERV003',
          tipo: 'fumigacion',
          nombre: 'Control Plagas Mercado Central',
          ubicacion: 'Mercado Central, Panamá',
          estado: 'Completado',
          prioridad: 'Media',
          fechaInicio: '2024-01-25',
          fechaFin: '2024-01-26',
          equipoAsignado: 'Equipo C',
          supervisor: 'Roberto Vásquez',
          progreso: 100,
          observaciones: 'Fumigación mensual rutinaria',
          coordenadas: { lat: 8.9548, lng: -79.5381 }
        },
        {
          id: 'SERV004',
          tipo: 'aseo',
          nombre: 'Aseo Parque Recreativo',
          ubicacion: 'Parque Recreativo Omar, Panamá',
          estado: 'En Proceso',
          prioridad: 'Media',
          fechaInicio: '2024-01-27',
          fechaFin: '2024-01-28',
          equipoAsignado: 'Equipo D',
          supervisor: 'Ana López',
          progreso: 45,
          observaciones: 'Mantenimiento semanal',
          coordenadas: { lat: 8.9822, lng: -79.5199 }
        }
      ];

      // Equipos de trabajo
      const teamsData = [
        {
          id: 'TEAM-A',
          nombre: 'Equipo A - Limpieza',
          especialidad: 'limpieza',
          supervisor: 'Carlos Méndez',
          miembros: [
            { nombre: 'Luis Rodríguez', cargo: 'Operario Senior' },
            { nombre: 'José Martínez', cargo: 'Operario' },
            { nombre: 'Pedro Sánchez', cargo: 'Asistente' }
          ],
          equipamiento: [
            'Aspiradoras industriales',
            'Pulidoras',
            'Productos de limpieza'
          ],
          estado: 'Activo',
          serviciosActivos: 1,
          calificacion: 4.8
        },
        {
          id: 'TEAM-B',
          nombre: 'Equipo B - Desinfección',
          especialidad: 'desinfeccion',
          supervisor: 'María García',
          miembros: [
            { nombre: 'Ana Ruiz', cargo: 'Técnico Especialista' },
            { nombre: 'Carlos Vega', cargo: 'Operario' },
            { nombre: 'Sandra López', cargo: 'Asistente' }
          ],
          equipamiento: [
            'Fumigadoras',
            'Desinfectantes',
            'EPP especializado'
          ],
          estado: 'Activo',
          serviciosActivos: 1,
          calificacion: 4.9
        },
        {
          id: 'TEAM-C',
          nombre: 'Equipo C - Fumigación',
          especialidad: 'fumigacion',
          supervisor: 'Roberto Vásquez',
          miembros: [
            { nombre: 'Miguel Torres', cargo: 'Fumigador Certificado' },
            { nombre: 'Laura Díaz', cargo: 'Técnico' },
            { nombre: 'Fernando Gil', cargo: 'Operario' }
          ],
          equipamiento: [
            'Equipos de fumigación',
            'Productos químicos',
            'Detectores de plagas'
          ],
          estado: 'Disponible',
          serviciosActivos: 0,
          calificacion: 4.7
        },
        {
          id: 'TEAM-D',
          nombre: 'Equipo D - Aseo Urbano',
          especialidad: 'aseo',
          supervisor: 'Ana López',
          miembros: [
            { nombre: 'Diego Morales', cargo: 'Operario Senior' },
            { nombre: 'Carmen Jiménez', cargo: 'Operario' },
            { nombre: 'Raul Herrera', cargo: 'Asistente' }
          ],
          equipamiento: [
            'Herramientas de limpieza',
            'Vehículos de apoyo',
            'Contenedores móviles'
          ],
          estado: 'Activo',
          serviciosActivos: 1,
          calificacion: 4.6
        }
      ];

      // Solicitudes de servicio
      const requestsData = [
        {
          id: 'REQ001',
          tipo: 'limpieza',
          titulo: 'Limpieza urgente Plaza Catedral',
          descripcion: 'Limpieza necesaria por evento especial',
          solicitante: 'Municipio de Panamá',
          telefono: '+507 511-9000',
          ubicacion: 'Plaza Catedral, Casco Viejo',
          fechaSolicitud: '2024-01-28',
          fechaRequerida: '2024-01-30',
          prioridad: 'Alta',
          estado: 'Pendiente',
          observaciones: 'Requiere limpieza antes del evento cultural'
        },
        {
          id: 'REQ002',
          tipo: 'desinfeccion',
          titulo: 'Desinfección Escuela Primaria',
          descripcion: 'Desinfección preventiva por casos de gripe',
          solicitante: 'Ministerio de Educación',
          telefono: '+507 515-3000',
          ubicacion: 'Escuela José Martí, Río Abajo',
          fechaSolicitud: '2024-01-27',
          fechaRequerida: '2024-01-29',
          prioridad: 'Crítica',
          estado: 'Asignado',
          observaciones: 'Protocolo especial para centros educativos'
        }
      ];

      // Programación de servicios
      const schedulesData = [
        {
          id: 'PROG001',
          tipo: 'limpieza',
          nombre: 'Limpieza Semanal Parques',
          frecuencia: 'Semanal',
          diasSemana: ['Lunes', 'Miércoles', 'Viernes'],
          horaInicio: '06:00',
          horaFin: '14:00',
          equipoAsignado: 'Equipo A',
          ubicaciones: ['Parque Belisario Porras', 'Parque Recreativo Omar'],
          estado: 'Activo',
          proximaEjecucion: '2024-01-29'
        },
        {
          id: 'PROG002',
          tipo: 'desinfeccion',
          nombre: 'Desinfección Mensual Hospitales',
          frecuencia: 'Mensual',
          diasSemana: ['Sábado'],
          horaInicio: '20:00',
          horaFin: '04:00',
          equipoAsignado: 'Equipo B',
          ubicaciones: ['Hospital Nacional', 'Hospital del Niño'],
          estado: 'Activo',
          proximaEjecucion: '2024-02-03'
        }
      ];

      setServiceTypes(typesData);
      setServices(servicesData);
      setServiceTeams(teamsData);
      setServiceRequests(requestsData);
      setServiceSchedules(schedulesData);
      setIsLoading(false);
    }, 1000);
  };

  const getServiceTypeById = (id) => {
    return serviceTypes.find(type => type.id === id);
  };

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'Completado': return 'success';
      case 'En Proceso': return 'warning';
      case 'Programado': return 'info';
      case 'Pendiente': return 'secondary';
      case 'Crítica': return 'danger';
      default: return 'secondary';
    }
  };

  const renderOverviewTab = () => (
    <div className="services-content">
      <div className="services-header">
        <h3>🏢 Resumen de Servicios</h3>
        <button className="btn btn--primary" onClick={() => setShowRequestModal(true)}>
          ➕ Nueva Solicitud
        </button>
      </div>

      {/* Estadísticas generales */}
      <div className="services-stats">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-data">
            <div className="stat-value">{services.length}</div>
            <div className="stat-label">Servicios Activos</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-data">
            <div className="stat-value">
              {services.filter(s => s.estado === 'En Proceso').length}
            </div>
            <div className="stat-label">En Proceso</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-data">
            <div className="stat-value">
              {services.filter(s => s.estado === 'Completado').length}
            </div>
            <div className="stat-label">Completados</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-data">
            <div className="stat-value">{serviceTeams.length}</div>
            <div className="stat-label">Equipos</div>
          </div>
        </div>
      </div>

      {/* Tipos de servicios */}
      <div className="service-types-grid">
        {serviceTypes.map(type => (
          <div key={type.id} className="service-type-card">
            <div className="service-type-header">
              <span className="service-type-icon">{type.icon}</span>
              <h4>{type.nombre}</h4>
            </div>
            <p className="service-type-description">{type.descripcion}</p>
            <div className="service-type-services">
              <h5>Servicios incluidos:</h5>
              <ul>
                {type.serviciosIncluidos.map((servicio, index) => (
                  <li key={index}>{servicio}</li>
                ))}
              </ul>
            </div>
            <div className="service-type-stats">
              <span className="service-count">
                {services.filter(s => s.tipo === type.id).length} activos
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderActiveServicesTab = () => (
    <div className="services-content">
      <div className="services-header">
        <h3>🔄 Servicios Activos</h3>
        <div className="service-filters">
          <select className="form-control">
            <option value="">Todos los tipos</option>
            {serviceTypes.map(type => (
              <option key={type.id} value={type.id}>{type.nombre}</option>
            ))}
          </select>
          <select className="form-control">
            <option value="">Todos los estados</option>
            <option value="Programado">Programado</option>
            <option value="En Proceso">En Proceso</option>
            <option value="Completado">Completado</option>
          </select>
        </div>
      </div>

      <div className="services-grid">
        {services.map(service => {
          const serviceType = getServiceTypeById(service.tipo);
          return (
            <div key={service.id} className="service-card">
              <div className="service-card-header">
                <div className="service-type-badge" style={{ backgroundColor: serviceType?.color }}>
                  {serviceType?.icon} {serviceType?.nombre}
                </div>
                <span className={`service-status status-${getStatusColor(service.estado)}`}>
                  {service.estado}
                </span>
              </div>
              <div className="service-card-content">
                <h4>{service.nombre}</h4>
                <div className="service-details">
                  <div className="detail-row">
                    <span className="detail-label">📍 Ubicación:</span>
                    <span className="detail-value">{service.ubicacion}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">👥 Equipo:</span>
                    <span className="detail-value">{service.equipoAsignado}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">👨‍💼 Supervisor:</span>
                    <span className="detail-value">{service.supervisor}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">📅 Fecha:</span>
                    <span className="detail-value">{service.fechaInicio} - {service.fechaFin}</span>
                  </div>
                </div>
                {service.estado === 'En Proceso' && (
                  <div className="service-progress">
                    <div className="progress-label">
                      Progreso: {service.progreso}%
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${service.progreso}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                <div className="service-actions">
                  <button className="btn btn--small btn--secondary">
                    👁️ Ver Detalles
                  </button>
                  <button className="btn btn--small btn--primary">
                    📋 Reporte
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderTeamsTab = () => (
    <div className="services-content">
      <div className="services-header">
        <h3>👥 Equipos de Trabajo</h3>
        <button className="btn btn--primary">
          ➕ Nuevo Equipo
        </button>
      </div>

      <div className="teams-grid">
        {serviceTeams.map(team => (
          <div key={team.id} className="team-card">
            <div className="team-header">
              <h4>{team.nombre}</h4>
              <span className={`team-status status-${team.estado === 'Activo' ? 'success' : 'info'}`}>
                {team.estado}
              </span>
            </div>
            <div className="team-info">
              <div className="info-row">
                <span className="info-label">👨‍💼 Supervisor:</span>
                <span className="info-value">{team.supervisor}</span>
              </div>
              <div className="info-row">
                <span className="info-label">🎯 Especialidad:</span>
                <span className="info-value">{getServiceTypeById(team.especialidad)?.nombre}</span>
              </div>
              <div className="info-row">
                <span className="info-label">👥 Miembros:</span>
                <span className="info-value">{team.miembros.length}</span>
              </div>
              <div className="info-row">
                <span className="info-label">🔄 Servicios Activos:</span>
                <span className="info-value">{team.serviciosActivos}</span>
              </div>
              <div className="info-row">
                <span className="info-label">⭐ Calificación:</span>
                <span className="info-value">{team.calificacion}/5</span>
              </div>
            </div>
            <div className="team-members">
              <h5>Miembros del Equipo:</h5>
              <ul>
                {team.miembros.map((member, index) => (
                  <li key={index}>
                    <strong>{member.nombre}</strong> - {member.cargo}
                  </li>
                ))}
              </ul>
            </div>
            <div className="team-actions">
              <button className="btn btn--small btn--secondary">
                👁️ Ver Equipo
              </button>
              <button className="btn btn--small btn--primary">
                📋 Asignar Servicio
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRequestsTab = () => (
    <div className="services-content">
      <div className="services-header">
        <h3>📋 Solicitudes de Servicio</h3>
        <button className="btn btn--primary" onClick={() => setShowRequestModal(true)}>
          ➕ Nueva Solicitud
        </button>
      </div>

      <div className="table-wrapper">
        <table className="services-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tipo</th>
              <th>Título</th>
              <th>Solicitante</th>
              <th>Ubicación</th>
              <th>Fecha Requerida</th>
              <th>Prioridad</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {serviceRequests.map(request => (
              <tr key={request.id}>
                <td>{request.id}</td>
                <td>
                  <span className="service-type-badge">
                    {getServiceTypeById(request.tipo)?.icon} {getServiceTypeById(request.tipo)?.nombre}
                  </span>
                </td>
                <td>{request.titulo}</td>
                <td>{request.solicitante}</td>
                <td>{request.ubicacion}</td>
                <td>{request.fechaRequerida}</td>
                <td>
                  <span className={`priority-badge priority-${request.prioridad.toLowerCase()}`}>
                    {request.prioridad}
                  </span>
                </td>
                <td>
                  <span className={`status-badge status-${getStatusColor(request.estado)}`}>
                    {request.estado}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn btn--small btn--secondary">
                      👁️
                    </button>
                    <button className="btn btn--small btn--primary">
                      ✅
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="services-container">
      <div className="services-header-main">
        <div className="services-title">
          <h2>🏢 Sistema de Servicios Especializados</h2>
          <p>Gestión integral de limpieza, aseo, desinfección y fumigación</p>
        </div>
      </div>

      <div className="services-tabs">
        <button 
          className={`tab ${activeServiceTab === 'overview' ? 'tab--active' : ''}`}
          onClick={() => setActiveServiceTab('overview')}
        >
          📊 Resumen
        </button>
        <button 
          className={`tab ${activeServiceTab === 'active' ? 'tab--active' : ''}`}
          onClick={() => setActiveServiceTab('active')}
        >
          🔄 Servicios Activos
        </button>
        <button 
          className={`tab ${activeServiceTab === 'teams' ? 'tab--active' : ''}`}
          onClick={() => setActiveServiceTab('teams')}
        >
          👥 Equipos
        </button>
        <button 
          className={`tab ${activeServiceTab === 'requests' ? 'tab--active' : ''}`}
          onClick={() => setActiveServiceTab('requests')}
        >
          📋 Solicitudes
        </button>
      </div>

      {isLoading ? (
        <div className="services-loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Cargando servicios...</p>
          </div>
        </div>
      ) : (
        <div className="services-body">
          {activeServiceTab === 'overview' && renderOverviewTab()}
          {activeServiceTab === 'active' && renderActiveServicesTab()}
          {activeServiceTab === 'teams' && renderTeamsTab()}
          {activeServiceTab === 'requests' && renderRequestsTab()}
        </div>
      )}

      {/* Modal Nueva Solicitud */}
      {showRequestModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Nueva Solicitud de Servicio</h3>
              <button 
                className="modal-close"
                onClick={() => setShowRequestModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>Formulario de nueva solicitud (por implementar)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesComponent;
