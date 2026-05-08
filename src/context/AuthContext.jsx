import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from "convex/react";
import { useUser, useSignIn, useClerk } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { signIn: clerkSignIn } = useSignIn();
  const { signOut: clerkSignOut, setActive } = useClerk();

  const updateProfileMutation = useMutation(api.perfiles.update);

  const profileData = useQuery(
    api.perfiles.getCurrentUser,
    clerkUser ? {} : "skip"
  );

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

    if (profileData === undefined) {
      setLoading(true);
      return;
    }

    if (profileData) {
      setUser(profileData);
      setLoading(false);
      return;
    }

    // Sin perfil en Convex: NO inventar tipo. El admin debe crear el perfil del usuario.
    setUser(null);
    setLoading(false);
  }, [clerkUser, clerkLoaded, profileData]);

  const signIn = async (email, password) => {
    try {
      setLoading(true);

      const result = await clerkSignIn.create({
        identifier: email,
        password: password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        return { success: true };
      } else {
        setLoading(false);
        return { success: false, error: 'Inicio de sesión incompleto' };
      }
    } catch (err) {
      setLoading(false);
      return { success: false, error: err.errors?.[0]?.message || err.message || 'Error al iniciar sesión' };
    }
  };

  const signOut = async () => {
    try {
      await clerkSignOut();
      setUser(null);
      // Limpiar datos PWA del conductor anterior: localStorage state + IndexedDB queue.
      // Sino el siguiente login en mismo device hereda fotos pendientes y route state.
      try {
        localStorage.removeItem('conductorRouteState');
        const req = indexedDB.deleteDatabase('rmp-offline');
        req.onerror = () => {};
        req.onsuccess = () => {};
      } catch { /* device storage no accesible — ignorar */ }
      return { success: true };
    } catch (err) {
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
      return { success: false, error: err.message };
    }
  };

  const value = useMemo(() => ({
    user,
    loading,
    signIn,
    signOut,
    updateProfile,
  }), [user, loading]);

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

export default AuthContext;
