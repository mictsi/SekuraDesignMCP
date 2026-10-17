import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import { z } from 'zod';
import { components, getComponent } from '../data/components/index.js';
import { type ComponentSpec } from '../data/components/types.js';
import { FRAMEWORKS, generateCode, type Framework } from './codegen.js';
import { validateMarkup, type Finding } from './validate.js';
import { VERSION } from './version.js';
import { runtimeContractSchema } from './runtime-contract.js';

const eventSchema = z.object({ name: z.string(), detail: z.record(z.string(), z.string()), source: z.enum(['native', 'controller']), applicationRequired: z.boolean() });
export const implementationSchema = z.object({
  runtime: runtimeContractSchema,
  rootClass: z.string(), cssDependencies: z.array(z.string()), svgSymbols: z.array(z.string()),
  controller: z.string().nullable(), behavior: z.enum(['native', 'controller', 'application']),
  frameworkOutput: z.literal('reference-recipe'), applicationResponsibilities: z.array(z.string()),
  events: z.array(eventSchema), autoMarker: z.string().nullable(), nativeReactExport: z.string().nullable(),
});
export const recipeSchema = z.object({
  schemaVersion: z.literal(1), version: z.string(), componentId: z.string(),
  framework: z.enum(FRAMEWORKS), code: z.string(), implementation: implementationSchema,
  requiredStylesheets: z.array(z.string()), initialization: z.string(),
});
export const integrationInput = z.object({
  componentIds: z.array(z.string()).min(1).max(components.length), markup: z.string().max(200000),
  stylesheets: z.array(z.string()), svgSymbols: z.array(z.string()).default([]),
  initialization: z.enum(['none', 'auto', 'manual', 'framework']),
  controllers: z.array(z.string()).default([]),
  handledEvents: z.array(z.string()).default([]).describe('Application handlers in componentId:event format, e.g. button:click. This declares wiring; runtime behavior still needs testing.'),
  externalIds: z.array(z.string()).default([]),
});
export const integrationResultSchema = z.object({
  schemaVersion: z.literal(1), version: z.string(), valid: z.boolean(),
  requiredStylesheets: z.array(z.string()), requiredControllers: z.array(z.string()),
  findings: z.array(z.object({ severity: z.enum(['error', 'warning', 'info']), rule: z.string(), message: z.string(), fix: z.string(), snippet: z.string().optional() })),
  limitation: z.string(),
});

/** Dependencies may share selectors; a visited set makes their graph finite. */
export function requiredStyles(componentIds: string[]): string[] {
  const visited = new Set<string>();
  function visit(id: string): void {
    if (visited.has(id)) return;
    const spec = getComponent(id); if (!spec) return;
    visited.add(id); for (const dep of spec.implementation!.cssDependencies) visit(dep);
  }
  componentIds.forEach(visit);
  return ['tokens.css', 'base.css', ...components.filter(c => visited.has(c.id)).map(c => `components/${c.id}.css`)];
}
export function componentRecipe(spec: ComponentSpec, framework: Framework) {
  return recipeSchema.parse({ schemaVersion: 1, version: VERSION, componentId: spec.id, framework,
    code: generateCode(spec, framework), implementation: spec.implementation,
    requiredStylesheets: requiredStyles([spec.id]),
    initialization: framework === 'html' ? 'Load the behavior bundle and call enhance(root) or autoEnhance(root). Attach application handlers separately.'
      : framework === 'css' ? 'CSS has no runtime behavior.'
      : 'The recipe owns controller lifecycle. Attach application state and outcomes through its exposed API; do not enhance the same elements twice.',
  });
}

export function validateIntegration(input: z.input<typeof integrationInput>) {
  const args = integrationInput.parse(input);
  const findings: Finding[] = [];
  const issue = (rule: string, message: string, fix: string, severity: Finding['severity'] = 'error'): void => { findings.push({ severity, rule, message, fix }); };
  type Element = DefaultTreeAdapterMap['element'];
  const nodes: Element[] = [];
  function visit(node: DefaultTreeAdapterMap['node']): void {
    if ('tagName' in node) nodes.push(node);
    if ('childNodes' in node) node.childNodes.forEach(visit);
  }
  visit(parseFragment(args.markup));
  const attr = (node: Element, name: string) => node.attrs.find(a => a.name === name)?.value;
  const hasClass = (node: Element, name: string) => attr(node, 'class')?.split(/\s+/).includes(name) ?? false;
  const within = (node: Element, roots: Element[]): boolean => {
    let current: DefaultTreeAdapterMap['node'] | undefined | null = node;
    while (current) {
      if ('tagName' in current && roots.includes(current)) return true;
      current = 'parentNode' in current ? current.parentNode : null;
    }
    return false;
  };
  const nearestTree = (node: Element): Element | undefined => {
    let current = node.parentNode;
    while (current) {
      if ('tagName' in current && attr(current, 'role') === 'tree') return current;
      current = 'parentNode' in current ? current.parentNode : null;
    }
    return undefined;
  };
  const ids = new Set(args.externalIds);
  for (const node of nodes) {
    const id = attr(node, 'id'); if (!id) continue;
    if (ids.has(id)) issue('duplicate-id', `Duplicate ID: ${id}.`, 'Assign unique IDs per instance and update every reference.');
    ids.add(id);
  }
  const references = ['for', 'aria-controls', 'aria-labelledby', 'aria-describedby', 'aria-activedescendant', 'data-sk-disclosure', 'data-sk-menu-trigger', 'data-sk-combobox', 'data-sk-popover-trigger', 'data-sk-dialog-open', 'data-sk-drawer-open', 'data-sk-tooltip-target', 'data-sk-palette-open', 'data-sk-slider-value'];
  for (const node of nodes) {
    for (const name of references) for (const id of (attr(node, name) ?? '').split(/\s+/).filter(Boolean)) {
      if (!ids.has(id.replace(/^#/, ''))) issue('missing-target', `${name} points to missing target ${id}.`, 'Include the target in markup or declare its ID in externalIds.');
    }
    const symbol = attr(node, 'href');
    if (node.tagName === 'use' && symbol?.startsWith('#') && !ids.has(symbol.slice(1)) && !args.svgSymbols.includes(symbol.slice(1))) issue('missing-icon', `Missing SVG symbol ${symbol}.`, 'Include the symbol in the sprite or replace the icon.');
  }
  const styles = requiredStyles(args.componentIds);
  const loaded = new Set(args.stylesheets.map(path => path.replace(/[?#].*$/, '')));
  const hasStyle = (file: string) => [...loaded].some(path => path === file || path.endsWith('/' + file));
  if (!hasStyle('sekura.css')) for (const file of styles) if (!hasStyle(file)) issue('missing-stylesheet', `Missing ${file}.`, 'Load the full sekura.css bundle or every required stylesheet.');
  const controllers = new Set<string>();
  const native: Record<string, string[]> = { button: ['button'], link: ['a'], 'text-field': ['input'], textarea: ['textarea'], select: ['select'] };
  for (const id of args.componentIds) {
    const spec = getComponent(id);
    if (!spec) { issue('unknown-component', `Unknown component: ${id}.`, 'Use list_components to choose a supported ID.'); continue; }
    const impl = spec.implementation!;
    const roots = nodes.filter(n => attr(n, 'class')?.split(/\s+/).includes(impl.rootClass));
    if (!roots.length) issue('missing-root', `${id} requires .${impl.rootClass}.`, 'Use its reference markup and actual root class.');
    if (native[id] && roots.some(n => !native[id]!.includes(n.tagName))) issue('wrong-element', `${id} uses an incompatible native element.`, `Use ${native[id]!.join(' or ')} for .${impl.rootClass}.`);
    if (impl.runtime.requirements) {
      for (const requirement of impl.runtime.requirements) {
        const matched = nodes.filter(node => within(node, roots)
          && (!requirement.when.className || hasClass(node, requirement.when.className))
          && (!requirement.when.attribute || (requirement.when.value === undefined
            ? attr(node, requirement.when.attribute) !== undefined
            : attr(node, requirement.when.attribute) === requirement.when.value)));
        if (!matched.length) continue;
        controllers.add(requirement.controller);
        if (args.initialization === 'none') issue('missing-behavior', `${id} needs ${requirement.controller} for the supplied markup.`, requirement.description);
        if (args.initialization === 'manual' && !args.controllers.includes(requirement.controller)) issue('missing-controller', `${requirement.controller} was not declared.`, requirement.description);
        if (args.initialization === 'auto') {
          if (requirement.manualOnly) issue('manual-controller-required', `${id} opts out of automatic enhancement.`, `Initialize ${requirement.controller} once and declare manual initialization.`);
          else if (requirement.autoMarker && matched.some(node => attr(node, requirement.autoMarker!) === undefined)) issue('missing-marker', `${id} needs ${requirement.autoMarker} on each matching control for automatic enhancement.`, requirement.description);
          else if (requirement.controller === 'createMenu') {
            const rootMenus = matched.filter(menu => !nodes.some(node => attr(node, 'data-sk-submenu') !== undefined && attr(node, 'aria-controls') === attr(menu, 'id')));
            if (rootMenus.some(menu => !nodes.some(node => attr(node, 'data-sk-menu-trigger') !== undefined && attr(node, 'data-sk-submenu') === undefined && attr(menu, 'id') === attr(node, 'data-sk-menu-trigger')?.replace(/^#/, '')))) issue('missing-marker', `${id} needs a root data-sk-menu-trigger referencing each root menu.`, 'Keep submenu items marked data-sk-submenu and initialize only the root trigger.');
          }
        }
      }
    } else if (impl.controller) {
      controllers.add(impl.controller);
      // A switch is natively operable; async persistence is an explicit controller choice.
      if (args.initialization === 'none' && id !== 'switch') issue('missing-behavior', `${id} needs ${impl.controller}.`, 'Initialize the controller or use a lifecycle-aware framework component.');
      if (args.initialization === 'manual' && !args.controllers.includes(impl.controller)) issue('missing-controller', `${impl.controller} was not declared.`, 'Attach the controller to its required native element and declare it.');
      if (args.initialization === 'auto' && impl.autoMarker && !nodes.some(n => attr(n, impl.autoMarker!) !== undefined)) issue('missing-marker', `${id} needs ${impl.autoMarker} for automatic enhancement.`, 'Preserve the reference initialization marker.');
    }
    if (id === 'tree-view') for (const root of roots.filter(root => attr(root, 'data-sk-tree-navigation') !== undefined)) {
      if (!args.handledEvents.includes('tree-view:sk:tree:activate')) issue('unhandled-tree-navigation', 'Navigation tree activation has no declared application outcome.', 'Wire onActivate or sk:tree:activate to navigation and declare tree-view:sk:tree:activate in handledEvents. Set current only after success.', 'warning');
      if (hasClass(root, 'sk-tree--multi') || attr(root, 'aria-multiselectable') === 'true') issue('tree-mode-conflict', 'Navigation mode cannot also be a checkbox selection tree.', 'Use separate navigation and multi-select trees.');
      const values = new Set<string>();
      const items = nodes.filter(node => attr(node, 'role') === 'treeitem' && nearestTree(node) === root);
      for (const item of items) {
        const value = attr(item, 'data-value');
        if (!value?.trim()) issue('missing-tree-id', 'Navigation tree items require stable data-value IDs.', 'Assign a nonempty ID independent of the displayed label.');
        else if (values.has(value)) issue('duplicate-tree-id', `Duplicate navigation tree ID: ${value}.`, 'Use unique data-value IDs within this tree.');
        else values.add(value);
      }
      if (items.filter(item => attr(item, 'aria-current') === 'page').length > 1) issue('multiple-current-tree-items', 'A navigation tree has more than one current page.', 'Set aria-current="page" only on the active destination.');
    }
    for (const event of impl.events.filter(event => event.applicationRequired)) {
      if (id === 'tree-view' && event.name === 'sk:tree:select' && roots.length > 0 && roots.every(root => attr(root, 'data-sk-tree-navigation') !== undefined)) continue;
      if (!args.handledEvents.includes(`${id}:${event.name}`)) issue('unhandled-action', `${id}:${event.name} has no declared application handler.`, 'Wire an outcome, or explicitly document why local/native state is sufficient.', 'warning');
    }
  }
  findings.push(...validateMarkup(args.markup));
  return integrationResultSchema.parse({ schemaVersion: 1, version: VERSION, valid: !findings.some(f => f.severity === 'error'), requiredStylesheets: styles, requiredControllers: [...controllers], findings,
    limitation: 'Static integration checks cannot verify declared callbacks, request outcomes, focus timing or assistive-technology behavior. Compile, mount and exercise the application.',
  });
}
