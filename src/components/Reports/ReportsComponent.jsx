import { useState, useEffect } from 'react';
import { appData } from '../../data/mockData';
import './ReportsComponent.css';

const ReportsComponent = ({ userType = 'admin' }) => {
  const [activeReportTab, setActiveReportTab] = useState('operational');
  const [dateRange, setDateRange] = useState({
    inicio: new Date().toISOString().split('T')[0],
    fin: new Date().toISOString().split('T')[0]
  });
  const [filterTruck, setFilterTruck] = useState('todos');
  const [reportData, setReportData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoReportConfig, setAutoReportConfig] = useState({
    enabled: false,
    frequency: 'diario',
    time: '08:00',
    recipients: []
  });

  // Generar datos del reporte automáticamente
  useEffect(() => {
    generateReportData();
  }, [dateRange, activeReportTab, filterTruck]);

  const generateReportData = () => {
    setIsGenerating(true);
    
    // Simular procesamiento
    setTimeout(() => {
      const data = calculateReportMetrics();
      setReportData(data);
      setIsGenerating(false);
    }, 1500);
  };

  const calculateReportMetrics = () => {
    const camiones = appData.camiones.filter(c => filterTruck === 'todos' ? true : c.id === filterTruck);
    const rutas = appData.rutas;
    
    // Calcular métricas operativas
    const totalKgRecolectado = camiones.reduce((total, camion) => total + camion.pesoAcumulado, 0);
    const rutasCompletadas = camiones.filter(c => c.estado === 'En ruta').length;
    const eficienciaPromedio = camiones.reduce((total, camion) => {
      if (camion.estado === 'En ruta' && camion.totalParadas > 0) {
        return total + (camion.paradaActual / camion.totalParadas) * 100;
      }
      return total;
    }, 0) / camiones.filter(c => c.estado === 'En ruta').length || 0;

    // Análisis por zona
    const analisisPorZona = rutas.map(ruta => {
      const camion = camiones.find(c => c.rutaAsignada === ruta.nombre);
      const pesoTotal = ruta.paradas.reduce((total, parada) => total + (parada.pesoRecolectado || 0), 0);
      const paradaCompletadas = camion ? camion.paradaActual : 0;
      const totalParadas = ruta.paradas.length;
      
      return {
        zona: ruta.nombre,
        pesoRecolectado: pesoTotal,
        paradaCompletadas,
        totalParadas,
        cumplimiento: ((paradaCompletadas / totalParadas) * 100).toFixed(1),
        eficiencia: camion ? ((camion.pesoAcumulado / pesoTotal) * 100).toFixed(1) : 0
      };
    });

    // Análisis de frecuencia de servicio
    const frecuenciaServicio = {
      diario: rutas.length,
      semanal: rutas.length * 7,
      mensual: rutas.length * 30,
      cumplimientoDiario: ((rutasCompletadas / rutas.length) * 100).toFixed(1)
    };

    // Productividad por conductor
    const productividadConductores = camiones.map(camion => ({
      conductor: camion.conductor,
      camion: camion.id,
      pesoRecolectado: camion.pesoAcumulado,
      paradaCompletadas: camion.paradaActual,
      eficiencia: camion.totalParadas > 0 ? ((camion.paradaActual / camion.totalParadas) * 100).toFixed(1) : 0,
      combustibleUsado: 100 - camion.combustible,
      horasActivas: Math.floor(Math.random() * 8) + 1
    }));

    return {
      resumenOperativo: {
        totalKgRecolectado: Math.round(totalKgRecolectado),
        rutasCompletadas,
        totalRutas: rutas.length,
        eficienciaPromedio: Math.round(eficienciaPromedio),
        camioneActivos: camiones.filter(c => c.estado !== 'En mantenimiento').length,
        totalCamiones: camiones.length
      },
      analisisPorZona,
      frecuenciaServicio,
      productividadConductores: filterTruck === 'todos' ? productividadConductores : productividadConductores.filter(p => p.camion === filterTruck),
      tendencias: generateTrendData()
    };
  };

  const generateTrendData = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      days.push({
        fecha: date.toLocaleDateString('es-ES'),
        pesoRecolectado: Math.floor(Math.random() * 2000) + 1500,
        rutasCumplidas: Math.floor(Math.random() * 5) + 3,
        eficiencia: Math.floor(Math.random() * 20) + 80
      });
    }
    return days;
  };

  const exportToPDF = () => {
    // Simular exportación a PDF
    const blob = new Blob([`REPORTE OPERATIVO - RMP
Fecha: ${new Date().toLocaleDateString('es-ES')}
Período: ${dateRange.inicio} al ${dateRange.fin}

RESUMEN EJECUTIVO:
- Total Carga Recolectada: ${reportData?.resumenOperativo.totalKgRecolectado}
- Rutas Completadas: ${reportData?.resumenOperativo.rutasCompletadas}/${reportData?.resumenOperativo.totalRutas}
- Eficiencia Promedio: ${reportData?.resumenOperativo.eficienciaPromedio}%

ANÁLISIS POR ZONA:
${reportData?.analisisPorZona.map(zona => 
  `${zona.zona}: ${zona.pesoRecolectado} - Cumplimiento: ${zona.cumplimiento}%`
).join('\n')}
`], { type: 'text/plain' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-operativo-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    // Simular exportación a Excel (CSV)
    const csvData = [
      ['Zona', 'Carga Recolectada', 'Paradas Completadas', 'Total Paradas', 'Cumplimiento (%)'],
      ...reportData?.analisisPorZona.map(zona => [
        zona.zona,
        zona.pesoRecolectado,
        zona.paradaCompletadas,
        zona.totalParadas,
        zona.cumplimiento
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-analisis-zonas-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const scheduleAutoReport = () => {
    // Simular programación de reporte automático
    setAutoReportConfig(prev => ({ ...prev, enabled: !prev.enabled }));
    
    if (!autoReportConfig.enabled) {
      alert(`✅ Reporte automático programado:\n• Frecuencia: ${autoReportConfig.frequency}\n• Hora: ${autoReportConfig.time}\n• Se enviará por email`);
    } else {
      alert('❌ Reporte automático desactivado');
    }
  };

  const renderOperationalReport = () => (
    <div className="report-content">
      <div className="report-summary">
        <h3>📊 Resumen Operativo</h3>
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-icon">📦</div>
            <div className="summary-data">
              <div className="summary-value">{reportData?.resumenOperativo.totalKgRecolectado.toLocaleString()}</div>
              <div className="summary-label">Carga Recolectada</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">🗺️</div>
            <div className="summary-data">
              <div className="summary-value">
                {reportData?.resumenOperativo.rutasCompletadas}/{reportData?.resumenOperativo.totalRutas}
              </div>
              <div className="summary-label">Rutas Completadas</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">⚡</div>
            <div className="summary-data">
              <div className="summary-value">{reportData?.resumenOperativo.eficienciaPromedio}%</div>
              <div className="summary-label">Eficiencia Promedio</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">🚛</div>
            <div className="summary-data">
              <div className="summary-value">
                {reportData?.resumenOperativo.camioneActivos}/{reportData?.resumenOperativo.totalCamiones}
              </div>
              <div className="summary-label">Camiones Activos</div>
            </div>
          </div>
        </div>
      </div>

      <div className="report-section">
        <h3>📍 Análisis por Zona</h3>
        <div className="table-wrapper">
          <table className="report-table">
            <thead>
              <tr>
                <th>Zona</th>
                <th>Carga Recolectada</th>
                <th>Paradas</th>
                <th>Cumplimiento</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {reportData?.analisisPorZona.map((zona, index) => (
                <tr key={index}>
                  <td>{zona.zona}</td>
                  <td>{zona.pesoRecolectado.toLocaleString()}</td>
                  <td>{zona.paradaCompletadas}/{zona.totalParadas}</td>
                  <td>
                    <div className="progress-cell">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${zona.cumplimiento}%` }}
                        ></div>
                      </div>
                      <span>{zona.cumplimiento}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status ${zona.cumplimiento > 80 ? 'status--success' : 
                      zona.cumplimiento > 60 ? 'status--warning' : 'status--danger'}`}>
                      {zona.cumplimiento > 80 ? 'Excelente' : 
                       zona.cumplimiento > 60 ? 'Regular' : 'Crítico'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="report-section">
        <h3>📈 Tendencias (Últimos 7 días)</h3>
        <div className="trends-grid">
          {reportData?.tendencias.map((day, index) => (
            <div key={index} className="trend-card">
              <div className="trend-date">{day.fecha}</div>
              <div className="trend-metrics">
                <div className="trend-metric">
                  <span className="trend-label">Carga:</span>
                  <span className="trend-value">{day.pesoRecolectado}</span>
                </div>
                <div className="trend-metric">
                  <span className="trend-label">Rutas:</span>
                  <span className="trend-value">{day.rutasCumplidas}</span>
                </div>
                <div className="trend-metric">
                  <span className="trend-label">Eficiencia:</span>
                  <span className="trend-value">{day.eficiencia}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderProductivityReport = () => (
    <div className="report-content">
      <div className="report-section">
        <h3>👥 Productividad por Conductor</h3>
        <div className="table-wrapper">
          <table className="report-table">
            <thead>
              <tr>
                <th>Conductor</th>
                <th>Camión</th>
                <th>Carga Recolectada</th>
                <th>Paradas Completadas</th>
                <th>Eficiencia</th>
                <th>Horas Activas</th>
                <th>Rendimiento</th>
              </tr>
            </thead>
            <tbody>
              {reportData?.productividadConductores.map((conductor, index) => (
                <tr key={index}>
                  <td>{conductor.conductor}</td>
                  <td>{conductor.camion}</td>
                  <td>{conductor.pesoRecolectado}</td>
                  <td>{conductor.paradaCompletadas}</td>
                  <td>{conductor.eficiencia}%</td>
                  <td>{conductor.horasActivas}h</td>
                  <td>
                    <span className={`performance ${
                      conductor.eficiencia > 80 ? 'performance--excellent' :
                      conductor.eficiencia > 60 ? 'performance--good' : 'performance--poor'
                    }`}>
                      {conductor.eficiencia > 80 ? '⭐ Excelente' :
                       conductor.eficiencia > 60 ? '✅ Bueno' : '⚠️ Mejorar'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderFrequencyReport = () => (
    <div className="report-content">
      <div className="report-section">
        <h3>🔄 Frecuencia de Servicio</h3>
        <div className="frequency-grid">
          <div className="frequency-card">
            <div className="frequency-icon">📅</div>
            <div className="frequency-data">
              <div className="frequency-value">{reportData?.frecuenciaServicio.diario}</div>
              <div className="frequency-label">Servicios Diarios</div>
            </div>
          </div>
          <div className="frequency-card">
            <div className="frequency-icon">📊</div>
            <div className="frequency-data">
              <div className="frequency-value">{reportData?.frecuenciaServicio.semanal}</div>
              <div className="frequency-label">Servicios Semanales</div>
            </div>
          </div>
          <div className="frequency-card">
            <div className="frequency-icon">📈</div>
            <div className="frequency-data">
              <div className="frequency-value">{reportData?.frecuenciaServicio.mensual}</div>
              <div className="frequency-label">Servicios Mensuales</div>
            </div>
          </div>
          <div className="frequency-card">
            <div className="frequency-icon">✅</div>
            <div className="frequency-data">
              <div className="frequency-value">{reportData?.frecuenciaServicio.cumplimientoDiario}%</div>
              <div className="frequency-label">Cumplimiento Diario</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="reports-container">
      <div className="reports-header">
        <div className="reports-title">
          <h2>📊 Sistema de Reportes Automáticos</h2>
          <p>Indicadores operativos y análisis de gestión</p>
        </div>
        
        <div className="reports-controls">
          <div className="date-range">
            <label>Desde:</label>
            <input 
              type="date" 
              value={dateRange.inicio}
              onChange={(e) => setDateRange(prev => ({ ...prev, inicio: e.target.value }))}
            />
            <label>Hasta:</label>
            <input 
              type="date" 
              value={dateRange.fin}
              onChange={(e) => setDateRange(prev => ({ ...prev, fin: e.target.value }))}
            />
            <div className="quick-range">
              <button className="btn btn--sm" onClick={() => setDateRange({ inicio: new Date().toISOString().split('T')[0], fin: new Date().toISOString().split('T')[0] })}>Hoy</button>
              <button className="btn btn--sm" onClick={() => setDateRange({ inicio: new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0], fin: new Date().toISOString().split('T')[0] })}>7d</button>
              <button className="btn btn--sm" onClick={() => setDateRange({ inicio: new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0], fin: new Date().toISOString().split('T')[0] })}>30d</button>
            </div>
          </div>
          <div className="truck-filter">
            <label>Camión:</label>
            <select value={filterTruck} onChange={e => setFilterTruck(e.target.value)}>
              <option value="todos">Todos</option>
              {appData.camiones.map(c => (
                <option key={c.id} value={c.id}>{c.id}</option>
              ))}
            </select>
          </div>
          
          <div className="report-actions">
            <button 
              className="btn btn--secondary"
              onClick={exportToPDF}
              disabled={!reportData}
            >
              📄 Exportar PDF
            </button>
            <button 
              className="btn btn--secondary"
              onClick={exportToExcel}
              disabled={!reportData}
            >
              📊 Exportar Excel
            </button>
            <button 
              className={`btn ${autoReportConfig.enabled ? 'btn--warning' : 'btn--primary'}`}
              onClick={scheduleAutoReport}
            >
              {autoReportConfig.enabled ? '⏹️ Detener Auto' : '⏰ Programar Auto'}
            </button>
          </div>
        </div>
      </div>

      <div className="reports-tabs">
        <button 
          className={`tab ${activeReportTab === 'operational' ? 'tab--active' : ''}`}
          onClick={() => setActiveReportTab('operational')}
        >
          📊 Operativo
        </button>
        <button 
          className={`tab ${activeReportTab === 'productivity' ? 'tab--active' : ''}`}
          onClick={() => setActiveReportTab('productivity')}
        >
          👥 Productividad
        </button>
        <button 
          className={`tab ${activeReportTab === 'frequency' ? 'tab--active' : ''}`}
          onClick={() => setActiveReportTab('frequency')}
        >
          🔄 Frecuencia
        </button>
      </div>

      {isGenerating ? (
        <div className="reports-loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Generando reporte...</p>
          </div>
        </div>
      ) : (
        <div className="reports-body">
          {activeReportTab === 'operational' && renderOperationalReport()}
          {activeReportTab === 'productivity' && renderProductivityReport()}
          {activeReportTab === 'frequency' && renderFrequencyReport()}
        </div>
      )}

      {autoReportConfig.enabled && (
        <div className="auto-report-status">
          <div className="auto-report-indicator">
            <span className="status-dot status-dot--active"></span>
            <span>Reporte automático activo - {autoReportConfig.frequency} a las {autoReportConfig.time}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsComponent; 