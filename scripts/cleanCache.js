import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { rm } from 'fs/promises';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const cacheDirs = [
  join(rootDir, 'node_modules', '.vite'),
  join(rootDir, 'dist'),
  join(rootDir, '.vite')
];

console.log('🧹 Limpiando caché de Vite...\n');

for (const dir of cacheDirs) {
  if (existsSync(dir)) {
    try {
      await rm(dir, { recursive: true, force: true });
      console.log(`✅ Eliminado: ${dir}`);
    } catch (error) {
      console.warn(`⚠️  No se pudo eliminar ${dir}:`, error.message);
    }
  } else {
    console.log(`⏭️  No existe: ${dir}`);
  }
}

console.log('\n✨ Caché limpiado exitosamente\n');
