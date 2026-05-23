import fs from 'node:fs';
import path from 'node:path';

// Heuristic: if `var(--color-surface)` appears as a `color:` value (text), revert to `white`.
// Background usage stays as `var(--color-surface)`.

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
const files = walk(path.join('src')).filter(f => !SKIP.some(s => f.includes(s)));

let totalReplacements = 0;
let filesChanged = 0;

for (const file of files) {
  let src = fs.readFileSync(file, 'utf8');
  let count = 0;

  // Match `color:` (not background-color, not border-color) followed by var(--color-surface)
  // This catches: `color: var(--color-surface)` but NOT `background: var(--color-surface)`
  src = src.replace(
    /(?<![-a-z])color:\s*var\(--color-surface\)/g,
    () => { count++; return 'color: white'; }
  );

  if (count > 0) {
    fs.writeFileSync(file, src);
    filesChanged++;
    totalReplacements += count;
    console.log(`${file} (${count} reverted)`);
  }
}

console.log('---');
console.log(`Files changed: ${filesChanged}`);
console.log(`Reverted: ${totalReplacements}`);
