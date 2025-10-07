import supabaseClient from './supabaseClient';

export const createTestUsers = async () => {
  const testUsers = [
    {
      email: 'admin@rmp.com',
      password: 'admin123',
      userData: {
        tipo_usuario: 'admin',
        nombre_completo: 'Administrador del Sistema',
        telefono: '+507 6000-0001',
        documento: '8-000-0001'
      }
    },
    {
      email: 'empresa@rmp.com',
      password: 'empresa123',
      userData: {
        tipo_usuario: 'enterprise',
        nombre_completo: 'Usuario Enterprise',
        telefono: '+507 6000-0002',
        documento: '8-000-0002'
      }
    },
    {
      email: 'conductor@rmp.com',
      password: 'conductor123',
      userData: {
        tipo_usuario: 'conductor',
        nombre_completo: 'Juan Pérez',
        telefono: '+507 6000-0003',
        documento: '8-000-0003',
        vehiculo_asignado_id: 1 // Asignar primer vehículo
      }
    }
  ];

  const results = [];

  for (const testUser of testUsers) {
    try {
      console.log(`Creando usuario: ${testUser.email}`);
      
      // Crear usuario en Auth
      const { data: authData, error: authError } = await supabaseClient.supabase.auth.admin.createUser({
        email: testUser.email,
        password: testUser.password,
        email_confirm: true, // Auto-confirmar email
        user_metadata: {
          nombre_completo: testUser.userData.nombre_completo,
          tipo_usuario: testUser.userData.tipo_usuario
        }
      });

      if (authError) {
        console.error(`Error creando auth user ${testUser.email}:`, authError);
        results.push({ email: testUser.email, success: false, error: authError.message });
        continue;
      }

      // Crear perfil en tabla perfiles_usuarios
      const profileQuery = `
        INSERT INTO perfiles_usuarios (
          id,
          tipo_usuario,
          nombre_completo,
          email,
          telefono,
          documento,
          vehiculo_asignado_id
        ) VALUES (
          '${authData.user.id}',
          '${testUser.userData.tipo_usuario}',
          '${testUser.userData.nombre_completo}',
          '${testUser.email}',
          '${testUser.userData.telefono}',
          '${testUser.userData.documento}',
          ${testUser.userData.vehiculo_asignado_id || 'NULL'}
        )
        ON CONFLICT (id) DO UPDATE SET
          tipo_usuario = EXCLUDED.tipo_usuario,
          nombre_completo = EXCLUDED.nombre_completo,
          email = EXCLUDED.email,
          telefono = EXCLUDED.telefono,
          documento = EXCLUDED.documento,
          vehiculo_asignado_id = EXCLUDED.vehiculo_asignado_id,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;

      const profileResult = await supabaseClient.executeSQL(profileQuery);
      
      console.log(`✅ Usuario creado: ${testUser.email}`);
      results.push({ 
        email: testUser.email, 
        success: true, 
        user: authData.user,
        profile: profileResult.rows[0]
      });

    } catch (error) {
      console.error(`Error creando usuario ${testUser.email}:`, error);
      results.push({ email: testUser.email, success: false, error: error.message });
    }
  }

  return results;
};

// Función para verificar si los usuarios ya existen
export const checkTestUsers = async () => {
  try {
    const result = await supabaseClient.executeSQL(`
      SELECT email, tipo_usuario, nombre_completo 
      FROM perfiles_usuarios 
      WHERE email IN ('admin@rmp.com', 'empresa@rmp.com', 'conductor@rmp.com')
      ORDER BY email;
    `);
    
    return result.rows || [];
  } catch (error) {
    console.error('Error verificando usuarios:', error);
    return [];
  }
};

// Ejecutar solo si se llama directamente (para testing)
if (typeof window !== 'undefined' && window.location.search.includes('create-test-users=true')) {
  console.log('🔧 Creando usuarios de prueba...');
  createTestUsers().then(results => {
    console.log('Resultados:', results);
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ ${successCount}/${results.length} usuarios creados exitosamente`);
  });
}

export default { createTestUsers, checkTestUsers };
