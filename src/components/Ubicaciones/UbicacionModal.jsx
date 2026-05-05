import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import MapLocationPicker from '../MapLocationPicker/MapLocationPicker';
import {
  X, Plus, Edit, Save, Camera, MapPin, AlertTriangle, FileText,
} from '../Icons';
import './UbicacionModal.css';

const MAX_NOMBRE = 100;
const MAX_DESC = 500;

const UbicacionModal = ({ isOpen, tipo, item, onClose, onSave }) => {
  const isEditing = !!item;
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [direccion, setDireccion] = useState('');
  const [photoStorageId, setPhotoStorageId] = useState(null);
  const [localPreview, setLocalPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [errors, setErrors] = useState({});
  const photoInputRef = useRef(null);

  const remoteUrl = useQuery(
    api.files.getUrl,
    photoStorageId && !localPreview ? { storageId: photoStorageId } : 'skip'
  );
  const photoPreview = localPreview || remoteUrl;

  useEffect(() => {
    if (!isOpen) return;
    if (isEditing && item) {
      setNombre(item.nombre || '');
      setDescripcion(item.descripcion || '');
      setLat(typeof item.latitud === 'number' ? item.latitud : null);
      setLng(typeof item.longitud === 'number' ? item.longitud : null);
      setDireccion('');
      setPhotoStorageId(item.foto_storage_id || null);
    } else {
      setNombre('');
      setDescripcion('');
      setLat(null);
      setLng(null);
      setDireccion('');
      setPhotoStorageId(null);
    }
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(null);
    setShowPicker(false);
    setErrors({});
  }, [isOpen, item, isEditing]);

  if (!isOpen) return null;

  const tipoLabel = tipo === 'sala' ? 'Sala (Limpieza)' : 'Lugar (Fumigación)';

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await generateUploadUrl();
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!res.ok) throw new Error('Upload failed');
      const { storageId } = await res.json();
      setPhotoStorageId(storageId);
      if (localPreview) URL.revokeObjectURL(localPreview);
      setLocalPreview(URL.createObjectURL(file));
    } catch (err) {
      console.error('Error subiendo foto:', err);
      alert('No se pudo subir la foto. Intenta de nuevo.');
    } finally {
      setUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const removePhoto = () => {
    setPhotoStorageId(null);
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handlePickedLocation = (loc) => {
    if (!loc?.latitud || !loc?.longitud) return;
    setLat(loc.latitud);
    setLng(loc.longitud);
    setDireccion(loc.direccion_completa || loc.direccion || '');
    setShowPicker(false);
  };

  const clearCoords = () => {
    setLat(null);
    setLng(null);
    setDireccion('');
  };

  const handleSave = () => {
    const newErrors = {};
    if (!nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      latitud: lat ?? undefined,
      longitud: lng ?? undefined,
      foto_storage_id: photoStorageId ?? undefined,
    };
    onSave(payload);
  };

  return (
    <div className="ubic-modal-overlay" onClick={onClose}>
      <div className="ubic-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="ubic-modal-header">
          <div className="ubic-modal-header-left">
            <h4>
              {isEditing ? <><Edit size={20} /> Editar {tipoLabel}</> : <><Plus size={20} /> Nueva {tipoLabel}</>}
            </h4>
            <p>Foto + ubicación GPS opcionales — se mostrarán en los reportes.</p>
          </div>
          <button className="ubic-modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="ubic-modal-body">
          <div className="ubic-form-grid">
            <div className="ubic-form-section">
              <h5><FileText size={16} /> Información Básica</h5>

              <div className="ubic-form-group">
                <label>
                  Nombre *
                  <span className="ubic-counter">({nombre.length}/{MAX_NOMBRE})</span>
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value.slice(0, MAX_NOMBRE))}
                  placeholder={tipo === 'sala' ? 'Ej: Almacén Central' : 'Ej: Mercado San Felipe'}
                  className={`ubic-input ${errors.nombre ? 'ubic-input--error' : ''}`}
                />
                {errors.nombre && <span className="ubic-error-text">{errors.nombre}</span>}
              </div>

              <div className="ubic-form-group">
                <label>
                  Descripción <span className="ubic-hint">(opcional)</span>
                  <span className="ubic-counter">({descripcion.length}/{MAX_DESC})</span>
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value.slice(0, MAX_DESC))}
                  placeholder="Notas, referencias o detalles del lugar"
                  className="ubic-textarea"
                  rows={3}
                />
              </div>
            </div>

            <div className="ubic-form-section">
              <h5><Camera size={16} /> Foto</h5>
              {photoPreview ? (
                <div className="ubic-photo-preview">
                  <img src={photoPreview} alt={nombre || 'Foto'} />
                  <button type="button" className="ubic-photo-remove" onClick={removePhoto} title="Quitar foto">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="ubic-photo-upload"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <span>Subiendo…</span> : (
                    <>
                      <Camera size={28} strokeWidth={1.5} />
                      <span>Subir foto</span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div className="ubic-form-section">
            <h5><MapPin size={16} /> Ubicación GPS <span className="ubic-hint">(opcional)</span></h5>
            {lat !== null && lng !== null ? (
              <div className="ubic-coords-summary">
                <MapPin size={14} />
                <span className="ubic-coords-text">
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                  {direccion && <small> · {direccion}</small>}
                </span>
                <button type="button" className="ubic-coords-clear" onClick={clearCoords} title="Quitar coordenadas">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <p className="ubic-hint-muted">Sin coordenadas asignadas.</p>
            )}
            <div className="ubic-coords-actions">
              <button
                type="button"
                className="btn btn--sm btn--outline"
                onClick={() => setShowPicker((s) => !s)}
              >
                <MapPin size={14} />
                {showPicker ? 'Cerrar mapa' : (lat !== null ? 'Cambiar punto' : 'Elegir en mapa')}
              </button>
            </div>
            {showPicker && (
              <div className="ubic-coords-picker">
                <MapLocationPicker
                  onLocationSelect={handlePickedLocation}
                  initialLocation={lat !== null && lng !== null ? [lat, lng] : null}
                  placeholder="Buscar dirección..."
                  height="320px"
                />
              </div>
            )}
          </div>
        </div>

        <div className="ubic-modal-footer">
          <span className={`ubic-validation ${nombre.trim() ? 'ubic-validation--ok' : 'ubic-validation--err'}`}>
            <AlertTriangle size={14} />
            {nombre.trim() ? 'Listo para guardar' : 'Falta el nombre'}
          </span>
          <div className="ubic-modal-actions">
            <button className="btn btn--secondary" onClick={onClose}>Cancelar</button>
            <button
              className="btn btn--primary"
              onClick={handleSave}
              disabled={!nombre.trim()}
            >
              {isEditing ? <><Save size={16} /> Actualizar</> : <><Plus size={16} /> Crear</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UbicacionModal;
