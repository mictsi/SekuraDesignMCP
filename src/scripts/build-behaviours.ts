/**
 * Builds @sekura/behaviours into dist-js/.
 *
 * Separate module and script outputs, so the package is consumable from every stack the
 * design system claims to support:
 *
 *   sekura.esm.js      ES module, for bundlers and <script type="module">
 *   sekura.cjs         CommonJS, for require() consumers
 *   sekura.iife.js     Global `Sekura`, for a plain <script> tag, Blazor, Rails
 *   sekura.iife.min.js the same, minified, for production
 *   types/             .d.ts, emitted by tsc
 *
 * The IIFE build matters more than it looks: server-rendered stacks with no
 * build step are exactly the ones that cannot reimplement a combobox correctly,
 * so they are the ones that most need this.
 */

import { build } from 'esbuild';
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { VERSION } from '../lib/version.js';

const ENTRY = resolve(process.cwd(), 'src/behaviours/index.ts');
const OUT = resolve(process.cwd(), 'dist-js');
mkdirSync(OUT, { recursive: true });

const banner = `/*! Sekura Design System — behaviours v${VERSION} | MIT
 * Framework-agnostic keyboard and ARIA implementations.
 * Attaches to host DOM; some controllers own helper content. Never injects CSS.
 */`;

interface Target {
  file: string;
  format: 'esm' | 'iife' | 'cjs';
  minify: boolean;
}

const targets: Target[] = [
  { file: 'sekura.esm.js', format: 'esm', minify: false },
  { file: 'sekura.esm.min.js', format: 'esm', minify: true },
  { file: 'sekura.cjs', format: 'cjs', minify: false },
  { file: 'sekura.min.cjs', format: 'cjs', minify: true },
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
    // The bundle cannot read package.json at runtime, so the version is
    // substituted at build time from the same single source.
    define: { __SEKURA_VERSION__: JSON.stringify(VERSION) },
  });

  const raw = readFileSync(join(OUT, target.file));
  results.push({
    file: target.file,
    bytes: statSync(join(OUT, target.file)).size,
    gzip: gzipSync(raw).length,
  });
}

// TypeScript resolves each conditional export in its own module format.
const cjsTypes = join(OUT, 'types-cjs');
rmSync(cjsTypes, { recursive: true, force: true });
function copyCommonJsTypes(source: string, target: string): void {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    if (entry.isDirectory()) copyCommonJsTypes(join(source, entry.name), join(target, entry.name));
    else if (entry.name.endsWith('.d.ts')) {
      const declaration = readFileSync(join(source, entry.name), 'utf8')
        .replace(/(['"])(\.{1,2}\/[^'"]+)\.js\1/g, '$1$2.cjs$1');
      writeFileSync(join(target, entry.name.replace(/\.d\.ts$/, '.d.cts')), declaration);
    }
  }
}
copyCommonJsTypes(join(OUT, 'types'), cjsTypes);

/* A package.json so the folder can be consumed directly or published. */
writeFileSync(
  join(OUT, 'package.json'),
  JSON.stringify(
    {
      name: '@sekura/behaviours',
      version: VERSION,
      description:
        'Framework-agnostic keyboard and ARIA behaviour for the Sekura Design System. Zero dependencies.',
      type: 'module',
      main: './sekura.cjs',
      module: './sekura.esm.js',
      types: './types/index.d.ts',
      exports: {
        '.': {
          import: { types: './types/index.d.ts', default: './sekura.esm.js' },
          require: { types: './types-cjs/index.d.cts', default: './sekura.cjs' },
          default: './sekura.esm.js',
        },
        './min': {
          import: { types: './types/index.d.ts', default: './sekura.esm.min.js' },
          require: { types: './types-cjs/index.d.cts', default: './sekura.min.cjs' },
          default: './sekura.esm.min.js',
        },
        './iife': './sekura.iife.js',
        './iife/min': './sekura.iife.min.js',
      },
      sideEffects: ['./sekura.iife.js', './sekura.iife.min.js'],
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
