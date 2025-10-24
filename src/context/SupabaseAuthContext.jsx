import { createContext, useContext, useState, useEffect, useRef } from 'react';
import supabaseClient from '../utils/supabaseClient';

const SupabaseAuthContext = createContext();

const ACTIONS = {
  SET_USER: 'SET_USER',
  SET_SESSION: 'SET_SESSION',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR'
};

export const SupabaseAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const isCheckingSession = useRef(false);
  const lastVisibilityCheck = useRef(0);
  const loadedUserIds = useRef(new Set());

  useEffect(() => {
    const savedAuthState = localStorage.getItem('rmp_auth_state');
    if (savedAuthState) {
      try {
        const { user: savedUser, session: savedSession, timestamp } = JSON.parse(savedAuthState);
        const isExpired = Date.now() - timestamp > 3600000;
        
        if (!isExpired && savedUser && savedSession) {
          console.log('🔄 Restaurando estado de autenticación desde localStorage');
          setUser(savedUser);
          setSession(savedSession);
          setLoading(false);
          return;
        } else {
          console.log('⏰ Estado guardado expirado, verificando sesión');
          localStorage.removeItem('rmp_auth_state');
        }
      } catch (err) {
        console.error('❌ Error restaurando estado:', err);
        localStorage.removeItem('rmp_auth_state');
      }
    }

    checkSession();
    
    const { data: authListener } = supabaseClient.supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event, session?.user?.id);
        setSession(session);

        if (!session?.user) {
          console.log('❌ Sin sesión, limpiando usuario');
          setUser(null);
          setLoading(false);
          loadedUserIds.current.clear();
          localStorage.removeItem('rmp_auth_state');
          return;
        }

        const userId = session.user.id;
        
        try {
          // SIEMPRE cargar el perfil en SIGNED_IN, independientemente del Set
          if (event === 'SIGNED_IN' || !loadedUserIds.current.has(userId)) {
            console.log('📥 Cargando perfil para evento:', event);
            setLoading(true);
            await loadUserProfile(userId);
            loadedUserIds.current.add(userId);
            console.log('✅ Perfil cargado correctamente');
            
            // Pequeño delay para asegurar que React actualice el estado
            await new Promise(resolve => setTimeout(resolve, 100));
          } else {
            console.log('✅ Perfil ya existe en memoria, usando caché');
          }
        } catch (err) {
          console.error('❌ Error cargando perfil:', err);
          setError(err.message);
        } finally {
          // SIEMPRE poner loading en false
          console.log('🏁 Finalizando carga, setLoading(false)');
          setLoading(false);
          console.log('🏁 Loading ahora es: false');
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    // Prevenir verificaciones múltiples simultáneas
    if (isCheckingSession.current) {
      console.log('⏭️ Ya hay una verificación de sesión en progreso');
      return;
    }
    
    isCheckingSession.current = true;
    
    try {
      console.log('Verificando sesión...');
      setLoading(true);

      const { data: { session }, error } = await supabaseClient.supabase.auth.getSession();

      if (error) throw error;

      console.log('Sesión obtenida:', session ? 'Sesión activa' : 'Sin sesión');
      setSession(session);

      if (session?.user) {
        await loadUserProfile(session.user.id);
      }
    } catch (err) {
      console.error('Error checking session:', err);
      setError(err.message);
      setSession(null);
      setUser(null);
    } finally {
      console.log('Verificación de sesión completada');
      setLoading(false);
      isCheckingSession.current = false;
    }
  };

  const loadUserProfile = async (userId) => {
    // Prevent duplicate profile loads
    if (loadingProfile) {
      console.log('⏸️ Ya se está cargando un perfil, saltando...');
      return;
    }

    try {
      setLoadingProfile(true);
      console.log('📋 Cargando perfil de usuario:', userId);

      // Timeout de 30 segundos para conexiones lentas
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout cargando perfil')), 30000)
      );

      const profilePromise = supabaseClient.supabase
        .from('perfiles_usuarios')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]);

      if (error) {
        console.error('Error cargando perfil:', error);
        setLoadingProfile(false);
        
        if (error.code === 'PGRST116') {
          console.warn('Perfil de usuario no encontrado, creando perfil básico...');
          setUser({
            id: userId,
            email: null,
            nombre: 'Usuario',
            tipo: 'conductor',
            telefono: null,
            documento: null,
            foto_url: null,
            vehiculo_asignado_id: null,
            vehiculo_placa: null,
            camionAsignado: null,
            proyecto_id: null,
            proyecto_nombre: null,
            activo: true
          });
          return;
        }
        
        throw error;
      }

      console.log('🔍 Consulta completada, procesando perfil...');
      
      if (profile) {
        console.log('✅ Perfil base cargado:', profile);
        
        let vehiculoPlaca = null;
        let proyectoNombre = null;
        
        if (profile.vehiculo_asignado_id) {
          try {
            console.log('🚗 Cargando vehículo...');
            const { data: vehiculo } = await supabaseClient.supabase
              .from('vehiculos')
              .select('placa')
              .eq('id', profile.vehiculo_asignado_id)
              .single();
            vehiculoPlaca = vehiculo?.placa || null;
            console.log('✅ Vehículo cargado:', vehiculoPlaca);
          } catch (err) {
            console.warn('⚠️ No se pudo cargar vehículo:', err);
          }
        }
        
        if (profile.proyecto_id) {
          try {
            console.log('📁 Cargando proyecto...');
            const { data: proyecto } = await supabaseClient.supabase
              .from('proyectos')
              .select('nombre')
              .eq('id', profile.proyecto_id)
              .single();
            proyectoNombre = proyecto?.nombre || null;
            console.log('✅ Proyecto cargado:', proyectoNombre);
          } catch (err) {
            console.warn('⚠️ No se pudo cargar proyecto:', err);
          }
        }
        
        console.log('👤 Estableciendo usuario final...');
        const userData = {
          id: profile.id,
          email: profile.email,
          nombre: profile.nombre_completo,
          tipo: profile.tipo_usuario,
          telefono: profile.telefono,
          documento: profile.documento,
          foto_url: profile.foto_url,
          vehiculo_asignado_id: profile.vehiculo_asignado_id,
          vehiculo_placa: vehiculoPlaca,
          camionAsignado: profile.vehiculo_asignado_id,
          proyecto_id: profile.proyecto_id,
          proyecto_nombre: proyectoNombre,
          activo: profile.activo
        };
        setUser(userData);
        console.log('✅ Usuario establecido correctamente');
        console.log('👤 Usuario final:', userData.tipo, userData.nombre);
      } else {
        console.warn('⚠️ No se encontró perfil para el usuario');
        setUser(null);
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
      setError(err.message);
      setUser(null);
    } finally {
      console.log('🔚 loadUserProfile finalizado, setLoadingProfile(false)');
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (user && session) {
      const authState = {
        user,
        session,
        timestamp: Date.now()
      };
      localStorage.setItem('rmp_auth_state', JSON.stringify(authState));
      console.log('💾 Estado de autenticación guardado en localStorage');
    }
  }, [user, session]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const timeSinceLastCheck = now - lastVisibilityCheck.current;
        
        // Debounce: solo verificar si han pasado más de 5 segundos desde la última verificación
        if (timeSinceLastCheck < 5000) {
          console.log('⏭️ Verificación de sesión omitida (debounce)');
          return;
        }
        
        lastVisibilityCheck.current = now;
        
        // Solo verificar si NO hay usuario Y NO estamos ya verificando
        if (!user && !isCheckingSession.current && !loadingProfile) {
          console.log('👁️ Pestaña visible, verificando sesión...');
          const savedAuthState = localStorage.getItem('rmp_auth_state');
          
          if (savedAuthState) {
            try {
              const { user: savedUser, session: savedSession, timestamp } = JSON.parse(savedAuthState);
              const isExpired = Date.now() - timestamp > 3600000;
              
              if (!isExpired && savedUser && savedSession) {
                console.log('🔄 Restaurando sesión desde localStorage');
                setUser(savedUser);
                setSession(savedSession);
                setLoading(false);
              } else {
                console.log('⏰ Sesión expirada, limpiando');
                localStorage.removeItem('rmp_auth_state');
              }
            } catch (err) {
              console.error('❌ Error restaurando sesión:', err);
            }
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, loadingProfile]);

  const signIn = async (email, password) => {
    try {
      console.log('🔑 Iniciando signIn para:', email);
      setLoading(true);
      setError(null);

      const { data, error } = await supabaseClient.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      console.log('✅ Auth exitoso, el perfil se cargará automáticamente vía onAuthStateChange');
      // NO ponemos setLoading(false) aquí, lo manejará onAuthStateChange
      
      return { success: true, user: data.user };
    } catch (err) {
      console.error('❌ Error signing in:', err);
      setError(err.message);
      setLoading(false); // Solo si hay error
      return { success: false, error: err.message };
    }
  };

  const signUp = async (email, password, userData) => {
    try {
      setLoading(true);
      setError(null);

      // Crear usuario en Auth
      const { data: authData, error: authError } = await supabaseClient.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre_completo: userData.nombre_completo,
            tipo_usuario: userData.tipo_usuario
          }
        }
      });

      if (authError) throw authError;

      // Crear perfil en tabla perfiles_usuarios usando ORM
      const { error: profileError } = await supabaseClient.supabase
        .from('perfiles_usuarios')
        .insert({
          id: authData.user.id,
          tipo_usuario: userData.tipo_usuario,
          nombre_completo: userData.nombre_completo,
          email: email,
          telefono: userData.telefono || null,
          documento: userData.documento || null,
          vehiculo_asignado_id: userData.vehiculo_asignado_id || null,
          proyecto_id: userData.proyecto_id || null
        });

      if (profileError) throw profileError;

      return { success: true, user: authData.user };
    } catch (err) {
      console.error('Error signing up:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Iniciando cierre de sesión...');
      setLoading(true);
      
      const { error } = await supabaseClient.supabase.auth.signOut();
      
      if (error) throw error;
      
      // Limpiar todo el estado
      setUser(null);
      setSession(null);
      loadedUserIds.current.clear();
      localStorage.removeItem('rmp_auth_state');
      
      console.log('✅ Sesión cerrada y estado limpiado');
      
      return { success: true };
    } catch (err) {
      console.error('❌ Error cerrando sesión:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    try {
      setLoading(true);
      setError(null);

      const updateFields = [];
      if (updates.nombre_completo) updateFields.push(`nombre_completo = '${updates.nombre_completo}'`);
      if (updates.telefono) updateFields.push(`telefono = '${updates.telefono}'`);
      if (updates.documento) updateFields.push(`documento = '${updates.documento}'`);
      if (updates.foto_url) updateFields.push(`foto_url = '${updates.foto_url}'`);
      if (updates.vehiculo_asignado_id !== undefined) {
        updateFields.push(`vehiculo_asignado_id = ${updates.vehiculo_asignado_id || 'NULL'}`);
      }

      updateFields.push(`updated_at = now()`);

      const query = `
        UPDATE perfiles_usuarios
        SET ${updateFields.join(', ')}
        WHERE id = '${user.id}'
        RETURNING *;
      `;

      const result = await supabaseClient.executeSQL(query);
      
      if (result.rows && result.rows.length > 0) {
        await loadUserProfile(user.id);
      }

      return { success: true };
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabaseClient.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      return { success: true };
    } catch (err) {
      console.error('Error resetting password:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword,
    checkSession
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
};

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth debe ser usado dentro de un SupabaseAuthProvider');
  }
  return context;
};

export default SupabaseAuthContext;
