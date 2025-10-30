import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './SeedUsers.css';

const TEST_USERS = [
  {
    email: 'admin@rmp.com',
    password: 'Admin@RMP2025!',
    userData: {
      tipo_usuario: 'admin',
      nombre_completo: 'Administrador Test',
      telefono: '809-555-0001',
      documento: '001-0000001-0'
    }
  },
  {
    email: 'enterprise@rmp.com',
    password: 'Enterprise@RMP2025!',
    userData: {
      tipo_usuario: 'enterprise',
      nombre_completo: 'Empresa Test',
      telefono: '809-555-0002',
      documento: '001-0000002-0'
    }
  },
  {
    email: 'conductor@rmp.com',
    password: 'Conductor@RMP2025!',
    userData: {
      tipo_usuario: 'conductor',
      nombre_completo: 'Conductor Test',
      telefono: '809-555-0003',
      documento: '001-0000003-0'
    }
  }
];

const SeedUsers = ({ autoStart = false }) => {
  const { signUp, signOut } = useAuth();
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');
  const [createdUsers, setCreatedUsers] = useState([]);

  // Auto-start si se pasa el prop
  useEffect(() => {
    if (autoStart && status === 'idle') {
      seedUsers();
    }
  }, [autoStart]);

  const seedUsers = async () => {
    setStatus('loading');
    setMessage('Creando usuarios de prueba...');
    setCreatedUsers([]);

    const results = [];

    for (const user of TEST_USERS) {
      try {
        setMessage(`Creando usuario: ${user.email}...`);

        // Registrar usuario
        const result = await signUp(user.email, user.password, user.userData);

        if (result.success) {
          results.push({
            email: user.email,
            password: user.password,
            tipo: user.userData.tipo_usuario,
            status: 'success'
          });

          // Cerrar sesión para poder crear el siguiente
          await signOut();
        } else {
          results.push({
            email: user.email,
            tipo: user.userData.tipo_usuario,
            status: 'error',
            error: result.error
          });
        }
      } catch (err) {
        console.error(`Error creando usuario ${user.email}:`, err);
        results.push({
          email: user.email,
          tipo: user.userData.tipo_usuario,
          status: 'error',
          error: err.message
        });
      }
    }

    setCreatedUsers(results);

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    if (successCount === TEST_USERS.length) {
      setStatus('success');
      setMessage(`✅ ¡${successCount} usuarios creados exitosamente!`);
    } else if (errorCount === TEST_USERS.length) {
      setStatus('error');
      setMessage(`❌ Error: No se pudo crear ningún usuario`);
    } else {
      setStatus('success');
      setMessage(`⚠️ ${successCount} usuarios creados, ${errorCount} fallaron`);
    }
  };

  return (
    <div className="seed-users-container">
      <div className="seed-users-card">
        <h2>🌱 Crear Usuarios de Prueba</h2>
        <p className="seed-description">
          Este componente creará 3 usuarios de prueba en Convex Auth:
        </p>

        <div className="users-list">
          <h3>Usuarios a crear:</h3>
          <ul>
            {TEST_USERS.map(user => (
              <li key={user.email}>
                <strong>{user.userData.tipo_usuario.toUpperCase()}</strong>: {user.email} / {user.password}
              </li>
            ))}
          </ul>
        </div>

        <button
          className="btn-seed"
          onClick={seedUsers}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Creando...' : 'Crear Usuarios de Prueba'}
        </button>

        {message && (
          <div className={`seed-message ${status}`}>
            {message}
          </div>
        )}

        {createdUsers.length > 0 && (
          <div className="results">
            <h3>Resultados:</h3>
            <ul>
              {createdUsers.map((user, idx) => (
                <li key={idx} className={user.status}>
                  {user.status === 'success' ? '✅' : '❌'}
                  <strong>{user.tipo}</strong>: {user.email}
                  {user.status === 'success' ? `/ ${user.password}` : ` - ${user.error}`}
                </li>
              ))}
            </ul>

            {status === 'success' && (
              <div className="next-steps">
                <h4>¡Listo! Ahora puedes:</h4>
                <ol>
                  <li>Volver al login</li>
                  <li>Iniciar sesión con cualquiera de los usuarios creados</li>
                </ol>
                <a
                  href="/"
                  className="btn-back-to-login"
                  style={{
                    display: 'block',
                    marginTop: '16px',
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontWeight: '600'
                  }}
                >
                  Ir al Login
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SeedUsers;
