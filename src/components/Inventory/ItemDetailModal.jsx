import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useInventory } from '../../context/InventoryContext';
import { Package, MapPin, Plus, Edit, Trash2, X, Save, AlertTriangle, Building } from '../Icons';
import './ItemDetailModal.css';

const ItemDetailModal = ({ item, onClose }) => {
  const { lugares, addToLocation, updateLocationQuantity, removeFromLocation, asignarDesdeAlmacen } = useInventory();
  const stockSinAsignar = useQuery(api.inventario.getStockSinAsignar, item ? { itemId: item._id } : "skip");

  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showAsignarDesdeAlmacen, setShowAsignarDesdeAlmacen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [addLocationData, setAddLocationData] = useState({
    lugar_id: '',
    cantidad: 0
  });
  const [asignarData, setAsignarData] = useState({
    lugar_id: '',
    cantidad: 0
  });
  const [editQuantity, setEditQuantity] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!item) return null;

  // Calcular stock asignado
  const stockAsignado = item.ubicaciones?.reduce((sum, ub) => sum + ub.cantidad, 0) || 0;
  const valorTotal = item.precio_unitario ? (item.cantidad_disponible * item.precio_unitario).toFixed(2) : 'N/A';

  // Filtrar lugares ya asignados
  const availableLugares = lugares?.filter(
    lugar => !item.ubicaciones?.some(ub => ub.lugar_id === lugar._id)
  ) || [];

  const handleAddLocation = async (e) => {
    e.preventDefault();

    if (!addLocationData.lugar_id) {
      alert('Por favor selecciona una ubicación');
      return;
    }

    if (addLocationData.cantidad <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addToLocation(
        item._id,
        addLocationData.lugar_id,
        parseFloat(addLocationData.cantidad)
      );

      if (result.success) {
        alert('Ubicación agregada exitosamente');
        setShowAddLocation(false);
        setAddLocationData({ lugar_id: '', cantidad: 0 });
      } else {
        alert('Error al agregar ubicación: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateQuantity = async (ubicacion_id) => {
    if (editQuantity <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updateLocationQuantity(ubicacion_id, parseFloat(editQuantity));

      if (result.success) {
        alert('Cantidad actualizada exitosamente');
        setEditingLocation(null);
      } else {
        alert('Error al actualizar: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveLocation = async (ubicacion_id, lugar_nombre) => {
    if (!window.confirm(`¿Eliminar este item de "${lugar_nombre}"?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await removeFromLocation(ubicacion_id);

      if (result.success) {
        alert('Ubicación eliminada exitosamente');
      } else {
        alert('Error al eliminar: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAsignarDesdeAlmacen = async (e) => {
    e.preventDefault();

    if (!asignarData.lugar_id) {
      alert('Por favor selecciona una ubicación');
      return;
    }

    if (asignarData.cantidad <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    if (asignarData.cantidad > (stockSinAsignar || 0)) {
      alert(`No hay suficiente stock sin asignar. Disponible: ${stockSinAsignar || 0}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await asignarDesdeAlmacen(
        item._id,
        asignarData.lugar_id,
        parseFloat(asignarData.cantidad)
      );

      if (result.success) {
        alert('Stock asignado exitosamente desde almacén principal');
        setShowAsignarDesdeAlmacen(false);
        setAsignarData({ lugar_id: '', cantidad: 0 });
      } else {
        alert('Error al asignar: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-detail-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-detail-header">
          <div className="modal-detail-header-content">
            <div className="modal-detail-icon">
              <Package size={32} />
            </div>
            <div className="modal-detail-title">
              <div className="modal-detail-codigo">{item.codigo}</div>
              <h3>{item.nombre}</h3>
              <span className="modal-detail-tipo">{item.tipo_articulo}</span>
            </div>
          </div>
          <button className="modal-close-detail" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-detail-body">
          {/* Total Summary */}
          <div className="detail-summary-card">
            <div className="summary-stat">
              <div className="summary-label">Stock Total</div>
              <div className="summary-value">
                {item.cantidad_disponible} <span className="summary-unit">{item.unidad_medida || 'unidades'}</span>
              </div>
            </div>
            <div className="summary-stat">
              <div className="summary-label">Stock Asignado</div>
              <div className="summary-value">
                {stockAsignado} <span className="summary-unit">{item.unidad_medida || 'unidades'}</span>
              </div>
            </div>
            <div className="summary-stat">
              <div className="summary-label">Stock Sin Asignar</div>
              <div className="summary-value stock-sin-asignar">
                {stockSinAsignar !== undefined ? stockSinAsignar : '...'} <span className="summary-unit">{item.unidad_medida || 'unidades'}</span>
              </div>
            </div>
            <div className="summary-stat">
              <div className="summary-label">Precio/Unidad</div>
              <div className="summary-value">
                ${item.precio_unitario ? item.precio_unitario.toFixed(2) : 'N/A'}
              </div>
            </div>
            <div className="summary-stat">
              <div className="summary-label">Valor Total</div>
              <div className="summary-value summary-value-highlight">
                ${valorTotal}
              </div>
            </div>
          </div>

          {/* Descripción */}
          {item.descripcion && (
            <div className="detail-info-box">
              <h4>Descripción</h4>
              <p>{item.descripcion}</p>
            </div>
          )}

          {/* Asignar desde Almacén Principal */}
          {stockSinAsignar > 0 && (
            <div className="almacen-principal-section">
              <div className="almacen-header">
                <div className="almacen-title">
                  <Building size={20} />
                  <h4>Almacén Principal</h4>
                </div>
                <span className="almacen-badge">
                  {stockSinAsignar} {item.unidad_medida || 'unidades'} disponibles
                </span>
              </div>
              <p className="almacen-help">
                Este stock aún no ha sido asignado a ninguna ubicación específica. Puede distribuirlo a continuación:
              </p>

              {!showAsignarDesdeAlmacen ? (
                <button
                  className="btn-asignar-almacen"
                  onClick={() => setShowAsignarDesdeAlmacen(true)}
                >
                  <MapPin size={16} /> Asignar a Ubicación
                </button>
              ) : (
                <div className="add-location-form">
                  <form onSubmit={handleAsignarDesdeAlmacen}>
                    <div className="form-row-inline">
                      <div className="form-group-inline">
                        <label>Ubicación Destino</label>
                        <select
                          value={asignarData.lugar_id}
                          onChange={(e) => setAsignarData(prev => ({ ...prev, lugar_id: e.target.value }))}
                          required
                        >
                          <option value="">Seleccionar...</option>
                          {lugares.map(lugar => (
                            <option key={lugar._id} value={lugar._id}>
                              {lugar.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group-inline">
                        <label>Cantidad a Asignar</label>
                        <input
                          type="number"
                          value={asignarData.cantidad}
                          onChange={(e) => setAsignarData(prev => ({ ...prev, cantidad: e.target.value }))}
                          min="0"
                          max={stockSinAsignar}
                          step="0.01"
                          required
                          placeholder={`Máx: ${stockSinAsignar}`}
                        />
                      </div>
                      <div className="form-actions-inline">
                        <button type="submit" className="btn-save-inline" disabled={isSubmitting}>
                          <Save size={16} /> Asignar
                        </button>
                        <button
                          type="button"
                          className="btn-cancel-inline"
                          onClick={() => {
                            setShowAsignarDesdeAlmacen(false);
                            setAsignarData({ lugar_id: '', cantidad: 0 });
                          }}
                          disabled={isSubmitting}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Locations Table */}
          <div className="detail-locations-section">
            <div className="detail-locations-header">
              <h4><MapPin size={20} /> Distribución por Ubicación</h4>
              {availableLugares.length > 0 && (
                <button
                  className="btn-add-location"
                  onClick={() => setShowAddLocation(!showAddLocation)}
                  disabled={isSubmitting}
                >
                  <Plus size={16} /> Agregar Ubicación
                </button>
              )}
            </div>

            {/* Add Location Form */}
            {showAddLocation && (
              <div className="add-location-form">
                <form onSubmit={handleAddLocation}>
                  <div className="form-row-inline">
                    <div className="form-group-inline">
                      <label>Ubicación</label>
                      <select
                        value={addLocationData.lugar_id}
                        onChange={(e) => setAddLocationData(prev => ({ ...prev, lugar_id: e.target.value }))}
                        required
                      >
                        <option value="">Seleccionar...</option>
                        {availableLugares.map(lugar => (
                          <option key={lugar._id} value={lugar._id}>
                            {lugar.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group-inline">
                      <label>Cantidad</label>
                      <input
                        type="number"
                        value={addLocationData.cantidad}
                        onChange={(e) => setAddLocationData(prev => ({ ...prev, cantidad: e.target.value }))}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div className="form-actions-inline">
                      <button type="submit" className="btn-save-inline" disabled={isSubmitting}>
                        <Save size={16} /> Guardar
                      </button>
                      <button
                        type="button"
                        className="btn-cancel-inline"
                        onClick={() => setShowAddLocation(false)}
                        disabled={isSubmitting}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Locations List */}
            {(!item.ubicaciones || item.ubicaciones.length === 0) ? (
              <div className="empty-locations">
                <AlertTriangle size={48} />
                <p>No hay ubicaciones asignadas para este item</p>
              </div>
            ) : (
              <div className="locations-table">
                {item.ubicaciones.map((ubicacion) => (
                  <div key={ubicacion._id} className="location-row">
                    <div className="location-info">
                      <div className="location-icon">
                        <MapPin size={20} />
                      </div>
                      <div className="location-details">
                        <div className="location-name">{ubicacion.lugar_nombre}</div>
                        {ubicacion.lugar_descripcion && (
                          <div className="location-description">{ubicacion.lugar_descripcion}</div>
                        )}
                      </div>
                    </div>

                    <div className="location-quantity">
                      {editingLocation === ubicacion._id ? (
                        <div className="edit-quantity-inline">
                          <input
                            type="number"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(e.target.value)}
                            min="0"
                            step="0.01"
                            autoFocus
                          />
                          <button
                            className="btn-save-qty"
                            onClick={() => handleUpdateQuantity(ubicacion._id)}
                            disabled={isSubmitting}
                          >
                            <Save size={14} />
                          </button>
                          <button
                            className="btn-cancel-qty"
                            onClick={() => setEditingLocation(null)}
                            disabled={isSubmitting}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="quantity-display">
                          <span className="quantity-value">{ubicacion.cantidad}</span>
                          <span className="quantity-unit">{item.unidad_medida || 'unidades'}</span>
                        </div>
                      )}
                    </div>

                    <div className="location-actions">
                      {editingLocation !== ubicacion._id && (
                        <>
                          <button
                            className="btn-icon-action btn-edit-location"
                            onClick={() => {
                              setEditingLocation(ubicacion._id);
                              setEditQuantity(ubicacion.cantidad);
                            }}
                            title="Editar cantidad"
                            disabled={isSubmitting}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="btn-icon-action btn-delete-location"
                            onClick={() => handleRemoveLocation(ubicacion._id, ubicacion.lugar_nombre)}
                            title="Eliminar ubicación"
                            disabled={isSubmitting}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional Info */}
          {item.proveedor && (
            <div className="detail-info-box">
              <h4>Proveedor</h4>
              <p>{item.proveedor}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemDetailModal;
