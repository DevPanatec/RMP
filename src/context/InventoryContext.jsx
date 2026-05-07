import { createContext, useContext, useMemo } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const InventoryContext = createContext();

export const InventoryProvider = ({ children }) => {
  // Queries
  const inventoryData = useQuery(api.inventario.list);
  const lugaresData = useQuery(api.inventario.getLugaresActivos);
  const codigoSugerido = useQuery(api.inventario.generateCodigo);
  const valorTotalInventario = useQuery(api.inventario.getValorTotalInventario);

  // Queries de costos/estadísticas
  const costosPorTipo = useQuery(api.inventario.getCostosPorTipo);
  const consumoPorTipo = useQuery(api.inventario.getConsumoPorTipo);
  const historialComprasPorMes = useQuery(api.inventario.getHistorialComprasPorMes, { meses: 12 });
  const topItemsMasCostosos = useQuery(api.inventario.getTopItemsMasCostosos, { limit: 10 });

  // Mutations
  const addItemMutation = useMutation(api.inventario.add);
  const updateItemMutation = useMutation(api.inventario.update);
  const deleteItemMutation = useMutation(api.inventario.remove);
  const addToLocationMutation = useMutation(api.inventario.addToLocation);
  const updateLocationQuantityMutation = useMutation(api.inventario.updateLocationQuantity);
  const removeFromLocationMutation = useMutation(api.inventario.removeFromLocation);
  const asignarDesdeAlmacenMutation = useMutation(api.inventario.asignarDesdeAlmacen);
  const registrarCompraMutation = useMutation(api.inventario.registrarCompra);
  const registrarConsumoMutation = useMutation(api.inventario.registrarConsumo);

  const inventory = inventoryData || [];
  const lugares = lugaresData || [];
  const loading = inventoryData === undefined;

  // Añadir nuevo item
  const addItem = async (itemData) => {
    try {
      await addItemMutation(itemData);
      return { success: true };
    } catch (error) {
      console.error('Error adding item:', error);
      return { success: false, error: error.message };
    }
  };

  // Actualizar item (datos básicos, no ubicaciones)
  const updateItem = async (id, updates) => {
    try {
      await updateItemMutation({ id, ...updates });
      return { success: true };
    } catch (error) {
      console.error('Error updating item:', error);
      return { success: false, error: error.message };
    }
  };

  // Eliminar item
  const deleteItem = async (id) => {
    try {
      await deleteItemMutation({ id });
      return { success: true };
    } catch (error) {
      console.error('Error deleting item:', error);
      return { success: false, error: error.message };
    }
  };

  // Añadir item a una ubicación
  const addToLocation = async (item_id, lugar_id, cantidad) => {
    try {
      await addToLocationMutation({ item_id, lugar_id, cantidad });
      return { success: true };
    } catch (error) {
      console.error('Error adding to location:', error);
      return { success: false, error: error.message };
    }
  };

  // Actualizar cantidad en ubicación
  const updateLocationQuantity = async (ubicacion_id, cantidad) => {
    try {
      await updateLocationQuantityMutation({ ubicacion_id, cantidad });
      return { success: true };
    } catch (error) {
      console.error('Error updating location quantity:', error);
      return { success: false, error: error.message };
    }
  };

  // Eliminar de ubicación
  const removeFromLocation = async (ubicacion_id) => {
    try {
      await removeFromLocationMutation({ ubicacion_id });
      return { success: true };
    } catch (error) {
      console.error('Error removing from location:', error);
      return { success: false, error: error.message };
    }
  };

  // Asignar desde almacén principal a ubicación
  const asignarDesdeAlmacen = async (item_id, lugar_id, cantidad, usuario_id) => {
    try {
      await asignarDesdeAlmacenMutation({ item_id, lugar_id, cantidad, usuario_id });
      return { success: true };
    } catch (error) {
      console.error('Error asignando desde almacén:', error);
      return { success: false, error: error.message };
    }
  };

  // Registrar nueva compra (añadir stock)
  const registrarCompra = async (item_id, cantidad, precio_unitario, proveedor, notas, usuario_id) => {
    try {
      await registrarCompraMutation({ item_id, cantidad, precio_unitario, proveedor, notas, usuario_id });
      return { success: true };
    } catch (error) {
      console.error('Error registrando compra:', error);
      return { success: false, error: error.message };
    }
  };

  // Registrar consumo desde una ubicación (descuenta stock)
  const registrarConsumo = async (item_id, lugar_id, cantidad, notas) => {
    try {
      await registrarConsumoMutation({ item_id, lugar_id, cantidad, notas });
      return { success: true };
    } catch (error) {
      console.error('Error registrando consumo:', error);
      return { success: false, error: error.message };
    }
  };

  // Estadísticas de inventario (memoized)
  const inventoryStats = useMemo(() => {
    if (!inventory || inventory.length === 0) {
      return {
        total: 0,
        lowStock: 0,
        outOfStock: 0,
        totalValue: 0
      };
    }

    return {
      total: inventory.length,
      lowStock: inventory.filter(item =>
        item.cantidad_disponible <= (item.cantidad_minima || 0) && item.cantidad_disponible > 0
      ).length,
      outOfStock: inventory.filter(item => item.cantidad_disponible === 0).length,
      totalValue: inventory.reduce((sum, item) =>
        sum + (item.cantidad_disponible * (item.precio_unitario || 0)), 0
      ),
    };
  }, [inventory]);

  const getInventoryStats = () => inventoryStats;

  // Búsqueda de materiales
  const searchMaterials = (query) => {
    if (!query || !inventory) return inventory || [];

    const lowerQuery = query.toLowerCase();
    return inventory.filter(item =>
      item.nombre?.toLowerCase().includes(lowerQuery) ||
      item.codigo?.toLowerCase().includes(lowerQuery) ||
      item.tipo_articulo?.toLowerCase().includes(lowerQuery) ||
      item.descripcion?.toLowerCase().includes(lowerQuery)
    );
  };

  const value = useMemo(() => ({
    inventory,
    materials: inventory, // Alias para compatibilidad
    lugares,
    codigoSugerido,
    valorTotalInventario: valorTotalInventario || 0,
    // Queries de costos
    costosPorTipo: costosPorTipo || [],
    consumoPorTipo: consumoPorTipo || [],
    historialComprasPorMes: historialComprasPorMes || [],
    topItemsMasCostosos: topItemsMasCostosos || [],
    loading,
    error: null,
    addItem,
    updateItem,
    deleteItem,
    addToLocation,
    updateLocationQuantity,
    removeFromLocation,
    asignarDesdeAlmacen,
    registrarCompra,
    registrarConsumo,
    // Aliases para compatibilidad con código existente
    addMaterial: addItem,
    updateMaterial: updateItem,
    deleteMaterial: deleteItem,
    inventoryStats,
    getInventoryStats,
    searchMaterials,
  }), [
    inventory,
    lugares,
    codigoSugerido,
    valorTotalInventario,
    costosPorTipo,
    consumoPorTipo,
    historialComprasPorMes,
    topItemsMasCostosos,
    loading,
    inventoryStats,
  ]);

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within InventoryProvider');
  return context;
};

export default InventoryContext;
