/**
 * Builds @sekura/behaviours into dist-js/.
 *
 * Three outputs, because the package has to be consumable from every stack the
 * design system claims to support:
 *
 *   sekura.esm.js      ES module, for bundlers and <script type="module">
 *   sekura.iife.js     Global `Sekura`, for a plain <script> tag, Blazor, Rails
 *   sekura.iife.min.js the same, minified, for production
 *   types/             .d.ts, emitted by tsc
 *
 * The IIFE build matters more than it looks: server-rendered stacks with no
 * build step are exactly the ones that cannot reimplement a combobox correctly,
 * so they are the ones that most need this.
 */

import { build } from 'esbuild';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ENTRY = resolve(process.cwd(), 'src/behaviours/index.ts');
const OUT = resolve(process.cwd(), 'dist-js');
mkdirSync(OUT, { recursive: true });

const banner = `/*! Sekura Design System — behaviours v1.0.0 | MIT
 * Framework-agnostic keyboard and ARIA implementations.
 * Attaches to DOM you already render; never injects markup or CSS.
 */`;

interface Target {
  file: string;
  format: 'esm' | 'iife';
  minify: boolean;
}

const targets: Target[] = [
  { file: 'sekura.esm.js', format: 'esm', minify: false },
  { file: 'sekura.esm.min.js', format: 'esm', minify: true },
  { file: 'sekura.iife.js', format: 'iife', minify: false },
  { file: 'sekura.iife.min.js', format: 'iife', minify: true },
];

const results: Array<{ file: string; bytes: number; gzip: number }> = [];

for (const target of targets) {
  await build({
    entryPoints: [ENTRY],
    outfile: join(OUT, target.file),
    bundle: true,
    format: target.format,
    // The global name for the IIFE build. `Sekura.enhance(...)` from a plain
    // script tag.
    globalName: target.format === 'iife' ? 'Sekura' : undefined,
    target: ['es2022', 'chrome111', 'firefox113', 'safari16.4'],
    minify: target.minify,
    sourcemap: false,
    legalComments: 'none',
    banner: target.minify ? undefined : { js: banner },
    charset: 'utf8',
  });

  const raw = readFileSync(join(OUT, target.file));
  results.push({
    file: target.file,
    bytes: statSync(join(OUT, target.file)).size,
    gzip: gzipSync(raw).length,
  });
}

/* A package.json so the folder can be consumed directly or published. */
writeFileSync(
  join(OUT, 'package.json'),
  JSON.stringify(
    {
      name: '@sekura/behaviours',
      version: '1.0.0',
      description:
        'Framework-agnostic keyboard and ARIA behaviour for the Sekura Design System. Zero dependencies.',
      type: 'module',
      main: './sekura.esm.js',
      module: './sekura.esm.js',
      types: './types/index.d.ts',
      exports: {
        '.': {
          types: './types/index.d.ts',
          import: './sekura.esm.js',
          default: './sekura.iife.js',
        },
        './min': './sekura.esm.min.js',
      },
      sideEffects: false,
      license: 'MIT',
      keywords: ['design-system', 'accessibility', 'aria', 'headless', 'wcag'],
    },
    null,
    2
  ) + '\n',
  'utf8'
);

console.log('Sekura behaviours');
console.log('='.repeat(64));
for (const r of results) {
  console.log(
    `  ${String(r.bytes).padStart(7)} B  ${String(r.gzip).padStart(6)} B gzip   ${r.file}`
  );
}
console.log('');
const min = results.find((r) => r.file === 'sekura.iife.min.js');
console.log(`Zero dependencies. Production bundle: ${((min?.gzip ?? 0) / 1024).toFixed(1)} KB gzipped.`);
