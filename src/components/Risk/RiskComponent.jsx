import { useState, useEffect } from 'react';
import './RiskComponent.css';

const RiskComponent = ({ userType = 'admin' }) => {
  const [risks, setRisks] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

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
                {risks.map(risk => {
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
                        <button className="btn btn--small btn--secondary">👁️</button>
                        <button className="btn btn--small btn--primary">✏️</button>
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
    </div>
  );
};

export default RiskComponent; 