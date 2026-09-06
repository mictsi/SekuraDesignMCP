/**
 * Number input, tag input and toolbar.
 *
 * Three controls the system described and did not implement.
 */

import { announce } from '../core/live.js';
import { combine, direction, emit, ensureId, on, type Cleanup } from '../core/dom.js';
import { rovingTabindex } from '../core/focus.js';

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
  /** Decimal places to render. Inferred from `step` when omitted. */
  precision?: number;
  locale?: string;
  /** Group thousands while not focused. Off by default: it breaks copy-paste. */
  format?: boolean;
  onChange?: (value: number | null) => void;
}

export interface NumberInput {
  readonly value: number | null;
  setValue(value: number | null): void;
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

  const precision =
    options.precision ?? (String(step).includes('.') ? String(step).split('.')[1]!.length : 0);

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

  function parse(text: string): number | null {
    // Strip grouping separators and normalise a comma decimal mark, so a value
    // this control formatted can be read back by the same control.
    const cleaned = text.replace(/\s| /g, '').replace(/,(?=\d{3}\b)/g, '').replace(',', '.');
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  function clamp(n: number): number {
    return Math.min(max, Math.max(min, n));
  }

  /** Snap to the step grid so 0.1 + 0.2 does not become 0.30000000000000004. */
  function quantise(n: number): number {
    const base = min === -Infinity ? 0 : min;
    const snapped = base + Math.round((n - base) / step) * step;
    return Number(snapped.toFixed(precision + 2));
  }

  let value = parse(input.value);

  function write(next: number | null, notify: boolean): void {
    value = next;
    input.value = next === null ? '' : nf.format(next);
    input.setAttribute('aria-valuenow', next === null ? '' : String(next));
    if (next !== null) input.setAttribute('aria-valuetext', nf.format(next));
    else input.removeAttribute('aria-valuetext');
    if (notify) {
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      onChange?.(next);
      emit(input, 'sk:number:change', { value: next });
    }
  }

  function nudge(delta: number): void {
    if (input.disabled || input.readOnly) return;
    const from = value ?? (min === -Infinity ? 0 : min);
    const next = clamp(quantise(from + delta));
    if (next === value) {
      // At a bound. Silence would read as a broken control.
      announce(delta > 0 ? `Maximum ${nf.format(max)}.` : `Minimum ${nf.format(min)}.`);
      return;
    }
    write(next, true);
  }

  const offKey = on(input, 'keydown', (event: KeyboardEvent) => {
    if (input.disabled || input.readOnly) return;
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
  const offBlur = on(input, 'blur', () => {
    const parsed = parse(input.value);
    if (parsed === null) {
      write(null, value !== null);
      return;
    }
    const next = clamp(quantise(parsed));
    if (next !== parsed) {
      announce(`Adjusted to ${nf.format(next)}, the nearest allowed value.`);
    }
    write(next, true);
  });

  const offInput = on(input, 'input', () => {
    value = parse(input.value);
    input.setAttribute('aria-valuenow', value === null ? '' : String(value));
  });

  const cleanups: Cleanup[] = [offKey, offBlur, offInput];

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

  write(value, false);

  return {
    get value() {
      return value;
    },
    setValue: (next) => write(next === null ? null : clamp(quantise(next)), true),
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

  const listId = ensureId(list, 'sk-taginput-list');
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('autocomplete', 'off');
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  void listId;

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
    onChange?.(tags);
    emit(input, 'sk:taginput:change', { tags: [...tags] });
  }

  function add(raw: string): boolean {
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
    const next = tags.filter((t) => t !== tag);
    if (next.length === tags.length) return;
    armed = -1;
    commit(next, `${tag} removed. ${next.length} remaining.`);
  }

  function openList(matches: string[]): void {
    list.innerHTML = matches
      .map(
        (m, i) =>
          `<li class="sk-tag-input__option" role="option" id="${listId}-${i}" aria-selected="false">${escapeText(m)}</li>`
      )
      .join('');
    list.hidden = matches.length === 0;
    input.setAttribute('aria-expanded', String(matches.length > 0));
    announce(`${matches.length} suggestion${matches.length === 1 ? '' : 's'} available.`);
  }

  function closeList(): void {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  const offInput = on(input, 'input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      closeList();
      return;
    }
    openList(
      suggestions.filter((s) => s.toLowerCase().includes(q) && !tags.includes(s)).slice(0, 8)
    );
  });

  const offKey = on(input, 'keydown', (event: KeyboardEvent) => {
    const rtl = direction(input) === 'rtl';
    const towardTokens = rtl ? 'ArrowRight' : 'ArrowLeft';
    const towardInput = rtl ? 'ArrowLeft' : 'ArrowRight';

    if (event.key === 'Enter' && input.value) {
      event.preventDefault();
      add(input.value);
      return;
    }
    // Comma and Tab commit too: both are how people expect to end a tag.
    if ((event.key === ',' || event.key === 'Tab') && input.value.trim()) {
      if (event.key === ',') event.preventDefault();
      add(input.value);
      return;
    }
    if (event.key === 'Escape') {
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
    destroy: combine(offInput, offKey, offTokenClick, offOptionClick, () => tokens.remove()),
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
