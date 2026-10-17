import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../server.js';
import { validateMarkup } from '../lib/validate.js';
import { components } from '../data/components/index.js';
import { componentRecipe, recipeSchema, validateIntegration } from '../lib/integration.js';

const oldField = '<div class="sk-field"><label class="sk-field__label" for="test-field">Project</label><input id="test-field" class="sk-input sk-field__control" aria-describedby="test-hint"/><div class="sk-field__support"><p class="sk-field__hint" id="test-hint">An exact key.</p></div></div>';
assert.ok(validateMarkup(oldField).some(f => f.rule === 'field-hint-order'));
const orderedField = '<div class="sk-field"><label class="sk-field__label" for="test-field">Project</label><p class="sk-field__hint" id="test-hint">An exact key.</p><input id="test-field" class="sk-input sk-field__control" aria-describedby="test-hint"/><p class="sk-field__error">Try again.</p></div>';
assert.ok(!validateMarkup(orderedField).some(f => f.rule === 'field-hint-order'));

for (const component of components) recipeSchema.parse(componentRecipe(component, 'html'));
const valid = { componentIds: ['button'], markup: '<button class="sk-button" type="button">Save</button>', stylesheets: ['assets/sekura.css'], initialization: 'auto' as const, handledEvents: ['button:click'] };
assert.equal(validateIntegration(valid).valid, true);
const broken = validateIntegration({ ...valid, markup: '<div class="sk-button" id="a" aria-describedby="gone">Save</div><span id="a"></span>', stylesheets: [], initialization: 'none', handledEvents: [] });
for (const rule of ['wrong-element', 'duplicate-id', 'missing-target', 'missing-stylesheet', 'missing-behavior', 'unhandled-action']) assert.ok(broken.findings.some(f => f.rule === rule), rule);
assert.equal(broken.valid, false);
for (const marker of ['data-sk-palette-open', 'data-sk-slider-value']) {
  const reference = validateIntegration({ ...valid, markup: `<button class="sk-button" type="button" ${marker}="missing">Action</button>` });
  assert.ok(reference.findings.some(f => f.rule === 'missing-target' && f.message.includes(marker)), marker);
}
assert.ok(validateIntegration({ ...valid, componentIds: ['nonexistent'] }).findings.some(f => f.rule === 'unknown-component'));

const navigation = { componentIds: ['side-nav'], markup: '<nav class="sk-side-nav" aria-label="Settings"><a href="#profile">Profile</a></nav><section id="profile">Profile</section>', stylesheets: ['sekura.css'], initialization: 'none' as const };
assert.equal(validateIntegration(navigation).valid, true, 'plain links need no controller');
assert.deepEqual(validateIntegration(navigation).requiredControllers, []);
const branchMarkup = '<nav class="sk-side-nav" aria-label="Primary"><button type="button" class="sk-side-nav__toggle" aria-expanded="false" aria-controls="children">Expand projects</button><ul id="children" hidden><li><a href="#project">Project</a></li></ul></nav><h1 id="project">Project</h1>';
const missingDisclosure = validateIntegration({ ...navigation, markup: branchMarkup });
assert.deepEqual(missingDisclosure.requiredControllers, ['createDisclosure']);
assert.ok(missingDisclosure.findings.some(f => f.rule === 'missing-behavior'));
assert.ok(validateIntegration({ ...navigation, markup: branchMarkup, initialization: 'auto' }).findings.some(f => f.rule === 'missing-marker'));
assert.equal(validateIntegration({ ...navigation, markup: branchMarkup, initialization: 'manual', controllers: ['createDisclosure'] }).valid, true);
const drawerMarkup = navigation.markup.replace('class="sk-side-nav"', 'class="sk-side-nav sk-side-nav--drawer"');
assert.deepEqual(validateIntegration({ ...navigation, markup: drawerMarkup }).requiredControllers, ['createDrawer']);
assert.equal(validateIntegration({ ...navigation, markup: drawerMarkup, initialization: 'manual', controllers: ['createDrawer'] }).valid, true);
const treeMarkup = '<ul class="sk-tree" role="tree" aria-label="Documents" data-sk-tree-navigation><li role="treeitem" data-value="one" aria-current="page" tabindex="0">One</li><li role="treeitem" data-value="two" tabindex="-1">Two</li></ul>';
const treeInput = { componentIds: ['tree-view'], markup: treeMarkup, stylesheets: ['sekura.css'], initialization: 'auto' as const, handledEvents: ['tree-view:sk:tree:activate'] };
assert.equal(validateIntegration(treeInput).valid, true);
assert.ok(!validateIntegration(treeInput).findings.some(f => f.rule === 'unhandled-action' && f.message.includes('sk:tree:select')), 'navigation-only trees do not emit legacy selection outcomes');
assert.ok(validateIntegration({ ...treeInput, markup: treeMarkup + treeMarkup.replace('data-sk-tree-navigation', '') }).findings.some(f => f.rule === 'unhandled-action' && f.message.includes('sk:tree:select')), 'mixed selection/navigation markup still declares selection outcomes');
assert.ok(validateIntegration({ ...treeInput, markup: treeMarkup.replace('data-value="two"', 'data-value="one"') }).findings.some(f => f.rule === 'duplicate-tree-id'));
assert.ok(!validateIntegration({ ...treeInput, markup: treeMarkup.replace('data-value="two"', 'data-value=" one "') }).findings.some(f => f.rule === 'duplicate-tree-id'), 'IDs preserve their exact application values');
assert.ok(validateIntegration({ ...treeInput, markup: treeMarkup.replace('data-value="two"', '') }).findings.some(f => f.rule === 'missing-tree-id'));
assert.ok(validateIntegration({ ...treeInput, markup: treeMarkup.replace('role="tree"', 'role="tree" aria-multiselectable="true"') }).findings.some(f => f.rule === 'tree-mode-conflict'));
assert.ok(validateIntegration({ ...treeInput, handledEvents: [] }).findings.some(f => f.rule === 'unhandled-tree-navigation'));
assert.ok(validateIntegration({ ...treeInput, markup: treeMarkup.replace('data-sk-tree-navigation', 'data-sk-tree-navigation="false"'), handledEvents: [] }).findings.some(f => f.rule === 'unhandled-tree-navigation'), 'declarative navigation is enabled by marker presence, matching the controller');
const independentNestedTree = treeMarkup.replace('>One</li>', '>One<ul class="sk-tree" role="tree" aria-label="Related" data-sk-tree-navigation><li role="treeitem" data-value="one" tabindex="0">Related one</li></ul></li>');
assert.ok(!validateIntegration({ ...treeInput, markup: independentNestedTree }).findings.some(f => f.rule === 'duplicate-tree-id'), 'stable IDs are unique within their owning tree');
assert.ok(!validateIntegration({ ...treeInput, markup: treeMarkup.replace('data-sk-tree-navigation', ''), handledEvents: [] }).findings.some(f => f.rule === 'unhandled-tree-navigation'));
const menuMarkup = '<button type="button" data-sk-menu-trigger="actions">Actions</button><div class="sk-menu" id="actions" role="menu"><button type="button" role="menuitem" data-sk-submenu aria-haspopup="menu" aria-controls="export">Export</button><div class="sk-menu" id="export" role="menu" hidden><button type="button" role="menuitem">PDF</button></div></div>';
const menuInput = { componentIds: ['menu'], markup: menuMarkup, stylesheets: ['sekura.css'], initialization: 'auto' as const, handledEvents: ['menu:sk:menu:select'] };
assert.ok(!validateIntegration(menuInput).findings.some(f => f.rule === 'missing-marker'), 'owned submenu needs no independent root trigger');
assert.ok(validateIntegration({ ...menuInput, markup: menuMarkup + '<div class="sk-menu" id="unwired" role="menu"></div>' }).findings.some(f => f.rule === 'missing-marker'), 'every independent root menu needs a trigger');
for (const id of ['side-nav', 'menu', 'tree-view']) {
  const component = components.find(c => c.id === id)!;
  assert.deepEqual(componentRecipe(component, 'html').implementation.runtime, component.implementation!.runtime, 'parsed runtime metadata must survive');
}
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
  console.log(`Integration contracts: all ${components.length} recipes, actionable failures and MCP structured/error responses passed`);
} finally { await client.close(); await server.close(); }
