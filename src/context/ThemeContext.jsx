import { createContext, useContext, useEffect, useState, useMemo } from 'react';

/**
 * Theme: 'light' | 'dark' | 'system'
 * - 'system' = honra prefers-color-scheme del OS (default).
 * - 'light'/'dark' = override manual via data-theme attribute.
 */

const STORAGE_KEY = 'rmp-theme';
const ThemeContext = createContext(null);

const resolveEffective = (theme) => {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return 'system';
    return localStorage.getItem(STORAGE_KEY) || 'system';
  });

  // Aplicar data-theme al <html> cuando el modo es explícito;
  // remover el atributo cuando es 'system' (deja que @media decida).
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // Re-render cuando cambia el sistema (solo si estamos en 'system')
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      // Forzar refresh — el browser ya aplicó el nuevo @media, esto es por consumers que lean `effectiveTheme`.
      setThemeState('system');
    };
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    effectiveTheme: resolveEffective(theme),
    setTheme: setThemeState,
    toggleTheme: () => {
      setThemeState((t) => {
        const eff = resolveEffective(t);
        return eff === 'dark' ? 'light' : 'dark';
      });
    },
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
