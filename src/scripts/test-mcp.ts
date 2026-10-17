/** Verify the discoverable MCP contract against the actual catalogue and artifacts. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../server.js';
import { components } from '../data/components/index.js';
import { FRAMEWORKS } from '../lib/codegen.js';
import { recipeSchema } from '../lib/integration.js';
import { behaviorSchema, migrationSchema, mcpReference } from '../lib/mcp-reference.js';
import { MIGRATION_SOURCES } from '../data/migration.js';
import { VERSION } from '../lib/version.js';

const migration = readFileSync('MIGRATION.md', 'utf8');
const baseline = JSON.parse(readFileSync('compatibility/v2-contract.json', 'utf8'));
const v3Baseline = JSON.parse(readFileSync('compatibility/v3.0-contract.json', 'utf8'));
const v31Baseline = JSON.parse(readFileSync('compatibility/v3.1-contract.json', 'utf8'));
const originalCwd = process.cwd();
process.chdir(tmpdir()); // Packaged resources must not depend on a source checkout cwd.
const server = createServer();
const client = new Client({ name: 'mcp-coverage', version: '1' });
const [a, b] = InMemoryTransport.createLinkedPair();
try {
  await Promise.all([server.connect(a), client.connect(b)]);
  const listed = await client.listTools();
  for (const name of ['get_behavior', 'get_migration_guide']) assert.ok(listed.tools.find(t => t.name === name)?.outputSchema, name);
  for (const component of components) {
    assert.equal(component.status, 'stable', component.id);
    const spec = await client.callTool({ name: 'get_component', arguments: { id: component.id } });
    assert.deepEqual((spec.structuredContent as { component: unknown })?.component, component);
    for (const framework of FRAMEWORKS) {
      const result = await client.callTool({ name: 'get_component_code', arguments: { id: component.id, framework } });
      const recipe = recipeSchema.parse(result.structuredContent);
      assert.deepEqual(recipe.implementation, component.implementation);
      assert.ok(recipe.code.length > 0);
    }
    const result = await client.callTool({ name: 'get_behavior', arguments: { id: component.id } });
    const behavior = behaviorSchema.parse(result.structuredContent);
    assert.deepEqual(behavior.events, component.implementation!.events);
    assert.deepEqual(behavior.runtime, component.implementation!.runtime);
    for (const factory of component.implementation!.runtime.controllers) assert.ok(behavior.api.some(a => a.name === factory && a.runtime), `${component.id}: ${factory}`);
  }
  for (const api of mcpReference().api.filter(api => api.exported)) {
    const result = await client.callTool({ name: 'get_behavior', arguments: { id: api.name } });
    assert.ok(behaviorSchema.parse(result.structuredContent).api.some(a => a.name === api.name && a.signature === api.signature));
  }
  assert.equal(mcpReference().api.find(a => a.name === 'VERSION')?.signature, 'export declare const VERSION: string;');
  assert.ok(mcpReference().api.find(a => a.name === 'ComboboxOptions')?.signature.includes('loadOptions?: (query: string, signal: AbortSignal) => Promise<ComboboxItem[]>;'));
  const combo = behaviorSchema.parse((await client.callTool({ name: 'get_behavior', arguments: { id: 'combobox' } })).structuredContent);
  for (const name of ['ComboboxOptions', 'ComboboxItem', 'PositionOptions', 'Cleanup']) assert.ok(combo.api.some(a => a.name === name), name);
  const full = migrationSchema.parse((await client.callTool({ name: 'get_migration_guide', arguments: {} })).structuredContent);
  assert.equal(full.markdown, migration);
  assert.deepEqual(full.compatibility.baseline, baseline);
  assert.ok(full.compatibility.geometryCss.includes('--sk-'));
  const filtered = migrationSchema.parse((await client.callTool({ name: 'get_migration_guide', arguments: { componentId: 'combobox' } })).structuredContent);
  assert.ok(filtered.changes.some(c => c.components.includes('combobox')));
  assert.ok(filtered.changes.every(c => !c.components.length || c.components.includes('combobox')));
  const reliabilityChanges = ['input-commit-contract', 'overlay-lifecycle-and-feedback', 'consumer-lifecycle-and-packaging', 'http-deployment-boundary', 'validation-and-token-export-contract'];
  const navigation31Changes = ['navigation-fixed-width', 'navigation-drawer-scope', 'nested-action-menus', 'menu-focus-handoff', 'tree-navigation-mode', 'navigation-mcp-contracts'];
  const sourceGuides = new Map<string, ReturnType<typeof migrationSchema.parse>>();
  for (const fromVersion of MIGRATION_SOURCES) {
    const result = migrationSchema.parse((await client.callTool({ name: 'get_migration_guide', arguments: { fromVersion } })).structuredContent);
    sourceGuides.set(fromVersion, result);
    assert.equal(result.version, VERSION);
    assert.equal(result.fromVersion, fromVersion);
    assert.equal(result.markdown, migration);
    assert.equal(result.upgradePaths?.length, 1);
    assert.equal(result.upgradePaths?.[0]?.fromVersion, fromVersion);
    assert.equal(result.upgradePaths?.[0]?.toVersion, VERSION);
    const expectedBaseline = fromVersion.startsWith('3.1') ? v31Baseline : fromVersion.startsWith('3.0') ? v3Baseline : baseline;
    assert.deepEqual(result.compatibility.baseline, expectedBaseline);
    assert.equal(result.compatibility.sourceCommit, expectedBaseline.sourceCommit);
    const ids = new Set(result.changes.map(change => change.id));
    for (const id of reliabilityChanges) assert.ok(ids.has(id), `${fromVersion}: missing ${id}`);
    for (const id of navigation31Changes) assert.equal(ids.has(id), !fromVersion.startsWith('3.1'), `${fromVersion}: intervening 3.1 change ${id}`);
    if (fromVersion.startsWith('3.')) assert.ok(!ids.has('shared-geometry'), `${fromVersion}: v2 geometry is not required`);
    if (fromVersion.startsWith('3.1')) {
      for (const id of ['navigation-hierarchy', 'field-alignment', 'tree-selection']) assert.ok(!ids.has(id), `${fromVersion}: previously adopted ${id}`);
      assert.match(result.upgradePaths![0]!.summary, /reliability/);
      for (const componentId of ['date-picker', 'side-nav']) {
        const scoped = migrationSchema.parse((await client.callTool({ name: 'get_migration_guide', arguments: { fromVersion, componentId } })).structuredContent);
        assert.equal(scoped.fromVersion, fromVersion);
        assert.deepEqual(scoped.compatibility.baseline, v31Baseline);
        assert.deepEqual(scoped.changes, result.changes.filter(change => !change.components.length || change.components.includes(componentId)));
        assert.ok(scoped.changes.some(change => change.id === 'http-deployment-boundary'));
        assert.ok(scoped.changes.some(change => change.id === 'validation-and-token-export-contract'));
        assert.equal(scoped.changes.some(change => change.id === 'input-commit-contract'), componentId === 'date-picker');
        assert.ok(!scoped.changes.some(change => navigation31Changes.includes(change.id)));
      }
    }
  }
  for (const id of ['hierarchical-navigation', 'action-submenus', 'navigation-tree']) {
    const result = await client.callTool({ name: 'get_pattern', arguments: { id } });
    assert.ok(!result.isError, id);
    assert.ok(JSON.stringify(result.content).includes(id), id);
  }
  for (const [name, args] of [['get_behavior', { id: 'missing' }], ['get_migration_guide', { componentId: 'missing' }]] as const) assert.equal((await client.callTool({ name, arguments: args })).isError, true);
  for (const [query, kind, expected] of [['createRangeSlider', 'behavior', 'get_behavior'], ['migration', 'migration', 'get_migration_guide']]) {
    const result = await client.callTool({ name: 'search', arguments: { query, kinds: [kind] } });
    assert.ok(JSON.stringify(result.content).includes(expected!));
  }
  const resources = await client.listResources();
  const migrationResources = new Map<string, string | undefined>([
    ['sekura://migration/v2-to-v3', undefined],
    ['sekura://migration/v3.1', undefined],
    ['sekura://migration/v3.0-to-v3.1', '3.0.0'], // version-check-ignore: resource source version is deliberately historical.
    ['sekura://migration/v3.2', undefined],
    ['sekura://migration/v3.0-to-v3.2', '3.0.0'], // version-check-ignore: resource source version is deliberately historical.
    ['sekura://migration/v3.1-to-v3.2', '3.1.0'], // version-check-ignore: resource source version is deliberately historical.
  ]);
  for (const uri of ['sekura://components', 'sekura://behaviors', ...migrationResources.keys()]) {
    assert.ok(resources.resources.some(resource => resource.uri === uri), `Missing resource ${uri}`);
    const resource = await client.readResource({ uri });
    const content = resource.contents[0]!;
    assert.ok('text' in content);
    const data = JSON.parse(content.text);
    if (uri.endsWith('components')) assert.deepEqual(data.components, components);
    if (uri.endsWith('behaviors')) assert.deepEqual(behaviorSchema.parse(data).api, mcpReference().api);
    if (migrationResources.has(uri)) {
      const source = migrationResources.get(uri);
      assert.deepEqual(migrationSchema.parse(data), source ? sourceGuides.get(source) : full, `Resource ${uri} must match its source-specific tool result`);
    }
  }
  console.log(`MCP coverage: ${components.length} stable specs, ${components.length * FRAMEWORKS.length} recipes, ${mcpReference().api.filter(a => a.exported).length} public APIs, ${MIGRATION_SOURCES.length} source-specific migration paths and ${migrationResources.size} migration resource aliases, filtering/errors/search passed outside checkout cwd.`);
} finally { process.chdir(originalCwd); await client.close(); await server.close(); }
