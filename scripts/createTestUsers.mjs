import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://tikpsugkuyotqgxsvgor.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpa3BzdWdrdXlvdHFneHN2Z29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MDI3NjYsImV4cCI6MjA2ODA3ODc2Nn0._NKst-FGkNSTACvsNa_EOF-0zGxJ5o2TnidKd-yqfu4';

const supabase = createClient(supabaseUrl, supabaseKey);

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
    nombre_completo: 'Juan Pérez',
    telefono: '+507 6000-0003',
    documento: '8-000-0003',
    vehiculo_asignado_id: 1
  }
];

async function createUserProfile(userId, userData) {
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

  const { data, error } = await supabase.rpc('exec_sql', { query });
  if (error) {
    // Si exec_sql no existe, usamos el cliente directamente
    const { data: result, error: err } = await supabase
      .from('perfiles_usuarios')
      .upsert({
        id: userId,
        tipo_usuario: userData.tipo_usuario,
        nombre_completo: userData.nombre_completo,
        email: userData.email,
        telefono: userData.telefono,
        documento: userData.documento,
        vehiculo_asignado_id: userData.vehiculo_asignado_id || null
      }, {
        onConflict: 'id'
      })
      .select();
      
    return { data: result, error: err };
  }
  
  return { data, error };
}

async function createUsers() {
  console.log('🔧 Creando usuarios de prueba en Supabase Auth...\n');
  
  const results = [];
  
  for (const user of testUsers) {
    try {
      console.log(`📝 Procesando: ${user.email}`);
      
      // Intentar crear usuario en Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            tipo_usuario: user.tipo_usuario,
            nombre_completo: user.nombre_completo
          }
        }
      });
      
      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
          console.log(`⚠️  ${user.email} - Usuario ya existe en Auth`);
          
          // Intentar obtener el usuario existente para crear/actualizar perfil
          // Nota: No podemos obtener el ID del usuario sin hacer login
          console.log(`   Intenta hacer login manualmente para vincular el perfil`);
          results.push({ email: user.email, status: 'exists', message: 'Usuario ya existe' });
          continue;
        } else {
          console.log(`❌ ${user.email} - Error: ${authError.message}`);
          results.push({ email: user.email, status: 'error', error: authError.message });
          continue;
        }
      }
      
      console.log(`✅ ${user.email} - Usuario creado en Auth`);
      console.log(`   User ID: ${authData.user.id}`);
      
      // Crear perfil en base de datos
      console.log(`   Creando perfil en BD...`);
      const profileResult = await createUserProfile(authData.user.id, user);
      
      if (profileResult.error) {
        console.log(`   ⚠️  Error creando perfil: ${profileResult.error.message}`);
        results.push({ 
          email: user.email, 
          status: 'partial', 
          userId: authData.user.id,
          message: 'Usuario creado pero perfil falló' 
        });
      } else {
        console.log(`   ✅ Perfil creado exitosamente`);
        results.push({ 
          email: user.email, 
          status: 'success', 
          userId: authData.user.id,
          message: 'Usuario y perfil creados' 
        });
      }
      
      console.log('');
      
    } catch (err) {
      console.log(`❌ Error inesperado creando ${user.email}: ${err.message}\n`);
      results.push({ email: user.email, status: 'error', error: err.message });
    }
  }
  
  console.log('\n📊 RESUMEN:');
  console.log('═'.repeat(50));
  
  const successful = results.filter(r => r.status === 'success').length;
  const partial = results.filter(r => r.status === 'partial').length;
  const exists = results.filter(r => r.status === 'exists').length;
  const errors = results.filter(r => r.status === 'error').length;
  
  console.log(`✅ Exitosos: ${successful}`);
  console.log(`⚠️  Parciales: ${partial}`);
  console.log(`ℹ️  Ya existían: ${exists}`);
  console.log(`❌ Errores: ${errors}`);
  console.log('═'.repeat(50));
  
  console.log('\n📧 CREDENCIALES DE ACCESO:');
  console.log('─'.repeat(50));
  testUsers.forEach(user => {
    console.log(`${user.tipo_usuario.toUpperCase()}: ${user.email} / ${user.password}`);
  });
  console.log('─'.repeat(50));
  
  return results;
}

createUsers().then((results) => {
  console.log('\n✅ Proceso completado\n');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Error fatal:', err);
  process.exit(1);
});
