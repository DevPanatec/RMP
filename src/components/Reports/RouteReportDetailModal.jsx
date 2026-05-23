import { lazy, Suspense } from 'react';
import { X, MapPin, Truck, Clock, UserCheck, Package, Calendar, FileText, AlertTriangle, Wrench, AlertOctagon, Camera } from '../Icons';
import { StorageImage } from '../UI';
import { useRiskReports } from '../../context/RiskReportsContext';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import './RouteReportDetailModal.css';

const MapLibreComponent = lazy(() => import('../Map/MapLibreComponent'));

// Helper para parsear fechas sin problemas de timezone
const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr.includes('T')) return new Date(dateStr);
  return new Date(dateStr + 'T00:00:00');
};

const RouteReportDetailModal = ({ report, onClose }) => {
  const { reports: allRiskReports } = useRiskReports();

  // Obtener historial GPS real del vehículo durante la ruta
  const vehicleHistory = useQuery(
    api.vehicleHistory.getVehicleHistory,
    report?.vehiculo_id ? {
      vehiculoId: report.vehiculo_id,
      startDate: new Date(report.fecha_inicio).getTime(),
      endDate: new Date(report.fecha_completacion).getTime()
    } : 'skip'
  );

  // Preparar datos del trail GPS real
  const gpsTrailData = vehicleHistory?.locations?.map(loc => ({
    lat: loc.gps_latitud,
    lng: loc.gps_longitud
  })) || [];

  if (!report) return null;

  // Obtener reportes de riesgo asociados a esta ruta
  const associatedRiskReports = (report.reportes_riesgo_ids || [])
    .map(riskId => allRiskReports.find(r => (r._id || r.id) === riskId))
    .filter(Boolean);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  // Preparar datos de paradas para el mapa
  const paradasConGPS = (report.paradas_completadas || [])
    .filter(p => p.completada && p.gps_completada)
    .map((p, idx) => ({
      ...p,
      lat: p.gps_completada?.lat || p.gps_completada?.latitud,
      lng: p.gps_completada?.lng || p.gps_completada?.longitud,
      index: idx
    }))
    .filter(p => p.lat && p.lng);

  // Preparar ruta para el mapa en el formato que espera MapComponent
  // Cruzar paradas originales con paradas_completadas para color por estado
  const completadasByIndex = (report.paradas_completadas || []).reduce((acc, p, idx) => {
    const key = p.parada_index ?? p.index ?? idx;
    acc[key] = p;
    return acc;
  }, {});

  const rutaParaMapa = [{
    _id: report._id || report.ruta_id || 'reporte-ruta',
    nombre: report.ruta_nombre,
    paradas: (report.ruta_paradas || []).map((p, idx) => {
      const lat = p.lat || p.latitud || p.gps_completada?.lat || p.gps_completada?.latitud;
      const lng = p.lng || p.longitud || p.gps_completada?.lng || p.gps_completada?.longitud;
      const completedInfo = completadasByIndex[idx];

      return {
        nombre: p.direccion || p.nombre || `Parada ${idx + 1}`,
        direccion: p.direccion || p.nombre,
        lat: lat,
        lng: lng,
        latitud: lat,
        longitud: lng,
        orden: p.orden || idx + 1,
        completada: completedInfo ? completedInfo.completada !== false : false,
        motivo_no_completada: completedInfo?.motivo_no_completada,
      };
    }).filter(p => p.lat && p.lng)
  }];

  // Calcular estadísticas
  const totalParadas = report.paradas_completadas?.length || 0;
  const completadas = report.paradas_completadas?.filter(p => p.completada).length || 0;
  const noCompletadas = totalParadas - completadas;
  const porcentaje = totalParadas > 0 ? Math.round((completadas / totalParadas) * 100) : 0;

  // Centro del mapa - calcular punto medio de TODAS las paradas
  const mapCenter = (() => {
    const paradasConGPS = rutaParaMapa[0]?.paradas?.filter(p => p.lat && p.lng) || [];

    if (paradasConGPS.length === 0) {
      return { lat: 8.983333, lng: -79.516670 }; // Panama City default
    }

    if (paradasConGPS.length === 1) {
      return { lat: paradasConGPS[0].lat, lng: paradasConGPS[0].lng };
    }

    // Calcular centro geográfico (promedio de lat/lng)
    const sumLat = paradasConGPS.reduce((sum, p) => sum + p.lat, 0);
    const sumLng = paradasConGPS.reduce((sum, p) => sum + p.lng, 0);

    return {
      lat: sumLat / paradasConGPS.length,
      lng: sumLng / paradasConGPS.length
    };
  })();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="route-report-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="route-report-header">
          <div className="route-report-title">
            <FileText size={24} />
            <div>
              <h2>{report.ruta_nombre}</h2>
              <p className="route-report-subtitle">Reporte de Ruta Completada</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Contenido */}
        <div className="route-report-body">
          {/* MAPA ARRIBA */}
          <div className="route-map-section">
            <h3><MapPin size={20} /> Mapa de Ruta ({rutaParaMapa[0]?.paradas?.length || 0} paradas)</h3>
            {rutaParaMapa[0]?.paradas?.length > 0 ? (
              <div className="route-map-container">
                <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Cargando mapa...</div>}>
                  <MapLibreComponent
                    key={`map-${report._id}`}
                    camiones={[]}
                    rutas={rutaParaMapa}
                    personnel={[]}
                    lugares={[]}
                    showRealTime={false}
                    gpsTrail={gpsTrailData}
                    showMapboxRoute={false}
                  />
                </Suspense>
              </div>
            ) : (
              <div className="route-map-container" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f3f4f6',
                color: '#6b7280'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <MapPin size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <p>No hay coordenadas GPS disponibles para esta ruta</p>
                </div>
              </div>
            )}
          </div>

          {/* STATS ABAJO */}
          <div className="route-report-stats">
            <div className="stat-card">
              <UserCheck size={20} />
              <div>
                <span className="stat-label">Conductor</span>
                <span className="stat-value">{report.conductor_nombre}</span>
              </div>
            </div>
            <div className="stat-card">
              <Truck size={20} />
              <div>
                <span className="stat-label">Vehículo</span>
                <span className="stat-value">{report.vehiculo_placa}</span>
              </div>
            </div>
            <div className="stat-card">
              <Clock size={20} />
              <div>
                <span className="stat-label">Tiempo Total</span>
                <span className="stat-value">{formatTime(report.tiempo_total_segundos)}</span>
              </div>
            </div>
            <div className="stat-card">
              <Calendar size={20} />
              <div>
                <span className="stat-label">Fecha</span>
                <span className="stat-value">
                  {parseLocalDate(report.fecha_completacion).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
            <div className="stat-card">
              <Package size={20} />
              <div>
                <span className="stat-label">Paradas</span>
                <span className="stat-value">{completadas} / {totalParadas}</span>
              </div>
            </div>
          </div>

          {/* Lista de paradas */}
          <div className="paradas-section">
            <h3><Package size={20} /> Paradas ({totalParadas})</h3>
            <div className="paradas-list">
              {(report.paradas_completadas || []).map((parada, idx) => {
                // 🆕 Buscar reporte de riesgo asociado a esta parada
                const paradaRiskReport = parada.reporte_riesgo_id
                  ? allRiskReports.find(r => (r._id || r.id) === parada.reporte_riesgo_id)
                  : null;

                return (
                  <div
                    key={idx}
                    className={`parada-item ${parada.completada ? 'completada' : 'no-completada'}`}
                  >
                    <div className="parada-number">{parada.orden || idx + 1}</div>
                    <div className="parada-content">
                      <div className="parada-header">
                        <span className="parada-direccion">{parada.direccion || parada.parada_nombre}</span>
                        {parada.completada ? (
                          <span className="badge badge-success">Completada</span>
                        ) : (
                          <span className="badge badge-warning">No completada</span>
                        )}
                      </div>
                      {parada.completada && (
                        <div className="parada-details">
                          {(parada.categoria_carga || parada.category) && (
                            <span className="parada-detail">
                              <Package size={14} />
                              Carga: {parada.categoria_carga || parada.category}
                            </span>
                          )}
                          {parada.bolsas !== undefined && parada.bolsas !== null && (
                            <span className="parada-detail">
                              <Package size={14} />
                              {parada.bolsas} bolsa{parada.bolsas === 1 ? '' : 's'}
                            </span>
                          )}
                          {(parada.timestamp_llegada || parada.timestamp) && (
                            <span className="parada-detail">
                              <Clock size={14} />
                              {parada.timestamp_llegada || parada.timestamp}
                            </span>
                          )}
                        </div>
                      )}
                      {parada.completada && parada.foto_storage_id && (
                        <div className="parada-photo">
                          <StorageImage
                            storageId={parada.foto_storage_id}
                            alt={`Foto parada ${parada.orden || idx + 1}`}
                            className="parada-photo__img"
                          />
                        </div>
                      )}
                      {!parada.completada && parada.motivo_no_completada && (
                        <div className="parada-motivo">
                          <span className="motivo-label">Motivo:</span>
                          <span className="motivo-text">{parada.motivo_no_completada}</span>
                        </div>
                      )}

                      {/* 🆕 Mostrar reporte de riesgo vinculado inline */}
                      {paradaRiskReport && (
                        <div className="parada-risk-report">
                          <div className="parada-risk-header">
                            <AlertTriangle size={16} />
                            <span>Reporte de Riesgo Asociado</span>
                          </div>
                          <div className="parada-risk-body">
                            <div className="parada-risk-title">{paradaRiskReport.titulo}</div>
                            <div className="parada-risk-description">{paradaRiskReport.descripcion}</div>
                            <div className="parada-risk-meta">
                              <span className={`parada-risk-priority priority-${paradaRiskReport.nivel_severidad || paradaRiskReport.prioridad}`}>
                                {(paradaRiskReport.nivel_severidad || paradaRiskReport.prioridad || '').toUpperCase()}
                              </span>
                              <span className="parada-risk-category">
                                {paradaRiskReport.tipo_riesgo || paradaRiskReport.categoria}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reportes de Riesgo Asociados */}
          {associatedRiskReports.length > 0 && (
            <div className="risk-reports-section">
              <h3><AlertTriangle size={20} /> Reportes de Riesgo ({associatedRiskReports.length})</h3>
              <div className="risk-reports-list">
                {associatedRiskReports.map((riskReport, idx) => (
                  <div key={idx} className={`risk-report-card ${riskReport.nivel_severidad || riskReport.prioridad}`}>
                    <div className="risk-report-header">
                      <div className="risk-type">
                        {riskReport.tipo === 'interno' ? (
                          <><Wrench size={16} /> Interno</>
                        ) : (
                          <><AlertOctagon size={16} /> Externo</>
                        )}
                      </div>
                      <div className={`risk-priority priority-${riskReport.nivel_severidad || riskReport.prioridad}`}>
                        {(riskReport.nivel_severidad || riskReport.prioridad || '').toUpperCase()}
                      </div>
                    </div>
                    <div className="risk-report-body">
                      <h4>{riskReport.titulo}</h4>
                      <p className="risk-category">
                        <Package size={14} />
                        {riskReport.tipo_riesgo || riskReport.categoria}
                      </p>
                      <p className="risk-description">{riskReport.descripcion}</p>
                      <div className="risk-meta">
                        <span className="risk-meta-item">
                          <Clock size={14} />
                          {parseLocalDate(riskReport.fecha_reporte || riskReport.fechaCreacion).toLocaleString('es-ES')}
                        </span>
                        {riskReport.ubicacion && (
                          <span className="risk-meta-item">
                            <MapPin size={14} />
                            {riskReport.ubicacion}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {report.terminacion_anticipada && (
                <div className="terminacion-warning">
                  <AlertTriangle size={20} />
                  <div>
                    <strong>Ruta Terminada Anticipadamente</strong>
                    <p>Esta ruta fue terminada antes de completar todas las paradas debido a: <strong>{report.motivo_terminacion}</strong></p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Observaciones */}
          {report.observaciones && (
            <div className="observaciones-section">
              <h3><FileText size={20} /> Observaciones</h3>
              <div className="observaciones-text">
                {report.observaciones}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="route-report-footer">
          <button className="btn btn--secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteReportDetailModal;
