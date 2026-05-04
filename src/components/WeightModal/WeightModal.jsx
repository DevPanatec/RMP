import { useState, useEffect, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { FileText, Trash2, RefreshCw, Truck, Package, MapPin, ClipboardList, AlertTriangle, X, CheckCircle, Camera } from '../Icons';
import './WeightModal.css';

const CATEGORIES = [
  { key: 'baja', label: 'Baja', desc: 'Livianos', color: '#6b9656' },
  { key: 'intermedia', label: 'Media', desc: 'Mixtos', color: '#9b8456' },
  { key: 'alta', label: 'Alta', desc: 'Pesados', color: '#0078D4' },
  { key: 'muy alta', label: 'Muy Alta', desc: 'Gran vol.', color: '#a85a52' },
];

const WeightModal = ({ isOpen, onClose, onConfirm, onSkip, currentStop }) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [bolsas, setBolsas] = useState('');
  const [photoStorageId, setPhotoStorageId] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const fileInputRef = useRef(null);

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  useEffect(() => {
    if (isOpen) {
      setSelectedCategory('');
      setBolsas('');
      setPhotoStorageId(null);
      setPhotoPreview(null);
      setUploading(false);
      setSubmitting(false);
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!res.ok) throw new Error('Upload failed');
      const { storageId } = await res.json();
      setPhotoStorageId(storageId);
      setPhotoPreview(URL.createObjectURL(file));
    } catch (err) {
      console.error('Error subiendo foto:', err);
      setError('No se pudo subir la foto. Intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = () => {
    setPhotoStorageId(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!selectedCategory) {
      setError('Selecciona la categoría de carga');
      return;
    }
    setSubmitting(true);
    const bolsasNum = bolsas.trim() ? Number(bolsas) : undefined;
    await onConfirm(selectedCategory, {
      bolsas: bolsasNum,
      foto_storage_id: photoStorageId || undefined,
    });
    setSubmitting(false);
  };

  const getCategoryIcon = (type, size = 32) => {
    const icons = {
      'baja': <FileText size={size} />,
      'intermedia': <Trash2 size={size} />,
      'alta': <RefreshCw size={size} />,
      'muy alta': <Truck size={size} />,
    };
    return icons[type] || <Package size={size} />;
  };

  if (!isOpen) return null;

  // Sección compartida: extras (bolsas + foto + confirmar)
  const renderExtras = () => (
    <>
      <div className="weight-extras">
        <div className="weight-extras__field">
          <label className="weight-extras__label">
            <Package size={14} /> Bolsas (opcional)
          </label>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="Ej: 8"
            value={bolsas}
            onChange={(e) => setBolsas(e.target.value)}
            className="weight-extras__input"
          />
        </div>

        <div className="weight-extras__field">
          <label className="weight-extras__label">
            <Camera size={14} /> Foto del lugar (opcional)
          </label>
          {photoPreview ? (
            <div className="weight-extras__photo-preview">
              <img src={photoPreview} alt="Foto de la parada" />
              <button
                type="button"
                className="weight-extras__photo-remove"
                onClick={removePhoto}
                aria-label="Quitar foto"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="weight-extras__photo-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Camera size={18} />
              {uploading ? 'Subiendo...' : 'Tomar foto'}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoSelect}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {error && (
        <div className="error-message">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <button
        type="button"
        className="weight-confirm-btn"
        onClick={handleSubmit}
        disabled={!selectedCategory || uploading || submitting}
      >
        {submitting ? (
          <>
            <span className="spinner"></span>
            <span>Registrando...</span>
          </>
        ) : (
          <>
            <CheckCircle size={18} />
            <span>Confirmar parada</span>
          </>
        )}
      </button>
    </>
  );

  // ==========================================
  // MOBILE: Bottom sheet
  // ==========================================
  if (isMobile) {
    return (
      <div className="weight-sheet-backdrop" onClick={onClose}>
        <div className="weight-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="weight-sheet__handle" />

          <div className="weight-sheet__header">
            <div className="weight-sheet__stop-badge">
              <MapPin size={14} />
              <span>{currentStop}</span>
            </div>
            <button className="weight-sheet__close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="weight-sheet__title">Categoría de carga</div>

          <div className="weight-sheet__categories">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                className={`weight-sheet__cat ${selectedCategory === cat.key ? 'weight-sheet__cat--selected' : ''}`}
                data-category={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
              >
                <div className="weight-sheet__cat-icon">
                  {getCategoryIcon(cat.key, 24)}
                </div>
                <span className="weight-sheet__cat-label">{cat.label}</span>
                <span className="weight-sheet__cat-desc">{cat.desc}</span>
              </button>
            ))}
          </div>

          {renderExtras()}

          {onSkip && !submitting && (
            <button type="button" className="weight-sheet__skip" onClick={onSkip}>
              <AlertTriangle size={14} />
              <span>No puedo completar esta parada</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // DESKTOP: Modal clásico
  // ==========================================
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3><Package size={20} /> Registrar Recolección</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="stop-info">
            <div className="stop-icon">
              <MapPin size={20} />
            </div>
            <div className="stop-details">
              <div className="stop-name">{currentStop}</div>
              <div className="stop-description">
                Selecciona la categoría de carga y agrega bolsas/foto si corresponde
              </div>
            </div>
          </div>

          <div className="weight-options">
            <h4>Categoría de carga *</h4>
            <div className="weight-grid">
              {CATEGORIES.map((cat) => (
                <div
                  key={cat.key}
                  className={`weight-option ${selectedCategory === cat.key ? 'selected' : ''}`}
                  data-category={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                >
                  <div className="weight-icon">{getCategoryIcon(cat.key)}</div>
                  <div className="weight-content">
                    <div className="weight-type" style={{ textTransform: 'capitalize' }}>
                      {cat.label}
                    </div>
                    <div className="weight-description">{cat.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {renderExtras()}

          {onSkip && !submitting && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
              <button
                type="button"
                className="skip-stop-btn"
                onClick={onSkip}
              >
                <AlertTriangle size={18} />
                No puedo completar esta parada
              </button>
              <p style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginTop: '8px', marginBottom: 0 }}>
                Se creará un reporte de riesgo y avanzarás a la siguiente parada
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeightModal;
