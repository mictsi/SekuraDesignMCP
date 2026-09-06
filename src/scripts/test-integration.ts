import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../server.js';
import { components } from '../data/components/index.js';
import { componentRecipe, recipeSchema, validateIntegration } from '../lib/integration.js';

for (const component of components) recipeSchema.parse(componentRecipe(component, 'html'));
const valid = { componentIds: ['button'], markup: '<button class="sk-button" type="button">Save</button>', stylesheets: ['assets/sekura.css'], initialization: 'auto' as const, handledEvents: ['button:click'] };
assert.equal(validateIntegration(valid).valid, true);
const broken = validateIntegration({ ...valid, markup: '<div class="sk-button" id="a" aria-describedby="gone">Save</div><span id="a"></span>', stylesheets: [], initialization: 'none', handledEvents: [] });
for (const rule of ['wrong-element', 'duplicate-id', 'missing-target', 'missing-stylesheet', 'missing-behavior', 'unhandled-action']) assert.ok(broken.findings.some(f => f.rule === rule), rule);
assert.equal(broken.valid, false);
assert.ok(validateIntegration({ ...valid, componentIds: ['nonexistent'] }).findings.some(f => f.rule === 'unknown-component'));
const [a, b] = InMemoryTransport.createLinkedPair();
const server = createServer(); const client = new Client({ name: 'integration-test', version: '1' });
try {
  await Promise.all([server.connect(a), client.connect(b)]);
  const tools = await client.listTools();
  for (const name of ['get_component_code', 'validate_integration']) assert.ok(tools.tools.find(t => t.name === name)?.outputSchema);
  const recipe = await client.callTool({ name: 'get_component_code', arguments: { id: 'combobox', framework: 'html' } });
  const parsed = recipeSchema.parse(recipe.structuredContent);
  assert.ok(parsed.implementation.events.some(e => e.name === 'sk:combobox:select'));
  assert.ok(parsed.requiredStylesheets.includes('components/combobox.css'));
  const result = await client.callTool({ name: 'validate_integration', arguments: valid });
  assert.equal((result.structuredContent as { valid: boolean }).valid, true);
  const missing = await client.callTool({ name: 'get_component_code', arguments: { id: 'no-such-component', framework: 'html' } });
  assert.equal(missing.isError, true);
  console.log('Integration contracts: all 67 recipes, actionable failures and MCP structured/error responses passed');
} finally { await client.close(); await server.close(); }
