import { useState, useEffect } from 'react';
import { appData } from '../../data/mockData';
import WeightModal from '../../components/WeightModal/WeightModal';
import MapComponent from '../../components/Map/MapComponent';
import './ConductorDashboard.css';

const ConductorDashboard = ({ user, onLogout }) => {
  const [completedStops, setCompletedStops] = useState([]);
  const [currentStop, setCurrentStop] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingStopIndex, setPendingStopIndex] = useState(null);
  const [currentData, setCurrentData] = useState(appData);
  const [timeOnRoute, setTimeOnRoute] = useState(0);

  // Simular tiempo en ruta
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeOnRoute(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Simular actualizaciones de datos en tiempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentData(prevData => ({
        ...prevData,
        camiones: prevData.camiones.map(camion => {
          if (camion.id === user.camionAsignado && camion.estado === 'En ruta') {
            return {
              ...camion,
              pesoAcumulado: Math.min(1000, camion.pesoAcumulado + Math.floor(Math.random() * 20)),
              combustible: Math.max(0, camion.combustible - Math.random() * 0.5),
              ultimaActualizacion: new Date().toISOString()
            };
          }
          return camion;
        })
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [user.camionAsignado]);

  const userTruck = currentData.camiones.find(c => c.id === user.camionAsignado);
  const assignedRoute = currentData.rutas.find(r => r.nombre === userTruck?.rutaAsignada);

  const handleCompleteStop = (stopIndex) => {
    setPendingStopIndex(stopIndex);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPendingStopIndex(null);
  };

  const handleWeightConfirm = (category) => {
    const timestamp = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    setCompletedStops(prev => [...prev, {
      index: pendingStopIndex,
      category: category,
      timestamp: timestamp
    }]);
    
    setCurrentStop(prev => prev + 1);
    setIsModalOpen(false);
    setPendingStopIndex(null);
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!assignedRoute) return 0;
    return Math.round((completedStops.length / assignedRoute.paradas.length) * 100);
  };

  if (!userTruck || !assignedRoute) {
    return (
      <div className="dashboard-container">
        <div className="main-content">
          <div className="dashboard-header">
            <h1>🚛 Dashboard Conductor</h1>
            <button className="logout-btn" onClick={onLogout}>
              🚪 Cerrar Sesión
            </button>
          </div>
          <div className="card">
            <div className="card__body">
              <div className="no-assignment">
                <div className="no-assignment-icon">🚫</div>
                <h3>Sin Asignación</h3>
                <p>No tienes un camión o ruta asignada. Contacta con el administrador.</p>
                <button className="btn btn--primary" onClick={() => window.location.reload()}>
                  🔄 Actualizar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage = getProgressPercentage();

  return (
    <div className="dashboard-container">
      <div className="main-content">
        <div className="dashboard-header">
          <h1>🚛 Dashboard Conductor</h1>
          <div className="header-actions">
            <div className="route-status">
              🗺️ {assignedRoute.nombre}
            </div>
            <div className="time-indicator">
              ⏱️ {formatTime(timeOnRoute)}
            </div>
            <button className="logout-btn" onClick={onLogout}>
              🚪 Cerrar Sesión
            </button>
          </div>
        </div>

        {/* KPIs del conductor */}
        <div className="conductor-kpis">
          <div className="kpi-card">
            <div className="kpi-icon">🚛</div>
            <div className="kpi-content">
              <div className="kpi-value">{userTruck.id}</div>
              <div className="kpi-label">Mi Camión</div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon">📦</div>
            <div className="kpi-content">
              <div className="kpi-value">{completedStops.length}/{assignedRoute.paradas.length}</div>
              <div className="kpi-label">Paradas Completadas</div>
            </div>
          </div>
        </div>

        {/* Progreso general */}
        <div className="progress-section">
          <div className="card">
            <div className="card__body">
              <h3>📊 Progreso de Ruta</h3>
              <div className="route-progress">
                <div className="progress-bar-large">
                  <div 
                    className="progress-fill-large"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                  <span className="progress-percentage">{progressPercentage}%</span>
                </div>
                <div className="progress-details">
                  <div className="detail-item">
                    <span className="detail-label">📍 Paradas:</span>
                    <span className="detail-value">{completedStops.length} / {assignedRoute.paradas.length}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">🗺️ Ruta:</span>
                    <span className="detail-value">{assignedRoute.nombre}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">📏 Distancia:</span>
                    <span className="detail-value">{assignedRoute.distanciaTotal} km</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">⏱️ Tiempo Estimado:</span>
                    <span className="detail-value">{Math.round(assignedRoute.tiempoEstimado / 60)} hrs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="conductor-layout">
          {/* Información del conductor y camión */}
          <div className="conductor-info">
            <div className="card">
              <div className="card__body">
                <h3>👨‍💼 Información del Conductor</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <div className="info-label">Nombre:</div>
                    <div className="info-value">{user.nombre}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Camión:</div>
                    <div className="info-value">{userTruck.id}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Estado:</div>
                    <span className="status status--success">{userTruck.estado}</span>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Velocidad:</div>
                    <div className="info-value">{userTruck.velocidad} km/h</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Combustible:</div>
                    <div className="fuel-display">
                      <div className="fuel-bar-small">
                        <div 
                          className="fuel-fill"
                          style={{ 
                            width: `${userTruck.combustible}%`,
                            backgroundColor: userTruck.combustible < 30 ? '#ef4444' : '#22c55e'
                          }}
                        ></div>
                      </div>
                      <span className="fuel-text">{Math.round(userTruck.combustible)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mapa del conductor */}
            <div className="card">
              <div className="card__body">
                <h3>📍 Mi Ubicación</h3>
                <MapComponent 
                  camiones={[userTruck]} 
                  userType={user.tipo}
                  showRealTime={true}
                  selectedTruck={userTruck.id}
                />
              </div>
            </div>
          </div>

          {/* Lista de paradas */}
          <div className="route-stops-section">
            <div className="card">
              <div className="card__body">
                <h3>🗺️ Paradas de la Ruta</h3>
                <div className="stops-container">
                  {assignedRoute.paradas.map((parada, index) => {
                    const isCompleted = completedStops.some(stop => stop.index === index);
                    const isCurrent = index === currentStop && !isCompleted;
                    const completedStop = completedStops.find(stop => stop.index === index);
                    
                    return (
                      <div key={index} className={`step-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                        <div className="step-indicator">
                          <div className="step-number">
                            {isCompleted ? '✅' : index + 1}
                          </div>
                          {index < assignedRoute.paradas.length - 1 && (
                            <div className="step-line"></div>
                          )}
                        </div>
                        
                        <div className="step-content">
                          <div className="step-header">
                            <div className="step-title">{parada.nombre}</div>
                            <div className="step-time">📅 {parada.estimado}</div>
                          </div>
                          
                          {isCompleted && completedStop && (
                            <div className="step-completed">
                              <div className="completed-info">
                                ✅ Completada a las {completedStop.timestamp}
                              </div>
                              <div className="completed-weight">
                                📦 Categoría: {completedStop.category}
                              </div>
                            </div>
                          )}
                          
                          {isCurrent && (
                            <div className="step-current">
                              <div className="current-indicator">
                                📍 Parada actual
                              </div>
                              <button
                                className="btn btn--primary btn--full-width"
                                onClick={() => handleCompleteStop(index)}
                              >
                                ✅ Completar Parada
                              </button>
                            </div>
                          )}
                          
                          {!isCompleted && !isCurrent && (
                            <div className="step-pending">
                              <button
                                className="btn btn--outline btn--full-width"
                                disabled
                              >
                                ⏳ Pendiente
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <WeightModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onConfirm={handleWeightConfirm}
          currentStop={pendingStopIndex !== null ? assignedRoute.paradas[pendingStopIndex]?.nombre : ''}
        />
      </div>
    </div>
  );
};

export default ConductorDashboard; 