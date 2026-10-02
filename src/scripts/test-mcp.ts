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

const migration = readFileSync('MIGRATION.md', 'utf8');
const baseline = JSON.parse(readFileSync('compatibility/v2-contract.json', 'utf8'));
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
  for (const [name, args] of [['get_behavior', { id: 'missing' }], ['get_migration_guide', { componentId: 'missing' }]] as const) assert.equal((await client.callTool({ name, arguments: args })).isError, true);
  for (const [query, kind, expected] of [['createRangeSlider', 'behavior', 'get_behavior'], ['migration', 'migration', 'get_migration_guide']]) {
    const result = await client.callTool({ name: 'search', arguments: { query, kinds: [kind] } });
    assert.ok(JSON.stringify(result.content).includes(expected!));
  }
  const resources = await client.listResources();
  for (const uri of ['sekura://components', 'sekura://behaviors', 'sekura://migration/v2-to-v3']) {
    assert.ok(resources.resources.some(r => r.uri === uri));
    const resource = await client.readResource({ uri });
    const content = resource.contents[0]!;
    assert.ok('text' in content);
    const data = JSON.parse(content.text);
    if (uri.endsWith('components')) assert.deepEqual(data.components, components);
    if (uri.endsWith('behaviors')) assert.deepEqual(behaviorSchema.parse(data).api, mcpReference().api);
    if (uri.endsWith('v2-to-v3')) assert.deepEqual(migrationSchema.parse(data), full);
  }
  console.log(`MCP coverage: ${components.length} stable specs, ${components.length * FRAMEWORKS.length} recipes, ${mcpReference().api.filter(a => a.exported).length} public APIs, migration/filter/errors/search/resources passed outside checkout cwd.`);
} finally { process.chdir(originalCwd); await client.close(); await server.close(); }
