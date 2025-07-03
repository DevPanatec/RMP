import { useState } from 'react';
import { appData } from '../../data/mockData';
import './Login.css';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    usuario: '',
    password: '',
    tipo: 'admin'
  });

  const [error, setError] = useState('');

  // Credenciales por tipo de usuario
  const credentialsInfo = {
    admin: { usuario: 'admin', password: 'admin123', nombre: 'Administrador' },
    enterprise: { usuario: 'empresa1', password: 'emp123', nombre: 'Empresa Demo' },
    conductor: { usuario: 'conductor1', password: 'cond123', nombre: 'Juan Pérez' }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    console.log('🔍 Intentando login con:', formData);
    console.log('👥 Usuarios disponibles:', appData.usuarios);
    
    const user = appData.usuarios.find(u => 
      u.usuario === formData.usuario && 
      u.password === formData.password &&
      u.tipo === formData.tipo
    );
    
    if (user) {
      console.log('✅ Usuario encontrado:', user);
      onLogin(user);
    } else {
      console.log('❌ Credenciales incorrectas');
      console.log('🔎 Buscando usuario:', formData.usuario);
      console.log('🔎 Con tipo:', formData.tipo);
      console.log('🔎 Con password:', formData.password);
      
      // Verificar qué falta
      const userByName = appData.usuarios.find(u => u.usuario === formData.usuario);
      const userByType = appData.usuarios.find(u => u.tipo === formData.tipo);
      
      if (!userByName) {
        setError(`Usuario "${formData.usuario}" no encontrado. Usa: ${credentialsInfo[formData.tipo].usuario}`);
      } else if (userByName.tipo !== formData.tipo) {
        setError(`El usuario "${formData.usuario}" no es de tipo ${formData.tipo}. Selecciona el tipo correcto.`);
      } else if (userByName.password !== formData.password) {
        setError(`Contraseña incorrecta para ${formData.usuario}. Usa: ${credentialsInfo[formData.tipo].password}`);
      } else {
        setError('Credenciales incorrectas. Verifica usuario, contraseña y tipo.');
      }
    }
  };

  const handleTypeChange = (newType) => {
    setFormData(prev => ({
      ...prev,
      tipo: newType,
      usuario: '', // Limpiar usuario al cambiar tipo
      password: '' // Limpiar contraseña al cambiar tipo
    }));
    setError(''); // Limpiar error al cambiar tipo
  };

  const fillCredentials = () => {
    const creds = credentialsInfo[formData.tipo];
    setFormData(prev => ({
      ...prev,
      usuario: creds.usuario,
      password: creds.password
    }));
    setError('');
  };

  const currentCredentials = credentialsInfo[formData.tipo];

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="rmp-logo">
          <h1>RMP</h1>
          <p>Recolecting Manager Pro</p>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Tipo de Usuario</label>
            <select 
              className="form-control"
              value={formData.tipo}
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              <option value="admin">🔧 Administrador</option>
              <option value="enterprise">🏢 Enterprise</option>
              <option value="conductor">🚛 Conductor</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Usuario</label>
            <input 
              type="text"
              className="form-control"
              value={formData.usuario}
              onChange={(e) => setFormData({...formData, usuario: e.target.value})}
              placeholder={`Ej: ${currentCredentials.usuario}`}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input 
              type="password"
              className="form-control"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder={`Ej: ${currentCredentials.password}`}
              required
            />
          </div>
          
          <button type="submit" className="btn btn--primary btn--full-width">
            Iniciar Sesión
          </button>
        </form>
        
        <div className="credentials-info">
          <div className="credentials-header">
            <strong>Credenciales para {formData.tipo}:</strong>
            <button 
              type="button" 
              className="btn btn--outline btn--sm"
              onClick={fillCredentials}
              style={{ marginLeft: '8px', fontSize: '10px', padding: '4px 8px' }}
            >
              Auto-llenar
            </button>
          </div>
          <div className="credential-item">
            <strong>Usuario:</strong> {currentCredentials.usuario}<br/>
            <strong>Contraseña:</strong> {currentCredentials.password}<br/>
            <strong>Nombre:</strong> {currentCredentials.nombre}
          </div>
          
          <div className="all-credentials">
            <details style={{ marginTop: '16px', fontSize: '11px' }}>
              <summary style={{ cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                Ver todas las credenciales
              </summary>
              <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(var(--color-primary-rgb), 0.05)', borderRadius: '4px' }}>
                <strong>Admin:</strong> admin / admin123<br/>
                <strong>Enterprise:</strong> empresa1 / emp123<br/>
                <strong>Conductor:</strong> conductor1 / cond123
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 