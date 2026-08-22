/**
 * Produce a self-contained static bundle in `dist-site/`.
 *
 * `sample/` is a working directory: it holds the built pages, but also
 * `pages/` (the authored example fragments) and a README that documents the
 * build. Those are inputs. Uploading the whole directory publishes the
 * scaffolding along with the site.
 *
 * This copies out only what should be served, adds a 404 page, and then checks
 * the result is actually portable — because the failure mode of a static
 * bundle is not an error, it is a page that looks fine locally and 404s the
 * moment it is served from a subdirectory.
 *
 * Run with `npm run site:publish`.
 */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { VERSION } from '../lib/version.js';

const SRC = resolve(process.cwd(), 'sample');
const OUT = resolve(process.cwd(), 'dist-site');

if (!existsSync(join(SRC, 'index.html'))) {
  console.error('sample/index.html is missing. Run: npm run site:build');
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

/* ---- Copy the pages and the assets, and nothing else ---- */

let pages = 0;
for (const entry of readdirSync(SRC)) {
  if (!entry.endsWith('.html')) continue;
  cpSync(join(SRC, entry), join(OUT, entry));
  pages += 1;
}
cpSync(join(SRC, 'assets'), join(OUT, 'assets'), { recursive: true });

/* ---- A 404 that is part of the site rather than the host's default ---- */

const template = readFileSync(join(SRC, 'index.html'), 'utf8');
const head = template.slice(0, template.indexOf('</head>') + '</head>'.length);
writeFileSync(
  join(OUT, '404.html'),
  `${head}
<body class="sk-auth">
<script src="assets/icons.js"></script>
<a class="sk-skip-link" href="#main">Skip to main content</a>
<main class="sk-auth__main" id="main">
  <div class="sk-empty-state">
    <svg class="sk-empty-state__icon" aria-hidden="true" focusable="false" width="48" height="48"><use href="#sk-icon-search"></use></svg>
    <h1 class="sk-empty-state__heading">That page is not here</h1>
    <p class="sk-empty-state__body">
      The link may be out of date, or the page may have been renamed between versions.
    </p>
    <div class="sk-empty-state__actions">
      <a class="sk-button sk-button--primary" href="index.html">Go to the overview</a>
      <a class="sk-link" href="components.html">Browse components</a>
    </div>
  </div>
</main>
</body>
</html>
`,
  'utf8'
);

/* ---- Portability check ----
   A static bundle fails quietly: a root-absolute path works at the domain root
   and 404s under a subdirectory, which is exactly where most people put it. */

const problems: string[] = [];
for (const entry of readdirSync(OUT)) {
  if (!entry.endsWith('.html')) continue;
  const html = readFileSync(join(OUT, entry), 'utf8');

  // Code samples show illustrative paths; they are not fetched.
  const live = html.replace(/<pre[\s\S]*?<\/pre>/gi, '<pre></pre>');

  for (const m of live.matchAll(/(?:href|src)="(\/[^/"][^"]*)"/g)) {
    const path = m[1]!;
    // A component demo may show an illustrative link target that was never a
    // real page here. Only assets and pages have to resolve.
    if (/\.(css|js|svg|png|woff2?|json)$/.test(path) || path.endsWith('.html')) {
      problems.push(`${entry}: root-absolute reference ${path}`);
    }
  }
  for (const m of live.matchAll(/(?:href|src)="(https?:\/\/[^"]+)"/g)) {
    const url = m[1]!;
    if (/\.(css|js)(\?|$)/.test(url)) problems.push(`${entry}: external asset ${url}`);
  }
}

/* Every relative page link must resolve inside the bundle. */
const files = new Set(readdirSync(OUT));
for (const entry of readdirSync(OUT)) {
  if (!entry.endsWith('.html')) continue;
  const html = readFileSync(join(OUT, entry), 'utf8').replace(/<pre[\s\S]*?<\/pre>/gi, '<pre></pre>');
  for (const m of html.matchAll(/href="([^"#:/][^"#?]*\.html)/g)) {
    if (!files.has(m[1]!)) problems.push(`${entry}: link to missing ${m[1]}`);
  }
}

const bytes = readdirSync(OUT)
  .filter((f) => f.endsWith('.html'))
  .reduce((n, f) => n + statSync(join(OUT, f)).size, 0);

console.log('Sekura static bundle');
console.log('='.repeat(70));
console.log(`  ${pages + 1} pages (${(bytes / 1024 / 1024).toFixed(1)} MB) plus assets/`);
console.log(`  version ${VERSION}`);

if (problems.length) {
  console.log('');
  console.log('Not portable:');
  for (const p of problems.slice(0, 20)) console.log(`  ${p}`);
  console.log('');
  console.log(`${problems.length} problem(s). A root-absolute path works at a domain root`);
  console.log('and 404s under a subdirectory, which is where most bundles end up.');
  process.exit(1);
}

console.log('');
console.log('Every reference is relative and resolves inside the bundle, so this');
console.log('can be served from a domain root or any subdirectory unchanged:');
console.log('');
console.log('  dist-site/  ->  https://example.com/  or  https://example.com/design-system/');
