/**
 * Combobox — ARIA 1.2 pattern.
 *
 * DOM focus **never leaves the input**. The visual cursor moves via
 * `aria-activedescendant`, which is what lets the user keep typing while
 * browsing options. Moving real focus into the listbox — the mistake a menu
 * makes correctly and a combobox makes wrongly — breaks typing entirely.
 */

import {
  combine,
  ensureId,
  emit,
  on,
  toggleAttr,
  type Cleanup,
} from '../core/dom.js';
import { dismissable } from '../core/dismiss.js';
import { position, type PositionOptions, type Positioner } from '../core/position.js';
import { announce } from '../core/live.js';

export interface ComboboxOptions extends PositionOptions {
  /** Called on every input, debounced. Use for server-backed search. */
  onSearch?: (query: string) => void;
  /** Debounce for onSearch, ms. */
  debounce?: number;
  onSelect?: (option: HTMLElement, value: string) => void;
  onOpenChange?: (open: boolean) => void;
  /** Announce the option count after the list changes. Default true. */
  announceCount?: boolean;
  /** Commit the active option when Tab moves away. Default false. */
  selectOnTab?: boolean;
}

export interface Combobox {
  readonly open: boolean;
  openList(): void;
  closeList(): void;
  /** Re-read options from the DOM after the list has been re-rendered. */
  refresh(): void;
  destroy: Cleanup;
}

export function createCombobox(
  input: HTMLInputElement,
  listbox: HTMLElement,
  options: ComboboxOptions = {}
): Combobox {
  const { debounce = 250, announceCount = true, selectOnTab = false } = options;

  const listId = ensureId(listbox, 'sk-listbox');
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-controls', listId);
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('autocomplete', 'off');
  listbox.setAttribute('role', 'listbox');
  listbox.hidden = true;

  let open = false;
  let activeIndex = -1;
  let positioner: Positioner | null = null;
  let undismiss: Cleanup | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const optionsOf = (): HTMLElement[] =>
    Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]')).filter(
      (el) => !el.hidden && el.getAttribute('aria-disabled') !== 'true'
    );

  function setActive(index: number): void {
    const list = optionsOf();
    if (list.length === 0) {
      activeIndex = -1;
      input.removeAttribute('aria-activedescendant');
      return;
    }
    activeIndex = ((index % list.length) + list.length) % list.length;
    list.forEach((opt, i) => {
      const isActive = i === activeIndex;
      toggleAttr(opt, 'data-active', isActive);
      opt.setAttribute('aria-selected', String(isActive));
      if (isActive) {
        ensureId(opt, 'sk-option');
        // This — not focus() — is what moves the cursor for assistive tech.
        input.setAttribute('aria-activedescendant', opt.id);
        opt.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function openList(): void {
    if (open) return;
    open = true;
    listbox.hidden = false;
    toggleAttr(listbox, 'data-open', true);
    input.setAttribute('aria-expanded', 'true');

    positioner = position(listbox, input, { side: 'bottom', align: 'start', ...options });
    undismiss = dismissable(listbox, {
      exclude: [input],
      onDismiss: () => closeList(),
    });

    // Do NOT pre-activate the first option: Enter would then commit something
    // the user has not read.
    setActive(-1);
    activeIndex = -1;
    input.removeAttribute('aria-activedescendant');

    options.onOpenChange?.(true);
    emit(input, 'sk:combobox:open');
  }

  function closeList(): void {
    if (!open) return;
    open = false;
    positioner?.destroy();
    positioner = null;
    undismiss?.();
    undismiss = null;

    listbox.hidden = true;
    listbox.removeAttribute('data-open');
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    activeIndex = -1;

    options.onOpenChange?.(false);
    emit(input, 'sk:combobox:close');
  }

  function commit(option: HTMLElement): void {
    const value = option.dataset.value ?? (option.textContent ?? '').trim();
    input.value = value;
    options.onSelect?.(option, value);
    emit(input, 'sk:combobox:select', { value });
    closeList();
  }

  function refresh(): void {
    if (!open) return;
    setActive(-1);
    activeIndex = -1;
    positioner?.update();
    if (announceCount) {
      const n = optionsOf().length;
      announce(n === 0 ? 'No results available.' : `${n} result${n === 1 ? '' : 's'} available.`);
    }
  }

  const offInput = on(input, 'input', () => {
    if (!open) openList();
    clearTimeout(timer);
    timer = setTimeout(() => {
      options.onSearch?.(input.value);
      refresh();
    }, debounce);
  });

  const offKey = on(input, 'keydown', (event: KeyboardEvent) => {
    const list = optionsOf();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) openList();
        else setActive(activeIndex + 1);
        return;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) {
          openList();
          setActive(list.length - 1);
        } else {
          setActive(activeIndex - 1);
        }
        return;
      case 'Home':
        if (open) {
          event.preventDefault();
          setActive(0);
        }
        return;
      case 'End':
        if (open) {
          event.preventDefault();
          setActive(list.length - 1);
        }
        return;
      case 'Enter': {
        const active = list[activeIndex];
        if (open && active) {
          event.preventDefault();
          commit(active);
        }
        return;
      }
      case 'Escape':
        event.preventDefault();
        if (open) {
          // First Escape closes but keeps what was typed — losing it would
          // discard the user's work. A second Escape clears.
          closeList();
        } else if (input.value) {
          input.value = '';
          emit(input, 'sk:combobox:clear');
        }
        return;
      case 'Tab':
        if (open) {
          const active = list[activeIndex];
          if (selectOnTab && active) commit(active);
          else closeList();
        }
        return;
      default:
    }
  });

  const offClick = on(listbox, 'click', (event: MouseEvent) => {
    const option = (event.target as Element).closest<HTMLElement>('[role="option"]');
    if (option && listbox.contains(option)) commit(option);
  });

  // Pointer hover moves the active option so mouse and keyboard agree.
  const offOver = on(listbox, 'pointermove', (event: PointerEvent) => {
    const option = (event.target as Element).closest<HTMLElement>('[role="option"]');
    if (!option) return;
    const index = optionsOf().indexOf(option);
    if (index !== -1 && index !== activeIndex) setActive(index);
  });

  const offFocus = on(input, 'focus', () => {
    if (optionsOf().length > 0) openList();
  });

  return {
    get open() {
      return open;
    },
    openList,
    closeList,
    refresh,
    destroy: combine(
      () => closeList(),
      () => clearTimeout(timer),
      offInput,
      offKey,
      offClick,
      offOver,
      offFocus
    ),
  };
}
