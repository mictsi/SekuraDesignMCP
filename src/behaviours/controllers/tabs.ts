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

/** Hidden or disabled items never activate, regardless of the input route. */
function available(item: HTMLElement, root: HTMLElement): boolean {
  if (item.getAttribute('aria-disabled') === 'true' || item.matches(':disabled')) return false;
  for (let node: HTMLElement | null = item; node && node !== root; node = node.parentElement) {
    if (node.hidden || node.inert || node.getAttribute('aria-hidden') === 'true' ||
        getComputedStyle(node).display === 'none') return false;
  }
  return true;
}

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

  const tabs = () => Array.from(tablist.querySelectorAll<HTMLElement>('[role="tab"]'))
    .filter(tab => tab.closest('[role="tablist"]') === tablist);
  const enabledTabs = () => tabs().filter(tab => {
    const enabled = available(tab, tablist);
    if (!enabled) tab.tabIndex = -1;
    return enabled;
  });

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
    if (!available(tab, tablist)) return;
    const list = tabs();
    const changed = tab.getAttribute('aria-selected') !== 'true';
    list.forEach((t) => {
      const on_ = t === tab;
      t.setAttribute('aria-selected', String(on_));
      const panel = panelFor(t);
      if (panel) panel.hidden = !on_;
    });
    if (notify && changed) {
      options.onSelect?.(tab.id, list.indexOf(tab));
      emit(tablist, 'sk:tabs:select', { id: tab.id });
    }
  }

  const initial = enabledTabs().find((t) => t.getAttribute('aria-selected') === 'true') ?? enabledTabs()[0];
  if (initial) select(initial, false);
  else tabs().forEach(tab => { tab.setAttribute('aria-selected', 'false'); const panel = panelFor(tab); if (panel) panel.hidden = true; });

  const roving = rovingTabindex(tablist, {
    orientation,
    activation,
    items: enabledTabs,
    onChange: (item) => {
      if (activation === 'manual' && !enabledTabs().includes(document.activeElement as HTMLElement)) return;
      select(item);
    },
  });
  if (initial) roving.setActive(initial);

  const offClick = on(tablist, 'click', (event: MouseEvent) => {
    const tab = (event.target as Element).closest<HTMLElement>('[role="tab"]');
    if (tab && tabs().includes(tab) && available(tab, tablist)) {
      roving.setActive(tab);
      select(tab);
    }
  });
  const observer = new MutationObserver(() => {
    const enabled = enabledTabs();
    const selected = tabs().find(tab => tab.getAttribute('aria-selected') === 'true');
    if (selected && enabled.includes(selected)) {
      if (!enabled.some(tab => tab.tabIndex === 0)) roving.setActive(selected);
      const focused = document.activeElement as HTMLElement;
      if (tabs().includes(focused) && !enabled.includes(focused)) selected.focus();
      return;
    }
    const next = enabled[0];
    if (next) { select(next); roving.setActive(next); }
    else tabs().forEach(tab => { tab.setAttribute('aria-selected', 'false'); const panel = panelFor(tab); if (panel) panel.hidden = true; });
    if (selected === document.activeElement) next?.focus();
  });
  observer.observe(tablist, { subtree: true, childList: true, attributes: true,
    attributeFilter: ['aria-disabled', 'disabled', 'hidden', 'inert', 'aria-hidden', 'style', 'class'] });

  return {
    get selected() {
      return tabs().find((t) => t.getAttribute('aria-selected') === 'true')?.id ?? null;
    },
    select(id) {
      const tab = tabs().find((t) => t.id === id);
      if (tab && available(tab, tablist)) {
        roving.setActive(tab);
        select(tab);
      }
    },
    destroy: combine(roving.destroy, offClick, () => observer.disconnect()),
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
  const items = () => Array.from(group.querySelectorAll<HTMLElement>('[role="radio"]'))
    .filter(item => item.closest('[role="radiogroup"]') === group);
  const enabledItems = () => items().filter(item => {
    const enabled = available(item, group);
    if (!enabled) item.tabIndex = -1;
    return enabled;
  });

  group.setAttribute('role', 'radiogroup');
  if (orientation === 'vertical') group.setAttribute('aria-orientation', 'vertical');
  for (const item of items()) {
    if (item.tagName === 'BUTTON' && !item.hasAttribute('type')) item.setAttribute('type', 'button');
  }

  function valueOf(el: HTMLElement): string {
    return el.dataset.value ?? el.getAttribute('value') ?? (el.textContent ?? '').trim();
  }

  function check(item: HTMLElement, notify = true): void {
    if (!available(item, group)) return;
    const changed = item.getAttribute('aria-checked') !== 'true';
    for (const other of items()) other.setAttribute('aria-checked', String(other === item));
    if (notify && changed) {
      options.onChange?.(valueOf(item));
      emit(group, 'sk:segmented:change', { value: valueOf(item) });
    }
  }

  const initial = enabledItems().find((i) => i.getAttribute('aria-checked') === 'true') ?? enabledItems()[0];
  if (initial) check(initial, false);
  else items().forEach(item => item.setAttribute('aria-checked', 'false'));

  const roving = rovingTabindex(group, {
    orientation,
    items: enabledItems,
    onChange: (item) => check(item),
  });
  if (initial) roving.setActive(initial);

  const offClick = on(group, 'click', (event: MouseEvent) => {
    const item = (event.target as Element).closest<HTMLElement>('[role="radio"]');
    if (item && items().includes(item) && available(item, group)) {
      roving.setActive(item);
      check(item);
    }
  });
  const observer = new MutationObserver(() => {
    const enabled = enabledItems();
    const checked = items().find(item => item.getAttribute('aria-checked') === 'true');
    if (checked && enabled.includes(checked)) {
      if (!enabled.some(item => item.tabIndex === 0)) roving.setActive(checked);
      const focused = document.activeElement as HTMLElement;
      if (items().includes(focused) && !enabled.includes(focused)) checked.focus();
      return;
    }
    const next = enabled[0];
    if (next) { check(next); roving.setActive(next); }
    else items().forEach(item => item.setAttribute('aria-checked', 'false'));
    if (checked === document.activeElement) next?.focus();
  });
  observer.observe(group, { subtree: true, childList: true, attributes: true,
    attributeFilter: ['aria-disabled', 'disabled', 'hidden', 'inert', 'aria-hidden', 'style', 'class'] });

  return {
    get value() {
      const checked = items().find((i) => i.getAttribute('aria-checked') === 'true');
      return checked ? valueOf(checked) : null;
    },
    setValue(value) {
      const item = items().find((i) => valueOf(i) === value);
      if (item && available(item, group)) {
        roving.setActive(item);
        check(item);
      }
    },
    destroy: combine(roving.destroy, offClick, () => observer.disconnect()),
  };
}
