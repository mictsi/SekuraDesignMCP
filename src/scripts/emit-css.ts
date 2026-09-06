/**
 * Writes the distributable stylesheet and token exports to ./dist-css.
 * Useful for consuming Sekura as plain files rather than over MCP.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { proseCss, resetCss, utilitiesCss } from '../data/base-css.js';
import { components } from '../data/components/index.js';
import { componentManifest } from '../data/components/contracts.js';
import { exportTokens } from '../lib/exporters.js';

const OUT = join(process.cwd(), 'dist-css');
mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, 'components'), { recursive: true });

function write(name: string, content: string): void {
  const path = join(OUT, name);
  writeFileSync(path, content, 'utf8');
  console.log(`${(content.length / 1024).toFixed(1).padStart(7)} KB  ${name}`);
}

write('tokens.css', exportTokens('css'));
write('tokens.scss', exportTokens('scss'));
write('tokens.dtcg.json', exportTokens('dtcg'));
write('tokens.tailwind.css', exportTokens('tailwind-v4'));
write('tailwind.config.js', exportTokens('tailwind-v3'));
write('tokens.ts', exportTokens('ts'));
write('tokens.figma.json', exportTokens('figma'));
write('SekuraColor.swift', exportTokens('swift'));
write('android-resources.xml', exportTokens('android'));

write('base.css', [resetCss, proseCss, utilitiesCss].join('\n\n'));

for (const c of components) {
  write(join('components', `${c.id}.css`), `/* Sekura — ${c.name} */\n${c.css}\n`);
}

const bundle = [
  exportTokens('css'),
  resetCss,
  proseCss,
  utilitiesCss,
  '@layer sk-components {',
  ...components.map((c) => `\n/* ===== ${c.name} (${c.id}) ===== */\n${c.css}`),
  '}',
].join('\n\n');
write('sekura.css', bundle);
write('component-manifest.json', JSON.stringify(componentManifest(components), null, 2));

console.log(`\nWrote ${components.length + 12} files to ${OUT}`);
