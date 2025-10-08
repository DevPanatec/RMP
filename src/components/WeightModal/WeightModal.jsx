import { useState, useEffect } from 'react';
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
      'baja': '📄',
      'intermedia': '🗑️',
      'alta': '♻️',
      'muy alta': '🚚'
    };
    return icons[type] || '📦';
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⚖️ Registrar Peso de Recolección</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className="modal-body">
          <div className="stop-info">
            <div className="stop-icon">📍</div>
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
              ⚠️ {error}
            </div>
          )}

          {/* Resumen */}
          {selectedCategory && (
            <div className="weight-summary">
              <div className="summary-header">📋 Resumen</div>
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
            ❌ Cancelar
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
              '✅ Confirmar Recolección'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeightModal; 