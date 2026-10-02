/** Additional runtime contracts shared by MCP, recipes and the static manifest. */
export interface RuntimeContract {
  controllers: string[];
  autoSelectors: string[];
  manualOnly: string[];
  notes: string[];
}
const entry = (controllers: string[], autoSelectors: string[], notes: string[] = [], manualOnly: string[] = []): RuntimeContract => ({ controllers, autoSelectors, notes, manualOnly });
export const runtimeContracts: Record<string, RuntimeContract> = {
  button: entry(['guardAction'], ['.sk-button']),
  'icon-button': entry(['guardAction'], ['.sk-icon-button']),
  'split-button': entry(['guardAction', 'createMenu'], ['.sk-button', '[data-sk-menu-trigger]']),
  menu: entry(['createMenu'], ['[data-sk-menu-trigger]']),
  combobox: entry(['createCombobox'], ['[data-sk-combobox]'], [
    'loadOptions(query, signal) returns ComboboxItem[]. Superseded requests are aborted; late results are ignored. onSearch remains the legacy DOM callback.',
    'multiple, allowCustom and values opt into tokens and custom values. onChange and sk:combobox:change expose selected IDs.',
    'Single inputs keep the selected value by default. displayLabel is opt-in; do not read labels as IDs.',
    'The controller owns its popup wrapper, token buttons and status message. Omit data-sk-combobox when initializing manually.',
  ]),
  'command-palette': entry(['createCommandPalette'], ['[data-sk-command-palette]'], [
    'sources receive query and AbortSignal and return CommandItem[]. The controller handles cancellation, modal focus, groups, errors and session recents.',
    'The host executes commands in onSelect or sk:command-palette:select. Prefix scoping and permission filtering belong to the provider.',
    'data-sk-palette-open targets the palette ID. Automatic initialization enables no global shortcut unless data-sk-palette-shortcut is set; manual default is Mod+K.',
  ]),
  'tree-view': entry(['createTree'], ['.sk-tree[role=tree]:not([data-sk-custom-tree])'], [
    'multiSelect or .sk-tree--multi enables aria-checked with tri-state parents. Disabled descendants are excluded from toggling.',
    'loadChildren(item, signal) returns rendered HTMLElement treeitems for data-sk-loadable parents. Collapse/unmount aborts pending work. Expand again to retry.',
    'Set data-sk-custom-tree when supplying a provider manually. refresh() reconciles dynamic children and roving focus.',
  ]),
  slider: entry(['createSlider', 'createRangeSlider'], ['.sk-slider__input', '.sk-slider--range:not([data-sk-custom-slider])'], [
    'Range roots contain exactly two separately named native range inputs. Bounds cannot cross.',
    'Link exact number inputs through data-sk-slider-value="range-id". Set data-sk-custom-slider on manually initialized slider roots.',
    'createSlider emits sk:slider:change. createRangeSlider also emits sk:slider:range-change with the pair. Native form reset restores defaults.',
  ]),
  'file-upload': entry(['createUpload'], ['.sk-upload:not([data-sk-custom-upload])'], [
    'Without upload(file, signal, progress), the controller selects files only. maxBytes defaults to 10 MiB; data-sk-max-bytes is the declarative equivalent.',
    'Supply transport with data-sk-custom-upload and createUpload. Failed files can retry; removal and replacement abort their transport. Late callbacks cannot update settled or destroyed attempts.',
    'The application owns server validation and persistence. A successful local selection is not an upload.',
  ]),
  tabs: entry(['createTabs'], ['[data-sk-tabs]']),
  'segmented-control': entry(['createSegmented'], ['[data-sk-segmented]:not([data-sk-theme-control])']),
  'button-group': entry(['createSegmented'], ['[data-sk-segmented]:not([data-sk-theme-control])'], ['Only segmented/radiogroup variants need this controller. Ordinary button groups use native buttons.']),
  disclosure: entry(['createDisclosure'], ['[data-sk-disclosure]']),
  accordion: entry(['createAccordion'], ['[data-sk-accordion]']),
  'number-input': entry(['createNumberInput'], ['[data-sk-number]']),
  'tag-input': entry(['createTagInput'], ['[data-sk-tag-input]']),
  toolbar: entry(['createToolbar'], ['[data-sk-toolbar]']),
  'date-picker': entry(['createDatePicker', 'createCalendar'], ['[data-sk-datepicker]'], ['Standalone calendars require explicit initialization.'], ['createCalendar']),
  'date-range-picker': entry(['createDateRange'], ['[data-sk-daterange]']),
  dialog: entry(['createDialog'], ['[data-sk-dialog]']),
  drawer: entry(['createDrawer'], ['[data-sk-drawer]'], ['Modal drawers make the background inert; docked drawers preserve normal page interaction. Destroy restores owned state.']),
  popover: entry(['createPopover'], ['[data-sk-popover-trigger]']),
  tooltip: entry(['createTooltip'], ['[data-sk-tooltip-target]', '[data-sk-tooltip]']),
  table: entry(['createSelection'], ['[data-sk-selection]'], ['Selection belongs to the current page. Filtering, sorting, pagination and persisted selection remain application-owned.']),
  switch: entry(['createAsyncSwitch'], [], ['Native checkbox/switch form state works without a controller. Persisted changes require an explicit onToggle callback.'], ['createAsyncSwitch']),
  toast: entry(['createToaster'], [], ['Create the toaster on the named live region and call show(). The application owns action outcomes.'], ['createToaster']),
  'save-state': entry([], [], ['Set data-state and visible text together. The application owns pending, saving, local, saved, error and conflict transitions.']),
  'activity-list': entry([], [], ['Render native list items. Place loading/error announcements outside the list and preserve existing content during retries.']),
  timeline: entry([], [], ['Use ordered lists and absolute timestamps. Native details handles expansion; event type and outcome must remain in text.']),
  'document-canvas': entry([], [], ['Native article composition; wide mode changes width, not storage or editing behavior.']),
  'content-header': entry([], [], ['Native context/actions composition; sticky offset and scroll padding must account for fixed application bars.']),
};

export function runtimeContract(id: string): RuntimeContract {
  return runtimeContracts[id] ?? entry([], [], ['Native markup and CSS provide presentation. Application code owns any data changes, navigation and persistence.']);
}
