import { useState, useEffect } from 'react';
import { FileText, Trash2, RefreshCw, Truck, Package, MapPin, ClipboardList, AlertTriangle, X, CheckCircle } from '../Icons';
import './WeightModal.css';

const CATEGORIES = [
  { key: 'baja', label: 'Baja', desc: 'Livianos', color: '#6b9656' },
  { key: 'intermedia', label: 'Media', desc: 'Mixtos', color: '#9b8456' },
  { key: 'alta', label: 'Alta', desc: 'Pesados', color: '#0078D4' },
  { key: 'muy alta', label: 'Muy Alta', desc: 'Gran vol.', color: '#a85a52' },
];

const WeightModal = ({ isOpen, onClose, onConfirm, onSkip, currentStop }) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    if (isOpen) {
      setSelectedCategory('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCategorySelect = async (category) => {
    setSelectedCategory(category);
    setError('');
    setLoading(true);

    // Auto-confirmar después de seleccionar (pequeño delay para feedback visual)
    setTimeout(() => {
      onConfirm(category);
      setLoading(false);
    }, 500);
  };

  const getCategoryDescription = (type) => {
    const descriptions = {
      'baja': 'Carga Baja: residuos livianos',
      'intermedia': 'Carga Intermedia: residuos mixtos',
      'alta': 'Carga Alta: residuos pesados',
      'muy alta': 'Carga Muy Alta: gran volumen'
    };
    return descriptions[type] || '';
  };

  const getCategoryIcon = (type, size = 32) => {
    const icons = {
      'baja': <FileText size={size} />,
      'intermedia': <Trash2 size={size} />,
      'alta': <RefreshCw size={size} />,
      'muy alta': <Truck size={size} />
    };
    return icons[type] || <Package size={size} />;
  };

  if (!isOpen) return null;

  // ==========================================
  // MOBILE: Bottom sheet compacto
  // ==========================================
  if (isMobile) {
    return (
      <div className="weight-sheet-backdrop" onClick={onClose}>
        <div className="weight-sheet" onClick={(e) => e.stopPropagation()}>
          {/* Handle bar */}
          <div className="weight-sheet__handle" />

          {/* Header compacto */}
          <div className="weight-sheet__header">
            <div className="weight-sheet__stop-badge">
              <MapPin size={14} />
              <span>{currentStop}</span>
            </div>
            <button className="weight-sheet__close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          {/* Título */}
          <div className="weight-sheet__title">Categoría de carga</div>

          {/* Categorías en fila horizontal */}
          <div className="weight-sheet__categories">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                className={`weight-sheet__cat ${selectedCategory === cat.key ? 'weight-sheet__cat--selected' : ''}`}
                data-category={cat.key}
                onClick={() => handleCategorySelect(cat.key)}
                disabled={loading}
              >
                <div className="weight-sheet__cat-icon">
                  {getCategoryIcon(cat.key, 24)}
                </div>
                <span className="weight-sheet__cat-label">{cat.label}</span>
                <span className="weight-sheet__cat-desc">{cat.desc}</span>
              </button>
            ))}
          </div>

          {/* Loading feedback */}
          {loading && (
            <div className="weight-sheet__loading">
              <CheckCircle size={18} />
              <span>Registrando...</span>
            </div>
          )}

          {/* Skip */}
          {onSkip && !loading && (
            <button className="weight-sheet__skip" onClick={onSkip}>
              <AlertTriangle size={14} />
              <span>No puedo completar esta parada</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // DESKTOP: Modal clásico (sin cambios)
  // ==========================================
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3><Package size={20} /> Registrar Peso de Recolección</h3>
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
                Selecciona la cantidad de residuos recolectados en esta parada
              </div>
            </div>
          </div>

          <div className="weight-options">
            <h4>Selecciona la categoría de carga:</h4>
            <div className="weight-grid">
              {['baja', 'intermedia', 'alta', 'muy alta'].map((cat) => (
                <div
                  key={cat}
                  className={`weight-option ${selectedCategory === cat ? 'selected' : ''}`}
                  data-category={cat}
                  onClick={() => handleCategorySelect(cat)}
                >
                  <div className="weight-icon">{getCategoryIcon(cat)}</div>
                  <div className="weight-content">
                    <div className="weight-type" style={{ textTransform: 'capitalize' }}>
                      {cat}
                    </div>
                    <div className="weight-description">
                      {getCategoryDescription(cat)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botón para saltar parada */}
          {onSkip && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
              <button
                className="skip-stop-btn"
                onClick={onSkip}
                type="button"
              >
                <AlertTriangle size={18} />
                No puedo completar esta parada
              </button>
              <p style={{
                fontSize: '12px',
                color: '#6b7280',
                textAlign: 'center',
                marginTop: '8px',
                marginBottom: 0
              }}>
                Se creará un reporte de riesgo y avanzarás a la siguiente parada
              </p>
            </div>
          )}

          {error && (
            <div className="error-message">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          {/* Loading feedback */}
          {loading && (
            <div className="weight-loading">
              <span className="spinner"></span>
              <span>Registrando recolección...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeightModal;
