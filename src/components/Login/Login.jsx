import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff } from '../Icons';
import './Login.css';

const Login = ({ onLogin }) => {
  const { signIn, loading, error: authError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const result = await signIn(formData.email, formData.password);

      if (result.success) {
        if (onLogin) {
          onLogin(result.user);
        }
      } else {
        if (result.error.includes('Invalid login credentials')) {
          setError('Credenciales incorrectas. Verifica tu email y contraseña.');
        } else if (result.error.includes('Email not confirmed')) {
          setError('Por favor confirma tu email antes de iniciar sesión.');
        } else {
          setError(result.error || 'Error al iniciar sesión. Intenta de nuevo.');
        }
      }
    } catch (err) {
      setError('Error de conexión. Por favor intenta de nuevo.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="rmp-logo">
          <img src="/icons/modules/Logo principal.png" alt="FMP Logo" className="logo-image" />
        </div>

        {(error || authError) && (
          <div className="error-message">
            {error || authError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label-modern">Usuario</label>
            <input
              type="email"
              className="form-control-modern"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Ingresa tu correo"
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label-modern">Contraseña</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                className="form-control-modern"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Ingresa tu contraseña"
                required
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle-modern"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--full-width"
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
