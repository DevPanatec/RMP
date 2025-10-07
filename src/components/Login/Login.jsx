import { useState } from 'react';
import { useSupabaseAuth } from '../../context/SupabaseAuthContext';
import CreateTestUsers from '../CreateTestUsers/CreateTestUsers';
import { Settings, Building, Truck, Eye, EyeOff, CheckCircle, XCircle } from '../Icons';
import './Login.css';

const Login = ({ onLogin }) => {
  const { signIn, loading, error: authError } = useSupabaseAuth();
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
          <h1>🌱 RMP</h1>
          <p>Recolecting Manager Pro</p>
        </div>
        
        {(error || authError) && (
          <div className="error-message">
            {error || authError}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Tipo de Usuario</label>
            <select 
              className="form-control"
              value={formData.tipo}
              onChange={(e) => handleTypeChange(e.target.value)}
              disabled={loading}
            >
              <option value="admin">Administrador</option>
              <option value="enterprise">Enterprise</option>
              <option value="conductor">Conductor</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Email</label>
            <input 
              type="email"
              className="form-control"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder={`Ej: ${currentCredentials.email}`}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <div className="password-input-wrapper">
              <input 
                type={showPassword ? "text" : "password"}
                className="form-control"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Ingresa tu contraseña"
                required
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
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
        
        <div className="credentials-info">
          <div className="credentials-header">
            <strong>Credenciales para {formData.tipo}:</strong>
            <button 
              type="button" 
              className="btn btn--outline btn--sm"
              onClick={fillCredentials}
              disabled={loading}
              style={{ marginLeft: '8px', fontSize: '10px', padding: '4px 8px' }}
            >
              Auto-llenar
            </button>
          </div>
          <div className="credential-item">
            <strong>Email:</strong> {currentCredentials.email}<br/>
            <strong>Contraseña:</strong> {currentCredentials.password}<br/>
            <strong>Nombre:</strong> {currentCredentials.nombre}
          </div>
          
          <div className="all-credentials">
            <details style={{ marginTop: '16px', fontSize: '11px' }}>
              <summary style={{ cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                Ver todas las credenciales de prueba
              </summary>
              <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(var(--color-primary-rgb), 0.05)', borderRadius: '4px' }}>
                <strong>Admin:</strong> admin@rmp.com / admin123<br/>
                <strong>Enterprise:</strong> empresa@rmp.com / empresa123<br/>
                <strong>Conductor:</strong> conductor@rmp.com / conductor123
              </div>
            </details>
          </div>
        </div>

        <div className="login-footer">
          <p style={{ fontSize: '12px', color: '#666', marginTop: '16px', textAlign: 'center' }}>
            🔒 Autenticación segura con Supabase
          </p>
          <button 
            type="button"
            className="btn btn--outline btn--sm"
            onClick={() => setShowCreateUsers(true)}
            style={{ marginTop: '12px', width: '100%' }}
          >
            <Settings size={16} /> Crear Usuarios de Prueba
          </button>
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
