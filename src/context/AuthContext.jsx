import { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation } from "convex/react";
import { useUser, useSignIn, useSignUp, useClerk } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Clerk hooks
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { signIn: clerkSignIn } = useSignIn();
  const { signUp: clerkSignUp } = useSignUp();
  const { signOut: clerkSignOut, setActive } = useClerk();

  // Convex mutations
  const createProfile = useMutation(api.perfiles.create);
  const createProfileByUserId = useMutation(api.perfiles.createByUserId);
  const updateProfileMutation = useMutation(api.perfiles.update);

  // Query para obtener el perfil del usuario actual desde Convex
  const profileData = useQuery(
    api.perfiles.getCurrentUser,
    clerkUser ? {} : "skip"
  );

  // Sincronizar el estado del usuario
  useEffect(() => {
    if (!clerkLoaded) {
      setLoading(true);
      return;
    }

    if (!clerkUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Si tenemos usuario de Clerk pero no perfil de Convex todavía, esperar
    if (profileData === undefined) {
      setLoading(true);
      return;
    }

    // Si tenemos perfil, usarlo
    if (profileData) {
      setUser(profileData);
      setLoading(false);
      return;
    }

    // Si no hay perfil pero hay usuario de Clerk, crear perfil básico temporal
    // (esto puede pasar en el primer login antes de que se cree el perfil)
    setUser({
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress,
      nombre: clerkUser.fullName || clerkUser.firstName || 'Usuario',
      tipo: 'enterprise', // Default
      activo: true
    });
    setLoading(false);
  }, [clerkUser, clerkLoaded, profileData]);

  const signIn = async (email, password) => {
    try {
      console.log('🔑 Iniciando signIn con Clerk para:', email);
      setLoading(true);

      const result = await clerkSignIn.create({
        identifier: email,
        password: password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        console.log('✅ SignIn exitoso');
        return { success: true };
      } else {
        console.error('❌ SignIn incompleto:', result.status);
        setLoading(false);
        return { success: false, error: 'Inicio de sesión incompleto' };
      }
    } catch (err) {
      console.error('❌ Error signing in:', err);
      setLoading(false);
      return { success: false, error: err.errors?.[0]?.message || err.message || 'Error al iniciar sesión' };
    }
  };

  const signUp = async (email, password, userData) => {
    try {
      console.log('📝 Iniciando signUp con Clerk para:', email);
      setLoading(true);

      // 1. Crear cuenta con Clerk
      console.log('🔧 Llamando a clerkSignUp.create...');
      const result = await clerkSignUp.create({
        emailAddress: email,
        password: password,
        firstName: userData.nombre_completo?.split(' ')[0] || 'Usuario',
        lastName: userData.nombre_completo?.split(' ').slice(1).join(' ') || '',
      });

      console.log('📊 Resultado de signUp:', result.status, result);
      console.log('📊 Verificaciones pendientes:', result.unverifiedFields);

      // 2. Si el signup requiere verificación de email, intentar preparar verificación
      if (result.status === "missing_requirements" && result.unverifiedFields?.includes('email_address')) {
        console.log('📧 Email no verificado, preparando verificación...');
        // Para desarrollo, intentar usar código de verificación (si está configurado)
        await clerkSignUp.prepareEmailAddressVerification({ strategy: "email_code" });
      }

      // 3. Activar la sesión inmediatamente
      if (result.status === "complete" || result.status === "missing_requirements") {
        console.log('🔓 Activando sesión...');
        await setActive({ session: result.createdSessionId });

        // 3. Obtener el userId de Clerk
        const clerkUserId = result.createdUserId;

        // 4. Construir el tokenIdentifier en formato Convex + Clerk
        // Formato: https://clerk-domain|user_id
        const clerkDomain = "https://peaceful-mustang-86.clerk.accounts.dev";
        const tokenIdentifier = `${clerkDomain}|${clerkUserId}`;

        console.log('📋 TokenIdentifier:', tokenIdentifier);

        // 5. Crear perfil en Convex con el tokenIdentifier correcto
        const profileData = {
          userId: tokenIdentifier,
          tipo_usuario: userData.tipo_usuario || 'enterprise',
          nombre_completo: userData.nombre_completo,
          email: email,
        };

        // Solo agregar campos opcionales si tienen valores
        if (userData.telefono) profileData.telefono = userData.telefono;
        if (userData.documento) profileData.documento = userData.documento;
        if (userData.vehiculo_asignado_id) profileData.vehiculo_asignado_id = userData.vehiculo_asignado_id;
        if (userData.proyecto_id) profileData.proyecto_id = userData.proyecto_id;

        console.log('📝 Creando perfil en Convex...');
        await createProfileByUserId(profileData);

        console.log('✅ SignUp exitoso');
        return { success: true };
      } else {
        console.error('❌ SignUp incompleto:', result.status);
        setLoading(false);
        return { success: false, error: 'Registro incompleto' };
      }
    } catch (err) {
      console.error('❌ Error signing up:', err);
      setLoading(false);
      return { success: false, error: err.errors?.[0]?.message || err.message || 'Error al registrarse' };
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Cerrando sesión...');
      await clerkSignOut();
      setUser(null);
      console.log('✅ Sesión cerrada');
      return { success: true };
    } catch (err) {
      console.error('❌ Error cerrando sesión:', err);
      return { success: false, error: err.message };
    }
  };

  const updateProfile = async (updates) => {
    try {
      if (!user) return { success: false, error: 'No user logged in' };

      await updateProfileMutation({
        id: user._id,
        ...updates
      });

      return { success: true };
    } catch (err) {
      console.error('Error updating profile:', err);
      return { success: false, error: err.message };
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// Backwards compatibility
export const useSupabaseAuth = useAuth;

export default AuthContext;
