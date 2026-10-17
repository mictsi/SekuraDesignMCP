/** Outcome regressions for SERVER-01..08 and CON-04. Run after build. */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, utimesSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import { get as httpGet } from 'node:http';
import { spawnSync } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../server.js';
import { createHttpApp, readAssetRoots } from '../http.js';
import { evaluateContrast, parseColor } from '../lib/color.js';
import { MARKUP_LIMITS, validateMarkup } from '../lib/validate.js';
import { validateIntegration } from '../lib/integration.js';
import { exportCss, exportDtcg, exportFigma, exportSwift, exportAndroid, exportTailwindV4 } from '../lib/exporters.js';
import { tokenNames } from '../lib/token-registry.js';
import { publishedUrls, readUrlConfig, requestBoundaryError } from '../lib/urls.js';
import { semanticTokens } from '../data/tokens.js';

const rule = (markup: string, name: string): boolean => validateMarkup(markup).some(finding => finding.rule === name);
// SERVER-01 / SERVER-08: parser semantics, exact ID matching and bounded work.
for (const id of ['(', 'a.b', '(a+)+$', 'a&b', 'single\'quote']) {
  assert.equal(rule(`<label for="${id}">Name</label><input id="${id}">`, 'input-missing-label'), false, id);
}
assert.ok(rule('<label for="aXb">Name</label><input id="a.b">', 'input-missing-label'));
assert.equal(rule('<label for="a&#46;b">Name</label><input id="a.b">', 'input-missing-label'), false);
assert.equal(rule('<label>Name <input></label>', 'input-missing-label'), false);
assert.ok(rule('<label for="different">Name <input id="actual"></label>', 'input-missing-label'));
for (const markup of ['<input aria-label="">', '<input aria-label="  ">', '<input aria-labelledby="missing">', '<label for="x"></label><input id="x">']) assert.ok(rule(markup, 'input-missing-label'), markup);
for (const markup of ['<button><span hidden>Save</span></button>', '<button><span aria-hidden="true">Save</span></button>', '<button><span style="display: none">Save</span></button>', '<button aria-labelledby="empty"><span id="empty"></span></button>']) assert.ok(rule(markup, 'button-accessible-name'), markup);
for (const markup of ['<button><span class="sk-visually-hidden">Save</span></button>', '<span id="name" hidden>Save</span><button aria-labelledby="name"></button>', '<button aria-label="Save"><svg aria-hidden="true"></svg></button>']) assert.equal(rule(markup, 'button-accessible-name'), false, markup);
assert.ok(rule('x'.repeat(MARKUP_LIMITS.codeUnits + 1), 'validation-limit'));
assert.ok(rule('<div>'.repeat(MARKUP_LIMITS.depth + 1), 'validation-limit'));
assert.ok(rule('<b></b>'.repeat(MARKUP_LIMITS.nodes + 1), 'validation-limit'));
assert.ok(rule('<label for="x"></label>'.repeat(400) + '<input id="x">'.repeat(300), 'validation-limit'));
// Integration must apply the same budgets before inspecting component wiring.
// This fragment is below the integration string limit but exceeded its old
// recursive walk's call stack; a limit result must not claim wiring was checked.
const deepIntegrationMarkup = '<div>'.repeat(8192) + 'Leaf' + '</div>'.repeat(8192);
const integrationArgs = { componentIds: ['button'], stylesheets: ['sekura.css'], initialization: 'none' as const };
for (const markup of [deepIntegrationMarkup, '<b></b>'.repeat(MARKUP_LIMITS.nodes + 1), '<label for="x"></label>'.repeat(400) + '<input id="x">'.repeat(300)]) {
  assert.ok(markup.length < 200000);
  const result = validateIntegration({ ...integrationArgs, markup });
  assert.equal(result.valid, false);
  assert.deepEqual(result.findings.map(finding => finding.rule), ['validation-limit']);
  assert.deepEqual(result.requiredControllers, []);
  assert.match(result.limitation, /not completed/);
}
const previousAttack = `<label for="${'a'.repeat(60)}!">Name</label><input id="(a+)+$">`;
const bounded = spawnSync(process.execPath, ['--input-type=module', '-e', `
  import { readFileSync } from 'node:fs';
  const { validateMarkup } = await import(${JSON.stringify(new URL('../lib/validate.js', import.meta.url).href)});
  const findings = validateMarkup(readFileSync(0, 'utf8'));
  if (!findings.some(finding => finding.rule === 'input-missing-label')) process.exitCode = 1;
`], { input: previousAttack, encoding: 'utf8', timeout: 2500 });
assert.equal(bounded.error, undefined, 'The former regex payload must complete within a bounded isolated process.');
assert.equal(bounded.status, 0, bounded.stderr);

// SERVER-02: compare the actual painted colors, in either theme and with both alphas.
assert.equal(evaluateContrast('#fff', '#0000', 'body-text', '#fff').ratio, 1);
assert.equal(evaluateContrast('#000', '#fff0', 'body-text', '#000').ratio, 1);
const half = evaluateContrast('#fff', '#00000080', 'body-text', '#fff');
assert.ok(half.ratio > 4 && half.ratio < 4.01);
assert.equal(half.grade, 'fail');
assert.equal(half.renderedBackground, '#7f7f7f');
assert.equal(evaluateContrast('rgb(255 255 255 / 50%)', 'rgb(0 0 0 / 50%)', 'body-text', '#fff').renderedForeground, '#bfbfbf');
assert.throws(() => evaluateContrast('#fff', '#0000'), /backdrop/);
assert.throws(() => evaluateContrast('#fff', '#0000', 'body-text', 'transparent'), /opaque/);
assert.equal(parseColor('rgb(14 19 26 / 8%)').a, 0.08);

// SERVER-06: emitted names, discovery and linting share the exact registry.
const css = exportCss();
const emittedNames = new Set([...css.matchAll(/--sk-([a-zA-Z0-9-]+)\s*:/g)].map(match => match[1]));
assert.deepEqual([...tokenNames].sort(), [...emittedNames].sort());
assert.equal(rule('<style>.x{inline-size:var(--sk-layout-nav-width)}</style>', 'unknown-token'), false);
assert.ok(rule('<style>.x{padding:var(--sk-space-does-not-exist)}</style>', 'unknown-token'));
assert.ok(rule('<style>.x{padding:var(--sk-Space-4)}</style>', 'unknown-token'));
assert.equal(rule('<style>.x{--sk-local:1rem;padding:var(--sk-local)}</style>', 'unknown-token'), false);

// CON-04: every alias resolves; 2025.10 typed values remain consumable objects.
function inspectAliases(root: Record<string, unknown>, valueKey: '$value' | 'value'): number {
  let aliases = 0;
  function visit(node: unknown): void {
    if (!node || typeof node !== 'object') return;
    const record = node as Record<string, unknown>;
    const value = record[valueKey];
    if (typeof value === 'string' && /^\{.*\}$/.test(value)) {
      const parts = value.slice(1, -1).split('.');
      let target: unknown = root;
      for (const part of parts) target = (target as Record<string, unknown> | undefined)?.[part];
      assert.ok(target && typeof target === 'object' && valueKey in target, `Dangling alias ${value}`);
      aliases++;
    }
    for (const [key, child] of Object.entries(record)) if (!key.startsWith('$') && key !== valueKey && typeof child === 'object') visit(child);
  }
  visit(root);
  return aliases;
}
const dtcg = JSON.parse(exportDtcg());
const figma = JSON.parse(exportFigma());
assert.ok(inspectAliases(dtcg, '$value') > 0);
assert.ok(inspectAliases(figma, 'value') > 0);
assert.equal(dtcg.palette.alpha['black-8'].$value.alpha, 0.08);
assert.equal(figma.palette.alpha['black-8'].value, 'rgb(14 19 26 / 8%)');
for (const node of Object.values(dtcg.dimension) as Array<{ $value: { value: number; unit: string } }>) {
  assert.ok(Number.isFinite(node.$value.value)); assert.ok(['px', 'rem'].includes(node.$value.unit));
}
for (const node of Object.values(dtcg.typography) as Array<{ $value: Record<string, unknown> }>) {
  assert.ok(Array.isArray(node.$value.fontFamily));
  assert.equal(typeof node.$value.fontWeight, 'number');
  assert.equal(typeof node.$value.lineHeight, 'number');
  for (const key of ['fontSize', 'letterSpacing']) {
    const dimension = node.$value[key] as { value: number; unit: string };
    assert.ok(Number.isFinite(dimension.value)); assert.ok(['px', 'rem'].includes(dimension.unit));
  }
}
assert.equal(dtcg.typography['display-2xl'].$extensions['io.github.mictsi.sekura'].projection, 'fluid-minimum');
assert.deepEqual(dtcg.duration.fast.$value, { value: 120, unit: 'ms' });
assert.ok(exportTailwindV4().includes('@theme inline {'));
assert.equal((exportSwift().match(/public static let color/g) ?? []).length, semanticTokens.length);
assert.equal((exportAndroid().match(/<color name=/g) ?? []).length, semanticTokens.length * 2);
assert.ok(!exportSwift().includes('UIColor(hex:'));

const mcp = createServer();
const client = new Client({ name: 'server-reliability', version: '1' });
const [a, b] = InMemoryTransport.createLinkedPair();
const bodyText = (result: Record<string, unknown>): string => JSON.stringify(result.content);
try {
  await Promise.all([mcp.connect(a), client.connect(b)]);
  const named = await client.callTool({ name: 'validate_markup', arguments: { markup: '<label for="(">Name</label><input id="(">' } });
  assert.ok(!named.isError); assert.deepEqual((named.structuredContent as { findings: unknown }).findings, []);
  assert.ok(bodyText(named).includes('Not checked'));
  const oversized = await client.callTool({ name: 'validate_markup', arguments: { markup: 'x'.repeat(MARKUP_LIMITS.codeUnits + 1) } });
  assert.equal(oversized.isError, true); assert.ok(bodyText(oversized).includes('VALIDATION_LIMIT'));
  const deepIntegration = await client.callTool({ name: 'validate_integration', arguments: { ...integrationArgs, markup: deepIntegrationMarkup } });
  const integrationResult = deepIntegration.structuredContent as { valid: boolean; findings: Array<{ rule: string }>; limitation: string };
  assert.equal(integrationResult.valid, false);
  assert.deepEqual(integrationResult.findings.map(finding => finding.rule), ['validation-limit']);
  assert.match(integrationResult.limitation, /not completed/);
  const contrast = await client.callTool({ name: 'check_contrast', arguments: { foreground: '#fff', background: '#0000', backdrop: '#fff' } });
  assert.ok(bodyText(contrast).includes('1.00:1')); assert.ok(bodyText(contrast).includes('explicitly supplied'));
  const assumed = await client.callTool({ name: 'check_contrast', arguments: { foreground: '#fff', background: '#0000' } });
  assert.ok(bodyText(assumed).includes('assumed theme base'));
  const invalidBackdrop = await client.callTool({ name: 'check_contrast', arguments: { foreground: '#fff', background: '#0000', backdrop: 'transparent' } });
  assert.equal(invalidBackdrop.isError, true);
  assert.equal((await client.callTool({ name: 'get_primitives', arguments: { ramp: '__proto__' } })).isError, true);
  const tokens = bodyText(await client.callTool({ name: 'get_tokens', arguments: { includeScales: true } }));
  const advertised = [...tokens.matchAll(/--sk-([a-zA-Z0-9-]+)/g)].map(match => match[1]!);
  for (const name of advertised) assert.ok(tokenNames.has(name), name);
  assert.ok(tokens.includes('--sk-container-prose')); assert.ok(!tokens.includes('--sk-container-width-'));
  const scaffold = bodyText(await client.callTool({ name: 'get_setup', arguments: { part: 'scaffold' } }));
  assert.ok(scaffold.includes('/assets/sekura.css')); assert.ok(scaffold.includes('Stdio serves no HTTP assets'));
} finally { await client.close(); await mcp.close(); }

const originalCwd = process.cwd();
const fixture = mkdtempSync(join(originalCwd, 'tmp-server-reliability-'));
for (const directory of ['dist-css', 'dist-js', 'sample']) mkdirSync(join(fixture, directory));
writeFileSync(join(fixture, 'dist-css/sekura.css'), '/* fixture release one */');
writeFileSync(join(fixture, 'dist-js/sekura.iife.min.js'), '/* fixture behaviors */');
writeFileSync(join(fixture, 'sample/index.html'), '<h1>Fixture</h1>');
writeFileSync(join(fixture, 'sample/cwd-probe.txt'), 'caller folder must not be served');
async function withHttp(env: NodeJS.ProcessEnv, run: (base: string) => Promise<void>): Promise<void> {
  const app = createHttpApp(env);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try { await run(base); } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}
async function rawGet(url: string, headers: Record<string, string>): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const request = httpGet(url, { headers }, response => {
      const chunks: Buffer[] = [];
      response.on('data', chunk => chunks.push(Buffer.from(chunk)));
      response.on('end', () => resolve({ status: response.statusCode!, body: Buffer.concat(chunks).toString() }));
      response.on('error', reject);
    });
    request.on('error', reject);
  });
}
async function tool(base: string, name: string, args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
  const response = await fetch(`${base}/mcp`, { method: 'POST', headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }) });
  assert.equal(response.status, 200);
  return (await response.json() as { result: { content: Array<{ type: string; text: string }> } }).result;
}
try {
  await withHttp({ SEKURA_ASSET_ROOT: fixture }, async base => {
    assert.equal((await fetch(`${base}/health`)).status, 200);
    assert.equal((await fetch(`${base}/manifest.json`, { headers: { origin: 'https://untrusted.example' } })).status, 403);
    assert.equal((await rawGet(`${base}/manifest.json`, { host: 'untrusted.example' })).status, 403);
    assert.equal((await fetch(`${base}/manifest.json`, { headers: { origin: 'null' } })).status, 403);
    assert.equal((await fetch(`${base}/manifest.json`, { headers: { origin: base } })).status, 200);
    const manifest = await (await fetch(`${base}/manifest.json`, { headers: { 'x-forwarded-host': 'untrusted.example', 'x-forwarded-prefix': '/forged' } })).json() as { base: string };
    assert.equal(manifest.base, base);
    const initial = await fetch(`${base}/css/sekura.css`);
    assert.match(initial.headers.get('cache-control')!, /max-age=0.*must-revalidate/);
    assert.ok(!initial.headers.get('cache-control')!.includes('immutable'));
    const etag = initial.headers.get('etag')!;
    assert.equal((await rawGet(`${base}/css/sekura.css`, { 'if-none-match': etag })).status, 304);
    writeFileSync(join(fixture, 'dist-css/sekura.css'), '/* fixture release two changed */');
    const modified = new Date(Date.now() + 2000); utimesSync(join(fixture, 'dist-css/sekura.css'), modified, modified);
    const changed = await rawGet(`${base}/css/sekura.css`, { 'if-none-match': etag });
    assert.equal(changed.status, 200); assert.ok(changed.body.includes('release two'));
    const result = await tool(base, 'get_setup', { part: 'scaffold' });
    const markup = result.content.find(item => item.type === 'text')!.text;
    const assets = [...markup.matchAll(/(?:href|src)="(https?:[^\"]+)"/g)].map(match => match[1]!);
    assert.equal(assets.length, 2);
    for (const asset of assets) assert.equal((await fetch(asset)).status, 200, asset);
    const malformed = await fetch(`${base}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400); assert.ok((await malformed.text()).includes('INVALID_JSON'));
    rmSync(join(fixture, 'dist-js/sekura.iife.min.js'));
    assert.equal((await fetch(`${base}/health`)).status, 503);
    const missing = await (await fetch(`${base}/manifest.json`)).json() as { artefacts: { behaviours: { available: boolean } } };
    assert.equal(missing.artefacts.behaviours.available, false);
    writeFileSync(join(fixture, 'dist-js/sekura.iife.min.js'), '/* fixture behaviors */');
  });
  await withHttp({ SEKURA_ASSET_ROOT: fixture, SEKURA_BASE_PATH: '/design' }, async base => {
    const result = await tool(`${base}/design`, 'get_setup', { part: 'scaffold' });
    assert.ok(bodyText(result).includes(`${base}/design/css/sekura.css`));
    assert.equal((await fetch(`${base}/design/css/sekura.css`)).status, 200);
  });
  await withHttp({ SEKURA_ASSET_ROOT: fixture, SEKURA_TRUST_PROXY: 'loopback', SEKURA_ALLOWED_HOSTS: 'design.example', SEKURA_ALLOWED_ORIGINS: 'https://client.example' }, async base => {
    const headers = { 'x-forwarded-host': 'design.example', 'x-forwarded-proto': 'https', 'x-forwarded-prefix': '/ds', origin: 'https://client.example' };
    const manifest = await (await fetch(`${base}/manifest.json`, { headers })).json() as { base: string };
    assert.equal(manifest.base, 'https://design.example/ds');
    assert.equal((await fetch(`${base}/manifest.json`, { headers: { ...headers, 'x-forwarded-host': 'untrusted.example' } })).status, 403);
    assert.equal((await fetch(`${base}/manifest.json`, { headers: { ...headers, 'x-forwarded-proto': 'https, http' } })).status, 403);
  });
  const roots = readAssetRoots({});
  process.chdir(fixture);
  assert.deepEqual(readAssetRoots({}), roots);
  assert.equal(roots.css, resolve(originalCwd, 'dist-css'));
  await withHttp({}, async base => assert.equal((await fetch(`${base}/docs/cwd-probe.txt`)).status, 404));
  process.chdir(originalCwd);
  const cfg = readUrlConfig({ SEKURA_TRUST_PROXY: 'loopback', SEKURA_ALLOWED_HOSTS: 'design.example' });
  const headers: Record<string, string> = { host: 'localhost:8080', 'x-forwarded-host': 'design.example', 'x-forwarded-proto': 'https' };
  assert.equal(publishedUrls(cfg, { trustedProxy: false, get: name => headers[name] }).base, 'http://localhost:8080');
  assert.equal(requestBoundaryError(cfg, { trustedProxy: true, get: name => headers[name] }), null);
  assert.throws(() => readUrlConfig({ SEKURA_ALLOWED_HOSTS: '*.example' }));
  assert.throws(() => readUrlConfig({ SEKURA_ALLOWED_ORIGINS: '*' }));
  assert.throws(() => readAssetRoots({ SEKURA_ASSET_ROOT: 'relative/path' }));
} finally { process.chdir(originalCwd); rmSync(fixture, { recursive: true, force: true }); }

console.log('Server reliability: bounded exact markup labels, rendered alpha contrast, HTTP trust/caching/readiness/cwd, token discovery, fetchable setup and DTCG/Figma alias/type regressions passed. Native export content checked; native compilation and design-tool import remain separate gates.');
