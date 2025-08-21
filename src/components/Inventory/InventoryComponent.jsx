import { useState, useEffect } from 'react';
import { useSupabaseInventory } from '../../context/SupabaseInventoryContext';
import './InventoryComponent.css';

const InventoryComponent = ({ userType = 'admin' }) => {
  const { materials, loading, error, getInventoryStats, searchMaterials } = useSupabaseInventory();
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [alerts, setAlerts] = useState([]);

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
                    <button className="btn btn--small btn--secondary">
                      📄
                    </button>
                    <button className="btn btn--small btn--primary">
                      ✏️
                    </button>
                    <button className="btn btn--small btn--success">
                      📝
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
