import { createContext, useContext } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const InventoryContext = createContext();

export const InventoryProvider = ({ children }) => {
  // Queries
  const inventoryData = useQuery(api.inventario.list);
  const lugaresData = useQuery(api.inventario.getLugaresActivos);
  const codigoSugerido = useQuery(api.inventario.generateCodigo);

  // Mutations
  const addItemMutation = useMutation(api.inventario.add);
  const updateItemMutation = useMutation(api.inventario.update);
  const deleteItemMutation = useMutation(api.inventario.remove);
  const addToLocationMutation = useMutation(api.inventario.addToLocation);
  const updateLocationQuantityMutation = useMutation(api.inventario.updateLocationQuantity);
  const removeFromLocationMutation = useMutation(api.inventario.removeFromLocation);

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

  // Estadísticas de inventario
  const getInventoryStats = () => {
    if (!inventory || inventory.length === 0) {
      return {
        total: 0,
        lowStock: 0,
        outOfStock: 0,
        totalValue: 0
      };
    }

    const stats = {
      total: inventory.length,
      lowStock: inventory.filter(item =>
        item.cantidad_disponible <= (item.cantidad_minima || 0) && item.cantidad_disponible > 0
      ).length,
      outOfStock: inventory.filter(item => item.cantidad_disponible === 0).length,
      totalValue: inventory.reduce((sum, item) =>
        sum + (item.cantidad_disponible * (item.precio_unitario || 0)), 0
      )
    };

    return stats;
  };

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

  const value = {
    inventory,
    materials: inventory, // Alias para compatibilidad
    lugares,
    codigoSugerido,
    loading,
    error: null,
    addItem,
    updateItem,
    deleteItem,
    addToLocation,
    updateLocationQuantity,
    removeFromLocation,
    // Aliases para compatibilidad con código existente
    addMaterial: addItem,
    updateMaterial: updateItem,
    deleteMaterial: deleteItem,
    getInventoryStats,
    searchMaterials,
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within InventoryProvider');
  return context;
};

export default InventoryContext;
