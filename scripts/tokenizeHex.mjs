import fs from 'node:fs';
import path from 'node:path';

const MAP = {
  '#ffffff': 'var(--color-surface)',
  '#FFFFFF': 'var(--color-surface)',
  '#fff': 'var(--color-surface)',
  '#FFF': 'var(--color-surface)',
  '#605E5C': 'var(--color-text-secondary)',
  '#EDEBE9': 'var(--color-border)',
  '#C19C00': 'var(--color-warning)',
  '#FFB900': 'var(--color-warning)',
  '#107C10': 'var(--color-success)',
  '#D13438': 'var(--color-error)',
  '#0078D4': 'var(--color-info)',
};

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

  for (const [hex, token] of Object.entries(MAP)) {
    const escaped = hex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped + '(?![0-9a-fA-F])', 'g');
    src = src.replace(re, () => { count++; return token; });
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
