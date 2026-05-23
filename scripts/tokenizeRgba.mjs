import fs from 'node:fs';
import path from 'node:path';

// Map common rgba patterns to alpha tokens.
// Match BOTH spaced + unspaced forms (e.g., `rgba(0, 0, 0, 0.1)` vs `rgba(0,0,0,0.1)`).
const PATTERNS = [
  // Black overlays
  [/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.04\s*\)/g, 'var(--alpha-overlay-faint)'],
  [/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.06\s*\)/g, 'var(--alpha-overlay-soft)'],
  [/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.08\s*\)/g, 'var(--alpha-overlay-light)'],
  [/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.10?\s*\)/g, 'var(--alpha-overlay-base)'],
  [/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.15\s*\)/g, 'var(--alpha-overlay-medium)'],
  [/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.30?\s*\)/g, 'var(--alpha-overlay-strong)'],
  [/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.40?\s*\)/g, 'var(--alpha-overlay-darker)'],
  [/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.50?\s*\)/g, 'var(--alpha-overlay-backdrop)'],
  [/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.60?\s*\)/g, 'var(--alpha-overlay-heavy)'],
  [/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.80?\s*\)/g, 'var(--alpha-overlay-deep)'],
  [/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.90?\s*\)/g, 'var(--alpha-overlay-near-opaque)'],
  [/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.95\s*\)/g, 'var(--alpha-overlay-opaque)'],

  // White highlights
  [/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.05\s*\)/g, 'var(--alpha-highlight-faint)'],
  [/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.06\s*\)/g, 'var(--alpha-highlight-soft)'],
  [/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.08\s*\)/g, 'var(--alpha-highlight-base)'],
  [/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.10?\s*\)/g, 'var(--alpha-highlight-light)'],
  [/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.15\s*\)/g, 'var(--alpha-highlight-medium)'],
  [/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.20?\s*\)/g, 'var(--alpha-highlight-strong)'],
  [/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.30?\s*\)/g, 'var(--alpha-highlight-heavy)'],

  // iOS red (255, 59, 48) — used as error in legacy code
  [/rgba\(\s*255\s*,\s*59\s*,\s*48\s*,\s*0\.10?\s*\)/g, 'var(--alpha-ios-red-tint)'],
  [/rgba\(\s*255\s*,\s*59\s*,\s*48\s*,\s*0\.20?\s*\)/g, 'var(--alpha-ios-red-soft)'],

  // iOS orange (255, 149, 0) — used as warning
  [/rgba\(\s*255\s*,\s*149\s*,\s*0\s*,\s*0\.10?\s*\)/g, 'var(--alpha-ios-orange-tint)'],
  [/rgba\(\s*255\s*,\s*149\s*,\s*0\s*,\s*0\.20?\s*\)/g, 'var(--alpha-ios-orange-soft)'],

  // iOS green (52, 199, 89) — used as success
  [/rgba\(\s*52\s*,\s*199\s*,\s*89\s*,\s*0\.10?\s*\)/g, 'var(--alpha-ios-green-tint)'],
  [/rgba\(\s*52\s*,\s*199\s*,\s*89\s*,\s*0\.20?\s*\)/g, 'var(--alpha-ios-green-soft)'],

  // iOS blue (0, 122, 255) — used as info
  [/rgba\(\s*0\s*,\s*122\s*,\s*255\s*,\s*0\.10?\s*\)/g, 'var(--alpha-ios-blue-tint)'],
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
const files = walk(path.join('src')).filter(f => !SKIP.some(s => f.includes(s)));

let totalReplacements = 0;
let filesChanged = 0;

for (const file of files) {
  let src = fs.readFileSync(file, 'utf8');
  let count = 0;

  for (const [re, token] of PATTERNS) {
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
