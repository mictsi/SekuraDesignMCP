/** A conjunctive match against markup inside one component instance. */
export interface RuntimeRequirement {
  controller: string;
  when: { className?: string; attribute?: string; value?: string };
  autoMarker?: string;
  manualOnly?: boolean;
  description: string;
}

/** Additional runtime contracts shared by MCP, recipes and the static manifest. */
export interface RuntimeContract {
  controllers: string[];
  autoSelectors: string[];
  manualOnly: string[];
  notes: string[];
  purposes?: ('navigation' | 'commands' | 'disclosure' | 'selection')[];
  stateOwnership?: { controller: string[]; application: string[] };
  requirements?: RuntimeRequirement[];
  identity?: { attribute: string; requiredFor: string; description: string };
  capabilities?: string[];
}
const entry = (controllers: string[], autoSelectors: string[], notes: string[] = [], manualOnly: string[] = []): RuntimeContract => ({ controllers, autoSelectors, notes, manualOnly });
export const runtimeContracts: Record<string, RuntimeContract> = {
  button: entry(['guardAction'], ['.sk-button']),
  'icon-button': entry(['guardAction'], ['.sk-icon-button']),
  'split-button': entry(['guardAction', 'createMenu'], ['.sk-button', '[data-sk-menu-trigger]']),
  'side-nav': entry(['createDisclosure', 'createDrawer'], ['[data-sk-disclosure]', '.sk-side-nav--drawer[data-sk-drawer]'], [
    'The docs sidebar uses these same classes and createDisclosure: a rotating chevron, a 1px logical leading guide on expanded children, and a separate 4px leading rail only on the exact current link.',
    'Links navigate. Separate named toggle buttons expand indented child lists at each level; enhance() wires branches. Keep the exact current link aria-current=page and open its full ancestor path in application route state.',
    'For router updates, call the owned disclosure.open() method or rerender the branch with matching aria-expanded and hidden state; changing aria-expanded alone does not update an existing controller.',
    'Static group headings are not interactive. Open documents belong in a labeled, divided sk-side-nav__open-items region. The host owns open-item state and close/navigation outcomes.',
    'The docs shell additionally owns route matching, scrolling the current link into view and its navigation trigger. These are not installed by enhance() on a plain sk-side-nav.',
    'Navigation uses the system layout width token. There is no navigation width control, resize handle or remembered user width in the UI. Keep mobile drawer and open/close controls separate from sizing.',
    'Workspace is example terminology, not a required menu item, heading, product name or workspace switcher. Use application-specific labels.',
    'For the responsive primary shell, add sk-side-nav--drawer and initialize createDrawer(nav, { modal: "(max-width: 63.999rem)" }) once; wire its trigger, show it for the expanded desktop rail and let Escape restore focus on mobile. Do not also auto-initialize data-sk-drawer on that same nav. Plain local navigation requires no drawer.',
  ]),
  menu: entry(['createMenu'], ['[data-sk-menu-trigger]:not([data-sk-submenu])'], [
    'Initialize one root trigger and menu. Mark child triggers data-sk-submenu with aria-controls and aria-haspopup=menu; add a data-sk-menu-back row for mobile drilldown.',
    'submenuMode supports auto, cascade and drilldown. Auto uses submenuMediaQuery, default (max-width: 40rem). One Escape closes the active level; Tab exits the chain.',
    'Keep submenu DOM and portal containers inside their active modal dialog or drawer. Logical menu ownership does not override native inertness or modal focus trapping.',
    'aria-disabled commands stay focusable but cannot execute. Selection closes the menu before the host callback/event so destination focus remains with the application.',
  ]),
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
    'navigation: true or presence of data-sk-tree-navigation opts into route activation and requires unique nonempty data-value IDs. Remove the marker to disable it; the string false still enables it. Navigation cannot also be multi-select.',
    'Handle onActivate or sk:tree:activate once. With a manual controller, call setCurrent(id) after successful navigation; with automatic ownership, render aria-current=page from confirmed route state.',
    'Use data-sk-custom-tree and retain the manual controller when calling filter, setCurrent or revealCurrent. Filtering searches loaded labels only. revealCurrent() preserves focus by default and never unhides author-hidden items; request focus explicitly for a user action.',
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

Object.assign(runtimeContracts['side-nav']!, {
  purposes: ['navigation', 'disclosure'],
  stateOwnership: {
    controller: ['Branch expansion', 'Modal drawer focus and dismissal'],
    application: ['Current route and active ancestors', 'Collapsed rail and its expand control', 'Open documents'],
  },
  requirements: [
    { controller: 'createDisclosure', when: { className: 'sk-side-nav__toggle' }, autoMarker: 'data-sk-disclosure', description: 'Each separate branch toggle requires disclosure behavior.' },
    { controller: 'createDrawer', when: { className: 'sk-side-nav--drawer' }, autoMarker: 'data-sk-drawer', description: 'Only the explicit responsive drawer variant requires a drawer controller and a wired opener.' },
  ],
  capabilities: ['Nested link disclosures', 'Exact current route and ancestor presentation', 'Explicit responsive drawer variant', 'Application-owned collapsed rail expansion'],
} satisfies Partial<RuntimeContract>);

Object.assign(runtimeContracts.menu!, {
  purposes: ['commands'],
  stateOwnership: {
    controller: ['Owned menu items', 'Submenu expansion and focus', 'Dismissal and focus return'],
    application: ['Command outcomes', 'Permissions and unavailable reasons', 'Destination focus after navigation'],
  },
  requirements: [
    { controller: 'createMenu', when: { className: 'sk-menu' }, description: 'Initialize one root menu; data-sk-submenu items belong to that controller.' },
  ],
  capabilities: ['Nested command menus', 'Desktop cascade and mobile drilldown', 'One Escape per active layer', 'Focusable unavailable commands', 'Command focus handoff'],
} satisfies Partial<RuntimeContract>);

Object.assign(runtimeContracts['tree-view']!, {
  purposes: ['selection', 'navigation', 'disclosure'],
  stateOwnership: {
    controller: ['Roving focus', 'Expansion and pending loads', 'Loaded-node filtering', 'Selection in selection mode'],
    application: ['Route and current document', 'Stable node IDs', 'Child provider and permissions', 'Navigation outcomes'],
  },
  requirements: [
    { controller: 'createTree', when: { className: 'sk-tree' }, description: 'Tree keyboard behavior is required in selection and navigation modes.' },
    { controller: 'createTree', when: { attribute: 'data-sk-custom-tree' }, manualOnly: true, description: 'A custom tree provider requires one manually owned controller.' },
  ],
  identity: { attribute: 'data-value', requiredFor: 'Opt-in navigation mode', description: 'Unique nonempty IDs remain stable when labels or paths change.' },
  capabilities: ['Opt-in navigation activation', 'Separate current route and focus', 'Ancestor-preserving loaded-node filtering', 'Restore expansion and reveal current', 'Abortable lazy expansion', 'Tri-state selection'],
} satisfies Partial<RuntimeContract>);

export function runtimeContract(id: string): RuntimeContract {
  return runtimeContracts[id] ?? entry([], [], ['Native markup and CSS provide presentation. Application code owns any data changes, navigation and persistence.']);
}
