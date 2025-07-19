import { useState, useEffect } from 'react';
import { appData } from '../../data/mockData';
import './ReportsComponent.css';

const ReportsComponent = ({ userType = 'admin' }) => {
  const [dateRange, setDateRange] = useState({
    inicio: new Date().toISOString().split('T')[0],
    fin: new Date().toISOString().split('T')[0]
  });
  const [filterTruck, setFilterTruck] = useState('todos');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('todos');
  const [reportData, setReportData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);

  // Generar datos del reporte automáticamente
  useEffect(() => {
    generateReportData();
  }, [dateRange, filterTruck, serviceTypeFilter]);

  const generateReportData = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const data = calculateReportMetrics();
      setReportData(data);
      setIsGenerating(false);
    }, 800);
  };

  const calculateReportMetrics = () => {
    let camiones = appData.camiones.filter(c => filterTruck === 'todos' ? true : c.id === filterTruck);
    if (serviceTypeFilter !== 'todos') {
      camiones = camiones.filter(c => c.tipoServicio === serviceTypeFilter);
    }
    
    const totalKgRecolectado = camiones
      .filter(c => c.tipoServicio === 'recoleccion')
      .reduce((total, camion) => total + (camion.pesoAcumulado || 0), 0);

    const totalAreaFumigada = camiones
      .filter(c => c.tipoServicio === 'fumigacion')
      .reduce((total, camion) => total + (camion.areaFumigada || 0), 0);

    const rutasCompletadas = camiones.filter(c => c.estado === 'Completado').length;
    const rutasEnProgreso = camiones.filter(c => c.estado === 'En ruta').length;

    // Obtener reportes de rutas completadas del periodo
    const fechaInicio = new Date(dateRange.inicio);
    const fechaFin = new Date(dateRange.fin);
    const routeReports = window.routeReports || [];
    
    const reportesDelPeriodo = routeReports.filter(report => {
      const reportDate = new Date(report.completedAt);
      return reportDate >= fechaInicio && reportDate <= fechaFin;
    });

    // Generar datos de trabajo real para el periodo seleccionado
    const trabajosPorDia = [];
    const diasDiferencia = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24)) + 1;
    
    for (let i = 0; i < diasDiferencia; i++) {
      const fecha = new Date(fechaInicio);
      fecha.setDate(fecha.getDate() + i);
      
      // Obtener reportes reales del día
      const reportesDelDia = reportesDelPeriodo.filter(report => {
        const reportDate = new Date(report.completedAt);
        return reportDate.toDateString() === fecha.toDateString();
      });

      // Si no hay reportes reales, simular trabajo
      const rutasDelDia = reportesDelDia.length > 0 ? reportesDelDia.map(report => ({
        nombre: report.routeName,
        fecha: fecha.toLocaleDateString('es-ES'),
        conductor: report.driverName,
        camion: report.truckId,
        paradasCompletadas: report.stopsCompleted,
        paradasFallidas: report.totalStops - report.stopsCompleted,
        totalParadas: report.totalStops,
        horaInicio: '08:00',
        horaFin: '16:30',
        estado: 'Completada',
        promedioCategoria: report.averageCategory,
        duracion: report.duration,
        tipoServicio: report.serviceType,
        esReporteReal: true
      })) : appData.rutas.filter(ruta => {
        // Filtrar por tipo de servicio si está especificado
        if (serviceTypeFilter !== 'todos') {
          return ruta.tipo === serviceTypeFilter;
        }
        return true;
      }).map(ruta => {
        const camionAsignado = camiones.find(c => c.rutaAsignada === ruta.nombre);
        return {
          ...ruta,
          fecha: fecha.toLocaleDateString('es-ES'),
          conductor: camionAsignado ? camionAsignado.conductor : 'Sin asignar',
          camion: camionAsignado ? camionAsignado.id : 'Sin asignar',
          paradasCompletadas: Math.floor(Math.random() * ruta.paradas.length),
          paradasFallidas: Math.floor(Math.random() * 3),
          totalParadas: ruta.paradas.length,
          horaInicio: '08:00',
          horaFin: '16:30',
          estado: Math.random() > 0.1 ? 'Completada' : 'Parcial',
          promedioCategoria: ['Bajo', 'Intermedio', 'Alto'][Math.floor(Math.random() * 3)],
          esReporteReal: false
        };
      });
      
      trabajosPorDia.push({
        fecha: fecha.toLocaleDateString('es-ES'),
        rutas: rutasDelDia
      });
    }

    return {
      resumen: {
        totalVehiculos: camiones.length,
        rutasCompletadas,
        rutasEnProgreso,
        totalKgRecolectado,
        totalAreaFumigada,
        diasTrabajados: diasDiferencia,
        totalRutasEjecutadas: trabajosPorDia.reduce((total, dia) => total + dia.rutas.length, 0),
        reportesReales: reportesDelPeriodo.length
      },
      trabajoDetallado: trabajosPorDia,
      tipoServicio: serviceTypeFilter,
      fechaGeneracion: new Date().toLocaleString('es-ES')
    };
  };

  const handleViewDetail = (type) => {
    setSelectedDetail(type);
    setShowDetailModal(true);
  };

  const handleExportPDF = () => {
    if (!reportData) return;
    
    const reportTitle = `Reporte_${serviceTypeFilter}_${dateRange.inicio}_${dateRange.fin}`;
    
    // Crear contenido del reporte
    const content = generateReportContent();
    
    // Simular descarga de PDF
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportTitle}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert(`📄 Reporte PDF generado: ${reportTitle}.pdf`);
  };

  const handleExportExcel = () => {
    if (!reportData) return;
    
    const reportTitle = `Reporte_${serviceTypeFilter}_${dateRange.inicio}_${dateRange.fin}`;
    
    // Crear contenido CSV
    const csvContent = generateCSVContent();
    
    // Simular descarga de Excel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportTitle}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert(`📊 Reporte Excel generado: ${reportTitle}.csv`);
  };

  const generateReportContent = () => {
    if (!reportData) return '';
    
    let content = `REPORTE OPERATIVO RMP\n`;
    content += `Tipo de Servicio: ${getServiceTypeLabel(serviceTypeFilter)}\n`;
    content += `Período: ${dateRange.inicio} al ${dateRange.fin}\n`;
    content += `Generado: ${reportData.fechaGeneracion}\n\n`;
    
    content += `RESUMEN:\n`;
    content += `- Días trabajados: ${reportData.resumen.diasTrabajados}\n`;
    content += `- Rutas ejecutadas: ${reportData.resumen.totalRutasEjecutadas}\n`;
    content += `- Vehículos utilizados: ${reportData.resumen.totalVehiculos}\n`;
    
    if (serviceTypeFilter === 'recoleccion') {
      content += `- Total recolectado: ${reportData.resumen.totalKgRecolectado} kg\n`;
    }
    if (serviceTypeFilter === 'fumigacion') {
      content += `- Total fumigado: ${reportData.resumen.totalAreaFumigada} m²\n`;
    }
    
    content += `\nDETALLE POR DÍAS:\n`;
    reportData.trabajoDetallado.forEach(dia => {
      content += `\n${dia.fecha} (${dia.rutas.length} rutas):\n`;
      dia.rutas.forEach(ruta => {
        content += `  - ${ruta.nombre}: ${ruta.conductor} (${ruta.camion})\n`;
        content += `    Paradas: ${ruta.paradasCompletadas}/${ruta.totalParadas}\n`;
        content += `    Carga: ${ruta.promedioCategoria || 'N/A'}\n`;
        content += `    Estado: ${ruta.estado}\n`;
      });
    });
    
    return content;
  };

  const generateCSVContent = () => {
    if (!reportData) return '';
    
    let csv = 'Fecha,Ruta,Conductor,Camion,Paradas Completadas,Total Paradas,Carga Promedio,Estado,Tipo Servicio\n';
    
    reportData.trabajoDetallado.forEach(dia => {
      dia.rutas.forEach(ruta => {
        csv += `"${dia.fecha}","${ruta.nombre}","${ruta.conductor}","${ruta.camion}",${ruta.paradasCompletadas},${ruta.totalParadas},"${ruta.promedioCategoria || 'N/A'}","${ruta.estado}","${ruta.tipoServicio || 'N/A'}"\n`;
      });
    });
    
    return csv;
  };

  const getServiceTypeLabel = (type) => {
    switch(type) {
      case 'recoleccion': return 'Recolección';
      case 'fumigacion': return 'Fumigación';
      default: return 'General';
    }
  };

  if (isGenerating) {
    return (
      <div className="reports-container">
        <div className="reports-loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Generando reporte...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-container">
      <div className="reports-header">
        <div className="reports-title">
          <h2>📈 Reportes Operativos</h2>
          <p>Genera y exporta reportes detallados del trabajo realizado</p>
        </div>
        <div className="reports-actions">
          <button 
            className="btn btn--success" 
            onClick={handleExportPDF}
            disabled={!reportData}
          >
            📄 Exportar PDF
          </button>
          <button 
            className="btn btn--info" 
            onClick={handleExportExcel}
            disabled={!reportData}
          >
            📊 Exportar Excel
          </button>
        </div>
      </div>

      <div className="reports-filters">
        <div className="filter-row">
          <div className="filter-group">
            <label>📅 Fecha de Inicio:</label>
            <input
              type="date"
              value={dateRange.inicio}
              onChange={(e) => setDateRange(prev => ({ ...prev, inicio: e.target.value }))}
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <label>📅 Fecha de Fin:</label>
            <input
              type="date"
              value={dateRange.fin}
              onChange={(e) => setDateRange(prev => ({ ...prev, fin: e.target.value }))}
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <label>🚛 Vehículo:</label>
            <select
              value={filterTruck}
              onChange={(e) => setFilterTruck(e.target.value)}
              className="filter-select"
            >
              <option value="todos">Todos los vehículos</option>
              {appData.camiones.map(camion => (
                <option key={camion.id} value={camion.id}>
                  {camion.id} - {camion.conductor}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>🎯 Tipo de Servicio:</label>
            <select
              value={serviceTypeFilter}
              onChange={(e) => setServiceTypeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="todos">Todos los servicios</option>
              <option value="recoleccion">🗑️ Recolección</option>
              <option value="fumigacion">🦟 Fumigación</option>
            </select>
          </div>
        </div>
        <div className="filter-actions">
          <button 
            className="btn btn--primary"
            onClick={generateReportData}
            disabled={isGenerating}
          >
            {isGenerating ? '⏳ Generando...' : '🔍 Generar Reporte'}
          </button>
        </div>
      </div>

      {reportData && (
        <div className="reports-content">
          {/* Resumen compacto */}
          <div className="report-summary compact">
            <div className="summary-header">
              <h3>📊 Resumen - {getServiceTypeLabel(serviceTypeFilter)}</h3>
              <span className="report-date">{reportData.fechaGeneracion}</span>
            </div>
            
            <div className="summary-metrics compact">
              <div className="metric-card compact">
                <div className="metric-icon">📅</div>
                <div className="metric-data">
                  <div className="metric-value">{reportData.resumen.diasTrabajados}</div>
                  <div className="metric-label">Días</div>
                </div>
              </div>
              
              <div className="metric-card compact">
                <div className="metric-icon">🗺️</div>
                <div className="metric-data">
                  <div className="metric-value">{reportData.resumen.totalRutasEjecutadas}</div>
                  <div className="metric-label">Rutas Ejecutadas</div>
                </div>
              </div>
              
              <div className="metric-card compact">
                <div className="metric-icon">🚛</div>
                <div className="metric-data">
                  <div className="metric-value">{reportData.resumen.totalVehiculos}</div>
                  <div className="metric-label">Vehículos</div>
                </div>
              </div>
              
              {serviceTypeFilter === 'recoleccion' && (
                <div className="metric-card compact">
                  <div className="metric-icon">📦</div>
                  <div className="metric-data">
                    <div className="metric-value">{reportData.resumen.totalKgRecolectado} kg</div>
                    <div className="metric-label">Recolectado</div>
                  </div>
                </div>
              )}
              
              {serviceTypeFilter === 'fumigacion' && (
                <div className="metric-card compact">
                  <div className="metric-icon">🦟</div>
                  <div className="metric-data">
                    <div className="metric-value">{reportData.resumen.totalAreaFumigada} m²</div>
                    <div className="metric-label">Fumigado</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Trabajo detallado por día */}
          <div className="work-detail-section">
            <div className="section-header">
              <h3>📋 Trabajo Detallado del Período</h3>
              <div className="section-actions">
                <button 
                  className="btn btn--outline btn--small"
                  onClick={() => setShowDetailModal(true)}
                >
                  📊 Vista Resumida
                </button>
              </div>
            </div>
            
            <div className="work-days-container">
              {reportData.trabajoDetallado.map((dia, index) => (
                <div key={index} className="work-day-card">
                  <div className="work-day-header">
                    <h4>📅 {dia.fecha}</h4>
                    <div className="day-summary">
                      <span className="routes-count">{dia.rutas.length} rutas</span>
                      <span className="total-stops">
                        {dia.rutas.reduce((total, ruta) => total + ruta.paradasCompletadas, 0)} paradas
                      </span>
                    </div>
                  </div>
                  <div className="work-day-routes">
                    {dia.rutas.map((ruta, rutaIndex) => (
                      <div key={rutaIndex} className="route-work-item">
                        <div className="route-header">
                          <div className="route-info">
                            <div className="route-name">🗺️ {ruta.nombre}</div>
                            <div className="route-conductor">👨‍💼 {ruta.conductor}</div>
                          </div>
                          <div className="route-status-section">
                            <div className={`route-status status-${ruta.estado.toLowerCase()}`}>
                              {ruta.estado}
                            </div>
                            {ruta.esReporteReal && (
                              <div className="real-report-badge">📊 Real</div>
                            )}
                          </div>
                        </div>
                        <div className="route-details">
                          <div className="route-metrics">
                            <div className="metric">
                              <span className="metric-icon">🚛</span>
                              <span className="metric-value">{ruta.camion}</span>
                            </div>
                            <div className="metric">
                              <span className="metric-icon">📍</span>
                              <span className="metric-value">{ruta.paradasCompletadas}/{ruta.totalParadas}</span>
                            </div>
                            <div className="metric">
                              <span className="metric-icon">📦</span>
                              <span className={`metric-value category-${ruta.promedioCategoria?.toLowerCase() || 'bajo'}`}>
                                {ruta.promedioCategoria || 'Bajo'}
                              </span>
                            </div>
                            <div className="metric">
                              <span className="metric-icon">⏰</span>
                              <span className="metric-value">{ruta.horaInicio} - {ruta.horaFin}</span>
                            </div>
                          </div>
                          {ruta.paradasFallidas > 0 && (
                            <div className="failed-stops-alert">
                              ⚠️ {ruta.paradasFallidas} paradas fallidas
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
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

export default ReportsComponent;