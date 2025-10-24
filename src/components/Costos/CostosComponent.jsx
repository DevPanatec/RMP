import { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Calendar, Package, Fuel, Users, Wrench } from '../Icons';
import './CostosComponent.css';

const CostosComponent = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('mes');

  // Datos de ejemplo para el índice de costos
  const costIndex = [
    { mes: 'Ene', valor: 100, operacion: 45000, combustible: 22000, mantenimiento: 18000, personal: 15000 },
    { mes: 'Feb', valor: 105, operacion: 47250, combustible: 23100, mantenimiento: 19500, personal: 15600 },
    { mes: 'Mar', valor: 103, operacion: 46350, combustible: 21500, mantenimiento: 19800, personal: 16000 },
    { mes: 'Abr', valor: 108, operacion: 48600, combustible: 24200, mantenimiento: 20000, personal: 16400 },
    { mes: 'May', valor: 112, operacion: 50400, combustible: 25500, mantenimiento: 21000, personal: 16900 },
    { mes: 'Jun', valor: 115, operacion: 51750, combustible: 26800, mantenimiento: 21500, personal: 17200 },
  ];

  // Datos de resumen
  const costosTotales = {
    actual: 117200,
    anterior: 113800,
    tendencia: 3.0,
    proyeccion: 121500
  };

  const desglose = [
    {
      id: 1,
      categoria: 'Operación',
      monto: 51750,
      porcentaje: 44.1,
      cambio: 2.5,
      icon: <Package strokeWidth={1.5} size={20} />,
      color: '#007aff'
    },
    {
      id: 2,
      categoria: 'Combustible',
      monto: 26800,
      porcentaje: 22.9,
      cambio: 5.2,
      icon: <Fuel strokeWidth={1.5} size={20} />,
      color: '#ff9500'
    },
    {
      id: 3,
      categoria: 'Mantenimiento',
      monto: 21500,
      porcentaje: 18.3,
      cambio: -1.8,
      icon: <Wrench strokeWidth={1.5} size={20} />,
      color: '#30d158'
    },
    {
      id: 4,
      categoria: 'Personal',
      monto: 17200,
      porcentaje: 14.7,
      cambio: 1.2,
      icon: <Users strokeWidth={1.5} size={20} />,
      color: '#bf5af2'
    },
  ];

  const maxValor = Math.max(...costIndex.map(d => d.valor));
  const minValor = Math.min(...costIndex.map(d => d.valor));

  return (
    <div className="costos-container">
      <div className="costos-header">
        <div className="costos-header-left">
          <h2><DollarSign strokeWidth={1.5} size={28} /> Gestión de Costos</h2>
          <p className="costos-subtitle">Análisis de índices y tendencias financieras</p>
        </div>
        <div className="costos-header-right">
          <div className="period-selector">
            <button
              className={selectedPeriod === 'semana' ? 'active' : ''}
              onClick={() => setSelectedPeriod('semana')}
            >
              Semana
            </button>
            <button
              className={selectedPeriod === 'mes' ? 'active' : ''}
              onClick={() => setSelectedPeriod('mes')}
            >
              Mes
            </button>
            <button
              className={selectedPeriod === 'año' ? 'active' : ''}
              onClick={() => setSelectedPeriod('año')}
            >
              Año
            </button>
          </div>
        </div>
      </div>

      {/* Gráfica de índice */}
      <div className="costos-chart-container">
        <div className="chart-header">
          <h3>Índice de Costos Operativos</h3>
          <div className="chart-legend">
            <span className="legend-item">
              <span className="legend-dot" style={{ background: '#007aff' }}></span>
              Base: Enero (100)
            </span>
          </div>
        </div>
        <div className="cost-index-chart">
          <div className="chart-y-axis">
            <span>{maxValor}</span>
            <span>{Math.round((maxValor + minValor) / 2)}</span>
            <span>{minValor}</span>
          </div>
          <div className="chart-content">
            <svg width="100%" height="280" viewBox="0 0 600 280" preserveAspectRatio="none">
              {/* Grid lines */}
              <line x1="0" y1="70" x2="600" y2="70" stroke="#f0f0f0" strokeWidth="1" />
              <line x1="0" y1="140" x2="600" y2="140" stroke="#f0f0f0" strokeWidth="1" />
              <line x1="0" y1="210" x2="600" y2="210" stroke="#f0f0f0" strokeWidth="1" />

              {/* Area gradient */}
              <defs>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#007aff" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#007aff" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* Area path */}
              <path
                d={`M 0 ${280 - ((costIndex[0].valor - minValor) / (maxValor - minValor)) * 250}
                    L 100 ${280 - ((costIndex[1].valor - minValor) / (maxValor - minValor)) * 250}
                    L 200 ${280 - ((costIndex[2].valor - minValor) / (maxValor - minValor)) * 250}
                    L 300 ${280 - ((costIndex[3].valor - minValor) / (maxValor - minValor)) * 250}
                    L 400 ${280 - ((costIndex[4].valor - minValor) / (maxValor - minValor)) * 250}
                    L 500 ${280 - ((costIndex[5].valor - minValor) / (maxValor - minValor)) * 250}
                    L 500 280 L 0 280 Z`}
                fill="url(#areaGradient)"
              />

              {/* Line path */}
              <path
                d={`M 0 ${280 - ((costIndex[0].valor - minValor) / (maxValor - minValor)) * 250}
                    L 100 ${280 - ((costIndex[1].valor - minValor) / (maxValor - minValor)) * 250}
                    L 200 ${280 - ((costIndex[2].valor - minValor) / (maxValor - minValor)) * 250}
                    L 300 ${280 - ((costIndex[3].valor - minValor) / (maxValor - minValor)) * 250}
                    L 400 ${280 - ((costIndex[4].valor - minValor) / (maxValor - minValor)) * 250}
                    L 500 ${280 - ((costIndex[5].valor - minValor) / (maxValor - minValor)) * 250}`}
                stroke="#007aff"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              {costIndex.map((data, index) => (
                <g key={index}>
                  <circle
                    cx={index * 100}
                    cy={280 - ((data.valor - minValor) / (maxValor - minValor)) * 250}
                    r="6"
                    fill="#007aff"
                    stroke="white"
                    strokeWidth="2"
                  />
                </g>
              ))}
            </svg>

            <div className="chart-x-axis">
              {costIndex.map((data, index) => (
                <div key={index} className="x-label">
                  <span className="month-label">{data.mes}</span>
                  <span className="index-value">{data.valor}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Desglose por categoría */}
      <div className="costos-breakdown">
        <h3>Desglose por Categoría</h3>
        <div className="breakdown-grid">
          {desglose.map((item) => (
            <div key={item.id} className="breakdown-card">
              <div className="breakdown-header">
                <div className="breakdown-icon" style={{ background: `${item.color}15`, color: item.color }}>
                  {item.icon}
                </div>
                <div className="breakdown-info">
                  <span className="breakdown-label">{item.categoria}</span>
                  <h4 className="breakdown-amount">${item.monto.toLocaleString()}</h4>
                </div>
                <div className={`breakdown-change ${item.cambio >= 0 ? 'up' : 'down'}`}>
                  {item.cambio >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span>{Math.abs(item.cambio)}%</span>
                </div>
              </div>
              <div className="breakdown-progress">
                <div
                  className="progress-fill"
                  style={{
                    width: `${item.porcentaje}%`,
                    background: item.color
                  }}
                ></div>
              </div>
              <span className="breakdown-percentage">{item.porcentaje}% del total</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla de evolución mensual */}
      <div className="costos-table-container">
        <h3>Evolución Mensual Detallada</h3>
        <div className="costos-table-wrapper">
          <table className="costos-table">
            <thead>
              <tr>
                <th>Mes</th>
                <th>Índice</th>
                <th>Operación</th>
                <th>Combustible</th>
                <th>Mantenimiento</th>
                <th>Personal</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {costIndex.map((data, index) => {
                const total = data.operacion + data.combustible + data.mantenimiento + data.personal;
                return (
                  <tr key={index}>
                    <td><strong>{data.mes}</strong></td>
                    <td>
                      <span className="index-badge">{data.valor}</span>
                    </td>
                    <td>${data.operacion.toLocaleString()}</td>
                    <td>${data.combustible.toLocaleString()}</td>
                    <td>${data.mantenimiento.toLocaleString()}</td>
                    <td>${data.personal.toLocaleString()}</td>
                    <td><strong>${total.toLocaleString()}</strong></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CostosComponent;
