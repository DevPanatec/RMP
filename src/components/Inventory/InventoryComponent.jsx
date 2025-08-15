import { useState, useEffect } from 'react';
import { appData } from '../../data/mockData';
import './InventoryComponent.css';

const InventoryComponent = ({ userType = 'admin' }) => {
  const [materials, setMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);

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

      // Generar alertas automáticas
      const generatedAlerts = generateAlerts(materialsData);

      setMaterials(materialsData);
      setAlerts(generatedAlerts);
      setIsLoading(false);
    }, 1000);
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
          <div className="stat-icon">📅</div>
          <div className="stat-data">
            <div className="stat-value">
              {materials.filter(m => {
                if (!m.fechaVencimiento) return false;
                const today = new Date();
                const vencimiento = new Date(m.fechaVencimiento);
                const diasRestantes = (vencimiento - today) / (1000 * 60 * 60 * 24);
                return diasRestantes <= 60; // Vence en 60 días o menos
              }).length}
            </div>
            <div className="stat-label">Por Vencer</div>
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
                    <button className="btn btn--small btn--secondary">
                      👁️
                    </button>
                    <button className="btn btn--small btn--primary">
                      ✏️
                    </button>
                    <button className="btn btn--small btn--success">
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


  return (
    <div className="inventory-container">
      <div className="inventory-header-main">
        <div className="inventory-title">
          <h2>📦 Gestión de Inventario</h2>
          <p>Control integral de materiales e insumos</p>
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
          {renderMaterialsTab()}
        </div>
      )}

      {/* Modales */}
      {showMaterialModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Nuevo Material</h3>
              <button 
                className="modal-close"
                onClick={() => setShowMaterialModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>Formulario de nuevo material (por implementar)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryComponent;
