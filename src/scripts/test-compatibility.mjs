/** Retain the integration surface applications used before the redesign. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { components } from '../../dist/data/components/index.js';
import { semanticTokens, scales, typeScale, densities, THEMES } from '../../dist/data/tokens.js';
import { foundations } from '../../dist/data/foundations.js';
import { patterns } from '../../dist/data/patterns.js';
import { layouts } from '../../dist/data/layouts.js';
import * as behaviours from '../../dist-js/sekura.esm.js';
const baseline = JSON.parse(readFileSync('compatibility/v2-contract.json', 'utf8'));
let checked = 0;
function retains(label, previous, current) {
  const missing = previous.filter(value => !current.includes(value));
  assert.deepEqual(missing, [], `${label}: removed public names`);
  checked += previous.length;
}
retains('semantic tokens', baseline.tokens, semanticTokens.map(t => t.name));
for (const [name, names] of Object.entries(baseline.scales)) retains(`scale ${name}`, names, Object.keys(scales[name] || {}));
retains('type styles', baseline.typeStyles, Object.keys(typeScale));
retains('densities', baseline.densities, Object.keys(densities));
retains('themes', baseline.themes, THEMES);
retains('foundations', baseline.foundations, foundations.map(f => f.id));
retains('patterns', baseline.patterns, patterns.map(p => p.id));
retains('layouts', baseline.layouts, layouts.map(l => l.id));
retains('behavior exports', baseline.behaviours, Object.keys(behaviours));
for (const previous of baseline.components) {
  const current = components.find(c => c.id === previous.id);
  assert.ok(current, `removed component ${previous.id}`);
  retains(`${previous.id} CSS`, previous.classes, [...current.css.matchAll(/\.(sk-[\w-]+)/g)].map(m => m[1]));
}
console.log(`Compatibility: ${checked} v2 public names retained, 0 removed.`);
