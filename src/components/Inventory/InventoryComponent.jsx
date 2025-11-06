import { useState, useEffect, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { Package, FileText, AlertTriangle, X, Loader, CheckCircle, Search, Filter, LayoutGrid, List, Eye, Edit, Trash2, TrendingUp, TrendingDown } from '../Icons';
import ItemDetailModal from './ItemDetailModal';
import './InventoryComponent.css';

const InventoryComponent = ({ userType = 'admin' }) => {
  const { materials, lugares, codigoSugerido, loading, error, getInventoryStats, searchMaterials, addMaterial, updateMaterial, deleteMaterial } = useInventory();
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [categoryFilter, setCategoryFilter] = useState('todos');
  const [newMaterialData, setNewMaterialData] = useState({
    nombre: '',
    tipo_articulo: 'insumo',
    descripcion: '',
    unidad_medida: '',
    lugar_id: '',
    cantidad_inicial: 0,
    cantidad_minima: '',
    cantidad_maxima: '',
    proveedor: ''
  });
  const [editMaterialData, setEditMaterialData] = useState({
    cantidad_disponible: 0,
    cantidad_minima: '',
    cantidad_maxima: '',
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
        material.tipo_articulo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        material.proveedor?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtrar por tipo de artículo
    if (categoryFilter !== 'todos') {
      filtered = filtered.filter(material => material.tipo_articulo === categoryFilter);
    }

    return filtered;
  }, [materials, searchQuery, categoryFilter]);

  // Obtener tipos de artículos únicos
  const categories = useMemo(() => {
    const tipos = [...new Set(materials.map(m => m.tipo_articulo || 'insumo'))];
    return ['todos', ...tipos];
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
      const minStock = material.cantidad_minima || 0;
      if (material.cantidad_disponible <= minStock) {
        alerts.push({
          id: `ALERT${material._id}`,
          tipo: material.cantidad_disponible < minStock * 0.5 ? 'crítico' : 'advertencia',
          material: material.nombre,
          mensaje: material.cantidad_disponible < minStock * 0.5
            ? `Stock crítico: ${material.cantidad_disponible} ${material.unidad_medida || 'unidades'} restantes`
            : `Stock bajo: ${material.cantidad_disponible} ${material.unidad_medida || 'unidades'} restantes`,
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
    const minStock = material.cantidad_minima || 0;
    const maxStock = material.cantidad_maxima || 100;
    if (material.cantidad_disponible < minStock * 0.5) return 'crítico';
    if (material.cantidad_disponible <= minStock) return 'bajo';
    if (material.cantidad_disponible >= maxStock * 0.8) return 'alto';
    return 'normal';
  };

  const getStockPercentage = (material) => {
    const minStock = material.cantidad_minima || 0;
    const maxStock = material.cantidad_maxima || 100;
    const range = maxStock - minStock;
    if (range <= 0) return 100;
    const current = material.cantidad_disponible - minStock;
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
      tipo_articulo: 'insumo',
      descripcion: '',
      unidad_medida: '',
      lugar_id: '',
      cantidad_inicial: 0,
      cantidad_minima: '',
      cantidad_maxima: '',
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

    if (!newMaterialData.tipo_articulo) {
      alert('Por favor selecciona el tipo de artículo');
      return;
    }

    if (!newMaterialData.lugar_id) {
      alert('Por favor selecciona una ubicación inicial');
      return;
    }

    setIsSubmitting(true);

    try {
      const materialToAdd = {
        codigo: codigoSugerido || `MAT-${String(materials.length + 1).padStart(3, '0')}`,
        nombre: newMaterialData.nombre,
        descripcion: newMaterialData.descripcion || undefined,
        tipo_articulo: newMaterialData.tipo_articulo,
        lugar_id: newMaterialData.lugar_id,
        cantidad_inicial: parseFloat(newMaterialData.cantidad_inicial) || 0,
        cantidad_minima: newMaterialData.cantidad_minima ? parseFloat(newMaterialData.cantidad_minima) : undefined,
        cantidad_maxima: newMaterialData.cantidad_maxima ? parseFloat(newMaterialData.cantidad_maxima) : undefined,
        unidad_medida: newMaterialData.unidad_medida || undefined,
        proveedor: newMaterialData.proveedor || undefined
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
    setShowDetailModal(true);
  };

  const handleEditMaterial = (material) => {
    setSelectedMaterial(material);
    setEditMaterialData({
      cantidad_disponible: material.cantidad_disponible,
      cantidad_minima: material.cantidad_minima || '',
      cantidad_maxima: material.cantidad_maxima || '',
      proveedor: material.proveedor || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    if (!selectedMaterial) return;

    setIsSubmitting(true);
    try {
      await updateMaterial(selectedMaterial._id, {
        cantidad_disponible: parseFloat(editMaterialData.cantidad_disponible),
        cantidad_minima: editMaterialData.cantidad_minima ? parseFloat(editMaterialData.cantidad_minima) : undefined,
        cantidad_maxima: editMaterialData.cantidad_maxima ? parseFloat(editMaterialData.cantidad_maxima) : undefined,
        proveedor: editMaterialData.proveedor || undefined
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
        await deleteMaterial(material._id);
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
                  : materials.filter(m => m.tipo_articulo === cat).length
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
                <th>Tipo</th>
                <th>Ubicaciones</th>
                <th>Stock Total</th>
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
                  <tr key={material._id} style={{ animationDelay: `${index * 0.05}s` }}>
                    <td>
                      <div className="material-code">{material.codigo || 'N/A'}</div>
                    </td>
                    <td>
                      <div className="material-info-modern">
                        <div className="material-name-modern">{material.nombre}</div>
                        {material.descripcion && <div className="material-description-modern">{material.descripcion}</div>}
                      </div>
                    </td>
                    <td>
                      <span className="material-type-badge">{material.tipo_articulo}</span>
                    </td>
                    <td>
                      <div className="ubicaciones-count">
                        {material.num_ubicaciones || 0} ubicación{material.num_ubicaciones !== 1 ? 'es' : ''}
                      </div>
                    </td>
                    <td>
                      <div className="stock-info-modern">
                        <div className="stock-amount-modern">{material.cantidad_disponible} <span className="stock-unit-modern">{material.unidad_medida || 'unidades'}</span></div>
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
                        <span className="stock-min-modern">{material.cantidad_minima || 0}</span>
                        <span className="stock-separator-modern">/</span>
                        <span className="stock-max-modern">{material.cantidad_maxima || 100}</span>
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
                          title="Ver detalles y ubicaciones"
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
                  <p className="material-code-text">{material.codigo || 'N/A'} • {material.tipo_articulo}</p>
                  <div className="material-ubicaciones-info">
                    {material.num_ubicaciones || 0} ubicación{material.num_ubicaciones !== 1 ? 'es' : ''}
                  </div>
                  <div className="material-stock-visual">
                    <div className="stock-value-large">
                      {material.cantidad_disponible} <span>{material.unidad_medida || 'unidades'}</span>
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
                      Rango: {material.cantidad_minima || 0} - {material.cantidad_maxima || 100}
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
                <div className="form-info-codigo">
                  <label>Código a Asignar</label>
                  <div className="codigo-preview">{codigoSugerido || 'Cargando...'}</div>
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

                <div className="form-group-main">
                  <label htmlFor="tipo_articulo">Tipo de Artículo *</label>
                  <select
                    id="tipo_articulo"
                    value={newMaterialData.tipo_articulo}
                    onChange={(e) => handleInputChange('tipo_articulo', e.target.value)}
                    required
                    className="input-main"
                  >
                    <option value="insumo">Insumo</option>
                    <option value="herramienta">Herramienta</option>
                    <option value="equipo">Equipo</option>
                    <option value="uniforme">Uniforme</option>
                  </select>
                </div>

                <div className="form-group-main">
                  <label htmlFor="descripcion">Descripción</label>
                  <textarea
                    id="descripcion"
                    value={newMaterialData.descripcion}
                    onChange={(e) => handleInputChange('descripcion', e.target.value)}
                    placeholder="Descripción del material (opcional)"
                    rows="2"
                  />
                </div>

                <div className="form-group-main">
                  <label htmlFor="lugar_id">Ubicación Inicial *</label>
                  <select
                    id="lugar_id"
                    value={newMaterialData.lugar_id}
                    onChange={(e) => handleInputChange('lugar_id', e.target.value)}
                    required
                    className="input-main"
                  >
                    <option value="">Seleccione una ubicación...</option>
                    {lugares && lugares.map(lugar => (
                      <option key={lugar._id} value={lugar._id}>
                        {lugar.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row-simple">
                  <div className="form-group">
                    <label htmlFor="unidad_medida">Unidad de Medida</label>
                    <input
                      type="text"
                      id="unidad_medida"
                      value={newMaterialData.unidad_medida}
                      onChange={(e) => handleInputChange('unidad_medida', e.target.value)}
                      placeholder="Unidad, Paquete, Caja, Litro..."
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cantidad_inicial">Cantidad Inicial *</label>
                    <input
                      type="number"
                      id="cantidad_inicial"
                      value={newMaterialData.cantidad_inicial}
                      onChange={(e) => handleInputChange('cantidad_inicial', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      placeholder="0"
                      required
                    />
                  </div>
                </div>

                <div className="form-row-simple">
                  <div className="form-group">
                    <label htmlFor="cantidad_minima">Cantidad Mínima</label>
                    <input
                      type="number"
                      id="cantidad_minima"
                      value={newMaterialData.cantidad_minima}
                      onChange={(e) => handleInputChange('cantidad_minima', e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="Opcional"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cantidad_maxima">Cantidad Máxima</label>
                    <input
                      type="number"
                      id="cantidad_maxima"
                      value={newMaterialData.cantidad_maxima}
                      onChange={(e) => handleInputChange('cantidad_maxima', e.target.value)}
                      min="0"
                      step="0.01"
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

      {/* Modal de detalles con ubicaciones */}
      {showDetailModal && selectedMaterial && (
        <ItemDetailModal
          item={selectedMaterial}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedMaterial(null);
          }}
        />
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
                  <p><FileText size={16} /> Tipo: {selectedMaterial.tipo_articulo}</p>
                </div>

                <div className="form-row-simple">
                  <div className="form-group">
                    <label htmlFor="editCantidadDisponible">Cantidad Disponible</label>
                    <input
                      type="number"
                      id="editCantidadDisponible"
                      value={editMaterialData.cantidad_disponible}
                      onChange={(e) => setEditMaterialData(prev => ({
                        ...prev,
                        cantidad_disponible: parseFloat(e.target.value) || 0
                      }))}
                      min="0"
                      step="0.01"
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
                    <label htmlFor="editCantidadMinima">Cantidad Mínima</label>
                    <input
                      type="number"
                      id="editCantidadMinima"
                      value={editMaterialData.cantidad_minima}
                      onChange={(e) => setEditMaterialData(prev => ({
                        ...prev,
                        cantidad_minima: e.target.value
                      }))}
                      min="0"
                      step="0.01"
                      placeholder="Opcional"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="editCantidadMaxima">Cantidad Máxima</label>
                    <input
                      type="number"
                      id="editCantidadMaxima"
                      value={editMaterialData.cantidad_maxima}
                      onChange={(e) => setEditMaterialData(prev => ({
                        ...prev,
                        cantidad_maxima: e.target.value
                      }))}
                      min="0"
                      step="0.01"
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
