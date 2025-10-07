import { useState, useEffect } from 'react';
import MapComponent from '../Map/MapComponent';
import EnhancedStopsManager from '../EnhancedStopsManager/EnhancedStopsManager';
import { 
  Trash2, Package, RefreshCw, AlertOctagon, Calendar, 
  Truck, CheckCircle, XCircle, AlertTriangle, Edit, 
  Plus, X, FileText, MapPin, Settings, Map, Ruler, 
  Clock, Target, Lightbulb, Save, Bot, Pencil 
} from '../Icons';
import './RouteModal.css';

const TABS = {
  INFO: 'info',
  STOPS: 'stops',
  CONFIG: 'config'
};

const SERVICE_TYPES = [
  { value: 'recoleccion', label: 'Recolección', icon: Trash2 },
  { value: 'entrega', label: 'Entrega', icon: Package },
  { value: 'mixto', label: 'Mixto', icon: RefreshCw },
  { value: 'emergencia', label: 'Emergencia', icon: AlertOctagon }
];

const ROUTE_STATES = [
  { value: 'programada', label: 'Programada', icon: Calendar },
  { value: 'en_progreso', label: 'En Progreso', icon: Truck },
  { value: 'completada', label: 'Completada', icon: CheckCircle },
  { value: 'cancelada', label: 'Cancelada', icon: XCircle }
];

const COLOR_PRESETS = [
  '#22c55e',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316'
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

const RouteModal = ({ isOpen, onClose, route, onSave, isEditing }) => {
  const [activeTab, setActiveTab] = useState(TABS.INFO);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tipo_servicio: 'recoleccion',
    fecha_programada: new Date().toISOString().split('T')[0],
    color: '#22c55e',
    estado: 'programada',
    paradas: [],
    distancia_total: 0,
    tiempo_estimado: 60,
    auto_calculate: true
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (route && isEditing) {
      setFormData({
        nombre: route.nombre || route.name || '',
        descripcion: route.descripcion || route.description || '',
        tipo_servicio: route.tipo_servicio || 'recoleccion',
        fecha_programada: route.fecha_programada || new Date().toISOString().split('T')[0],
        color: route.color || '#22c55e',
        estado: route.estado || 'programada',
        paradas: route.paradas || route.stops || [],
        distancia_total: route.distancia_total || route.distanciaTotal || 0,
        tiempo_estimado: route.tiempo_estimado || route.tiempoEstimado || 60,
        auto_calculate: true
      });
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        tipo_servicio: 'recoleccion',
        fecha_programada: new Date().toISOString().split('T')[0],
        color: '#22c55e',
        estado: 'programada',
        paradas: [],
        distancia_total: 0,
        tiempo_estimado: 60,
        auto_calculate: true
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
    
    if (!formData.auto_calculate) {
      if (formData.distancia_total <= 0) {
        newErrors.distancia = 'La distancia debe ser mayor a 0';
      }
      if (formData.tiempo_estimado <= 0) {
        newErrors.tiempo = 'El tiempo debe ser mayor a 0';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const routeData = {
      nombre: formData.nombre,
      descripcion: formData.descripcion || '',
      tipo_servicio: formData.tipo_servicio,
      paradas: formData.paradas || [],
      distancia_total: parseFloat(formData.distancia_total) || 0,
      tiempo_estimado: parseInt(formData.tiempo_estimado) || 60,
      color: formData.color || '#22c55e',
      fecha_programada: formData.fecha_programada,
      estado: formData.estado
    };

    onSave(routeData);
  };

  if (!isOpen) return null;

  const getValidationStatus = () => {
    if (!formData.nombre?.trim()) return { icon: AlertTriangle, text: 'El nombre es obligatorio', type: 'error' };
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
          <button
            className={`tab-button ${activeTab === TABS.INFO ? 'active' : ''}`}
            onClick={() => setActiveTab(TABS.INFO)}
          >
            <span className="tab-icon"><FileText size={18} /></span>
            <span className="tab-label">Información</span>
          </button>
          <button
            className={`tab-button ${activeTab === TABS.STOPS ? 'active' : ''}`}
            onClick={() => setActiveTab(TABS.STOPS)}
          >
            <span className="tab-icon"><MapPin size={18} /></span>
            <span className="tab-label">Paradas</span>
            {formData.paradas.length > 0 && (
              <span className="tab-badge">{formData.paradas.length}</span>
            )}
          </button>
          <button
            className={`tab-button ${activeTab === TABS.CONFIG ? 'active' : ''}`}
            onClick={() => setActiveTab(TABS.CONFIG)}
          >
            <span className="tab-icon"><Settings size={18} /></span>
            <span className="tab-label">Configuración</span>
          </button>
        </div>

        <div className="route-modal-body">
          {activeTab === TABS.INFO && (
            <div className="tab-content tab-info">
              <div className="info-form-section">
                <div className="form-section">
                  <h5><FileText size={18} /> Información Básica</h5>
                  
                  <div className="form-group">
                    <label>Nombre de la Ruta *</label>
                    <input 
                      type="text" 
                      value={formData.nombre} 
                      onChange={e => handleChange('nombre', e.target.value)}
                      placeholder="Ej: Ruta Centro - Norte"
                      className={`route-input ${errors.nombre ? 'error' : ''}`}
                    />
                    {errors.nombre && <span className="error-text">{errors.nombre}</span>}
                  </div>
                  
                  <div className="form-group">
                    <label>Descripción</label>
                    <textarea 
                      value={formData.descripcion} 
                      onChange={e => handleChange('descripcion', e.target.value)}
                      placeholder="Describe esta ruta..."
                      className="route-textarea"
                      rows="3"
                    />
                  </div>

                  <div className="form-row">
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

                    <div className="form-group">
                      <label>Fecha Programada</label>
                      <input
                        type="date"
                        value={formData.fecha_programada}
                        onChange={e => handleChange('fecha_programada', e.target.value)}
                        className="route-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Color de la Ruta</label>
                    <div className="color-picker-group">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={e => handleChange('color', e.target.value)}
                        className="color-input"
                      />
                      <div className="color-presets">
                        {COLOR_PRESETS.map(color => (
                          <button
                            key={color}
                            type="button"
                            className={`color-preset ${formData.color === color ? 'active' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => handleChange('color', color)}
                          />
                        ))}
                      </div>
                    </div>
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
                    <MapComponent 
                      routes={[{
                        id: 'preview',
                        nombre: formData.nombre || 'Vista Previa',
                        color: formData.color,
                        paradas: formData.paradas
                      }]}
                      viewOnly={true}
                      height="100%"
                    />
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
