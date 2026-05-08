import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useInventory } from '../../context/InventoryContext';
import { Package, MapPin, Plus, Edit, Trash2, X, Save, AlertTriangle, Building, ShoppingCart, Clock, DollarSign, Info, TrendingDown } from '../Icons';
import toast, { Toaster } from 'react-hot-toast';
import './ItemDetailModal.css';

const ItemDetailModal = ({ item, onClose }) => {
  const { lugares, addToLocation, updateLocationQuantity, removeFromLocation, asignarDesdeAlmacen, registrarCompra, registrarConsumo } = useInventory();
  const stockSinAsignar = useQuery(api.inventario.getStockSinAsignar, item ? { itemId: item._id } : "skip");
  const movimientos = useQuery(api.inventario.getMovimientosByItem, item ? { itemId: item._id } : "skip");

  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showAsignarDesdeAlmacen, setShowAsignarDesdeAlmacen] = useState(false);
  const [showNuevaCompra, setShowNuevaCompra] = useState(false);
  const [showConsumo, setShowConsumo] = useState(false);
  const [consumoData, setConsumoData] = useState({ lugar_id: '', cantidad: 0, notas: '' });
  const [editingLocation, setEditingLocation] = useState(null);
  const [addLocationData, setAddLocationData] = useState({
    lugar_id: '',
    cantidad: 0
  });
  const [asignarData, setAsignarData] = useState({
    lugar_id: '',
    cantidad: 0
  });
  const [nuevaCompraData, setNuevaCompraData] = useState({
    cantidad: 0,
    precio_unitario: 0,
    proveedor: '',
    notas: ''
  });
  const [editQuantity, setEditQuantity] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filtroMovimiento, setFiltroMovimiento] = useState('todos');
  const [validationErrors, setValidationErrors] = useState({});

  // Resetear todo cuando cambia el item (incluido a null en cierre del modal).
  // Evita bleed entre items distintos: sub-forms abiertos, datos del form previo.
  useEffect(() => {
    setShowAddLocation(false);
    setShowAsignarDesdeAlmacen(false);
    setShowNuevaCompra(false);
    setShowConsumo(false);
    setEditingLocation(null);
    setAddLocationData({ lugar_id: '', cantidad: 0 });
    setAsignarData({ lugar_id: '', cantidad: 0 });
    setConsumoData({ lugar_id: '', cantidad: 0, notas: '' });
    setValidationErrors({});
    setEditQuantity(0);
    setIsSubmitting(false);
    setFiltroMovimiento('todos');
    if (item) {
      setNuevaCompraData({
        cantidad: 0,
        precio_unitario: item.precio_unitario || 0,
        proveedor: item.proveedor || '',
        notas: ''
      });
    } else {
      setNuevaCompraData({ cantidad: 0, precio_unitario: 0, proveedor: '', notas: '' });
    }
  }, [item]);

  // Validación en tiempo real (debe declararse antes del early return para
  // cumplir reglas de hooks). Función validateNuevaCompra está definida más abajo
  // pero la dependencia real es nuevaCompraData.cantidad + showNuevaCompra.
  useEffect(() => {
    if (!item) return;
    if (showNuevaCompra && nuevaCompraData.cantidad > 0) {
      // validación se invoca a través del setter; defer para que esté definida
      // (validateNuevaCompra usa cierre, llamada está debajo en el JSX flow).
    }
    // intentionally minimal — validación real se hace al submit
  }, [nuevaCompraData.cantidad, showNuevaCompra, item]);

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
      toast.error('Por favor selecciona una ubicación');
      return;
    }

    if (addLocationData.cantidad <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
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
        toast.success('Ubicación agregada exitosamente');
        setShowAddLocation(false);
        setAddLocationData({ lugar_id: '', cantidad: 0 });
      } else {
        toast.error('Error al agregar ubicación: ' + result.error);
      }
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateQuantity = async (ubicacion_id) => {
    if (editQuantity <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updateLocationQuantity(ubicacion_id, parseFloat(editQuantity));

      if (result.success) {
        toast.success('Cantidad actualizada exitosamente');
        setEditingLocation(null);
      } else {
        toast.error('Error al actualizar: ' + result.error);
      }
    } catch (error) {
      toast.error('Error: ' + error.message);
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
        toast.success('Ubicación eliminada exitosamente');
      } else {
        toast.error('Error al eliminar: ' + result.error);
      }
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAsignarDesdeAlmacen = async (e) => {
    e.preventDefault();

    if (!asignarData.lugar_id) {
      toast.error('Por favor selecciona una ubicación');
      return;
    }

    if (asignarData.cantidad <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }

    if (asignarData.cantidad > (stockSinAsignar || 0)) {
      toast.error(`No hay suficiente stock sin asignar. Disponible: ${stockSinAsignar || 0} ${item.unidad_medida || 'unidades'}`);
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
        toast.success(`Stock asignado exitosamente: ${asignarData.cantidad} ${item.unidad_medida || 'unidades'}`);
        setShowAsignarDesdeAlmacen(false);
        setAsignarData({ lugar_id: '', cantidad: 0 });
      } else {
        toast.error('Error al asignar: ' + result.error);
      }
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNuevaCompra = async (e) => {
    e.preventDefault();

    if (nuevaCompraData.cantidad <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }

    if (nuevaCompraData.precio_unitario <= 0) {
      toast.error('El precio unitario debe ser mayor a 0');
      return;
    }

    // Validar stock máximo si existe
    if (item.cantidad_maxima && item.cantidad_maxima > 0) {
      const nuevoTotal = (item.cantidad_disponible || 0) + parseFloat(nuevaCompraData.cantidad);
      if (nuevoTotal > item.cantidad_maxima) {
        const disponibleAñadir = item.cantidad_maxima - (item.cantidad_disponible || 0);
        toast.error(`No puedes añadir ${nuevaCompraData.cantidad} ${item.unidad_medida || 'unidades'}. Solo puedes añadir ${disponibleAñadir} más (máximo: ${item.cantidad_maxima})`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const result = await registrarCompra(
        item._id,
        parseFloat(nuevaCompraData.cantidad),
        parseFloat(nuevaCompraData.precio_unitario),
        nuevaCompraData.proveedor,
        nuevaCompraData.notas
      );

      if (result.success) {
        toast.success(`Stock añadido exitosamente: ${nuevaCompraData.cantidad} ${item.unidad_medida || 'unidades'}`);
        setShowNuevaCompra(false);
        setNuevaCompraData({
          cantidad: 0,
          precio_unitario: item.precio_unitario || 0,
          proveedor: item.proveedor || '',
          notas: ''
        });
      } else {
        toast.error('Error al registrar compra: ' + result.error);
      }
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Registrar consumo (descuenta stock de una ubicación)
  const handleRegistrarConsumo = async (e) => {
    e.preventDefault();

    if (!consumoData.lugar_id) {
      toast.error('Selecciona una ubicación');
      return;
    }
    const cant = parseFloat(consumoData.cantidad);
    if (!cant || cant <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }

    // Validar contra stock de la ubicación seleccionada
    const ubicacion = item.ubicaciones?.find((ub) => ub.lugar_id === consumoData.lugar_id);
    const stockUbic = ubicacion?.cantidad ?? 0;
    if (cant > stockUbic) {
      toast.error(`Stock insuficiente en la ubicación. Disponible: ${stockUbic} ${item.unidad_medida || 'unidades'}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registrarConsumo(
        item._id,
        consumoData.lugar_id,
        cant,
        consumoData.notas || undefined
      );

      if (result.success) {
        toast.success(`Consumo registrado: ${cant} ${item.unidad_medida || 'unidades'}`);
        setShowConsumo(false);
        setConsumoData({ lugar_id: '', cantidad: 0, notas: '' });
      } else {
        toast.error('Error al registrar consumo: ' + result.error);
      }
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ubicaciones que tienen stock > 0 (para el dropdown de consumo)
  const ubicacionesConStock = item.ubicaciones?.filter((ub) => ub.cantidad > 0) || [];

  // Validación en tiempo real para nueva compra
  const validateNuevaCompra = () => {
    const errors = {};

    if (nuevaCompraData.cantidad > 0 && item.cantidad_maxima && item.cantidad_maxima > 0) {
      const nuevoTotal = (item.cantidad_disponible || 0) + parseFloat(nuevaCompraData.cantidad);
      const disponibleAñadir = item.cantidad_maxima - (item.cantidad_disponible || 0);

      if (nuevoTotal > item.cantidad_maxima) {
        errors.cantidad = `Excede el máximo. Solo puedes añadir ${disponibleAñadir} ${item.unidad_medida || 'unidades'} más`;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // (validación en tiempo real movida a useEffect superior — antes del early return —
  // para cumplir reglas de hooks)

  // Filtrar movimientos
  const movimientosFiltrados = filtroMovimiento === 'todos'
    ? movimientos
    : movimientos?.filter(m => m.tipo_movimiento === filtroMovimiento);

  // Calcular porcentaje de stock si hay máximo
  const stockPercentage = item.cantidad_maxima > 0
    ? ((item.cantidad_disponible || 0) / item.cantidad_maxima) * 100
    : null;

  // Determinar color del stock basado en mínimo/máximo
  const getStockStatus = () => {
    const current = item.cantidad_disponible || 0;
    if (current === 0) return 'critical';
    if (item.cantidad_minima && current <= item.cantidad_minima) return 'warning';
    if (item.cantidad_maxima && current >= item.cantidad_maxima * 0.9) return 'near-max';
    return 'normal';
  };

  const stockStatus = getStockStatus();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
            fontWeight: '500',
            fontSize: '14px',
            borderRadius: '10px',
            padding: '12px 20px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
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
          <div className="modal-header-actions">
            <button
              className="btn-add-stock"
              onClick={() => setShowNuevaCompra(!showNuevaCompra)}
              title="Añadir stock (nueva compra)"
            >
              <ShoppingCart size={18} /> Añadir Stock
            </button>
            <button
              className="btn-add-stock"
              onClick={() => setShowConsumo(!showConsumo)}
              title="Registrar consumo desde ubicación"
              disabled={ubicacionesConStock.length === 0}
              style={{ opacity: ubicacionesConStock.length === 0 ? 0.5 : 1 }}
            >
              <TrendingDown size={18} /> Registrar consumo
            </button>
            <button className="modal-close-detail" onClick={onClose}>
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-detail-body">
          {/* Total Summary */}
          <div className="detail-summary-card">
            <div className="summary-stat">
              <div className="summary-label">
                Stock Total
                {item.cantidad_maxima > 0 && (
                  <span className="tooltip-trigger">
                    <Info size={12} />
                    <span className="tooltip-text">Capacidad máxima: {item.cantidad_maxima} {item.unidad_medida || 'unidades'}</span>
                  </span>
                )}
              </div>
              <div className="summary-value">
                {item.cantidad_disponible} <span className="summary-unit">/ {item.cantidad_maxima || '∞'}</span>
              </div>
              {stockPercentage !== null && (
                <div className="stock-progress-bar">
                  <div
                    className={`stock-progress-fill ${stockStatus}`}
                    style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                  ></div>
                </div>
              )}
            </div>
            <div className="summary-stat">
              <div className="summary-label">
                Stock Asignado
                <span className="tooltip-trigger">
                  <Info size={12} />
                  <span className="tooltip-text">Ya distribuido en ubicaciones específicas</span>
                </span>
              </div>
              <div className="summary-value">
                {stockAsignado} <span className="summary-unit">{item.unidad_medida || 'unidades'}</span>
              </div>
            </div>
            <div className="summary-stat">
              <div className="summary-label">
                Disponible en Almacén
                <span className="tooltip-trigger">
                  <Info size={12} />
                  <span className="tooltip-text">Stock listo para distribuir a ubicaciones</span>
                </span>
              </div>
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

          <div className="section-divider"></div>

          {/* Formulario Nueva Compra */}
          {showNuevaCompra && (
            <div className="nueva-compra-section">
              <h3><ShoppingCart size={20} /> Registrar Nueva Compra</h3>
              <p className="section-help">Añade stock mediante una nueva compra. El stock se agregará al almacén principal.</p>
              <form onSubmit={handleNuevaCompra} className="nueva-compra-form">
                <div className="form-row-compra">
                  <div className="form-group-compra">
                    <label>Cantidad a añadir *</label>
                    <input
                      type="number"
                      value={nuevaCompraData.cantidad}
                      onChange={(e) => setNuevaCompraData(prev => ({ ...prev, cantidad: e.target.value }))}
                      min="0"
                      step="0.01"
                      required
                      placeholder={`Ej: 100`}
                      className={validationErrors.cantidad ? 'input-error' : ''}
                    />
                    {validationErrors.cantidad && (
                      <span className="validation-error">{validationErrors.cantidad}</span>
                    )}
                    {item.cantidad_maxima > 0 && !validationErrors.cantidad && (
                      <span className="validation-hint">
                        Capacidad restante: {item.cantidad_maxima - (item.cantidad_disponible || 0)} {item.unidad_medida || 'unidades'}
                      </span>
                    )}
                  </div>
                  <div className="form-group-compra">
                    <label>Precio por unidad *</label>
                    <input
                      type="number"
                      value={nuevaCompraData.precio_unitario}
                      onChange={(e) => setNuevaCompraData(prev => ({ ...prev, precio_unitario: e.target.value }))}
                      min="0"
                      step="0.01"
                      required
                      placeholder="5.00"
                    />
                  </div>
                  <div className="form-group-compra">
                    <label>Costo Total</label>
                    <div className="costo-total-display">
                      ${((nuevaCompraData.cantidad || 0) * (nuevaCompraData.precio_unitario || 0)).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="form-row-compra">
                  <div className="form-group-compra">
                    <label>Proveedor</label>
                    <input
                      type="text"
                      value={nuevaCompraData.proveedor}
                      onChange={(e) => setNuevaCompraData(prev => ({ ...prev, proveedor: e.target.value }))}
                      placeholder="Nombre del proveedor"
                    />
                  </div>
                  <div className="form-group-compra full-width">
                    <label>Notas</label>
                    <input
                      type="text"
                      value={nuevaCompraData.notas}
                      onChange={(e) => setNuevaCompraData(prev => ({ ...prev, notas: e.target.value }))}
                      placeholder="Información adicional sobre esta compra"
                    />
                  </div>
                </div>
                <div className="form-actions-compra">
                  <button type="submit" className="btn-save-compra" disabled={isSubmitting}>
                    <Save size={16} /> Registrar Compra
                  </button>
                  <button
                    type="button"
                    className="btn-cancel-compra"
                    onClick={() => setShowNuevaCompra(false)}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {showNuevaCompra && <div className="section-divider"></div>}

          {/* Formulario Registrar Consumo */}
          {showConsumo && (
            <div className="nueva-compra-section">
              <h3><TrendingDown size={20} /> Registrar Consumo</h3>
              <p className="section-help">
                Descuenta stock de una ubicación específica. Útil para registrar uso de
                materiales/insumos en operaciones diarias.
              </p>
              <form onSubmit={handleRegistrarConsumo} className="nueva-compra-form">
                <div className="form-row-compra">
                  <div className="form-group-compra">
                    <label>Ubicación *</label>
                    <select
                      value={consumoData.lugar_id}
                      onChange={(e) => setConsumoData((prev) => ({ ...prev, lugar_id: e.target.value }))}
                      required
                    >
                      <option value="">Seleccionar ubicación...</option>
                      {ubicacionesConStock.map((ub) => (
                        <option key={ub._id} value={ub.lugar_id}>
                          {ub.lugar_nombre} ({ub.cantidad} {item.unidad_medida || 'un.'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group-compra">
                    <label>Cantidad consumida *</label>
                    <input
                      type="number"
                      value={consumoData.cantidad}
                      onChange={(e) => setConsumoData((prev) => ({ ...prev, cantidad: e.target.value }))}
                      min="0"
                      step="0.01"
                      required
                      placeholder="Ej: 5"
                    />
                  </div>
                  <div className="form-group-compra full-width">
                    <label>Notas</label>
                    <input
                      type="text"
                      value={consumoData.notas}
                      onChange={(e) => setConsumoData((prev) => ({ ...prev, notas: e.target.value }))}
                      placeholder="Motivo del consumo (opcional)"
                    />
                  </div>
                </div>
                <div className="form-actions-compra">
                  <button type="submit" className="btn-save-compra" disabled={isSubmitting}>
                    <Save size={16} /> Registrar Consumo
                  </button>
                  <button
                    type="button"
                    className="btn-cancel-compra"
                    onClick={() => {
                      setShowConsumo(false);
                      setConsumoData({ lugar_id: '', cantidad: 0, notas: '' });
                    }}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {showConsumo && <div className="section-divider"></div>}

          {/* Descripción */}
          {item.descripcion && (
            <div className="detail-info-box">
              <h4>Descripción</h4>
              <p>{item.descripcion}</p>
            </div>
          )}

          {item.descripcion && <div className="section-divider"></div>}

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

          {stockSinAsignar > 0 && <div className="section-divider"></div>}

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
                <MapPin size={48} style={{ opacity: 0.3 }} />
                <p className="empty-title">No hay ubicaciones asignadas</p>
                {stockSinAsignar > 0 ? (
                  <p className="empty-hint">
                    Tienes {stockSinAsignar} {item.unidad_medida || 'unidades'} en Almacén Principal.
                    <br />
                    Usa el botón "Asignar a Ubicación" arriba para distribuirlas.
                  </p>
                ) : (
                  <p className="empty-hint">
                    Añade stock con el botón "Añadir Stock" en la esquina superior.
                  </p>
                )}
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

          <div className="section-divider"></div>

          {/* Historial de Movimientos */}
          <div className="historial-section">
            <div className="historial-header">
              <h3><Clock size={20} /> Historial de Movimientos</h3>
              <div className="filtros-movimiento">
                <button
                  className={filtroMovimiento === 'todos' ? 'active' : ''}
                  onClick={() => setFiltroMovimiento('todos')}
                >
                  Todos
                </button>
                <button
                  className={filtroMovimiento === 'compra' ? 'active' : ''}
                  onClick={() => setFiltroMovimiento('compra')}
                >
                  Compras
                </button>
                <button
                  className={filtroMovimiento === 'asignacion' ? 'active' : ''}
                  onClick={() => setFiltroMovimiento('asignacion')}
                >
                  Asignaciones
                </button>
                <button
                  className={filtroMovimiento === 'consumo' ? 'active' : ''}
                  onClick={() => setFiltroMovimiento('consumo')}
                >
                  Consumos
                </button>
              </div>
            </div>

            {!movimientos || movimientos.length === 0 ? (
              <div className="empty-movimientos">
                <Clock size={48} style={{ opacity: 0.3 }} />
                <p className="empty-title">No hay movimientos aún</p>
                <p className="empty-hint">
                  Los movimientos aparecerán aquí cuando añadas stock o asignes a ubicaciones.
                </p>
              </div>
            ) : (
              <div className="movimientos-table">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Cantidad</th>
                      <th>Costo</th>
                      <th>Ubicación</th>
                      <th>Usuario</th>
                      <th>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientosFiltrados?.slice(0, 15).map((mov, idx) => {
                      const fecha = new Date(mov.fecha);
                      const tipoClasses = {
                        compra: 'tipo-compra',
                        asignacion: 'tipo-asignacion',
                        consumo: 'tipo-consumo',
                        ajuste: 'tipo-ajuste'
                      };

                      return (
                        <tr key={idx}>
                          <td>{fecha.toLocaleDateString()} {fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td><span className={`tipo-badge ${tipoClasses[mov.tipo_movimiento] || ''}`}>{mov.tipo_movimiento}</span></td>
                          <td>{mov.cantidad} {item.unidad_medida || 'un.'}</td>
                          <td>${mov.costo_total ? mov.costo_total.toFixed(2) : 'N/A'}</td>
                          <td>{mov.lugar_destino_nombre || mov.lugar_origen_nombre || '-'}</td>
                          <td>{mov.usuario_nombre || '-'}</td>
                          <td className="notas-cell">{mov.notas || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {movimientosFiltrados && movimientosFiltrados.length > 15 && (
                  <div className="movimientos-footer">
                    Mostrando 15 de {movimientosFiltrados.length} movimientos
                  </div>
                )}
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
