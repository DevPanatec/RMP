import { createContext, useContext, useReducer, useEffect } from 'react';
import supabaseClient from '../utils/supabaseClient';

// Crear el contexto
const SupabaseInventoryContext = createContext();

// Tipos de acciones
const ACTIONS = {
  SET_MATERIALS: 'SET_MATERIALS',
  ADD_MATERIAL: 'ADD_MATERIAL',
  UPDATE_MATERIAL: 'UPDATE_MATERIAL',
  DELETE_MATERIAL: 'DELETE_MATERIAL',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR'
};

// Reducer para manejar el estado
const inventoryReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_MATERIALS:
      return {
        ...state,
        materials: action.payload,
        loading: false,
        error: null
      };

    case ACTIONS.ADD_MATERIAL:
      return {
        ...state,
        materials: [...state.materials, action.payload]
      };

    case ACTIONS.UPDATE_MATERIAL:
      return {
        ...state,
        materials: state.materials.map(material =>
          material.id === action.payload.id ? action.payload : material
        )
      };

    case ACTIONS.DELETE_MATERIAL:
      return {
        ...state,
        materials: state.materials.filter(material => material.id !== action.payload)
      };

    case ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    case ACTIONS.SET_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    default:
      return state;
  }
};

// Estado inicial
const initialState = {
  materials: [],
  loading: true,
  error: null
};

// Provider del contexto
export const SupabaseInventoryProvider = ({ children }) => {
  const [state, dispatch] = useReducer(inventoryReducer, initialState);

  // Cargar materiales al iniciar
  useEffect(() => {
    loadMaterials();
  }, []);

  // Función para cargar materiales
  const loadMaterials = async () => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    
    try {
      const { data, error } = await supabaseClient.client
        .from('inventario')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Formatear datos para que coincidan con la estructura esperada
      const formattedMaterials = data.map(item => ({
        id: item.codigo, // Usar código como ID para compatibilidad
        codigo: item.codigo,
        nombre: item.nombre,
        categoria: item.categoria,
        unidad: item.unidad,
        stockActual: item.stock_actual,
        stockMinimo: item.stock_minimo,
        stockMaximo: item.stock_maximo,
        precio: parseFloat(item.precio),
        proveedor: item.proveedor,
        ubicacion: item.ubicacion,
        fechaVencimiento: item.fecha_vencimiento,
        descripcion: item.descripcion,
        ultimaCompra: item.ultima_compra,
        consumoMensual: item.consumo_mensual,
        estado: item.estado,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
      
      dispatch({ type: ACTIONS.SET_MATERIALS, payload: formattedMaterials });
    } catch (error) {
      console.error('Error loading materials:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
    }
  };

  // Función para agregar material
  const addMaterial = async (materialData) => {
    try {
      const { data, error } = await supabaseClient.client
        .from('inventario')
        .insert([{
          codigo: materialData.codigo,
          nombre: materialData.nombre,
          categoria: materialData.categoria,
          unidad: materialData.unidad,
          stock_actual: materialData.stockActual || 0,
          stock_minimo: materialData.stockMinimo || 0,
          stock_maximo: materialData.stockMaximo || 100,
          precio: materialData.precio || 0,
          proveedor: materialData.proveedor || '',
          ubicacion: materialData.ubicacion || '',
          fecha_vencimiento: materialData.fechaVencimiento || null,
          descripcion: materialData.descripcion || '',
          ultima_compra: materialData.ultimaCompra || null,
          consumo_mensual: materialData.consumoMensual || 0,
          estado: materialData.estado || 'Activo'
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      // Formatear para el estado
      const formattedMaterial = {
        id: data.codigo,
        codigo: data.codigo,
        nombre: data.nombre,
        categoria: data.categoria,
        unidad: data.unidad,
        stockActual: data.stock_actual,
        stockMinimo: data.stock_minimo,
        stockMaximo: data.stock_maximo,
        precio: parseFloat(data.precio),
        proveedor: data.proveedor,
        ubicacion: data.ubicacion,
        fechaVencimiento: data.fecha_vencimiento,
        descripcion: data.descripcion,
        ultimaCompra: data.ultima_compra,
        consumoMensual: data.consumo_mensual,
        estado: data.estado,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      dispatch({ type: ACTIONS.ADD_MATERIAL, payload: formattedMaterial });
      return formattedMaterial;
    } catch (error) {
      console.error('Error adding material:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Función para actualizar material
  const updateMaterial = async (codigo, updates) => {
    try {
      const updateData = {};
      
      if (updates.nombre) updateData.nombre = updates.nombre;
      if (updates.categoria) updateData.categoria = updates.categoria;
      if (updates.unidad) updateData.unidad = updates.unidad;
      if (updates.stockActual !== undefined) updateData.stock_actual = updates.stockActual;
      if (updates.stockMinimo !== undefined) updateData.stock_minimo = updates.stockMinimo;
      if (updates.stockMaximo !== undefined) updateData.stock_maximo = updates.stockMaximo;
      if (updates.precio !== undefined) updateData.precio = updates.precio;
      if (updates.proveedor) updateData.proveedor = updates.proveedor;
      if (updates.ubicacion) updateData.ubicacion = updates.ubicacion;
      if (updates.fechaVencimiento) updateData.fecha_vencimiento = updates.fechaVencimiento;
      if (updates.descripcion) updateData.descripcion = updates.descripcion;
      if (updates.ultimaCompra) updateData.ultima_compra = updates.ultimaCompra;
      if (updates.consumoMensual !== undefined) updateData.consumo_mensual = updates.consumoMensual;
      if (updates.estado) updateData.estado = updates.estado;
      
      updateData.updated_at = new Date().toISOString();
      
      const { data, error } = await supabaseClient.client
        .from('inventario')
        .update(updateData)
        .eq('codigo', codigo)
        .select()
        .single();
      
      if (error) throw error;
      
      // Formatear material actualizado
      const formattedMaterial = {
        id: data.codigo,
        codigo: data.codigo,
        nombre: data.nombre,
        categoria: data.categoria,
        unidad: data.unidad,
        stockActual: data.stock_actual,
        stockMinimo: data.stock_minimo,
        stockMaximo: data.stock_maximo,
        precio: parseFloat(data.precio),
        proveedor: data.proveedor,
        ubicacion: data.ubicacion,
        fechaVencimiento: data.fecha_vencimiento,
        descripcion: data.descripcion,
        ultimaCompra: data.ultima_compra,
        consumoMensual: data.consumo_mensual,
        estado: data.estado,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      dispatch({ type: ACTIONS.UPDATE_MATERIAL, payload: formattedMaterial });
      return formattedMaterial;
    } catch (error) {
      console.error('Error updating material:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Función para eliminar material
  const deleteMaterial = async (codigo) => {
    try {
      const { error } = await supabaseClient.client
        .from('inventario')
        .delete()
        .eq('codigo', codigo);
      
      if (error) throw error;
      
      dispatch({ type: ACTIONS.DELETE_MATERIAL, payload: codigo });
    } catch (error) {
      console.error('Error deleting material:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Función para obtener estadísticas
  const getInventoryStats = () => {
    const total = state.materials.length;
    const stockBajo = state.materials.filter(m => m.estado === 'Stock Bajo').length;
    const stockCritico = state.materials.filter(m => m.estado === 'Stock Crítico').length;
    const agotado = state.materials.filter(m => m.estado === 'Agotado').length;
    
    const categorias = state.materials.reduce((acc, material) => {
      acc[material.categoria] = (acc[material.categoria] || 0) + 1;
      return acc;
    }, {});
    
    const valorTotal = state.materials.reduce((sum, material) => 
      sum + (material.stockActual * material.precio), 0
    );

    return {
      total,
      stockBajo,
      stockCritico,
      agotado,
      categorias,
      valorTotal
    };
  };

  // Función para buscar materiales
  const searchMaterials = (searchTerm, categoria = 'all', estado = 'all') => {
    let filteredMaterials = state.materials;
    
    if (categoria !== 'all') {
      filteredMaterials = filteredMaterials.filter(m => m.categoria === categoria);
    }
    
    if (estado !== 'all') {
      filteredMaterials = filteredMaterials.filter(m => m.estado === estado);
    }
    
    if (searchTerm) {
      filteredMaterials = filteredMaterials.filter(material =>
        material.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.proveedor?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filteredMaterials;
  };

  // Valor del contexto
  const value = {
    materials: state.materials,
    loading: state.loading,
    error: state.error,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    getInventoryStats,
    searchMaterials,
    loadMaterials
  };

  return (
    <SupabaseInventoryContext.Provider value={value}>
      {children}
    </SupabaseInventoryContext.Provider>
  );
};

// Hook para usar el contexto
export const useSupabaseInventory = () => {
  const context = useContext(SupabaseInventoryContext);
  if (!context) {
    throw new Error('useSupabaseInventory debe ser usado dentro de un SupabaseInventoryProvider');
  }
  return context;
};

export default SupabaseInventoryContext;