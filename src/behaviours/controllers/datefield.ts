/**
 * Date picker, date range and the calendar grid underneath both.
 *
 * ## Why not `<input type="date">`
 *
 * It is unstyleable, its layout differs on every platform, its keyboard model
 * differs on every platform, and it silently accepts what the OS locale decides
 * a date looks like. That is fine for a personal side project and unusable in a
 * design system that promises one behaviour everywhere.
 *
 * ## The two-control rule
 *
 * A date picker is a **text input plus a calendar**, never a calendar alone.
 * Typing "2026-08-21" is faster than fourteen arrow presses, and it is the only
 * route for someone using voice input or a switch. The calendar is the
 * discoverable path; the input is the fast one. Removing either breaks somebody.
 *
 * ## Grid navigation
 *
 * The month is a `role="grid"` with a roving tabindex, so the whole calendar is
 * one tab stop. Arrow keys move a day, PageUp/PageDown a month, Shift with them
 * a year. Moving off the edge of a month loads the next one rather than
 * stopping, because a date near a boundary is exactly when people use the
 * keyboard.
 */

import { position, type Positioner } from '../core/position.js';
import { announce } from '../core/live.js';
import { combine, direction, emit, ensureId, isVisible, on, toggleAttr, type Cleanup } from '../core/dom.js';
import { saveFocus, trapFocus, type FocusRestore } from '../core/focus.js';
import { dismissable } from '../core/dismiss.js';
import { inputValidation } from '../core/input-state.js';

/* ------------------------------------------------------------------ *
 * Date arithmetic
 *
 * Plain {y, m, d} triples rather than Date objects. A Date is a moment in time
 * and carries a timezone; a calendar date is not and does not. Mixing them is
 * how a due date becomes the previous day for anyone west of UTC.
 * ------------------------------------------------------------------ */

export interface PlainDate {
  y: number;
  /** 1–12, not the 0–11 that has caused a decade of off-by-one bugs. */
  m: number;
  d: number;
}

export function toISO({ y, m, d }: PlainDate): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function fromISO(value: string): PlainDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const date: PlainDate = { y: +m[1]!, m: +m[2]!, d: +m[3]! };
  // Rejects 2026-02-30, which the regex is happy with.
  return isReal(date) ? date : null;
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function isReal({ y, m, d }: PlainDate): boolean {
  return Number.isInteger(y) && y >= 1 && y <= 9999 && Number.isInteger(m) &&
    m >= 1 && m <= 12 && Number.isInteger(d) && d >= 1 && d <= daysInMonth(y, m);
}

export function addDays(date: PlainDate, n: number): PlainDate {
  const t = Date.UTC(date.y, date.m - 1, date.d) + n * 86400000;
  const dt = new Date(t);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export function addMonths(date: PlainDate, n: number): PlainDate {
  const total = date.y * 12 + (date.m - 1) + n;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  // 31 January plus one month is 28 February, not 3 March.
  return { y, m, d: Math.min(date.d, daysInMonth(y, m)) };
}

export function compare(a: PlainDate, b: PlainDate): number {
  return a.y - b.y || a.m - b.m || a.d - b.d;
}

export function isSame(a: PlainDate | null, b: PlainDate | null): boolean {
  return Boolean(a && b && compare(a, b) === 0);
}

export function today(): PlainDate {
  const n = new Date();
  return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() };
}

/** Day-of-week, 0 = Sunday. */
function weekday({ y, m, d }: PlainDate): number {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/* ------------------------------------------------------------------ *
 * Calendar grid
 * ------------------------------------------------------------------ */

export interface CalendarOptions {
  /** Selected date, or the range start when `end` is also given. */
  value?: PlainDate | null;
  /** Range end. Present turns the grid into a range calendar. */
  end?: PlainDate | null;
  min?: PlainDate | null;
  max?: PlainDate | null;
  /** 0 = Sunday, 1 = Monday. Defaults to Monday: ISO-8601, and most of the world. */
  weekStartsOn?: 0 | 1;
  /** BCP 47 tag for month, weekday and announcement formatting. */
  locale?: string;
  /** Return a reason to block a date, or null to allow it. The reason is announced. */
  isDisabled?: (date: PlainDate) => string | null;
  onSelect?: (date: PlainDate) => void;
  onMonthChange?: (y: number, m: number) => void;
}

export interface Calendar {
  readonly value: PlainDate | null;
  readonly month: { y: number; m: number };
  setValue(date: PlainDate | null): void;
  setRange(start: PlainDate | null, end: PlainDate | null): void;
  goToMonth(y: number, m: number): void;
  /** Move DOM focus into the grid, onto the focused date. */
  focus(): void;
  destroy: Cleanup;
}

function dateError(date: PlainDate, options: CalendarOptions): string | null {
  if (!isReal(date)) return 'Enter a real calendar date.';
  if (options.min && compare(date, options.min) < 0) return `Choose a date on or after ${toISO(options.min)}.`;
  if (options.max && compare(date, options.max) > 0) return `Choose a date on or before ${toISO(options.max)}.`;
  return options.isDisabled?.(date) || null;
}

function sameValue(a: PlainDate | null, b: PlainDate | null): boolean {
  return a === b || isSame(a, b);
}

function copyDate(date: PlainDate | null): PlainDate | null {
  return date ? { ...date } : null;
}

function escapeMarkup(value: string): string {
  return value.replace(/[&<>"']/g, character =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

/**
 * Renders a month into `container` and owns its keyboard model.
 *
 * The container is emptied and rebuilt on every month change. That is cheap for
 * 42 cells and avoids an entire class of stale-state bug that a diffing
 * implementation would have to defend against.
 */
export function createCalendar(container: HTMLElement, options: CalendarOptions = {}): Calendar {
  const {
    weekStartsOn = 1,
    locale = document.documentElement.lang || 'en',
    onSelect,
    onMonthChange,
  } = options;

  let value = options.value && !dateError(options.value, options) ? copyDate(options.value) : null;
  let rangeEnd = options.end && !dateError(options.end, options) ? copyDate(options.end) : null;
  if (value && rangeEnd && compare(rangeEnd, value) < 0) rangeEnd = null;
  let focused: PlainDate = value ?? options.min ?? today();
  let view = { y: focused.y, m: focused.m };
  let hasRange = options.end !== undefined;

  const monthFmt = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const dayFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const shortDay = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const narrowDay = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });

  container.classList.add('sk-calendar');

  const gridId = ensureId(container, 'sk-calendar');
  const headingId = `${gridId}-heading`;

  function blocked(date: PlainDate): string | null {
    return dateError(date, options);
  }

  function label(date: PlainDate): string {
    return dayFmt.format(new Date(date.y, date.m - 1, date.d));
  }

  function render(): void {
    const first: PlainDate = { y: view.y, m: view.m, d: 1 };
    // How many leading days from the previous month are shown.
    const lead = (weekday(first) - weekStartsOn + 7) % 7;
    const start = addDays(first, -lead);
    const now = today();

    const weekdayCells: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      const sample = addDays(start, i);
      const js = new Date(sample.y, sample.m - 1, sample.d);
      // The abbreviation is visible; the full name is what gets announced.
      weekdayCells.push(
        `<th scope="col" class="sk-calendar__weekday" abbr="${escapeMarkup(shortDay.format(js))}">` +
          `<span aria-hidden="true">${escapeMarkup(narrowDay.format(js))}</span>` +
          `<span class="sk-visually-hidden">${escapeMarkup(shortDay.format(js))}</span>` +
          `</th>`
      );
    }

    const rows: string[] = [];
    for (let w = 0; w < 6; w += 1) {
      const cells: string[] = [];
      for (let i = 0; i < 7; i += 1) {
        const date = addDays(start, w * 7 + i);
        const outside = date.m !== view.m;
        const why = blocked(date);
        const selected = isSame(date, value) || isSame(date, rangeEnd);
        const inRange =
          hasRange && value && rangeEnd &&
          compare(date, value) > 0 && compare(date, rangeEnd) < 0;
        const isFocused = isSame(date, focused);

        cells.push(
          `<td role="gridcell"${selected ? ' aria-selected="true"' : ''}>` +
            `<button type="button" class="sk-calendar__day"` +
            ` data-date="${toISO(date)}"` +
            ` tabindex="${isFocused ? '0' : '-1'}"` +
            (outside ? ' data-outside' : '') +
            (inRange ? ' data-in-range' : '') +
            (isSame(date, now) ? ' aria-current="date"' : '') +
            (why ? ` aria-disabled="true" data-why="${escapeMarkup(why)}"` : '') +
            ` aria-label="${escapeMarkup(label(date))}">` +
            `${date.d}</button></td>`
        );
      }
      rows.push(`<tr role="row">${cells.join('')}</tr>`);
    }

    container.innerHTML =
      `<div class="sk-calendar__header">` +
        `<button type="button" class="sk-calendar__nav" data-step="-1" aria-label="Previous month">` +
          `<svg aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-chevron-left"></use></svg>` +
        `</button>` +
        `<h2 class="sk-calendar__month" id="${escapeMarkup(headingId)}" aria-live="polite">` +
          `${escapeMarkup(monthFmt.format(new Date(view.y, view.m - 1, 1)))}</h2>` +
        `<button type="button" class="sk-calendar__nav" data-step="1" aria-label="Next month">` +
          `<svg aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-chevron-right"></use></svg>` +
        `</button>` +
      `</div>` +
      `<table class="sk-calendar__grid" role="grid" aria-labelledby="${escapeMarkup(headingId)}">` +
        `<thead><tr role="row">${weekdayCells.join('')}</tr></thead>` +
        `<tbody>${rows.join('')}</tbody>` +
      `</table>`;
  }

  function dayButton(date: PlainDate): HTMLButtonElement | null {
    return container.querySelector<HTMLButtonElement>(`[data-date="${toISO(date)}"]`);
  }

  function setFocused(date: PlainDate, moveDom: boolean): void {
    focused = { ...date };
    if (date.y !== view.y || date.m !== view.m) {
      view = { y: date.y, m: date.m };
      render();
      onMonthChange?.(view.y, view.m);
    } else {
      for (const b of container.querySelectorAll<HTMLElement>('.sk-calendar__day')) {
        b.tabIndex = b.dataset.date === toISO(date) ? 0 : -1;
      }
    }
    if (moveDom) dayButton(date)?.focus();
  }

  function select(date: PlainDate): void {
    const why = blocked(date);
    if (why) {
      // Say why rather than doing nothing. A control that ignores a click with
      // no explanation is indistinguishable from one that is broken.
      announce(`${label(date)} is unavailable: ${why}.`, 'assertive');
      return;
    }
    value = { ...date };
    render();
    setFocused(date, true);
    onSelect?.({ ...date });
    emit(container, 'sk:calendar:select', { date: toISO(date) });
  }

  const offClick = on(container, 'click', (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const nav = target.closest<HTMLElement>('.sk-calendar__nav');
    if (nav) {
      const step = Number(nav.dataset.step);
      setFocused(addMonths(focused, step), false);
      // Focus stays on the nav button across the re-render, or a month of
      // paging would drop the user back at the top of the page each time.
      container.querySelector<HTMLElement>(`.sk-calendar__nav[data-step="${step}"]`)?.focus();
      return;
    }
    const day = target.closest<HTMLElement>('.sk-calendar__day');
    if (day?.dataset.date) {
      const date = fromISO(day.dataset.date);
      if (date) select(date);
    }
  });

  const offKey = on(container, 'keydown', (event: KeyboardEvent) => {
    if (event.isComposing) return;
    const target = event.target as HTMLElement;
    if (!target.classList.contains('sk-calendar__day')) return;

    // Arrow keys follow reading order, so Left means "later" in RTL.
    const rtl = direction(container) === 'rtl';
    const inline = rtl ? -1 : 1;
    let next: PlainDate | null = null;

    switch (event.key) {
      case 'ArrowLeft': next = addDays(focused, -inline); break;
      case 'ArrowRight': next = addDays(focused, inline); break;
      case 'ArrowUp': next = addDays(focused, -7); break;
      case 'ArrowDown': next = addDays(focused, 7); break;
      case 'Home': next = addDays(focused, -((weekday(focused) - weekStartsOn + 7) % 7)); break;
      case 'End': next = addDays(focused, 6 - ((weekday(focused) - weekStartsOn + 7) % 7)); break;
      case 'PageUp': next = addMonths(focused, event.shiftKey ? -12 : -1); break;
      case 'PageDown': next = addMonths(focused, event.shiftKey ? 12 : 1); break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        select(focused);
        return;
      default:
        return;
    }
    event.preventDefault();
    setFocused(next, true);
  });

  render();

  return {
    get value() {
      return copyDate(value);
    },
    get month() {
      return { ...view };
    },
    setValue(date) {
      const error = date ? blocked(date) : null;
      if (error) { announce(error); return; }
      value = copyDate(date);
      hasRange = false;
      rangeEnd = null;
      if (date) focused = date;
      render();
      setFocused(focused, false);
    },
    setRange(start, end) {
      const error = (start && blocked(start)) || (end && blocked(end)) ||
        (start && end && compare(end, start) < 0 ? 'The end date must be on or after the start date.' : null);
      if (error) { announce(error); return; }
      hasRange = true;
      value = copyDate(start);
      rangeEnd = copyDate(end);
      render();
      setFocused(focused, false);
    },
    goToMonth(y, m) {
      if (!isReal({ y, m, d: 1 })) return;
      view = { y, m };
      focused = { y, m, d: Math.min(focused.d, daysInMonth(y, m)) };
      render();
      onMonthChange?.(y, m);
    },
    focus() {
      (dayButton(focused) ?? container.querySelector<HTMLElement>('.sk-calendar__day'))?.focus();
    },
    destroy: combine(offClick, offKey),
  };
}

/* ------------------------------------------------------------------ *
 * Date picker: text input + calendar popup
 * ------------------------------------------------------------------ */

export interface DatePickerOptions extends CalendarOptions {
  /** Parse what the user typed. Defaults to ISO `YYYY-MM-DD`. */
  parse?: (input: string) => PlainDate | null;
  /** Render into the input. Defaults to ISO, which is unambiguous everywhere. */
  format?: (date: PlainDate) => string;
  onChange?: (date: PlainDate | null) => void;
}

export interface DatePicker {
  readonly value: PlainDate | null;
  readonly open: boolean;
  setValue(date: PlainDate | null): void;
  openPanel(): void;
  closePanel(): void;
  destroy: Cleanup;
}

/**
 * `input` is the source of truth; the calendar writes into it.
 *
 * The panel is a modal dialog on the ARIA Date Picker Dialog pattern: focus
 * moves in, is trapped, and returns to the trigger on close. That is heavier
 * than a popover but it is what stops a keyboard user tabbing out of an open
 * calendar into the page behind and losing it.
 */
export function createDatePicker(
  input: HTMLInputElement,
  trigger: HTMLElement,
  panel: HTMLElement,
  options: DatePickerOptions = {}
): DatePicker {
  const parse = options.parse ?? fromISO;
  const format = options.format ?? toISO;
  const validation = inputValidation(input);
  const panelId = ensureId(panel, 'sk-datepicker-panel');
  trigger.setAttribute('aria-controls', panelId);
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  if (trigger.tagName === 'BUTTON' && !trigger.hasAttribute('type')) trigger.setAttribute('type', 'button');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  if (!panel.hasAttribute('aria-label')) panel.setAttribute('aria-label', 'Choose a date');
  panel.hidden = true;

  let value: PlainDate | null = null;
  let open = false;
  let composing = false;
  let dispatching = false;
  let destroyed = false;
  let lastRejected = '';
  let restore: FocusRestore | null = null;
  let release: Cleanup | null = null;
  let undismiss: Cleanup | null = null;
  let watchOwner: MutationObserver | null = null;
  let positioner: Positioner | null = null;

  let grid = panel.querySelector<HTMLElement>('.sk-calendar');
  if (!grid) {
    grid = input.ownerDocument.createElement('div');
    panel.appendChild(grid);
  }

  const calendar = createCalendar(grid, {
    ...options,
    value: null,
    onSelect(date) {
      if (input.disabled || input.readOnly) { calendar.setValue(value); return; }
      if (commit(date, format(date), true, true, true)) closePanel();
    },
  });

  // The committed value is distinct from an editable draft. Only this function
  // publishes changes; native events generated here cannot re-enter it.
  function commit(date: PlainDate | null, text: string, write: boolean, notify: boolean, nativeEvents: boolean): boolean {
    const error = date ? dateError(date, options) : text.trim() ? 'Enter a valid date.' : null;
    validation.setError(error);
    if (error) {
      const rejection = JSON.stringify([text, error]);
      if (rejection !== lastRejected) emit(input, 'sk:datepicker:invalid', { draft: text, message: error });
      lastRejected = rejection;
      return false;
    }
    lastRejected = '';
    const changed = !sameValue(value, date);
    value = copyDate(date);
    if (write) input.value = date ? format(date) : '';
    calendar.setValue(value);
    if (notify && changed) {
      if (nativeEvents) {
        dispatching = true;
        try {
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        } finally { dispatching = false; }
      }
      options.onChange?.(copyDate(value));
      emit(input, 'sk:datepicker:change', { value: value ? toISO(value) : null });
    }
    return true;
  }

  function commitDraft(): void {
    if (dispatching || composing || input.disabled || input.readOnly) return;
    commit(input.value.trim() ? parse(input.value) : null, input.value, false, true, false);
  }

  function canOpenPanel(): boolean {
    return !destroyed && !input.disabled && !input.readOnly &&
      trigger.getAttribute('aria-disabled') !== 'true' && !trigger.matches(':disabled') &&
      input.isConnected && trigger.isConnected && panel.isConnected &&
      isVisible(input) && isVisible(trigger) &&
      ![input, trigger, panel].some(element => element.closest('[inert]'));
  }

  function openPanel(): void {
    if (open || !canOpenPanel()) return;
    commitDraft();
    // Committing a draft can call host code that destroys, removes, disables or
    // opens this picker. Recheck before acquiring any popup resources.
    if (open || !canOpenPanel()) return;
    calendar.setValue(value);
    if (open || !canOpenPanel()) return;
    panel.hidden = false;
    if (!isVisible(panel)) { panel.hidden = true; return; }
    open = true;
    toggleAttr(panel, 'data-open', true);
    trigger.setAttribute('aria-expanded', 'true');
    positioner = position(panel, trigger, { align: 'end' });
    restore = saveFocus();
    undismiss = dismissable(panel, {
      exclude: [trigger, input],
      onDismiss: reason => closePanel(reason === 'escape'),
    });
    release = trapFocus(panel, { initial: () => grid!.querySelector<HTMLElement>('.sk-calendar__day[tabindex="0"]') });
    // Initial focus also invokes host listeners before trapFocus returns its
    // cleanup. Release that late handle if a listener closed/destroyed the picker.
    if (!open || !canOpenPanel()) {
      release?.(); release = null;
      closePanel(false);
      return;
    }
    calendar.focus();
    if (!open || !canOpenPanel()) { closePanel(false); return; }

    // Watch only the owning ancestor chain, and only while open. A native
    // dialog close or host removal must release the calendar's focus trap too.
    watchOwner = new MutationObserver(() => {
      if (!input.isConnected || !panel.isConnected || !trigger.isConnected ||
          !isVisible(input) || !isVisible(panel) || !isVisible(trigger)) closePanel(false);
    });
    const owners = new Set<HTMLElement>();
    for (const element of [input, trigger, panel]) {
      for (let owner = element.parentElement; owner; owner = owner.parentElement) owners.add(owner);
    }
    for (const owner of owners) watchOwner.observe(owner, {
      childList: true, attributes: true, attributeFilter: ['hidden', 'inert', 'open', 'style', 'class'],
    });
    emit(trigger, 'sk:datepicker:open');
  }

  function closePanel(restoreFocus = true): void {
    if (!open) return;
    open = false;
    watchOwner?.disconnect(); watchOwner = null;
    release?.(); release = null;
    undismiss?.(); undismiss = null;
    positioner?.destroy(); positioner = null;
    panel.hidden = true;
    toggleAttr(panel, 'data-open', false);
    trigger.setAttribute('aria-expanded', 'false');
    if (restoreFocus) restore?.restore();
    else restore?.cancel();
    restore = null;
    emit(trigger, 'sk:datepicker:close');
  }

  const cleanups: Cleanup[] = [
    on(trigger, 'click', () => open ? closePanel() : openPanel()),
    on(input, 'change', commitDraft),
    on(input, 'blur', commitDraft),
    on(input, 'compositionstart', () => { composing = true; }),
    on(input, 'compositionend', () => { composing = false; }),
  ];
  if (input.form) cleanups.push(on(input.form, 'reset', event => {
    queueMicrotask(() => {
      if (destroyed || event.defaultPrevented) return;
      closePanel(false);
      value = null;
      calendar.setValue(null);
      commit(input.value.trim() ? parse(input.value) : null, input.value, false, false, false);
    });
  }));

  const initial = input.value.trim() ? parse(input.value) : options.value ?? null;
  commit(initial, input.value, !input.value.trim(), false, false);

  return {
    get value() { return copyDate(value); },
    get open() { return open; },
    setValue(date) {
      // Programmatic setters remain silent. Invalid candidates leave the last
      // committed value intact and expose their reason through field validity.
      commit(date, date ? format(date) : '', true, false, false);
    },
    openPanel,
    closePanel,
    destroy: combine(() => { destroyed = true; closePanel(false); }, ...cleanups, calendar.destroy, validation.destroy),
  };
}

/* ------------------------------------------------------------------ *
 * Date range
 * ------------------------------------------------------------------ */

export interface DateRangeOptions extends CalendarOptions {
  onChange?: (start: PlainDate | null, end: PlainDate | null) => void;
}

export interface DateRange {
  readonly start: PlainDate | null;
  readonly end: PlainDate | null;
  destroy: Cleanup;
}

/**
 * Two inputs and one calendar.
 *
 * Two inputs rather than one combined field, because "12 Aug – 21 Aug" is a
 * single text box a screen reader announces as one value and a keyboard user
 * cannot edit half of. Clicking picks the start, then the end; picking a date
 * before the start restarts the range rather than producing a negative one.
 */
export function createDateRange(
  startInput: HTMLInputElement,
  endInput: HTMLInputElement,
  container: HTMLElement,
  options: DateRangeOptions = {}
): DateRange {
  let start: PlainDate | null = null;
  let end: PlainDate | null = null;
  let awaiting: 'start' | 'end' = 'start';
  let dispatching = false;
  let composing = false;
  let destroyed = false;
  let lastRejected = '';
  const startValidation = inputValidation(startInput);
  const endValidation = inputValidation(endInput);

  const calendar = createCalendar(container, {
    ...options,
    // Seed the view from the saved start, which the calendar validates. Later
    // range commits preserve paging rather than jumping back after every edit.
    value: fromISO(startInput.value),
    end: null,
    onSelect(date) {
      if ([startInput, endInput].some(input => input.disabled || input.readOnly) || composing) {
        calendar.setRange(start, end);
        return;
      }
      const selectingStart = awaiting === 'start' || Boolean(start && compare(date, start) < 0);
      const nextStart = selectingStart ? date : start;
      const nextEnd = selectingStart ? null : date;
      if (!commit(nextStart, nextEnd, nextStart ? toISO(nextStart) : '', nextEnd ? toISO(nextEnd) : '', true, true)) return;
      announce(selectingStart ? `Start ${toISO(date)} selected. Now choose an end date.`
        : `Range ${toISO(start!)} to ${toISO(date)} selected.`);
    },
  });

  function commit(nextStart: PlainDate | null, nextEnd: PlainDate | null, startText: string, endText: string,
    write: boolean, notify: boolean): boolean {
    let startError = nextStart ? dateError(nextStart, options) : startText.trim() ? 'Enter a valid start date.' : null;
    let endError = nextEnd ? dateError(nextEnd, options) : endText.trim() ? 'Enter a valid end date.' : null;
    if (!startError && !endError && nextStart && nextEnd && compare(nextEnd, nextStart) < 0) {
      startError = 'The start date must be on or before the end date.';
      endError = 'The end date must be on or after the start date.';
    }
    startValidation.setError(startError);
    endValidation.setError(endError);
    if (startError || endError) {
      const rejection = JSON.stringify([startText, endText, startError, endError]);
      if (rejection !== lastRejected) emit(container, 'sk:daterange:invalid', { start: startText, end: endText, message: startError || endError });
      lastRejected = rejection;
      return false;
    }
    lastRejected = '';
    const startChanged = !sameValue(start, nextStart);
    const endChanged = !sameValue(end, nextEnd);
    start = copyDate(nextStart);
    end = copyDate(nextEnd);
    awaiting = start && !end ? 'end' : 'start';
    if (write) { startInput.value = startText; endInput.value = endText; }
    calendar.setRange(start, end);
    if (notify && (startChanged || endChanged)) {
      if (write) {
        dispatching = true;
        try {
          for (const [input, changed] of [[startInput, startChanged], [endInput, endChanged]] as const) {
            if (!changed) continue;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } finally { dispatching = false; }
      }
      options.onChange?.(copyDate(start), copyDate(end));
      emit(container, 'sk:daterange:change', { start: start ? toISO(start) : null, end: end ? toISO(end) : null });
    }
    return true;
  }

  function sync(notify = true): void {
    if (dispatching || composing) return;
    commit(fromISO(startInput.value), fromISO(endInput.value), startInput.value, endInput.value, false, notify);
  }
  const cleanups: Cleanup[] = [];
  for (const input of [startInput, endInput]) {
    const commitDraft = (): void => { if (!input.disabled && !input.readOnly) sync(); };
    cleanups.push(on(input, 'change', commitDraft), on(input, 'blur', commitDraft),
      on(input, 'compositionstart', () => { composing = true; }),
      on(input, 'compositionend', () => { composing = false; }));
  }
  for (const form of new Set([startInput.form, endInput.form].filter(Boolean))) {
    cleanups.push(on(form!, 'reset', event => queueMicrotask(() => {
      if (destroyed || event.defaultPrevented) return;
      start = null; end = null;
      calendar.setRange(null, null);
      sync(false);
    })));
  }
  sync(false);
  // Invalid initial pairs must not leave the view's seed looking committed.
  calendar.setRange(start, end);

  return {
    get start() { return copyDate(start); },
    get end() { return copyDate(end); },
    destroy: combine(() => { destroyed = true; }, ...cleanups, calendar.destroy, startValidation.destroy, endValidation.destroy),
  };
}
