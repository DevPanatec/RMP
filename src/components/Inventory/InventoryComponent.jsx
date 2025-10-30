import { useState, useEffect, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { Package, FileText, AlertTriangle, X, Loader, CheckCircle, Search, Filter, LayoutGrid, List, Eye, Edit, Trash2, TrendingUp, TrendingDown } from '../Icons';
import './InventoryComponent.css';

const InventoryComponent = ({ userType = 'admin' }) => {
  const { materials, loading, error, getInventoryStats, searchMaterials, addMaterial, updateMaterial, deleteMaterial } = useInventory();
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [categoryFilter, setCategoryFilter] = useState('todos');
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

  // Filtrar y buscar materiales
  const filteredMaterials = useMemo(() => {
    if (!materials) return [];
    let filtered = [...materials];

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      filtered = filtered.filter(material =>
        material.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        material.codigo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        material.proveedor?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtrar por categoría
    if (categoryFilter !== 'todos') {
      filtered = filtered.filter(material => material.categoria === categoryFilter);
    }

    return filtered;
  }, [materials, searchQuery, categoryFilter]);

  // Obtener categorías únicas
  const categories = useMemo(() => {
    const cats = [...new Set(materials.map(m => m.categoria || 'General'))];
    return ['todos', ...cats];
  }, [materials]);

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
          fecha: (() => {
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          })(),
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

  const getStockPercentage = (material) => {
    const range = material.stockMaximo - material.stockMinimo;
    if (range <= 0) return 100;
    const current = material.stockActual - material.stockMinimo;
    return Math.min(100, Math.max(0, (current / range) * 100));
  };

  const getStockColor = (status) => {
    switch (status) {
      case 'crítico': return '#ff3b30';
      case 'bajo': return '#ff9500';
      case 'alto': return '#007aff';
      default: return '#34c759';
    }
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
      <div className="inventory-header-modern">
        <div className="inventory-header-top">
          <div className="inventory-title-section">
            <div className="title-icon-wrapper">
              <Package size={32} />
            </div>
            <div>
              <h3>Gestión de Materiales e Insumos</h3>
              <p>Control integral de materiales e insumos</p>
            </div>
          </div>
          <div className="inventory-actions-modern">
            <button className="btn-modern btn-secondary">
              <FileText size={18} /> Importar
            </button>
            <button
              className="btn-modern btn-primary"
              onClick={() => setShowMaterialModal(true)}
            >
              <Package size={18} /> Nuevo Material
            </button>
          </div>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="inventory-controls">
          <div className="search-box-modern">
            <Search size={20} />
            <input
              type="text"
              placeholder="Buscar materiales por nombre, código o proveedor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => setSearchQuery('')}>
                <X size={16} />
              </button>
            )}
          </div>

          <div className="view-toggles">
            <button
              className={`view-toggle ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Vista de tabla"
            >
              <List size={20} />
            </button>
            <button
              className={`view-toggle ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Vista de tarjetas"
            >
              <LayoutGrid size={20} />
            </button>
          </div>
        </div>

        {/* Filtros por categoría */}
        <div className="category-filters">
          {categories.map(cat => (
            <button
              key={cat}
              className={`category-chip ${categoryFilter === cat ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === 'todos' ? 'Todos' : cat}
              <span className="chip-count">
                {cat === 'todos'
                  ? materials.length
                  : materials.filter(m => (m.categoria || 'General') === cat).length
                }
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Alertas de inventario mejoradas */}
      {alerts.length > 0 && (
        <div className="inventory-alerts-modern">
          <div className="alerts-header">
            <div className="alerts-title">
              <AlertTriangle size={22} />
              <h4>Alertas de Inventario</h4>
            </div>
            <span className="alerts-badge">{alerts.length} activas</span>
          </div>
          <div className="alerts-grid-modern">
            {alerts.slice(0, 3).map((alert, index) => (
              <div
                key={alert.id}
                className={`alert-card-modern alert-${alert.tipo}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="alert-icon-modern">
                  <AlertTriangle size={28} />
                </div>
                <div className="alert-content-modern">
                  <div className="alert-material-modern">{alert.material}</div>
                  <div className="alert-message-modern">{alert.mensaje}</div>
                  <div className="alert-status-modern">
                    {alert.tipo === 'crítico' ? <TrendingDown size={14} /> : <AlertTriangle size={14} />}
                    <span>{alert.tipo.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estadísticas mejoradas */}
      <div className="inventory-stats-modern">
        <div className="stat-card-modern stat-total">
          <div className="stat-icon-modern">
            <Package size={32} />
          </div>
          <div className="stat-data-modern">
            <div className="stat-value-modern">{filteredMaterials.length}</div>
            <div className="stat-label-modern">Total Materiales</div>
            {searchQuery && <div className="stat-hint">de {materials.length} total</div>}
          </div>
        </div>
        <div className="stat-card-modern stat-low">
          <div className="stat-icon-modern">
            <AlertTriangle size={32} />
          </div>
          <div className="stat-data-modern">
            <div className="stat-value-modern">
              {materials.filter(m => getStockStatus(m) === 'bajo' || getStockStatus(m) === 'crítico').length}
            </div>
            <div className="stat-label-modern">Stock Bajo</div>
            <div className="stat-hint">requieren reposición</div>
          </div>
        </div>
        <div className="stat-card-modern stat-critical">
          <div className="stat-icon-modern">
            <TrendingDown size={32} />
          </div>
          <div className="stat-data-modern">
            <div className="stat-value-modern">
              {materials.filter(m => getStockStatus(m) === 'crítico').length}
            </div>
            <div className="stat-label-modern">Críticos</div>
            <div className="stat-hint">atención urgente</div>
          </div>
        </div>
        <div className="stat-card-modern stat-ok">
          <div className="stat-icon-modern">
            <CheckCircle size={32} />
          </div>
          <div className="stat-data-modern">
            <div className="stat-value-modern">
              {materials.filter(m => getStockStatus(m) === 'normal').length}
            </div>
            <div className="stat-label-modern">En Orden</div>
            <div className="stat-hint">stock adecuado</div>
          </div>
        </div>
      </div>

      {/* Vista condicional: Tabla o Grid */}
      {viewMode === 'table' ? (
        <div className="table-wrapper-modern">
          <table className="inventory-table-modern">
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
              {filteredMaterials.map((material, index) => {
                const status = getStockStatus(material);
                const percentage = getStockPercentage(material);
                const color = getStockColor(status);

                return (
                  <tr key={material.id} style={{ animationDelay: `${index * 0.05}s` }}>
                    <td>
                      <div className="material-code">{material.codigo}</div>
                    </td>
                    <td>
                      <div className="material-info-modern">
                        <div className="material-name-modern">{material.nombre}</div>
                        {material.descripcion && <div className="material-description-modern">{material.descripcion}</div>}
                      </div>
                    </td>
                    <td>
                      <div className="stock-info-modern">
                        <div className="stock-amount-modern">{material.stockActual} <span className="stock-unit-modern">{material.unidad}s</span></div>
                        <div className="stock-progress-bar">
                          <div
                            className="stock-progress-fill"
                            style={{
                              width: `${percentage}%`,
                              background: color
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="stock-range-modern">
                        <span className="stock-min-modern">{material.stockMinimo}</span>
                        <span className="stock-separator-modern">/</span>
                        <span className="stock-max-modern">{material.stockMaximo}</span>
                      </div>
                    </td>
                    <td className="proveedor-cell">{material.proveedor || '-'}</td>
                    <td>
                      <span className={`stock-badge stock-badge-${status}`}>
                        {status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons-modern">
                        <button
                          className="action-btn-modern action-view"
                          onClick={() => handleViewMaterial(material)}
                          title="Ver detalles"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="action-btn-modern action-edit"
                          onClick={() => handleEditMaterial(material)}
                          title="Editar material"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="action-btn-modern action-delete"
                          onClick={() => handleDeleteMaterial(material)}
                          title="Eliminar material"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredMaterials.length === 0 && (
            <div className="empty-state-modern">
              <Package size={64} />
              <h4>No se encontraron materiales</h4>
              <p>
                {searchQuery
                  ? `No hay materiales que coincidan con "${searchQuery}"`
                  : 'No hay materiales registrados en esta categoría'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="materials-grid-modern">
          {filteredMaterials.map((material, index) => {
            const status = getStockStatus(material);
            const percentage = getStockPercentage(material);
            const color = getStockColor(status);

            return (
              <div
                key={material.id}
                className={`material-card-modern material-${status}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="material-card-header">
                  <div className="material-card-icon">
                    <Package size={24} />
                  </div>
                  <span className={`material-status-badge badge-${status}`}>
                    {status.toUpperCase()}
                  </span>
                </div>
                <div className="material-card-body">
                  <h4>{material.nombre}</h4>
                  <p className="material-code-text">{material.codigo}</p>
                  <div className="material-stock-visual">
                    <div className="stock-value-large">
                      {material.stockActual} <span>{material.unidad}s</span>
                    </div>
                    <div className="stock-progress-large">
                      <div
                        className="stock-progress-fill-large"
                        style={{
                          width: `${percentage}%`,
                          background: color
                        }}
                      />
                    </div>
                    <div className="stock-range-text">
                      Rango: {material.stockMinimo} - {material.stockMaximo}
                    </div>
                  </div>
                  {material.proveedor && (
                    <div className="material-proveedor">
                      <strong>Proveedor:</strong> {material.proveedor}
                    </div>
                  )}
                </div>
                <div className="material-card-footer">
                  <button
                    className="card-btn card-btn-view"
                    onClick={() => handleViewMaterial(material)}
                  >
                    <Eye size={16} /> Ver
                  </button>
                  <button
                    className="card-btn card-btn-edit"
                    onClick={() => handleEditMaterial(material)}
                  >
                    <Edit size={16} /> Editar
                  </button>
                  <button
                    className="card-btn card-btn-delete"
                    onClick={() => handleDeleteMaterial(material)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
          {filteredMaterials.length === 0 && (
            <div className="empty-state-modern empty-grid">
              <Package size={64} />
              <h4>No se encontraron materiales</h4>
              <p>
                {searchQuery
                  ? `No hay materiales que coincidan con "${searchQuery}"`
                  : 'No hay materiales registrados en esta categoría'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );


  return (
    <div className="inventory-container">
      <div className="inventory-header-main">
        <div className="inventory-title">
          <h2><Package size={24} /> Gestión de Inventario</h2>
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
              <h3><Package size={20} /> Nuevo Material</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  resetForm();
                  setShowMaterialModal(false);
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmitMaterial} className="material-form-simple">
                <div className="form-info">
                  <p><FileText size={16} /> El código se generará automáticamente</p>
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
                    {isSubmitting ? <><Loader size={16} /> Agregando...</> : <><CheckCircle size={16} /> Agregar Material</>}
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
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleUpdateStock} className="material-form-simple">
                <div className="form-info">
                  <p><FileText size={16} /> Código: {selectedMaterial.codigo}</p>
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
