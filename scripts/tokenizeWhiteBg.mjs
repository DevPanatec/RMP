import fs from 'node:fs';
import path from 'node:path';

/**
 * Reemplaza `background[-color]: white|#fff|#ffffff` con var(--color-surface).
 * NO toca:
 *   - `color: white` (text — debe quedar literal pa' contraste sobre fondos coloreados)
 *   - gradients/linear-gradient(... white ...) — más complejos, manual review
 *   - `border-color: white`
 *   - shorthand `background: white url(...)` — manual review
 */
const PATTERNS = [
  // Match shorthand `background: white;` con `;` o `;` o end-of-line
  [/(background-color\s*:\s*)white\b/g, '$1var(--color-surface)'],
  [/(background-color\s*:\s*)#fff\b/gi, '$1var(--color-surface)'],
  [/(background-color\s*:\s*)#ffffff\b/gi, '$1var(--color-surface)'],
  // shorthand: only match `background: white` (no other tokens after — pure color)
  [/(background\s*:\s*)white(\s*;|\s*\})/g, '$1var(--color-surface)$2'],
  [/(background\s*:\s*)#fff(?![0-9a-fA-F])(\s*;|\s*\})/g, '$1var(--color-surface)$2'],
  [/(background\s*:\s*)#ffffff(?![0-9a-fA-F])(\s*;|\s*\})/gi, '$1var(--color-surface)$2'],
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
    src = src.replace(re, (...args) => {
      count++;
      return typeof replacement === 'function' ? replacement(...args) : args[0].replace(args[1], '').replace(/^.*$/, replacement.replace('$1', args[1]).replace('$2', args[2] || ''));
    });
  }

  // Re-run cleanly with simple replace (the function above is buggy with multi-group)
  src = fs.readFileSync(file, 'utf8');
  count = 0;
  for (const [re, replacement] of PATTERNS) {
    src = src.replace(re, (...args) => {
      count++;
      return replacement.replace(/\$1/g, args[1] || '').replace(/\$2/g, args[2] || '');
    });
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
