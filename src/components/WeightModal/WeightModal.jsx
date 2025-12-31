import { useState, useEffect } from 'react';
import { FileText, Trash2, RefreshCw, Truck, Package, MapPin, ClipboardList, AlertTriangle, X, CheckCircle } from '../Icons';
import './WeightModal.css';

const WeightModal = ({ isOpen, onClose, onConfirm, onSkip, currentStop }) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedCategory('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    setError('');

    // Validaciones
    if (!selectedCategory) {
      setError('Por favor selecciona una categoría de carga');
      return;
    }

    const finalCategory = selectedCategory;

    setLoading(true);

    // Simular procesamiento
    setTimeout(() => {
      onConfirm(finalCategory);
      setLoading(false);
    }, 1000);
  };

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

  const getCategoryIcon = (type) => {
    const icons = {
      'baja': <FileText size={32} />,
      'intermedia': <Trash2 size={32} />,
      'alta': <RefreshCw size={32} />,
      'muy alta': <Truck size={32} />
    };
    return icons[type] || <Package size={32} />;
  };

  if (!isOpen) return null;

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