import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Componente temporal para crear un conductor real en Clerk
 *
 * USO:
 * 1. Importa este componente en App.jsx temporalmente
 * 2. Agrégalo antes del login: <CreateConductor />
 * 3. Visita http://localhost:8000
 * 4. Haz clic en "Crear Conductor Real"
 * 5. Elimina este componente después de crear el usuario
 */
const CreateConductor = () => {
  const { signUp, user, signOut } = useAuth();
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateConductor = async () => {
    setLoading(true);
    setStatus('Creando conductor en Clerk...');

    try {
      const result = await signUp(
        'conductor.real@rmp.com',
        'Conductor@Real2025!',
        {
          nombre_completo: 'Juan Pérez',
          tipo_usuario: 'conductor',
          telefono: '+507 6000-0000',
          documento: '8-888-8888',
          activo: true
        }
      );

      if (result.success) {
        setStatus('✅ ¡Conductor creado exitosamente!\n\nCredenciales:\nEmail: conductor.real@rmp.com\nPassword: Conductor@Real2025!');
      } else {
        setStatus(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    setStatus('Cerrando sesión...');
    try {
      await signOut();
      setStatus('✅ Sesión cerrada. Ahora puedes crear el conductor.');
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'linear-gradient(135deg, #3D5229 0%, #556B2F 100%)',
      color: 'white',
      padding: '24px',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
      maxWidth: '400px',
      zIndex: 9999,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700' }}>
        🚛 Crear Conductor Real
      </h3>

      {user && (
        <div style={{
          background: 'rgba(251, 191, 36, 0.2)',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '13px',
          lineHeight: '1.6',
          color: '#fbbf24'
        }}>
          ⚠️ <strong>Estás logueado como {user.nombre}</strong><br />
          Debes cerrar sesión para crear una cuenta nueva.
        </div>
      )}

      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '16px',
        fontSize: '13px',
        lineHeight: '1.6'
      }}>
        <strong>Credenciales:</strong><br />
        📧 Email: conductor.real@rmp.com<br />
        🔑 Password: Conductor@Real2025!<br />
        👤 Nombre: Juan Pérez<br />
        🚛 Tipo: Conductor
      </div>

      {user ? (
        <button
          onClick={handleLogout}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 20px',
            background: loading ? '#6b7280' : '#fbbf24',
            color: '#78350f',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            marginBottom: '12px'
          }}
        >
          {loading ? 'Cerrando sesión...' : '⚠️ Cerrar Sesión Primero'}
        </button>
      ) : (
        <button
          onClick={handleCreateConductor}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 20px',
            background: loading ? '#6b7280' : 'white',
            color: '#3D5229',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            marginBottom: '12px'
          }}
        >
          {loading ? 'Creando...' : 'Crear Conductor Real'}
        </button>
      )}

      {status && (
        <div style={{
          background: status.includes('✅')
            ? 'rgba(34, 197, 94, 0.2)'
            : 'rgba(239, 68, 68, 0.2)',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '13px',
          whiteSpace: 'pre-line',
          lineHeight: '1.6'
        }}>
          {status}
        </div>
      )}

      <div style={{
        marginTop: '12px',
        fontSize: '11px',
        opacity: 0.8,
        lineHeight: '1.4'
      }}>
        ⚠️ Componente temporal - Eliminar después de crear el usuario
      </div>
    </div>
  );
};

export default CreateConductor;
