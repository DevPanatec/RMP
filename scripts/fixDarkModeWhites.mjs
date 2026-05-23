import fs from 'node:fs';
import path from 'node:path';

/**
 * Reemplaza rgba(255,255,255, X) con X >= 0.5 con tokens semánticos.
 * Esos opacities altos crean "islas blancas" en dark mode.
 *
 * También reemplaza hex de off-white sutil (#f8f9fb, #f1f3f6, etc.).
 *
 * NO toca rgba(255,255,255, <0.5) — esos son highlights legítimos que ya tienen tokens.
 */
const PATTERNS = [
  // rgba whites alta opacidad → surface acrylic
  [/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.50?\s*\)/g, 'var(--color-surface-acrylic)'],
  [/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.60?\s*\)/g, 'var(--color-surface-acrylic)'],
  [/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.70?\s*\)/g, 'var(--color-surface-acrylic)'],
  [/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.80?\s*\)/g, 'var(--color-surface-acrylic)'],
  [/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.85\s*\)/g, 'var(--color-surface-acrylic)'],
  [/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.90?\s*\)/g, 'var(--color-surface)'],
  [/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.92\s*\)/g, 'var(--color-surface-acrylic)'],
  [/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.95\s*\)/g, 'var(--color-surface)'],

  // Hex light tints comunes (slate-50/100, sky-50/100, etc.)
  [/#f8fafc(?![0-9a-fA-F])/gi, 'var(--color-background)'],
  [/#f1f5f9(?![0-9a-fA-F])/gi, 'var(--color-surface-secondary)'],
  [/#f8f9fb(?![0-9a-fA-F])/gi, 'var(--color-surface-secondary)'],
  [/#f1f3f6(?![0-9a-fA-F])/gi, 'var(--color-surface-secondary)'],
  [/#fafbfa(?![0-9a-fA-F])/gi, 'var(--color-surface-secondary)'],
  [/#f8fdf8(?![0-9a-fA-F])/gi, 'var(--color-surface-secondary)'],
  [/#f0f9ff(?![0-9a-fA-F])/gi, 'var(--color-info-light)'],
  [/#fffbeb(?![0-9a-fA-F])/gi, 'var(--color-warning-light)'],
  [/#fef3c7(?![0-9a-fA-F])/gi, 'var(--color-warning-light)'],
  [/#fee2e2(?![0-9a-fA-F])/gi, 'var(--color-error-light)'],
  [/#dcfce7(?![0-9a-fA-F])/gi, 'var(--color-success-light)'],
  [/#dbeafe(?![0-9a-fA-F])/gi, 'var(--color-info-light)'],
];

const walk = (dir) => {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
      out.push(...walk(full));
    } else if (e.name.endsWith('.css')) {
      out.push(full);
    }
  }
  return out;
};

const SKIP = ['styles/index.css', 'styles\\index.css'];
const files = walk(path.join('src')).filter((f) => !SKIP.some((s) => f.includes(s)));

let totalReplacements = 0;
let filesChanged = 0;

for (const file of files) {
  let src = fs.readFileSync(file, 'utf8');
  let count = 0;

  for (const [re, replacement] of PATTERNS) {
    src = src.replace(re, () => { count++; return replacement; });
  }

  if (count > 0) {
    fs.writeFileSync(file, src);
    filesChanged++;
    totalReplacements += count;
    console.log(`${file} (${count} replacements)`);
  }
}

console.log('---');
console.log(`Files changed: ${filesChanged}`);
console.log(`Replacements: ${totalReplacements}`);
