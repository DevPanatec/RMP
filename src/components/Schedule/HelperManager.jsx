import { useState } from 'react';
import { Edit, Trash2, Plus, Check, X } from '../Icons';

const HelperManager = ({ helpers, onChange }) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');

  const handleAdd = () => {
    const newHelpers = [...helpers, 'Nuevo Ayudante'];
    onChange(newHelpers);
    setEditingIndex(newHelpers.length - 1);
    setEditValue('Nuevo Ayudante');
  };

  const handleEdit = (index, value) => {
    const newHelpers = [...helpers];
    newHelpers[index] = value;
    onChange(newHelpers);
    setEditingIndex(null);
    setEditValue('');
  };

  const handleRemove = (index) => {
    const newHelpers = helpers.filter((_, i) => i !== index);
    onChange(newHelpers);
  };

  const handleStartEdit = (index, value) => {
    setEditingIndex(index);
    setEditValue(value);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  return (
    <div className="helpers-manager">
      <label className="helpers-label">Ayudantes:</label>
      
      {helpers.length > 0 && (
        <div className="helpers-list">
          {helpers.map((helper, index) => (
            <div key={index} className="helper-item">
              {editingIndex === index ? (
                <>
                  <input
                    type="text"
                    className="helper-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleEdit(index, editValue);
                      }
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn-icon btn-icon--sm btn-icon--success"
                    onClick={() => handleEdit(index, editValue)}
                    title="Guardar"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon btn-icon--sm"
                    onClick={handleCancelEdit}
                    title="Cancelar"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <span className="helper-name">{helper}</span>
                  <button
                    type="button"
                    className="btn-icon btn-icon--sm"
                    onClick={() => handleStartEdit(index, helper)}
                    title="Editar"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon btn-icon--sm btn-icon--danger"
                    onClick={() => handleRemove(index)}
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      
      <button
        type="button"
        className="add-helper-btn"
        onClick={handleAdd}
      >
        <Plus size={16} /> Agregar Ayudante
      </button>
    </div>
  );
};

export default HelperManager;
