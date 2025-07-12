import { useState, useEffect } from 'react';
import './RiskComponent.css';

const RiskComponent = ({ userType = 'admin' }) => {
  const [risks, setRisks] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState('todos');
  const [filterSeverity, setFilterSeverity] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);

  useEffect(() => {
    loadRiskData();
  }, []);

  const loadRiskData = () => {
    setIsLoading(true);

    setTimeout(() => {
      // Datos de riesgos (mock)
      const risksData = [
        {
          id: 'RISK001',
          area: 'Centro Histórico',
          descripcion: 'Calles estrechas que dificultan maniobras de camiones',
          probabilidad: 4,
          impacto: 3,
          categoria: 'Operativo',
          propietario: 'Depto. Operaciones',
          fechaReporte: '2024-01-15',
          estado: 'Abierto',
          planMitigacion: 'Asignar camiones pequeños y rutas alternas'
        },
        {
          id: 'RISK002',
          area: 'Mercado de Abastos',
          descripcion: 'Concentración de residuos orgánicos genera malos olores',
          probabilidad: 3,
          impacto: 4,
          categoria: 'Ambiental',
          propietario: 'Depto. Higiene',
          fechaReporte: '2024-01-18',
          estado: 'En Progreso',
          planMitigacion: 'Aumentar frecuencia de recolección y desinfección'
        },
        {
          id: 'RISK003',
          area: 'Ruta Norte',
          descripcion: 'Alto tránsito vehicular produce retrasos',
          probabilidad: 5,
          impacto: 2,
          categoria: 'Logístico',
          propietario: 'Depto. Tráfico',
          fechaReporte: '2024-01-20',
          estado: 'Abierto',
          planMitigacion: 'Reprogramar horarios y optimizar rutas'
        },
        {
          id: 'RISK004',
          area: 'Planta de Transferencia',
          descripcion: 'Fuga menor de combustible reportada',
          probabilidad: 2,
          impacto: 5,
          categoria: 'Seguridad',
          propietario: 'Depto. Mantenimiento',
          fechaReporte: '2024-01-22',
          estado: 'Cerrado',
          planMitigacion: 'Reparar sellos y mejorar inspecciones'
        }
      ];

      // Datos de incidentes (mock)
      const incidentsData = [
        {
          id: 'INC001',
          fecha: '2024-01-25',
          tipo: 'Accidente menor',
          descripcion: 'Golpe leve a vehículo estacionado en Casco Viejo',
          severidad: 'Baja',
          responsable: 'Camión #12',
          acciones: 'Reporte y capacitación'
        },
        {
          id: 'INC002',
          fecha: '2024-01-26',
          tipo: 'Derrame',
          descripcion: 'Derrame de residuos líquidos en Ruta Sur',
          severidad: 'Media',
          responsable: 'Camión #8',
          acciones: 'Limpieza inmediata y registro'
        },
        {
          id: 'INC003',
          fecha: '2024-01-27',
          tipo: 'Lesión',
          descripcion: 'Operario sufrió corte menor manipulando contenedor',
          severidad: 'Alta',
          responsable: 'Operario Juan P.',
          acciones: 'Atención médica y revisión de EPP'
        }
      ];

      setRisks(risksData);
      setIncidents(incidentsData);
      setIsLoading(false);
    }, 800);
  };

  const calcSeverity = (risk) => risk.probabilidad * risk.impacto; // 1-25

  const getSeverityLevel = (value) => {
    if (value >= 15) return 'alto';
    if (value >= 8) return 'medio';
    return 'bajo';
  };

  // Filtrar riesgos según criterios
  const filteredRisks = risks.filter(risk => {
    const sevLevel = getSeverityLevel(calcSeverity(risk));
    const matchesCategory = filterCategory === 'todos' || risk.categoria === filterCategory;
    const matchesSeverity = filterSeverity === 'todos' || sevLevel === filterSeverity;
    const matchesSearch = searchTerm === '' || 
      risk.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      risk.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      risk.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesSeverity && matchesSearch;
  });

  const handleViewRisk = (risk) => {
    setSelectedRisk(risk);
    setShowRiskModal(true);
  };

  const closeRiskModal = () => {
    setShowRiskModal(false);
    setSelectedRisk(null);
  };

  const getCategories = () => {
    const categories = [...new Set(risks.map(r => r.categoria))];
    return categories;
  };

  return (
    <div className="risk-container">
      <div className="risk-header-main">
        <div className="risk-title">
          <h2>⚠️ Análisis de Riesgos Operativos</h2>
          <p>Identificación y mitigación de riesgos en las operaciones de recolección</p>
        </div>
      </div>

      {isLoading ? (
        <div className="risk-loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Cargando datos de riesgos...</p>
          </div>
        </div>
      ) : (
        <div className="risk-body">
          {/* Estadísticas generales */}
          <div className="risk-stats">
            <div className="stat-card">
              <div className="stat-icon">⚠️</div>
              <div className="stat-data">
                <div className="stat-value">{risks.length}</div>
                <div className="stat-label">Riesgos Totales</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔴</div>
              <div className="stat-data">
                <div className="stat-value">
                  {risks.filter(r => getSeverityLevel(calcSeverity(r)) === 'alto').length}
                </div>
                <div className="stat-label">Riesgos Altos</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🟡</div>
              <div className="stat-data">
                <div className="stat-value">
                  {incidents.length}
                </div>
                <div className="stat-label">Incidentes Recientes</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-data">
                <div className="stat-value">{filteredRisks.length}</div>
                <div className="stat-label">Filtrados</div>
              </div>
            </div>
          </div>

          {/* Controles de filtrado y búsqueda */}
          <div className="risk-controls">
            <div className="search-box">
              <input
                type="text"
                placeholder="🔍 Buscar riesgos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="filter-controls">
              <select 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)}
                className="filter-select"
              >
                <option value="todos">📂 Todas las categorías</option>
                {getCategories().map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              
              <select 
                value={filterSeverity} 
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="filter-select"
              >
                <option value="todos">⚠️ Todas las severidades</option>
                <option value="alto">🔴 Alto</option>
                <option value="medio">🟡 Medio</option>
                <option value="bajo">🟢 Bajo</option>
              </select>
            </div>
          </div>

          {/* Tabla de riesgos */}
          <div className="table-wrapper">
            <table className="risk-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Área</th>
                  <th>Descripción</th>
                  <th>Prob.</th>
                  <th>Impacto</th>
                  <th>Severidad</th>
                  <th>Categoría</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredRisks.map(risk => {
                  const sevValue = calcSeverity(risk);
                  const sevLevel = getSeverityLevel(sevValue);
                  return (
                    <tr key={risk.id}>
                      <td>{risk.id}</td>
                      <td>{risk.area}</td>
                      <td>{risk.descripcion}</td>
                      <td>{risk.probabilidad}</td>
                      <td>{risk.impacto}</td>
                      <td>
                        <span className={`severity-badge severity-${sevLevel}`}>
                          {sevValue}
                        </span>
                      </td>
                      <td>{risk.categoria}</td>
                      <td>{risk.estado}</td>
                      <td>
                        <button 
                          className="btn btn--small btn--secondary"
                          onClick={() => handleViewRisk(risk)}
                          title="Ver detalles"
                        >
                          👁️
                        </button>
                        <button 
                          className="btn btn--small btn--primary"
                          title="Editar riesgo"
                        >
                          ✏️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Incidentes recientes */}
          <div className="incidents-section">
            <h3>🚨 Incidentes Recientes</h3>
            <div className="incidents-grid">
              {incidents.map(inc => (
                <div key={inc.id} className={`incident-card incident-${inc.severidad.toLowerCase()}`}>
                  <div className="incident-header">
                    <span className="incident-id">{inc.id}</span>
                    <span className="incident-date">{inc.fecha}</span>
                  </div>
                  <div className="incident-body">
                    <h4>{inc.tipo}</h4>
                    <p>{inc.descripcion}</p>
                    <div className="incident-details">
                      <span>Severidad: <strong>{inc.severidad}</strong></span>
                      <span>Responsable: {inc.responsable}</span>
                    </div>
                  </div>
                  <div className="incident-actions">
                    <button className="btn btn--small btn--outline">📄 Detalles</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalles del riesgo */}
      {showRiskModal && selectedRisk && (
        <div className="risk-modal-overlay" onClick={closeRiskModal}>
          <div className="risk-modal" onClick={(e) => e.stopPropagation()}>
            <div className="risk-modal-header">
              <h3>⚠️ Detalles del Riesgo: {selectedRisk.id}</h3>
              <button className="modal-close-btn" onClick={closeRiskModal}>
                ✕
              </button>
            </div>
            
            <div className="risk-modal-content">
              <div className="risk-detail-grid">
                <div className="risk-detail-item">
                  <label>Área:</label>
                  <span>{selectedRisk.area}</span>
                </div>
                <div className="risk-detail-item">
                  <label>Categoría:</label>
                  <span>{selectedRisk.categoria}</span>
                </div>
                <div className="risk-detail-item">
                  <label>Estado:</label>
                  <span className={`status-badge status-${selectedRisk.estado.toLowerCase()}`}>
                    {selectedRisk.estado}
                  </span>
                </div>
                <div className="risk-detail-item">
                  <label>Propietario:</label>
                  <span>{selectedRisk.propietario}</span>
                </div>
                <div className="risk-detail-item">
                  <label>Fecha de Reporte:</label>
                  <span>{selectedRisk.fechaReporte}</span>
                </div>
                <div className="risk-detail-item">
                  <label>Probabilidad:</label>
                  <span>{selectedRisk.probabilidad}/5</span>
                </div>
                <div className="risk-detail-item">
                  <label>Impacto:</label>
                  <span>{selectedRisk.impacto}/5</span>
                </div>
                <div className="risk-detail-item">
                  <label>Severidad:</label>
                  <span className={`severity-badge severity-${getSeverityLevel(calcSeverity(selectedRisk))}`}>
                    {calcSeverity(selectedRisk)}
                  </span>
                </div>
              </div>
              
              <div className="risk-description">
                <label>Descripción:</label>
                <p>{selectedRisk.descripcion}</p>
              </div>
              
              <div className="risk-mitigation">
                <label>Plan de Mitigación:</label>
                <p>{selectedRisk.planMitigacion}</p>
              </div>
              
              <div className="risk-actions">
                <button className="btn btn--primary">📝 Actualizar Estado</button>
                <button className="btn btn--secondary">📊 Ver Historial</button>
                <button className="btn btn--outline">📋 Generar Reporte</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskComponent; 