const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Leer la clave del archivo
const keyPath = path.join(__dirname, '..', '.jwt_key_temp.txt');
const key = fs.readFileSync(keyPath, 'utf8').trim();

console.log('🔑 Configurando JWT_PRIVATE_KEY en Convex...\n');

try {
  // Usar execFileSync con argumentos separados para evitar problemas de shell
  execFileSync('npx', ['convex', 'env', 'set', 'JWT_PRIVATE_KEY', key], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  console.log('\n✅ JWT_PRIVATE_KEY configurado exitosamente!');
  console.log('⚠️  Reinicia Convex Dev para que tome efecto.');
} catch (error) {
  console.error('\n❌ Error al configurar JWT_PRIVATE_KEY:', error.message);
  console.error('\n💡 Intenta configurarlo manualmente en el dashboard:');
  console.error('   https://dashboard.convex.dev/');
  process.exit(1);
}
