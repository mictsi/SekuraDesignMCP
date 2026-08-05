/**
 * Tabs and segmented controls.
 *
 * Both are roving-tabindex widgets; they differ in semantics. Tabs control
 * panels and use role="tab"/"tabpanel". A segmented control chooses a value and
 * uses role="radiogroup"/"radio". Using tab roles for a value picker tells
 * assistive technology there are panels that do not exist.
 */

import { combine, ensureId, emit, on, type Cleanup } from '../core/dom.js';
import { rovingTabindex } from '../core/focus.js';

export interface TabsOptions {
  /**
   * Automatic selects as the arrow moves; manual requires Enter or Space.
   * Use manual when showing a panel is expensive — arrowing through five tabs
   * should not fire five network requests.
   */
  activation?: 'automatic' | 'manual';
  orientation?: 'horizontal' | 'vertical';
  onSelect?: (tabId: string, index: number) => void;
}

export interface Tabs {
  readonly selected: string | null;
  select(id: string): void;
  destroy: Cleanup;
}

export function createTabs(tablist: HTMLElement, options: TabsOptions = {}): Tabs {
  const { activation = 'automatic', orientation = 'horizontal' } = options;

  const tabs = () => Array.from(tablist.querySelectorAll<HTMLElement>('[role="tab"]'));

  tablist.setAttribute('role', 'tablist');
  if (orientation === 'vertical') tablist.setAttribute('aria-orientation', 'vertical');

  for (const tab of tabs()) {
    ensureId(tab, 'sk-tab');
    const panel = panelFor(tab);
    if (panel) {
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      // Panels are focusable so a keyboard user can scroll content that has no
      // focusable children of its own.
      if (!panel.hasAttribute('tabindex')) panel.tabIndex = 0;
    }
    if (tab.tagName === 'BUTTON' && !tab.hasAttribute('type')) tab.setAttribute('type', 'button');
  }

  function panelFor(tab: HTMLElement): HTMLElement | null {
    const id = tab.getAttribute('aria-controls');
    return id ? document.getElementById(id) : null;
  }

  function select(tab: HTMLElement, notify = true): void {
    const list = tabs();
    list.forEach((t) => {
      const on_ = t === tab;
      t.setAttribute('aria-selected', String(on_));
      const panel = panelFor(t);
      if (panel) panel.hidden = !on_;
    });
    if (notify) {
      options.onSelect?.(tab.id, list.indexOf(tab));
      emit(tablist, 'sk:tabs:select', { id: tab.id });
    }
  }

  const initial = tabs().find((t) => t.getAttribute('aria-selected') === 'true') ?? tabs()[0];
  if (initial) select(initial, false);

  const roving = rovingTabindex(tablist, {
    orientation,
    activation,
    items: tabs,
    onChange: (item) => select(item),
  });

  const offClick = on(tablist, 'click', (event: MouseEvent) => {
    const tab = (event.target as Element).closest<HTMLElement>('[role="tab"]');
    if (tab && tablist.contains(tab)) {
      roving.setActive(tab);
      select(tab);
    }
  });

  return {
    get selected() {
      return tabs().find((t) => t.getAttribute('aria-selected') === 'true')?.id ?? null;
    },
    select(id) {
      const tab = tabs().find((t) => t.id === id);
      if (tab) {
        roving.setActive(tab);
        select(tab);
      }
    },
    destroy: combine(roving.destroy, offClick),
  };
}

/* ------------------------------------------------------------------ *
 * Segmented control
 * ------------------------------------------------------------------ */

export interface SegmentedOptions {
  orientation?: 'horizontal' | 'vertical';
  onChange?: (value: string) => void;
}

export interface Segmented {
  readonly value: string | null;
  setValue(value: string): void;
  destroy: Cleanup;
}

/**
 * A radiogroup rendered as joined buttons.
 *
 * One tab stop; arrows move and select. Unlike tabs, selection is the value —
 * there are no panels, so `aria-checked` rather than `aria-selected`.
 */
export function createSegmented(group: HTMLElement, options: SegmentedOptions = {}): Segmented {
  const { orientation = 'horizontal' } = options;
  const items = () => Array.from(group.querySelectorAll<HTMLElement>('[role="radio"]'));

  group.setAttribute('role', 'radiogroup');
  if (orientation === 'vertical') group.setAttribute('aria-orientation', 'vertical');
  for (const item of items()) {
    if (item.tagName === 'BUTTON' && !item.hasAttribute('type')) item.setAttribute('type', 'button');
  }

  function valueOf(el: HTMLElement): string {
    return el.dataset.value ?? el.getAttribute('value') ?? (el.textContent ?? '').trim();
  }

  function check(item: HTMLElement, notify = true): void {
    for (const other of items()) other.setAttribute('aria-checked', String(other === item));
    if (notify) {
      options.onChange?.(valueOf(item));
      emit(group, 'sk:segmented:change', { value: valueOf(item) });
    }
  }

  const initial = items().find((i) => i.getAttribute('aria-checked') === 'true') ?? items()[0];
  if (initial) check(initial, false);

  const roving = rovingTabindex(group, {
    orientation,
    items,
    onChange: (item) => check(item),
  });

  const offClick = on(group, 'click', (event: MouseEvent) => {
    const item = (event.target as Element).closest<HTMLElement>('[role="radio"]');
    if (item && group.contains(item)) {
      roving.setActive(item);
      check(item);
    }
  });

  return {
    get value() {
      const checked = items().find((i) => i.getAttribute('aria-checked') === 'true');
      return checked ? valueOf(checked) : null;
    },
    setValue(value) {
      const item = items().find((i) => valueOf(i) === value);
      if (item) {
        roving.setActive(item);
        check(item);
      }
    },
    destroy: combine(roving.destroy, offClick),
  };
}
