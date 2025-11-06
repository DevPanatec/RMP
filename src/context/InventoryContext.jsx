import { createContext, useContext } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const InventoryContext = createContext();

export const InventoryProvider = ({ children }) => {
  const inventoryData = useQuery(api.inventario.list);

  const addItemMutation = useMutation(api.inventario.add);
  const updateItemMutation = useMutation(api.inventario.update);
  const deleteItemMutation = useMutation(api.inventario.remove);

  const inventory = inventoryData || [];
  const loading = inventoryData === undefined;

  const addItem = async (itemData) => {
    try {
      await addItemMutation(itemData);
      return { success: true };
    } catch (error) {
      console.error('Error adding item:', error);
      return { success: false, error: error.message };
    }
  };

  const updateItem = async (id, updates) => {
    try {
      await updateItemMutation({ id, ...updates });
      return { success: true };
    } catch (error) {
      console.error('Error updating item:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteItem = async (id) => {
    try {
      await deleteItemMutation({ id });
      return { success: true };
    } catch (error) {
      console.error('Error deleting item:', error);
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
      item.tipo_articulo?.toLowerCase().includes(lowerQuery) ||
      item.descripcion?.toLowerCase().includes(lowerQuery)
    );
  };

  const value = {
    inventory,
    materials: inventory, // Alias para compatibilidad
    loading,
    error: null,
    addItem,
    updateItem,
    deleteItem,
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

export const useSupabaseInventory = useInventory;
export default InventoryContext;
