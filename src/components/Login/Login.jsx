import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDemoMode } from '../../hooks/useDemoMode';
import CreateTestUsers from '../CreateTestUsers/CreateTestUsers';
import { Settings, Building, Truck, Eye, EyeOff, CheckCircle, XCircle, Sparkles } from '../Icons';
import './Login.css';

const Login = ({ onLogin }) => {
  const { signIn, loading, error: authError } = useAuth();
  const { isDemoMode, toggleDemoMode } = useDemoMode();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    tipo: 'admin'
  });

  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCreateUsers, setShowCreateUsers] = useState(false);

  // Credenciales de prueba para auto-llenar
  const credentialsInfo = {
    admin: { 
      email: 'admin@rmp.com', 
      password: 'admin123', 
      nombre: 'Administrador del Sistema' 
    },
    enterprise: { 
      email: 'empresa@rmp.com', 
      password: 'empresa123', 
      nombre: 'Usuario Enterprise' 
    },
    conductor: { 
      email: 'conductor@rmp.com', 
      password: 'conductor123', 
      nombre: 'Juan Pérez - Conductor' 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    console.log('Intentando login con:', formData.email);

    try {
      const result = await signIn(formData.email, formData.password);
      
      if (result.success) {
        console.log('Login exitoso');
        // El contexto ya cargó el perfil del usuario
        // Llamar a onLogin para actualizar el estado en App
        if (onLogin) {
          onLogin(result.user);
        }
      } else {
        console.log('Login fallido:', result.error);
        
        // Mensajes de error más amigables
        if (result.error.includes('Invalid login credentials')) {
          setError('Credenciales incorrectas. Verifica tu email y contraseña.');
        } else if (result.error.includes('Email not confirmed')) {
          setError('Por favor confirma tu email antes de iniciar sesión.');
        } else {
          setError(result.error || 'Error al iniciar sesión. Intenta de nuevo.');
        }
      }
    } catch (err) {
      console.error('Error en login:', err);
      setError('Error de conexión. Por favor intenta de nuevo.');
    }
  };

  const handleTypeChange = (newType) => {
    setFormData(prev => ({
      ...prev,
      tipo: newType,
      email: '',
      password: ''
    }));
    setError('');
  };

  const fillCredentials = () => {
    const creds = credentialsInfo[formData.tipo];
    setFormData(prev => ({
      ...prev,
      email: creds.email,
      password: creds.password
    }));
    setError('');
  };

  const currentCredentials = credentialsInfo[formData.tipo];

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
              onChange={(e) => setFormData({...formData, email: e.target.value})}
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
                onChange={(e) => setFormData({...formData, password: e.target.value})}
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

          <input type="hidden" name="tipo" value="admin" />
          
          <button
            type="submit"
            className="btn btn--primary btn--full-width"
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <a
            href="?seed"
            style={{
              color: '#667eea',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ¿No tienes usuarios? Crear usuarios de prueba
          </a>
        </div>

      </div>

      {showCreateUsers && (
        <CreateTestUsers 
          onClose={() => setShowCreateUsers(false)}
          onSuccess={() => {
            setShowCreateUsers(false);
            alert('Usuarios de prueba creados exitosamente. Ahora puedes iniciar sesión.');
          }}
        />
      )}
    </div>
  );
};

export default Login;
