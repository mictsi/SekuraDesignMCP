/**
 * @sekura/behaviours
 *
 * Framework-agnostic behaviour for the Sekura Design System.
 *
 * The specification defines exact keyboard and ARIA contracts for every
 * interactive component. This package implements them once, against the DOM, so
 * every consumer gets the same behaviour instead of each reimplementing it —
 * and getting it wrong, which is what the specification says happens.
 *
 * ## Why DOM-based rather than state-based
 *
 * A "headless" library built on framework state (hooks, composables, stores)
 * still needs a separate binding per framework, and each binding is a place for
 * behaviour to diverge. These controllers attach to elements the host framework
 * has already rendered, so React, Vue, Svelte, Angular, Blazor, htmx, Rails and
 * plain HTML all drive identical code.
 *
 * ## Three ways to use it
 *
 * 1. **Markup only** — add `data-sk-*` attributes and call `enhance()`. No
 *    framework knowledge required. Idempotent, so server-rendered stacks can
 *    call it again after swapping HTML in.
 *
 * 2. **Controllers** — call `createMenu(trigger, menu)` and keep the handle.
 *    Every controller returns `{ destroy }` plus its own methods.
 *
 * 3. **Adapters** — thin per-framework wrappers in `adapters/`, each a few lines
 *    because the hard work is already done.
 *
 * Nothing here renders markup or injects CSS. Controllers set attributes
 * (`aria-expanded`, `data-open`, `hidden`) and the stylesheet does the rest, so
 * you keep full control of your own DOM.
 */

declare const __SEKURA_VERSION__: string | undefined;

/** Replaced at build time from package.json. */
export const VERSION: string =
  typeof __SEKURA_VERSION__ === 'string' ? __SEKURA_VERSION__ : '0.0.0-dev'; // version-check-ignore: build-time fallback

/* Core primitives — useful when building a component the system does not cover. */
export {
  arrowDelta,
  combine,
  direction,
  emit,
  ensureId,
  focusable,
  isVisible,
  on,
  prefersReducedMotion,
  toggleAttr,
  uid,
  type Cleanup,
} from './core/dom.js';

export {
  rovingTabindex,
  saveFocus,
  trapFocus,
  type FocusRestore,
  type Roving,
  type RovingOptions,
  type TrapOptions,
} from './core/focus.js';

export { dismissable, type DismissOptions } from './core/dismiss.js';
export { announce, initAnnouncer, readingTime } from './core/live.js';
export { position, type Align, type PositionOptions, type Positioner, type Side } from './core/position.js';
export { createTypeahead, type Typeahead, type TypeaheadOptions } from './core/typeahead.js';

/* Controllers. */
export {
  createAccordion,
  createDisclosure,
  type Accordion,
  type AccordionOptions,
  type Disclosure,
  type DisclosureOptions,
} from './controllers/disclosure.js';

export {
  createSegmented,
  createTabs,
  type Segmented,
  type SegmentedOptions,
  type Tabs,
  type TabsOptions,
} from './controllers/tabs.js';

export { createMenu, type Menu, type MenuOptions } from './controllers/menu.js';

export {
  addDays,
  addMonths,
  compare,
  createCalendar,
  createDatePicker,
  createDateRange,
  fromISO,
  isSame,
  toISO,
  today,
  type Calendar,
  type CalendarOptions,
  type DatePicker,
  type DatePickerOptions,
  type DateRange,
  type DateRangeOptions,
  type PlainDate,
} from './controllers/datefield.js';
export { createCombobox, type Combobox, type ComboboxOptions } from './controllers/combobox.js';

export {
  createNumberInput,
  createTagInput,
  createToolbar,
  type NumberInput,
  type NumberInputOptions,
  type TagInput,
  type TagInputOptions,
  type Toolbar,
  type ToolbarOptions,
} from './controllers/inputs.js';

export {
  createDialog,
  createDrawer,
  createPopover,
  createTooltip,
  type Dialog,
  type DialogOptions,
  type Drawer,
  type DrawerOptions,
  type Popover,
  type PopoverOptions,
  type Tooltip,
  type TooltipOptions,
} from './controllers/overlays.js';

export {
  createAsyncSwitch,
  createSelection,
  createThemeManager,
  createToaster,
  type AsyncSwitchOptions,
  type ContrastPreference,
  type Selection,
  type SelectionOptions,
  type ThemeManager,
  type ThemeOptions,
  type ThemePreference,
  type Toaster,
  type ToastOptions,
} from './controllers/misc.js';

/* Auto-initialisation. */
export { autoEnhance, enhance, getTheme, type EnhanceResult } from './auto.js';
