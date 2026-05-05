import { useState, useEffect, useMemo, useRef } from 'react';
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl/maplibre';
import { useMutation, useQuery } from 'convex/react';
import 'maplibre-gl/dist/maplibre-gl.css';
import EnhancedStopsManager from '../EnhancedStopsManager/EnhancedStopsManager';
import MapLocationPicker from '../MapLocationPicker/MapLocationPicker';
import { api } from '../../../convex/_generated/api';
import {
  Trash2, Calendar, Sparkles,
  Truck, CheckCircle, XCircle, AlertTriangle, Edit,
  Plus, X, FileText, MapPin, Settings, Map as MapIcon, Ruler,
  Clock, Target, Lightbulb, Save, Bot, Pencil, Briefcase, Camera
} from '../Icons';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import './RouteModal.css';

// OpenFreeMap Positron — same tiles as dashboard MapLibreComponent (no key needed).
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

const TABS = {
  INFO: 'info',
  STOPS: 'stops'
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
  const { availableProjects, currentProjectId, isAdmin } = useProject();
  const { user } = useAuth();
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const [activeTab, setActiveTab] = useState(TABS.INFO);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tipo_servicio: 'recoleccion',
    estado: 'programada',
    proyecto_id: '',
    paradas: [],
    distancia_total: 0,
    tiempo_estimado: 60,
    auto_calculate: true,
    dias_operacion: [],
    hora_inicio: '',
    hora_fin: ''
  });
  const [errors, setErrors] = useState({});
  const [photoPortadaId, setPhotoPortadaId] = useState(null);
  const [localPreview, setLocalPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [ubicacion, setUbicacion] = useState(null);
  const [ubicacionNombre, setUbicacionNombre] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const photoInputRef = useRef(null);

  const remotePhotoUrl = useQuery(
    api.files.getUrl,
    photoPortadaId && !localPreview ? { storageId: photoPortadaId } : 'skip'
  );
  const photoPreview = localPreview || remotePhotoUrl;

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
        proyecto_id: route.proyecto_id || '',
        paradas: paradas,
        distancia_total: route.distancia_total || route.distanciaTotal || 0,
        tiempo_estimado: route.tiempo_estimado || route.tiempoEstimado || 60,
        auto_calculate: true,
        dias_operacion: diasOperacion,
        hora_inicio: route.hora_inicio || '',
        hora_fin: route.hora_fin || ''
      });
      setPhotoPortadaId(route.foto_portada_storage_id || null);
      if (localPreview) URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
      const ub = route.ubicacion_principal || null;
      setUbicacion(ub);
      setUbicacionNombre(ub?.nombre || '');
      setShowLocationPicker(false);
    } else {
      // Defaults: enterprise → su proyecto fijo; admin → el del switcher si lo eligió.
      const defaultProyecto = !isAdmin
        ? (user?.proyecto_id || '')
        : (currentProjectId || '');
      setFormData({
        nombre: '',
        descripcion: '',
        tipo_servicio: 'recoleccion',
        estado: 'programada',
        proyecto_id: defaultProyecto,
        paradas: [],
        distancia_total: 0,
        tiempo_estimado: 60,
        auto_calculate: true,
        dias_operacion: [],
        hora_inicio: '',
        hora_fin: ''
      });
      setPhotoPortadaId(null);
      if (localPreview) URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
      setUbicacion(null);
      setUbicacionNombre('');
      setShowLocationPicker(false);
    }
    setActiveTab(TABS.INFO);
    setErrors({});
  }, [route, isEditing, isOpen]);

  // Sync nombre input → ubicacion.nombre cuando ya hay punto seleccionado
  useEffect(() => {
    if (!ubicacion) return;
    const trimmed = ubicacionNombre.trim();
    if (!trimmed || ubicacion.nombre === trimmed) return;
    setUbicacion(u => (u ? { ...u, nombre: trimmed } : u));
  }, [ubicacionNombre]);

  const handlePortadaPhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!res.ok) throw new Error('Upload failed');
      const { storageId } = await res.json();
      setPhotoPortadaId(storageId);
      if (localPreview) URL.revokeObjectURL(localPreview);
      setLocalPreview(URL.createObjectURL(file));
    } catch (err) {
      console.error('Error subiendo foto portada:', err);
      alert('No se pudo subir la foto. Intenta de nuevo.');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const removePortadaPhoto = () => {
    setPhotoPortadaId(null);
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handlePickedLocation = (loc) => {
    if (!loc?.latitud || !loc?.longitud) return;
    const nombre = ubicacionNombre.trim() || loc.direccion || formData.nombre || 'Ubicación principal';
    setUbicacion({
      latitud: loc.latitud,
      longitud: loc.longitud,
      nombre,
      direccion: loc.direccion_completa || loc.direccion || undefined,
    });
    if (!ubicacionNombre.trim()) setUbicacionNombre(nombre);
    setShowLocationPicker(false);
  };

  const useFirstStopAsLocation = () => {
    const first = formData.paradas[0];
    if (!first || !first.latitud || !first.longitud) {
      alert('Agrega al menos una parada con coordenadas primero');
      return;
    }
    const nombre = ubicacionNombre.trim() || first.direccion || formData.nombre || 'Ubicación principal';
    setUbicacion({
      latitud: first.latitud,
      longitud: first.longitud,
      nombre,
      direccion: first.direccion_completa || first.direccion || undefined,
    });
    if (!ubicacionNombre.trim()) setUbicacionNombre(nombre);
  };

  const clearUbicacion = () => {
    setUbicacion(null);
    setUbicacionNombre('');
    setShowLocationPicker(false);
  };

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

    if (!formData.proyecto_id) {
      newErrors.proyecto_id = 'Debes seleccionar un proyecto';
    }

    if (formData.paradas.length < 2) {
      newErrors.paradas = 'Debes agregar al menos 2 paradas';
    }

    if (formData.paradas.some(p => !p.latitud || !p.longitud)) {
      newErrors.paradas_coords = 'Todas las paradas deben tener coordenadas';
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
      [TABS.STOPS]: []
    };

    if (errors.nombre) tabErrors[TABS.INFO].push(errors.nombre);
    if (errors.descripcion) tabErrors[TABS.INFO].push(errors.descripcion);
    if (errors.tipo_servicio) tabErrors[TABS.INFO].push(errors.tipo_servicio);
    if (errors.proyecto_id) tabErrors[TABS.INFO].push(errors.proyecto_id);
    if (errors.hora_inicio) tabErrors[TABS.INFO].push(errors.hora_inicio);
    if (errors.hora_fin) tabErrors[TABS.INFO].push(errors.hora_fin);
    if (errors.dias_operacion) tabErrors[TABS.INFO].push(errors.dias_operacion);

    if (errors.paradas) tabErrors[TABS.STOPS].push(errors.paradas);
    if (errors.paradas_coords) tabErrors[TABS.STOPS].push(errors.paradas_coords);

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
      descripcion: '',
      tipo_servicio: 'recoleccion',
      proyecto_id: formData.proyecto_id,
      paradas: formData.paradas || [],
      distancia_total: parseFloat(formData.distancia_total) || 0,
      tiempo_estimado: parseInt(formData.tiempo_estimado) || 60,
      estado: formData.estado,
      dias_operacion: formData.dias_operacion || [],
    };

    if (formData.hora_inicio) routeData.hora_inicio = formData.hora_inicio;
    if (formData.hora_fin) routeData.hora_fin = formData.hora_fin;
    if (photoPortadaId) routeData.foto_portada_storage_id = photoPortadaId;
    if (ubicacion) routeData.ubicacion_principal = ubicacion;

    console.log('✅ DEBUG RouteModal - Datos a enviar:', routeData);
    console.log('✅ DEBUG RouteModal - Llamando onSave() con routeData');

    onSave(routeData);
  };

  // Calculate map bounds from stops
  const mapBounds = useMemo(() => {
    if (formData.paradas.length === 0) return null;

    const validStops = formData.paradas.filter(p => p.latitud && p.longitud);
    if (validStops.length === 0) return null;

    const lngs = validStops.map(p => p.longitud);
    const lats = validStops.map(p => p.latitud);

    return {
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats)
    };
  }, [formData.paradas]);

  // Initial view state
  const initialViewState = useMemo(() => {
    if (formData.paradas.length > 0 && formData.paradas[0].latitud) {
      return {
        longitude: formData.paradas[0].longitud,
        latitude: formData.paradas[0].latitud,
        zoom: 13
      };
    }
    return {
      longitude: -79.5167,
      latitude: 8.9833,
      zoom: 12
    };
  }, [formData.paradas]);

  // Route line GeoJSON
  const routeLineGeoJSON = useMemo(() => {
    if (formData.paradas.length < 2) return null;

    const validStops = formData.paradas.filter(p => p.latitud && p.longitud);
    if (validStops.length < 2) return null;

    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: validStops.map(p => [p.longitud, p.latitud])
      }
    };
  }, [formData.paradas]);

  if (!isOpen) return null;

  const getValidationStatus = () => {
    if (!formData.nombre?.trim()) return { icon: AlertTriangle, text: 'El nombre es obligatorio', type: 'error' };
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
        <div className="route-modal-header-v2">
          <div className="header-top-row">
            <div className="modal-header-content">
              <h4>
                {isEditing ? <><Edit size={24} /> Editar Ruta</> : <><Plus size={24} /> Nueva Ruta</>}
              </h4>
              <p>Configura tu ruta con información detallada, paradas y opciones avanzadas</p>
            </div>
            <button className="modal-close-v2" onClick={onClose}><X size={20} /></button>
          </div>

          <div className="header-stats-row">
            <div className="stat-pill-v2 stat-stops">
              <MapPin size={16} />
              <div className="stat-content">
                <span className="stat-value">{formData.paradas.length}</span>
                <span className="stat-label">Paradas</span>
              </div>
            </div>
            <div className="stat-pill-v2 stat-distance">
              <Ruler size={16} />
              <div className="stat-content">
                <span className="stat-value">{formData.distancia_total} km</span>
                <span className="stat-label">Distancia</span>
              </div>
            </div>
            <div className="stat-pill-v2 stat-time">
              <Clock size={16} />
              <div className="stat-content">
                <span className="stat-value">{formData.tiempo_estimado} min</span>
                <span className="stat-label">Tiempo Est.</span>
              </div>
            </div>
            {formData.dias_operacion && formData.dias_operacion.length > 0 && (
              <div className="stat-pill-v2 stat-days">
                <Calendar size={16} />
                <div className="stat-content">
                  <span className="stat-value">{formData.dias_operacion.length}</span>
                  <span className="stat-label">Días/Sem</span>
                </div>
              </div>
            )}
          </div>
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
                    'Paradas': tabErrors[TABS.STOPS]
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

                  <div className={`form-group ${errors.proyecto_id ? 'has-error' : ''}`}>
                    <label><Briefcase size={14} /> Proyecto *</label>
                    <select
                      value={formData.proyecto_id}
                      onChange={e => handleChange('proyecto_id', e.target.value)}
                      className={`route-select ${errors.proyecto_id ? 'error' : ''}`}
                      disabled={!isAdmin}
                    >
                      <option value="">Selecciona un proyecto…</option>
                      {availableProjects.map(p => (
                        <option key={p._id} value={p._id}>{p.nombre}</option>
                      ))}
                    </select>
                    {!isAdmin && (
                      <span className="label-hint">El proyecto se asigna automáticamente según tu cuenta.</span>
                    )}
                    {errors.proyecto_id && <span className="error-text">{errors.proyecto_id}</span>}
                  </div>
                </div>

                <div className="form-section">
                  <h5><Camera size={18} /> Portada y Ubicación Principal</h5>
                  <p className="section-hint">
                    Foto y punto representativo de la ruta — se mostrarán en los reportes de recolección.
                  </p>

                  <div className="form-row form-row--portada">
                    <div className="form-group portada-photo-group">
                      <label><Camera size={14} /> Foto de portada <span className="label-hint">(opcional)</span></label>
                      {photoPreview ? (
                        <div className="portada-photo-preview">
                          <img src={photoPreview} alt="Portada de la ruta" />
                          <button
                            type="button"
                            className="portada-photo-remove"
                            onClick={removePortadaPhoto}
                            title="Quitar foto"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="portada-photo-upload-btn"
                          onClick={() => photoInputRef.current?.click()}
                          disabled={uploadingPhoto}
                        >
                          {uploadingPhoto ? (
                            <span>Subiendo…</span>
                          ) : (
                            <>
                              <Camera size={24} strokeWidth={1.5} />
                              <span>Subir foto</span>
                            </>
                          )}
                        </button>
                      )}
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePortadaPhotoSelect}
                        style={{ display: 'none' }}
                      />
                    </div>

                    <div className="form-group portada-location-group">
                      <label><MapPin size={14} /> Ubicación principal <span className="label-hint">(opcional)</span></label>
                      <input
                        type="text"
                        value={ubicacionNombre}
                        onChange={(e) => setUbicacionNombre(e.target.value)}
                        placeholder="Ej: Mercado San Felipe"
                        className="route-input"
                      />
                      {ubicacion && (
                        <div className="portada-location-summary">
                          <MapPin size={14} />
                          <span className="portada-location-text">
                            {ubicacion.nombre}
                            <small> · {ubicacion.latitud.toFixed(5)}, {ubicacion.longitud.toFixed(5)}</small>
                          </span>
                          <button
                            type="button"
                            className="portada-location-clear"
                            onClick={clearUbicacion}
                            title="Quitar ubicación"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                      <div className="portada-location-actions">
                        <button
                          type="button"
                          className="btn btn--sm btn--outline"
                          onClick={() => setShowLocationPicker(s => !s)}
                        >
                          <MapPin size={14} />
                          {showLocationPicker
                            ? 'Cerrar mapa'
                            : (ubicacion ? 'Cambiar punto' : 'Elegir en mapa')}
                        </button>
                        <button
                          type="button"
                          className="btn btn--sm btn--outline"
                          onClick={useFirstStopAsLocation}
                          disabled={formData.paradas.length === 0}
                          title={formData.paradas.length === 0 ? 'Agrega paradas primero' : 'Usar coords de la 1ra parada'}
                        >
                          Usar 1ra parada
                        </button>
                      </div>
                      {showLocationPicker && (
                        <div className="portada-location-picker">
                          <MapLocationPicker
                            onLocationSelect={handlePickedLocation}
                            initialLocation={ubicacion ? [ubicacion.latitud, ubicacion.longitud] : null}
                            placeholder="Buscar punto representativo..."
                            height="280px"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h5><Clock size={18} /> Horarios de Operación</h5>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Hora de Inicio <span className="label-hint">(opcional)</span></label>
                      <input
                        type="time"
                        value={formData.hora_inicio}
                        onChange={e => handleChange('hora_inicio', e.target.value)}
                        className={`route-input ${errors.hora_inicio ? 'error' : ''}`}
                      />
                      {errors.hora_inicio && <span className="error-text">{errors.hora_inicio}</span>}
                    </div>

                    <div className="form-group">
                      <label>Hora de Fin <span className="label-hint">(opcional)</span></label>
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
                      {(() => {
                        const allDays = [
                          { label: 'Lunes', value: 'lunes' },
                          { label: 'Martes', value: 'martes' },
                          { label: 'Miércoles', value: 'miercoles' },
                          { label: 'Jueves', value: 'jueves' },
                          { label: 'Viernes', value: 'viernes' },
                          { label: 'Sábado', value: 'sabado' },
                          { label: 'Domingo', value: 'domingo' }
                        ];
                        const allValues = allDays.map(d => d.value);
                        const allChecked = formData.dias_operacion?.length === allValues.length;

                        return (
                          <>
                            <label className="day-checkbox day-checkbox--all">
                              <input
                                type="checkbox"
                                checked={allChecked}
                                onChange={e => {
                                  handleChange('dias_operacion', e.target.checked ? allValues : []);
                                }}
                              />
                              <span>Todos los días</span>
                            </label>
                            {allDays.map(day => {
                              const isChecked = formData.dias_operacion?.includes(day.value) || false;
                              return (
                                <label key={day.value} className="day-checkbox">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={e => {
                                      const newDias = e.target.checked
                                        ? [...(formData.dias_operacion || []), day.value]
                                        : (formData.dias_operacion || []).filter(d => d !== day.value);
                                      handleChange('dias_operacion', newDias);
                                    }}
                                  />
                                  <span>{day.label}</span>
                                </label>
                              );
                            })}
                          </>
                        );
                      })()}
                    </div>
                    {errors.dias_operacion && (
                      <span className="error-text">
                        <AlertTriangle size={14} />
                        {errors.dias_operacion}
                      </span>
                    )}
                  </div>

                </div>
              </div>

              <div className="info-map-section">
                <div className="map-preview-header">
                  <h5><MapIcon size={18} /> Vista Previa del Recorrido</h5>
                </div>
                <div className="map-preview-container">
                  {formData.paradas.length > 0 ? (
                    <Map
                      initialViewState={initialViewState}
                      mapStyle={MAP_STYLE}
                      style={{ height: '100%', width: '100%' }}
                      attributionControl={false}
                    >
                      <NavigationControl position="top-right" />

                      {/* Route Line */}
                      {routeLineGeoJSON && (
                        <Source id="route-line" type="geojson" data={routeLineGeoJSON}>
                          <Layer
                            id="route-line-layer"
                            type="line"
                            paint={{
                              'line-color': '#0078D4',
                              'line-width': 4,
                              'line-opacity': 0.8,
                              'line-dasharray': [2, 1]
                            }}
                          />
                        </Source>
                      )}

                      {/* Stop Markers */}
                      {formData.paradas.map((parada, index) => {
                        if (!parada.latitud || !parada.longitud) return null;
                        const isFirst = index === 0;
                        const isLast = index === formData.paradas.length - 1;

                        return (
                          <Marker
                            key={`marker-${parada.id || index}-${parada.latitud}-${parada.longitud}`}
                            longitude={parada.longitud}
                            latitude={parada.latitud}
                            anchor="center"
                          >
                            <div
                              className={`route-marker-pin ${isFirst ? 'marker-start' : isLast ? 'marker-end' : 'marker-middle'}`}
                            >
                              <span className="marker-number">{index + 1}</span>
                            </div>
                          </Marker>
                        );
                      })}
                    </Map>
                  ) : (
                    <div className="map-placeholder">
                      <div className="map-placeholder-content">
                        <div className="placeholder-icon"><MapIcon size={64} strokeWidth={1.5} /></div>
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
