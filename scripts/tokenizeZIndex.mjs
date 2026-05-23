import fs from 'node:fs';
import path from 'node:path';

// Map z-index numeric values to tokens (highest first to avoid prefix matches)
const MAP = [
  ['2147483647', 'var(--z-overlay-max)'],
  ['2147483646', 'var(--z-overlay-max)'],
  ['2147483645', 'var(--z-overlay-max)'],
  ['2147483000', 'var(--z-overlay-max)'],
  ['99999', 'var(--z-overlay-max)'],
  ['10002', 'var(--z-toast)'],
  ['10001', 'var(--z-toast)'],
  ['10000', 'var(--z-toast)'],
  ['9999', 'var(--z-overlay-max)'],
  ['9998', 'var(--z-overlay-max)'],
  ['2000', 'var(--z-overlay)'],
  ['1000', 'var(--z-modal)'],
  ['900', 'var(--z-modal)'],
  ['500', 'var(--z-modal)'],
  ['100', 'var(--z-dropdown)'],
  ['25', 'var(--z-sticky)'],
  ['20', 'var(--z-sticky)'],
  ['11', 'var(--z-sticky)'],
  ['10', 'var(--z-sticky)'],
  ['5', 'var(--z-sticky)'],
  ['2', 'var(--z-base)'],
  ['1', 'var(--z-base)'],
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

// Skip index.css (where tokens are defined) and tokens.css
const SKIP = ['styles/index.css', 'styles\\index.css'];
const files = walk(path.join('src')).filter(f => !SKIP.some(s => f.includes(s)));

let totalReplacements = 0;
let filesChanged = 0;

for (const file of files) {
  let src = fs.readFileSync(file, 'utf8');
  let count = 0;

  for (const [num, token] of MAP) {
    // Match `z-index: <num>;` or `z-index: <num> ` or `z-index: <num>!important`
    // Avoid matching substrings (e.g., `100` in `10000`) by requiring boundary
    const re = new RegExp(`(z-index\\s*:\\s*)${num}(?![0-9])`, 'g');
    src = src.replace(re, (_, prefix) => {
      count++;
      return `${prefix}${token}`;
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
