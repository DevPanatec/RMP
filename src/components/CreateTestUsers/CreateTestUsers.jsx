import { useState } from 'react';
import { createTestUsers } from '../../utils/createTestUsers';
import { Settings, Building, Truck, X, CheckCircle, XCircle } from '../Icons';
import './CreateTestUsers.css';

const CreateTestUsers = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const testUsers = [
    {
      email: 'admin@rmp.com',
      password: 'admin123',
      tipo_usuario: 'admin',
      nombre_completo: 'Administrador del Sistema',
      telefono: '+507 6000-0001',
      documento: '8-000-0001'
    },
    {
      email: 'empresa@rmp.com',
      password: 'empresa123',
      tipo_usuario: 'enterprise',
      nombre_completo: 'Usuario Enterprise',
      telefono: '+507 6000-0002',
      documento: '8-000-0002'
    },
    {
      email: 'conductor@rmp.com',
      password: 'conductor123',
      tipo_usuario: 'conductor',
      nombre_completo: 'Juan Pérez - Conductor',
      telefono: '+507 6000-0003',
      documento: '8-000-0003',
      vehiculo_asignado_id: 1
    }
  ];

  const createUsers = async () => {
    setLoading(true);
    setError(null);
    setResults([]);

    // TODO: Implement with Convex Auth
    alert('Creación de usuarios temporalmente deshabilitada. La app ahora usa Convex en lugar de Supabase.');
    setLoading(false);

    /* OLD SUPABASE CODE - DISABLED
    const creationResults = [];

    for (const user of testUsers) {
      try {
        console.log(`Creando usuario: ${user.email}`);

        // Crear usuario en Auth
        const { data: authData, error: authError } = await supabaseClient.supabase.auth.signUp({
          email: user.email,
          password: user.password,
          options: {
            data: {
              nombre_completo: user.nombre_completo,
              tipo_usuario: user.tipo_usuario
            },
            emailRedirectTo: window.location.origin
          }
        });

        if (authError) {
          console.error(`Error en auth para ${user.email}:`, authError);

          // Si el usuario ya existe, intentar obtenerlo
          if (authError.message.includes('already registered')) {
            creationResults.push({
              email: user.email,
              success: true,
              message: 'Usuario ya existe',
              existed: true
            });

            // Intentar crear/actualizar solo el perfil
            await createUserProfile(user.email, user);
            continue;
          }

          creationResults.push({
            email: user.email,
            success: false,
            error: authError.message
          });
          continue;
        }

        // Crear perfil en base de datos
        await createUserProfile(authData.user.id, user);

        creationResults.push({
          email: user.email,
          success: true,
          message: 'Usuario y perfil creados exitosamente',
          userId: authData.user.id
        });

      } catch (err) {
        console.error(`Error creando ${user.email}:`, err);
        creationResults.push({
          email: user.email,
          success: false,
          error: err.message
        });
      }
    }

    setResults(creationResults);
    setLoading(false);

    const successCount = creationResults.filter(r => r.success).length;
    if (successCount === testUsers.length && onSuccess) {
      setTimeout(() => onSuccess(), 2000);
    }
    */
  };

  /* OLD SUPABASE CODE - DISABLED
  const createUserProfile = async (userId, userData) => {
    const query = `
      INSERT INTO perfiles_usuarios (
        id,
        tipo_usuario,
        nombre_completo,
        email,
        telefono,
        documento,
        vehiculo_asignado_id
      ) VALUES (
        '${userId}',
        '${userData.tipo_usuario}',
        '${userData.nombre_completo}',
        '${userData.email}',
        '${userData.telefono}',
        '${userData.documento}',
        ${userData.vehiculo_asignado_id || 'NULL'}
      )
      ON CONFLICT (id) DO UPDATE SET
        tipo_usuario = EXCLUDED.tipo_usuario,
        nombre_completo = EXCLUDED.nombre_completo,
        telefono = EXCLUDED.telefono,
        documento = EXCLUDED.documento,
        vehiculo_asignado_id = EXCLUDED.vehiculo_asignado_id,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    return await supabaseClient.executeSQL(query);
  };
  */

  return (
    <div className="modal-overlay">
      <div className="modal-content create-users-modal">
        <div className="modal-header">
          <h3><Settings size={20} /> Crear Usuarios de Prueba</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          <div className="users-list">
            <h4>Usuarios a crear:</h4>
            {testUsers.map(user => (
              <div key={user.email} className="user-item">
                <div className="user-icon">
                  {user.tipo_usuario === 'admin' && <Settings size={24} />}
                  {user.tipo_usuario === 'enterprise' && <Building size={24} />}
                  {user.tipo_usuario === 'conductor' && <Truck size={24} />}
                </div>
                <div className="user-details">
                  <strong>{user.nombre_completo}</strong>
                  <small>{user.email}</small>
                  <small className="user-type">{user.tipo_usuario}</small>
                </div>
                <div className="user-credentials">
                  <code>Password: {user.password}</code>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {results.length > 0 && (
            <div className="results-section">
              <h4>Resultados:</h4>
              {results.map((result, index) => (
                <div 
                  key={index} 
                  className={`result-item ${result.success ? 'success' : 'error'}`}
                >
                  <span className="result-icon">
                    {result.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  </span>
                  <span className="result-email">{result.email}</span>
                  <span className="result-message">
                    {result.success ? result.message : result.error}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="btn btn--secondary" 
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button 
            className="btn btn--primary" 
            onClick={createUsers}
            disabled={loading}
          >
            {loading ? 'Creando usuarios...' : 'Crear Usuarios'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateTestUsers;
