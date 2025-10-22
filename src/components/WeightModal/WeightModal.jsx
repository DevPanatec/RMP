import { useState, useEffect } from 'react';
import { FileText, Trash2, RefreshCw, Truck, Package, MapPin, ClipboardList, AlertTriangle, X, CheckCircle } from '../Icons';
import './WeightModal.css';

const WeightModal = ({ isOpen, onClose, onConfirm, currentStop }) => {
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

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setError('');
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

          {error && (
            <div className="error-message">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          {/* Resumen */}
          {selectedCategory && (
            <div className="weight-summary">
              <div className="summary-header">
                <ClipboardList size={18} /> Resumen
              </div>
              <div className="summary-content">
                <div className="summary-item">
                  <span className="summary-label">Parada:</span>
                  <span className="summary-value">{currentStop}</span>
                </div>
                <div className="summary-item total">
                  <span className="summary-label">Categoría seleccionada:</span>
                  <span className="summary-value" style={{ textTransform: 'capitalize' }}>{selectedCategory}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button
            className="btn btn--outline btn--full-width"
            onClick={onClose}
            disabled={loading}
          >
            <X size={16} /> Cancelar
          </button>
          <button
            className="btn btn--primary btn--full-width"
            onClick={handleSubmit}
            disabled={loading || !selectedCategory}
          >
            {loading ? (
              <span className="loading-text">
                <span className="spinner"></span>
                Procesando...
              </span>
            ) : (
              <>
                <CheckCircle size={16} /> Confirmar Recolección
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeightModal; 