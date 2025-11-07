import { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { DollarSign, TrendingUp, TrendingDown, Calendar, Package, Fuel, Users, Wrench } from '../Icons';
import './CostosComponent.css';

const CostosComponent = () => {
  const { valorTotalInventario } = useInventory();
  const [selectedPeriod, setSelectedPeriod] = useState('mes');

  // Índice de costos mensuales
  const costIndex = [
    { mes: 'Ene', valor: 100, operacion: 45000, combustible: 22000, mantenimiento: 18000, personal: 15000 },
    { mes: 'Feb', valor: 105, operacion: 47250, combustible: 23100, mantenimiento: 19500, personal: 15600 },
    { mes: 'Mar', valor: 103, operacion: 46350, combustible: 22660, mantenimiento: 18540, personal: 15450 },
    { mes: 'Abr', valor: 108, operacion: 48600, combustible: 23760, mantenimiento: 20160, personal: 15480 },
    { mes: 'May', valor: 110, operacion: 49500, combustible: 24200, mantenimiento: 20900, personal: 15400 },
    { mes: 'Jun', valor: 112, operacion: 50400, combustible: 24640, mantenimiento: 21280, personal: 15680 },
    { mes: 'Jul', valor: 115, operacion: 51750, combustible: 25300, mantenimiento: 22080, personal: 15870 },
  ];

  // Desglose por categoría (con inventario integrado)
  const inventarioMonto = valorTotalInventario || 0;
  const totalSinInventario = 51750 + 25300 + 22080 + 15870;
  const totalConInventario = totalSinInventario + inventarioMonto;

  const desglose = [
    {
      id: 1,
      categoria: 'Operación',
      monto: 51750,
      porcentaje: ((51750 / totalConInventario) * 100).toFixed(1),
      cambio: 2.5,
      icon: <DollarSign size={24} />,
      color: '#007aff'
    },
    {
      id: 2,
      categoria: 'Inventario',
      monto: inventarioMonto,
      porcentaje: ((inventarioMonto / totalConInventario) * 100).toFixed(1),
      cambio: 0,
      icon: <Package size={24} />,
      color: '#5856d6',
      isRealTime: true
    },
    {
      id: 3,
      categoria: 'Combustible',
      monto: 25300,
      porcentaje: ((25300 / totalConInventario) * 100).toFixed(1),
      cambio: -1.2,
      icon: <Fuel size={24} />,
      color: '#ff9500'
    },
    {
      id: 4,
      categoria: 'Mantenimiento',
      monto: 22080,
      porcentaje: ((22080 / totalConInventario) * 100).toFixed(1),
      cambio: 3.1,
      icon: <Wrench size={24} />,
      color: '#ff3b30'
    },
    {
      id: 5,
      categoria: 'Personal',
      monto: 15870,
      porcentaje: ((15870 / totalConInventario) * 100).toFixed(1),
      cambio: 0.8,
      icon: <Users size={24} />,
      color: '#34c759'
    },
  ];

  // Calcular dimensiones del gráfico
  const chartWidth = 1000;
  const chartHeight = 400;
  const padding = { top: 20, right: 40, bottom: 30, left: 50 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const maxValue = Math.max(...costIndex.map(d => d.valor));
  const minValue = Math.min(...costIndex.map(d => d.valor));

  // Escalas
  const xScale = (index) => (index / (costIndex.length - 1)) * innerWidth + padding.left;
  const yScale = (value) => innerHeight - ((value - minValue) / (maxValue - minValue)) * innerHeight + padding.top;

  // Generar path de la línea
  const linePath = costIndex.map((d, i) => {
    const x = xScale(i);
    const y = yScale(d.valor);
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(' ');

  // Generar path del área
  const areaPath = `${linePath} L ${xScale(costIndex.length - 1)} ${innerHeight + padding.top} L ${padding.left} ${innerHeight + padding.top} Z`;

  return (
    <div className="costos-container">
      <div className="costos-header">
        <div>
          <h2>Índice de Costos Operacionales</h2>
          <p className="costos-subtitle">Seguimiento mensual del índice de costos (Base: Enero = 100)</p>
        </div>
        <div className="period-selector">
          <button className={selectedPeriod === 'semana' ? 'active' : ''} onClick={() => setSelectedPeriod('semana')}>
            Semana
          </button>
          <button className={selectedPeriod === 'mes' ? 'active' : ''} onClick={() => setSelectedPeriod('mes')}>
            Mes
          </button>
          <button className={selectedPeriod === 'trimestre' ? 'active' : ''} onClick={() => setSelectedPeriod('trimestre')}>
            Trimestre
          </button>
        </div>
      </div>

      {/* Gráfico de índice de costos */}
      <div className="costos-chart-container">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" className="cost-chart">
          <defs>
            <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#007aff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#007aff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Área bajo la línea */}
          <path d={areaPath} fill="url(#areaGradient)" />

          {/* Línea principal */}
          <path d={linePath} fill="none" stroke="#007aff" strokeWidth="3" />

          {/* Puntos */}
          {costIndex.map((d, i) => (
            <g key={i}>
              <circle
                cx={xScale(i)}
                cy={yScale(d.valor)}
                r="5"
                fill="#007aff"
                stroke="white"
                strokeWidth="2"
              />
              <text
                x={xScale(i)}
                y={yScale(d.valor) - 15}
                textAnchor="middle"
                fontSize="12"
                fill="#666"
              >
                {d.valor}
              </text>
            </g>
          ))}

          {/* Eje X - Etiquetas de mes */}
          {costIndex.map((d, i) => (
            <text
              key={i}
              x={xScale(i)}
              y={chartHeight - 10}
              textAnchor="middle"
              fontSize="12"
              fill="#666"
            >
              {d.mes}
            </text>
          ))}

          {/* Líneas de cuadrícula horizontales */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const y = innerHeight * (1 - t) + padding.top;
            const value = Math.round(minValue + (maxValue - minValue) * t);
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeDasharray="4"
                />
                <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#666">
                  {value}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Desglose por categoría */}
      <div className="breakdown-section">
        <h3>Desglose por Categoría</h3>
        <div className="breakdown-grid">
          {desglose.map((item) => (
            <div key={item.id} className="breakdown-card" style={{ borderLeft: `4px solid ${item.color}` }}>
              <div className="breakdown-header">
                <div className="breakdown-icon" style={{ backgroundColor: `${item.color}15` }}>
                  {item.icon}
                </div>
                <div className="breakdown-info">
                  <span className="breakdown-category">{item.categoria}</span>
                  <span className="breakdown-percentage">{item.porcentaje}%</span>
                </div>
              </div>
              <div className="breakdown-amount">
                ${item.monto.toLocaleString()}
              </div>
              <div className={`breakdown-change ${item.cambio >= 0 ? 'positive' : 'negative'}`}>
                {item.cambio >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>{Math.abs(item.cambio)}% vs mes anterior</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla de evolución mensual */}
      <div className="evolution-section">
        <h3>Evolución Mensual</h3>
        <div className="evolution-table-container">
          <table className="evolution-table">
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
              {costIndex.map((d, i) => {
                const total = d.operacion + d.combustible + d.mantenimiento + d.personal;
                return (
                  <tr key={i}>
                    <td><strong>{d.mes}</strong></td>
                    <td>
                      <span className="index-badge">{d.valor}</span>
                    </td>
                    <td>${d.operacion.toLocaleString()}</td>
                    <td>${d.combustible.toLocaleString()}</td>
                    <td>${d.mantenimiento.toLocaleString()}</td>
                    <td>${d.personal.toLocaleString()}</td>
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
