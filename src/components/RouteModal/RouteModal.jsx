import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import EnhancedStopsManager from '../EnhancedStopsManager/EnhancedStopsManager';
import {
  Trash2, Calendar, Sparkles,
  Truck, CheckCircle, XCircle, AlertTriangle, Edit,
  Plus, X, FileText, MapPin, Settings, Map, Ruler,
  Clock, Target, Lightbulb, Save, Bot, Pencil
} from '../Icons';
import './RouteModal.css';

// Fix para iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const TABS = {
  INFO: 'info',
  STOPS: 'stops',
  CONFIG: 'config'
};

const SERVICE_TYPES = [
  { value: 'recoleccion', label: 'Recolección', icon: Trash2 },
  { value: 'fumigacion', label: 'Fumigación', icon: Sparkles }
];

const ROUTE_STATES = [
  { value: 'programada', label: 'Programada', icon: Calendar },
  { value: 'en_progreso', label: 'En Progreso', icon: Truck },
  { value: 'completada', label: 'Completada', icon: CheckCircle },
  { value: 'cancelada', label: 'Cancelada', icon: XCircle }
];


const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const MAX_ROUTE_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

const RouteModal = ({ isOpen, onClose, route, onSave, isEditing }) => {
  const [activeTab, setActiveTab] = useState(TABS.INFO);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tipo_servicio: 'recoleccion',
    estado: 'programada',
    paradas: [],
    distancia_total: 0,
    tiempo_estimado: 60,
    auto_calculate: true,
    dias_operacion: [],
    hora_inicio: '',
    hora_fin: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (route && isEditing) {
      console.log('🔍 DEBUG RouteModal - Cargando ruta para editar:', route);
      console.log('🔍 DEBUG RouteModal - dias_operacion recibidos:', route.dias_operacion);
      console.log('🔍 DEBUG RouteModal - Tipo de dias_operacion:', typeof route.dias_operacion, Array.isArray(route.dias_operacion));
      console.log('🔍 DEBUG RouteModal - paradas recibidas:', route.paradas);
      console.log('🔍 DEBUG RouteModal - Tipo de paradas:', typeof route.paradas, Array.isArray(route.paradas));

      const diasOperacion = Array.isArray(route.dias_operacion)
        ? route.dias_operacion
        : [];

      // Normalizar paradas
      const paradas = Array.isArray(route.paradas)
        ? route.paradas
        : (Array.isArray(route.stops) ? route.stops : []);

      console.log('🔍 DEBUG RouteModal - dias_operacion procesados:', diasOperacion);
      console.log('🔍 DEBUG RouteModal - paradas procesadas:', paradas);
      console.log('🔍 DEBUG RouteModal - Cantidad de paradas:', paradas.length);

      setFormData({
        nombre: route.nombre || route.name || '',
        descripcion: route.descripcion || route.description || '',
        tipo_servicio: route.tipo_servicio || 'recoleccion',
        estado: route.estado || 'programada',
        paradas: paradas,
        distancia_total: route.distancia_total || route.distanciaTotal || 0,
        tiempo_estimado: route.tiempo_estimado || route.tiempoEstimado || 60,
        auto_calculate: true,
        dias_operacion: diasOperacion,
        hora_inicio: route.hora_inicio || '',
        hora_fin: route.hora_fin || ''
      });
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        tipo_servicio: 'recoleccion',
        estado: 'programada',
        paradas: [],
        distancia_total: 0,
        tiempo_estimado: 60,
        auto_calculate: true,
        dias_operacion: [],
        hora_inicio: '',
        hora_fin: ''
      });
    }
    setActiveTab(TABS.INFO);
    setErrors({});
  }, [route, isEditing, isOpen]);

  useEffect(() => {
    if (formData.auto_calculate && formData.paradas.length > 1) {
      const metrics = calculateMetrics(formData.paradas);
      setFormData(prev => ({
        ...prev,
        distancia_total: metrics.distancia_total,
        tiempo_estimado: metrics.tiempo_estimado
      }));
    }
  }, [formData.paradas, formData.auto_calculate]);

  const calculateMetrics = (paradas) => {
    let totalDistance = 0;
    
    for (let i = 0; i < paradas.length - 1; i++) {
      const p1 = paradas[i];
      const p2 = paradas[i + 1];
      
      if (p1.latitud && p1.longitud && p2.latitud && p2.longitud) {
        const distance = calculateHaversineDistance(
          p1.latitud, p1.longitud,
          p2.latitud, p2.longitud
        );
        totalDistance += distance;
      }
    }
    
    const estimatedTime = Math.round((totalDistance / 30) * 60 + (paradas.length * 5));
    
    return {
      distancia_total: Math.round(totalDistance * 10) / 10,
      tiempo_estimado: estimatedTime
    };
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nombre?.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }

    if (formData.paradas.length < 2) {
      newErrors.paradas = 'Debes agregar al menos 2 paradas';
    }

    if (formData.paradas.some(p => !p.latitud || !p.longitud)) {
      newErrors.paradas_coords = 'Todas las paradas deben tener coordenadas';
    }

    if (!formData.hora_inicio) {
      newErrors.hora_inicio = 'La hora de inicio es obligatoria';
    }

    if (!formData.hora_fin) {
      newErrors.hora_fin = 'La hora de fin es obligatoria';
    }

    if (formData.hora_inicio && formData.hora_fin && formData.hora_inicio >= formData.hora_fin) {
      newErrors.hora_fin = 'La hora de fin debe ser posterior a la hora de inicio';
    }

    if (!formData.dias_operacion || formData.dias_operacion.length === 0) {
      newErrors.dias_operacion = 'Debes seleccionar al menos un día de operación';
    }

    if (!formData.auto_calculate) {
      if (formData.distancia_total <= 0) {
        newErrors.distancia = 'La distancia debe ser mayor a 0';
      }
      if (formData.tiempo_estimado <= 0) {
        newErrors.tiempo = 'El tiempo debe ser mayor a 0';
      }
    }

    console.log('🔍 DEBUG validateForm - Errores encontrados:', newErrors);
    console.log('🔍 DEBUG validateForm - Cantidad de paradas:', formData.paradas.length);

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    // Apply length limits for text fields
    let processedValue = value;

    if (field === 'nombre' && typeof value === 'string') {
      processedValue = value.slice(0, MAX_ROUTE_NAME_LENGTH);
    } else if (field === 'descripcion' && typeof value === 'string') {
      processedValue = value.slice(0, MAX_DESCRIPTION_LENGTH);
    }

    setFormData(prev => ({ ...prev, [field]: processedValue }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleStopsChange = (newStops) => {
    setFormData(prev => ({ ...prev, paradas: newStops }));
    if (errors.paradas || errors.paradas_coords) {
      setErrors(prev => ({ 
        ...prev, 
        paradas: undefined, 
        paradas_coords: undefined 
      }));
    }
  };

  // Función helper para contar errores por pestaña
  const getTabErrors = () => {
    const tabErrors = {
      [TABS.INFO]: [],
      [TABS.STOPS]: [],
      [TABS.CONFIG]: []
    };

    if (errors.nombre) tabErrors[TABS.INFO].push(errors.nombre);
    if (errors.descripcion) tabErrors[TABS.INFO].push(errors.descripcion);
    if (errors.tipo_servicio) tabErrors[TABS.INFO].push(errors.tipo_servicio);

    if (errors.paradas) tabErrors[TABS.STOPS].push(errors.paradas);
    if (errors.paradas_coords) tabErrors[TABS.STOPS].push(errors.paradas_coords);

    if (errors.hora_inicio) tabErrors[TABS.CONFIG].push(errors.hora_inicio);
    if (errors.hora_fin) tabErrors[TABS.CONFIG].push(errors.hora_fin);
    if (errors.dias_operacion) tabErrors[TABS.CONFIG].push(errors.dias_operacion);
    if (errors.distancia) tabErrors[TABS.CONFIG].push(errors.distancia);
    if (errors.tiempo) tabErrors[TABS.CONFIG].push(errors.tiempo);

    return tabErrors;
  };

  const handleSave = () => {
    console.log('🔍 DEBUG RouteModal - handleSave() ejecutado');
    console.log('🔍 DEBUG RouteModal - formData actual:', formData);
    console.log('🔍 DEBUG RouteModal - dias_operacion en formData:', formData.dias_operacion);

    const isValid = validateForm();
    console.log('🔍 DEBUG RouteModal - Validación:', isValid ? '✅ PASÓ' : '❌ FALLÓ');

    if (!isValid) {
      console.log('❌ DEBUG RouteModal - Validación falló, abortando guardado');
      console.log('❌ DEBUG RouteModal - Revisa los errores arriba loggeados por validateForm()');
      return;
    }

    const routeData = {
      nombre: formData.nombre,
      descripcion: formData.descripcion || '',
      tipo_servicio: formData.tipo_servicio,
      paradas: formData.paradas || [],
      distancia_total: parseFloat(formData.distancia_total) || 0,
      tiempo_estimado: parseInt(formData.tiempo_estimado) || 60,
      estado: formData.estado,
      dias_operacion: formData.dias_operacion || [],
      hora_inicio: formData.hora_inicio || null,
      hora_fin: formData.hora_fin || null
    };

    console.log('✅ DEBUG RouteModal - Datos a enviar:', routeData);
    console.log('✅ DEBUG RouteModal - Llamando onSave() con routeData');

    onSave(routeData);
  };

  if (!isOpen) return null;

  const getValidationStatus = () => {
    if (!formData.nombre?.trim()) return { icon: AlertTriangle, text: 'El nombre es obligatorio', type: 'error' };
    if (!formData.hora_inicio) return { icon: AlertTriangle, text: 'Falta hora de inicio', type: 'error' };
    if (!formData.hora_fin) return { icon: AlertTriangle, text: 'Falta hora de fin', type: 'error' };
    if (formData.hora_inicio && formData.hora_fin && formData.hora_inicio >= formData.hora_fin) return { icon: AlertTriangle, text: 'Hora de fin debe ser posterior', type: 'error' };
    if (!formData.dias_operacion || formData.dias_operacion.length === 0) return { icon: AlertTriangle, text: 'Selecciona al menos un día', type: 'error' };
    if (formData.paradas.length < 2) return { icon: AlertTriangle, text: 'Agrega al menos 2 paradas', type: 'warning' };
    if (formData.paradas.some(p => !p.latitud || !p.longitud)) return { icon: AlertTriangle, text: 'Faltan coordenadas en algunas paradas', type: 'warning' };
    return { icon: CheckCircle, text: 'Listo para guardar', type: 'success' };
  };

  const validationStatus = getValidationStatus();

  return (
    <div className="route-modal-overlay" onClick={onClose}>
      <div className="route-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="route-modal-header">
          <div className="modal-header-content">
            <h4>
              {isEditing ? <><Edit size={20} /> Editar Ruta</> : <><Plus size={20} /> Nueva Ruta</>}
            </h4>
            <p>Configura tu ruta con información detallada, paradas y opciones avanzadas</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="route-modal-tabs">
          {(() => {
            const tabErrors = getTabErrors();
            return (
              <>
                <button
                  className={`tab-button ${activeTab === TABS.INFO ? 'active' : ''} ${tabErrors[TABS.INFO].length > 0 ? 'has-errors' : ''}`}
                  onClick={() => setActiveTab(TABS.INFO)}
                >
                  <span className="tab-icon"><FileText size={18} /></span>
                  <span className="tab-label">Información</span>
                  {tabErrors[TABS.INFO].length > 0 && (
                    <span className="tab-error-badge" title={tabErrors[TABS.INFO].join(', ')}>!</span>
                  )}
                </button>
                <button
                  className={`tab-button ${activeTab === TABS.STOPS ? 'active' : ''} ${tabErrors[TABS.STOPS].length > 0 ? 'has-errors' : ''}`}
                  onClick={() => setActiveTab(TABS.STOPS)}
                >
                  <span className="tab-icon"><MapPin size={18} /></span>
                  <span className="tab-label">Paradas</span>
                  {formData.paradas.length > 0 && !tabErrors[TABS.STOPS].length && (
                    <span className="tab-badge">{formData.paradas.length}</span>
                  )}
                  {tabErrors[TABS.STOPS].length > 0 && (
                    <span className="tab-error-badge" title={tabErrors[TABS.STOPS].join(', ')}>!</span>
                  )}
                </button>
                <button
                  className={`tab-button ${activeTab === TABS.CONFIG ? 'active' : ''} ${tabErrors[TABS.CONFIG].length > 0 ? 'has-errors' : ''}`}
                  onClick={() => setActiveTab(TABS.CONFIG)}
                >
                  <span className="tab-icon"><Settings size={18} /></span>
                  <span className="tab-label">Configuración</span>
                  {tabErrors[TABS.CONFIG].length > 0 && (
                    <span className="tab-error-badge" title={tabErrors[TABS.CONFIG].join(', ')}>!</span>
                  )}
                </button>
              </>
            );
          })()}
        </div>

        {Object.keys(errors).length > 0 && (
          <div className="validation-error-banner">
            <AlertTriangle size={18} />
            <div className="error-banner-content">
              <strong>Hay errores que debes corregir:</strong>
              <ul className="error-list">
                {(() => {
                  const tabErrors = getTabErrors();
                  return Object.entries({
                    'Información': tabErrors[TABS.INFO],
                    'Paradas': tabErrors[TABS.STOPS],
                    'Configuración': tabErrors[TABS.CONFIG]
                  }).map(([tabName, errors]) =>
                    errors.length > 0 ? (
                      <li key={tabName}>
                        <strong>{tabName}:</strong> {errors.join(', ')}
                      </li>
                    ) : null
                  ).filter(Boolean);
                })()}
              </ul>
            </div>
          </div>
        )}

        <div className="route-modal-body">
          {activeTab === TABS.INFO && (
            <div className="tab-content tab-info">
              <div className="info-form-section">
                <div className="form-section">
                  <h5><FileText size={18} /> Información Básica</h5>
                  
                  <div className="form-group">
                    <label>
                      Nombre de la Ruta *
                      <span style={{ fontSize: '11px', fontWeight: 'normal', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>
                        ({formData.nombre.length}/{MAX_ROUTE_NAME_LENGTH})
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={e => handleChange('nombre', e.target.value)}
                      placeholder="Ej: Ruta Centro - Norte"
                      className={`route-input ${errors.nombre ? 'error' : ''}`}
                      maxLength={MAX_ROUTE_NAME_LENGTH}
                      title={formData.nombre}
                    />
                    {errors.nombre && <span className="error-text">{errors.nombre}</span>}
                  </div>
                  
                  <div className="form-group">
                    <label>
                      Descripción
                      <span style={{ fontSize: '11px', fontWeight: 'normal', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>
                        ({formData.descripcion.length}/{MAX_DESCRIPTION_LENGTH})
                      </span>
                    </label>
                    <textarea
                      value={formData.descripcion}
                      onChange={e => handleChange('descripcion', e.target.value)}
                      placeholder="Describe esta ruta..."
                      className="route-textarea"
                      rows="3"
                      maxLength={MAX_DESCRIPTION_LENGTH}
                    />
                  </div>

                  <div className="form-group">
                    <label>Tipo de Servicio</label>
                    <select
                      value={formData.tipo_servicio}
                      onChange={e => handleChange('tipo_servicio', e.target.value)}
                      className="route-select"
                    >
                      {SERVICE_TYPES.map(type => {
                        const Icon = type.icon;
                        return (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="form-section">
                  <h5><Clock size={18} /> Horarios de Operación</h5>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Hora de Inicio *</label>
                      <input
                        type="time"
                        value={formData.hora_inicio}
                        onChange={e => handleChange('hora_inicio', e.target.value)}
                        className={`route-input ${errors.hora_inicio ? 'error' : ''}`}
                      />
                      {errors.hora_inicio && <span className="error-text">{errors.hora_inicio}</span>}
                    </div>

                    <div className="form-group">
                      <label>Hora de Fin *</label>
                      <input
                        type="time"
                        value={formData.hora_fin}
                        onChange={e => handleChange('hora_fin', e.target.value)}
                        className={`route-input ${errors.hora_fin ? 'error' : ''}`}
                      />
                      {errors.hora_fin && <span className="error-text">{errors.hora_fin}</span>}
                    </div>
                  </div>

                  <div className={`form-group ${errors.dias_operacion ? 'has-error' : ''}`}>
                    <label>Días de Operación *</label>
                    <div className={`days-checkboxes ${errors.dias_operacion ? 'error-highlight' : ''}`}>
                      {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => {
                        const dayLower = day.toLowerCase();
                        const isChecked = formData.dias_operacion?.includes(dayLower) || false;

                        return (
                          <label key={day} className="day-checkbox">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                console.log(`🔍 DEBUG RouteModal - Checkbox ${day} cambiado a:`, e.target.checked);
                                console.log(`🔍 DEBUG RouteModal - dias_operacion ANTES:`, formData.dias_operacion);

                                const newDias = e.target.checked
                                  ? [...(formData.dias_operacion || []), dayLower]
                                  : (formData.dias_operacion || []).filter(d => d !== dayLower);

                                console.log(`🔍 DEBUG RouteModal - dias_operacion DESPUÉS:`, newDias);

                                handleChange('dias_operacion', newDias);
                              }}
                            />
                            <span>{day.slice(0, 3)}</span>
                          </label>
                        );
                      })}
                    </div>
                    {errors.dias_operacion && <span className="error-text">⚠️ {errors.dias_operacion}</span>}
                  </div>

                </div>
              </div>

              <div className="info-map-section">
                <div className="map-preview-header">
                  <h5><Map size={18} /> Vista Previa</h5>
                  <div className="map-stats">
                    <span className="stat-chip">{formData.paradas.length} paradas</span>
                    <span className="stat-chip">{formData.distancia_total} km</span>
                  </div>
                </div>
                <div className="map-preview-container">
                  {formData.paradas.length > 0 ? (
                    <MapContainer
                      center={[formData.paradas[0].latitud || 8.9833, formData.paradas[0].longitud || -79.5167]}
                      zoom={13}
                      style={{ height: '100%', width: '100%' }}
                      className="route-preview-map"
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />

                      {/* Línea de la ruta */}
                      {formData.paradas.length > 1 && (
                        <Polyline
                          positions={formData.paradas.map(p => [p.latitud, p.longitud])}
                          color="#22c55e"
                          weight={4}
                          opacity={0.7}
                        />
                      )}

                      {/* Marcadores de paradas */}
                      {formData.paradas.map((parada, index) => (
                        <Marker
                          key={index}
                          position={[parada.latitud, parada.longitud]}
                        />
                      ))}
                    </MapContainer>
                  ) : (
                    <div className="map-placeholder">
                      <div className="map-placeholder-content">
                        <div className="placeholder-icon"><Map size={64} strokeWidth={1.5} /></div>
                        <h6>Sin paradas aún</h6>
                        <p>Ve a la pestaña "Paradas" para agregar ubicaciones</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === TABS.STOPS && (
            <div className="tab-content tab-stops">
              <EnhancedStopsManager
                stops={formData.paradas}
                onStopsChange={handleStopsChange}
                showHeader={false}
              />
              {errors.paradas && (
                <div className="error-banner">
                  <AlertTriangle size={16} />
                  <span>{errors.paradas}</span>
                </div>
              )}
              {errors.paradas_coords && (
                <div className="error-banner">
                  <AlertTriangle size={16} />
                  <span>{errors.paradas_coords}</span>
                </div>
              )}
            </div>
          )}

          {activeTab === TABS.CONFIG && (
            <div className="tab-content tab-config">
              <div className="config-section">
                <h5><Ruler size={18} /> Métricas de Ruta</h5>
                
                <div className="auto-calculate-toggle">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={formData.auto_calculate}
                      onChange={e => handleChange('auto_calculate', e.target.checked)}
                      className="toggle-input"
                    />
                    <span className="toggle-switch"></span>
                    <span className="toggle-text">
                      Calcular automáticamente distancia y tiempo
                    </span>
                  </label>
                  <p className="toggle-hint">
                    {formData.auto_calculate 
                      ? <><Bot size={14} /> Las métricas se calculan según las coordenadas de las paradas</>
                      : <><Pencil size={14} /> Puedes ingresar valores manualmente</>
                    }
                  </p>
                </div>

                <div className="metrics-grid">
                  <div className="metric-card">
                    <label><Ruler size={16} /> Distancia Total (km)</label>
                    <input
                      type="number"
                      value={formData.distancia_total}
                      onChange={e => handleChange('distancia_total', e.target.value)}
                      className={`metric-input ${errors.distancia ? 'error' : ''}`}
                      placeholder="0.0"
                      step="0.1"
                      min="0"
                      disabled={formData.auto_calculate}
                    />
                    {errors.distancia && <span className="error-text">{errors.distancia}</span>}
                  </div>

                  <div className="metric-card">
                    <label><Clock size={16} /> Tiempo Estimado (min)</label>
                    <input
                      type="number"
                      value={formData.tiempo_estimado}
                      onChange={e => handleChange('tiempo_estimado', e.target.value)}
                      className={`metric-input ${errors.tiempo ? 'error' : ''}`}
                      placeholder="0"
                      step="1"
                      min="0"
                      disabled={formData.auto_calculate}
                    />
                    {errors.tiempo && <span className="error-text">{errors.tiempo}</span>}
                  </div>
                </div>
              </div>

              <div className="config-section">
                <h5><Target size={18} /> Estado y Asignación</h5>
                
                <div className="form-group">
                  <label>Estado de la Ruta</label>
                  <select
                    value={formData.estado}
                    onChange={e => handleChange('estado', e.target.value)}
                    className="route-select"
                  >
                    {ROUTE_STATES.map(state => {
                      const Icon = state.icon;
                      return (
                        <option key={state.value} value={state.value}>
                          {state.label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="info-card">
                  <div className="info-icon"><Lightbulb size={24} /></div>
                  <div className="info-content">
                    <strong>Próximamente</strong>
                    <p>Podrás asignar vehículos y conductores directamente desde aquí</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="route-modal-footer">
          <div className="footer-info">
            <span className={`validation-info ${validationStatus.type}`}>
              {validationStatus.icon && <validationStatus.icon size={16} />}
              <span>{validationStatus.text}</span>
            </span>
          </div>
          <div className="footer-actions">
            <button className="btn btn--secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="btn btn--primary"
              onClick={handleSave}
              disabled={validationStatus.type === 'error'}
              title={validationStatus.type === 'error' ? `No se puede guardar: ${validationStatus.text}` : 'Guardar ruta'}
            >
              {isEditing ? <><Save size={16} /> Actualizar Ruta</> : <><CheckCircle size={16} /> Crear Ruta</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteModal;
