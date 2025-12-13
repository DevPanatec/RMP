const fs = require('fs');
const path = require('path');

// Leer la clave del archivo
const keyPath = path.join(__dirname, '..', '.jwt_key_temp.txt');
const key = fs.readFileSync(keyPath, 'utf8').trim();

// Convertir saltos de línea a espacios (formato requerido por Convex Auth)
const formattedKey = key.replace(/\n/g, ' ');

console.log('🔑 Clave JWT en formato Convex Auth:\n');
console.log(formattedKey);
console.log('\n\n✅ Copia la línea de arriba (desde -----BEGIN hasta -----END) y pégala en el dashboard de Convex.');
console.log('📋 Dashboard: https://dashboard.convex.dev/');
console.log('⚙️  Settings > Environment Variables > JWT_PRIVATE_KEY\n');

// Guardar también en archivo
const outputPath = path.join(__dirname, '..', '.jwt_key_formatted.txt');
fs.writeFileSync(outputPath, formattedKey);
console.log(`💾 También guardado en: .jwt_key_formatted.txt\n`);
