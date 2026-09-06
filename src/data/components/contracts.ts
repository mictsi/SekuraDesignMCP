import { parseFragment, serialize, type DefaultTreeAdapterMap } from 'parse5';
import type { ComponentSpec } from './types.js';
import { VERSION } from '../../lib/version.js';
import { componentEvents, componentMarkers, type EventContract } from './events.js';

export const rootClasses: Record<string, string> = {
  'segmented-control': 'sk-segmented', 'form-field': 'sk-field', 'text-field': 'sk-input',
  'search-field': 'sk-search', 'file-upload': 'sk-upload', 'number-input': 'sk-number',
  'date-range-picker': 'sk-date-range', 'status-indicator': 'sk-status',
  'loading-screen': 'sk-loading', 'stat-tile': 'sk-stat', 'description-list': 'sk-dl', 'tree-view': 'sk-tree',
};
export function rootClass(spec: ComponentSpec): string { return rootClasses[spec.id] ?? `sk-${spec.id}`; }

export const controllers: Record<string, string> = {
  button: 'guardAction', 'icon-button': 'guardAction', 'split-button': 'createMenu',
  'tree-view': 'createTree', 'file-upload': 'createUpload',
  menu: 'createMenu', combobox: 'createCombobox', tabs: 'createTabs',
  disclosure: 'createDisclosure', accordion: 'createAccordion',
  'date-picker': 'createDatePicker', 'date-range-picker': 'createDateRange',
  'number-input': 'createNumberInput', 'tag-input': 'createTagInput', toolbar: 'createToolbar',
  'segmented-control': 'createSegmented', 'button-group': 'createSegmented',
  dialog: 'createDialog', drawer: 'createDrawer', popover: 'createPopover', tooltip: 'createTooltip',
  table: 'createSelection', switch: 'createAsyncSwitch', slider: 'createSlider',
};

export interface ImplementationSpec {
  rootClass: string;
  cssDependencies: string[];
  svgSymbols: string[];
  controller: string | null;
  behavior: 'controller' | 'native' | 'application';
  frameworkOutput: 'reference-recipe';
  applicationResponsibilities: string[];
  events: EventContract[];
  autoMarker: string | null;
  nativeReactExport: string | null;
}

/** Canonical markup carries the same markers that the distributable recognizes. */
export function referenceMarkup(spec: ComponentSpec): string {
  const fragment = parseFragment(spec.html);
  const openers: string[] = [];
  let surfaceCount = 0;
  const visit = (node: DefaultTreeAdapterMap['node']): void => {
    if ('tagName' in node) {
      const attr = (name: string): string | undefined => node.attrs.find(a => a.name === name)?.value;
      const set = (name: string, value = ''): void => { if (attr(name) === undefined) node.attrs.push({ name, value }); };
      const cls = attr('class')?.split(/\s+/) ?? [];
      if (cls.includes('sk-disclosure__trigger')) set('data-sk-disclosure', attr('aria-controls'));
      if (attr('role') === 'tablist') set('data-sk-tabs');
      if (attr('role') === 'radiogroup' && (cls.includes('sk-segmented') || cls.includes('sk-button-group--segmented'))) set('data-sk-segmented');
      if (attr('aria-haspopup') === 'menu' && attr('aria-controls')) set('data-sk-menu-trigger', attr('aria-controls'));
      if (node.tagName === 'input' && attr('role') === 'combobox' && attr('aria-controls') && !attr('data-sk-tag-input')) set('data-sk-combobox', attr('aria-controls'));
      if (node.tagName === 'dialog') {
        set('data-sk-dialog'); set('id', `${spec.id}-surface-${++surfaceCount}`);
        if (spec.id === 'dialog') openers.push(`<button type="button" class="sk-button sk-button--secondary" data-sk-dialog-open="${attr('id')}">Review project deletion</button>`);
      }
      if (spec.id === 'dialog' && node.tagName === 'input') set('data-sk-confirm-phrase', 'Website redesign');
      if (spec.id === 'dialog' && attr('value') === 'confirm') set('data-sk-confirm-button');
      if (cls.includes('sk-drawer')) { set('id', `${spec.id}-surface-${++surfaceCount}`); if (spec.id === 'drawer') openers.push(`<button type="button" class="sk-button sk-button--secondary" data-sk-drawer-open="${attr('id')}">Open ${cls.includes('sk-drawer--modal') ? 'filters' : 'details'}</button>`); set('data-sk-drawer'); set('data-sk-modal', cls.includes('sk-drawer--modal') ? 'true' : 'false'); }
      if (attr('popovertarget')) {
        set('data-sk-popover-trigger', attr('popovertarget')); set('aria-controls', attr('popovertarget'));
        node.attrs = node.attrs.filter(a => a.name !== 'popovertarget');
      }
      if (cls.includes('sk-popover')) { node.attrs = node.attrs.filter(a => a.name !== 'popover'); set('hidden'); }
      if (attr('aria-describedby') && spec.id === 'tooltip' && node.tagName === 'button') set('data-sk-tooltip-target', attr('aria-describedby'));
    }
    if ('childNodes' in node) node.childNodes.forEach(visit);
  };
  fragment.childNodes.forEach(visit);
  return openers.join('\n') + '\n' + serialize(fragment);
}

export function implementation(spec: ComponentSpec, catalogue: ComponentSpec[]): ImplementationSpec {
  const used = new Set([...spec.html.matchAll(/class="([^"]+)"/g)].flatMap(m => m[1]!.split(/\s+/)));
  const dependencies = catalogue.filter(c => c.id !== spec.id && [...c.css.matchAll(/\.(sk-[\w-]+)/g)].some(m => used.has(m[1]!))).map(c => c.id);
  return {
    rootClass: rootClass(spec), cssDependencies: dependencies,
    svgSymbols: [...new Set([...spec.html.matchAll(/href="#(sk-[^"]+)"/g)].map(match => match[1]!))],
    controller: controllers[spec.id] ?? null,
    behavior: controllers[spec.id] ? 'controller' : ['text-field', 'textarea', 'select', 'checkbox', 'radio-group', 'link'].includes(spec.id) ? 'native' : 'application',
    frameworkOutput: 'reference-recipe',
    nativeReactExport: ({ button: 'Button', 'text-field': 'TextField', textarea: 'Textarea', select: 'Select', checkbox: 'Checkbox', switch: 'Switch' } as Record<string, string>)[spec.id] ?? null,
    events: componentEvents[spec.id] ?? [], autoMarker: componentMarkers[spec.id] ?? null,
    applicationResponsibilities: ['Provide real content and application state.', 'Handle persistence, permissions, network errors and navigation.', 'Include the listed SVG symbols in your icon sprite, or replace them with equivalent accessible icons.',
      ...(spec.id === 'switch' ? ['Pass an onToggle callback to createAsyncSwitch for persisted switches.'] : []),
      ...(['tree-view', 'file-upload', 'pagination'].includes(spec.id) ? ['See the worked examples; backend data and transport remain application-owned.'] : [])],
  };
}

export function componentManifest(catalogue: ComponentSpec[]) {
  return { schemaVersion: 1, version: VERSION, base: ['tokens.css', 'base.css'],
    dependencyRule: 'Load listed component CSS dependencies recursively, once each, or use sekura.css.',
    components: catalogue.map(c => ({ id: c.id, cssFile: `components/${c.id}.css`, ...c.implementation })),
  };
}
