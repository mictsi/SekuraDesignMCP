/**
 * Focus management.
 *
 * Three separate concerns that are routinely conflated:
 *
 *   - **Restore**: remember what had focus, put it back afterwards.
 *   - **Trap**: cycle Tab inside a region. Only correct for genuinely modal UI.
 *   - **Roving tabindex**: make a composite widget a single tab stop.
 *
 * A menu traps nothing but moves focus. An inline drawer restores focus but must
 * not trap. Keeping these apart is what stops non-modal surfaces from lying
 * about being modal.
 */

import { arrowDelta, combine, focusable, on, type Cleanup } from './dom.js';

/* ------------------------------------------------------------------ *
 * Restore
 * ------------------------------------------------------------------ */

export interface FocusRestore {
  /** Put focus back where it was, if that element still exists and is visible. */
  restore(): void;
  /** Forget the saved element without restoring. */
  cancel(): void;
}

export function saveFocus(): FocusRestore {
  const previous = document.activeElement as HTMLElement | null;
  let cancelled = false;
  return {
    restore() {
      if (cancelled || !previous) return;
      // The invoker may have been removed while the overlay was open — a row
      // action menu whose row was deleted, for instance. Falling back to the
      // body would strand the user at the top of the page, so only restore when
      // the element is still there.
      if (document.contains(previous) && typeof previous.focus === 'function') {
        previous.focus({ preventScroll: false });
      }
    },
    cancel() {
      cancelled = true;
    },
  };
}

/* ------------------------------------------------------------------ *
 * Trap
 * ------------------------------------------------------------------ */

export interface TrapOptions {
  /** Where to send focus on activation. Defaults to the first focusable child. */
  initial?: HTMLElement | (() => HTMLElement | null) | null;
  /** Called when Escape is pressed inside the trap. */
  onEscape?: (event: KeyboardEvent) => void;
}

/**
 * Cycle Tab within a container.
 *
 * Only use this for genuinely modal surfaces. Trapping focus in a non-modal
 * panel is a keyboard trap — WCAG 2.1.2 — because the user cannot reach the rest
 * of the page that is still, visibly, available to them.
 *
 * Native `<dialog>` opened with `showModal()` traps focus itself; this exists for
 * the cases where a native dialog is not usable.
 */
export function trapFocus(container: HTMLElement, options: TrapOptions = {}): Cleanup {
  const initial =
    typeof options.initial === 'function' ? options.initial() : options.initial;
  const target = initial ?? focusable(container)[0] ?? container;

  if (target === container && !container.hasAttribute('tabindex')) {
    // So the container itself can hold focus when it has no focusable children.
    container.setAttribute('tabindex', '-1');
  }
  target.focus({ preventScroll: true });

  const offKeydown = on(container, 'keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      options.onEscape?.(event);
      return;
    }
    if (event.key !== 'Tab') return;

    const items = focusable(container);
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === container)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Focus can also arrive from outside — a screen reader's virtual cursor, or a
  // programmatic focus() elsewhere. Pull it back.
  const offFocusIn = on(document, 'focusin', (event: FocusEvent) => {
    const node = event.target as Node;
    if (!container.contains(node)) {
      const items = focusable(container);
      (items[0] ?? container).focus({ preventScroll: true });
    }
  });

  return combine(offKeydown, offFocusIn);
}

/* ------------------------------------------------------------------ *
 * Roving tabindex
 * ------------------------------------------------------------------ */

export interface RovingOptions {
  /** Axis the arrow keys operate on. */
  orientation?: 'horizontal' | 'vertical' | 'both';
  /** Wrap from the last item to the first. */
  loop?: boolean;
  /** Called whenever the active item changes, including via pointer. */
  onChange?: (item: HTMLElement, index: number) => void;
  /**
   * Activate on arrow (automatic) or require Enter/Space (manual).
   * Manual is right when moving is expensive — loading a tab panel, say.
   */
  activation?: 'automatic' | 'manual';
  /** Resolve the current items each time, for lists that change. */
  items: () => HTMLElement[];
}

export interface Roving {
  /** Move focus and tabindex to an index, clamped or wrapped. */
  focusIndex(index: number): void;
  /** Set which item is the tab stop without moving focus. */
  setActive(item: HTMLElement): void;
  destroy: Cleanup;
}

/**
 * Make a group of controls behave as one tab stop.
 *
 * Exactly one item carries `tabindex="0"`; the rest carry `-1`. Arrow keys move
 * between them. This is what makes a tab list, segmented control, menu or
 * toolbar a single stop in the page's tab order rather than N stops.
 */
export function rovingTabindex(container: HTMLElement, options: RovingOptions): Roving {
  const { orientation = 'both', loop = true, activation = 'automatic' } = options;

  function sync(active: HTMLElement | null): void {
    for (const item of options.items()) {
      item.tabIndex = item === active ? 0 : -1;
    }
  }

  function current(): number {
    const items = options.items();
    const active = document.activeElement as HTMLElement | null;
    const byFocus = active ? items.indexOf(active) : -1;
    if (byFocus !== -1) return byFocus;
    const byTabindex = items.findIndex((i) => i.tabIndex === 0);
    return byTabindex === -1 ? 0 : byTabindex;
  }

  function focusIndex(index: number): void {
    const items = options.items();
    if (items.length === 0) return;
    let next = index;
    if (loop) {
      next = ((index % items.length) + items.length) % items.length;
    } else {
      next = Math.max(0, Math.min(index, items.length - 1));
    }
    const item = items[next]!;
    sync(item);
    item.focus();
    if (activation === 'automatic') options.onChange?.(item, next);
  }

  const offKeydown = on(container, 'keydown', (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    if (event.key === 'Home') {
      event.preventDefault();
      focusIndex(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      focusIndex(options.items().length - 1);
      return;
    }
    if (activation === 'manual' && (event.key === 'Enter' || event.key === ' ')) {
      const items = options.items();
      const index = current();
      const item = items[index];
      if (item) {
        event.preventDefault();
        options.onChange?.(item, index);
      }
      return;
    }

    const delta = arrowDelta(event, container, orientation);
    if (delta === 0) return;
    event.preventDefault();
    focusIndex(current() + delta);
  });

  // Pointer interaction must move the tab stop too, or the next Tab press
  // returns focus to wherever the keyboard last was rather than where the user
  // just clicked.
  const offPointer = on(container, 'pointerdown', (event: PointerEvent) => {
    const items = options.items();
    const item = (event.target as Element).closest<HTMLElement>('*');
    const found = items.find((i) => i === item || i.contains(item));
    if (found) sync(found);
  });

  sync(options.items().find((i) => i.tabIndex === 0) ?? options.items()[0] ?? null);

  return {
    focusIndex,
    setActive: sync,
    destroy: combine(offKeydown, offPointer),
  };
}
