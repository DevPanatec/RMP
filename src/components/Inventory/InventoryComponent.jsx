import { useState, useEffect } from 'react';
import { appData } from '../../data/mockData';
import './InventoryComponent.css';

const InventoryComponent = ({ userType = 'admin' }) => {
  const [materials, setMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('todas');
  const [materialForm, setMaterialForm] = useState({
    codigo: '',
    nombre: '',
    categoria: 'Bolsas',
    unidad: 'Unidad',
    stockActual: 0,
    stockMinimo: 10,
    stockMaximo: 100,
    precio: 0,
    proveedor: '',
    descripcion: ''
  });

  // Inicializar datos del inventario
  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = () => {
    setIsLoading(true);
    
    // Simular carga de datos
    setTimeout(() => {
      // Materiales e insumos
      const materialsData = [
        {
          id: 'MAT001',
          codigo: 'BOL-REG-001',
          nombre: 'Bolsas de basura regulares',
          categoria: 'Bolsas',
          unidad: 'Paquete',
          stockActual: 150,
          stockMinimo: 50,
          stockMaximo: 300,
          precio: 12.50,
          proveedor: 'Distribuidora Central',
          descripcion: 'Bolsas de basura negras calibre 3, 100 unidades por paquete',
          ultimaActualizacion: '2024-01-25T08:30:00Z'
        },
        {
          id: 'MAT002',
          codigo: 'DESINF-001',
          nombre: 'Desinfectante industrial',
          categoria: 'Químicos',
          unidad: 'Galón',
          stockActual: 25,
          stockMinimo: 15,
          stockMaximo: 50,
          precio: 45.00,
          proveedor: 'Químicos del Pacífico',
          descripcion: 'Desinfectante concentrado para limpieza de camiones',
          ultimaActualizacion: '2024-01-24T14:20:00Z'
        },
        {
          id: 'MAT003',
          codigo: 'GUANT-LATEX-001',
          nombre: 'Guantes de látex',
          categoria: 'EPP',
          unidad: 'Caja',
          stockActual: 8,
          stockMinimo: 20,
          stockMaximo: 100,
          precio: 18.75,
          proveedor: 'Seguridad Total',
          descripcion: 'Guantes de látex desechables, 100 unidades por caja',
          ultimaActualizacion: '2024-01-23T16:45:00Z'
        },
        {
          id: 'MAT004',
          codigo: 'ESCOB-IND-001',
          nombre: 'Escobas industriales',
          categoria: 'Herramientas',
          unidad: 'Unidad',
          stockActual: 45,
          stockMinimo: 10,
          stockMaximo: 60,
          precio: 25.00,
          proveedor: 'Distribuidora Central',
          descripcion: 'Escobas de cerdas duras para limpieza industrial',
          ultimaActualizacion: '2024-01-22T09:15:00Z'
        },
        {
          id: 'MAT005',
          codigo: 'INSECT-SPRAY-001',
          nombre: 'Insecticida spray',
          categoria: 'Fumigación',
          unidad: 'Litro',
          stockActual: 12,
          stockMinimo: 8,
          stockMaximo: 30,
          precio: 35.50,
          proveedor: 'Químicos del Pacífico',
          descripcion: 'Insecticida concentrado para fumigación de plagas',
          ultimaActualizacion: '2024-01-21T11:30:00Z'
        },
        {
          id: 'MAT006',
          codigo: 'BOLSA-BIO-001',
          nombre: 'Bolsas biodegradables',
          categoria: 'Bolsas',
          unidad: 'Paquete',
          stockActual: 75,
          stockMinimo: 30,
          stockMaximo: 150,
          precio: 18.00,
          proveedor: 'EcoPackaging',
          descripcion: 'Bolsas biodegradables para residuos orgánicos',
          ultimaActualizacion: '2024-01-20T13:45:00Z'
        }
      ];

      setMaterials(materialsData);
      generateAlerts(materialsData);
      setIsLoading(false);
    }, 1000);
  };

  const generateAlerts = (materials) => {
    const newAlerts = [];
    
    materials.forEach(material => {
      const stockPercentage = (material.stockActual / material.stockMaximo) * 100;
      
      if (material.stockActual <= material.stockMinimo) {
        newAlerts.push({
          id: `alert-${material.id}`,
          type: material.stockActual === 0 ? 'critical' : 'warning',
          message: material.stockActual === 0 
            ? `${material.nombre} está agotado`
            : `${material.nombre} tiene stock bajo (${material.stockActual} ${material.unidad})`,
          materialId: material.id,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    setAlerts(newAlerts);
  };

  // Filtrar materiales
  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'todas' || material.categoria === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Estadísticas del inventario
  const getInventoryStats = () => {
    const totalMaterials = materials.length;
    const totalValue = materials.reduce((sum, material) => sum + (material.stockActual * material.precio), 0);
    const lowStockCount = materials.filter(m => m.stockActual <= m.stockMinimo).length;
    const criticalStockCount = materials.filter(m => m.stockActual === 0).length;
    const categoriesCount = [...new Set(materials.map(m => m.categoria))].length;
    
    return {
      totalMaterials,
      totalValue,
      lowStockCount,
      criticalStockCount,
      categoriesCount
    };
  };

  const stats = getInventoryStats();

  const handleViewMaterial = (material) => {
    setSelectedMaterial(material);
    setShowMaterialModal(true);
  };

  const handleAddMaterial = () => {
    setSelectedMaterial(null);
    setMaterialForm({
      codigo: '',
      nombre: '',
      categoria: 'Bolsas',
      unidad: 'Unidad',
      stockActual: 0,
      stockMinimo: 10,
      stockMaximo: 100,
      precio: 0,
      proveedor: '',
      descripcion: ''
    });
    setShowMaterialModal(true);
  };

  const handleSaveMaterial = () => {
    if (!materialForm.codigo || !materialForm.nombre) return;
    
    const newMaterial = {
      id: selectedMaterial ? selectedMaterial.id : `MAT${String(materials.length + 1).padStart(3, '0')}`,
      ...materialForm,
      ultimaActualizacion: new Date().toISOString()
    };
    
    if (selectedMaterial) {
      setMaterials(prev => prev.map(m => m.id === selectedMaterial.id ? newMaterial : m));
    } else {
      setMaterials(prev => [...prev, newMaterial]);
    }
    
    setShowMaterialModal(false);
    setTimeout(() => generateAlerts(materials), 100);
  };

  const handleUpdateStock = (materialId, newStock) => {
    setMaterials(prev => prev.map(material => 
      material.id === materialId 
        ? { ...material, stockActual: newStock, ultimaActualizacion: new Date().toISOString() }
        : material
    ));
    setTimeout(() => generateAlerts(materials), 100);
  };

  const getStockStatus = (material) => {
    if (material.stockActual === 0) return 'agotado';
    if (material.stockActual <= material.stockMinimo) return 'bajo';
    if (material.stockActual >= material.stockMaximo * 0.8) return 'alto';
    return 'normal';
  };

  const getStockColor = (status) => {
    switch (status) {
      case 'agotado': return '#dc3545';
      case 'bajo': return '#ffc107';
      case 'alto': return '#28a745';
      default: return '#6c757d';
    }
  };

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <div className="inventory-title">
          <h2>📦 Inventario General</h2>
          <p>Gestión completa de materiales, insumos y herramientas</p>
        </div>
        <div className="inventory-actions">
          <button className="btn btn--primary" onClick={handleAddMaterial}>
            ➕ Agregar Material
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="inventory-loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Cargando inventario...</p>
          </div>
        </div>
      ) : (
        <div className="inventory-body">
          {/* Estadísticas generales */}
          <div className="inventory-stats">
            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-data">
                <div className="stat-value">{stats.totalMaterials}</div>
                <div className="stat-label">Materiales</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-data">
                <div className="stat-value">${stats.totalValue.toFixed(2)}</div>
                <div className="stat-label">Valor Total</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⚠️</div>
              <div className="stat-data">
                <div className="stat-value">{stats.lowStockCount}</div>
                <div className="stat-label">Stock Bajo</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🚨</div>
              <div className="stat-data">
                <div className="stat-value">{stats.criticalStockCount}</div>
                <div className="stat-label">Agotados</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📋</div>
              <div className="stat-data">
                <div className="stat-value">{stats.categoriesCount}</div>
                <div className="stat-label">Categorías</div>
              </div>
            </div>
          </div>

          {/* Alertas */}
          {alerts.length > 0 && (
            <div className="inventory-alerts">
              <h3>🚨 Alertas de Inventario</h3>
              <div className="alerts-list">
                {alerts.map(alert => (
                  <div key={alert.id} className={`alert alert-${alert.type}`}>
                    <span className="alert-icon">
                      {alert.type === 'critical' ? '🚨' : '⚠️'}
                    </span>
                    <span className="alert-message">{alert.message}</span>
                    <button 
                      className="alert-action"
                      onClick={() => {
                        const material = materials.find(m => m.id === alert.materialId);
                        if (material) handleViewMaterial(material);
                      }}
                    >
                      Ver Material
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="inventory-filters">
            <div className="filter-group">
              <label>🔍 Buscar:</label>
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="filter-input"
              />
            </div>
            <div className="filter-group">
              <label>📂 Categoría:</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="filter-select"
              >
                <option value="todas">Todas</option>
                <option value="Bolsas">Bolsas</option>
                <option value="Químicos">Químicos</option>
                <option value="EPP">EPP</option>
                <option value="Herramientas">Herramientas</option>
                <option value="Fumigación">Fumigación</option>
              </select>
            </div>
          </div>

          {/* Lista de materiales */}
          <div className="materials-section">
            <h3>📋 Materiales e Insumos ({filteredMaterials.length})</h3>
            <div className="materials-grid">
              {filteredMaterials.map(material => {
                const stockStatus = getStockStatus(material);
                const stockColor = getStockColor(stockStatus);
                
                return (
                  <div key={material.id} className={`material-card material-${stockStatus}`}>
                    <div className="material-header">
                      <div className="material-info">
                        <h4>{material.nombre}</h4>
                        <span className="material-code">{material.codigo}</span>
                      </div>
                      <div className="material-category">
                        {material.categoria}
                      </div>
                    </div>
                    
                    <div className="material-stock">
                      <div className="stock-bar">
                        <div 
                          className="stock-fill"
                          style={{ 
                            width: `${Math.min((material.stockActual / material.stockMaximo) * 100, 100)}%`,
                            backgroundColor: stockColor
                          }}
                        ></div>
                      </div>
                      <div className="stock-info">
                        <span className="stock-current">{material.stockActual} {material.unidad}</span>
                        <span className="stock-range">Min: {material.stockMinimo} | Max: {material.stockMaximo}</span>
                      </div>
                    </div>
                    
                    <div className="material-details">
                      <div className="detail-item">
                        <span className="detail-label">Precio:</span>
                        <span className="detail-value">${material.precio}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Proveedor:</span>
                        <span className="detail-value">{material.proveedor}</span>
                      </div>
                    </div>
                    
                    <div className="material-actions">
                      <button 
                        className="btn btn--small btn--outline"
                        onClick={() => handleViewMaterial(material)}
                      >
                        👁️ Ver
                      </button>
                      <button 
                        className="btn btn--small btn--primary"
                        onClick={() => {
                          const newStock = prompt(`Actualizar stock de ${material.nombre}:`, material.stockActual);
                          if (newStock !== null && !isNaN(newStock) && newStock >= 0) {
                            handleUpdateStock(material.id, parseInt(newStock));
                          }
                        }}
                      >
                        📝 Actualizar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal de material */}
      {showMaterialModal && (
        <div className="modal-overlay" onClick={() => setShowMaterialModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedMaterial ? 'Editar Material' : 'Agregar Material'}</h3>
              <button className="modal-close" onClick={() => setShowMaterialModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {selectedMaterial ? (
                <div className="material-details-view">
                  <h4>{selectedMaterial.nombre}</h4>
                  <div className="details-grid">
                    <div className="detail-item">
                      <label>Código:</label>
                      <span>{selectedMaterial.codigo}</span>
                    </div>
                    <div className="detail-item">
                      <label>Categoría:</label>
                      <span>{selectedMaterial.categoria}</span>
                    </div>
                    <div className="detail-item">
                      <label>Unidad:</label>
                      <span>{selectedMaterial.unidad}</span>
                    </div>
                    <div className="detail-item">
                      <label>Stock Actual:</label>
                      <span>{selectedMaterial.stockActual}</span>
                    </div>
                    <div className="detail-item">
                      <label>Stock Mínimo:</label>
                      <span>{selectedMaterial.stockMinimo}</span>
                    </div>
                    <div className="detail-item">
                      <label>Stock Máximo:</label>
                      <span>{selectedMaterial.stockMaximo}</span>
                    </div>
                    <div className="detail-item">
                      <label>Precio:</label>
                      <span>${selectedMaterial.precio}</span>
                    </div>
                    <div className="detail-item">
                      <label>Proveedor:</label>
                      <span>{selectedMaterial.proveedor}</span>
                    </div>
                  </div>
                  <div className="detail-description">
                    <label>Descripción:</label>
                    <p>{selectedMaterial.descripcion}</p>
                  </div>
                </div>
              ) : (
                <div className="material-form">
                  <div className="form-group">
                    <label>Código:</label>
                    <input
                      type="text"
                      value={materialForm.codigo}
                      onChange={(e) => setMaterialForm(prev => ({ ...prev, codigo: e.target.value }))}
                      placeholder="Ej: BOL-REG-001"
                    />
                  </div>
                  <div className="form-group">
                    <label>Nombre:</label>
                    <input
                      type="text"
                      value={materialForm.nombre}
                      onChange={(e) => setMaterialForm(prev => ({ ...prev, nombre: e.target.value }))}
                      placeholder="Nombre del material"
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Categoría:</label>
                      <select
                        value={materialForm.categoria}
                        onChange={(e) => setMaterialForm(prev => ({ ...prev, categoria: e.target.value }))}
                      >
                        <option value="Bolsas">Bolsas</option>
                        <option value="Químicos">Químicos</option>
                        <option value="EPP">EPP</option>
                        <option value="Herramientas">Herramientas</option>
                        <option value="Fumigación">Fumigación</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Unidad:</label>
                      <select
                        value={materialForm.unidad}
                        onChange={(e) => setMaterialForm(prev => ({ ...prev, unidad: e.target.value }))}
                      >
                        <option value="Unidad">Unidad</option>
                        <option value="Paquete">Paquete</option>
                        <option value="Caja">Caja</option>
                        <option value="Galón">Galón</option>
                        <option value="Litro">Litro</option>
                        <option value="Kg">Kg</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Stock Actual:</label>
                      <input
                        type="number"
                        value={materialForm.stockActual}
                        onChange={(e) => setMaterialForm(prev => ({ ...prev, stockActual: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>Stock Mínimo:</label>
                      <input
                        type="number"
                        value={materialForm.stockMinimo}
                        onChange={(e) => setMaterialForm(prev => ({ ...prev, stockMinimo: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>Stock Máximo:</label>
                      <input
                        type="number"
                        value={materialForm.stockMaximo}
                        onChange={(e) => setMaterialForm(prev => ({ ...prev, stockMaximo: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Precio:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={materialForm.precio}
                        onChange={(e) => setMaterialForm(prev => ({ ...prev, precio: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>Proveedor:</label>
                      <input
                        type="text"
                        value={materialForm.proveedor}
                        onChange={(e) => setMaterialForm(prev => ({ ...prev, proveedor: e.target.value }))}
                        placeholder="Nombre del proveedor"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Descripción:</label>
                    <textarea
                      value={materialForm.descripcion}
                      onChange={(e) => setMaterialForm(prev => ({ ...prev, descripcion: e.target.value }))}
                      placeholder="Descripción del material"
                      rows="3"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="modal-actions">
              {!selectedMaterial && (
                <button className="btn btn--primary" onClick={handleSaveMaterial}>
                  💾 Guardar
                </button>
              )}
              <button className="btn btn--secondary" onClick={() => setShowMaterialModal(false)}>
                ❌ Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryComponent;