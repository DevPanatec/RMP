import { useState, useEffect } from 'react';
import { useSupabaseInventory } from '../../context/SupabaseInventoryContext';
import './InventoryComponent.css';

const InventoryComponent = ({ userType = 'admin' }) => {
  const { materials, loading, error, getInventoryStats, searchMaterials, addMaterial, updateMaterial, deleteMaterial } = useSupabaseInventory();
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMaterialData, setNewMaterialData] = useState({
    nombre: '',
    unidad: '',
    stockActual: 0,
    stockMinimo: '',
    stockMaximo: '',
    proveedor: ''
  });
  const [editMaterialData, setEditMaterialData] = useState({
    stockActual: 0,
    stockMinimo: '',
    stockMaximo: '',
    proveedor: ''
  });

  // Generar alertas cuando los materiales cambien
  useEffect(() => {
    if (materials.length > 0) {
      const generatedAlerts = generateAlerts(materials);
      setAlerts(generatedAlerts);
    }
  }, [materials]);


  const generateAlerts = (materials) => {
    const alerts = [];
    
    materials.forEach(material => {
      if (material.stockActual <= material.stockMinimo) {
        alerts.push({
          id: `ALERT${material.id}`,
          tipo: material.stockActual < material.stockMinimo * 0.5 ? 'crítico' : 'advertencia',
          material: material.nombre,
          mensaje: material.stockActual < material.stockMinimo * 0.5 
            ? `Stock crítico: ${material.stockActual} ${material.unidad}s restantes`
            : `Stock bajo: ${material.stockActual} ${material.unidad}s restantes`,
          fecha: new Date().toISOString().split('T')[0],
          estado: 'Activa'
        });
      }
    });
    
    return alerts;
  };

  const getStockStatus = (material) => {
    if (material.stockActual < material.stockMinimo * 0.5) return 'crítico';
    if (material.stockActual <= material.stockMinimo) return 'bajo';
    if (material.stockActual >= material.stockMaximo * 0.8) return 'alto';
    return 'normal';
  };

  // Manejar cambios en el formulario
  const handleInputChange = (field, value) => {
    setNewMaterialData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Generar código automáticamente
  const generateCode = () => {
    const count = materials.length + 1;
    return `MAT-${String(count).padStart(3, '0')}`;
  };

  // Resetear formulario
  const resetForm = () => {
    setNewMaterialData({
      nombre: '',
      unidad: '',
      stockActual: 0,
      stockMinimo: '',
      stockMaximo: '',
      proveedor: ''
    });
  };

  // Manejar envío del formulario
  const handleSubmitMaterial = async (e) => {
    e.preventDefault();
    
    // Validación básica
    if (!newMaterialData.nombre.trim()) {
      alert('Por favor ingresa el nombre del material');
      return;
    }

    setIsSubmitting(true);

    try {
      const materialToAdd = {
        codigo: generateCode(),
        nombre: newMaterialData.nombre,
        categoria: 'General', // Categoría por defecto
        unidad: newMaterialData.unidad || 'Unidad',
        stockActual: newMaterialData.stockActual || 0,
        stockMinimo: newMaterialData.stockMinimo ? parseInt(newMaterialData.stockMinimo) : 0,
        stockMaximo: newMaterialData.stockMaximo ? parseInt(newMaterialData.stockMaximo) : 100,
        proveedor: newMaterialData.proveedor || ''
      };

      await addMaterial(materialToAdd);
      alert('Material agregado exitosamente');
      resetForm();
      setShowMaterialModal(false);
    } catch (error) {
      console.error('Error al agregar material:', error);
      alert('Error al agregar el material: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Funciones para los botones de acciones
  const handleViewMaterial = (material) => {
    setSelectedMaterial(material);
    alert(`Material: ${material.nombre}\nCódigo: ${material.codigo}\nStock: ${material.stockActual} ${material.unidad}s\nProveedor: ${material.proveedor || 'No especificado'}`);
  };

  const handleEditMaterial = (material) => {
    setSelectedMaterial(material);
    setEditMaterialData({
      stockActual: material.stockActual,
      stockMinimo: material.stockMinimo || '',
      stockMaximo: material.stockMaximo || '',
      proveedor: material.proveedor || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    if (!selectedMaterial) return;

    setIsSubmitting(true);
    try {
      await updateMaterial(selectedMaterial.codigo, {
        stockActual: parseInt(editMaterialData.stockActual),
        stockMinimo: editMaterialData.stockMinimo ? parseInt(editMaterialData.stockMinimo) : 0,
        stockMaximo: editMaterialData.stockMaximo ? parseInt(editMaterialData.stockMaximo) : 100,
        proveedor: editMaterialData.proveedor
      });
      alert('Material actualizado exitosamente');
      setShowEditModal(false);
      setSelectedMaterial(null);
    } catch (error) {
      alert('Error al actualizar: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMaterial = async (material) => {
    if (window.confirm(`¿Estás seguro de eliminar "${material.nombre}"?`)) {
      try {
        await deleteMaterial(material.codigo);
        alert('Material eliminado exitosamente');
      } catch (error) {
        alert('Error al eliminar: ' + error.message);
      }
    }
  };

  const renderMaterialsTab = () => (
    <div className="inventory-content">
      <div className="inventory-header">
        <h3>🗂️ Gestión de Materiales e Insumos</h3>
        <div className="inventory-actions">
          <button className="btn btn--secondary">
            📄 Importar Inventario
          </button>
          <button 
            className="btn btn--primary"
            onClick={() => setShowMaterialModal(true)}
          >
            🗂️ Nuevo Material
          </button>
        </div>
      </div>

      {/* Alertas de inventario */}
      {alerts.length > 0 && (
        <div className="inventory-alerts">
          <h4>⚠️ Alertas de Inventario</h4>
          <div className="alerts-grid">
            {alerts.slice(0, 3).map(alert => (
              <div key={alert.id} className={`alert-card alert-${alert.tipo}`}>
                <div className="alert-icon">
                  {alert.tipo === 'crítico' ? '⚠️' : '⚠️'}
                </div>
                <div className="alert-content">
                  <div className="alert-material">{alert.material}</div>
                  <div className="alert-message">{alert.mensaje}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estadísticas de inventario */}
      <div className="inventory-stats">
        <div className="stat-card">
          <div className="stat-icon">🗂️</div>
          <div className="stat-data">
            <div className="stat-value">{materials.length}</div>
            <div className="stat-label">Total Materiales</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-data">
            <div className="stat-value">
              {materials.filter(m => getStockStatus(m) === 'bajo' || getStockStatus(m) === 'crítico').length}
            </div>
            <div className="stat-label">Stock Bajo</div>
          </div>
        </div>
      </div>

      {/* Tabla de materiales */}
      <div className="table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Material</th>
              <th>Stock Actual</th>
              <th>Stock Mín/Máx</th>
              <th>Proveedor</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {materials.map(material => (
              <tr key={material.id}>
                <td>{material.codigo}</td>
                <td>
                  <div className="material-info">
                    <div className="material-name">{material.nombre}</div>
                    <div className="material-description">{material.descripcion}</div>
                  </div>
                </td>
                <td>
                  <div className="stock-info">
                    <span className="stock-amount">{material.stockActual}</span>
                    <span className="stock-unit">{material.unidad}s</span>
                  </div>
                </td>
                <td>
                  <div className="stock-range">
                    <span className="stock-min">{material.stockMinimo}</span>
                    <span className="stock-separator">/</span>
                    <span className="stock-max">{material.stockMaximo}</span>
                  </div>
                </td>
                <td>{material.proveedor}</td>
                <td>
                  <span className={`stock-status stock-${getStockStatus(material)}`}>
                    {material.estado}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="action-btn action-btn--view"
                      onClick={() => handleViewMaterial(material)}
                      title="Ver detalles"
                    >
                      Ver
                    </button>
                    <button 
                      className="action-btn action-btn--edit"
                      onClick={() => handleEditMaterial(material)}
                      title="Editar material"
                    >
                      Editar
                    </button>
                    <button 
                      className="action-btn action-btn--delete"
                      onClick={() => handleDeleteMaterial(material)}
                      title="Eliminar material"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );


  return (
    <div className="inventory-container">
      <div className="inventory-header-main">
        <div className="inventory-title">
          <h2>🗂️ Gestión de Inventario</h2>
          <p>Control integral de materiales e insumos</p>
        </div>
      </div>

      {loading ? (
        <div className="inventory-loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Cargando inventario...</p>
          </div>
        </div>
      ) : (
        <div className="inventory-body">
          {renderMaterialsTab()}
        </div>
      )}

      {/* Modales */}
      {showMaterialModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>🗂️ Nuevo Material</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  resetForm();
                  setShowMaterialModal(false);
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmitMaterial} className="material-form-simple">
                <div className="form-info">
                  <p>📝 El código se generará automáticamente</p>
                </div>

                <div className="form-group-main">
                  <label htmlFor="nombre">Nombre del Material *</label>
                  <input
                    type="text"
                    id="nombre"
                    value={newMaterialData.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    placeholder="Ej: Bolsas de basura, Desinfectante, Guantes..."
                    required
                    className="input-main"
                  />
                </div>

                <div className="form-row-simple">
                  <div className="form-group">
                    <label htmlFor="unidad">Unidad</label>
                    <input
                      type="text"
                      id="unidad"
                      value={newMaterialData.unidad}
                      onChange={(e) => handleInputChange('unidad', e.target.value)}
                      placeholder="Unidad, Paquete, Caja, Litro..."
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="stockActual">Stock Inicial</label>
                    <input
                      type="number"
                      id="stockActual"
                      value={newMaterialData.stockActual}
                      onChange={(e) => handleInputChange('stockActual', parseInt(e.target.value) || 0)}
                      min="0"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="form-row-simple">
                  <div className="form-group">
                    <label htmlFor="stockMinimo">Stock Mínimo</label>
                    <input
                      type="number"
                      id="stockMinimo"
                      value={newMaterialData.stockMinimo}
                      onChange={(e) => handleInputChange('stockMinimo', e.target.value)}
                      min="0"
                      placeholder="Opcional"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="stockMaximo">Stock Máximo</label>
                    <input
                      type="number"
                      id="stockMaximo"
                      value={newMaterialData.stockMaximo}
                      onChange={(e) => handleInputChange('stockMaximo', e.target.value)}
                      min="0"
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                <div className="form-group-main">
                  <label htmlFor="proveedor">Proveedor</label>
                  <input
                    type="text"
                    id="proveedor"
                    value={newMaterialData.proveedor}
                    onChange={(e) => handleInputChange('proveedor', e.target.value)}
                    placeholder="Nombre del proveedor (opcional)"
                  />
                </div>

                <div className="form-actions-simple">
                  <button 
                    type="button" 
                    className="btn-cancel"
                    onClick={() => {
                      resetForm();
                      setShowMaterialModal(false);
                    }}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? '⏳ Agregando...' : '✅ Agregar Material'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición */}
      {showEditModal && selectedMaterial && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Editar Material: {selectedMaterial.nombre}</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedMaterial(null);
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleUpdateStock} className="material-form-simple">
                <div className="form-info">
                  <p>📝 Código: {selectedMaterial.codigo}</p>
                </div>

                <div className="form-row-simple">
                  <div className="form-group">
                    <label htmlFor="editStockActual">Stock Actual</label>
                    <input
                      type="number"
                      id="editStockActual"
                      value={editMaterialData.stockActual}
                      onChange={(e) => setEditMaterialData(prev => ({
                        ...prev,
                        stockActual: parseInt(e.target.value) || 0
                      }))}
                      min="0"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="editProveedor">Proveedor</label>
                    <input
                      type="text"
                      id="editProveedor"
                      value={editMaterialData.proveedor}
                      onChange={(e) => setEditMaterialData(prev => ({
                        ...prev,
                        proveedor: e.target.value
                      }))}
                      placeholder="Proveedor"
                    />
                  </div>
                </div>

                <div className="form-row-simple">
                  <div className="form-group">
                    <label htmlFor="editStockMinimo">Stock Mínimo</label>
                    <input
                      type="number"
                      id="editStockMinimo"
                      value={editMaterialData.stockMinimo}
                      onChange={(e) => setEditMaterialData(prev => ({
                        ...prev,
                        stockMinimo: e.target.value
                      }))}
                      min="0"
                      placeholder="Opcional"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="editStockMaximo">Stock Máximo</label>
                    <input
                      type="number"
                      id="editStockMaximo"
                      value={editMaterialData.stockMaximo}
                      onChange={(e) => setEditMaterialData(prev => ({
                        ...prev,
                        stockMaximo: e.target.value
                      }))}
                      min="0"
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                <div className="form-actions-simple">
                  <button 
                    type="button" 
                    className="btn-cancel"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedMaterial(null);
                    }}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Actualizando...' : 'Actualizar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryComponent;
