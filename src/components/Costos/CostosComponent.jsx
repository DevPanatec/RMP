import { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { DollarSign, TrendingUp, TrendingDown, Package, ShoppingCart, Wrench, Shield, Users as UsersIcon, Calendar } from '../Icons';
import './CostosComponent.css';

const CostosComponent = () => {
  const {
    valorTotalInventario,
    costosPorTipo,
    historialComprasPorMes,
    topItemsMasCostosos,
    inventory
  } = useInventory();

  const [selectedPeriod, setSelectedPeriod] = useState('12');

  // Calcular estadísticas
  const totalItems = inventory?.length || 0;

  // Calcular total gastado este mes
  const ahora = new Date();
  const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
  const mesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const mesAnteriorKey = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, '0')}`;

  const gastoMesActual = historialComprasPorMes?.find(m => m.mes === mesActual)?.total || 0;
  const gastoMesAnterior = historialComprasPorMes?.find(m => m.mes === mesAnteriorKey)?.total || 0;
  const cambioMensual = gastoMesAnterior > 0
    ? (((gastoMesActual - gastoMesAnterior) / gastoMesAnterior) * 100).toFixed(1)
    : 0;

  // Iconos y colores por tipo
  const tipoConfig = {
    herramienta: { icon: <Wrench size={24} />, color: '#007aff', nombre: 'Herramientas' },
    insumo: { icon: <Package size={24} />, color: '#5856d6', nombre: 'Insumos' },
    equipo: { icon: <Shield size={24} />, color: '#ff9500', nombre: 'Equipos' },
    uniforme: { icon: <UsersIcon size={24} />, color: '#34c759', nombre: 'Uniformes' }
  };

  // Preparar datos para gráfica
  const chartData = historialComprasPorMes || [];
  const maxGasto = Math.max(...chartData.map(d => d.total || 0), 100);

  // Dimensiones del gráfico
  const chartWidth = 1000;
  const chartHeight = 400;
  const padding = { top: 20, right: 40, bottom: 30, left: 60 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Escalas
  const xScale = (index) => (index / Math.max(chartData.length - 1, 1)) * innerWidth + padding.left;
  const yScale = (value) => innerHeight - ((value / maxGasto) * innerHeight) + padding.top;

  // Generar paths de la línea y área
  const linePath = chartData.map((d, i) => {
    const x = xScale(i);
    const y = yScale(d.total);
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(' ');

  const areaPath = chartData.length > 0
    ? `${linePath} L ${xScale(chartData.length - 1)} ${innerHeight + padding.top} L ${padding.left} ${innerHeight + padding.top} Z`
    : '';

  // Formatear nombre de mes
  const formatMes = (mesStr) => {
    const [year, month] = mesStr.split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return meses[parseInt(month) - 1] || mesStr;
  };

  return (
    <div className="costos-container">
      <div className="costos-header">
        <div>
          <h2>Análisis de Costos de Inventario</h2>
          <p className="costos-subtitle">Control y seguimiento de gastos en materiales e insumos</p>
        </div>
        <div className="period-selector">
          <button className={selectedPeriod === '6' ? 'active' : ''} onClick={() => setSelectedPeriod('6')}>
            6 Meses
          </button>
          <button className={selectedPeriod === '12' ? 'active' : ''} onClick={() => setSelectedPeriod('12')}>
            12 Meses
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-summary-grid">
        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: '#007aff15' }}>
            <DollarSign size={32} style={{ color: '#007aff' }} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Valor Total Inventario</div>
            <div className="kpi-value">${valorTotalInventario.toLocaleString()}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: '#5856d615' }}>
            <ShoppingCart size={32} style={{ color: '#5856d6' }} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Gastado Este Mes</div>
            <div className="kpi-value">${gastoMesActual.toLocaleString()}</div>
            <div className={`kpi-change ${cambioMensual >= 0 ? 'positive' : 'negative'}`}>
              {cambioMensual >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span>{Math.abs(cambioMensual)}% vs mes anterior</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: '#ff950015' }}>
            <Package size={32} style={{ color: '#ff9500' }} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Total de Items</div>
            <div className="kpi-value">{totalItems}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: '#34c75915' }}>
            <Calendar size={32} style={{ color: '#34c759' }} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Promedio Mensual</div>
            <div className="kpi-value">
              ${chartData.length > 0
                ? Math.round(chartData.reduce((sum, d) => sum + d.total, 0) / chartData.length).toLocaleString()
                : '0'}
            </div>
          </div>
        </div>
      </div>

      {/* Desglose por Tipo */}
      <div className="breakdown-section">
        <h3>Desglose por Tipo de Artículo</h3>
        <div className="breakdown-grid">
          {costosPorTipo.map((tipo, idx) => {
            const config = tipoConfig[tipo.tipo] || { icon: <Package size={24} />, color: '#666', nombre: tipo.tipo };
            return (
              <div key={idx} className="breakdown-card" style={{ borderLeft: `4px solid ${config.color}` }}>
                <div className="breakdown-header">
                  <div className="breakdown-icon" style={{ backgroundColor: `${config.color}15` }}>
                    {config.icon}
                  </div>
                  <div className="breakdown-info">
                    <span className="breakdown-category">{config.nombre}</span>
                    <span className="breakdown-percentage">{tipo.porcentaje}%</span>
                  </div>
                </div>
                <div className="breakdown-amount">
                  ${tipo.valor.toLocaleString()}
                </div>
                <div className="breakdown-meta">
                  {tipo.cantidad_items} items · {tipo.cantidad_unidades.toFixed(0)} unidades
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gráfica de Tendencia */}
      <div className="tendencia-section">
        <h3>Tendencia de Gastos en Compras</h3>
        <div className="costos-chart-container">
          {chartData.length === 0 ? (
            <div className="empty-chart">
              <Package size={64} />
              <p>No hay datos de compras disponibles</p>
            </div>
          ) : (
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" className="cost-chart">
              <defs>
                <linearGradient id="areaGradientInventario" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#5856d6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#5856d6" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Líneas de cuadrícula horizontales */}
              {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
                const y = innerHeight * (1 - t) + padding.top;
                const value = Math.round(maxGasto * t);
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
                      ${value}
                    </text>
                  </g>
                );
              })}

              {/* Área bajo la línea */}
              <path d={areaPath} fill="url(#areaGradientInventario)" />

              {/* Línea principal */}
              <path d={linePath} fill="none" stroke="#5856d6" strokeWidth="3" />

              {/* Puntos */}
              {chartData.map((d, i) => (
                <g key={i}>
                  <circle
                    cx={xScale(i)}
                    cy={yScale(d.total)}
                    r="5"
                    fill="#5856d6"
                    stroke="white"
                    strokeWidth="2"
                  />
                  <text
                    x={xScale(i)}
                    y={yScale(d.total) - 15}
                    textAnchor="middle"
                    fontSize="12"
                    fill="#666"
                  >
                    ${d.total.toFixed(0)}
                  </text>
                </g>
              ))}

              {/* Eje X - Etiquetas de mes */}
              {chartData.map((d, i) => (
                <text
                  key={i}
                  x={xScale(i)}
                  y={chartHeight - 10}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#666"
                >
                  {formatMes(d.mes)}
                </text>
              ))}
            </svg>
          )}
        </div>
      </div>

      {/* Top Items Más Costosos */}
      <div className="top-items-section">
        <h3>Top Items por Valor Total</h3>
        <div className="top-items-table-container">
          {!topItemsMasCostosos || topItemsMasCostosos.length === 0 ? (
            <div className="empty-top-items">
              <Package size={48} />
              <p>No hay items con precio asignado</p>
            </div>
          ) : (
            <table className="top-items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Precio Unit.</th>
                  <th>Valor Total</th>
                  <th>% del Total</th>
                </tr>
              </thead>
              <tbody>
                {topItemsMasCostosos.slice(0, 10).map((item, idx) => {
                  const porcentaje = valorTotalInventario > 0
                    ? ((item.valor_total / valorTotalInventario) * 100).toFixed(1)
                    : 0;
                  const config = tipoConfig[item.tipo_articulo] || { color: '#666' };

                  return (
                    <tr key={idx}>
                      <td><strong>#{idx + 1}</strong></td>
                      <td><code>{item.codigo}</code></td>
                      <td><strong>{item.nombre}</strong></td>
                      <td>
                        <span className="tipo-badge" style={{ backgroundColor: `${config.color}15`, color: config.color }}>
                          {item.tipo_articulo}
                        </span>
                      </td>
                      <td>{item.cantidad} {item.unidad_medida || 'un.'}</td>
                      <td>${item.precio_unitario.toFixed(2)}</td>
                      <td><strong>${item.valor_total.toLocaleString()}</strong></td>
                      <td>{porcentaje}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default CostosComponent;
