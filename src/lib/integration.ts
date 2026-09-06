import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import { z } from 'zod';
import { components, getComponent } from '../data/components/index.js';
import { type ComponentSpec } from '../data/components/types.js';
import { FRAMEWORKS, generateCode, type Framework } from './codegen.js';
import { validateMarkup, type Finding } from './validate.js';
import { VERSION } from './version.js';

const eventSchema = z.object({ name: z.string(), detail: z.record(z.string(), z.string()), source: z.enum(['native', 'controller']), applicationRequired: z.boolean() });
export const implementationSchema = z.object({
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
  const ids = new Set(args.externalIds);
  for (const node of nodes) {
    const id = attr(node, 'id'); if (!id) continue;
    if (ids.has(id)) issue('duplicate-id', `Duplicate ID: ${id}.`, 'Assign unique IDs per instance and update every reference.');
    ids.add(id);
  }
  const references = ['for', 'aria-controls', 'aria-labelledby', 'aria-describedby', 'aria-activedescendant', 'data-sk-disclosure', 'data-sk-menu-trigger', 'data-sk-combobox', 'data-sk-popover-trigger', 'data-sk-dialog-open', 'data-sk-drawer-open', 'data-sk-tooltip-target'];
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
    if (impl.controller) {
      controllers.add(impl.controller);
      // A switch is natively operable; async persistence is an explicit controller choice.
      if (args.initialization === 'none' && id !== 'switch') issue('missing-behavior', `${id} needs ${impl.controller}.`, 'Initialize the controller or use a lifecycle-aware framework component.');
      if (args.initialization === 'manual' && !args.controllers.includes(impl.controller)) issue('missing-controller', `${impl.controller} was not declared.`, 'Attach the controller to its required native element and declare it.');
      if (args.initialization === 'auto' && impl.autoMarker && !nodes.some(n => attr(n, impl.autoMarker!) !== undefined)) issue('missing-marker', `${id} needs ${impl.autoMarker} for automatic enhancement.`, 'Preserve the reference initialization marker.');
    }
    for (const event of impl.events.filter(event => event.applicationRequired)) {
      if (!args.handledEvents.includes(`${id}:${event.name}`)) issue('unhandled-action', `${id}:${event.name} has no declared application handler.`, 'Wire an outcome, or explicitly document why local/native state is sufficient.', 'warning');
    }
  }
  findings.push(...validateMarkup(args.markup));
  return integrationResultSchema.parse({ schemaVersion: 1, version: VERSION, valid: !findings.some(f => f.severity === 'error'), requiredStylesheets: styles, requiredControllers: [...controllers], findings,
    limitation: 'Static integration checks cannot verify declared callbacks, request outcomes, focus timing or assistive-technology behavior. Compile, mount and exercise the application.',
  });
}
