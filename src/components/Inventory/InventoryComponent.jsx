import { useState, useEffect } from 'react';
import { appData } from '../../data/mockData';
import './InventoryComponent.css';

const InventoryComponent = ({ userType = 'admin' }) => {
  const [activeInventoryTab, setActiveInventoryTab] = useState('materials');
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [consumption, setConsumption] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
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
          proveedor: 'Limpieza Total S.A.',
          ubicacion: 'Almacén A - Estante 1',
          fechaVencimiento: '2025-12-31',
          descripcion: 'Bolsas negras resistentes 30L',
          ultimaCompra: '2024-01-15',
          consumoMensual: 80,
          estado: 'Activo'
        },
        {
          id: 'MAT002',
          codigo: 'BOL-IND-002',
          nombre: 'Bolsas industriales',
          categoria: 'Bolsas',
          unidad: 'Paquete',
          stockActual: 25,
          stockMinimo: 30,
          stockMaximo: 100,
          precio: 28.75,
          proveedor: 'Suministros Panamá',
          ubicacion: 'Almacén A - Estante 1',
          fechaVencimiento: '2025-12-31',
          descripcion: 'Bolsas industriales extra resistentes 60L',
          ultimaCompra: '2024-01-10',
          consumoMensual: 35,
          estado: 'Stock Bajo'
        },
        {
          id: 'MAT003',
          codigo: 'DES-AMB-003',
          nombre: 'Desinfectante ambiental',
          categoria: 'Químicos',
          unidad: 'Galón',
          stockActual: 45,
          stockMinimo: 20,
          stockMaximo: 80,
          precio: 15.90,
          proveedor: 'Químicos Profesionales',
          ubicacion: 'Almacén B - Área Química',
          fechaVencimiento: '2024-08-15',
          descripcion: 'Desinfectante multiuso para ambientes',
          ultimaCompra: '2024-01-20',
          consumoMensual: 25,
          estado: 'Activo'
        },
        {
          id: 'MAT004',
          codigo: 'GLV-LAT-004',
          nombre: 'Guantes de látex',
          categoria: 'EPP',
          unidad: 'Caja',
          stockActual: 8,
          stockMinimo: 15,
          stockMaximo: 50,
          precio: 22.00,
          proveedor: 'Seguridad Industrial',
          ubicacion: 'Almacén C - EPP',
          fechaVencimiento: '2026-01-31',
          descripcion: 'Guantes desechables talla M',
          ultimaCompra: '2023-12-28',
          consumoMensual: 12,
          estado: 'Stock Crítico'
        },
        {
          id: 'MAT005',
          codigo: 'ESC-IND-005',
          nombre: 'Escobas industriales',
          categoria: 'Herramientas',
          unidad: 'Unidad',
          stockActual: 35,
          stockMinimo: 10,
          stockMaximo: 60,
          precio: 8.50,
          proveedor: 'Herramientas del Caribe',
          ubicacion: 'Almacén D - Herramientas',
          fechaVencimiento: null,
          descripcion: 'Escobas de cerdas sintéticas mango largo',
          ultimaCompra: '2024-01-05',
          consumoMensual: 8,
          estado: 'Activo'
        },
        {
          id: 'MAT006',
          codigo: 'INS-FUM-006',
          nombre: 'Insecticida fumigación',
          categoria: 'Fumigación',
          unidad: 'Litro',
          stockActual: 12,
          stockMinimo: 15,
          stockMaximo: 40,
          precio: 45.00,
          proveedor: 'Control de Plagas Pro',
          ubicacion: 'Almacén B - Fumigación',
          fechaVencimiento: '2024-10-30',
          descripcion: 'Insecticida profesional concentrado',
          ultimaCompra: '2023-12-15',
          consumoMensual: 18,
          estado: 'Stock Bajo'
        }
      ];

      // Proveedores
      const suppliersData = [
        {
          id: 'PROV001',
          nombre: 'Limpieza Total S.A.',
          contacto: 'Carlos Mendoza',
          telefono: '+507 236-4567',
          email: 'ventas@limpiezatotal.com',
          direccion: 'Vía España, Edificio Plaza 2000',
          ruc: '155-123456-1-DV',
          categorias: ['Bolsas', 'Químicos'],
          calificacion: 4.5,
          tiempoEntrega: '2-3 días',
          condicionesPago: '30 días',
          estado: 'Activo',
          ultimoPedido: '2024-01-15'
        },
        {
          id: 'PROV002',
          nombre: 'Suministros Panamá',
          contacto: 'María Rodríguez',
          telefono: '+507 345-6789',
          email: 'info@suministrospanama.com',
          direccion: 'Zona Libre de Colón, Edificio 45',
          ruc: '155-234567-2-DV',
          categorias: ['Bolsas', 'Herramientas'],
          calificacion: 4.2,
          tiempoEntrega: '3-5 días',
          condicionesPago: '45 días',
          estado: 'Activo',
          ultimoPedido: '2024-01-10'
        }
      ];

      // Órdenes de compra
      const ordersData = [
        {
          id: 'OC001',
          numero: 'OC-2024-001',
          fecha: '2024-01-28',
          proveedor: 'Limpieza Total S.A.',
          estado: 'Pendiente',
          total: 1250.00,
          fechaEntrega: '2024-01-30',
          items: [
            { material: 'Bolsas de basura regulares', cantidad: 100, precio: 12.50 }
          ],
          notas: 'Entrega urgente para reposición',
          aprobadoPor: 'María García'
        }
      ];

      // Generar datos de consumo
      const consumptionData = generateConsumptionData(materialsData);

      // Generar alertas automáticas
      const generatedAlerts = generateAlerts(materialsData);

      setMaterials(materialsData);
      setSuppliers(suppliersData);
      setPurchaseOrders(ordersData);
      setConsumption(consumptionData);
      setAlerts(generatedAlerts);
      setIsLoading(false);
    }, 1000);
  };

  const generateConsumptionData = (materials) => {
    const data = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      materials.forEach(material => {
        if (Math.random() > 0.7) { // 30% probabilidad de consumo por día
          data.push({
            id: `CONS${material.id}${date.toISOString().split('T')[0]}`,
            materialId: material.id,
            materialNombre: material.nombre,
            fecha: date.toISOString().split('T')[0],
            cantidad: Math.floor(Math.random() * 10) + 1,
            ruta: `Ruta ${['Centro', 'Norte', 'Sur', 'Este'][Math.floor(Math.random() * 4)]}`,
            responsable: ['Juan Pérez', 'María García', 'Carlos López'][Math.floor(Math.random() * 3)],
            observaciones: ''
          });
        }
      });
    }
    
    return data;
  };

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

  const renderMaterialsTab = () => (
    <div className="inventory-content">
      <div className="inventory-header">
        <h3>📦 Gestión de Materiales e Insumos</h3>
        <div className="inventory-actions">
          <button className="btn btn--secondary">
            📥 Importar Inventario
          </button>
          <button 
            className="btn btn--primary"
            onClick={() => setShowMaterialModal(true)}
          >
            ➕ Nuevo Material
          </button>
        </div>
      </div>

      {/* Alertas de inventario */}
      {alerts.length > 0 && (
        <div className="inventory-alerts">
          <h4>🚨 Alertas de Inventario</h4>
          <div className="alerts-grid">
            {alerts.slice(0, 3).map(alert => (
              <div key={alert.id} className={`alert-card alert-${alert.tipo}`}>
                <div className="alert-icon">
                  {alert.tipo === 'crítico' ? '🔴' : '🟡'}
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
          <div className="stat-icon">📦</div>
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
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-data">
            <div className="stat-value">
              ${materials.reduce((total, m) => total + (m.stockActual * m.precio), 0).toLocaleString()}
            </div>
            <div className="stat-label">Valor Inventario</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏢</div>
          <div className="stat-data">
            <div className="stat-value">{suppliers.length}</div>
            <div className="stat-label">Proveedores</div>
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
              <th>Categoría</th>
              <th>Stock Actual</th>
              <th>Stock Mín/Máx</th>
              <th>Precio Unit.</th>
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
                  <span className={`category-badge category-${material.categoria.toLowerCase()}`}>
                    {material.categoria}
                  </span>
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
                <td>${material.precio}</td>
                <td>{material.proveedor}</td>
                <td>
                  <span className={`stock-status stock-${getStockStatus(material)}`}>
                    {material.estado}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn btn--small btn--secondary"
                      onClick={() => {
                        setSelectedMaterial(material);
                        setMaterialForm({
                          codigo: material.codigo,
                          nombre: material.nombre,
                          categoria: material.categoria,
                          unidad: material.unidad,
                          stockActual: material.stockActual,
                          stockMinimo: material.stockMinimo,
                          stockMaximo: material.stockMaximo,
                          precio: material.precio,
                          proveedor: material.proveedor,
                          descripcion: material.descripcion
                        });
                        setShowMaterialModal(true);
                      }}
                    >
                      👁️
                    </button>
                    <button 
                      className="btn btn--small btn--primary"
                      onClick={() => {
                        setSelectedMaterial(material);
                        setMaterialForm({
                          codigo: material.codigo,
                          nombre: material.nombre,
                          categoria: material.categoria,
                          unidad: material.unidad,
                          stockActual: material.stockActual,
                          stockMinimo: material.stockMinimo,
                          stockMaximo: material.stockMaximo,
                          precio: material.precio,
                          proveedor: material.proveedor,
                          descripcion: material.descripcion
                        });
                        setShowMaterialModal(true);
                      }}
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn btn--small btn--success"
                      onClick={() => setShowOrderModal(true)}
                    >
                      🛒
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

  const renderSuppliersTab = () => (
    <div className="inventory-content">
      <div className="inventory-header">
        <h3>🏢 Gestión de Proveedores</h3>
        <button className="btn btn--primary">
          ➕ Nuevo Proveedor
        </button>
      </div>

      <div className="suppliers-grid">
        {suppliers.map(supplier => (
          <div key={supplier.id} className="supplier-card">
            <div className="supplier-header">
              <h4>{supplier.nombre}</h4>
              <div className="supplier-rating">
                {'⭐'.repeat(Math.floor(supplier.calificacion))} {supplier.calificacion}
              </div>
            </div>
            <div className="supplier-info">
              <div className="info-row">
                <span className="info-label">Contacto:</span>
                <span className="info-value">{supplier.contacto}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Teléfono:</span>
                <span className="info-value">{supplier.telefono}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Email:</span>
                <span className="info-value">{supplier.email}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Entrega:</span>
                <span className="info-value">{supplier.tiempoEntrega}</span>
              </div>
            </div>
            <div className="supplier-categories">
              {supplier.categorias.map(cat => (
                <span key={cat} className={`category-badge category-${cat.toLowerCase()}`}>
                  {cat}
                </span>
              ))}
            </div>
            <div className="supplier-actions">
              <button className="btn btn--small btn--secondary">
                📋 Historial
              </button>
              <button className="btn btn--small btn--primary">
                🛒 Pedir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const handleMaterialFormChange = (field, value) => {
    setMaterialForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveMaterial = () => {
    if (!materialForm.nombre.trim() || !materialForm.codigo.trim()) {
      alert('Debe completar nombre y código del material');
      return;
    }

    if (selectedMaterial) {
      // Editar material existente
      setMaterials(prev => prev.map(m => 
        m.id === selectedMaterial.id ? { ...m, ...materialForm } : m
      ));
    } else {
      // Agregar nuevo material
      const newMaterial = {
        ...materialForm,
        id: `MAT${String(materials.length + 1).padStart(3, '0')}`,
        estado: 'Activo',
        ultimaCompra: new Date().toISOString().split('T')[0],
        consumoMensual: 0
      };
      setMaterials(prev => [...prev, newMaterial]);
    }
    setShowMaterialModal(false);
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
  };

  const handleDeleteMaterial = (materialId) => {
    if (window.confirm('¿Eliminar este material del inventario?')) {
      setMaterials(prev => prev.filter(m => m.id !== materialId));
    }
  };

  const renderOrdersTab = () => (
    <div className="inventory-content">
      <div className="inventory-header">
        <h3>🛒 Órdenes de Compra</h3>
        <button className="btn btn--primary" onClick={() => setShowOrderModal(true)}>
          ➕ Nueva Orden
        </button>
      </div>
      <div className="table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.map(order => (
              <tr key={order.id}>
                <td>{order.numero}</td>
                <td>{order.fecha}</td>
                <td>{order.proveedor}</td>
                <td>${order.total}</td>
                <td>
                  <span className={`status status--${order.estado === 'Pendiente' ? 'warning' : 'success'}`}>
                    {order.estado}
                  </span>
                </td>
                <td>
                  <button className="btn btn--small btn--secondary">👁️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderConsumptionTab = () => (
    <div className="inventory-content">
      <div className="inventory-header">
        <h3>📊 Consumo de Materiales</h3>
      </div>
      <div className="table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Fecha</th>
              <th>Cantidad</th>
              <th>Ruta</th>
              <th>Responsable</th>
            </tr>
          </thead>
          <tbody>
            {consumption.slice(0, 20).map(cons => (
              <tr key={cons.id}>
                <td>{cons.materialNombre}</td>
                <td>{cons.fecha}</td>
                <td>{cons.cantidad}</td>
                <td>{cons.ruta}</td>
                <td>{cons.responsable}</td>
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
          <h2>📦 Sistema de Gestión de Inventario</h2>
          <p>Control integral de materiales, insumos y proveedores</p>
        </div>
      </div>

      <div className="inventory-tabs">
        <button 
          className={`tab ${activeInventoryTab === 'materials' ? 'tab--active' : ''}`}
          onClick={() => setActiveInventoryTab('materials')}
        >
          📦 Materiales
        </button>
        <button 
          className={`tab ${activeInventoryTab === 'suppliers' ? 'tab--active' : ''}`}
          onClick={() => setActiveInventoryTab('suppliers')}
        >
          🏢 Proveedores
        </button>
        <button 
          className={`tab ${activeInventoryTab === 'orders' ? 'tab--active' : ''}`}
          onClick={() => setActiveInventoryTab('orders')}
        >
          🛒 Órdenes
        </button>
        <button 
          className={`tab ${activeInventoryTab === 'consumption' ? 'tab--active' : ''}`}
          onClick={() => setActiveInventoryTab('consumption')}
        >
          📊 Consumo
        </button>
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
          {activeInventoryTab === 'materials' && renderMaterialsTab()}
          {activeInventoryTab === 'suppliers' && renderSuppliersTab()}
          {activeInventoryTab === 'orders' && renderOrdersTab()}
          {activeInventoryTab === 'consumption' && renderConsumptionTab()}
        </div>
      )}

      {/* Modal para ver/editar material */}
      {showMaterialModal && (
        <div className="modal-overlay" onClick={() => setShowMaterialModal(false)}>
          <div className="modal-content material-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>{selectedMaterial ? 'Editar Material' : 'Nuevo Material'}</h4>
              <button className="modal-close" onClick={() => setShowMaterialModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Código:</label>
                  <input 
                    type="text" 
                    value={materialForm.codigo}
                    onChange={e => handleMaterialFormChange('codigo', e.target.value)}
                    placeholder="Ej: BOL-001"
                  />
                </div>
                <div className="form-group">
                  <label>Nombre:</label>
                  <input 
                    type="text" 
                    value={materialForm.nombre}
                    onChange={e => handleMaterialFormChange('nombre', e.target.value)}
                    placeholder="Ej: Bolsas de basura"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Categoría:</label>
                  <select 
                    value={materialForm.categoria}
                    onChange={e => handleMaterialFormChange('categoria', e.target.value)}
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
                  <input 
                    type="text" 
                    value={materialForm.unidad}
                    onChange={e => handleMaterialFormChange('unidad', e.target.value)}
                    placeholder="Ej: Paquete"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Stock Actual:</label>
                  <input 
                    type="number" 
                    value={materialForm.stockActual}
                    onChange={e => handleMaterialFormChange('stockActual', parseInt(e.target.value))}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Stock Mínimo:</label>
                  <input 
                    type="number" 
                    value={materialForm.stockMinimo}
                    onChange={e => handleMaterialFormChange('stockMinimo', parseInt(e.target.value))}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Stock Máximo:</label>
                  <input 
                    type="number" 
                    value={materialForm.stockMaximo}
                    onChange={e => handleMaterialFormChange('stockMaximo', parseInt(e.target.value))}
                    min="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Precio Unitario:</label>
                  <input 
                    type="number" 
                    value={materialForm.precio}
                    onChange={e => handleMaterialFormChange('precio', parseFloat(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>Proveedor:</label>
                  <input 
                    type="text" 
                    value={materialForm.proveedor}
                    onChange={e => handleMaterialFormChange('proveedor', e.target.value)}
                    placeholder="Ej: Limpieza Total S.A."
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Descripción:</label>
                <textarea 
                  value={materialForm.descripcion}
                  onChange={e => handleMaterialFormChange('descripcion', e.target.value)}
                  placeholder="Descripción del material..."
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn--outline" onClick={() => setShowMaterialModal(false)}>Cancelar</button>
              {selectedMaterial && (
                <button 
                  className="btn btn--danger" 
                  onClick={() => handleDeleteMaterial(selectedMaterial.id)}
                >
                  🗑️ Eliminar
                </button>
              )}
              <button className="btn btn--primary" onClick={handleSaveMaterial}>
                {selectedMaterial ? 'Actualizar' : 'Crear'} Material
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para orden de compra */}
      {showOrderModal && (
        <div className="modal-overlay" onClick={() => setShowOrderModal(false)}>
          <div className="modal-content order-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>🛒 Nueva Orden de Compra</h4>
              <button className="modal-close" onClick={() => setShowOrderModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="order-form">
                <div className="form-group">
                  <label>Material:</label>
                  <select className="form-select">
                    {materials.map(material => (
                      <option key={material.id} value={material.id}>
                        {material.nombre} - Stock: {material.stockActual}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Cantidad a ordenar:</label>
                  <input type="number" min="1" defaultValue="10" />
                </div>
                <div className="form-group">
                  <label>Proveedor:</label>
                  <select className="form-select">
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Fecha de entrega:</label>
                  <input type="date" />
                </div>
                <div className="form-group">
                  <label>Notas:</label>
                  <textarea placeholder="Notas adicionales..." />
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn--outline" onClick={() => setShowOrderModal(false)}>Cancelar</button>
              <button 
                className="btn btn--primary" 
                onClick={() => {
                  setShowOrderModal(false);
                  alert('✅ Orden de compra creada correctamente');
                }}
              >
                🛒 Crear Orden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryComponent;
