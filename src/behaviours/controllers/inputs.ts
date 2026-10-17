/**
 * Number input, tag input and toolbar.
 *
 * Three controls the system described and did not implement.
 */

import { announce } from '../core/live.js';
import { combine, direction, emit, ensureId, on, type Cleanup } from '../core/dom.js';
import { rovingTabindex } from '../core/focus.js';
import { inputValidation } from '../core/input-state.js';
import { dismissable } from '../core/dismiss.js';

/* ------------------------------------------------------------------ *
 * Number input
 *
 * `<input type="number">` is deliberately not used, and the reason is not
 * taste. It scrolls to a different value when the wheel passes over it, it
 * silently discards what the browser considers invalid so you cannot show the
 * user what they typed, its spinners are unstyleable and below the minimum
 * target size, and on several mobile browsers it offers a keypad with no minus
 * sign. `type="text"` with `inputmode="numeric"` keeps the keypad and gives up
 * nothing.
 * ------------------------------------------------------------------ */

export interface NumberInputOptions {
  min?: number;
  max?: number;
  step?: number;
  /** Larger jump for PageUp/PageDown. Defaults to ten steps. */
  bigStep?: number;
  /** Decimal places to render. Inferred from `step` and bounds when omitted. */
  precision?: number;
  locale?: string;
  /** Group thousands in the formatted value. Off by default. */
  format?: boolean;
  onChange?: (value: number | null) => void;
}

export interface NumberInput {
  readonly value: number | null;
  setValue(value: number | null): void;
  /** Restore owned formatted text to its canonical number; retain editable drafts. */
  destroy: Cleanup;
}

export function createNumberInput(
  input: HTMLInputElement,
  options: NumberInputOptions = {}
): NumberInput {
  const {
    min = -Infinity,
    max = Infinity,
    step = 1,
    bigStep = step * 10,
    locale = document.documentElement.lang || 'en',
    format = false,
    onChange,
  } = options;

  const decimals = (number: number): number => {
    const [fraction, exponent] = String(number).split('e');
    return Math.max(0, (fraction!.split('.')[1]?.length ?? 0) - Number(exponent ?? 0));
  };
  const requiredPrecision = Math.max(decimals(step), Number.isFinite(min) ? decimals(min) : 0,
    Number.isFinite(max) ? decimals(max) : 0);
  const precision = options.precision ?? requiredPrecision;
  if (!Number.isFinite(step) || step <= 0 || min > max ||
      !(Number.isFinite(min) || min === -Infinity) || !(Number.isFinite(max) || max === Infinity)) {
    throw new RangeError('Number input requires a positive finite step and min <= max.');
  }
  if (!Number.isInteger(precision) || precision < requiredPrecision || precision > 100) {
    throw new RangeError('Number input precision must represent its step and bounds exactly, and be at most 100.');
  }

  // A spin button is what this is, and saying so gives the user min, max and
  // the current value without having to hunt for a hint.
  input.setAttribute('role', 'spinbutton');
  input.setAttribute('inputmode', precision > 0 ? 'decimal' : 'numeric');
  input.setAttribute('autocomplete', 'off');
  if (min !== -Infinity) input.setAttribute('aria-valuemin', String(min));
  if (max !== Infinity) input.setAttribute('aria-valuemax', String(max));

  const nf = new Intl.NumberFormat(locale, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
    useGrouping: format,
  });
  const parts = new Intl.NumberFormat(locale).formatToParts(-1234567890123.5);
  const decimal = parts.find(part => part.type === 'decimal')?.value ?? '.';
  const group = parts.find(part => part.type === 'group')?.value;
  const minus = parts.find(part => part.type === 'minusSign')?.value ?? '-';
  const groups = parts.filter(part => part.type === 'integer').map(part => [...part.value].length);
  const primaryGroup = groups.at(-1) ?? 3;
  const secondaryGroup = groups.at(-2) ?? primaryGroup;
  const stripDirection = (text: string): string => text.replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '');
  const digits = Array.from({ length: 10 }, (_, digit) =>
    stripDirection(new Intl.NumberFormat(locale, { useGrouping: false }).format(digit)));
  const validation = inputValidation(input);
  let composing = false;
  let dispatching = false;
  let destroyed = false;
  let renderedText: string | null = null;
  let pendingReset: Event | null = null;

  function parse(text: string): number | null {
    let cleaned = stripDirection(text).trim();
    if (!cleaned) return null;
    digits.forEach((symbol, digit) => { cleaned = cleaned.split(symbol).join(String(digit)); });
    cleaned = cleaned.split(minus).join('-');
    if (group && /^\s+$/.test(group)) cleaned = cleaned.replace(/\s/g, group);
    const sign = /^[+-]/.exec(cleaned)?.[0] ?? '';
    if (sign) cleaned = cleaned.slice(1);
    const pieces = cleaned.split(decimal);
    if (pieces.length > 2) return null;
    let integer = pieces[0]!;
    const fraction = pieces[1];
    if (group && integer.includes(group)) {
      const chunks = integer.split(group);
      if (chunks.some(chunk => !/^\d+$/.test(chunk)) ||
          chunks.at(-1)!.length !== primaryGroup ||
          chunks[0]!.length < 1 || chunks[0]!.length > secondaryGroup ||
          chunks.slice(1, -1).some(chunk => chunk.length !== secondaryGroup)) return null;
      integer = chunks.join('');
    }
    if (!/^\d*$/.test(integer) || (fraction !== undefined && !/^\d*$/.test(fraction)) ||
        !(integer || fraction)) return null;
    const n = Number(sign + (integer || '0') + (fraction === undefined ? '' : '.' + fraction));
    return Number.isFinite(n) ? n : null;
  }

  function clamp(n: number): number {
    return Math.min(max, Math.max(min, n));
  }

  /** Snap to the step grid so 0.1 + 0.2 does not become 0.30000000000000004. */
  function quantise(n: number): number {
    const base = min === -Infinity ? 0 : min;
    const snapped = base + Math.round((n - base) / step) * step;
    return Number(snapped.toFixed(precision));
  }

  // Initial HTML values may use canonical ASCII numbers. Subsequent user text
  // follows the configured locale, so an ambiguous grouping mark is not guessed.
  function initialValue(): number | null {
    const text = input.value.trim();
    if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) {
      const number = Number(text);
      return Number.isFinite(number) ? number : null;
    }
    return parse(text);
  }
  const normaliseInitial = (): number | null => {
    const initial = initialValue();
    return initial === null ? null : clamp(quantise(initial));
  };
  let value = normaliseInitial();

  function write(next: number | null, notify: boolean, nativeEvents = true): void {
    const changed = next !== value;
    value = next;
    input.value = next === null ? '' : nf.format(next);
    renderedText = input.value;
    validation.setError(null);
    if (next === null) input.removeAttribute('aria-valuenow');
    else input.setAttribute('aria-valuenow', String(next));
    if (next !== null) input.setAttribute('aria-valuetext', nf.format(next));
    else input.removeAttribute('aria-valuetext');
    if (notify && changed) {
      if (nativeEvents) {
        dispatching = true;
        try {
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        } finally { dispatching = false; }
      }
      onChange?.(next);
      emit(input, 'sk:number:change', { value: next });
    }
  }

  function nudge(delta: number): void {
    if (input.disabled || input.readOnly || composing) return;
    const draft = parse(input.value);
    if (input.value.trim() && draft === null) {
      validation.setError('Enter a valid number using the selected locale.');
      return;
    }
    const from = draft ?? value ?? (min === -Infinity ? 0 : min);
    const next = clamp(quantise(from + delta));
    if (next === value && (delta > 0 && next === max || delta < 0 && next === min)) {
      // At a bound. Silence would read as a broken control.
      announce(delta > 0 ? `Maximum ${nf.format(max)}.` : `Minimum ${nf.format(min)}.`);
    }
    // The committed value may be unchanged while a draft still needs clamping
    // or an owned error needs clearing. write() already suppresses notifications.
    write(next, true);
  }

  const offKey = on(input, 'keydown', (event: KeyboardEvent) => {
    if (input.disabled || input.readOnly || event.isComposing || composing) return;
    switch (event.key) {
      case 'ArrowUp': event.preventDefault(); nudge(step); break;
      case 'ArrowDown': event.preventDefault(); nudge(-step); break;
      case 'PageUp': event.preventDefault(); nudge(bigStep); break;
      case 'PageDown': event.preventDefault(); nudge(-bigStep); break;
      case 'Home': if (min !== -Infinity) { event.preventDefault(); write(min, true); } break;
      case 'End': if (max !== Infinity) { event.preventDefault(); write(max, true); } break;
      default: break;
    }
  });

  /* Wheel is NOT bound. Scrolling a page must never change a value the user is
     not looking at; that is the single worst thing about type="number". */

  // Clamp on blur, not on input: rewriting mid-keystroke makes "10" impossible
  // to type when the minimum is 5.
  const commitDraft = (nativeEvents: boolean): void => {
    if (dispatching || composing || input.disabled || input.readOnly) return;
    const parsed = parse(input.value);
    if (parsed === null) {
      if (input.value.trim()) validation.setError('Enter a valid number using the selected locale.');
      else write(null, true, nativeEvents);
      return;
    }
    const next = clamp(quantise(parsed));
    if (next !== parsed) {
      announce(`Adjusted to ${nf.format(next)}, the nearest allowed value.`);
    }
    write(next, true, nativeEvents);
  };

  const cleanups: Cleanup[] = [
    offKey,
    on(input, 'change', () => commitDraft(false)),
    on(input, 'blur', () => commitDraft(true)),
    on(input, 'input', () => {
      if (dispatching) return;
      renderedText = null;
      if (composing) return;
      const draft = parse(input.value);
      if (draft === null) { input.removeAttribute('aria-valuenow'); input.removeAttribute('aria-valuetext'); }
      else { input.setAttribute('aria-valuenow', String(draft)); input.setAttribute('aria-valuetext', nf.format(draft)); }
    }),
    on(input, 'compositionstart', () => { composing = true; renderedText = null; }),
    on(input, 'compositionend', () => { composing = false; }),
    validation.destroy,
    () => {
      destroyed = true;
      // Formatting belongs to this enhancement. Restore its canonical value on
      // teardown so an ambiguous grouping mark cannot become an ASCII decimal
      // when the same field is mounted again. Leave an editable draft untouched.
      if ((!pendingReset || pendingReset.defaultPrevented) && renderedText !== null && input.value === renderedText) {
        input.value = value === null ? '' : String(value);
      }
    },
  ];
  if (input.form) cleanups.push(on(input.form, 'reset', event => {
    pendingReset = event;
    queueMicrotask(() => {
      pendingReset = null;
      if (destroyed || event.defaultPrevented) return;
      value = normaliseInitial();
      if (input.value.trim() && value === null) validation.setError('Enter a valid number using the selected locale.');
      else write(value, false);
    });
  }));

  // Stepper buttons, if the markup has them. They are aria-hidden: the input is
  // already a spinbutton, so announcing them doubles every control.
  for (const button of input.parentElement?.querySelectorAll<HTMLElement>('[data-sk-step]') ?? []) {
    const delta = Number(button.dataset.skStep) * step;
    button.setAttribute('tabindex', '-1');
    button.setAttribute('aria-hidden', 'true');
    cleanups.push(
      on(button, 'click', () => {
        nudge(delta);
        input.focus();
      })
    );
  }

  if (input.value.trim() && value === null) validation.setError('Enter a valid number using the selected locale.');
  else write(value, false);

  return {
    get value() {
      return value;
    },
    setValue(next) {
      if (next !== null && !Number.isFinite(next)) throw new RangeError('Number input value must be finite or null.');
      write(next === null ? null : clamp(quantise(next)), true);
    },
    destroy: combine(...cleanups),
  };
}

/* ------------------------------------------------------------------ *
 * Tag input
 *
 * A combobox whose value is a list. The hard part is not the typing, it is the
 * tokens: each has to be removable by keyboard, and Backspace on an empty input
 * has to reach the last one without deleting it by surprise.
 * ------------------------------------------------------------------ */

export interface TagInputOptions {
  value?: string[];
  /** Suggestions offered as the user types. */
  options?: string[];
  /** Only values from `options` may be added. */
  strict?: boolean;
  max?: number;
  /** Reject or rewrite a tag. Return null to reject. */
  normalise?: (raw: string) => string | null;
  onChange?: (tags: string[]) => void;
}

export interface TagInput {
  readonly tags: string[];
  add(tag: string): boolean;
  remove(tag: string): void;
  destroy: Cleanup;
}

export function createTagInput(
  input: HTMLInputElement,
  list: HTMLElement,
  options: TagInputOptions = {}
): TagInput {
  const { strict = false, max = Infinity, normalise, onChange } = options;
  const suggestions = options.options ?? [];

  let tags = [...(options.value ?? [])];
  /** Index of the token holding keyboard focus, or -1 for none. */
  let armed = -1;
  let matches: string[] = [];
  let activeOption = -1;
  let composing = false;
  let undismiss: Cleanup | null = null;

  const listId = ensureId(list, 'sk-taginput-list');
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', listId);
  input.setAttribute('autocomplete', 'off');
  list.setAttribute('role', 'listbox');
  list.hidden = true;

  const tokens = document.createElement('span');
  tokens.className = 'sk-tag-input__tokens';
  input.parentElement?.insertBefore(tokens, input);

  function renderTokens(): void {
    tokens.innerHTML = tags
      .map(
        (tag, i) =>
          `<span class="sk-tag-input__token" data-index="${i}">` +
            `<span class="sk-tag-input__token-label">${escapeText(tag)}</span>` +
            `<button type="button" class="sk-tag-input__remove" tabindex="-1"` +
            ` data-remove="${i}" aria-label="Remove ${escapeText(tag)}">` +
              `<svg aria-hidden="true" focusable="false" width="12" height="12"><use href="#sk-icon-close"></use></svg>` +
            `</button>` +
          `</span>`
      )
      .join('');
    for (const el of tokens.querySelectorAll<HTMLElement>('.sk-tag-input__token')) {
      el.toggleAttribute('data-armed', Number(el.dataset.index) === armed);
    }
  }

  function escapeText(value: string): string {
    return value.replace(/[&<>"]/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!
    );
  }

  function commit(next: string[], message: string): void {
    tags = next;
    renderTokens();
    announce(message);
    onChange?.([...tags]);
    emit(input, 'sk:taginput:change', { tags: [...tags] });
  }

  function add(raw: string): boolean {
    if (input.disabled || input.readOnly || composing) return false;
    const tag = (normalise ? normalise(raw) : raw.trim());
    if (!tag) return false;
    if (tags.length >= max) {
      announce(`Limit of ${max} reached.`, 'assertive');
      return false;
    }
    if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      announce(`${tag} is already added.`);
      return false;
    }
    if (strict && !suggestions.some((s) => s.toLowerCase() === tag.toLowerCase())) {
      announce(`${tag} is not an allowed value.`, 'assertive');
      return false;
    }
    commit([...tags, tag], `${tag} added. ${tags.length + 1} total.`);
    input.value = '';
    closeList();
    return true;
  }

  function remove(tag: string): void {
    if (input.disabled || input.readOnly) return;
    const next = tags.filter((t) => t !== tag);
    if (next.length === tags.length) return;
    armed = -1;
    commit(next, `${tag} removed. ${next.length} remaining.`);
  }

  function openList(next: string[]): void {
    matches = next;
    activeOption = -1;
    input.removeAttribute('aria-activedescendant');
    list.replaceChildren(...matches.map((text, index) => {
      const option = document.createElement('li');
      option.className = 'sk-tag-input__option';
      option.id = `${listId}-${index}`;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.textContent = text;
      return option;
    }));
    list.hidden = matches.length === 0;
    input.setAttribute('aria-expanded', String(!list.hidden));
    undismiss?.();
    undismiss = list.hidden ? null : dismissable(list, {
      exclude: [input, tokens], focusOut: true, onDismiss: closeList,
    });
    announce(`${matches.length} suggestion${matches.length === 1 ? '' : 's'} available.`);
  }

  function closeList(): void {
    undismiss?.();
    undismiss = null;
    activeOption = -1;
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  function updateMatches(): void {
    if (input.disabled || input.readOnly || composing) { closeList(); return; }
    if (armed !== -1) { armed = -1; renderTokens(); }
    const q = input.value.trim().toLowerCase();
    if (!q) {
      closeList();
      return;
    }
    openList(
      suggestions.filter((s) => s.toLowerCase().includes(q) &&
        !tags.some(tag => tag.toLowerCase() === s.toLowerCase())).slice(0, 8)
    );
  }

  function activate(index: number): void {
    if (!matches.length) return;
    activeOption = (index + matches.length) % matches.length;
    Array.from(list.children).forEach((option, i) => {
      option.setAttribute('aria-selected', String(i === activeOption));
    });
    const option = list.children[activeOption] as HTMLElement;
    input.setAttribute('aria-activedescendant', option.id);
    option.scrollIntoView({ block: 'nearest' });
  }

  const offInput = on(input, 'input', updateMatches);

  const offKey = on(input, 'keydown', (event: KeyboardEvent) => {
    if (input.disabled || input.readOnly || composing || event.isComposing) return;
    const rtl = direction(input) === 'rtl';
    const towardTokens = rtl ? 'ArrowRight' : 'ArrowLeft';
    const towardInput = rtl ? 'ArrowLeft' : 'ArrowRight';

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (list.hidden) updateMatches();
      if (matches.length && !list.hidden) {
        event.preventDefault();
        activate(activeOption === -1 ? (event.key === 'ArrowDown' ? 0 : matches.length - 1)
          : activeOption + (event.key === 'ArrowDown' ? 1 : -1));
      }
      return;
    }
    if (event.key === 'Enter' && (input.value || activeOption >= 0)) {
      event.preventDefault();
      add(activeOption >= 0 && !list.hidden ? matches[activeOption]! : input.value);
      return;
    }
    // Comma and Tab commit too: both are how people expect to end a tag.
    if ((event.key === ',' || event.key === 'Tab') && input.value.trim()) {
      if (event.key === ',') event.preventDefault();
      add(activeOption >= 0 && !list.hidden ? matches[activeOption]! : input.value);
      return;
    }
    if (event.key === 'Escape') {
      if (!list.hidden) { event.preventDefault(); event.stopPropagation(); }
      closeList();
      return;
    }

    /* Backspace on an empty input ARMS the last token rather than deleting it.
       A second press removes it. Deleting on the first press is the behaviour
       that silently loses a tag someone did not mean to touch. */
    if (event.key === 'Backspace' && !input.value && tags.length) {
      event.preventDefault();
      if (armed === tags.length - 1) {
        remove(tags[armed]!);
      } else {
        armed = tags.length - 1;
        renderTokens();
        announce(`${tags[armed]!} selected. Press Backspace again to remove it.`);
      }
      return;
    }
    if (event.key === towardTokens && !input.value && tags.length) {
      event.preventDefault();
      armed = armed === -1 ? tags.length - 1 : Math.max(0, armed - 1);
      renderTokens();
      announce(tags[armed]!);
      return;
    }
    if (event.key === towardInput && armed !== -1) {
      event.preventDefault();
      armed = armed >= tags.length - 1 ? -1 : armed + 1;
      renderTokens();
      return;
    }
    if (armed !== -1) {
      armed = -1;
      renderTokens();
    }
  });

  const offTokenClick = on(tokens, 'click', (event: MouseEvent) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-remove]');
    if (!button) return;
    const index = Number(button.dataset.remove);
    const tag = tags[index];
    if (tag !== undefined) remove(tag);
    input.focus();
  });

  const offOptionClick = on(list, 'click', (event: MouseEvent) => {
    const option = (event.target as HTMLElement).closest<HTMLElement>('.sk-tag-input__option');
    if (option) {
      add(option.textContent ?? '');
      input.focus();
    }
  });

  renderTokens();

  return {
    get tags() {
      return [...tags];
    },
    add,
    remove,
    destroy: combine(offInput, offKey, offTokenClick, offOptionClick,
      on(list, 'pointerdown', event => event.preventDefault()),
      on(input, 'compositionstart', () => { composing = true; closeList(); }),
      on(input, 'compositionend', () => { composing = false; updateMatches(); }),
      closeList, () => tokens.remove()),
  };
}

/* ------------------------------------------------------------------ *
 * Toolbar
 *
 * A row of controls that is ONE tab stop. Without this, a formatting bar with
 * twelve buttons costs twelve presses to tab past, every single time.
 * ------------------------------------------------------------------ */

export interface ToolbarOptions {
  orientation?: 'horizontal' | 'vertical';
}

export interface Toolbar {
  destroy: Cleanup;
}

export function createToolbar(container: HTMLElement, options: ToolbarOptions = {}): Toolbar {
  const orientation = options.orientation ?? 'horizontal';
  container.setAttribute('role', 'toolbar');
  container.setAttribute('aria-orientation', orientation);

  const roving = rovingTabindex(container, {
    orientation,
    items: () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(
          'button, [role="button"], a[href], [role="checkbox"], [role="radio"]'
        )
      ).filter((el) => el.getAttribute('aria-disabled') !== 'true' && !el.hasAttribute('disabled')),
  });

  return { destroy: roving.destroy };
}
