/** Public events are shared by documentation, recipes and integration validation. */
export interface EventContract {
  name: string;
  detail: Record<string, string>;
  source: 'native' | 'controller';
  applicationRequired: boolean;
}
const event = (name: string, detail: Record<string, string> = {}, applicationRequired = false): EventContract => ({ name, detail, source: name.startsWith('sk:') ? 'controller' : 'native', applicationRequired });
const change = (name: string, key = 'value', type = 'string') => event(name, { [key]: type }, true);
export const componentEvents: Record<string, EventContract[]> = {
  button: [event('click', {}, true)], 'icon-button': [event('click', {}, true)],
  'split-button': [event('click', {}, true), change('sk:menu:select', 'value', 'string | null')],
  menu: [event('sk:menu:beforeopen'), event('sk:menu:open'), event('sk:menu:close'), change('sk:menu:select', 'value', 'string | null')],
  combobox: [event('sk:combobox:open'), event('sk:combobox:close'), change('sk:combobox:select'), event('sk:combobox:clear', {}, true)],
  tabs: [event('sk:tabs:select', { id: 'string' })],
  'segmented-control': [change('sk:segmented:change')], 'button-group': [change('sk:segmented:change')],
  slider: [change('sk:slider:change', 'value', 'number')],
  'number-input': [change('sk:number:change', 'value', 'number | null')],
  'tag-input': [change('sk:taginput:change', 'tags', 'string[]')],
  'tree-view': [event('sk:tree:select', { item: 'HTMLElement (DOM only)', value: 'string | undefined' }, true)],
  'file-upload': [change('sk:upload:change', 'files', 'File[] (DOM only)')],
  table: [change('sk:selection:change', 'count', 'number')],
  disclosure: [event('sk:disclosure:open'), event('sk:disclosure:close')],
  accordion: [event('sk:disclosure:open'), event('sk:disclosure:close')],
  dialog: [event('sk:dialog:open'), event('sk:dialog:close', { returnValue: 'string | undefined' })],
  drawer: [event('sk:drawer:open', { modal: 'boolean' }), event('sk:drawer:close')],
  popover: [event('sk:popover:open'), event('sk:popover:close')],
  'date-picker': [event('sk:datepicker:open'), event('sk:datepicker:close'), event('change', {}, true)],
  'date-range-picker': [event('change', {}, true)],
  'text-field': [event('input', {}, true)], textarea: [event('input', {}, true)],
  select: [event('change', {}, true)], checkbox: [event('change', {}, true)],
  'radio-group': [event('change', {}, true)], switch: [event('change', {}, true)],
};

/** Required marker for automatic enhancement, where CSS alone is insufficient. */
export const componentMarkers: Record<string, string> = {
  menu: 'data-sk-menu-trigger', 'split-button': 'data-sk-menu-trigger', combobox: 'data-sk-combobox',
  tabs: 'data-sk-tabs', 'segmented-control': 'data-sk-segmented',
  accordion: 'data-sk-accordion', disclosure: 'data-sk-disclosure',
  'date-picker': 'data-sk-datepicker', 'date-range-picker': 'data-sk-daterange',
  'number-input': 'data-sk-number', 'tag-input': 'data-sk-tag-input', toolbar: 'data-sk-toolbar',
  dialog: 'data-sk-dialog', drawer: 'data-sk-drawer', popover: 'data-sk-popover-trigger',
};
