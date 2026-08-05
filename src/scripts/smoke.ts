/**
 * End-to-end smoke test.
 *
 * Connects a real MCP client to the server over an in-memory transport and calls
 * every tool, every component, every framework, every export format and every
 * foundation/pattern/layout. Catches broken formatters and bad enum wiring that a
 * type check cannot.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { components } from '../data/components/index.js';
import { foundations } from '../data/foundations.js';
import { layouts } from '../data/layouts.js';
import { patterns } from '../data/patterns.js';
import { FRAMEWORKS } from '../lib/codegen.js';
import { EXPORT_FORMATS } from '../lib/exporters.js';
import { createServer } from '../server.js';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(label: string, condition: boolean, detail = ''): void {
  if (condition) {
    passed += 1;
  } else {
    failed += 1;
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function textOf(result: unknown): string {
  const r = result as { content?: Array<{ type: string; text?: string }>; isError?: boolean };
  if (r.isError) return '';
  return (r.content ?? [])
    .filter((c) => c.type === 'text')
    .map((c) => c.text ?? '')
    .join('\n');
}

async function main(): Promise<void> {
  const server = createServer();
  const client = new Client({ name: 'sekura-smoke', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  console.log('Sekura Design MCP — smoke test');
  console.log('='.repeat(78));

  /* ---- Capability listing ---- */
  const tools = await client.listTools();
  console.log(`\nTools registered: ${tools.tools.length}`);
  for (const t of tools.tools) console.log(`  - ${t.name}`);
  ok('tools registered', tools.tools.length >= 14, `got ${tools.tools.length}`);

  const resources = await client.listResources();
  ok('resources registered', resources.resources.length >= 4, `got ${resources.resources.length}`);

  const prompts = await client.listPrompts();
  ok('prompts registered', prompts.prompts.length >= 3, `got ${prompts.prompts.length}`);

  /* ---- Discovery ---- */
  console.log('\nDiscovery');
  const overview = textOf(await client.callTool({ name: 'get_overview', arguments: {} }));
  ok('get_overview returns content', overview.length > 2000, `${overview.length} chars`);
  ok('get_overview lists components', overview.includes('`button`'));
  ok('get_overview mentions flex-first', /flex-first/i.test(overview));

  const searchRes = textOf(await client.callTool({ name: 'search', arguments: { query: 'focus ring' } }));
  ok('search finds results', searchRes.includes('result'));
  const searchDark = textOf(await client.callTool({ name: 'search', arguments: { query: 'dark mode border' } }));
  ok('search multi-term', !searchDark.includes('No results'));

  /* ---- Foundations ---- */
  console.log(`\nFoundations (${foundations.length})`);
  for (const f of foundations) {
    const out = textOf(await client.callTool({ name: 'get_foundation', arguments: { id: f.id } }));
    ok(`foundation ${f.id}`, out.includes(f.title) && out.length > 500, `${out.length} chars`);
  }

  /* ---- Components ---- */
  console.log(`\nComponents (${components.length})`);
  const list = textOf(await client.callTool({ name: 'list_components', arguments: {} }));
  ok('list_components', list.includes('button') && list.includes('table'));

  for (const c of components) {
    const out = textOf(await client.callTool({ name: 'get_component', arguments: { id: c.id } }));
    ok(`component ${c.id}`, out.includes('## Accessibility') && out.includes('## Dark mode'), `${out.length} chars`);
    // Every spec must document a dark-mode difference, not just say "same".
    ok(`component ${c.id} dark mode substance`, c.darkMode.length > 80, `${c.darkMode.length} chars`);
    // Every component's CSS must use semantic tokens, never hex.
    const hexInCss = /(?:color|background(?:-color)?|border-color|fill)\s*:\s*#[0-9a-f]{3,8}/gi.exec(c.css);
    ok(`component ${c.id} no hard-coded colour`, hexInCss === null, hexInCss?.[0] ?? '');
  }

  /* ---- Code generation ---- */
  console.log(`\nCode generation (${components.length} components x ${FRAMEWORKS.length} frameworks)`);
  for (const c of components) {
    for (const fw of FRAMEWORKS) {
      const out = textOf(
        await client.callTool({ name: 'get_component_code', arguments: { id: c.id, framework: fw } })
      );
      ok(`code ${c.id}/${fw}`, out.length > 100 && !out.startsWith('Unknown'), `${out.length} chars`);
    }
  }

  /* ---- Layouts and patterns ---- */
  console.log(`\nLayouts (${layouts.length}) and patterns (${patterns.length})`);
  for (const l of layouts) {
    const out = textOf(await client.callTool({ name: 'get_layout', arguments: { id: l.id } }));
    ok(`layout ${l.id}`, out.includes('## Regions') && out.includes('```html'));
  }
  for (const p of patterns) {
    const out = textOf(await client.callTool({ name: 'get_pattern', arguments: { id: p.id } }));
    ok(`pattern ${p.id}`, out.includes('## The problem') && out.includes('## Anti-patterns'));
  }

  /* ---- Tokens ---- */
  console.log('\nTokens');
  const allTokens = textOf(await client.callTool({ name: 'get_tokens', arguments: { includeScales: true } }));
  ok('get_tokens all', allTokens.includes('--sk-color-surface-base') && allTokens.includes('Type scale'));

  const filtered = textOf(await client.callTool({ name: 'get_tokens', arguments: { filter: 'border' } }));
  ok('get_tokens filter', filtered.includes('border-subtle') && !filtered.includes('chart-1'));

  const grouped = textOf(await client.callTool({ name: 'get_tokens', arguments: { group: 'status' } }));
  ok('get_tokens group', grouped.includes('status-success-surface'));

  for (const fmt of EXPORT_FORMATS) {
    const out = textOf(await client.callTool({ name: 'export_tokens', arguments: { format: fmt } }));
    ok(`export ${fmt}`, out.length > 500, `${out.length} chars`);
  }
  // Spot-check the CSS export actually contains all four themes.
  const cssExport = textOf(await client.callTool({ name: 'export_tokens', arguments: { format: 'css' } }));
  ok('css export has dark theme', cssExport.includes('[data-sk-theme="dark"]'));
  ok('css export has hc themes', cssExport.includes('hc-light') && cssExport.includes('hc-dark'));
  ok('css export has prefers-color-scheme', cssExport.includes('prefers-color-scheme: dark'));
  ok('css export has densities', cssExport.includes('data-sk-density="compact"'));

  const prims = textOf(await client.callTool({ name: 'get_primitives', arguments: {} }));
  ok('get_primitives', prims.includes('cobalt') && prims.includes('neutral'));

  /* ---- Suggestion ---- */
  console.log('\nSuggestion');
  for (const intent of [
    'subtle border on a card',
    'text for a timestamp',
    'background for a dropdown menu',
    'destructive button fill',
    'colour for a chart series',
  ]) {
    const out = textOf(await client.callTool({ name: 'suggest_token', arguments: { intent } }));
    ok(`suggest "${intent}"`, out.includes('var(--sk-') && !out.includes('No token matched'));
  }

  /* ---- Contrast ---- */
  console.log('\nContrast');
  const good = textOf(
    await client.callTool({
      name: 'check_contrast',
      arguments: { foreground: 'color-text-primary', background: 'color-surface-base', theme: 'dark' },
    })
  );
  ok('check_contrast tokens pass', good.includes('✅'));

  const bad = textOf(
    await client.callTool({
      name: 'check_contrast',
      arguments: { foreground: '#cccccc', background: '#ffffff' },
    })
  );
  ok('check_contrast detects failure', bad.includes('❌ FAIL'));
  ok('check_contrast suggests alternatives', bad.includes('What to use instead'));

  const audit = textOf(await client.callTool({ name: 'audit_theme', arguments: {} }));
  ok('audit_theme all themes pass', audit.includes('✅ All declared pairings satisfied'), audit.slice(0, 400));

  for (const theme of ['light', 'dark', 'hc-light', 'hc-dark']) {
    const t = textOf(await client.callTool({ name: 'audit_theme', arguments: { theme } }));
    ok(`audit ${theme}`, t.includes('✅ All declared pairings satisfied'));
  }

  /* ---- Validation ---- */
  console.log('\nValidation');
  const badMarkup = `
    <button><svg aria-hidden="true"></svg></button>
    <input type="text" placeholder="Email" />
    <div onclick="go()">Click</div>
    <a href="#">read more</a>
    <style>.x { color: #ff0000; display: flex; }</style>
    <div tabindex="3">x</div>
  `;
  const findings = textOf(await client.callTool({ name: 'validate_markup', arguments: { markup: badMarkup } }));
  ok('validate finds missing button name', findings.includes('button-accessible-name'));
  ok('validate finds placeholder-as-label', findings.includes('placeholder-as-label'));
  ok('validate finds non-semantic interactive', findings.includes('non-semantic-interactive'));
  ok('validate finds hard-coded colour', findings.includes('hard-coded-color'));
  ok('validate finds positive tabindex', findings.includes('positive-tabindex'));
  ok('validate finds link-as-button', findings.includes('link-as-button'));
  ok('validate finds flex without wrap', findings.includes('flex-row-no-wrap'));

  const goodMarkup = `
    <button type="button" class="sk-button sk-button--primary">Save changes</button>
    <label class="sk-field__label" for="host">Hostname</label>
    <input class="sk-input" id="host" type="text" />
  `;
  const clean = textOf(await client.callTool({ name: 'validate_markup', arguments: { markup: goodMarkup } }));
  ok('validate passes good markup', clean.includes('No issues found'), clean.slice(0, 300));

  /* ---- Setup and stylesheet ---- */
  console.log('\nSetup');
  const setup = textOf(await client.callTool({ name: 'get_setup', arguments: {} }));
  ok('get_setup scaffold', setup.includes('data-sk-theme') && setup.includes('sk-skip-link'));
  ok('get_setup theme script', setup.includes('sekuraTheme'));

  const sheet = textOf(await client.callTool({ name: 'get_stylesheet', arguments: {} }));
  ok('get_stylesheet complete', sheet.includes('.sk-button') && sheet.includes('--sk-color-surface-base'));
  ok('get_stylesheet has layers', sheet.includes('@layer sk-reset, sk-base, sk-components, sk-utilities'));

  /* ---- Resources ---- */
  console.log('\nResources');
  for (const r of resources.resources) {
    const read = await client.readResource({ uri: r.uri });
    const content = read.contents[0] as { text?: string } | undefined;
    ok(`resource ${r.uri}`, (content?.text?.length ?? 0) > 200);
  }

  /* ---- Prompts ---- */
  console.log('\nPrompts');
  const buildPrompt = await client.getPrompt({
    name: 'build-page',
    arguments: { description: 'a list of API keys' },
  });
  ok('prompt build-page', buildPrompt.messages.length > 0);

  const reviewPrompt = await client.getPrompt({
    name: 'review-ui',
    arguments: { markup: '<button>x</button>' },
  });
  ok('prompt review-ui', reviewPrompt.messages.length > 0);

  const darkPrompt = await client.getPrompt({
    name: 'implement-dark-mode',
    arguments: { target: 'settings page' },
  });
  ok('prompt implement-dark-mode', darkPrompt.messages.length > 0);

  /* ---- Report ---- */
  await client.close();
  await server.close();

  console.log('');
  console.log('='.repeat(78));
  console.log(`${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log('\nAll checks passed.');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
