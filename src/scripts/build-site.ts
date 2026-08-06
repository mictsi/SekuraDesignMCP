/**
 * Builds the documentation site into ./sample.
 *
 * Every page is generated from the design system's own data, so the colour guide
 * shows genuinely audited values and the component pages show the same
 * specification the MCP server serves over MCP. Nothing is transcribed by hand,
 * which means the docs cannot drift from the system they document.
 *
 *   npm run site:build
 */

import { copyFileSync, existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { components } from '../data/components/index.js';
import { foundations } from '../data/foundations.js';
import { patterns } from '../data/patterns.js';
import { layouts } from '../data/layouts.js';
import { semanticTokens } from '../data/tokens.js';
import {
  NAV,
  Page,
  renderDocsPage,
  renderExamplePage,
  resetDemoIds,
  type ShellContext,
} from '../site/shell.js';
import * as pages from '../site/pages.js';

const ROOT = resolve(process.cwd(), 'sample');
const PAGES_DIR = join(ROOT, 'pages');

/* ------------------------------------------------------------------ *
 * The command palette index — everything the site contains.
 * ------------------------------------------------------------------ */

function buildPaletteIndex(): ShellContext['palette'] {
  const entries: ShellContext['palette'] = [];

  for (const group of NAV) {
    for (const item of group.items) {
      entries.push({ file: item.file, label: item.label, group: group.label });
    }
  }
  for (const c of components) {
    entries.push({
      file: `component-${c.id}.html`,
      label: c.name,
      group: 'Components',
      context: c.category,
    });
  }
  for (const p of patterns) {
    entries.push({ file: `patterns.html#${p.id}`, label: p.name, group: 'Patterns' });
  }
  for (const l of layouts) {
    entries.push({ file: `recipes.html#${l.id}`, label: l.name, group: 'Layout recipes' });
  }
  return entries;
}

/* ------------------------------------------------------------------ *
 * The examples reuse the fragments written for the product demo. Their
 * internal links point at the old filenames, so they are rewritten here
 * rather than duplicating the fragments.
 * ------------------------------------------------------------------ */

const EXAMPLE_LINK_MAP: Record<string, string> = {
  'index.html': 'example-dashboard.html',
  'zones.html': 'example-list.html',
  'zone.html': 'example-detail.html',
  'create-zone.html': 'example-form.html',
  'settings.html': 'example-settings.html',
  'signin.html': 'example-signin.html',
  'components.html': 'components.html',
};

function rewriteExampleLinks(html: string): string {
  return html.replace(/href="([^"#?]+\.html)((?:[#?][^"]*)?)"/g, (whole, file: string, rest: string) => {
    const mapped = EXAMPLE_LINK_MAP[file];
    return mapped ? `href="${mapped}${rest}"` : whole;
  });
}

interface ExampleSpec {
  fragment: string;
  file: string;
  title: string;
  description: string;
  bare?: boolean;
}

const EXAMPLES: ExampleSpec[] = [
  {
    fragment: 'index.html',
    file: 'example-dashboard.html',
    title: 'Dashboard',
    description: 'Stat tiles, a chart with a data-table alternative, and an activity timeline.',
  },
  {
    fragment: 'zones.html',
    file: 'example-list.html',
    title: 'List page',
    description: 'Search, filters, sorting, tri-state bulk selection and a typed-confirmation delete.',
  },
  {
    fragment: 'zone.html',
    file: 'example-detail.html',
    title: 'Detail page',
    description: 'Breadcrumbs, tabs, a split button and an inspection drawer.',
  },
  {
    fragment: 'create-zone.html',
    file: 'example-form.html',
    title: 'Form page',
    description: 'Validation on blur and submit, with a focus-managed error summary.',
  },
  {
    fragment: 'settings.html',
    file: 'example-settings.html',
    title: 'Settings',
    description: 'Theme and density controls, and switches that show a pending state.',
  },
  {
    fragment: 'signin.html',
    file: 'example-signin.html',
    title: 'Sign in',
    description: 'Correct autocomplete tokens, a password reveal, and a deliberately vague error.',
    // Its own <main> and centred layout — the app shell would nest a second one.
    bare: true,
  },
];

/* ------------------------------------------------------------------ *
 * Build
 * ------------------------------------------------------------------ */

function main(): void {
  if (!existsSync(ROOT)) {
    console.error(`No sample directory at ${ROOT}.`);
    process.exit(1);
  }

  const ctx: ShellContext = { palette: buildPaletteIndex() };
  const written: Array<{ file: string; bytes: number }> = [];

  const write = (file: string, html: string) => {
    writeFileSync(join(ROOT, file), html, 'utf8');
    written.push({ file, bytes: html.length });
  };

  // Deterministic ids, so an unchanged input produces byte-identical output.
  resetDemoIds();

  /* ---- Documentation ---- */
  const docPages: Page[] = [
    pages.overviewPage(),
    pages.structurePage(),
    pages.developPage(),
    pages.behavioursPage(),
    pages.principlesPage(),
    pages.colorPage(),
    pages.darkModePage(),
    pages.typographyPage(),
    pages.spacingPage(),
    pages.layoutPage(),
    pages.elevationPage(),
    pages.iconographyPage(readIconNames()),
    pages.datavizPage(),
    pages.foundationPage('content-and-voice', 'content.html', 'Content & voice'),
    pages.foundationPage('internationalisation', 'i18n.html', 'Internationalisation'),
    pages.accessibilityPage(),
    pages.foundationPage('theming', 'theming.html', 'Theming'),
    pages.tokensPage(),
    pages.componentsIndexPage(),
    pages.patternsPage(),
    pages.recipesPage(),
  ];

  for (const page of docPages) write(page.file, renderDocsPage(page, ctx));

  /* ---- One page per component ---- */
  for (const c of components) {
    const page = pages.componentPage(c.id);
    write(page.file, renderDocsPage(page, ctx));
  }

  /* ---- Examples ---- */
  for (const ex of EXAMPLES) {
    const path = join(PAGES_DIR, ex.fragment);
    if (!existsSync(path)) {
      console.warn(`  skipped ${ex.file} (no fragment at pages/${ex.fragment})`);
      continue;
    }
    const content = rewriteExampleLinks(readFileSync(path, 'utf8').trimEnd());
    write(
      ex.file,
      renderExamplePage(
        { file: ex.file, title: ex.title, description: ex.description, bare: ex.bare },
        content,
        ctx
      )
    );
  }

  /* ---- Remove pages from a previous layout that are no longer generated ---- */
  const expected = new Set(written.map((w) => w.file));
  let removed = 0;
  for (const file of readdirSync(ROOT)) {
    if (!file.endsWith('.html')) continue;
    if (expected.has(file)) continue;
    unlinkSync(join(ROOT, file));
    removed += 1;
  }

  /* ---- Stylesheet ---- */
  const css = resolve(process.cwd(), 'dist-css/sekura.css');
  if (existsSync(css)) copyFileSync(css, join(ROOT, 'assets/sekura.css'));

  /* ---- Report ---- */
  const total = written.reduce((n, w) => n + w.bytes, 0);
  const docs = written.filter((w) => !w.file.startsWith('component-') && !w.file.startsWith('example-'));
  const comps = written.filter((w) => w.file.startsWith('component-'));
  const exs = written.filter((w) => w.file.startsWith('example-'));

  console.log('Sekura documentation site');
  console.log('='.repeat(70));
  for (const w of docs) {
    console.log(`  ${String(w.bytes).padStart(7)} bytes  ${w.file}`);
  }
  console.log(`  ${String(comps.reduce((n, w) => n + w.bytes, 0)).padStart(7)} bytes  component-*.html (${comps.length} pages)`);
  console.log(`  ${String(exs.reduce((n, w) => n + w.bytes, 0)).padStart(7)} bytes  example-*.html (${exs.length} pages)`);
  console.log('');
  console.log(
    `Built ${written.length} pages (${(total / 1024).toFixed(0)} KB) from ` +
      `${foundations.length} foundations, ${components.length} components, ` +
      `${patterns.length} patterns, ${layouts.length} recipes and ${semanticTokens.length} tokens.`
  );
  if (removed > 0) console.log(`Removed ${removed} stale page(s).`);
}

/** The icon names actually present in the sprite, so the docs cannot list one that is missing. */
function readIconNames(): string[] {
  const src = readFileSync(join(ROOT, 'assets/icons.js'), 'utf8');
  return [...src.matchAll(/^\s*'([a-z0-9-]+)':\s*'</gim)].map((m) => m[1]!);
}

main();
