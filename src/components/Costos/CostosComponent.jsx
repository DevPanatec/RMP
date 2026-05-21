import { useState, useMemo, useEffect } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useMaintenance } from '../../context/MaintenanceContext';
import { useOrganization } from '../../context/OrganizationContext';
import {
  DollarSign, TrendingUp, TrendingDown, Package, ShoppingCart,
  Wrench, Shield, Users as UsersIcon, Calendar, PieChart,
  BarChart3, ClipboardList, CheckCircle, AlertTriangle
} from '../Icons';
import './CostosComponent.css';

const CostosComponent = () => {
  const {
    valorTotalInventario,
    costosPorTipo,
    historialComprasPorMes,
    topItemsMasCostosos,
    inventory
  } = useInventory();

  const { tasks, getOperationalStats } = useMaintenance();
  const { hasModulo } = useOrganization();

  const hasInv = hasModulo('INV');
  const hasMto = hasModulo('MTO');

  const [activeTab, setActiveTab] = useState('resumen');
  const [selectedPeriod, setSelectedPeriod] = useState('12');

  // =====================
  // DATOS DE INVENTARIO
  // =====================
  const totalItems = inventory?.length || 0;
  const ahora = new Date();
  const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
  const mesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const mesAnteriorKey = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, '0')}`;

  const gastoMesActual = historialComprasPorMes?.find(m => m.mes === mesActual)?.total || 0;
  const gastoMesAnterior = historialComprasPorMes?.find(m => m.mes === mesAnteriorKey)?.total || 0;
  const cambioMensual = gastoMesAnterior > 0
    ? (((gastoMesActual - gastoMesAnterior) / gastoMesAnterior) * 100).toFixed(1)
    : 0;

  // Iconos y colores por tipo inventario
  const tipoConfig = {
    herramienta: { icon: <Wrench size={24} />, color: 'var(--color-info)', bgColor: 'rgba(var(--color-info-rgb), 0.1)', nombre: 'Herramientas' },
    insumo: { icon: <Package size={24} />, color: 'var(--color-primary)', bgColor: 'rgba(var(--color-primary-rgb), 0.1)', nombre: 'Insumos' },
    equipo: { icon: <Shield size={24} />, color: 'var(--color-warning)', bgColor: 'rgba(var(--color-warning-rgb), 0.1)', nombre: 'Equipos' },
    uniforme: { icon: <UsersIcon size={24} />, color: 'var(--color-success)', bgColor: 'rgba(var(--color-success-rgb), 0.1)', nombre: 'Uniformes' }
  };

  // Gráfica inventario
  const chartData = historialComprasPorMes || [];
  const maxGasto = Math.max(...chartData.map(d => d.total || 0), 100);
  const chartWidth = 1000;
  const chartHeight = 400;
  const padding = { top: 20, right: 40, bottom: 30, left: 60 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const xScale = (index) => (index / Math.max(chartData.length - 1, 1)) * innerWidth + padding.left;
  const yScale = (value) => innerHeight - ((value / maxGasto) * innerHeight) + padding.top;

  const linePath = chartData.map((d, i) => {
    const x = xScale(i);
    const y = yScale(d.total);
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(' ');

  const areaPath = chartData.length > 0
    ? `${linePath} L ${xScale(chartData.length - 1)} ${innerHeight + padding.top} L ${padding.left} ${innerHeight + padding.top} Z`
    : '';

  const formatMes = (mesStr) => {
    const [, month] = mesStr.split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return meses[parseInt(month) - 1] || mesStr;
  };

  // ========================
  // DATOS DE MANTENIMIENTO
  // ========================
  const maintStats = getOperationalStats();

  const maintCostData = useMemo(() => {
    if (!tasks || tasks.length === 0) return {
      totalCost: 0, avgCost: 0, tasksWithCost: 0,
      byType: [], completedWithCost: []
    };

    const completed = tasks.filter(t => t.estado === 'completada');
    const withCost = completed.filter(t => t.costo && t.costo > 0);
    const totalCost = withCost.reduce((sum, t) => sum + t.costo, 0);
    const avgCost = withCost.length > 0 ? totalCost / withCost.length : 0;

    // Desglose por tipo
    const typeMap = {};
    withCost.forEach(t => {
      const tipo = t.tipo || 'otro';
      if (!typeMap[tipo]) typeMap[tipo] = { valor: 0, cantidad: 0 };
      typeMap[tipo].valor += t.costo;
      typeMap[tipo].cantidad += 1;
    });

    const byType = Object.entries(typeMap).map(([tipo, data]) => ({
      tipo,
      valor: Math.round(data.valor * 100) / 100,
      cantidad: data.cantidad,
      porcentaje: totalCost > 0 ? ((data.valor / totalCost) * 100).toFixed(1) : '0'
    }));

    // Tareas completadas con costo, ordenadas por fecha
    const completedWithCost = withCost
      .sort((a, b) => {
        const dateA = a.fecha_completada || a.fecha_programada || '';
        const dateB = b.fecha_completada || b.fecha_programada || '';
        return dateB.localeCompare(dateA);
      })
      .slice(0, 15);

    return { totalCost, avgCost, tasksWithCost: withCost.length, byType, completedWithCost };
  }, [tasks]);

  // ========================
  // DATOS RESUMEN
  // ========================
  const costoTotalOperacional = (valorTotalInventario || 0) + (maintCostData.totalCost || 0);
  const pctInventario = costoTotalOperacional > 0
    ? ((valorTotalInventario / costoTotalOperacional) * 100).toFixed(1)
    : '0';
  const pctMantenimiento = costoTotalOperacional > 0
    ? ((maintCostData.totalCost / costoTotalOperacional) * 100).toFixed(1)
    : '0';

  // Iconos y colores por tipo mantenimiento
  const maintTipoConfig = {
    preventivo: { icon: <Shield size={24} />, color: 'var(--color-info)', bgColor: 'rgba(var(--color-info-rgb), 0.1)', nombre: 'Preventivo' },
    correctivo: { icon: <Wrench size={24} />, color: 'var(--color-error)', bgColor: 'rgba(var(--color-error-rgb), 0.1)', nombre: 'Correctivo' },
    'inspección': { icon: <ClipboardList size={24} />, color: 'var(--color-warning)', bgColor: 'rgba(var(--color-warning-rgb), 0.1)', nombre: 'Inspección' }
  };

  // ========================
  // TABS CONFIG — filtrar por módulos activos en la org.
  // Resumen siempre visible (agregado de lo que haya). Tabs específicos
  // sólo si la org contrató el módulo correspondiente.
  // ========================
  const tabs = useMemo(() => {
    const all = [
      { id: 'resumen', label: 'Resumen', icon: <PieChart size={16} />, modulo: null },
      { id: 'inventario', label: 'Inventario', icon: <Package size={16} />, modulo: 'INV' },
      { id: 'mantenimiento', label: 'Mantenimiento', icon: <Wrench size={16} />, modulo: 'MTO' },
    ];
    return all.filter((t) => t.modulo === null || hasModulo(t.modulo));
  }, [hasModulo]);

  // Si el tab activo dejó de estar disponible, volver a resumen.
  useEffect(() => {
    if (!tabs.find((t) => t.id === activeTab)) setActiveTab('resumen');
  }, [tabs, activeTab]);

  return (
    <div className="costos-v2">
      {/* Header */}
      <div className="costos-header-v2">
        <div className="costos-header-info">
          <div className="costos-header-icon">
            <DollarSign size={28} />
          </div>
          <div className="costos-header-text">
            <h2>Analisis de Costos</h2>
            <p>Costos de inventario y mantenimiento</p>
          </div>
        </div>

        <div className="costos-header-stats">
          <div className="costos-stat-pill success">
            <span className="stat-number">B/. {costoTotalOperacional.toLocaleString()}</span>
            <span className="stat-label">Total</span>
          </div>
          {hasInv && (
            <div className="costos-stat-pill info">
              <span className="stat-number">B/. {(valorTotalInventario || 0).toLocaleString()}</span>
              <span className="stat-label">Inventario</span>
            </div>
          )}
          {hasMto && (
            <div className="costos-stat-pill warning">
              <span className="stat-number">B/. {maintCostData.totalCost.toLocaleString()}</span>
              <span className="stat-label">Mant.</span>
            </div>
          )}
        </div>
      </div>

      {/* Tab Selector */}
      <div className="costos-tab-selector">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`costos-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ===================== TAB: RESUMEN ===================== */}
      {activeTab === 'resumen' && (
        <div className="costos-tab-content">
          <div className="kpi-summary-grid">
            <div className="kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'rgba(var(--color-info-rgb), 0.1)' }}>
                <DollarSign size={32} style={{ color: 'var(--color-info)' }} />
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Costo Total Operacional</div>
                <div className="kpi-value">B/. {costoTotalOperacional.toLocaleString()}</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)' }}>
                <Package size={32} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Valor Inventario</div>
                <div className="kpi-value">B/. {(valorTotalInventario || 0).toLocaleString()}</div>
                <div className="kpi-change" style={{ color: 'var(--color-text-secondary)' }}>
                  <span>{pctInventario}% del total</span>
                </div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'rgba(var(--color-warning-rgb), 0.1)' }}>
                <Wrench size={32} style={{ color: 'var(--color-warning)' }} />
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Costo Mantenimiento</div>
                <div className="kpi-value">B/. {maintCostData.totalCost.toLocaleString()}</div>
                <div className="kpi-change" style={{ color: 'var(--color-text-secondary)' }}>
                  <span>{pctMantenimiento}% del total</span>
                </div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'rgba(var(--color-success-rgb), 0.1)' }}>
                <ShoppingCart size={32} style={{ color: 'var(--color-success)' }} />
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Gasto Inventario Este Mes</div>
                <div className="kpi-value">B/. {gastoMesActual.toLocaleString()}</div>
                {gastoMesAnterior > 0 && (
                  <div className={`kpi-change ${cambioMensual >= 0 ? 'positive' : 'negative'}`}>
                    {cambioMensual >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    <span>{Math.abs(cambioMensual)}% vs mes anterior</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Barra de distribución */}
          {costoTotalOperacional > 0 && (
            <div className="costos-distribution-section">
              <h3>Distribucion de Costos</h3>
              <div className="costos-distribution-card">
                <div className="distribution-bar-container">
                  <div className="distribution-bar">
                    <div
                      className="distribution-segment inventario"
                      style={{ width: `${pctInventario}%` }}
                    />
                    <div
                      className="distribution-segment mantenimiento"
                      style={{ width: `${pctMantenimiento}%` }}
                    />
                  </div>
                  <div className="distribution-legend">
                    <div className="distribution-legend-item">
                      <span className="distribution-dot inventario" />
                      <span className="distribution-label">Inventario</span>
                      <span className="distribution-value">B/. {(valorTotalInventario || 0).toLocaleString()} ({pctInventario}%)</span>
                    </div>
                    <div className="distribution-legend-item">
                      <span className="distribution-dot mantenimiento" />
                      <span className="distribution-label">Mantenimiento</span>
                      <span className="distribution-value">B/. {maintCostData.totalCost.toLocaleString()} ({pctMantenimiento}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB: INVENTARIO ===================== */}
      {activeTab === 'inventario' && (
        <div className="costos-tab-content">
          {/* KPI Cards Inventario */}
          <div className="kpi-summary-grid">
            <div className="kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'rgba(var(--color-info-rgb), 0.08)' }}>
                <DollarSign size={32} style={{ color: 'var(--color-info)' }} />
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Valor Total Inventario</div>
                <div className="kpi-value">B/. {(valorTotalInventario || 0).toLocaleString()}</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'rgba(var(--color-primary-rgb), 0.08)' }}>
                <ShoppingCart size={32} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Gastado Este Mes</div>
                <div className="kpi-value">B/. {gastoMesActual.toLocaleString()}</div>
                {gastoMesAnterior > 0 && (
                  <div className={`kpi-change ${cambioMensual >= 0 ? 'positive' : 'negative'}`}>
                    {cambioMensual >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    <span>{Math.abs(cambioMensual)}% vs mes anterior</span>
                  </div>
                )}
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'rgba(var(--color-warning-rgb), 0.08)' }}>
                <Package size={32} style={{ color: 'var(--color-warning)' }} />
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Total de Items</div>
                <div className="kpi-value">{totalItems}</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'rgba(var(--color-success-rgb), 0.08)' }}>
                <Calendar size={32} style={{ color: 'var(--color-success)' }} />
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Promedio Mensual</div>
                <div className="kpi-value">
                  B/. {chartData.length > 0
                    ? Math.round(chartData.reduce((sum, d) => sum + d.total, 0) / chartData.length).toLocaleString()
                    : '0'}
                </div>
              </div>
            </div>
          </div>

          {/* Desglose por Tipo */}
          <div className="breakdown-section">
            <h3>Desglose por Tipo de Articulo</h3>
            <div className="breakdown-grid">
              {costosPorTipo.map((tipo, idx) => {
                const config = tipoConfig[tipo.tipo] || { icon: <Package size={24} />, color: 'var(--color-text-tertiary)', bgColor: 'var(--color-surface-secondary)', nombre: tipo.tipo };
                return (
                  <div key={idx} className="breakdown-card" style={{ borderLeft: `4px solid ${config.color}` }}>
                    <div className="breakdown-header">
                      <div className="breakdown-icon" style={{ backgroundColor: config.bgColor }}>
                        {config.icon}
                      </div>
                      <div className="breakdown-info">
                        <span className="breakdown-category">{config.nombre}</span>
                        <span className="breakdown-percentage">{tipo.porcentaje}%</span>
                      </div>
                    </div>
                    <div className="breakdown-amount">
                      B/. {tipo.valor.toLocaleString()}
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
            <div className="tendencia-header">
              <h3>Tendencia de Gastos en Compras</h3>
              <div className="period-selector-v2 period-selector-inline">
                <button className={selectedPeriod === '6' ? 'active' : ''} onClick={() => setSelectedPeriod('6')}>
                  6 Meses
                </button>
                <button className={selectedPeriod === '12' ? 'active' : ''} onClick={() => setSelectedPeriod('12')}>
                  12 Meses
                </button>
              </div>
            </div>
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
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
                    const y = innerHeight * (1 - t) + padding.top;
                    const value = Math.round(maxGasto * t);
                    return (
                      <g key={i}>
                        <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="var(--color-border)" strokeDasharray="4" />
                        <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="var(--color-text-tertiary)">
                          ${value}
                        </text>
                      </g>
                    );
                  })}

                  <path d={areaPath} fill="url(#areaGradientInventario)" />
                  <path d={linePath} fill="none" stroke="var(--color-primary)" strokeWidth="3" />

                  {chartData.map((d, i) => (
                    <g key={i}>
                      <circle cx={xScale(i)} cy={yScale(d.total)} r="5" fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth="2" />
                      <text x={xScale(i)} y={yScale(d.total) - 15} textAnchor="middle" fontSize="12" fill="var(--color-text-tertiary)">
                        ${d.total.toFixed(0)}
                      </text>
                    </g>
                  ))}

                  {chartData.map((d, i) => (
                    <text key={i} x={xScale(i)} y={chartHeight - 10} textAnchor="middle" fontSize="12" fill="var(--color-text-tertiary)">
                      {formatMes(d.mes)}
                    </text>
                  ))}
                </svg>
              )}
            </div>
          </div>

          {/* Top Items */}
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
                      <th>Codigo</th>
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
                      const config = tipoConfig[item.tipo_articulo] || { color: 'var(--color-text-tertiary)', bgColor: 'var(--color-surface-secondary)' };

                      return (
                        <tr key={idx}>
                          <td><strong>#{idx + 1}</strong></td>
                          <td><code>{item.codigo}</code></td>
                          <td><strong>{item.nombre}</strong></td>
                          <td>
                            <span className="tipo-badge" style={{ backgroundColor: config.bgColor, color: config.color }}>
                              {item.tipo_articulo}
                            </span>
                          </td>
                          <td>{item.cantidad} {item.unidad_medida || 'un.'}</td>
                          <td>B/. {item.precio_unitario.toFixed(2)}</td>
                          <td><strong>B/. {item.valor_total.toLocaleString()}</strong></td>
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
      )}

      {/* ===================== TAB: MANTENIMIENTO ===================== */}
      {activeTab === 'mantenimiento' && (
        <div className="costos-tab-content">
          {/* KPI Cards Mantenimiento */}
          <div className="kpi-summary-grid">
            <div className="kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'rgba(var(--color-warning-rgb), 0.1)' }}>
                <DollarSign size={32} style={{ color: 'var(--color-warning)' }} />
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Costo Total Mantenimiento</div>
                <div className="kpi-value">B/. {maintCostData.totalCost.toLocaleString()}</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'rgba(var(--color-info-rgb), 0.1)' }}>
                <BarChart3 size={32} style={{ color: 'var(--color-info)' }} />
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Costo Promedio por Tarea</div>
                <div className="kpi-value">B/. {maintCostData.avgCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'rgba(var(--color-success-rgb), 0.1)' }}>
                <CheckCircle size={32} style={{ color: 'var(--color-success)' }} />
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Tareas con Costo</div>
                <div className="kpi-value">{maintCostData.tasksWithCost}</div>
                <div className="kpi-change" style={{ color: 'var(--color-text-secondary)' }}>
                  <span>de {maintStats.completed} completadas</span>
                </div>
              </div>
            </div>
          </div>

          {/* Desglose por Tipo de Mantenimiento */}
          {maintCostData.byType.length > 0 && (
            <div className="breakdown-section">
              <h3>Desglose por Tipo de Mantenimiento</h3>
              <div className="breakdown-grid">
                {maintCostData.byType.map((tipo, idx) => {
                  const config = maintTipoConfig[tipo.tipo] || { icon: <Wrench size={24} />, color: 'var(--color-text-tertiary)', bgColor: 'var(--color-surface-secondary)', nombre: tipo.tipo };
                  return (
                    <div key={idx} className="breakdown-card" style={{ borderLeft: `4px solid ${config.color}` }}>
                      <div className="breakdown-header">
                        <div className="breakdown-icon" style={{ backgroundColor: config.bgColor }}>
                          {config.icon}
                        </div>
                        <div className="breakdown-info">
                          <span className="breakdown-category">{config.nombre}</span>
                          <span className="breakdown-percentage">{tipo.porcentaje}%</span>
                        </div>
                      </div>
                      <div className="breakdown-amount">
                        B/. {tipo.valor.toLocaleString()}
                      </div>
                      <div className="breakdown-meta">
                        {tipo.cantidad} {tipo.cantidad === 1 ? 'tarea' : 'tareas'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabla de Tareas con Costo */}
          <div className="top-items-section">
            <h3>Tareas Completadas con Costo</h3>
            <div className="top-items-table-container">
              {maintCostData.completedWithCost.length === 0 ? (
                <div className="empty-top-items">
                  <Wrench size={48} />
                  <p>No hay tareas de mantenimiento con costo registrado</p>
                </div>
              ) : (
                <table className="top-items-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Titulo</th>
                      <th>Tipo</th>
                      <th>Prioridad</th>
                      <th>Mecanico</th>
                      <th>Costo</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintCostData.completedWithCost.map((task, idx) => {
                      const config = maintTipoConfig[task.tipo] || { color: 'var(--color-text-tertiary)', bgColor: 'var(--color-surface-secondary)' };
                      const prioridadStyles = {
                        baja: { color: 'var(--color-success)', bg: 'rgba(var(--color-success-rgb), 0.1)' },
                        media: { color: 'var(--color-warning)', bg: 'rgba(var(--color-warning-rgb), 0.1)' },
                        alta: { color: 'var(--color-error)', bg: 'rgba(var(--color-error-rgb), 0.1)' },
                        urgente: { color: 'var(--color-error-contrast)', bg: 'rgba(var(--color-error-rgb), 0.15)' }
                      };
                      const prioridadStyle = prioridadStyles[task.prioridad] || { color: 'var(--color-text-tertiary)', bg: 'var(--color-surface-secondary)' };
                      return (
                        <tr key={task._id || idx}>
                          <td><strong>#{idx + 1}</strong></td>
                          <td><strong>{task.titulo}</strong></td>
                          <td>
                            <span className="tipo-badge" style={{ backgroundColor: config.bgColor, color: config.color }}>
                              {task.tipo}
                            </span>
                          </td>
                          <td>
                            <span className="tipo-badge" style={{
                              backgroundColor: prioridadStyle.bg,
                              color: prioridadStyle.color
                            }}>
                              {task.prioridad}
                            </span>
                          </td>
                          <td>{task.mecanico || '-'}</td>
                          <td><strong>B/. {task.costo.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                          <td>{task.fecha_completada || task.fecha_programada || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostosComponent;
